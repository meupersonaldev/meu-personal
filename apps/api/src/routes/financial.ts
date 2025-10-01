import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const router = Router()

// GET /api/financial/summary?academy_id=xxx&period=30d
router.get('/summary', async (req, res) => {
  try {
    const { academy_id, period = '30d' } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    // Calcular data de início baseado no período
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case 'all':
        startDate = new Date('2020-01-01')
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Buscar alunos da academia
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        status,
        created_at,
        student_plans (
          plan_id,
          status,
          student_plans:plan_id (
            name,
            price,
            credits
          )
        )
      `)
      .eq('role', 'STUDENT')
      .gte('created_at', startDate.toISOString())

    if (studentsError) throw studentsError

    // Buscar agendamentos concluídos
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        credits_cost,
        status,
        student_id,
        teacher_id,
        users!bookings_student_id_fkey (name),
        teachers:users!bookings_teacher_id_fkey (name)
      `)
      .eq('franchise_id', academy_id)
      .eq('status', 'COMPLETED')
      .gte('date', startDate.toISOString())

    if (bookingsError) throw bookingsError

    // Buscar planos da academia
    const { data: plans, error: plansError } = await supabase
      .from('student_plans')
      .select('*, plan:plans(*)')
      .eq('academy_id', academy_id)
      .eq('status', 'ACTIVE')

    if (plansError) throw plansError

    // Calcular métricas
    const activeSubscriptions = (students || []).filter((s: any) => s.status === 'active').length
    const totalStudents = (students || []).length

    // Receita de planos
    const planRevenue = (plans || []).reduce((sum: number, sp: any) => {
      return sum + (sp.plan?.price || 0)
    }, 0)

    // Receita de aulas avulsas (baseado em créditos)
    const classRevenue = (bookings || []).reduce((sum: number, b: any) => {
      return sum + (b.credits_cost * 50 || 0) // Assumindo R$ 50 por crédito
    }, 0)

    const totalRevenue = planRevenue + classRevenue
    const averageTicket = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0

    // Agrupar receita por plano
    const revenueByPlan = new Map<string, { name: string; revenue: number; count: number }>()
    
    ;(plans || []).forEach((sp: any) => {
      if (sp.plan) {
        const current = revenueByPlan.get(sp.plan.id) || { 
          name: sp.plan.name, 
          revenue: 0, 
          count: 0 
        }
        revenueByPlan.set(sp.plan.id, {
          name: sp.plan.name,
          revenue: current.revenue + sp.plan.price,
          count: current.count + 1
        })
      }
    })

    const revenueByPlanArray = Array.from(revenueByPlan.values())
      .sort((a, b) => b.revenue - a.revenue)

    // Calcular crescimento mensal (comparar com período anterior)
    const previousPeriodStart = new Date(startDate)
    const periodDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays)

    const { data: previousBookings } = await supabase
      .from('bookings')
      .select('credits_cost')
      .eq('franchise_id', academy_id)
      .eq('status', 'COMPLETED')
      .gte('date', previousPeriodStart.toISOString())
      .lt('date', startDate.toISOString())

    const previousRevenue = (previousBookings || []).reduce((sum: number, b: any) => {
      return sum + (b.credits_cost * 50 || 0)
    }, 0)

    const monthlyGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    // Montar transações
    const transactions = (bookings || []).map((booking: any) => ({
      id: booking.id,
      studentName: booking.users?.name || 'Aluno não encontrado',
      teacherName: booking.teachers?.name || 'Professor não encontrado',
      planName: 'Aula Avulsa',
      amount: booking.credits_cost * 50,
      date: booking.date,
      status: 'completed',
      type: 'class'
    }))

    // Adicionar transações de planos
    ;(plans || []).forEach((sp: any) => {
      if (sp.plan) {
        transactions.push({
          id: `plan-${sp.id}`,
          studentName: sp.student?.name || 'Aluno não encontrado',
          teacherName: '-',
          planName: sp.plan.name,
          amount: sp.plan.price,
          date: sp.created_at,
          status: sp.status === 'ACTIVE' ? 'completed' : 'pending',
          type: 'plan'
        })
      }
    })

    // Ordenar por data
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Resposta
    res.json({
      totalRevenue,
      activeSubscriptions,
      totalStudents,
      averageTicket,
      completedClasses: (bookings || []).length,
      monthlyGrowth,
      revenueByPlan: revenueByPlanArray,
      transactions: transactions.slice(0, 50) // Últimas 50 transações
    })
  } catch (error: any) {
    console.error('Error fetching financial summary:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/financial/revenue-chart?academy_id=xxx&period=30d
router.get('/revenue-chart', async (req, res) => {
  try {
    const { academy_id, period = '30d' } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    const now = new Date()
    let startDate = new Date()
    let groupBy = 'day'
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        groupBy = 'day'
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        groupBy = 'day'
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        groupBy = 'week'
        break
      case 'all':
        startDate = new Date('2020-01-01')
        groupBy = 'month'
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Buscar bookings do período
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('date, credits_cost, status')
      .eq('franchise_id', academy_id)
      .eq('status', 'COMPLETED')
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true })

    if (error) throw error

    // Agrupar por período
    const revenueByPeriod = new Map<string, number>()
    
    ;(bookings || []).forEach((booking: any) => {
      const date = new Date(booking.date)
      let key = ''
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      const revenue = booking.credits_cost * 50
      revenueByPeriod.set(key, (revenueByPeriod.get(key) || 0) + revenue)
    })

    const chartData = Array.from(revenueByPeriod.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))

    res.json({ data: chartData, groupBy })
  } catch (error: any) {
    console.error('Error fetching revenue chart:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
