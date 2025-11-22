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
