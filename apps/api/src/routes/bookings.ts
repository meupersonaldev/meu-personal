import express from 'express'
import { z } from 'zod'
import { supabase } from '../config/supabase'
import { addAcademyToContact } from '../services/franqueadora-contacts.service'
import { createNotification, createUserNotification } from './notifications'
import { bookingCanonicalService } from '../services/booking-canonical.service'
import { requireAuth, requireRole } from '../middleware/auth'
import { asyncErrorHandler } from '../middleware/errorHandler'

const router = express.Router()

// Schema de validação para criação de booking canônico
const createBookingSchema = z.object({
  source: z.enum(['ALUNO', 'PROFESSOR']),
  studentId: z.string().uuid().optional(),
  professorId: z.string().uuid(),
  unitId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  studentNotes: z.string().optional(),
  professorNotes: z.string().optional()
})

// Schema de validação para atualização de status
const updateBookingSchema = z.object({
  status: z.enum(['RESERVED', 'PAID', 'DONE', 'CANCELED']).optional(),
  notes: z.string().optional()
})

// GET /api/bookings - Listar agendamentos (endpoint canônico)
router.get('/', requireAuth, asyncErrorHandler(async (req, res) => {
  const { unit_id, status, from, to } = req.query
  const user = req.user

  if (!unit_id) {
    return res.status(400).json({ error: 'unit_id é obrigatório' })
  }

  // Verificar se o usuário tem acesso à unidade
  if (user.role === 'STUDENT' || user.role === 'ALUNO') {
    const { data: userUnits } = await supabase
      .from('user_units')
      .select('unit_id')
      .eq('user_id', user.userId)
      .eq('unit_id', unit_id);

    if (!userUnits || userUnits.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' })
    }
  }

  if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
    const { data: teacherUnits } = await supabase
      .from('teacher_units')
      .select('unit_id')
      .eq('teacher_id', user.userId)
      .eq('unit_id', unit_id);

    if (!teacherUnits || teacherUnits.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' })
    }
  }

  const filters: any = {}
  if (status) filters.status = status
  if (from) filters.from = from
  if (to) filters.to = to

  const bookings = await bookingCanonicalService.getBookingsByUser(
    user.userId,
    user.role,
    filters
  )

  res.json({ bookings })
}))

// GET /api/bookings/:id - Buscar agendamento por ID (endpoint canônico)
router.get('/:id', requireAuth, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  const user = req.user

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      student:users!bookings_student_id_fkey (id, name, email, avatar_url),
      professor:users!bookings_professor_id_fkey (id, name, email, avatar_url),
      unit:units (id, name, city, state)
    `)
    .eq('id', id)
    .single()

  if (error || !booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  // Verificar permissão de acesso
  const hasAccess =
    booking.student_id === user.userId ||
    booking.professor_id === user.userId ||
    ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role)

  if (!hasAccess) {
    return res.status(403).json({ error: 'Acesso não autorizado' })
  }

  res.json({ booking })
}))

// POST /api/bookings - Criar novo agendamento (endpoint canônico)
router.post('/', requireAuth, requireRole(['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA']), asyncErrorHandler(async (req, res) => {
  const bookingData = createBookingSchema.parse(req.body)
  const user = req.user

  // Validar permissões baseado no source
  if (bookingData.source === 'ALUNO' && !['STUDENT', 'ALUNO', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)) {
    return res.status(403).json({ error: 'Apenas alunos podem criar agendamentos aluno-led' })
  }

  if (bookingData.source === 'PROFESSOR' && !['TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA'].includes(user.role)) {
    return res.status(403).json({ error: 'Apenas professores podem criar agendamentos professor-led' })
  }

  // Se for ALUNO-led, precisa de student_id
  if (bookingData.source === 'ALUNO' && !bookingData.studentId) {
    bookingData.studentId = user.userId // Aluno está criando para si mesmo
  }

  // Validar datas
  const startAt = new Date(bookingData.startAt)
  const endAt = new Date(bookingData.endAt)
  const now = new Date()

  if (startAt <= now) {
    return res.status(400).json({ error: 'Data de início deve ser no futuro' })
  }

  if (endAt <= startAt) {
    return res.status(400).json({ error: 'Data de término deve ser após a data de início' })
  }

  const booking = await bookingCanonicalService.createBooking({
    source: bookingData.source,
    studentId: bookingData.studentId,
    professorId: bookingData.professorId,
    unitId: bookingData.unitId,
    startAt: startAt,
    endAt: endAt,
    studentNotes: bookingData.studentNotes,
    professorNotes: bookingData.professorNotes
  })

  try {
    const syncTasks = [addAcademyToContact(booking.professor_id, booking.unit_id)]
    if (booking.student_id) {
      syncTasks.push(addAcademyToContact(booking.student_id, booking.unit_id))
    }
    await Promise.all(syncTasks)
  } catch (syncError) {
    console.warn('Erro ao sincronizar contato da franqueadora após agendamento:', syncError)
  }

  // Criar notificações
  try {
    if (booking.student_id) {
      await createUserNotification(
        booking.student_id,
        'booking_created',
        'Agendamento criado',
        'Seu agendamento foi criado com sucesso.',
        { booking_id: booking.id }
      )
    }

    await createUserNotification(
      booking.professor_id,
      'booking_created',
      'Novo agendamento',
      'Um novo agendamento foi criado.',
      { booking_id: booking.id }
    )
  } catch (error) {
    console.error('Erro ao criar notificações:', error)
  }

  res.status(201).json({
    message: 'Agendamento criado com sucesso',
    booking
  })
}))

// PATCH /api/bookings/:id - Atualizar status do agendamento (endpoint canônico)
router.patch('/:id', requireAuth, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  const { status } = updateBookingSchema.parse(req.body)
  const user = req.user

  // Buscar booking para verificar permissão
  const { data: booking, error: getError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (getError || !booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  // Verificar permissão
  const hasPermission =
    booking.student_id === user.userId ||
    booking.professor_id === user.userId ||
    ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Acesso não autorizado' })
  }

  // Processar diferentes status
  if (status === 'CANCELED') {
    await bookingCanonicalService.cancelBooking(id, user.userId)

    res.json({
      message: 'Agendamento cancelado com sucesso',
      status: 'CANCELED'
    })
  } else if (status === 'PAID') {
    const updatedBooking = await bookingCanonicalService.confirmBooking(id)

    res.json({
      message: 'Agendamento confirmado com sucesso',
      booking: updatedBooking
    })
  } else if (status === 'DONE') {
    const updatedBooking = await bookingCanonicalService.completeBooking(id)

    res.json({
      message: 'Agendamento concluído com sucesso',
      booking: updatedBooking
    })
  } else {
    return res.status(400).json({ error: 'Status inválido' })
  }
}))

// DELETE /api/bookings/:id - Cancelar agendamento (endpoint canônico)
router.delete('/:id', requireAuth, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  const user = req.user

  // Buscar booking para verificar permissão
  const { data: booking, error: getError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (getError || !booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  // Verificar permissão
  const hasPermission =
    booking.student_id === user.userId ||
    booking.professor_id === user.userId ||
    ['FRANQUIA', 'FRANQUEADORA', 'ADMIN'].includes(user.role)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Acesso não autorizado' })
  }

  await bookingCanonicalService.cancelBooking(id, user.userId)

  res.json({
    message: 'Agendamento cancelado com sucesso',
    status: 'CANCELED'
  })
}))

export default router



