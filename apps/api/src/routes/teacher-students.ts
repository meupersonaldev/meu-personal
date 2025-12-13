import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { emailService } from '../services/email.service'
import { getStudentLinkedEmail, getWelcomeStudentCreatedEmail } from '../services/email-templates'
import { ensureFranqueadoraContact } from '../services/franqueadora-contacts.service'
import { createUserNotification } from './notifications'

const router = Router()

const ADMIN_ROLES = [
  'FRANQUEADORA',
  'FRANQUIA',
  'SUPER_ADMIN',
  'ADMIN'
] as const
const TEACHER_ROLES = ['TEACHER', 'PROFESSOR'] as const

const hasAdminAccess = (user?: { role?: string }) =>
  Boolean(user && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]))

const hasTeacherScope = (
  user: { userId?: string; role?: string } | undefined,
  teacherId?: string
) =>
  Boolean(
    user &&
      teacherId &&
      TEACHER_ROLES.includes(user.role as typeof TEACHER_ROLES[number]) &&
      user.userId === teacherId
  )

const ensureTeacherStudentAccess = (
  req: { user?: { userId?: string; role?: string } },
  res: { status: (code: number) => { json: (body: any) => void } },
  teacherId: string
) => {
  const user = req.user
  if (!user || (!hasAdminAccess(user) && !hasTeacherScope(user, teacherId))) {
    res.status(403).json({ error: 'Forbidden' })
    return false
  }
  return true
}

// GET /api/teachers/:teacherId/students - Listar alunos do professor
router.get('/:teacherId/students', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    const { data: teacherStudents, error } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('name', { ascending: true })

    if (error) throw error

    // Buscar user_id correspondente para cada aluno (pelo email)
    const studentsWithDetails = await Promise.all(
      (teacherStudents || []).map(async student => {
        const { data: user } = await supabase
          .from('users')
          .select('id, photo_url')
          .eq('email', student.email)
          .single()

        return {
          ...student,
          user_id: user?.id || student.user_id || null, // Prefer DB user_id if migrated
          user_photo: user?.photo_url || null,
          status: student.connection_status || 'APPROVED' // Default for legacy
        }
      })
    )

    res.json({ students: studentsWithDetails })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/teachers/:teacherId/students - Criar aluno ou solicitar vínculo
router.post('/:teacherId/students', requireAuth, async (req, res) => {
  try {
    const { teacherId } = req.params
    const {
      name,
      email,
      phone,
      notes,
      academy_id,
      hourly_rate,
      cpf,
      gender,
      birth_date,
      hide_free_class
    } = req.body

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    if (!name || !email || !cpf) {
      return res
        .status(400)
        .json({ error: 'Nome, email e CPF são obrigatórios' })
    }

    // Sanitizar CPF
    const sanitizedCpf = cpf.replace(/\D/g, '')
    if (sanitizedCpf.length !== 11) {
      return res.status(400).json({ error: 'CPF inválido' })
    }

    const normalizedAcademyId =
      typeof academy_id === 'string' && academy_id.trim()
        ? academy_id.trim()
        : null

    // 1. Verificar se usuário já existe na plataforma (por CPF)
    console.log('🔍 Verificando usuário na plataforma pelo CPF:', sanitizedCpf)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('cpf', sanitizedCpf)
      .single()

    let studentData
    let userId = existingUser?.id

    if (existingUser) {
      console.log('✅ Usuário já existe na plataforma:', existingUser.id)

      // Verificar se já existe vínculo com este professor
      const { data: existingLink } = await supabase
        .from('teacher_students')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('email', email) // Check by email as legacy links might allow dupes
        .single()

      if (existingLink) {
        // Já existe na lista do professor
        if (existingLink.connection_status === 'PENDING') {
          return res.status(409).json({
            error: 'Solicitação de vínculo já enviada e pendente de aprovação.',
            code: 'CONNECTION_PENDING'
          })
        }
        if (
          existingLink.connection_status === 'APPROVED' ||
          !existingLink.connection_status
        ) {
          // Se status é nulo (legado) consideramos aprovado
          return res.status(409).json({
            error: 'Aluno já cadastrado na sua carteira.',
            code: 'ALREADY_LINKED'
          })
        }
        // Se REJECTED, permitimos reenviar (update)
        const { data: updatedLink, error: updateError } = await supabase
          .from('teacher_students')
          .update({
            connection_status: 'PENDING',
            user_id: existingUser.id, // Ensure user_id is set
            name: name, // Atualiza dados se quiser
            phone: phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLink.id)
          .select()
          .single()

        if (updateError) throw updateError
        studentData = updatedLink
      } else {
        // Usuário existe mas não está vinculado -> VÍNCULO AUTOMÁTICO (APPROVED)
        const { data: newLink, error: insertError } = await supabase
          .from('teacher_students')
          .insert({
            teacher_id: teacherId,
            user_id: existingUser.id,
            name,
            email: existingUser.email, // Usar email cadastrado
            phone,
            notes,
            hourly_rate: hourly_rate || null,
            cpf: sanitizedCpf,
            gender: gender || null,
            birth_date: birth_date || null,
            hide_free_class: hide_free_class || false,
            connection_status: 'APPROVED' // Vínculo automático
          })
          .select()
          .single()

        if (insertError) throw insertError
        studentData = newLink
      }

      // Notificar aluno sobre novo vínculo (informativo, não precisa aprovar)
      const { data: teacherUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', teacherId)
        .single()

      const teacherName = teacherUser?.name || 'Um professor'

      // Enviar notificação informativa
      await createUserNotification(
        existingUser.id,
        'new_teacher_link',
        'Novo professor vinculado',
        `${teacherName} adicionou você à carteira de alunos.`,
        { teacher_id: teacherId, teacher_name: teacherName }
      )

      // Enviar email pro email cadastrado - usando EmailTemplateService
      try {
        const loginUrl = `${process.env.WEB_URL || 'https://meupersonalfranquia.com.br'}/aluno/login`
        const html = await getStudentLinkedEmail(existingUser.name, teacherName, loginUrl)

        await emailService.sendEmail({
          to: existingUser.email,
          subject: 'Novo vínculo no Meu Personal',
          html,
          text: `Olá ${existingUser.name}, ${teacherName} adicionou você à carteira de alunos no Meu Personal.`
        })
      } catch (e) {
        console.warn('Erro ao enviar email de vínculo:', e)
      }

      return res.status(200).json({
        student: studentData,
        message: `Aluno já existe na plataforma! Vínculo criado e notificação enviada para ${existingUser.email}.`,
        status: 'APPROVED',
        existingEmail: existingUser.email
      })
    } else {
      // CENÁRIO: Usuário NÃO existe (Fluxo antigo + user_id/status)
      console.log('➕ Criando novo usuário na tabela users...')

      // 1. Criar novo aluno na lista do professor (ainda sem user_id)
      //    OU criar user primeiro? Melhor criar user primeiro para ter FK correta se for strict.
      //    Mas teacher_students.user_id é nullable (criamos migration assim), então podemos atualizar depois.
      //    Para evitar falha se user falhar, vamos criar user primeiro.

      // Gerar senha temporária
      const tempPassword = crypto.randomBytes(8).toString('hex')
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      console.log('🔐 Senha temporária gerada')

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          name,
          phone,
          cpf: cpf || null,
          gender: gender || null,
          birth_date: birth_date || null,
          role: 'STUDENT',
          password_hash: passwordHash,
          credits: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (userError) {
        console.error('❌ Erro ao criar usuário:', userError)
        throw userError
      }
      userId = newUser.id

      // 2. Criar registro em teacher_students (Vinculado e APROVADO)
      const { data: newStudent, error: insertError } = await supabase
        .from('teacher_students')
        .insert({
          teacher_id: teacherId,
          user_id: userId,
          name,
          email,
          phone,
          notes,
          hourly_rate: hourly_rate || null,
          cpf: cpf || null,
          gender: gender || null,
          birth_date: birth_date || null,
          hide_free_class: hide_free_class || false,
          connection_status: 'APPROVED' // Auto-approved
        })
        .select()
        .single()

      if (insertError) throw insertError
      studentData = newStudent

      // 3. Registrar como lead e enviar email
      try {
        await ensureFranqueadoraContact({
          userId: userId,
          role: 'STUDENT',
          origin: 'TEACHER_LEAD'
        })
      } catch (e) {
        console.warn('Lead error', e)
      }

      // Enviar email boa vinda - usando EmailTemplateService
      try {
        const loginUrl = `${process.env.WEB_URL || 'https://meupersonalfranquia.com.br'}/aluno/login`
        const html = await getWelcomeStudentCreatedEmail(name, email, tempPassword, loginUrl)

        await emailService.sendEmail({
          to: email,
          subject: 'Bem-vindo ao Meu Personal! 🎉',
          html,
          text: `Bem-vindo ao Meu Personal! Email: ${email} Senha: ${tempPassword}`
        })
      } catch (e) {
        console.warn('Email error', e)
      }

      // Vincular academia se houver
      if (normalizedAcademyId) {
        // ... (existing academy logic)
        const { data: existingAcademyStudent } = await supabase
          .from('academy_students')
          .select('*')
          .eq('academy_id', normalizedAcademyId)
          .eq('student_id', userId)
          .single()

        if (!existingAcademyStudent) {
          await supabase.from('academy_students').insert({
            academy_id: normalizedAcademyId,
            student_id: userId,
            status: 'active',
            created_at: new Date().toISOString()
          })
        }
      }

      return res.status(201).json({
        student: studentData,
        message: 'Aluno e usuário cadastrados com sucesso'
      })
    }
  } catch (error: any) {
    console.error('Error creating student:', error)

    res.status(500).json({ error: error.message })
  }
})

// PUT /api/teachers/:teacherId/students/:studentId - Atualizar aluno
router.put('/:teacherId/students/:studentId', requireAuth, async (req, res) => {
  try {
    const { teacherId, studentId } = req.params
    const {
      name,
      email,
      phone,
      notes,
      hourly_rate,
      cpf,
      gender,
      birth_date,
      hide_free_class
    } = req.body

    if (!ensureTeacherStudentAccess(req, res, teacherId)) {
      return
    }

    const { data, error } = await supabase
      .from('teacher_students')
      .update({
        name,
        email,
        phone,
        notes,
        hourly_rate: hourly_rate || null,
        cpf: cpf || null,
        gender: gender || null,
        birth_date: birth_date || null,
        hide_free_class:
          hide_free_class !== undefined ? hide_free_class : false,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // Notificar aluno sobre atualização
    if (data.user_id) {
      const { data: teacherUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', teacherId.replace('teacher_', ''))
        .single()

      const teacherName = teacherUser?.name || 'Seu personal'

      const { onStudentDataUpdated } = await import('../lib/events')
      await onStudentDataUpdated(data.user_id, teacherId, teacherName)
    }

    res.json({ student: data })
  } catch (error: any) {
    console.error('Error updating student:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/teachers/:teacherId/students/:studentId - Excluir aluno
router.delete(
  '/:teacherId/students/:studentId',
  requireAuth,
  async (req, res) => {
    try {
      const { teacherId, studentId } = req.params

      if (!ensureTeacherStudentAccess(req, res, teacherId)) {
        return
      }

      // Buscar aluno antes de excluir para notificar
      const { data: student } = await supabase
        .from('teacher_students')
        .select('user_id, name')
        .eq('id', studentId)
        .eq('teacher_id', teacherId)
        .single()

      const { error } = await supabase
        .from('teacher_students')
        .delete()
        .eq('id', studentId)
        .eq('teacher_id', teacherId)

      if (error) throw error

      // Notificar se tiver user_id
      if (student?.user_id) {
        const { data: teacherUser } = await supabase
          .from('users')
          .select('name')
          .eq('id', teacherId.replace('teacher_', ''))
          .single()

        const teacherName = teacherUser?.name || 'Seu personal'

        const { onStudentRemoved } = await import('../lib/events')
        await onStudentRemoved(student.user_id, teacherId, teacherName)
      }

      res.json({ message: 'Aluno excluído com sucesso' })
    } catch (error: any) {
      console.error('Error deleting student:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// PATCH /api/teachers/:teacherId/students/:studentId/portfolio - Fidelizar aluno na carteira
router.patch(
  '/:teacherId/students/:studentId/portfolio',
  requireAuth,
  async (req, res) => {
    try {
      const { teacherId, studentId } = req.params
      const { is_portfolio } = req.body

      if (!ensureTeacherStudentAccess(req, res, teacherId)) {
        return
      }

      const { data, error } = await supabase
        .from('teacher_students')
        .update({
          is_portfolio: is_portfolio === true,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .eq('teacher_id', teacherId)
        .select()
        .single()

      if (error) throw error

      if (!data) {
        return res.status(404).json({ error: 'Aluno não encontrado' })
      }

      res.json({
        message: is_portfolio ? 'Aluno adicionado à carteira' : 'Aluno removido da carteira',
        student: data
      })
    } catch (error: any) {
      console.error('Error updating portfolio status:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// PATCH /api/teachers/requests/:requestId/respond - Aceitar/Rejeitar vínculo (Pelo Aluno)
router.patch('/requests/:requestId/respond', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params
    const { status } = req.body // 'APPROVED' | 'REJECTED'
    const userId = req.user?.userId

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    // Verificar se o pedido existe e pertence ao usuário logado
    const { data: request, error: fetchError } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' })
    }

    if (request.connection_status !== 'PENDING') {
      return res.status(400).json({ error: 'Solicitação já processada' })
    }

    // Atualizar status
    const { data: updated, error: updateError } = await supabase
      .from('teacher_students')
      .update({
        connection_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) throw updateError

    // Notificar o professor da decisão
    const { onConnectionRequestResponded } = await import('../lib/events')
    await onConnectionRequestResponded(
      request.teacher_id,
      userId,
      request.name,
      status
    )

    res.json({ message: 'Solicitação atualizada com sucesso', data: updated })
  } catch (error: any) {
    console.error('Error responding to request:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/students/:studentId/teachers - Listar professores do aluno (para "Meus Professores")
router.get('/students/:studentId/teachers', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params
    const userId = req.user?.userId

    // Verificar se o usuário logado é o próprio aluno ou admin
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FRANQUEADORA'].includes(
      req.user?.role || ''
    )
    if (!isAdmin && userId !== studentId) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    // Buscar vínculos aprovados
    const { data: links, error } = await supabase
      .from('teacher_students')
      .select('teacher_id, hourly_rate, hide_free_class, created_at')
      .eq('user_id', studentId)
      .eq('connection_status', 'APPROVED')

    if (error) throw error

    if (!links || links.length === 0) {
      return res.json({ teachers: [] })
    }

    // Buscar dados dos professores
    const teacherIds = links.map(l => l.teacher_id)
    const { data: teachers } = await supabase
      .from('users')
      .select('id, name, email, photo_url')
      .in('id', teacherIds)

    // Combinar dados
    const result = links.map(link => {
      const teacher = teachers?.find(t => t.id === link.teacher_id)
      return {
        id: link.teacher_id,
        name: teacher?.name || 'Professor',
        email: teacher?.email,
        photo_url: teacher?.photo_url,
        hourly_rate: link.hourly_rate,
        hide_free_class: link.hide_free_class,
        linked_at: link.created_at
      }
    })

    res.json({ teachers: result })
  } catch (error: any) {
    console.error('Error fetching student teachers:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
