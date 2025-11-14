import express from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { addAcademyToContact } from '../services/franqueadora-contacts.service'
import { createNotification, createUserNotification } from './notifications'
import { bookingCanonicalService } from '../services/booking-canonical.service'
import { requireAuth, requireRole } from '../middleware/auth'
import { requireApprovedTeacher } from '../middleware/approval'
import { createUserRateLimit, rateLimitConfig } from '../middleware/rateLimit'
import { asyncErrorHandler } from '../middleware/errorHandler'
import { normalizeBookingStatus } from '../utils/booking-status'

const router = express.Router()

// Schema de validação para criação de booking canônico
const createBookingSchema = z.object({
  source: z.enum(['ALUNO', 'PROFESSOR']),
  studentId: z.string().uuid().nullable().optional(),
  professorId: z.string().uuid(),
  unitId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'PAID', 'DONE', 'CANCELED']).optional(),
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
  const { unit_id, status, from, to, teacher_id, student_id } = req.query
  const user = req.user

  const unitId = Array.isArray(unit_id) ? unit_id[0] : unit_id
  const teacherId = Array.isArray(teacher_id) ? teacher_id[0] : teacher_id
  const studentId = Array.isArray(student_id) ? student_id[0] : student_id

  const formatBooking = (booking: any) => {
    const unit = booking.unit || {}
    const academy = booking.academy || {}
    const student = booking.student || {}
    const teacher = booking.teacher || {}

    const franchiseName = unit.name || academy.name || null
    const franchiseAddressParts = unit.id
      ? [unit.address, unit.city, unit.state]
      : [academy.city, academy.state]

    // Determinar limite de cancelamento (fallback: 4h antes de date)
    const startIso = booking.start_at || booking.date
    const fallbackCutoff = startIso ? new Date(new Date(startIso).getTime() - 4 * 60 * 60 * 1000).toISOString() : undefined

    return {
      id: booking.id,
      studentId: booking.student_id || undefined,
      studentName: student.name || undefined,
      teacherId: booking.teacher_id,
      teacherName: teacher.name || undefined,
      franchiseId: booking.unit_id || booking.franchise_id || undefined,
      franchiseName,
      franchiseAddress: franchiseAddressParts.filter(Boolean).join(', ') || undefined,
      date: booking.date,
      duration: booking.duration ?? 60,
      status: normalizeBookingStatus(booking.status, booking.status_canonical),
      notes: booking.notes || undefined,
      creditsCost: booking.credits_cost ?? 0,
      source: booking.source || undefined,
      hourlyRate: booking.hourly_rate || undefined,
      cancellableUntil: booking.cancellable_until || fallbackCutoff
    }
  }

  if (!unitId && !teacherId && !studentId) {
    return res.status(400).json({ error: 'unit_id é obrigatório' })
  }

  // Compatibilidade: permitir consultas apenas por student_id (legado)
  if (!unitId && !teacherId && studentId) {
    if ((user.role === 'STUDENT' || user.role === 'ALUNO') && user.userId !== studentId) {
      return res.status(403).json({ error: 'Acesso não autorizado a este aluno' })
    }

    const { data: studentBookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        teacher_id,
        unit_id,
        franchise_id,
        date,
        duration,
        status,
        status_canonical,
        notes,
        credits_cost,
        cancellable_until
      `)
      .eq('student_id', studentId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching student bookings (legacy):', error)
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
    }

    let results = studentBookings || []

    if (status) {
      const statusStr = Array.isArray(status) ? status[0] : String(status)
      const statusTarget = normalizeBookingStatus(statusStr, null)
      results = results.filter((booking: any) => {
        const current = normalizeBookingStatus(booking.status, booking.status_canonical)
        return current === statusTarget
      })
    }

    if (from) {
      const fromDate = new Date(String(from))
      if (!Number.isNaN(fromDate.getTime())) {
        results = results.filter((booking: any) => new Date(booking.date) >= fromDate)
      }
    }

    if (to) {
      const toDate = new Date(String(to))
      if (!Number.isNaN(toDate.getTime())) {
        results = results.filter((booking: any) => new Date(booking.date) <= toDate)
      }
    }

    // Buscar informações relacionadas separadamente para simplificar a query
    const teacherIds = [...new Set(results.map((b: any) => b.teacher_id).filter(Boolean))]
    const unitIds = [...new Set(results.map((b: any) => b.unit_id).filter(Boolean))]
    const franchiseIds = [...new Set(results.map((b: any) => b.franchise_id).filter(Boolean))]

    const [teachersData, unitsData, academiesData] = await Promise.all([
      teacherIds.length > 0 ? supabase.from('users').select('id, name').in('id', teacherIds) : Promise.resolve({ data: [] }),
      unitIds.length > 0 ? supabase.from('units').select('id, name, city, state, address').in('id', unitIds) : Promise.resolve({ data: [] }),
      franchiseIds.length > 0 ? supabase.from('academies').select('id, name, city, state, address').in('id', franchiseIds) : Promise.resolve({ data: [] })
    ])

    const teachersMap = (teachersData.data || []).reduce((acc, teacher) => {
      acc[teacher.id] = teacher
      return acc
    }, {})

    const unitsMap = (unitsData.data || []).reduce((acc, unit) => {
      acc[unit.id] = unit
      return acc
    }, {})

    const academiesMap = (academiesData.data || []).reduce((acc, academy) => {
      acc[academy.id] = academy
      return acc
    }, {})

    const bookings = results.map((booking: any) => {
      const teacher = teachersMap[booking.teacher_id] || {}
      const unit = unitsMap[booking.unit_id] || {}
      const academy = academiesMap[booking.franchise_id] || {}

      const franchiseName = unit.name || academy.name || null
      const franchiseAddressParts = unit.id
        ? [unit.address, unit.city, unit.state]
        : [academy.address, academy.city, academy.state]

      return {
        id: booking.id,
        studentId: booking.student_id || undefined,
        teacherId: booking.teacher_id,
        teacherName: teacher.name || undefined,
        franchiseId: booking.unit_id || booking.franchise_id || undefined,
        franchiseName,
        franchiseAddress: franchiseAddressParts.filter(Boolean).join(', ') || undefined,
        date: booking.date,
        duration: booking.duration ?? 60,
        status: normalizeBookingStatus(booking.status, booking.status_canonical),
        notes: booking.notes || undefined,
        creditsCost: booking.credits_cost ?? 0,
        cancellableUntil: booking.cancellable_until || (booking.date ? new Date(new Date(booking.date).getTime() - 4 * 60 * 60 * 1000).toISOString() : undefined)
      }
    })

    return res.json({ bookings })
  }

  // Compatibilidade: permitir consultas apenas por teacher_id (legado)
  if (!unitId && teacherId) {
    if ((user.role === 'TEACHER' || user.role === 'PROFESSOR') && user.userId !== teacherId) {
      return res.status(403).json({ error: 'Acesso não autorizado a este professor' })
    }

    const { data: teacherBookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        teacher_id,
        unit_id,
        franchise_id,
        date,
        duration,
        status,
        status_canonical,
        notes,
        credits_cost,
        source,
        cancellable_until
      `)
      .eq('teacher_id', teacherId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching teacher bookings (legacy):', error)
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
    }

    let results = teacherBookings || []

    if (status) {
      const statusStr = Array.isArray(status) ? status[0] : String(status)
      const statusTarget = normalizeBookingStatus(statusStr, null)
      results = results.filter((booking: any) => {
        const current = normalizeBookingStatus(booking.status, booking.status_canonical)
        return current === statusTarget
      })
    }

    if (from) {
      const fromDate = new Date(String(from))
      if (!Number.isNaN(fromDate.getTime())) {
        results = results.filter((booking: any) => new Date(booking.date) >= fromDate)
      }
    }

    if (to) {
      const toDate = new Date(String(to))
      if (!Number.isNaN(toDate.getTime())) {
        results = results.filter((booking: any) => new Date(booking.date) <= toDate)
      }
    }

    const studentIds = Array.from(
      new Set(
        results
          .map((booking: any) => booking.student_id)
          .filter((id: string | null | undefined): id is string => Boolean(id))
      )
    )

    const unitIds = Array.from(
      new Set(
        results
          .map((booking: any) => booking.unit_id)
          .filter((id: string | null | undefined): id is string => Boolean(id))
      )
    )

    const franchiseIds = Array.from(
      new Set(
        results
          .map((booking: any) => booking.franchise_id)
          .filter((id: string | null | undefined): id is string => Boolean(id))
      )
    )

    let studentsMap: Record<string, { id: string; name?: string }> = {}
    let unitsMap: Record<string, { id: string; name?: string; city?: string; state?: string; address?: string | null }> = {}
    let academiesMap: Record<string, { id: string; name?: string; city?: string; state?: string; address?: string | null }> = {}
    let studentRatesMap: Record<string, number> = {}
    let professorRateMap: Record<string, number> = {}

    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', studentIds)

      if (studentsData) {
        studentsMap = studentsData.reduce((acc, curr) => {
          acc[curr.id] = curr
          return acc
        }, {} as typeof studentsMap)
        
        // Buscar hourly_rate dos alunos na tabela teacher_students
        const studentEmails = studentsData.map(s => s.email).filter(Boolean)
        if (studentEmails.length > 0) {
          const { data: teacherStudents } = await supabase
            .from('teacher_students')
            .select('email, hourly_rate')
            .eq('teacher_id', teacherId)
            .in('email', studentEmails)
          
          if (teacherStudents) {
            // Criar mapa de email -> hourly_rate
            const emailToRate = teacherStudents.reduce((acc: any, ts: any) => {
              if (ts.hourly_rate) acc[ts.email] = ts.hourly_rate
              return acc
            }, {})
            
            // Mapear user_id -> hourly_rate
            studentsData.forEach(student => {
              if (student.email && emailToRate[student.email]) {
                studentRatesMap[student.id] = emailToRate[student.email]
              }
            })
          }
        }
      }
    }
    
    // Buscar hourly_rate do professor
    const { data: profProfile } = await supabase
      .from('teacher_profiles')
      .select('hourly_rate')
      .eq('user_id', teacherId)
      .single()
    
    const professorHourlyRate = profProfile?.hourly_rate || 0

    if (unitIds.length > 0) {
      const { data: unitsData } = await supabase
        .from('units')
        .select('id, name, city, state, address')
        .in('id', unitIds)

      if (unitsData) {
        unitsMap = unitsData.reduce((acc, curr) => {
          acc[curr.id] = curr
          return acc
        }, {} as typeof unitsMap)
      }
    }

    if (franchiseIds.length > 0) {
      const { data: academiesData } = await supabase
        .from('academies')
        .select('id, name, city, state, address')
        .in('id', franchiseIds)

      if (academiesData) {
        academiesMap = academiesData.reduce((acc, curr) => {
          acc[curr.id] = curr
          return acc
        }, {} as typeof academiesMap)
      }
    }

    const bookings = results.map((booking: any) => {
      const student = booking.student_id ? studentsMap[booking.student_id] : undefined
      const unit = booking.unit_id ? unitsMap[booking.unit_id] : undefined
      const academy = booking.franchise_id ? academiesMap[booking.franchise_id] : undefined

      const franchiseName = unit?.name || academy?.name || null
      const franchiseAddressParts = unit?.id
        ? [unit.address, unit.city, unit.state]
        : [academy?.address, academy?.city, academy?.state]

      // Determinar hourly_rate baseado no source
      let hourlyRate = undefined
      if (booking.source === 'PROFESSOR' && booking.student_id) {
        // Professor agendou para aluno: usar hourly_rate do aluno
        hourlyRate = studentRatesMap[booking.student_id]
      } else if (booking.source === 'ALUNO') {
        // Aluno agendou: usar hourly_rate do professor
        hourlyRate = professorHourlyRate
      }

      return {
        id: booking.id,
        studentId: booking.student_id || undefined,
        studentName: student?.name || undefined,
        teacherId: booking.teacher_id,
        franchiseId: booking.unit_id || booking.franchise_id || undefined,
        franchiseName,
        franchiseAddress: franchiseAddressParts.filter(Boolean).join(', ') || undefined,
        date: booking.date,
        duration: booking.duration ?? 60,
        status: normalizeBookingStatus(booking.status, booking.status_canonical),
        notes: booking.notes || undefined,
        creditsCost: booking.credits_cost ?? 0,
        source: booking.source || undefined,
        hourlyRate,
        cancellableUntil: booking.cancellable_until || (booking.date ? new Date(new Date(booking.date).getTime() - 4 * 60 * 60 * 1000).toISOString() : undefined)
      }
    })

    return res.json({ bookings })
  }

  // Verificar se o usuário tem acesso à unidade
  if (user.role === 'STUDENT' || user.role === 'ALUNO') {
    const { data: userUnits } = await supabase
      .from('student_units')
      .select('unit_id')
      .eq('student_id', user.userId)
      .eq('unit_id', unitId)

    if (!userUnits || userUnits.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' })
    }
  }

  if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
    const { data: teacherUnits } = await supabase
      .from('teacher_units')
      .select('unit_id')
      .eq('teacher_id', user.userId)
      .eq('unit_id', unitId)

    if (!teacherUnits || teacherUnits.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a esta unidade' })
    }
  }

  const { data: unitBookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      student_id,
      teacher_id,
      unit_id,
      franchise_id,
      date,
      duration,
      status,
      status_canonical,
      notes,
      credits_cost,
      cancellable_until,
      student:users!bookings_student_id_fkey (id, name),
      teacher:users!bookings_teacher_id_fkey (id, name),
      unit:units!bookings_unit_id_fk (id, name, city, state, address),
      academy:academies!bookings_franchise_id_fkey (id, name, city, state, address)
    `)
    .or(`unit_id.eq.${unitId},franchise_id.eq.${unitId}`)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching bookings by unit:', error)
    return res.status(500).json({ error: 'Erro ao buscar agendamentos' })
  }

  let results = unitBookings || []

  if (user.role === 'TEACHER' || user.role === 'PROFESSOR') {
    results = results.filter((booking: any) => booking.teacher_id === user.userId)
  }

  if (user.role === 'STUDENT' || user.role === 'ALUNO') {
    results = results.filter((booking: any) => booking.student_id === user.userId)
  }

  if (status) {
    const statusStr = Array.isArray(status) ? status[0] : String(status)
    const statusTarget = normalizeBookingStatus(statusStr, null)
    results = results.filter((booking: any) => {
      const current = normalizeBookingStatus(booking.status, booking.status_canonical)
      return current === statusTarget
    })
  }

  if (from) {
    const fromDate = new Date(String(from))
    if (!Number.isNaN(fromDate.getTime())) {
      results = results.filter((booking: any) => new Date(booking.date) >= fromDate)
    }
  }

  if (to) {
    const toDate = new Date(String(to))
    if (!Number.isNaN(toDate.getTime())) {
      results = results.filter((booking: any) => new Date(booking.date) <= toDate)
    }
  }

  const bookings = results.map(formatBooking)
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
router.post('/', requireAuth, requireRole(['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR', 'FRANQUIA', 'FRANQUEADORA']), requireApprovedTeacher, asyncErrorHandler(async (req, res) => {
  console.log('[POST /api/bookings] Payload recebido:', JSON.stringify(req.body, null, 2))
  
  const bookingData = createBookingSchema.parse(req.body)
  if (bookingData.studentId === null) {
    bookingData.studentId = undefined
  }
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

  console.log('[POST /api/bookings] Validação de datas:', {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    now: now.toISOString(),
    startAtTimestamp: startAt.getTime(),
    nowTimestamp: now.getTime(),
    isPast: startAt <= now
  })

  if (startAt <= now) {
    console.log('[POST /api/bookings] ERRO: Data no passado')
    return res.status(400).json({ error: 'Data de início deve ser no futuro' })
  }

  if (endAt <= startAt) {
    console.log('[POST /api/bookings] ERRO: endAt <= startAt')
    return res.status(400).json({ error: 'Data de término deve ser após a data de início' })
  }

  const booking = await bookingCanonicalService.createBooking({
    source: bookingData.source,
    studentId: bookingData.studentId,
    professorId: bookingData.professorId,
    unitId: bookingData.unitId,
    startAt: startAt,
    endAt: endAt,
    status: bookingData.status,
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
    booking.teacher_id === user.userId ||
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

  // Verificar permissão (professor pode deletar seus próprios horários) 
  const hasPermission =
    booking.student_id === user.userId ||
    booking.teacher_id === user.userId ||
    ['FRANQUIA', 'FRANQUEADORA', 'ADMIN', 'TEACHER', 'PROFESSOR'].includes(user.role)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Acesso não autorizado' })
  }
  
  console.log('🚀 CÓDIGO ATUALIZADO - VERSÃO NOVA RODANDO!')

  // Se for disponibilidade sem aluno (AVAILABLE, RESERVED, CANCELED, BLOCKED), deletar do banco
  // Se for agendamento com aluno, apenas cancelar
  const isAvailabilitySlot = !booking.student_id && 
    ['AVAILABLE', 'RESERVED', 'CANCELED', 'BLOCKED'].includes(booking.status_canonical)
  
  console.log('🔍 DEBUG DELETE:', {
    id,
    status_canonical: booking.status_canonical,
    student_id: booking.student_id,
    hasNoStudent: !booking.student_id,
    isAvailabilitySlot,
    willDelete: isAvailabilitySlot
  })
  
  if (isAvailabilitySlot) {
    console.log('✅ DELETANDO disponibilidade do banco...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.log('❌ Erro ao deletar:', deleteError)
      return res.status(500).json({ error: 'Erro ao remover disponibilidade' })
    }

    console.log('✅ Disponibilidade DELETADA com sucesso!')
    return res.json({
      message: 'Disponibilidade removida com sucesso',
      status: 'DELETED'
    })
  }

  // Para agendamentos com aluno, cancelar
  await bookingCanonicalService.cancelBooking(id, user.userId)

  res.json({
    message: 'Agendamento cancelado com sucesso',
    status: 'CANCELED'
  })
}))

// GET /api/bookings/:id/rating - Buscar avaliação de um agendamento (se existir)
router.get('/:id/rating', requireAuth, asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  const user = req.user

  // Buscar booking para validar acesso
  const { data: booking, error: getError } = await supabase
    .from('bookings')
    .select('id, student_id, teacher_id')
    .eq('id', id)
    .single()

  if (getError || !booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  if (booking.student_id !== user.userId && booking.teacher_id !== user.userId && !['ADMIN','FRANQUEADORA','FRANQUIA'].includes(user.role)) {
    return res.status(403).json({ error: 'Acesso não autorizado' })
  }

  const { data: ratingRow } = await supabase
    .from('teacher_ratings')
    .select('*')
    .eq('booking_id', id)
    .single()

  if (!ratingRow) return res.json({ rating: null })
  return res.json({ rating: ratingRow })
}))

// POST /api/bookings/:id/rating - Avaliar um agendamento concluído
router.post('/:id/rating', requireAuth, createUserRateLimit(rateLimitConfig.ratings), asyncErrorHandler(async (req, res) => {
  const { id } = req.params
  const user = req.user

  // Validar payload
  const ratingSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional()
  })
  const { rating, comment } = ratingSchema.parse(req.body)

  // Buscar booking e validar permissões/estado
  const { data: booking, error: getError } = await supabase
    .from('bookings')
    .select('id, student_id, teacher_id, status, status_canonical, date')
    .eq('id', id)
    .single()

  if (getError || !booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado' })
  }

  if (booking.student_id !== user.userId) {
    return res.status(403).json({ error: 'Você não pode avaliar este agendamento' })
  }

  const normalized = normalizeBookingStatus(booking.status, booking.status_canonical)
  if (normalized !== 'COMPLETED') {
    return res.status(400).json({ error: 'A avaliação só é permitida para aulas concluídas' })
  }

  if (!booking.teacher_id) {
    return res.status(400).json({ error: 'Agendamento sem professor associado' })
  }

  // Upsert por booking_id (permite editar avaliação)
  const payload: any = {
    teacher_id: booking.teacher_id,
    student_id: booking.student_id,
    booking_id: booking.id,
    rating,
    comment: comment ?? null
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('teacher_ratings')
    .upsert([payload], { onConflict: 'booking_id' })
    .select()
    .single()

  if (upsertError) {
    console.error('Erro ao salvar avaliação:', upsertError)
    return res.status(500).json({ error: 'Erro ao salvar avaliação' })
  }

  // Agregar média e contagem do professor
  const { data: ratingsRows, error: aggError } = await supabase
    .from('teacher_ratings')
    .select('rating')
    .eq('teacher_id', booking.teacher_id)

  if (aggError) {
    console.error('Erro ao calcular média de avaliações:', aggError)
  }
  const rows = ratingsRows || []
  const count = rows.length
  const avg = count ? Number((rows.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / count).toFixed(2)) : 0

  // Atualizar cache em teacher_profiles
  try {
    await supabase
      .from('teacher_profiles')
      .update({
        rating_avg: avg,
        rating_count: count,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', booking.teacher_id)
  } catch (e) {
    console.warn('Falha ao atualizar cache de rating em teacher_profiles:', e)
  }

  res.json({
    rating: upserted,
    teacher_summary: { avg, count }
  })
}))

export default router
