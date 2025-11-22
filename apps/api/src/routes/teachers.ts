import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole } from '../middleware/auth'
import { normalizeBookingStatus } from '../utils/booking-status'

const router = express.Router()

const ADMIN_ROLES = ['FRANCHISE_ADMIN', 'FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN'] as const
const TEACHER_ROLES = ['TEACHER'] as const

type RoleValue = typeof ADMIN_ROLES[number] | typeof TEACHER_ROLES[number] | string

const hasAdminAccess = (user?: { role?: RoleValue }) =>
  Boolean(user?.role && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]))

const hasTeacherSelfAccess = (
  user: { userId: string; role?: RoleValue } | undefined,
  teacherId?: string
) =>
  Boolean(
    user && teacherId && user.role && TEACHER_ROLES.includes(user.role as typeof TEACHER_ROLES[number]) && user.userId === teacherId
  )

const ensureTeacherScope = (
  req: express.Request & { user?: { userId: string; role?: RoleValue } },
  res: express.Response,
  teacherId?: string
) => {
  const user = req.user
  if (!user || (!hasAdminAccess(user) && !hasTeacherSelfAccess(user, teacherId))) {
    res.status(403).json({ error: 'Forbidden' })
    return false
  }
  return true
}

const ensureAdminScope = (req: express.Request & { user?: { role?: RoleValue } }, res: express.Response) => {
  const user = req.user
  if (!user || !hasAdminAccess(user)) {
    res.status(403).json({ error: 'Forbidden' })
    return false
  }
  return true
}

// GET /api/teachers/by-academy?academy_id=... - Listar professores vinculados a uma academia (para Franquia)
router.get('/by-academy', requireAuth, requireRole(['FRANCHISE_ADMIN', 'FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { academy_id } = req.query as { academy_id?: string }
    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    // Listar vínculos ativos da academia com dados básicos do usuário
    const { data: links, error: linksErr } = await supabase
      .from('academy_teachers')
      .select(`
        id,
        teacher_id,
        academy_id,
        status,
        created_at,
        users:teacher_id (
          id,
          name,
          email,
          phone,
          avatar_url,
          is_active,
          created_at,
          role
        )
      `)
      .eq('academy_id', academy_id)
      .eq('status', 'active')

    if (linksErr) {
      return res.status(500).json({ error: 'Erro ao buscar professores' })
    }

    const base = (links || []).filter((l: any) => l.users)

    const enriched = await Promise.all(base.map(async (item: any) => {
      const teacherId = item.users.id

      const [allAcademyTeachers, profileRow, subscriptions] = await Promise.all([
        supabase
          .from('academy_teachers')
          .select(`
            *,
            academies:academy_id (
              id,
              name,
              city,
              state
            )
          `)
          .eq('teacher_id', teacherId),
        supabase
          .from('teacher_profiles')
          .select('*')
          .eq('user_id', teacherId)
          .single(),
        supabase
          .from('teacher_subscriptions')
          .select(`
            *,
            teacher_plans (
              name,
              price,
              features
            )
          `)
          .eq('teacher_id', teacherId)
      ])

      const teacher = item.users
      const profile = (profileRow as any)?.data || null
      const subs = (subscriptions as any)?.data || []
      const allLinks = (allAcademyTeachers as any)?.data || []

      return {
        id: teacher.id,
        name: teacher.name || 'Professor',
        email: teacher.email || '',
        phone: teacher.phone || '',
        avatar_url: teacher.avatar_url,
        is_active: teacher.is_active,
        created_at: teacher.created_at,
        specialties: profile?.specialties || profile?.specialization || [],
        status: item.status || 'active',
        teacher_profiles: profile ? [profile] : [],
        academy_teachers: allLinks,
        teacher_subscriptions: subs
      }
    }))

    return res.json({ teachers: enriched })
  } catch (error: any) {
    console.error('Erro ao listar professores por academia:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.put('/:id/academy-link', requireAuth, async (req, res) => {
  try {
    if (!ensureAdminScope(req, res)) {
      return
    }

    const { id } = req.params
    const { academy_id, status, commission_rate } = req.body || {}

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (status !== undefined) updates.status = status
    if (commission_rate !== undefined) updates.commission_rate = commission_rate

    const { data, error } = await supabase
      .from('academy_teachers')
      .update(updates)
      .eq('teacher_id', id)
      .eq('academy_id', academy_id)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao atualizar vínculo professor-academia:', error)
      return res.status(500).json({ error: 'Erro ao atualizar vínculo com academia' })
    }

    res.json({ link: data })
  } catch (error: any) {
    console.error('Erro interno (academy-link):', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Schema de validação para professor
const teacherSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  hourly_rate: z.number().min(0).optional(),
  availability: z.object({}).optional(),
  is_available: z.boolean().optional()
})

// GET /api/teachers/:id/hours - Saldo de horas do professor (somatório global)
router.get('/:id/hours', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user

    // Apenas o próprio professor ou admin pode ver
    const isAdmin = user?.role && ['FRANQUEADORA', 'SUPER_ADMIN', 'ADMIN'].includes(user.role)
    if (!isAdmin && user?.userId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { data, error } = await supabase
      .from('prof_hour_balance')
      .select('available_hours, locked_hours')
      .eq('professor_id', id)

    if (error) {
      console.error('Erro ao buscar saldo de horas:', error)
      return res.status(500).json({ error: 'Erro ao buscar saldo de horas' })
    }

    const rows = data || []
    const totalAvailable = rows.reduce((sum, row) => {
      const available = Number(row.available_hours) || 0
      const locked = Number(row.locked_hours) || 0
      return sum + Math.max(0, available - locked)
    }, 0)

    return res.json({ available_hours: totalAvailable })
  } catch (error: any) {
    console.error('Erro ao processar saldo de horas:', error)
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
})

// ---------------- BLOQUEIOS DE AGENDA ----------------
// POST /api/teachers/:id/blocks/slot
router.post('/:id/blocks/slot', requireAuth, async (req, res) => {
  try {
    const { id } = req.params // teacherId

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

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
    // Duração padrão de 60 minutos (coluna duration_minutes não existe)
    const duration = 60

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

// POST /api/teachers/:id/blocks/custom (bloquear horários específicos)
router.post('/:id/blocks/custom', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    const { academy_id, date, hours } = req.body as { academy_id: string; date: string; hours: string[] }
    
    if (!academy_id || !date || !hours || hours.length === 0) {
      return res.status(400).json({ error: 'academy_id, date e hours são obrigatórios' })
    }

    const toBlock: { date: string; duration: number }[] = []
    for (const hhmm of hours) {
      const d = new Date(`${date}T${hhmm}:00Z`)
      
      // Verificar se já existe reserva com aluno neste horário e unidade
      const startOfHour = new Date(d)
      startOfHour.setUTCMinutes(0, 0, 0)
      const endOfHour = new Date(d)
      endOfHour.setUTCMinutes(59, 59, 999)
      
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id, status, student_id')
        .eq('teacher_id', id)
        .eq('franchise_id', academy_id)
        .gte('date', startOfHour.toISOString())
        .lte('date', endOfHour.toISOString())
        .not('student_id', 'is', null)
        .neq('status', 'CANCELLED')
      
      // Se já tem reserva com aluno, pular este horário
      if (existingBookings && existingBookings.length > 0) {
        continue
      }
      
      toBlock.push({ date: d.toISOString(), duration: 60 })
    }

    if (toBlock.length === 0) {
      return res.status(400).json({ 
        error: 'Todos os horários selecionados já possuem reservas com alunos',
        created: []
      })
    }

    const payload = toBlock.map(b => ({
      teacher_id: id,
      franchise_id: academy_id,
      student_id: null,
      date: b.date,
      duration: b.duration,
      credits_cost: 0,
      status: 'BLOCKED',
      notes: 'Bloqueio de agenda'
    }))

    const { data, error } = await supabase.from('bookings').insert(payload).select()
    if (error) throw error

    res.status(201).json({ created: data || [] })
  } catch (error: any) {
    console.error('Erro ao bloquear horários:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/teachers/:id/blocks/day (DEPRECATED - manter para compatibilidade)
router.post('/:id/blocks/day', requireAuth, async (req, res) => {
  try {
    const { id } = req.params // teacherId

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    const { academy_id, date, notes } = req.body as { academy_id: string; date: string; notes?: string }
    
    if (!academy_id || !date) {
      return res.status(400).json({ error: 'academy_id e date são obrigatórios' })
    }

    // Bloquear TODOS os horários do dia (06:00 às 22:00)
    const allHours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
    
    const toBlock: { date: string; duration: number; notes?: string }[] = []
    for (const hhmm of allHours) {
      // Criar data em UTC direto, sem compensação
      const d = new Date(`${date}T${hhmm}:00Z`)
      const duration = 60 // Duração padrão de 60 minutos
      toBlock.push({ date: d.toISOString(), duration, notes })
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
router.get('/:id/blocks', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

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
router.delete('/:id/blocks/:bookingId', requireAuth, async (req, res) => {
  try {
    const { id, bookingId } = req.params
    if (!ensureTeacherScope(req, res, id)) {
      return
    }
    // Verificar se booking pertence ao teacher
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, teacher_id')
      .eq('id', bookingId)
      .single()
    if (!booking || booking.teacher_id !== id) {
      return res.status(404).json({ error: 'Bloqueio não encontrado' })
    }

    // DELETE real do banco
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
    if (error) throw error
    res.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao desbloquear:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/teachers/:id/blocks/all (limpar todos os bloqueios de uma data)
router.delete('/:id/blocks/all/:date', requireAuth, async (req, res) => {
  try {
    const { id, date } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    const startISO = new Date(`${date}T00:00:00Z`).toISOString()
    const endISO = new Date(`${date}T23:59:59Z`).toISOString()
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('teacher_id', id)
      .eq('status', 'BLOCKED')
      .gte('date', startISO)
      .lte('date', endISO)
    
    if (error) throw error
    res.json({ success: true, message: 'Todos os bloqueios removidos' })
  } catch (error: any) {
    console.error('Erro ao limpar bloqueios:', error)
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
router.get('/', requireAuth, async (req, res) => {
  try {
    // Permitir acesso para ADMIN e STUDENT
    const user = req.user
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STUDENT')) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { academy_id, city, state, unit_id } = req.query as {
      academy_id?: string
      city?: string
      state?: string
      unit_id?: string
    }

    // Normalizar parâmetros
    const unitIdParam = typeof unit_id === 'string' && unit_id.trim().length > 0 ? unit_id : null
    let resolvedAcademyId: string | null = typeof academy_id === 'string' && academy_id.trim().length > 0 ? academy_id : null
    let teacherIds: string[] = []

    if (unitIdParam) {
      // Buscar vínculos diretos em professor_units (nova estrutura)
      const { data: professorUnits, error: professorUnitsError } = await supabase
        .from('professor_units')
        .select('professor_id, active')
        .eq('unit_id', unitIdParam)

      if (professorUnitsError) {
        console.error('Erro ao buscar vínculos professor_units:', professorUnitsError)
      } else if (professorUnits) {
        teacherIds = professorUnits
          .filter((pu: any) => pu.active !== false)
          .map((pu: any) => pu.professor_id)
      }

      // Buscar unidade para mapear academy_legacy_id (compatibilidade com academies)
      const { data: unitRecord, error: unitError } = await supabase
        .from('units')
        .select('id, academy_legacy_id')
        .eq('id', unitIdParam)
        .maybeSingle()

      if (unitError) {
        console.error('Erro ao buscar unidade:', unitError)
      } else if (unitRecord?.academy_legacy_id) {
        resolvedAcademyId = unitRecord.academy_legacy_id
      }

      // Se não encontramos nenhum professor e não conseguimos resolver academy, retornar vazio
      if (!resolvedAcademyId && teacherIds.length === 0) {
        return res.json([])
      }
    }

    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        avatar_url,
        created_at,
        is_active,
        role,
        teacher_profiles (
          id,
          bio,
          specialization,
          hourly_rate,
          availability,
          is_available,
          rating_avg,
          rating_count
        ),
        academy_teachers!inner (
          id,
          academy_id,
          status,
          commission_rate
        )
      `)
      .eq('role', 'TEACHER')
      .eq('is_active', true)
      .eq('academy_teachers.status', 'active')
      .order('created_at', { ascending: false })

    if (resolvedAcademyId) {
      query = query.eq('academy_teachers.academy_id', resolvedAcademyId)
    } else if (academy_id) {
      query = query.eq('academy_teachers.academy_id', academy_id)
    }

    // Se unit_id foi fornecido, filtrar pelos IDs dos professores
    if (unitIdParam && teacherIds.length > 0) {
      query = query.in('id', teacherIds)
    }

    const { data: teachers, error } = await query

    if (error) {
      console.error('Erro ao buscar professores:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    if (!teachers || teachers.length === 0) {
      return res.json([])
    }

    // Buscar informações das academias separadamente
    const academyIds = [...new Set(teachers.map((t: any) => t.academy_teachers?.academy_id).filter(Boolean))]
    let academiesMap: Record<string, any> = {}

    if (academyIds.length > 0) {
      const { data: academies } = await supabase
        .from('academies')
        .select('id, name, city, state, address, phone, email')
        .in('id', academyIds)

      if (academies) {
        academiesMap = academies.reduce((acc, academy) => {
          acc[academy.id] = academy
          return acc
        }, {})
      }
    }

    const normalizedTeachers = teachers.map((teacher: any) => {
      const profilesArray = Array.isArray(teacher.teacher_profiles)
        ? teacher.teacher_profiles
        : teacher.teacher_profiles
          ? [teacher.teacher_profiles]
          : []

      const normalizedProfiles = profilesArray.map((profile: any) => ({
        ...profile,
        specialties: profile.specialties ?? profile.specialization ?? []
      }))

      const academyInfo = teacher.academy_teachers?.academy_id
        ? academiesMap[teacher.academy_teachers.academy_id]
        : null

      return {
        ...teacher,
        teacher_profiles: normalizedProfiles,
        academy: academyInfo
      }
    })

    // Filtrar por cidade/estado se fornecido
    let filteredTeachers = normalizedTeachers

    if (city) {
      filteredTeachers = filteredTeachers.filter(teacher =>
        teacher.academy?.city?.toLowerCase().includes((city as string).toLowerCase())
      )
    }

    if (state) {
      filteredTeachers = filteredTeachers.filter(teacher =>
        teacher.academy?.state?.toLowerCase() === (state as string).toLowerCase()
      )
    }

    // Filtrar apenas professores disponíveis
    filteredTeachers = filteredTeachers.filter(teacher =>
      teacher.teacher_profiles?.[0]?.is_available === true
    )

    // Anexar rating do cache (teacher_profiles) em nível raiz
    const enhanced = filteredTeachers.map((t: any) => {
      const profile = t.teacher_profiles?.[0]
      const avg = profile?.rating_avg != null ? Number(profile.rating_avg) : 0
      const count = profile?.rating_count != null ? Number(profile.rating_count) : 0
      return { ...t, rating_avg: avg, rating_count: count }
    })

    res.json(enhanced)

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/stats - Estatísticas do professor
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

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
    const [bookingsData, transactionsData, subscriptionData, profileData, hourTransactionsData, studentsData] = await Promise.all([
      // Total de aulas
      supabase
        .from('bookings')
        .select('id, status, status_canonical, date, credits_cost, student_id, duration, teacher_id')
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

      // Perfil
      supabase
        .from('teacher_profiles')
        .select('hourly_rate')
        .eq('user_id', id)
        .single(),

      // Transações de horas (para calcular horas ganhas da academia)
      supabase
        .from('hour_transactions')
        .select('id, type, hours, created_at, meta_json')
        .eq('professor_id', id)
        .in('type', ['CONSUME']),

      // Alunos do professor (para pegar hourly_rate)
      // Precisamos buscar também o user_id correspondente
      supabase
        .from('teacher_students')
        .select('id, email, hourly_rate')
        .eq('teacher_id', id)
    ])

    const bookings = bookingsData.data || []
    const transactions = transactionsData.data || []
    const subscription = subscriptionData.data
    const profile = profileData.data
    const hourTransactions = hourTransactionsData.data || []
    const students = studentsData.data || []

    // Criar mapa de hourly_rate por user_id (buscar user_id pelo email)
    const studentRateMap = new Map<string, number>()
    for (const student of students) {
      if (student.email && student.hourly_rate) {
        // Buscar user_id pelo email
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', student.email)
          .single()
        
        if (user) {
          studentRateMap.set(user.id, student.hourly_rate)
        }
      }
    }

    // Normalizar status (status/status_canonical)
    const normalizedBookings = bookings.map((b: any) => ({
      ...b,
      _status: normalizeBookingStatus(b.status, b.status_canonical)
    }))

    const completedBookings = normalizedBookings.filter((b: any) => b._status === 'COMPLETED')
    
    // Calcular faturamento total (academia + particular)
    // 1. Horas ganhas da academia (todas as transações CONSUME)
    const totalAcademyEarnings = hourTransactions.reduce((sum: number, t: any) => {
      const rate = profile?.hourly_rate || 0
      return sum + (t.hours * rate)
    }, 0)
    
    // 2. Aulas particulares concluídas (COMPLETED com aluno * hourly_rate do aluno)
    const totalPrivateEarnings = completedBookings
      .filter((b: any) => b.student_id) // Tem aluno
      .reduce((sum: number, b: any) => {
        const studentRate = studentRateMap.get(b.student_id) || 0
        return sum + studentRate
      }, 0)
    
    const totalRevenue = totalAcademyEarnings + totalPrivateEarnings

    const totalCreditsUsed = normalizedBookings
      .filter((b: any) => b.student_id && !['CANCELED', 'BLOCKED', 'AVAILABLE'].includes(b._status))
      .reduce((sum: number, b: any) => sum + (b.credits_cost || 0), 0)

    // Calcular horas ganhas (agendamentos que alunos fizeram com o professor)
    // São as transações CONSUME (aulas realizadas pela academia)
    const hoursEarned = hourTransactions
      .filter((t: any) => t.type === 'CONSUME')
      .reduce((sum: number, t: any) => sum + (t.hours || 0), 0)

    const stats = {
      total_bookings: normalizedBookings.length,
      completed_bookings: completedBookings.length,
      pending_bookings: normalizedBookings.filter((b: any) => ['PENDING', 'RESERVED'].includes(b._status)).length,
      cancelled_bookings: normalizedBookings.filter((b: any) => b._status === 'CANCELED').length,
      total_students: new Set(normalizedBookings.map((b: any) => b.student_id).filter(Boolean)).size,
      total_revenue: totalRevenue,
      total_credits_used: totalCreditsUsed,
      hourly_rate: profile?.hourly_rate || 0,
      hours_earned: hoursEarned,
      current_subscription: subscription,
      last_booking_date: normalizedBookings.length > 0
        ? normalizedBookings.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null,
      join_date: teacher.created_at,
      monthly_earnings: {
        current_month: (() => {
          const now = new Date()
          
          // 1. Horas ganhas da academia (horas consumidas * hourly_rate do professor)
          const academyEarnings = hourTransactions
            .filter((t: any) => {
              const txDate = new Date(t.created_at)
              return txDate.getMonth() === now.getMonth() &&
                     txDate.getFullYear() === now.getFullYear()
            })
            .reduce((sum: number, t: any) => {
              const rate = profile?.hourly_rate || 0
              return sum + (t.hours * rate)
            }, 0)
          
          // 2. Aulas particulares concluídas (COMPLETED com aluno * hourly_rate do aluno)
          const privateEarnings = completedBookings
            .filter((b: any) => {
              const bookingDate = new Date(b.date)
              return b.student_id && // Tem aluno
                     bookingDate.getMonth() === now.getMonth() &&
                     bookingDate.getFullYear() === now.getFullYear()
            })
            .reduce((sum: number, b: any) => {
              const studentRate = studentRateMap.get(b.student_id) || 0
              return sum + studentRate
            }, 0)
          
          return academyEarnings + privateEarnings
        })()
      }
    }

    res.json(stats)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/transactions - Buscar transações do professor
router.get('/:id/transactions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    // Buscar transações de horas
    const { data: hourTransactions, error } = await supabase
      .from('hour_transactions')
      .select('id, type, hours, created_at, meta_json')
      .eq('professor_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar transações:', error)
      return res.status(500).json({ error: 'Erro ao buscar transações' })
    }

    res.json({ transactions: hourTransactions || [] })
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/history - Histórico detalhado com filtros
router.get('/:id/history', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      month, 
      year, 
      student_id, 
      type // 'academy' ou 'private'
    } = req.query

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    // Buscar perfil do professor
    const { data: profile } = await supabase
      .from('teacher_profiles')
      .select('hourly_rate')
      .eq('user_id', id)
      .single()

    // Buscar alunos do professor com hourly_rate
    const { data: students } = await supabase
      .from('teacher_students')
      .select('id, email, hourly_rate')
      .eq('teacher_id', id)

    // Criar mapa de hourly_rate por user_id
    const studentRateMap = new Map<string, number>()
    const studentEmailMap = new Map<string, string>()
    
    if (students) {
      for (const student of students) {
        if (student.email) {
          const { data: user } = await supabase
            .from('users')
            .select('id, name')
            .eq('email', student.email)
            .single()
          
          if (user) {
            studentRateMap.set(user.id, student.hourly_rate || 0)
            studentEmailMap.set(user.id, student.email)
          }
        }
      }
    }

    // Buscar bookings do professor
    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        id,
        date,
        duration,
        status,
        status_canonical,
        credits_cost,
        student_id,
        academy_id,
        users!bookings_student_id_fkey (
          id,
          name,
          email
        ),
        academies (
          id,
          name
        )
      `)
      .eq('teacher_id', id)
      .order('date', { ascending: false })

    // Aplicar filtro de mês/ano
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1)
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59)
      bookingsQuery = bookingsQuery
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
    }

    // Aplicar filtro de aluno
    if (student_id) {
      bookingsQuery = bookingsQuery.eq('student_id', student_id)
    }

    const { data: bookings } = await bookingsQuery

    // Buscar transações de horas (academia)
    let hourTransactionsQuery = supabase
      .from('hour_transactions')
      .select('id, type, hours, created_at, meta_json')
      .eq('professor_id', id)
      .in('type', ['CONSUME'])
      .order('created_at', { ascending: false })

    // Aplicar filtro de mês/ano
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1)
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59)
      hourTransactionsQuery = hourTransactionsQuery
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    }

    const { data: hourTransactions } = await hourTransactionsQuery

    // Processar dados
    const normalizedBookings = (bookings || []).map((b: any) => ({
      ...b,
      _status: normalizeBookingStatus(b.status, b.status_canonical)
    }))

    // Filtrar por tipo
    let filteredBookings = normalizedBookings
    if (type === 'private') {
      filteredBookings = normalizedBookings.filter((b: any) => b.student_id)
    } else if (type === 'academy') {
      filteredBookings = normalizedBookings.filter((b: any) => !b.student_id)
    }

    // Calcular ganhos por aluno (aulas particulares)
    const earningsByStudent = new Map<string, {
      student_id: string
      student_name: string
      student_email: string
      total_classes: number
      completed_classes: number
      total_earnings: number
      hourly_rate: number
    }>()

    filteredBookings
      .filter((b: any) => b._status === 'COMPLETED' && b.student_id)
      .forEach((b: any) => {
        const studentId = b.student_id
        const studentRate = studentRateMap.get(studentId) || 0
        const studentName = b.users?.name || 'Aluno'
        const studentEmail = b.users?.email || studentEmailMap.get(studentId) || ''

        if (!earningsByStudent.has(studentId)) {
          earningsByStudent.set(studentId, {
            student_id: studentId,
            student_name: studentName,
            student_email: studentEmail,
            total_classes: 0,
            completed_classes: 0,
            total_earnings: 0,
            hourly_rate: studentRate
          })
        }

        const entry = earningsByStudent.get(studentId)!
        entry.total_classes++
        entry.completed_classes++
        entry.total_earnings += studentRate
      })

    // Calcular ganhos da academia
    const academyEarnings = (hourTransactions || []).reduce((sum: number, t: any) => {
      const rate = profile?.hourly_rate || 0
      return sum + (t.hours * rate)
    }, 0)

    const academyHours = (hourTransactions || []).reduce((sum: number, t: any) => {
      return sum + (t.hours || 0)
    }, 0)

    // Calcular ganhos de aulas particulares
    const privateEarnings = Array.from(earningsByStudent.values()).reduce(
      (sum, entry) => sum + entry.total_earnings,
      0
    )

    // Totalizadores
    const completedBookings = filteredBookings.filter((b: any) => b._status === 'COMPLETED')
    const totalClasses = completedBookings.length
    const totalEarnings = academyEarnings + privateEarnings

    // Agrupar por mês (últimos 12 meses)
    const monthlyData = []
    const now = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const targetMonth = targetDate.getMonth()
      const targetYear = targetDate.getFullYear()
      
      const monthBookings = normalizedBookings.filter((b: any) => {
        const bookingDate = new Date(b.date)
        return bookingDate.getMonth() === targetMonth &&
               bookingDate.getFullYear() === targetYear &&
               b._status === 'COMPLETED'
      })

      const monthHourTransactions = (hourTransactions || []).filter((t: any) => {
        const txDate = new Date(t.created_at)
        return txDate.getMonth() === targetMonth &&
               txDate.getFullYear() === targetYear
      })

      const monthAcademyEarnings = monthHourTransactions.reduce((sum: number, t: any) => {
        const rate = profile?.hourly_rate || 0
        return sum + (t.hours * rate)
      }, 0)

      const monthPrivateEarnings = monthBookings
        .filter((b: any) => b.student_id)
        .reduce((sum: number, b: any) => {
          const studentRate = studentRateMap.get(b.student_id) || 0
          return sum + studentRate
        }, 0)

      monthlyData.push({
        month: targetMonth + 1,
        year: targetYear,
        month_name: targetDate.toLocaleDateString('pt-BR', { month: 'short' }),
        total_classes: monthBookings.length,
        academy_earnings: monthAcademyEarnings,
        private_earnings: monthPrivateEarnings,
        total_earnings: monthAcademyEarnings + monthPrivateEarnings
      })
    }

    res.json({
      summary: {
        total_classes: totalClasses,
        total_earnings: totalEarnings,
        academy_earnings: academyEarnings,
        academy_hours: academyHours,
        private_earnings: privateEarnings,
        hourly_rate: profile?.hourly_rate || 0
      },
      by_student: Array.from(earningsByStudent.values()).sort(
        (a, b) => b.total_earnings - a.total_earnings
      ),
      monthly: monthlyData,
      bookings: filteredBookings.map((b: any) => ({
        id: b.id,
        date: b.date,
        duration: b.duration,
        status: b._status,
        credits_cost: b.credits_cost,
        student_name: b.users?.name || null,
        student_id: b.student_id,
        academy_name: b.academies?.name || null,
        academy_id: b.academy_id,
        earnings: b.student_id ? (studentRateMap.get(b.student_id) || 0) : 0,
        type: b.student_id ? 'private' : 'academy'
      }))
    })
  } catch (error) {
    console.error('Erro ao processar histórico:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id - Buscar professor por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    const { data: teacher, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        teacher_profiles (
          id,
          bio,
          specialties: specialization,
          hourly_rate,
          availability,
          is_available,
          rating_avg,
          rating_count
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

    // Se não tem teacher_profile, criar um automaticamente
    const profilesArray = Array.isArray(teacher.teacher_profiles)
      ? teacher.teacher_profiles
      : teacher.teacher_profiles
        ? [teacher.teacher_profiles]
        : []

    let profiles = profilesArray.map((profile: any) => ({
      ...profile,
      specialties: profile.specialties ?? profile.specialization ?? []
    }))

    if (profiles.length === 0) {
      const { data: newProfile } = await supabase
        .from('teacher_profiles')
        .insert({
          user_id: id,
          bio: '',
          specialization: [],
          hourly_rate: 0,
          availability: {},
          is_available: true
        })
        .select()
        .single()

      profiles = newProfile
        ? [{ ...newProfile, specialties: newProfile.specialization ?? [] }]
        : []
    }

    // Usar valores em cache do teacher_profiles (fallback 0)
    const firstProfile = profiles?.[0]
    const rCount = firstProfile?.rating_count != null ? Number(firstProfile.rating_count) : 0
    const rAvg = firstProfile?.rating_avg != null ? Number(firstProfile.rating_avg) : 0

    res.json({
      ...teacher,
      teacher_profiles: profiles,
      rating_avg: rAvg,
      rating_count: rCount
    })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/ratings - Listar avaliações do professor (paginação básica)
router.get('/:id/ratings', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '10')), 1), 50)
    const offset = Math.max(parseInt(String(req.query.offset || '0')), 0)

    // Verificar existência do professor
    const { data: teacher, error: tErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (tErr || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // Buscar ratings com paginação
    const rangeStart = offset
    const rangeEnd = offset + limit - 1
    const { data: rows, error } = await supabase
      .from('teacher_ratings')
      .select('id, rating, comment, created_at, student_id')
      .eq('teacher_id', id)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd)

    if (error) {
      console.error('Erro ao buscar avaliações:', error)
      return res.status(500).json({ error: 'Erro ao buscar avaliações' })
    }

    const list = rows || []
    const studentIds = Array.from(new Set(list.map(r => r.student_id).filter(Boolean))) as string[]
    let studentsMap: Record<string, { id: string; name?: string; avatar_url?: string | null }> = {}
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', studentIds)
      if (students) {
        studentsMap = students.reduce((acc, s) => { acc[s.id] = s; return acc }, {} as typeof studentsMap)
      }
    }

    const ratings = list.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      student: r.student_id ? studentsMap[r.student_id] || { id: r.student_id } : null
    }))

    res.json({ ratings })
  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/teachers/:id - Atualizar perfil do professor
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    if (!ensureTeacherScope(req, res, id)) {
      return
    }

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

    // Atualizar dados básicos no users, se enviados
    const { name: uName, email: uEmail, phone: uPhone } = req.body || {}
    if (uName !== undefined || uEmail !== undefined || uPhone !== undefined) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          ...(uName !== undefined ? { name: uName } : {}),
          ...(uEmail !== undefined ? { email: uEmail } : {}),
          ...(uPhone !== undefined ? { phone: uPhone } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (userUpdateError) {
        console.error('Erro ao atualizar usuário (teacher):', userUpdateError)
        return res.status(500).json({ message: 'Erro ao atualizar dados do usuário' })
      }
    }

    // Atualizar perfil do professor
    const { specialties, ...rest } = updateData

    const profileUpdate: Record<string, any> = {
      ...rest,
      updated_at: new Date().toISOString()
    }

    if (specialties !== undefined) {
      profileUpdate.specialization = specialties
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('teacher_profiles')
      .update(profileUpdate)
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
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!ensureAdminScope(req, res)) {
      return
    }

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
        specialization: specialties || [],
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
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!ensureAdminScope(req, res)) {
      return
    }

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

// GET /api/teachers/:id/availability - Disponibilidade do professor
router.get('/:id/availability', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

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
router.put('/:id/availability', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }
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

// GET /api/teachers/:id/academies - Listar academias vinculadas ao professor
router.get('/:id/academies', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    const { data, error } = await supabase
      .from('academy_teachers')
      .select(`
        academy_id,
        status,
        academies (
          id,
          name,
          city,
          state
        )
      `)
      .eq('teacher_id', id)

    if (error) throw error

    const academies = (data || [])
      .filter((at: any) => at.status === 'active' && at.academies)
      .map((at: any) => ({
        id: at.academies.id,
        name: at.academies.name,
        city: at.academies.city,
        state: at.academies.state
      }))


    res.json({ academies })
  } catch (error: any) {
    console.error('Erro ao listar academias do professor:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

