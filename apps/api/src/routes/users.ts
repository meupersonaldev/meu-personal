import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase'
import multer from 'multer'
import { randomUUID } from 'crypto'
import path from 'path'
import { requireAuth, requireRole } from '../middleware/auth'
import { validateCpfCnpj } from '../utils/validation'
import { emailService } from '../services/email.service'
import { getHtmlEmailTemplate } from '../services/email-templates'

// Cliente Supabase centralizado importado de ../lib/supabase

const router = Router()

// POST /api/users - Criar usuário
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, cpf, role, cref, approval_status, active, specialization, hourly_rate, available_online, available_in_person } = req.body
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN'].includes(user?.role)

    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem criar usuários' })
    }

    // Validações básicas
    if (!name || !email || !cpf) {
      return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios' })
    }

    if (!role || !['STUDENT', 'TEACHER'].includes(role)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' })
    }

    // Verificar se email já existe
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingEmail) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }

    // Validar CPF antes de verificar duplicidade
    const cpfSanitized = cpf.replace(/\D/g, '')
    if (cpfSanitized.length !== 11) {
      return res.status(400).json({ error: 'CPF deve conter 11 dígitos' })
    }
    if (!validateCpfCnpj(cpfSanitized)) {
      return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos e tente novamente.' })
    }

    // Verificar se CPF já existe
    const { data: existingCpf } = await supabase
      .from('users')
      .select('id')
      .eq('cpf', cpfSanitized)
      .single()

    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado' })
    }

    // Preparar dados do usuário
    const userData: any = {
      name,
      email,
      phone,
      cpf: cpf.replace(/\D/g, ''),
      role,
      approval_status: approval_status || (role === 'STUDENT' ? 'approved' : 'pending'),
      active: active !== undefined ? active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Adicionar campos específicos de professores
    if (role === 'TEACHER') {
      userData.cref = cref || null
      userData.approval_status = 'pending' // Professores sempre precisam de aprovação
    }

    // Criar usuário
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (createError) throw createError

    // Criar profile para professor se necessário
    if (role === 'TEACHER') {
      await supabase
        .from('teacher_profiles')
        .insert({
          user_id: newUser.id,
          specialization: specialization || [],
          hourly_rate: hourly_rate || 0,
          available_online: available_online !== undefined ? available_online : true,
          available_in_person: available_in_person !== undefined ? available_in_person : true,
          rating: 0,
          total_reviews: 0,
          total_sessions: 0,
          rating_avg: 0,
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = newUser

    res.status(201).json({
      user: userWithoutPassword,
      message: `${role === 'TEACHER' ? 'Professor' : 'Aluno'} criado com sucesso`
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: error.message })
  }
})

// Configurar multer para upload de arquivos
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido'))
    }
  }
})

// GET /api/users/:id - Buscar usuário
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    if (!isAdmin && user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = data

    res.json({ user: userWithoutPassword })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/users/:id - Atualizar usuário COMPLETO
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, cpf, bio, gender, role, cref, active } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      cpf?: string;
      bio?: string;
      gender?: string;
      role?: string;
      cref?: string;
      active?: boolean;
    }
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN'].includes(user?.role)
    const isOwner = user?.userId === id

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Apenas administradores ou o próprio usuário podem atualizar' })
    }

    // Validação para admins - não permitir mudar role de super_admin
    if (role === 'SUPER_ADMIN' && user.userId !== id) {
      return res.status(403).json({ error: 'Apenas o próprio Super Admin pode alterar seu tipo' })
    }

    const updates: any = {
      updated_at: new Date().toISOString()
    }

    // Campos permitidos para todos os usuários (donos ou admins)
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone
    if (gender !== undefined) updates.gender = gender
    if (active !== undefined) updates.active = active

    // Campos que apenas admins podem alterar
    if (isAdmin) {
      if (cpf !== undefined) {
        const cpfSanitized = String(cpf).replace(/\D/g, '')
        if (cpfSanitized.length !== 11) {
          return res.status(400).json({ error: 'CPF deve conter 11 dígitos' })
        }
        // Validar dígitos verificadores do CPF
        if (!validateCpfCnpj(cpfSanitized)) {
          return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos e tente novamente.' })
        }
        updates.cpf = cpfSanitized
      }
      if (role !== undefined) updates.role = role
      if (cref !== undefined) updates.cref = cref
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Salvar bio em teacher_preferences se fornecida
    if (typeof bio === 'string') {
      const { error: prefError } = await supabase
        .from('teacher_preferences')
        .upsert(
          [{ teacher_id: id, bio, updated_at: new Date().toISOString() }],
          { onConflict: 'teacher_id' }
        )
      if (prefError) {
        console.error('Erro ao salvar bio em teacher_preferences:', prefError)
      }
    }

    // Atualizar role em tabelas relacionadas se mudou
    if (isAdmin && role !== undefined) {
      const isTeacher = ['TEACHER', 'PROFESSOR'].includes(role)
      const isStudent = ['STUDENT', 'ALUNO'].includes(role)

      // Remover vínculos antigos e criar novos
      if (isTeacher) {
        // Remover vínculos de estudante
        await supabase.from('academy_students').delete().eq('student_id', id)
        await supabase.from('student_units').delete().eq('student_id', id)

        // Garantir teacher_profile exista
        const { data: teacherProfile } = await supabase
          .from('teacher_profiles')
          .select('id')
          .eq('user_id', id)
          .single()

        if (!teacherProfile) {
          await supabase.from('teacher_profiles').insert({
            user_id: id,
            specialization: [],
            hourly_rate: 0,
            rating: 0,
            total_reviews: 0,
            total_sessions: 0,
            rating_avg: 0,
            available_online: true,
            available_in_person: true,
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      } else if (isStudent) {
        // Remover vínculos de professor
        await supabase.from('academy_teachers').delete().eq('teacher_id', id)
        await supabase.from('professor_units').delete().eq('professor_id', id)

        // Remover teacher_profile se existir
        await supabase.from('teacher_profiles').delete().eq('user_id', id)
      }
    }

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = data

    res.json({
      user: userWithoutPassword,
      message: 'Usuário atualizado com sucesso em toda a aplicação'
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/users/:id - Atualizar parcialmente usuário
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, cpf, gender } = req.body as { name?: string; email?: string; cpf?: string; gender?: string }
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user?.role)
    if (!isAdmin && user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (gender !== undefined) updateData.gender = gender
    if (cpf !== undefined) {
      const cpfSanitized = String(cpf).replace(/\D/g, '')
      if (cpfSanitized.length !== 11) {
        return res.status(400).json({ error: 'CPF deve conter 11 dígitos' })
      }
      // Validar dígitos verificadores do CPF
      if (!validateCpfCnpj(cpfSanitized)) {
        return res.status(400).json({ error: 'CPF inválido. Verifique os dígitos e tente novamente.' })
      }
      updateData.cpf = cpfSanitized
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = data

    res.json({ user: userWithoutPassword })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/users/:id/password - Alterar senha (próprio usuário ou admin)
router.put('/:id/password', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN'].includes(user?.role)
    const isOwner = user?.userId === id

    // Apenas o próprio usuário ou admin pode alterar senha
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Nova senha é obrigatória' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' })
    }

    // Se for o próprio usuário (não admin), precisa da senha atual
    if (!isAdmin && isOwner) {
      if (typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'Senha atual é obrigatória' })
      }

      const { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('password, password_hash')
        .eq('id', id)
        .single()

      if (fetchError || !dbUser) throw fetchError || new Error('Usuário não encontrado')

      let validPassword = false
      if (dbUser.password_hash) {
        validPassword = await bcrypt.compare(currentPassword, dbUser.password_hash)
      } else if (dbUser.password) {
        validPassword = dbUser.password === currentPassword
      }

      if (!validPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' })
      }
    }

    // Admin pode alterar sem senha atual, apenas precisa da nova senha
    const newHash = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        password: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ message: 'Senha alterada com sucesso' })
  } catch (error: any) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
})

// POST /api/users/:id/reset-password - Resetar senha de usuário (apenas admin) e enviar por email
router.post('/:id/reset-password', requireAuth, requireRole(['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params
    const user = (req as any).user

    // Buscar usuário para resetar senha
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    if (!targetUser.is_active) {
      return res.status(400).json({ error: 'Não é possível resetar senha de usuário inativo' })
    }

    // Gerar token de reset de senha
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET não está configurado' })
    }

    const resetToken = jwt.sign(
      { userId: targetUser.id, email: targetUser.email, type: 'password_reset' },
      jwtSecret,
      { expiresIn: '1h' }
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetUrl = new URL('/redefinir-senha', frontendUrl)
    resetUrl.searchParams.set('token', resetToken)
    const resetLink = resetUrl.toString()

    // Enviar email
    try {
      const emailContent = `
        <p>Olá <strong>${targetUser.name || ''}</strong>,</p>
        <p>Um administrador solicitou a redefinição da sua senha na plataforma <strong>Meu Personal</strong>.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <p>Este link expira em 1 hora.</p>
        <p>Se você não solicitou essa alteração, entre em contato com o suporte imediatamente.</p>
      `

      const html = getHtmlEmailTemplate(
        'Redefinição de Senha (Solicitado por Admin)',
        emailContent,
        resetLink,
        'Redefinir Minha Senha'
      )

      await emailService.sendEmail({
        to: targetUser.email,
        subject: 'Redefinição de senha - Meu Personal',
        html,
        text: [
          `Olá ${targetUser.name || ''},`,
          '',
          'Um administrador solicitou a redefinição da sua senha na plataforma Meu Personal.',
          `Acesse o link a seguir para criar uma nova senha: ${resetLink}`,
          '',
          'Este link expira em 1 hora.',
          'Se você não solicitou essa alteração, entre em contato com o suporte imediatamente.',
          '',
          'Atenciosamente,',
          'Equipe Meu Personal'
        ].join('\n')
      })
    } catch (sendError) {
      console.error('Erro ao enviar email de redefinição de senha:', sendError)
      return res.status(500).json({ error: 'Erro ao enviar email de redefinição de senha' })
    }

    res.json({
      message: 'Email de redefinição de senha enviado com sucesso',
      email: targetUser.email
    })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
})

// POST /api/users/:id/avatar - Upload de avatar
router.post('/:id/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params
    const file = req.file
    const user = (req as any).user
    // Apenas o próprio usuário pode trocar seu avatar
    if (user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    // Gerar nome único para o arquivo
    const fileExt = path.extname(file.originalname)
    const fileName = `${id}-${randomUUID()}${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      })

    if (uploadError) throw uploadError

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Atualizar usuário com URL do avatar
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ avatar_url: publicUrl })
  } catch (error: any) {
    console.error('Error uploading avatar:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/users/:id/cref-card - Upload de carteirinha CREF
router.post('/:id/cref-card', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params
    const file = req.file
    const user = (req as any).user
    // Apenas o próprio usuário pode enviar seu documento
    if (user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    // Gerar nome único
    const fileExt = path.extname(file.originalname)
    const fileName = `${id}-${randomUUID()}${fileExt}`
    const filePath = `cref-cards/${fileName}`

    // Upload no bucket existente (avatars) dentro de subpasta cref-cards
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('users')
      .update({ cref_card_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ cref_card_url: publicUrl })
  } catch (error: any) {
    console.error('Error uploading cref card:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/users/:id/approve - Aprovar usuário (professor)
router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN'].includes(user?.role)

    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar usuários' })
    }

    const { error } = await supabase
      .from('users')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Usuário aprovado com sucesso' })
  } catch (error: any) {
    console.error('Error approving user:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/users/:id/reject - Reprovar usuário (professor)
router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN'].includes(user?.role)

    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem reprovar usuários' })
    }

    const { error } = await supabase
      .from('users')
      .update({
        approval_status: 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: user.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Usuário reprovado' })
  } catch (error: any) {
    console.error('Error rejecting user:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/users/:id - Remover usuário COMPLETO
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const isAdmin = ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN'].includes(user?.role)

    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem remover usuários' })
    }

    // Verificar se o usuário existe antes de remover
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, name, role, avatar_url, cref_card_url')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Impedir remoção de super_admins (a menos que seja ele mesmo)
    if (existingUser.role === 'SUPER_ADMIN' && user.userId !== id) {
      return res.status(403).json({ error: 'Não é possível remover um Super Admin' })
    }

    console.log(`🗑️ Removendo usuário ${existingUser.name} (${existingUser.role}) de TODAS as tabelas relacionadas...`)

    // REMOVER COMPLETAMENTE TODOS OS DADOS RELACIONADOS

    // 1. Vínculos administrativos
    await supabase.from('academy_students').delete().eq('student_id', id)
    await supabase.from('academy_teachers').delete().eq('teacher_id', id)
    await supabase.from('franchise_admins').delete().eq('user_id', id)
    await supabase.from('franqueadora_admins').delete().eq('user_id', id)
    await supabase.from('franqueadora_contacts').delete().eq('user_id', id)

    // 2. Profiles e preferências
    await supabase.from('teacher_preferences').delete().eq('teacher_id', id)
    await supabase.from('teacher_profiles').delete().eq('user_id', id)
    await supabase.from('professor_units').delete().eq('professor_id', id)
    await supabase.from('student_units').delete().eq('student_id', id)

    // 2.5. Vínculos professor-aluno (teacher_students)
    // Remover registros onde o usuário é o professor OU o aluno
    await supabase.from('teacher_students').delete().eq('teacher_id', id)
    await supabase.from('teacher_students').delete().eq('user_id', id)

    // 3. Avaliações e reviews
    await supabase.from('teacher_ratings').delete().or(`teacher_id.eq.${id},student_id.eq.${id}`)
    await supabase.from('reviews').delete().or(`teacher_id.eq.${id},student_id.eq.${id}`)

    // 4. Assinaturas e pacotes
    await supabase.from('student_subscriptions').delete().eq('student_id', id)
    await supabase.from('teacher_subscriptions').delete().eq('teacher_id', id)

    // 5. Saldo e transações
    await supabase.from('student_class_balance').delete().eq('student_id', id)
    await supabase.from('prof_hour_balance').delete().eq('professor_id', id)
    await supabase.from('student_class_tx').delete().eq('student_id', id)
    await supabase.from('hour_tx').delete().eq('professor_id', id)

    // 6. Pagamentos e intents
    await supabase.from('payments').delete().eq('user_id', id)
    await supabase.from('payment_intents').delete().eq('actor_user_id', id)

    // 7. Agendamentos
    await supabase.from('bookings').delete().or(`student_id.eq.${id},teacher_id.eq.${id}`)

    // 8. Notificações e auditoria
    await supabase.from('notifications').delete().eq('user_id', id)
    await supabase.from('audit_logs').delete().eq('actor_user_id', id)

    // 9. Requisições de aprovação
    await supabase.from('approval_requests').delete().eq('user_id', id)
    await supabase.from('approval_requests').delete().eq('reviewed_by', id)

    // 10. Franchises e leads (se for admin da franqueadora)
    await supabase.from('franchise_leads').delete().eq('assigned_to', id)

    // 11. Notificações da franquia
    await supabase.from('franchise_notifications').delete().eq('franchise_admin_id', id)

    // 12. Remover arquivos do storage (avatar e CREF)
    if (existingUser.avatar_url) {
      try {
        const avatarPath = existingUser.avatar_url.split('/').pop()
        if (avatarPath) {
          await supabase.storage.from('avatars').remove([`avatars/${avatarPath}`])
        }
      } catch (err) {
        console.warn('Erro ao remover avatar:', err)
      }
    }

    if (existingUser.cref_card_url) {
      try {
        const crefPath = existingUser.cref_card_url.split('/').pop()
        if (crefPath) {
          await supabase.storage.from('avatars').remove([`cref-cards/${crefPath}`])
        }
      } catch (err) {
        console.warn('Erro ao remover carteirinha CREF:', err)
      }
    }

    // 13. Finalmente remover o usuário da tabela principal
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    console.log(`✅ Usuário ${existingUser.name} removido COMPLETAMENTE da aplicação`)

    res.json({
      message: 'Usuário removido com sucesso',
      details: 'Todos os dados relacionados foram completamente removidos da aplicação'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

