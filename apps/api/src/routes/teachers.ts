import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'

const router = express.Router()

// Schema de validação para professor
const teacherSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  hourly_rate: z.number().min(0).optional(),
  availability: z.object({}).optional(),
  is_available: z.boolean().optional()
})

// ---------------- BLOQUEIOS DE AGENDA ----------------
// POST /api/teachers/:id/blocks/slot
router.post('/:id/blocks/slot', async (req, res) => {
  try {
    const { id } = req.params // teacherId
    const { academy_id, date, time, notes } = req.body as {
      academy_id: string
      date: string // YYYY-MM-DD
      time: string // HH:mm
      notes?: string
    }

    if (!academy_id || !date || !time) {
      return res.status(400).json({ error: 'academy_id, date e time são obrigatórios' })
    }

    const [hours, minutes] = String(time).split(':').map((n: string) => parseInt(n, 10))
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCHours(hours, minutes, 0, 0)

    // Descobrir duração do slot pela configuração da academia
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
    const { data: slotCfg } = await supabase
      .from('academy_time_slots')
      .select('time, duration_minutes')
      .eq('academy_id', academy_id)
      .eq('day_of_week', dow)
      .eq('time', `${String(time).padStart(5, '0')}:00`)
      .single()
    const duration = slotCfg && typeof slotCfg.duration_minutes === 'number' && slotCfg.duration_minutes > 0 ? slotCfg.duration_minutes : 60

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        teacher_id: id,
        franchise_id: academy_id,
        student_id: null,
        date: d.toISOString(),
        duration,
        credits_cost: 0,
        status: 'BLOCKED',
        notes: notes || 'Bloqueio de agenda'
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ booking })
  } catch (error: any) {
    console.error('Erro ao bloquear slot:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/teachers/:id/blocks/day
router.post('/:id/blocks/day', async (req, res) => {
  try {
    const { id } = req.params // teacherId
    const { academy_id, date, notes } = req.body as { academy_id: string; date: string; notes?: string }
    if (!academy_id || !date) {
      return res.status(400).json({ error: 'academy_id e date são obrigatórios' })
    }

    // Calcular dia da semana
    const reqDate = new Date(`${date}T00:00:00Z`)
    const dow = reqDate.getUTCDay()

    // Buscar slots configurados
    const { data: slots, error: slotsError } = await supabase
      .from('academy_time_slots')
      .select('time, max_capacity, is_available')
      .eq('academy_id', academy_id)
      .eq('day_of_week', dow)
      .eq('is_available', true)
      .order('time')
    if (slotsError) throw slotsError

    // Bookings do dia
    const startISO = new Date(`${date}T00:00:00Z`).toISOString()
    const endISO = new Date(`${date}T23:59:59Z`).toISOString()
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('date, status')
      .eq('franchise_id', academy_id)
      .gte('date', startISO)
      .lte('date', endISO)
    if (bookingsError) throw bookingsError

    const occ: Record<string, number> = {}
    for (const b of bookings || []) {
      if (b.status === 'CANCELLED') continue
      const t = new Date(b.date)
      const hhmm = t.toISOString().substring(11, 16)
      occ[hhmm] = (occ[hhmm] || 0) + 1
    }

    const toBlock: { date: string; duration: number; notes?: string }[] = []
    for (const s of slots || []) {
      const hhmm = String(s.time).substring(0, 5)
      const current = occ[hhmm] || 0
      const max = s.max_capacity ?? 1
      const remaining = Math.max(0, max - current)
      if (remaining > 0) {
        const [h, m] = hhmm.split(':').map((n: string) => parseInt(n, 10))
        const d = new Date(`${date}T00:00:00Z`)
        d.setUTCHours(h, m, 0, 0)
        const duration = typeof (s as any).duration_minutes === 'number' && (s as any).duration_minutes > 0 ? (s as any).duration_minutes : 60
        toBlock.push({ date: d.toISOString(), duration, notes })
      }
    }

    let created: any[] = []
    if (toBlock.length > 0) {
      const payload = toBlock.map(b => ({
        teacher_id: id,
        franchise_id: academy_id,
        student_id: null,
        date: b.date,
        duration: b.duration,
        credits_cost: 0,
        status: 'BLOCKED',
        notes: b.notes || 'Bloqueio de agenda (dia)'
      }))
      const { data, error } = await supabase.from('bookings').insert(payload).select()
      if (error) throw error
      created = data || []
    }

    res.status(201).json({ created })
  } catch (error: any) {
    console.error('Erro ao bloquear dia:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/teachers/:id/blocks
router.get('/:id/blocks', async (req, res) => {
  try {
    const { id } = req.params
    const { academy_id, date } = req.query as { academy_id?: string; date?: string }

    let query = supabase
      .from('bookings')
      .select('id, date, duration, status, notes, franchise_id')
      .eq('teacher_id', id)
      .eq('status', 'BLOCKED')

    if (academy_id) query = query.eq('franchise_id', academy_id)
    if (date) {
      const startISO = new Date(`${date}T00:00:00Z`).toISOString()
      const endISO = new Date(`${date}T23:59:59Z`).toISOString()
      query = query.gte('date', startISO).lte('date', endISO)
    }

    const { data, error } = await query.order('date')
    if (error) throw error
    res.json({ blocks: data || [] })
  } catch (error: any) {
    console.error('Erro ao listar bloqueios:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/teachers/:id/blocks/:bookingId (desbloquear)
router.delete('/:id/blocks/:bookingId', async (req, res) => {
  try {
    const { id, bookingId } = req.params
    // Verificar se booking pertence ao teacher
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, teacher_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.teacher_id !== id) {
      return res.status(404).json({ error: 'Bloqueio não encontrado' })
    }

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
    if (error) throw error
    res.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao desbloquear:', error)
    res.status(500).json({ error: error.message })
  }
})
// Schema para criação de professor
const createTeacherSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  academy_id: z.string().uuid('Academy ID inválido'),
  avatar_url: z.string().url().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  hourly_rate: z.number().min(0).optional(),
  availability: z.object({}).optional(),
  commission_rate: z.number().min(0).max(1).optional()
})

// GET /api/teachers - Listar todos os professores
router.get('/', async (req, res) => {
  try {
    const { academy_id, city, state } = req.query

    let query = supabase
      .from('users')
      .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          rating,
          total_reviews,
          availability,
          is_available
        ),
        academy_teachers!inner (
          id,
          academy_id,
          status,
          commission_rate,
          academies (
            id,
            name,
            city,
            state,
            address,
            phone,
            email
          )
        ),
        teacher_subscriptions (
          id,
          status,
          start_date,
          end_date,
          teacher_plans (
            name,
            price,
            commission_rate,
            features
          )
        )
      `)
      .eq('role', 'TEACHER')
      .eq('is_active', true)
      .eq('academy_teachers.status', 'active')
      .order('created_at', { ascending: false })

    if (academy_id) {
      query = query.eq('academy_teachers.academy_id', academy_id)
    }

    const { data: teachers, error } = await query

    if (error) {
      console.error('Erro ao buscar professores:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    // Filtrar por cidade/estado se fornecido
    let filteredTeachers = teachers || []

    if (city) {
      filteredTeachers = filteredTeachers.filter(teacher =>
        teacher.academy_teachers?.some((at: any) =>
          at.academies?.city?.toLowerCase().includes((city as string).toLowerCase())
        )
      )
    }

    if (state) {
      filteredTeachers = filteredTeachers.filter(teacher =>
        teacher.academy_teachers?.some((at: any) =>
          at.academies?.state?.toLowerCase() === (state as string).toLowerCase()
        )
      )
    }

    // Filtrar apenas professores disponíveis
    filteredTeachers = filteredTeachers.filter(teacher =>
      teacher.teacher_profiles?.[0]?.is_available === true
    )

    res.json(filteredTeachers)

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id - Buscar professor por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: teacher, error } = await supabase
      .from('users')
      .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          rating,
          total_reviews,
          availability,
          is_available
        ),
        academy_teachers (
          id,
          academy_id,
          status,
          commission_rate,
          academies (
            name,
            email,
            phone,
            address,
            city,
            state
          )
        ),
        teacher_subscriptions (
          id,
          status,
          start_date,
          end_date,
          next_due_date,
          asaas_subscription_id,
          teacher_plans (
            name,
            description,
            price,
            commission_rate,
            features
          )
        ),
        bookings (
          id,
          date,
          duration,
          status,
          notes,
          credits_cost,
          student:users!bookings_student_id_fkey (
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
      .eq('role', 'TEACHER')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Professor não encontrado' })
      }
      console.error('Erro ao buscar professor:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    res.json(teacher)

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/teachers/:id - Atualizar perfil do professor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = teacherSchema.parse(req.body)

    // Verificar se o professor existe
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ message: 'Professor não encontrado' })
    }

    // Atualizar perfil do professor
    const { data: updatedProfile, error: updateError } = await supabase
      .from('teacher_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar professor:', updateError)
      return res.status(500).json({ message: 'Erro ao atualizar professor' })
    }

    res.json({
      message: 'Professor atualizado com sucesso',
      profile: updatedProfile
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/teachers - Criar novo professor
router.post('/', async (req, res) => {
  try {
    const validatedData = createTeacherSchema.parse(req.body)
    const {
      name,
      email,
      phone,
      academy_id,
      avatar_url,
      bio,
      specialties,
      hourly_rate,
      availability,
      commission_rate
    } = validatedData

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
        role: 'TEACHER',
        avatar_url,
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('Erro ao criar usuário:', userError)
      return res.status(500).json({ error: 'Erro ao criar usuário' })
    }

    // Criar perfil do professor
    const { data: profile, error: profileError } = await supabase
      .from('teacher_profiles')
      .insert({
        user_id: user.id,
        bio: bio || '',
        specialties: specialties || [],
        hourly_rate: hourly_rate || 0,
        availability: availability || {},
        is_available: true
      })
      .select()
      .single()

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
      await supabase.from('users').delete().eq('id', user.id)
      return res.status(500).json({ error: 'Erro ao criar perfil do professor' })
    }

    // Associar com academia
    const { data: academyTeacher, error: academyError } = await supabase
      .from('academy_teachers')
      .insert({
        teacher_id: user.id,
        academy_id,
        status: 'active',
        commission_rate: commission_rate || 0.70
      })
      .select()
      .single()

    if (academyError) {
      console.error('Erro ao associar com academia:', academyError)
      await supabase.from('teacher_profiles').delete().eq('user_id', user.id)
      await supabase.from('users').delete().eq('id', user.id)
      return res.status(500).json({ error: 'Erro ao associar professor com academia' })
    }

    // Buscar dados completos do professor criado
    const { data: fullTeacher, error: fetchError } = await supabase
      .from('users')
      .select(`
        *,
        teacher_profiles (
          id,
          bio,
          specialties,
          hourly_rate,
          rating,
          total_reviews,
          availability,
          is_available
        ),
        academy_teachers (
          id,
          academy_id,
          status,
          commission_rate,
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
      return res.status(500).json({ error: 'Professor criado, mas erro ao buscar dados' })
    }

    res.status(201).json(fullTeacher)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/teachers/:id - Excluir professor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se professor existe
    const { data: existingTeacher } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (!existingTeacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
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

    // Desativar perfil
    const { error: profileError } = await supabase
      .from('teacher_profiles')
      .update({
        is_available: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)

    if (profileError) {
      console.error('Erro ao desativar perfil:', profileError)
      return res.status(500).json({ error: 'Erro ao desativar perfil' })
    }

    // Desativar associação com academia
    const { error: academyError } = await supabase
      .from('academy_teachers')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('teacher_id', id)

    if (academyError) {
      console.error('Erro ao desativar associação:', academyError)
      return res.status(500).json({ error: 'Erro ao desativar associação' })
    }

    res.json({ message: 'Professor desativado com sucesso' })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/stats - Estatísticas do professor
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se professor existe
    const { data: teacher } = await supabase
      .from('users')
      .select('id, created_at')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (!teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // Buscar estatísticas
    const [bookingsData, transactionsData, subscriptionData, profileData] = await Promise.all([
      // Total de aulas
      supabase
        .from('bookings')
        .select('id, status, date, credits_cost')
        .eq('teacher_id', id),

      // Transações
      supabase
        .from('transactions')
        .select('id, type, amount, created_at')
        .eq('user_id', id),

      // Assinatura atual
      supabase
        .from('teacher_subscriptions')
        .select(`
          *,
          teacher_plans (
            name,
            price,
            commission_rate,
            features
          )
        `)
        .eq('teacher_id', id)
        .eq('status', 'active')
        .single(),

      // Perfil e avaliações
      supabase
        .from('teacher_profiles')
        .select('rating, total_reviews, hourly_rate')
        .eq('user_id', id)
        .single()
    ])

    const bookings = bookingsData.data || []
    const transactions = transactionsData.data || []
    const subscription = subscriptionData.data
    const profile = profileData.data

    const completedBookings = bookings.filter(b => b.status === 'COMPLETED')
    const totalRevenue = completedBookings.reduce((sum, b) => {
      const rate = profile?.hourly_rate || 0
      const duration = 60 // Assumindo 60 minutos por sessão
      return sum + (rate * (duration / 60))
    }, 0)

    const stats = {
      total_bookings: bookings.length,
      completed_bookings: completedBookings.length,
      pending_bookings: bookings.filter(b => b.status === 'PENDING').length,
      cancelled_bookings: bookings.filter(b => b.status === 'CANCELLED').length,
      total_students: new Set(bookings.map(b => b.student_id)).size,
      total_revenue: totalRevenue,
      rating: profile?.rating || 0,
      total_reviews: profile?.total_reviews || 0,
      hourly_rate: profile?.hourly_rate || 0,
      current_subscription: subscription,
      last_booking_date: bookings.length > 0
        ? bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null,
      join_date: teacher.created_at,
      monthly_earnings: {
        current_month: completedBookings
          .filter(b => {
            const bookingDate = new Date(b.date)
            const now = new Date()
            return bookingDate.getMonth() === now.getMonth() &&
                   bookingDate.getFullYear() === now.getFullYear()
          })
          .reduce((sum, b) => {
            const rate = profile?.hourly_rate || 0
            return sum + (rate * 1) // 1 hora por aula
          }, 0)
      }
    }

    res.json(stats)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/availability - Disponibilidade do professor
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params

    const { data: profile, error } = await supabase
      .from('teacher_profiles')
      .select('availability, is_available')
      .eq('user_id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Professor não encontrado' })
      }
      console.error('Erro ao buscar disponibilidade:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    res.json(profile)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/teachers/:id/availability - Atualizar disponibilidade
router.put('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params
    const { availability, is_available } = req.body

    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (availability !== undefined) updates.availability = availability
    if (is_available !== undefined) updates.is_available = is_available

    const { data, error } = await supabase
      .from('teacher_profiles')
      .update(updates)
      .eq('user_id', id)
      .select('availability, is_available')
      .single()

    if (error) {
      console.error('Erro ao atualizar disponibilidade:', error)
      return res.status(500).json({ error: 'Erro ao atualizar disponibilidade' })
    }

    res.json(data)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router