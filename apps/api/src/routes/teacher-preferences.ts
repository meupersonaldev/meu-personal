import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/teachers/:teacherId/preferences - Buscar preferências do professor
router.get('/:teacherId/preferences', async (req, res) => {
  try {
    const { teacherId } = req.params

    const { data, error } = await supabase
      .from('teacher_preferences')
      .select('*')
      .eq('teacher_id', teacherId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    res.json(data || { academy_ids: [], bio: '' })
  } catch (error: any) {
    console.error('Error fetching preferences:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/teachers/:teacherId/preferences - Atualizar preferências
router.put('/:teacherId/preferences', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { academy_ids, bio } = req.body

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('teacher_preferences')
      .select('id')
      .eq('teacher_id', teacherId)
      .single()

    if (existing) {
      // Atualizar
      const { data, error } = await supabase
        .from('teacher_preferences')
        .update({
          academy_ids,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId)
        .select()
        .single()

      if (error) throw error
      res.json(data)
    } else {
      // Criar
      const { data, error } = await supabase
        .from('teacher_preferences')
        .insert({
          teacher_id: teacherId,
          academy_ids,
          bio
        })
        .select()
        .single()

      if (error) throw error
      res.json(data)
    }
  } catch (error: any) {
    console.error('Error updating preferences:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/teachers/:teacherId/hours - Buscar horas disponíveis
router.get('/:teacherId/hours', async (req, res) => {
  try {
    const { teacherId } = req.params

    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', teacherId)
      .single()

    if (error) throw error

    res.json({ available_hours: data.credits || 0 })
  } catch (error: any) {
    console.error('Error fetching hours:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
