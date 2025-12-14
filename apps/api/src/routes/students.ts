import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/students - Listar todos os alunos
// Inclui alunos vinculados explicitamente E alunos com bookings na unidade
router.get('/', async (req, res) => {
  try {
    const { academy_id } = req.query

    console.log(`[students] Buscando alunos para academia ${academy_id || 'todas'}`)

    // 1. Buscar alunos vinculados explicitamente via academy_students
    let linkedStudents: any[] = []
    if (academy_id) {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          academy_students!inner (
            id,
            academy_id,
            plan_id,
            status,
            join_date,
            last_activity,
            academies (
              name,
              city,
              state
            )
          ),
          student_subscriptions (
            id,
            status,
            credits_remaining,
            start_date,
            end_date,
            student_plans (
              name,
              price,
              credits_included
            )
          )
        `)
        .eq('role', 'STUDENT')
        .eq('academy_students.academy_id', academy_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[students] Erro ao buscar alunos vinculados:', error)
      } else {
        linkedStudents = data || []
      }
    } else {
      // Se não tem academy_id, buscar todos os alunos vinculados
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          academy_students!inner (
            id,
            academy_id,
            plan_id,
            status,
            join_date,
            last_activity,
            academies (
              name,
              city,
              state
            )
          ),
          student_subscriptions (
            id,
            status,
            credits_remaining,
            start_date,
            end_date,
            student_plans (
              name,
              price,
              credits_included
            )
          )
        `)
        .eq('role', 'STUDENT')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[students] Erro ao buscar alunos:', error)
      } else {
        linkedStudents = data || []
      }
    }

    // 2. Se academy_id foi fornecido, buscar alunos que têm bookings na unidade (mesmo sem vínculo explícito)
    let studentsWithBookings: any[] = []
    if (academy_id) {
      const { data: bookingsWithStudents, error: bookingsError } = await supabase
        .from('bookings')
        .select('student_id')
        .or(`franchise_id.eq.${academy_id},academy_id.eq.${academy_id},unit_id.eq.${academy_id}`)
        .not('student_id', 'is', null)

      if (bookingsError) {
        console.error('[students] Erro ao buscar bookings:', bookingsError)
      } else {
        // Extrair IDs únicos de alunos com bookings
        const studentIdsFromBookings = [...new Set(
          (bookingsWithStudents || [])
            .map((b: any) => b.student_id)
            .filter(Boolean)
        )]

        console.log(`[students] Encontrados ${studentIdsFromBookings.length} alunos com bookings na unidade`)

        // Buscar dados completos desses alunos
        if (studentIdsFromBookings.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('users')
            .select(`
              *,
              academy_students (
                id,
                academy_id,
                plan_id,
                status,
                join_date,
                last_activity,
                academies (
                  name,
                  city,
                  state
                )
              ),
              student_subscriptions (
                id,
                status,
                credits_remaining,
                start_date,
                end_date,
                student_plans (
                  name,
                  price,
                  credits_included
                )
              )
            `)
            .eq('role', 'STUDENT')
            .in('id', studentIdsFromBookings)
            .order('created_at', { ascending: false })

          if (studentsError) {
            console.error('[students] Erro ao buscar alunos com bookings:', studentsError)
          } else {
            studentsWithBookings = studentsData || []
          }
        }
      }
    }

    // 3. Combinar e remover duplicatas
    const linkedStudentIds = new Set(linkedStudents.map((s: any) => s.id))
    const allStudents = [
      ...linkedStudents,
      ...studentsWithBookings.filter((s: any) => !linkedStudentIds.has(s.id))
    ]

    console.log(`[students] Total: ${linkedStudents.length} vinculados + ${studentsWithBookings.length} com bookings = ${allStudents.length} únicos`)

    res.json(allStudents)
  } catch (error) {
    console.error('[students] Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/students/:id - Buscar aluno por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        academy_students (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          last_activity,
          academies (
            name,
            email,
            phone,
            address,
            city,
            state
          )
        ),
        student_subscriptions (
          id,
          status,
          credits_remaining,
          start_date,
          end_date,
          next_due_date,
          asaas_subscription_id,
          student_plans (
            name,
            description,
            price,
            credits_included,
            validity_days
          )
        ),
        bookings (
          id,
          date,
          duration,
          status,
          notes,
          credits_cost,
          teacher:users!bookings_teacher_id_fkey (
            name,
            email
          )
        ),
        transactions (
          id,
          type,
          amount,
          description,
          created_at
        )
      `)
      .eq('id', id)
      .eq('role', 'STUDENT')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Aluno não encontrado' })
      }
      console.error('Erro ao buscar aluno:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    res.json(data)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/students - Criar novo aluno
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      academy_id,
      plan_id,
      avatar_url,
      credits
    } = req.body

    // Validação básica
    if (!name || !email || !academy_id) {
      return res.status(400).json({
        error: 'Nome, email e academia são obrigatórios'
      })
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return res.status(409).json({
        error: 'Email já está em uso'
      })
    }

    // Criar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone,
        role: 'STUDENT',
        avatar_url,
        credits: credits ?? 0,
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('Erro ao criar usuário:', userError)
      return res.status(500).json({ error: 'Erro ao criar usuário' })
    }

    // Associar com academia
    const { data: academyStudent, error: academyError } = await supabase
      .from('academy_students')
      .insert({
        student_id: user.id,
        academy_id,
        plan_id,
        status: 'active'
      })
      .select()
      .single()

    if (academyError) {
      console.error('Erro ao associar com academia:', academyError)

      // Remover usuário se falhou associação
      await supabase.from('users').delete().eq('id', user.id)

      return res.status(500).json({ error: 'Erro ao associar aluno com academia' })
    }

    // Buscar dados completos do aluno criado
    const { data: fullStudent, error: fetchError } = await supabase
      .from('users')
      .select(`
        *,
        academy_students (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          academies (
            name,
            city,
            state
          )
        )
      `)
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('Erro ao buscar dados completos:', fetchError)
      return res.status(500).json({ error: 'Aluno criado, mas erro ao buscar dados' })
    }

    res.status(201).json(fullStudent)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/students/:id - Atualizar aluno
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      email,
      phone,
      avatar_url,
      is_active,
      academy_id,
      plan_id,
      status,
      credits
    } = req.body

    // Verificar se aluno existe
    const { data: existingStudent } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('role', 'STUDENT')
      .single()

    if (!existingStudent) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // Verificar se email já existe (se está sendo alterado)
    if (email) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single()

      if (existingEmail) {
        return res.status(409).json({
          error: 'Email já está em uso por outro usuário'
        })
      }
    }

    // Atualizar dados do usuário
    const userUpdates: any = {}
    if (name !== undefined) userUpdates.name = name
    if (email !== undefined) userUpdates.email = email
    if (phone !== undefined) userUpdates.phone = phone
    if (avatar_url !== undefined) userUpdates.avatar_url = avatar_url
    if (is_active !== undefined) userUpdates.is_active = is_active
    if (credits !== undefined) userUpdates.credits = credits

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString()

      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', id)

      if (userError) {
        console.error('Erro ao atualizar usuário:', userError)
        return res.status(500).json({ error: 'Erro ao atualizar dados do usuário' })
      }
    }

    // Atualizar dados da associação com academia
    const academyUpdates: any = {}
    if (academy_id !== undefined) academyUpdates.academy_id = academy_id
    if (plan_id !== undefined) academyUpdates.plan_id = plan_id
    if (status !== undefined) academyUpdates.status = status

    if (Object.keys(academyUpdates).length > 0) {
      academyUpdates.updated_at = new Date().toISOString()

      const { error: academyError } = await supabase
        .from('academy_students')
        .update(academyUpdates)
        .eq('student_id', id)

      if (academyError) {
        console.error('Erro ao atualizar associação:', academyError)
        return res.status(500).json({ error: 'Erro ao atualizar associação com academia' })
      }
    }

    // Buscar dados atualizados
    const { data: updatedStudent, error: fetchError } = await supabase
      .from('users')
      .select(`
        *,
        academy_students (
          id,
          academy_id,
          plan_id,
          status,
          join_date,
          last_activity,
          academies (
            name,
            city,
            state
          )
        ),
        student_subscriptions (
          id,
          status,
          credits_remaining,
          start_date,
          end_date,
          student_plans (
            name,
            price,
            credits_included
          )
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Erro ao buscar dados atualizados:', fetchError)
      return res.status(500).json({ error: 'Dados atualizados, mas erro ao buscar' })
    }

    res.json(updatedStudent)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/students/:id - Excluir aluno (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se aluno existe
    const { data: existingStudent } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('role', 'STUDENT')
      .single()

    if (!existingStudent) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // Soft delete - marcar como inativo
    const { error: userError } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (userError) {
      console.error('Erro ao desativar usuário:', userError)
      return res.status(500).json({ error: 'Erro ao desativar usuário' })
    }

    // Desativar associação com academia
    const { error: academyError } = await supabase
      .from('academy_students')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('student_id', id)

    if (academyError) {
      console.error('Erro ao desativar associação:', academyError)
      return res.status(500).json({ error: 'Erro ao desativar associação' })
    }

    res.json({ message: 'Aluno desativado com sucesso' })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/students/:id/stats - Estatísticas do aluno
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se aluno existe
    const { data: student } = await supabase
      .from('users')
      .select('id, created_at')
      .eq('id', id)
      .eq('role', 'STUDENT')
      .single()

    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    // Buscar estatísticas
    const [bookingsData, transactionsData, subscriptionData] = await Promise.all([
      // Total de aulas - buscar status_canonical também
      supabase
        .from('bookings')
        .select('id, status, status_canonical, date, start_at, credits_cost')
        .eq('student_id', id),

      // Transações
      supabase
        .from('transactions')
        .select('id, type, amount, created_at')
        .eq('user_id', id),

      // Assinatura atual
      supabase
        .from('student_subscriptions')
        .select(`
          *,
          student_plans (
            name,
            price,
            credits_included
          )
        `)
        .eq('student_id', id)
        .eq('status', 'active')
        .single()
    ])

    const bookings = bookingsData.data || []
    const transactions = transactionsData.data || []
    const subscription = subscriptionData.data

    // Lógica correta usando status_canonical:
    // - Concluídas: status_canonical === 'DONE' OU (status_canonical === 'PAID' E já passou)
    // - Canceladas: status_canonical === 'CANCELED'
    const now = new Date()
    const completed = bookings.filter(b => {
      const canonical = (b.status_canonical || '').toUpperCase()
      if (canonical === 'DONE') {
        return true
      }
      // Aulas PAID que já passaram são consideradas concluídas (já ocorreram)
      if (canonical === 'PAID') {
        const bookingTime = b.start_at ? new Date(b.start_at) : (b.date ? new Date(b.date) : null)
        if (bookingTime) {
          return bookingTime <= now // Já passou = concluída
        }
      }
      return false
    })

    const cancelled = bookings.filter(b => {
      const canonical = (b.status_canonical || '').toUpperCase()
      return canonical === 'CANCELED' || canonical === 'CANCELLED'
    })

    const stats = {
      total_bookings: bookings.length,
      completed_bookings: completed.length,
      cancelled_bookings: cancelled.length,
      total_credits_spent: bookings.reduce((sum, b) => sum + (b.credits_cost || 0), 0),
      total_transactions: transactions.length,
      total_spent: transactions
        .filter(t => ['CREDIT_PURCHASE', 'BOOKING_PAYMENT'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0),
      current_subscription: subscription,
      last_booking_date: bookings.length > 0
        ? bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null,
      join_date: student.created_at
    }

    res.json(stats)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/students/:id/teachers - Listar professores vinculados ao aluno (para Meus Professores)
// Inclui professores fidelizados (is_portfolio=true, connection_status=APPROVED) e solicitações pendentes
router.get('/:id/teachers', async (req, res) => {
  try {
    const { id } = req.params

    console.log('🔍 [Meus Professores] Buscando professores para aluno:', id)

    // Buscar vínculos aprovados E fidelizados (carteira do professor)
    const { data: approvedLinks, error: approvedError } = await supabase
      .from('teacher_students')
      .select('id, teacher_id, hourly_rate, hide_free_class, created_at, user_id, connection_status, is_portfolio')
      .eq('user_id', id)
      .eq('connection_status', 'APPROVED')
      .eq('is_portfolio', true)

    // Buscar solicitações pendentes de fidelização
    const { data: pendingLinks, error: pendingError } = await supabase
      .from('teacher_students')
      .select('id, teacher_id, hourly_rate, hide_free_class, created_at, user_id, connection_status, is_portfolio')
      .eq('user_id', id)
      .eq('connection_status', 'PENDING')

    if (approvedError) {
      console.error('❌ [Meus Professores] Erro na query approved:', approvedError)
      throw approvedError
    }

    if (pendingError) {
      console.error('❌ [Meus Professores] Erro na query pending:', pendingError)
    }

    const allLinks = [...(approvedLinks || []), ...(pendingLinks || [])]
    console.log('🔍 [Meus Professores] Links encontrados:', allLinks.length, { approved: approvedLinks?.length, pending: pendingLinks?.length })

    if (allLinks.length === 0) {
      return res.json({ teachers: [], pendingRequests: [] })
    }

    // Buscar dados dos professores
    const teacherIds = [...new Set(allLinks.map(l => l.teacher_id))]
    console.log('🔍 [Meus Professores] Teacher IDs:', teacherIds)

    const { data: teachers, error: teacherError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, phone')
      .in('id', teacherIds)

    if (teacherError) {
      console.error('❌ [Meus Professores] Erro ao buscar teachers:', teacherError)
    }

    // Separar professores aprovados e solicitações pendentes
    const approvedTeachers = (approvedLinks || []).map(link => {
      const teacher = teachers?.find(t => t.id === link.teacher_id)
      return {
        id: link.teacher_id,
        name: teacher?.name || 'Professor',
        email: teacher?.email,
        phone: teacher?.phone,
        photo_url: teacher?.avatar_url,
        hourly_rate: link.hourly_rate,
        hide_free_class: link.hide_free_class,
        linked_at: link.created_at
      }
    })

    const pendingRequests = (pendingLinks || []).map(link => {
      const teacher = teachers?.find(t => t.id === link.teacher_id)
      return {
        request_id: link.id,
        teacher_id: link.teacher_id,
        name: teacher?.name || 'Professor',
        email: teacher?.email,
        phone: teacher?.phone,
        photo_url: teacher?.avatar_url,
        hourly_rate: link.hourly_rate,
        requested_at: link.created_at
      }
    })

    res.json({ 
      teachers: approvedTeachers,
      pendingRequests: pendingRequests
    })
  } catch (error) {
    console.error('Erro ao buscar professores do aluno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router

