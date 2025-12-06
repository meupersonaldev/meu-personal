import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole } from '../middleware/auth'
import { normalizeBookingStatus } from '../utils/booking-status'

const router = express.Router()

// Helper function para verificar acesso do professor
const ensureTeacherScope = (
  req: { user?: { userId?: string; role?: string } },
  res: { status: (code: number) => { json: (body: any) => void } },
  teacherId: string
): boolean => {
  const user = req.user
  const ADMIN_ROLES = ['ADMIN', 'FRANQUEADORA', 'FRANQUIA']
  const hasAdminAccess = Boolean(user && ADMIN_ROLES.includes(user.role as string))
  const hasTeacherAccess = Boolean(user && user.userId === teacherId)

  if (!user || (!hasAdminAccess && !hasTeacherAccess)) {
    res.status(403).json({ error: 'Acesso negado' })
    return false
  }
  return true
}

// GET /api/teachers - Listar todos os professores
router.get('/', requireAuth, async (req, res) => {
  try {
    // Permitir acesso para ADMIN, STUDENT e ALUNO
    const user = req.user
    if (!user || !['ADMIN', 'STUDENT', 'ALUNO'].includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { academy_id, city, state, unit_id } = req.query as {
      academy_id?: string
      city?: string
      state?: string
      unit_id?: string
    }

    // Query com teacher_profiles para incluir bio e specialties
    const { data: teachers } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, avatar_url, created_at, is_active, role,
        teacher_profiles (
          *
        )
      `)
      .eq('role', 'TEACHER')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!teachers || teachers.length === 0) {
      return res.json([])
    }

    // Normalizar dados para frontend (mapear specialization -> specialties)
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

      return {
        ...teacher,
        teacher_profiles: normalizedProfiles
      }
    })

    res.json(normalizedTeachers)

  } catch (error) {
    console.error('Erro ao buscar professores:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})


// Função compartilhada para buscar professores por academy_id
async function fetchTeachersByAcademy(academyId: string, user: any) {
  console.log(`[fetchTeachersByAcademy] Buscando professores para academia ${academyId}`)

  // 1. Buscar professores vinculados explicitamente via academy_teachers
  const { data: linkedTeachers, error: linkedError } = await supabase
    .from('users')
    .select(`
      *,
      teacher_profiles (
        *
      ),
      academy_teachers!inner (
        *,
        academies:academy_id (
          *
        )
      )
    `)
    .eq('role', 'TEACHER')
    .eq('is_active', true)
    .eq('academy_teachers.academy_id', academyId)
    .eq('academy_teachers.status', 'active')
    .order('created_at', { ascending: false })

  if (linkedError) {
    console.error('[fetchTeachersByAcademy] Erro ao buscar professores vinculados:', linkedError)
  }

  // 2. Buscar professores que têm bookings na unidade (mesmo sem vínculo explícito)
  const { data: bookingsWithTeachers, error: bookingsError } = await supabase
    .from('bookings')
    .select('teacher_id')
    .or(`franchise_id.eq.${academyId},academy_id.eq.${academyId},unit_id.eq.${academyId}`)
    .not('teacher_id', 'is', null)

  if (bookingsError) {
    console.error('[fetchTeachersByAcademy] Erro ao buscar bookings:', bookingsError)
  }

  // Extrair IDs únicos de professores com bookings
  const teacherIdsFromBookings = [...new Set(
    (bookingsWithTeachers || [])
      .map((b: any) => b.teacher_id)
      .filter(Boolean)
  )]

  console.log(`[fetchTeachersByAcademy] Encontrados ${teacherIdsFromBookings.length} professores com bookings na unidade`)

  // 3. Buscar dados completos desses professores
  let teachersWithBookings: any[] = []
  if (teacherIdsFromBookings.length > 0) {
    const { data: teachersData, error: teachersError } = await supabase
      .from('users')
      .select(`
        *,
        teacher_profiles (
          *
        ),
        academy_teachers (
          *,
          academies:academy_id (
            *
          )
        )
      `)
      .eq('role', 'TEACHER')
      .eq('is_active', true)
      .in('id', teacherIdsFromBookings)
      .order('created_at', { ascending: false })

    if (teachersError) {
      console.error('[fetchTeachersByAcademy] Erro ao buscar professores com bookings:', teachersError)
    } else {
      teachersWithBookings = teachersData || []
    }
  }

  // 4. Combinar e remover duplicatas
  const linkedTeacherIds = new Set((linkedTeachers || []).map((t: any) => t.id))
  const allTeachers = [
    ...(linkedTeachers || []),
    ...teachersWithBookings.filter((t: any) => !linkedTeacherIds.has(t.id))
  ]

  console.log(`[fetchTeachersByAcademy] Total: ${linkedTeachers?.length || 0} vinculados + ${teachersWithBookings.length} com bookings = ${allTeachers.length} únicos`)

  // Normalizar os dados para o formato esperado
  const normalizedTeachers = allTeachers.map((teacher: any) => {
    const profilesArray = Array.isArray(teacher.teacher_profiles)
      ? teacher.teacher_profiles
      : teacher.teacher_profiles
        ? [teacher.teacher_profiles]
        : []

    const normalizedProfiles = profilesArray.map((profile: any) => ({
      ...profile,
      specialties: profile.specialties ?? profile.specialization ?? []
    }))

    // Extrair informações da academia
    const academyTeachers = Array.isArray(teacher.academy_teachers)
      ? teacher.academy_teachers
      : teacher.academy_teachers
        ? [teacher.academy_teachers]
        : []

    const academy = academyTeachers[0]?.academies || null

    // Anexar rating do cache (teacher_profiles) em nível raiz
    const profile = normalizedProfiles[0]
    const avg = profile?.rating_avg != null ? Number(profile.rating_avg) : 0
    const count = profile?.rating_count != null ? Number(profile.rating_count) : 0

    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      avatar_url: teacher.avatar_url,
      created_at: teacher.created_at,
      is_active: teacher.is_active,
      role: teacher.role,
      teacher_profiles: normalizedProfiles,
      academy_teachers: academyTeachers,
      academy: academy,
      rating_avg: avg,
      rating_count: count
    }
  })

  return normalizedTeachers
}

// GET /api/teachers/by-academy-id - Buscar professores por academy_id
// Inclui professores vinculados explicitamente E professores com bookings/disponibilidade na unidade
router.get('/by-academy-id', requireAuth, async (req, res) => {
  try {
    // Permitir acesso para ADMIN, STUDENT, ALUNO, FRANCHISE_ADMIN, FRANQUEADORA
    const user = req.user
    const allowedRoles = ['ADMIN', 'STUDENT', 'ALUNO', 'TEACHER', 'FRANCHISE_ADMIN', 'FRANQUEADORA', 'SUPER_ADMIN']
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { academy_id } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    const normalizedTeachers = await fetchTeachersByAcademy(academy_id as string, user)
    res.json({ teachers: normalizedTeachers })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/by-academy - Alias para /by-academy-id (compatibilidade)
router.get('/by-academy', requireAuth, async (req, res) => {
  try {
    // Permitir acesso para ADMIN, STUDENT, ALUNO, FRANCHISE_ADMIN, FRANQUEADORA
    const user = req.user
    const allowedRoles = ['ADMIN', 'STUDENT', 'ALUNO', 'TEACHER', 'FRANCHISE_ADMIN', 'FRANQUEADORA', 'SUPER_ADMIN']
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { academy_id } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    const normalizedTeachers = await fetchTeachersByAcademy(academy_id as string, user)
    res.json({ teachers: normalizedTeachers })
  } catch (error) {
    console.error('[teachers/by-academy] Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/bookings-by-date - Buscar bookings disponíveis do professor por data
router.get('/:id/bookings-by-date', requireAuth, async (req, res) => {
  try {
    const user = req.user
    if (!user || !['ADMIN', 'STUDENT', 'ALUNO'].includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { id } = req.params
    const { date } = req.query

    if (!date) {
      return res.status(400).json({ error: 'date é obrigatório (YYYY-MM-DD)' })
    }

    const targetDate = String(date)
    const nowUtc = new Date()
    const dateStart = new Date(`${targetDate}T00:00:00-03:00`)
    const dateEnd = new Date(`${targetDate}T23:59:59-03:00`)

    // Uma única query: bookings disponíveis (student_id IS NULL e não cancelados)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        start_at,
        end_at,
        date,
        duration,
        status_canonical,
        franchise_id,
        academies:franchise_id (
          name
        )
      `)
      .eq('teacher_id', id)
      .is('student_id', null)
      .neq('status_canonical', 'CANCELED')
      .gte('start_at', dateStart.toISOString())
      .lte('start_at', dateEnd.toISOString())
      .gt('start_at', nowUtc.toISOString())
      .order('start_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar bookings:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    // Normalizar os dados
    const normalizedBookings = (bookings || [])
      .map((booking: any) => {
        const startTime = booking.start_at ? new Date(booking.start_at) : booking.date ? new Date(booking.date) : null
        const endTime = booking.end_at
          ? new Date(booking.end_at)
          : startTime && booking.duration
            ? new Date(startTime.getTime() + booking.duration * 60 * 1000)
            : null

        return {
          id: booking.id,
          start_time: startTime?.toISOString() || null,
          end_time: endTime?.toISOString() || null,
          duration: booking.duration || 60,
          status_canonical: booking.status_canonical,
          academy_name: booking.academies?.name || null,
          academy_id: booking.franchise_id || null,
          student_id: booking.student_id || null
        }
      })
      .sort((a, b) => {
        const timeA = a.start_time ? new Date(a.start_time).getTime() : 0
        const timeB = b.start_time ? new Date(b.start_time).getTime() : 0
        return timeA - timeB
      })

    res.json(normalizedBookings)

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

    if (error || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    res.json({ teacher })

  } catch (error: any) {
    console.error('Erro ao buscar professor:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/teachers/:id/academies - Buscar academias vinculadas ao professor
router.get('/:id/academies', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se o professor existe
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // Buscar academias vinculadas através de academy_teachers
    const { data: academyTeachers, error: academyError } = await supabase
      .from('academy_teachers')
      .select(`
        academy_id,
        status,
        academies (
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          is_active
        )
      `)
      .eq('teacher_id', id)
      .eq('status', 'active')

    if (academyError) {
      console.error('Erro ao buscar academias do professor:', academyError)
      return res.status(500).json({ error: 'Erro ao buscar academias' })
    }

    console.log(`[GET /api/teachers/:id/academies] Professor ${id} - Vínculos encontrados:`, academyTeachers?.length || 0)
    console.log(`[GET /api/teachers/:id/academies] Dados brutos:`, JSON.stringify(academyTeachers, null, 2))

    // Também verificar se há academyId no teacher_profiles (caso exista)
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('academy_id')
      .eq('user_id', id)
      .single()

    // ✅ NOVO: Verificar também teacher_preferences.academy_ids
    const { data: teacherPreferences, error: preferencesError } = await supabase
      .from('teacher_preferences')
      .select('academy_ids')
      .eq('teacher_id', id)
      .single()

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('Erro ao buscar preferências do professor:', preferencesError)
    }

    const preferenceAcademyIds = Array.isArray(teacherPreferences?.academy_ids)
      ? teacherPreferences.academy_ids.filter(Boolean)
      : []

    console.log(`[GET /api/teachers/:id/academies] IDs de preferências encontrados:`, preferenceAcademyIds)

    // Mapear academias, filtrando aquelas que não existem ou estão inativas
    let academies: any[] = []

    // Se o relacionamento retornou academias nulas, buscar diretamente
    const academyIdsFromLinks = (academyTeachers || [])
      .map((at: any) => at.academy_id)
      .filter(Boolean)

    console.log(`[GET /api/teachers/:id/academies] IDs de academy_teachers:`, academyIdsFromLinks)

    // ✅ NOVO: Também buscar academias onde o professor tem bookings
    const { data: bookingsWithAcademies, error: bookingsError } = await supabase
      .from('bookings')
      .select('franchise_id, academy_id, unit_id')
      .eq('teacher_id', id)
      .not('franchise_id', 'is', null)
      .limit(100)

    if (bookingsError) {
      console.error('Erro ao buscar bookings do professor:', bookingsError)
    } else {
      const bookingAcademyIds = [
        ...(bookingsWithAcademies || [])
          .map((b: any) => b.franchise_id || b.academy_id || b.unit_id)
          .filter(Boolean)
      ]
      console.log(`[GET /api/teachers/:id/academies] IDs de academias dos bookings:`, bookingAcademyIds)

      // Adicionar aos IDs de preferências
      preferenceAcademyIds.push(...bookingAcademyIds)
    }

    // ✅ Combinar IDs de academy_teachers e teacher_preferences (agora incluindo bookings)
    const allAcademyIds = [...new Set([...academyIdsFromLinks, ...preferenceAcademyIds])]

    console.log(`[GET /api/teachers/:id/academies] Todos os IDs combinados:`, allAcademyIds)

    if (allAcademyIds.length > 0) {
      // Buscar academias diretamente para garantir que temos os dados
      const { data: academiesData, error: academiesError } = await supabase
        .from('academies')
        .select('id, name, email, phone, address, city, state, is_active')
        .in('id', allAcademyIds)
        .eq('is_active', true)

      if (academiesError) {
        console.error('Erro ao buscar academias diretamente:', academiesError)
      } else {
        academies = academiesData || []
        console.log(`[GET /api/teachers/:id/academies] Academias buscadas diretamente:`, academies.length)
        console.log(`[GET /api/teachers/:id/academies] Academias encontradas:`, academies.map((a: any) => ({ id: a.id, name: a.name, is_active: a.is_active })))
      }
    } else {
      console.log(`[GET /api/teachers/:id/academies] ⚠️ Nenhum ID de academia encontrado!`)
    }

    console.log(`[GET /api/teachers/:id/academies] Academias mapeadas:`, academies.length)

    // Se teacher_profiles tiver academy_id e não estiver na lista, adicionar
    if (teacherProfile?.academy_id) {
      const academyId = teacherProfile.academy_id
      const alreadyIncluded = academies.some((a: any) => a.id === academyId)

      if (!alreadyIncluded) {
        const { data: academy } = await supabase
          .from('academies')
          .select('*')
          .eq('id', academyId)
          .eq('is_active', true)
          .single()

        if (academy) {
          academies.push(academy)
        }
      }
    }

    // Filtrar academias duplicadas e garantir que todas estão ativas
    const uniqueAcademies = academies.filter((academy: any, index: number, self: any[]) =>
      academy &&
      academy.id &&
      academy.is_active !== false &&
      index === self.findIndex((a: any) => a.id === academy.id)
    )

    console.log(`[GET /api/teachers/:id/academies] Academias finais retornadas:`, uniqueAcademies.length)
    console.log(`[GET /api/teachers/:id/academies] IDs das academias:`, uniqueAcademies.map((a: any) => a.id))

    res.json({ academies: uniqueAcademies })

  } catch (error: any) {
    console.error('Erro ao buscar academias do professor:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/teachers/:id/stats - Estatísticas do professor
router.get('/:id/stats', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se o professor existe
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // Buscar academyId do professor (primeiro de academy_teachers, depois de teacher_profiles)
    let academyId: string | null = null

    const { data: academyTeacher } = await supabase
      .from('academy_teachers')
      .select('academy_id')
      .eq('teacher_id', id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (academyTeacher) {
      academyId = academyTeacher.academy_id
    } else {
      // Fallback: verificar teacher_profiles
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles')
        .select('academy_id')
        .eq('user_id', id)
        .single()

      if (teacherProfile?.academy_id) {
        academyId = teacherProfile.academy_id
      }
    }

    if (!academyId) {
      return res.json({
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalStudents: 0
      })
    }

    // Buscar estatísticas de bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('status, student_id')
      .eq('teacher_id', id)

    if (bookingsError) {
      console.error('Erro ao buscar bookings:', bookingsError)
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' })
    }

    // Buscar total de alunos únicos
    const uniqueStudents = new Set((bookings || []).map((b: any) => b.student_id))

    const stats = {
      totalBookings: bookings?.length || 0,
      completedBookings: bookings?.filter((b: any) => b.status === 'COMPLETED' || b.status === 'DONE').length || 0,
      pendingBookings: bookings?.filter((b: any) => b.status === 'PENDING' || b.status === 'RESERVED').length || 0,
      cancelledBookings: bookings?.filter((b: any) => b.status === 'CANCELLED').length || 0,
      totalStudents: uniqueStudents.size,
      academyId
    }

    res.json(stats)

  } catch (error: any) {
    console.error('Erro ao buscar estatísticas do professor:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/teachers/:id - Atualizar perfil profissional do professor
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { bio, specialties, hourly_rate, is_available } = req.body

    // Verificar se o usuário tem permissão (próprio professor ou admin)
    if (!ensureTeacherScope(req, res, id)) {
      return
    }

    // Verificar se professor existe
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'TEACHER')
      .single()

    if (teacherError || !teacher) {
      return res.status(404).json({ error: 'Professor não encontrado' })
    }

    // Verificar se já existe perfil
    const { data: existingProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('user_id', id)
      .single()

    // Mapear campos do frontend para campos reais da tabela
    const profileData: any = {
      updated_at: new Date().toISOString()
    }
    if (bio !== undefined) profileData.bio = bio
    // A tabela usa 'specialization' não 'specialties'
    if (specialties !== undefined) profileData.specialization = specialties
    if (hourly_rate !== undefined) profileData.hourly_rate = Number(hourly_rate)
    if (is_available !== undefined) profileData.is_available = is_available

    let result
    if (existingProfile) {
      // Atualizar perfil existente
      const { data, error } = await supabase
        .from('teacher_profiles')
        .update(profileData)
        .eq('user_id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar perfil:', error)
        return res.status(500).json({ error: 'Erro ao atualizar perfil profissional' })
      }
      result = data
    } else {
      // Criar novo perfil com valores padrão
      const { data, error } = await supabase
        .from('teacher_profiles')
        .insert({
          user_id: id,
          rating: 0,
          total_reviews: 0,
          total_sessions: 0,
          rating_avg: 0,
          available_online: true,
          available_in_person: true,
          created_at: new Date().toISOString(),
          ...profileData
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar perfil:', error)
        return res.status(500).json({ error: 'Erro ao criar perfil profissional' })
      }
      result = data
    }

    res.json({
      message: 'Perfil profissional atualizado com sucesso',
      profile: result
    })

  } catch (error: any) {
    console.error('Erro ao atualizar perfil do professor:', error)
    res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
})

export default router
