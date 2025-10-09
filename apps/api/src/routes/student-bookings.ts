import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { createNotification, createUserNotification } from './notifications'

const router = express.Router()

// POST /api/bookings/student - Agendamento feito pelo aluno
router.post('/student', async (req, res) => {
  try {
    const schema = z.object({
      student_id: z.string().uuid(),
      teacher_id: z.string().uuid(),
      franchise_id: z.string().uuid(),
      date: z.string(), // ISO ou "YYYY-MM-DDTHH:mm:00Z"
      duration: z.number().min(15).max(240).optional(),
      notes: z.string().optional(),
      // credits_cost NÃO é aceito do cliente; será calculado via academia
    })

    const { student_id, teacher_id, franchise_id, date, duration, notes } = schema.parse(req.body)

    // Validar existência do aluno
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, credits')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return res.status(404).json({ message: 'Aluno não encontrado' })
    }

    // Buscar custo de crédito configurado na academia
    const { data: academyCfg } = await supabase
      .from('academies')
      .select('credits_per_class, class_duration_minutes')
      .eq('id', franchise_id)
      .single()

    const defaultCredits = Number.parseInt(process.env.DEFAULT_CREDITS_PER_CLASS || '1', 10)
    const effectiveCost = Math.max(1, academyCfg?.credits_per_class ?? defaultCredits)
    const effectiveDuration = (typeof duration === 'number' && !Number.isNaN(duration))
      ? duration
      : Math.max(15, academyCfg?.class_duration_minutes ?? 60)

    // Validar créditos do aluno com base no custo da academia
    if ((student.credits || 0) < effectiveCost) {
      return res.status(400).json({ message: 'Créditos insuficientes do aluno' })
    }

    // Validar conflito de horário (mesmo professor e unidade)
    const startDate = new Date(date)
    const endDate = new Date(startDate.getTime() + effectiveDuration * 60000)

    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('teacher_id', teacher_id)
      .eq('franchise_id', franchise_id)
      .gte('date', startDate.toISOString())
      .lt('date', endDate.toISOString())
      .neq('status', 'CANCELLED')

    if (conflictError) {
      console.error('Erro ao validar disponibilidade:', conflictError)
      return res.status(500).json({ message: 'Erro ao validar disponibilidade' })
    }

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ message: 'Professor indisponível neste horário na unidade selecionada' })
    }

    // Criar agendamento CONFIRMED com pagamento do aluno
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id,
        teacher_id,
        franchise_id,
        date: startDate.toISOString(),
        duration: effectiveDuration,
        notes,
        credits_cost: effectiveCost,
        status: 'CONFIRMED',
        payment_source: 'student_credits',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        student:users!bookings_student_id_fkey (id, name),
        teacher:users!bookings_teacher_id_fkey (id, name),
        franchise:academies!bookings_franchise_id_fkey (id, name)
      `)
      .single()

    if (bookingError) {
      console.error('Erro ao criar agendamento do aluno:', bookingError)
      return res.status(500).json({ message: 'Erro ao criar agendamento' })
    }

    // Debitar créditos do aluno
    const remaining = (student.credits || 0) - effectiveCost
    const { error: debitError } = await supabase
      .from('users')
      .update({ credits: remaining, updated_at: new Date().toISOString() })
      .eq('id', student_id)

    if (debitError) {
      console.error('Erro ao debitar créditos do aluno:', debitError)
      // Observação: não fazemos rollback do booking no MVP; tratativa simples
    }

    // Notificar academia
    try {
      await createNotification(
        franchise_id,
        'new_booking',
        'Nova reserva',
        'Um aluno confirmou uma nova reserva.',
        { student_id, teacher_id, date: startDate.toISOString() }
      )
      // Notificações pessoais
      await createUserNotification(
        teacher_id,
        'new_booking',
        'Nova reserva confirmada',
        'Você tem uma nova aula confirmada.',
        { student_id, date: startDate.toISOString() }
      )
      await createUserNotification(
        student_id,
        'new_booking',
        'Reserva confirmada',
        'Sua reserva foi confirmada com sucesso.',
        { teacher_id, date: startDate.toISOString() }
      )
    } catch {}

    return res.status(201).json({
      message: 'Agendamento confirmado com sucesso',
      booking
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos', errors: err.errors })
    }
    console.error('Erro inesperado no agendamento do aluno:', err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

// POST /api/bookings/:id/cancel - Cancelar com política de reembolso (>= 4h, apenas student_credits)
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params

    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('id, status, date, credits_cost, payment_source, student_id, franchise_id')
      .eq('id', id)
      .single()

    if (getError || !booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' })
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Agendamento não pode ser cancelado' })
    }

    // Política de reembolso: >= 4 horas e somente quando payment_source = student_credits
    let refund = null as null | { refunded: boolean; credits: number; recipient: 'student' }
    const start = new Date(booking.date)
    const now = new Date()
    const hoursDiff = (start.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (booking.payment_source === 'student_credits' && hoursDiff >= 4 && booking.student_id) {
      const { data: student } = await supabase
        .from('users')
        .select('credits')
        .eq('id', booking.student_id)
        .single()

      const newBalance = (student?.credits || 0) + (booking.credits_cost || 0)
      const { error: refundError } = await supabase
        .from('users')
        .update({ credits: newBalance, updated_at: new Date().toISOString() })
        .eq('id', booking.student_id)

      if (!refundError) {
        refund = { refunded: true, credits: booking.credits_cost || 0, recipient: 'student' }
      }
    }

    // Cancelar o agendamento mantendo histórico
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (cancelError) {
      console.error('Erro ao cancelar agendamento:', cancelError)
      return res.status(500).json({ message: 'Erro ao cancelar agendamento' })
    }

    try {
      if (booking?.franchise_id) {
        await createNotification(
          booking.franchise_id,
          'booking_cancelled',
          'Reserva cancelada',
          'Uma reserva foi cancelada.',
          { booking_id: id }
        )
      }
      if (booking?.student_id) {
        await createUserNotification(
          booking.student_id,
          'booking_cancelled',
          'Reserva cancelada',
          'Sua reserva foi cancelada.',
          { booking_id: id }
        )
      }
    } catch {}

    return res.json({ message: 'Agendamento cancelado com sucesso', refund })
  } catch (err) {
    console.error('Erro inesperado no cancelamento:', err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

export default router
