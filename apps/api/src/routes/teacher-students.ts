import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/teachers/:teacherId/students - Listar alunos do professor
router.get('/:teacherId/students', async (req, res) => {
  try {
    const { teacherId } = req.params

    const { data, error } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('name', { ascending: true })

    if (error) throw error

    res.json({ students: data || [] })
  } catch (error: any) {
    console.error('Error fetching students:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/teachers/:teacherId/students - Criar aluno
router.post('/:teacherId/students', async (req, res) => {
  try {
    const { teacherId } = req.params
    const { name, email, phone, notes } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' })
    }

    const { data, error } = await supabase
      .from('teacher_students')
      .insert({
        teacher_id: teacherId,
        name,
        email,
        phone,
        notes
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ student: data })
  } catch (error: any) {
    console.error('Error creating student:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/teachers/:teacherId/students/:studentId - Atualizar aluno
router.put('/:teacherId/students/:studentId', async (req, res) => {
  try {
    const { teacherId, studentId } = req.params
    const { name, email, phone, notes } = req.body

    const { data, error } = await supabase
      .from('teacher_students')
      .update({ name, email, phone, notes, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .eq('teacher_id', teacherId)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({ error: 'Aluno não encontrado' })
    }

    res.json({ student: data })
  } catch (error: any) {
    console.error('Error updating student:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/teachers/:teacherId/students/:studentId - Excluir aluno
router.delete('/:teacherId/students/:studentId', async (req, res) => {
  try {
    const { teacherId, studentId } = req.params

    const { error } = await supabase
      .from('teacher_students')
      .delete()
      .eq('id', studentId)
      .eq('teacher_id', teacherId)

    if (error) throw error

    res.json({ message: 'Aluno excluído com sucesso' })
  } catch (error: any) {
    console.error('Error deleting student:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
