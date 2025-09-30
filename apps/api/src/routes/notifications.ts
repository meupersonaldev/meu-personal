import express from 'express'
import { supabase } from '../config/supabase'

const router = express.Router()

// Buscar notificações
router.get('/', async (req, res) => {
  try {
    const { franchise_admin_id, user_id, limit = 50, unread } = req.query

    const userId = franchise_admin_id || user_id

    if (!userId) {
      return res.status(400).json({ error: 'user_id ou franchise_admin_id é obrigatório' })
    }

    // Por enquanto, retornar array vazio para não quebrar o frontend
    // TODO: Criar tabela de notificações para professores/alunos
    res.json({ notifications: [] })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar notificação como lida
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('franchise_notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Marcar todas as notificações como lidas
router.put('/read-all', async (req, res) => {
  try {
    const { franchise_admin_id } = req.body

    if (!franchise_admin_id) {
      return res.status(400).json({ error: 'franchise_admin_id é obrigatório' })
    }

    const { error } = await supabase
      .from('franchise_notifications')
      .update({ is_read: true })
      .eq('franchise_admin_id', franchise_admin_id)
      .eq('is_read', false)

    if (error) throw error

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar notificação (usado internamente pelo sistema)
router.post('/', async (req, res) => {
  try {
    const { franchise_admin_id, type, title, message, data = {} } = req.body

    if (!franchise_admin_id || !type || !title || !message) {
      return res.status(400).json({
        error: 'franchise_admin_id, type, title e message são obrigatórios'
      })
    }

    const { data: notification, error } = await supabase
      .from('franchise_notifications')
      .insert({
        franchise_admin_id,
        type,
        title,
        message,
        data
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json(notification)
  } catch (error) {
    console.error('Error creating notification:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Função auxiliar para criar notificação (exportada para uso em outras rotas)
export async function createNotification(
  franchise_admin_id: string,
  type: string,
  title: string,
  message: string,
  data: any = {}
) {
  try {
    const { data: notification, error } = await supabase
      .from('franchise_notifications')
      .insert({
        franchise_admin_id,
        type,
        title,
        message,
        data
      })
      .select()
      .single()

    if (error) throw error
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

export default router