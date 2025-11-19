import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { publish, topicForAcademy, topicForUser, subscribe, topicForFranqueadora } from '../lib/notify'

const notificationTypes = [
  'new_booking',
  'booking_cancelled',
  'checkin',
  'new_student',
  'payment_received',
  'plan_purchased',
  'teacher_approval_needed',
  'student_approval_needed',
  'new_teacher',
  'booking_created'
] as const

type NotificationType = typeof notificationTypes[number]

const router = express.Router()

// Listar notificacoes (por academy_id, franqueadora_id ou user_id)
router.get('/', async (req, res) => {
  try {
    const { academy_id, franchise_admin_id, franqueadora_id, user_id, limit = 50, unread_only, since } = req.query as any

    const academyId = academy_id || franchise_admin_id
    const userId = user_id

    if (!academyId && !franqueadora_id && !userId) {
      return res.status(400).json({ error: 'academy_id, franqueadora_id ou user_id obrigatorio' })
    }

    // Montar lista de academias alvo quando usar franqueadora_id
    let academyIds: string[] | null = null
    if (academyId) academyIds = [academyId]
    if (!academyId && franqueadora_id) {
      const { data: academies } = await supabase
        .from('academies')
        .select('id')
        .eq('franqueadora_id', franqueadora_id)
        .eq('is_active', true)
      academyIds = (academies || []).map((a: any) => a.id)
    }

    const limitN = parseInt(limit as string)
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number.isNaN(limitN) ? 50 : limitN)

    if (academyIds && academyIds.length > 0) {
      if (academyIds.length === 1) query = query.eq('academy_id', academyIds[0])
      else query = query.in('academy_id', academyIds)
    }

    if (unread_only === 'true') {
      query = query.eq('read', false)
    }

    if (since) {
      const sinceDate = new Date(since)
      if (!Number.isNaN(sinceDate.getTime())) query = query.gte('created_at', sinceDate.toISOString())
    }

    const { data: notifications, error } = await query
    if (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({ error: 'Erro ao buscar notificacoes' })
    }

    // Contar nao lidas
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false) as any

    if (academyIds && academyIds.length > 0) {
      if (academyIds.length === 1) countQuery = countQuery.eq('academy_id', academyIds[0])
      else countQuery = countQuery.in('academy_id', academyIds)
    }

    const { count: unreadCount } = await countQuery

    res.json({ notifications: notifications || [], unreadCount: unreadCount || 0 })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar notificacao como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('Error marking notification as read:', error)
      return res.status(500).json({ error: 'Erro ao marcar como lida' })
    }
    res.json({ notification })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar todas como lidas (academy_id ou franqueadora_id)
router.patch('/mark-all-read', async (req, res) => {
  try {
    const body = req.body || {}
    const academyId = body.academy_id || (req.query.academy_id as string | undefined)
    const franqueadoraId = body.franqueadora_id || (req.query.franqueadora_id as string | undefined)
    if (!academyId && !franqueadoraId) {
      return res.status(400).json({ error: 'academy_id ou franqueadora_id obrigatorio' })
    }
    let query = supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('read', false) as any
    if (academyId) {
      query = query.eq('academy_id', academyId)
    } else if (franqueadoraId) {
      const { data: academies } = await supabase
        .from('academies')
        .select('id')
        .eq('franqueadora_id', franqueadoraId)
        .eq('is_active', true)
      const ids = (academies || []).map((a: any) => a.id)
      if (ids.length > 0) query = query.in('academy_id', ids)
      else return res.json({ message: 'Nenhuma academia encontrada; nada a marcar' })
    }
    const { error } = await query
    if (error) {
      console.error('Error marking all as read:', error)
      return res.status(500).json({ error: 'Erro ao marcar todas como lidas' })
    }
    res.json({ message: 'Todas marcadas como lidas' })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar notificacao (uso interno)
router.post('/', async (req, res) => {
  try {
    const notificationSchema = z.object({
      academy_id: z.string().uuid(),
      type: z.enum(notificationTypes),
      title: z.string().min(1).max(255),
      message: z.string().min(1),
      data: z.record(z.any()).optional()
    })
    const validatedData = notificationSchema.parse(req.body)
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({ ...validatedData, read: false, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) {
      console.error('Error creating notification:', error)
      return res.status(500).json({ error: 'Erro ao criar notificacao' })
    }
    try {
      publish(topicForAcademy(notification.academy_id), { event: 'notification', notification })
      if ((notification as any).user_id) publish(topicForUser((notification as any).user_id), { event: 'notification', notification })
      const { data: academy } = await supabase
        .from('academies')
        .select('franqueadora_id')
        .eq('id', notification.academy_id)
        .single()
      if (academy?.franqueadora_id) publish(topicForFranqueadora(academy.franqueadora_id), { event: 'notification', notification })
    } catch {}
    res.status(201).json({ notification })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados invalidos', details: err.errors })
    }
    console.error('Error creating notification:', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Deletar notificacao
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting notification:', error)
      return res.status(500).json({ error: 'Erro ao deletar notificacao' })
    }
    res.json({ message: 'Notificacao deletada' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Funcoes auxiliares (criar e publicar notificacoes)
export async function createNotification(
  academy_id: string,
  type: NotificationType,
  title: string,
  message: string,
  data: any = {}
) {
  try {
    const { data: rows } = await supabase.from('notifications').insert({
      academy_id,
      type,
      title,
      message,
      data,
      read: false,
      created_at: new Date().toISOString()
    }).select('*')
    try {
      const inserted: any = Array.isArray(rows) ? rows[0] : rows
      if (inserted) {
        publish(topicForAcademy(academy_id), { event: 'notification', notification: inserted })
        const { data: academy } = await supabase
          .from('academies')
          .select('franqueadora_id')
          .eq('id', academy_id)
          .single()
        if (academy?.franqueadora_id) publish(topicForFranqueadora(academy.franqueadora_id), { event: 'notification', notification: inserted })
      }
    } catch {}
    return true
  } catch (error) {
    console.error('Error creating notification:', error)
    return false
  }
}

export async function createUserNotification(
  user_id: string,
  type: NotificationType,
  title: string,
  message: string,
  data: any = {}
) {
  try {
    const { data: rows } = await supabase.from('notifications').insert({
      user_id,
      type,
      title,
      message,
      data,
      read: false,
      created_at: new Date().toISOString()
    }).select('*')
    try {
      const inserted: any = Array.isArray(rows) ? rows[0] : rows
      if (inserted) publish(topicForUser(user_id), { event: 'notification', notification: inserted })
    } catch {}
    return true
  } catch (error) {
    console.error('Error creating user notification:', error)
    return false
  }
}

// SSE stream
router.get('/stream', requireAuth, async (req, res) => {
  try {
    const { academy_id, user_id, franqueadora_id, since } = req.query as any
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Replay inicial
    if (since) {
      const sinceDate = new Date(since)
      if (!Number.isNaN(sinceDate.getTime())) {
        try {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .gte('created_at', sinceDate.toISOString())
            .order('created_at', { ascending: true })
            .limit(100)
          for (const n of data || []) send('notification', { notification: n })
        } catch {}
      }
    }

    const unsubs: Array<() => void> = []
    const onMessage = (payload: any) => send('notification', payload)
    if (academy_id) unsubs.push(subscribe(topicForAcademy(academy_id), onMessage))
    if (user_id) {
      // Permitir apenas se o user_id for do próprio usuário ou se for admin
      const requestedUserId = user_id
      const currentUserId = req.user?.userId || ''
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN'

      if (requestedUserId === currentUserId || isAdmin) {
        unsubs.push(subscribe(topicForUser(requestedUserId), onMessage))
      } else {
        console.warn(`Acesso negado ao stream de notificações. Usuário ${currentUserId} tentando acessar notificações de ${requestedUserId}`)
      }
    }
    if (franqueadora_id) {
      let allowed = false
      try {
        if (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN') {
          allowed = true
        } else {
          const { data: fa } = await supabase
            .from('franqueadora_admins')
            .select('franqueadora_id')
            .eq('user_id', req.user?.userId || '')
            .single()
          if (fa?.franqueadora_id && fa.franqueadora_id === franqueadora_id) allowed = true
        }
      } catch {}
      if (allowed) unsubs.push(subscribe(topicForFranqueadora(franqueadora_id), onMessage))
    }

    const ping = setInterval(() => send('ping', {}), 15000)
    req.on('close', () => {
      clearInterval(ping)
      unsubs.forEach(u => { try { u() } catch {} })
      try { res.end() } catch {}
    })
  } catch (e) {
    try { res.end() } catch {}
  }
})

export default router

