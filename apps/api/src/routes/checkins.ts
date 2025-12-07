import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { createNotification, createUserNotification } from './notifications'
import { requireAuth } from '../middleware/auth'

const router = Router()

const ADMIN_ROLES = ['FRANQUEADORA', 'FRANQUIA', 'SUPER_ADMIN', 'ADMIN'] as const
const TEACHER_ROLES = ['TEACHER', 'PROFESSOR'] as const

const hasAdminAccess = (user?: { role?: string }) =>
  Boolean(user && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]))

const hasTeacherScope = (user: { userId?: string; role?: string } | undefined, teacherId?: string) =>
  Boolean(
    user &&
    teacherId &&
    TEACHER_ROLES.includes(user.role as typeof TEACHER_ROLES[number]) &&
    user.userId === teacherId
  )

// GET /api/checkins?academy_id=xxx - Listar check-ins de uma academia
router.get('/', requireAuth, async (req, res) => {
  try {
    const { academy_id, teacher_id } = req.query as { academy_id?: string | string[]; teacher_id?: string | string[] }
    const requestedAcademyId = Array.isArray(academy_id) ? academy_id[0] : academy_id
    const requestedTeacherId = Array.isArray(teacher_id) ? teacher_id[0] : teacher_id
    const user = req.user

    if (!requestedAcademyId && !requestedTeacherId) {
      return res.status(400).json({ error: 'academy_id ou teacher_id é obrigatório' })
    }

    if (requestedTeacherId && !hasAdminAccess(user) && !hasTeacherScope(user, requestedTeacherId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (requestedAcademyId && !hasAdminAccess(user)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    let query = supabase
      .from('checkins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (requestedAcademyId) {
      query = query.eq('academy_id', requestedAcademyId)
    }
    if (requestedTeacherId) {
      query = query.eq('teacher_id', requestedTeacherId)
    }

    const { data, error } = await query

    if (error) {
      // Se tabela não existe, retorna array vazio
      if (error.code === '42P01') {
        return res.json({ checkins: [] })
      }
      throw error
    }

    res.json({ checkins: data || [] })
  } catch (error: any) {
    console.error('Error fetching checkins:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/checkins/stats?academy_id=xxx - Estatísticas de check-ins
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { academy_id } = req.query

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Buscar check-ins dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('checkins')
      .select('status, created_at')
      .eq('academy_id', academy_id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      if (error.code === '42P01') {
        return res.json({
          total: 0,
          granted: 0,
          denied: 0,
          today: 0,
          week: 0,
          month: 0
        })
      }
      throw error
    }

    const checkins = data || []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats = {
      total: checkins.length,
      granted: checkins.filter(c => c.status === 'GRANTED').length,
      denied: checkins.filter(c => c.status === 'DENIED').length,
      today: checkins.filter(c => new Date(c.created_at) >= todayStart).length,
      week: checkins.filter(c => new Date(c.created_at) >= weekAgo).length,
      month: checkins.length
    }

    res.json(stats)
  } catch (error: any) {
    console.error('Error fetching checkin stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/checkins/scan - Check-in via recepção
router.post('/scan', async (req, res) => {
  try {
    const schema = z.object({
      booking_id: z.string().uuid(),
      academy_id: z.string().uuid(),
    })

    const { booking_id, academy_id } = schema.parse(req.body)

    // Buscar booking
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('id, status, date, duration, teacher_id, student_id, franchise_id')
      .eq('id', booking_id)
      .single()

    if (getError || !booking) {
      try {
        await supabase.from('checkins').insert({
          academy_id,
          teacher_id: null,
          booking_id,
          status: 'DENIED',
          reason: 'BOOKING_NOT_FOUND',
          method: 'RECEPTION',
          created_at: new Date().toISOString(),
        })
      } catch { }
      try {
        const { onCheckinDenied } = await import('../lib/events')
        await onCheckinDenied(academy_id, 'Tentativa de check-in sem agendamento.', { id: booking_id })
      } catch { }
      return res.status(404).json({ allowed: false, message: 'Agendamento não encontrado' })
    }

    // Validar academia do booking
    if (booking.franchise_id !== academy_id) {
      try {
        await supabase.from('checkins').insert({
          academy_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'DENIED',
          reason: 'WRONG_ACADEMY',
          method: 'RECEPTION',
          created_at: new Date().toISOString(),
        })
      } catch { }
      try {
        const { onCheckinDenied } = await import('../lib/events')
        await onCheckinDenied(academy_id, 'Agendamento nao pertence a esta unidade.', booking)
      } catch { }
      return res.status(403).json({ allowed: false, message: 'Agendamento não pertence a esta unidade' })
    }

    if (booking.status === 'CANCELLED') {
      try {
        await supabase.from('checkins').insert({
          academy_id,
          teacher_id: booking.teacher_id,
          booking_id: booking.id,
          status: 'DENIED',
          reason: 'BOOKING_CANCELLED',
          method: 'RECEPTION',
          created_at: new Date().toISOString(),
        })
      } catch { }
      try {
        const { onCheckinDenied } = await import('../lib/events')
        await onCheckinDenied(academy_id, 'Agendamento cancelado.', booking)
      } catch { }
      return res.status(409).json({ allowed: false, message: 'Agendamento cancelado' })
    }

    // Confirmar se estava PENDING
    if (booking.status === 'PENDING') {
      await supabase
        .from('bookings')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', booking.id)
    }

    // Registrar check-in concedido
    try {
      await supabase.from('checkins').insert({
        academy_id,
        teacher_id: booking.teacher_id,
        booking_id: booking.id,
        status: 'GRANTED',
        reason: null,
        method: 'RECEPTION',
        created_at: new Date().toISOString(),
      })
    } catch { }
    try {
      const { onCheckinGranted } = await import('../lib/events')
      await onCheckinGranted(academy_id, booking)
    } catch { }

    return res.status(200).json({
      allowed: true,
      booking: {
        id: booking.id,
        start: new Date(booking.date).toISOString(),
        duration: booking.duration || 60,
      },
      message: 'Check-in registrado'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ allowed: false, message: 'Dados inválidos', errors: error.errors })
    }
    console.error('Erro no check-in (recepção):', error)
    return res.status(500).json({ allowed: false, message: 'Erro interno' })
  }
})

export default router

