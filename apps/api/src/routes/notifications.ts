import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'

const router = express.Router()

// Buscar notificações
router.get('/', async (req, res) => {
  try {
    const { academy_id, franchise_admin_id, user_id, limit = 50, unread_only } = req.query

    const academyId = academy_id || franchise_admin_id
    const userId = user_id

    if (!academyId && !userId) {
      return res.status(400).json({ error: 'academy_id ou user_id é obrigatório' })
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))

    if (academyId) {
      query = query.eq('academy_id', academyId)
    }

    if (unread_only === 'true') {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({ error: 'Erro ao buscar notificações' })
    }

    // Contar não lidas
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)

    if (academyId) {
      countQuery = countQuery.eq('academy_id', academyId)
    }

    const { count: unreadCount } = await countQuery

    res.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar notificação como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString()
      })
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

// Marcar todas as notificações como lidas
router.patch('/mark-all-read', async (req, res) => {
  try {
    const { academy_id } = req.body

    if (!academy_id) {
      return res.status(400).json({ error: 'academy_id é obrigatório' })
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('academy_id', academy_id)
      .eq('read', false)

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

// Criar notificação (usado internamente pelo sistema)
router.post('/', async (req, res) => {
  try {
    const notificationSchema = z.object({
      academy_id: z.string().uuid(),
      type: z.enum(['new_booking', 'booking_cancelled', 'checkin', 'new_student']),
      title: z.string().min(1).max(255),
      message: z.string().min(1),
      data: z.record(z.any()).optional()
    })

    const validatedData = notificationSchema.parse(req.body)

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...validatedData,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return res.status(500).json({ error: 'Erro ao criar notificação' })
    }

    res.status(201).json({ notification })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.errors })
    }
    console.error('Error creating notification:', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/notifications/:id - Deletar notificação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting notification:', error)
      return res.status(500).json({ error: 'Erro ao deletar notificação' })
    }

    res.json({ message: 'Notificação deletada' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Função auxiliar para criar notificação (exportada para uso em outras rotas)
export async function createNotification(
  academy_id: string,
  type: 'new_booking' | 'booking_cancelled' | 'checkin' | 'new_student',
  title: string,
  message: string,
  data: any = {}
) {
  try {
    await supabase.from('notifications').insert({
      academy_id,
      type,
      title,
      message,
      data,
      read: false,
      created_at: new Date().toISOString()
    })
    return true
  } catch (error) {
    console.error('Error creating notification:', error)
    return false
  }
}

export default router