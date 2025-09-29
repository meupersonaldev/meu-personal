import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

const router = express.Router()

// Schema de validação para agendamento
const bookingSchema = z.object({
  student_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  date: z.string(),
  duration: z.number().min(30).max(180).optional().default(60),
  notes: z.string().optional(),
  credits_cost: z.number().min(1)
})

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional()
})

// GET /api/bookings - Listar agendamentos
router.get('/', async (req, res) => {
  try {
    const { student_id, teacher_id, status } = req.query

    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url)
      `)
      .order('date', { ascending: true })

    if (student_id) {
      query = query.eq('student_id', student_id)
    }
    if (teacher_id) {
      query = query.eq('teacher_id', teacher_id)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Erro ao buscar agendamentos:', error)
      return res.status(500).json({ message: 'Erro ao buscar agendamentos' })
    }

    // Formatar dados para compatibilidade com o frontend
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      studentId: booking.student_id,
      teacherId: booking.teacher_id,
      teacherName: booking.teacher?.name || '',
      teacherAvatar: booking.teacher?.avatar_url || '',
      studentName: booking.student?.name || '',
      date: booking.date,
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      creditsCost: booking.credits_cost,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    }))

    res.json({ bookings: formattedBookings })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// GET /api/bookings/:id - Buscar agendamento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name, email, avatar_url),
        teacher:users!bookings_teacher_id_fkey (id, name, email, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    // Formatar dados
    const formattedBooking = {
      id: booking.id,
      studentId: booking.student_id,
      teacherId: booking.teacher_id,
      teacherName: booking.teacher?.name || '',
      teacherAvatar: booking.teacher?.avatar_url || '',
      studentName: booking.student?.name || '',
      date: booking.date,
      duration: booking.duration,
      status: booking.status,
      notes: booking.notes,
      creditsCost: booking.credits_cost,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    }

    res.json({ booking: formattedBooking })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// POST /api/bookings - Criar novo agendamento
router.post('/', async (req, res) => {
  try {
    const bookingData = bookingSchema.parse(req.body)

    // Verificar se o estudante tem créditos suficientes
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', bookingData.student_id)
      .single()

    if (studentError || !student) {
      return res.status(404).json({ message: 'Estudante não encontrado' })
    }

    if (student.credits < bookingData.credits_cost) {
      return res.status(400).json({ message: 'Créditos insuficientes' })
    }

    // Verificar se o professor existe e está disponível
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('is_available')
      .eq('user_id', bookingData.teacher_id)
      .single()

    if (teacherError || !teacher || !teacher.is_available) {
      return res.status(400).json({ message: 'Professor não disponível' })
    }

    // Criar agendamento
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
      .single()

    if (bookingError) {
      console.error('Erro ao criar agendamento:', bookingError)
      return res.status(500).json({ message: 'Erro ao criar agendamento' })
    }

    // Debitar créditos do estudante
    const { error: creditError } = await supabase
      .from('users')
      .update({
        credits: student.credits - bookingData.credits_cost,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingData.student_id)

    if (creditError) {
      console.error('Erro ao debitar créditos:', creditError)
      // Em um cenário real, aqui faria rollback do agendamento
    }

    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      booking: newBooking
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// PUT /api/bookings/:id - Atualizar agendamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = updateBookingSchema.parse(req.body)

    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar agendamento:', error)
      return res.status(500).json({ message: 'Erro ao atualizar agendamento' })
    }

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    res.json({
      message: 'Agendamento atualizado com sucesso',
      booking: updatedBooking
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: error.errors
      })
    }

    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

// DELETE /api/bookings/:id - Cancelar agendamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Buscar agendamento para reembolsar créditos se necessário
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('student_id, credits_cost, status')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    // Atualizar status para cancelado
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Erro ao cancelar agendamento:', updateError)
      return res.status(500).json({ message: 'Erro ao cancelar agendamento' })
    }

    // Reembolsar créditos se o agendamento não foi completado
    if (booking.status !== 'COMPLETED') {
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', booking.student_id)
        .single()

      if (!studentError && student) {
        await supabase
          .from('users')
          .update({
            credits: student.credits + booking.credits_cost,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.student_id)
      }
    }

    res.json({ message: 'Agendamento cancelado com sucesso' })

  } catch (error) {
    console.error('Erro interno:', error)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

export default router