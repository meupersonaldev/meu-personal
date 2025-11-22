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

    // Query equivalente ao SQL fornecido - Query nativa
    const { data: teachers } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, created_at, is_active, role')
      .eq('role', 'TEACHER')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!teachers || teachers.length === 0) {
      return res.json([])
    }

    res.json(teachers)

  } catch (error) {
    console.error('Erro ao buscar professores:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})


// GET /api/teachers/by-academy-id - Buscar professores por academy_id (query ORM equivalente)
router.get('/by-academy-id', requireAuth, async (req, res) => {
  try {
    // Permitir acesso para ADMIN e STUDENT
    const user = req.user
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STUDENT')) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { academy_id } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    // Query ORM equivalente ao SQL fornecido
    const { data: teachers, error } = await supabase
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
      .eq('academy_teachers.academy_id', academy_id)
      .eq('academy_teachers.status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar professores:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    if (!teachers || teachers.length === 0) {
      return res.json([])
    }

    // Normalizar os dados para o formato esperado
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

    res.json(normalizedTeachers)

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/teachers/:id/bookings-by-date - Buscar bookings disponíveis do professor por data
router.get('/:id/bookings-by-date', requireAuth, async (req, res) => {
  try {
    // Permitir acesso para ADMIN e STUDENT
    const user = req.user
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STUDENT')) {
      return res.status(403).json({ error: 'Acesso negado' })
    }

    const { id } = req.params
    const { date } = req.query

    if (!date) {
      return res.status(400).json({ error: 'date é obrigatório (YYYY-MM-DD)' })
    }

    // Query ORM equivalente ao SQL fornecido
    // Buscar bookings DISPONÍVEIS (status_canonical = 'AVAILABLE')
    // SEM usar unit_id - apenas franchise_id (academy_id)
    // Filtros: teacher_id, student_id IS NULL, status_canonical = 'AVAILABLE',
    //          data específica, e apenas horários futuros
    
    const targetDate = String(date)
    
    // Timestamp atual para filtrar apenas horários futuros
    const nowUtc = new Date()
    
    // Construir range de data para filtrar (início e fim do dia no timezone de São Paulo)
    const dateStart = new Date(`${targetDate}T00:00:00-03:00`) // Início do dia em São Paulo
    const dateEnd = new Date(`${targetDate}T23:59:59-03:00`) // Fim do dia em São Paulo
    
    // Query base com filtros do Supabase
    let query = supabase
      .from('bookings')
      .select(`
        id,
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
      .is('student_id', null) // student_id IS NULL
      .eq('status_canonical', 'AVAILABLE')
      .gte('start_at', dateStart.toISOString()) // Filtrar por data (start_at >= início do dia)
      .lte('start_at', dateEnd.toISOString()) // Filtrar por data (start_at <= fim do dia)
      .gt('start_at', nowUtc.toISOString()) // Apenas horários futuros
      .order('start_at', { ascending: true, nullsFirst: false })

    // Buscar também bookings que usam apenas 'date' (sem start_at)
    // Como o Supabase não suporta OR diretamente, vamos fazer duas queries e combinar
    const { data: bookingsWithStartAt, error: error1 } = await query

    // Segunda query para bookings que têm apenas 'date' (start_at é null)
    const { data: bookingsWithDateOnly, error: error2 } = await supabase
      .from('bookings')
      .select(`
        id,
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
      .eq('status_canonical', 'AVAILABLE')
      .is('start_at', null) // Apenas os que não têm start_at
      .gte('date', `${targetDate}T00:00:00`) // Filtrar por date
      .lte('date', `${targetDate}T23:59:59`) // Filtrar por date
      .gt('date', nowUtc.toISOString()) // Apenas horários futuros
      .order('date', { ascending: true, nullsFirst: false })

    if (error1 || error2) {
      console.error('Erro ao buscar bookings:', error1 || error2)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }

    // Combinar resultados e remover duplicatas
    const allBookings = [
      ...(bookingsWithStartAt || []),
      ...(bookingsWithDateOnly || [])
    ]

    // Filtrar manualmente por data específica (para garantir precisão com timezone)
    // e apenas futuros
    const targetDateStr = targetDate
    const filteredBookings = allBookings.filter((booking: any) => {
      let bookingDateStr: string | null = null
      let startTime: Date | null = null

      if (booking.start_at) {
        const startDate = new Date(booking.start_at)
        const brazilTimeStr = startDate.toLocaleString('en-US', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        const [month, day, year] = brazilTimeStr.split('/')
        bookingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        startTime = startDate
      } else if (booking.date) {
        const bookingDate = new Date(booking.date)
        const brazilTimeStr = bookingDate.toLocaleString('en-US', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        const [month, day, year] = brazilTimeStr.split('/')
        bookingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        startTime = bookingDate
      }

      // Verificar se é a data correta e se é futuro
      if (bookingDateStr !== targetDateStr || !startTime) {
        return false
      }

      // Verificar se é futuro comparando com NOW no timezone de São Paulo
      const nowBrazilTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      return startTime > nowBrazilTime
    })

    // Normalizar os dados e ordenar por start_time
    const normalizedBookings = filteredBookings
      .map((booking: any) => {
        const startTime = booking.start_at 
          ? new Date(booking.start_at)
          : booking.date 
            ? new Date(booking.date)
            : null

        const endTime = booking.end_at
          ? new Date(booking.end_at)
          : startTime && booking.duration
            ? new Date(startTime.getTime() + booking.duration * 60 * 1000)
            : null

        const academyName = booking.academies?.name || null
        const academyId = booking.franchise_id || null

        return {
          id: booking.id,
          start_time: startTime?.toISOString() || null,
          end_time: endTime?.toISOString() || null,
          duration: booking.duration || 60,
          status_canonical: booking.status_canonical,
          academy_name: academyName,
          academy_id: academyId
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

    // Também verificar se há academyId no teacher_profiles (caso exista)
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('academy_id')
      .eq('user_id', id)
      .single()

    let academies = (academyTeachers || []).map((at: any) => ({
      id: at.academy_id,
      ...at.academies
    }))

    // Se teacher_profiles tiver academy_id e não estiver na lista, adicionar
    if (teacherProfile?.academy_id) {
      const academyId = teacherProfile.academy_id
      const alreadyIncluded = academies.some((a: any) => a.id === academyId)
      
      if (!alreadyIncluded) {
        const { data: academy } = await supabase
          .from('academies')
          .select('*')
          .eq('id', academyId)
          .single()

        if (academy) {
          academies.push(academy)
        }
      }
    }

    res.json({ academies })

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

export default router
