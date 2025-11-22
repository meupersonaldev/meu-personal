import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole } from '../middleware/auth'

const router = express.Router()

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

// GET /api/teachers/:id - Buscar professor por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { data: teacher, error } = await supabase
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

export default router
