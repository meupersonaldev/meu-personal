import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { addDays, addWeeks, addMonths, startOfDay, format, getDay, setDay, isBefore, isAfter } from 'date-fns'

const router = Router()

// ============================================
// Schemas de validação
// ============================================

const RecurrenceTypeEnum = z.enum(['15_DAYS', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR'])

const CreateRecurringBookingSchema = z.object({
  teacherId: z.string().uuid(),
  academyId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6), // 0=Dom, 1=Seg, ..., 6=Sab
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato deve ser HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato deve ser HH:mm'),
  recurrenceType: RecurrenceTypeEnum,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato deve ser YYYY-MM-DD'),
})

const CancelBookingSchema = z.object({
  cancelType: z.enum(['single', 'future', 'all']).default('single'),
})

// ============================================
// Helpers
// ============================================

/**
 * Calcula a data final baseada no tipo de recorrência
 */
function calculateEndDate(startDate: Date, recurrenceType: string): Date {
  switch (recurrenceType) {
    case '15_DAYS':
      return addDays(startDate, 15)
    case 'MONTH':
      return addMonths(startDate, 1)
    case 'QUARTER':
      return addMonths(startDate, 3)
    case 'SEMESTER':
      return addMonths(startDate, 6)
    case 'YEAR':
      return addMonths(startDate, 12)
    default:
      return addMonths(startDate, 1)
  }
}

/**
 * Gera todas as datas da série baseado no dia da semana
 */
function generateSeriesDates(
  startDate: Date,
  endDate: Date,
  dayOfWeek: number
): Date[] {
  const dates: Date[] = []
  
  // Encontrar a primeira ocorrência do dia da semana
  let currentDate = startOfDay(startDate)
  const currentDayOfWeek = getDay(currentDate)
  
  if (currentDayOfWeek !== dayOfWeek) {
    // Avançar para o próximo dia da semana desejado
    const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7
    currentDate = addDays(currentDate, daysToAdd === 0 ? 7 : daysToAdd)
  }
  
  // Se a primeira data está antes do startDate, avançar uma semana
  if (isBefore(currentDate, startDate)) {
    currentDate = addWeeks(currentDate, 1)
  }
  
  // Gerar todas as datas até o endDate
  while (!isAfter(currentDate, endDate)) {
    dates.push(new Date(currentDate))
    currentDate = addWeeks(currentDate, 1)
  }
  
  return dates
}

/**
 * Converte hora local (Brasil UTC-3) para UTC
 */
function createUtcDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  
  // Criar Date em UTC adicionando o offset do Brasil (+3h para ir de local para UTC)
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0))
}

/**
 * Busca o saldo de créditos do aluno
 */
async function getStudentCredits(studentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('student_class_balance')
    .select('balance')
    .eq('student_id', studentId)
    .single()
  
  if (error || !data) {
    return 0
  }
  
  return data.balance || 0
}

/**
 * Debita créditos do aluno
 */
async function debitStudentCredits(studentId: string, amount: number, bookingId: string): Promise<boolean> {
  // Primeiro, buscar o saldo atual
  const currentBalance = await getStudentCredits(studentId)
  
  if (currentBalance < amount) {
    return false
  }
  
  // Atualizar o saldo
  const { error: updateError } = await supabase
    .from('student_class_balance')
    .update({ 
      balance: currentBalance - amount,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)
  
  if (updateError) {
    console.error('Erro ao debitar créditos:', updateError)
    return false
  }
  
  // Registrar a transação
  await supabase
    .from('student_class_tx')
    .insert({
      student_id: studentId,
      delta: -amount,
      reason: 'BOOKING_RECURRING',
      ref_id: bookingId,
      created_at: new Date().toISOString()
    })
  
  return true
}

/**
 * Verifica se o professor tem disponibilidade em uma data/hora específica
 */
async function checkTeacherAvailability(
  teacherId: string,
  academyId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  // Converter para UTC
  const startAt = createUtcDateTime(date, startTime)
  const endAt = createUtcDateTime(date, endTime)
  
  // Verificar se existe um slot AVAILABLE do professor neste horário
  const { data: availableSlots, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('academy_id', academyId)
    .eq('status_canonical', 'AVAILABLE')
    .is('student_id', null)
    .gte('start_at', startAt.toISOString())
    .lt('start_at', endAt.toISOString())
    .limit(1)
  
  if (error) {
    console.error('Erro ao verificar disponibilidade:', error)
    return false
  }
  
  return (availableSlots?.length || 0) > 0
}

// ============================================
// Endpoints
// ============================================

/**
 * POST /api/booking-series
 * Cria uma série de agendamentos recorrentes
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    // Validar se é aluno ou professor
    const allowedRoles = ['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR']
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Apenas alunos e professores podem criar séries recorrentes' })
    }
    
    // Validar body
    const validation = CreateRecurringBookingSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.errors 
      })
    }
    
    const { teacherId, academyId, dayOfWeek, startTime, endTime, recurrenceType, startDate } = validation.data
    
    // Calcular datas da série
    const start = new Date(startDate + 'T00:00:00')
    const end = calculateEndDate(start, recurrenceType)
    const seriesDates = generateSeriesDates(start, end, dayOfWeek)
    
    if (seriesDates.length === 0) {
      return res.status(400).json({ error: 'Nenhuma data válida encontrada para a série' })
    }
    
    // Determinar quem é o aluno
    const isStudent = ['STUDENT', 'ALUNO'].includes(user.role)
    const studentId = isStudent ? user.userId : null
    
    // Se for professor criando, precisa ter studentId no body (futuro: ou criar como disponibilidade)
    // Por enquanto, apenas alunos podem criar séries com agendamento
    if (!isStudent) {
      return res.status(400).json({ 
        error: 'Por enquanto, apenas alunos podem criar séries de agendamento. Professores podem criar disponibilidade recorrente em breve.' 
      })
    }
    
    // Buscar créditos do aluno
    const studentCredits = await getStudentCredits(user.userId)
    
    // Verificar disponibilidade do professor para cada data
    const availableDates: string[] = []
    const skippedDates: { date: string; reason: string }[] = []
    
    for (const date of seriesDates) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const isAvailable = await checkTeacherAvailability(teacherId, academyId, dateStr, startTime, endTime)
      
      if (isAvailable) {
        availableDates.push(dateStr)
      } else {
        skippedDates.push({ date: dateStr, reason: 'Professor sem disponibilidade' })
      }
    }
    
    if (availableDates.length === 0) {
      return res.status(400).json({ 
        error: 'Professor não tem disponibilidade em nenhuma das datas da série',
        skippedDates 
      })
    }
    
    // Criar a série
    const { data: series, error: seriesError } = await supabase
      .from('booking_series')
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        academy_id: academyId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        recurrence_type: recurrenceType,
        start_date: startDate,
        end_date: format(end, 'yyyy-MM-dd'),
        created_by: user.userId,
        created_by_role: user.role,
        status: 'ACTIVE'
      })
      .select()
      .single()
    
    if (seriesError || !series) {
      console.error('Erro ao criar série:', seriesError)
      return res.status(500).json({ error: 'Erro ao criar série de agendamentos' })
    }
    
    // Criar bookings para cada data
    const bookings: any[] = []
    let creditsUsed = 0
    let confirmedCount = 0
    let reservedCount = 0
    
    for (let i = 0; i < availableDates.length; i++) {
      const dateStr = availableDates[i]
      const startAt = createUtcDateTime(dateStr, startTime)
      const endAt = createUtcDateTime(dateStr, endTime)
      
      // Verificar se ainda há créditos
      const hasCredit = creditsUsed < studentCredits
      const isReserved = !hasCredit
      
      // Buscar o slot disponível do professor para usar como base
      const { data: slot } = await supabase
        .from('bookings')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('academy_id', academyId)
        .eq('status_canonical', 'AVAILABLE')
        .is('student_id', null)
        .gte('start_at', startAt.toISOString())
        .lt('end_at', endAt.toISOString())
        .single()
      
      if (slot) {
        // Atualizar o slot existente
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .update({
            student_id: studentId,
            status_canonical: isReserved ? 'RESERVED' : 'PAID',
            series_id: series.id,
            is_reserved: isReserved,
            updated_at: new Date().toISOString()
          })
          .eq('id', slot.id)
          .select()
          .single()
        
        if (!bookingError && booking) {
          bookings.push({
            id: booking.id,
            date: dateStr,
            startTime,
            endTime,
            status: booking.status_canonical,
            isReserved
          })
          
          if (!isReserved) {
            // Debitar crédito
            await debitStudentCredits(studentId!, 1, booking.id)
            creditsUsed++
            confirmedCount++
          } else {
            reservedCount++
          }
        }
      } else {
        // Criar novo booking (caso não encontre slot existente)
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            teacher_id: teacherId,
            student_id: studentId,
            academy_id: academyId,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            status_canonical: isReserved ? 'RESERVED' : 'PAID',
            series_id: series.id,
            is_reserved: isReserved,
            source: 'ALUNO',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (!bookingError && booking) {
          bookings.push({
            id: booking.id,
            date: dateStr,
            startTime,
            endTime,
            status: booking.status_canonical,
            isReserved
          })
          
          if (!isReserved) {
            await debitStudentCredits(studentId!, 1, booking.id)
            creditsUsed++
            confirmedCount++
          } else {
            reservedCount++
          }
        }
      }
    }
    
    // Criar notificação de série criada
    await supabase
      .from('booking_series_notifications')
      .insert({
        series_id: series.id,
        user_id: studentId,
        type: 'SERIES_CREATED',
        message: `Série criada: ${confirmedCount} aulas confirmadas, ${reservedCount} reservadas`,
        sent_at: new Date().toISOString()
      })
    
    // Notificar professor
    await supabase
      .from('booking_series_notifications')
      .insert({
        series_id: series.id,
        user_id: teacherId,
        type: 'SERIES_CREATED',
        message: `Nova série de aulas agendada`,
        sent_at: new Date().toISOString()
      })
    
    return res.status(201).json({
      seriesId: series.id,
      confirmedCount,
      reservedCount,
      totalCreditsUsed: creditsUsed,
      skippedDates,
      bookings,
      message: reservedCount > 0 
        ? `Série criada! ${confirmedCount} aulas confirmadas e ${reservedCount} reservadas. As reservas precisam de crédito até 7 dias antes.`
        : `Série criada com ${confirmedCount} aulas confirmadas!`
    })
    
  } catch (error) {
    console.error('Erro ao criar série recorrente:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/booking-series/:seriesId
 * Retorna detalhes de uma série
 */
router.get('/:seriesId', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    const { seriesId } = req.params
    
    // Buscar série
    const { data: series, error: seriesError } = await supabase
      .from('booking_series')
      .select(`
        *,
        teacher:users!booking_series_teacher_id_fkey(id, name, email),
        student:users!booking_series_student_id_fkey(id, name, email),
        academy:academies(id, name)
      `)
      .eq('id', seriesId)
      .single()
    
    if (seriesError || !series) {
      return res.status(404).json({ error: 'Série não encontrada' })
    }
    
    // Verificar permissão (apenas aluno, professor da série ou admin)
    const isOwner = series.student_id === user.userId || series.teacher_id === user.userId
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FRANCHISE_ADMIN', 'FRANQUEADORA'].includes(user.role)
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para visualizar esta série' })
    }
    
    // Buscar bookings da série
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, start_at, end_at, status_canonical, is_reserved')
      .eq('series_id', seriesId)
      .order('start_at', { ascending: true })
    
    if (bookingsError) {
      console.error('Erro ao buscar bookings:', bookingsError)
    }
    
    // Contar confirmadas e reservadas
    const confirmedCount = bookings?.filter(b => !b.is_reserved && b.status_canonical !== 'CANCELED').length || 0
    const reservedCount = bookings?.filter(b => b.is_reserved && b.status_canonical !== 'CANCELED').length || 0
    const cancelledCount = bookings?.filter(b => b.status_canonical === 'CANCELED').length || 0
    
    return res.json({
      series,
      bookings: bookings || [],
      summary: {
        total: bookings?.length || 0,
        confirmed: confirmedCount,
        reserved: reservedCount,
        cancelled: cancelledCount
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar série:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * DELETE /api/booking-series/:seriesId/bookings/:bookingId
 * Cancela um booking de uma série (com opção de cancelar futuros ou todos)
 */
router.delete('/:seriesId/bookings/:bookingId', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    const { seriesId, bookingId } = req.params
    const { cancelType = 'single' } = req.query as { cancelType?: 'single' | 'future' | 'all' }
    
    // Buscar série
    const { data: series, error: seriesError } = await supabase
      .from('booking_series')
      .select('*')
      .eq('id', seriesId)
      .single()
    
    if (seriesError || !series) {
      return res.status(404).json({ error: 'Série não encontrada' })
    }
    
    // Verificar permissão
    const isOwner = series.student_id === user.userId || series.teacher_id === user.userId
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FRANCHISE_ADMIN', 'FRANQUEADORA'].includes(user.role)
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para cancelar esta série' })
    }
    
    // Buscar o booking específico
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('series_id', seriesId)
      .single()
    
    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Agendamento não encontrado nesta série' })
    }
    
    let cancelledIds: string[] = []
    let refundedCredits = 0
    
    if (cancelType === 'single') {
      // Cancelar apenas este booking
      await supabase
        .from('bookings')
        .update({ status_canonical: 'CANCELED', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
      
      cancelledIds = [bookingId]
      
      // Estornar crédito se não era reserva
      if (!booking.is_reserved && booking.student_id) {
        const currentBalance = await getStudentCredits(booking.student_id)
        await supabase
          .from('student_class_balance')
          .update({ balance: currentBalance + 1, updated_at: new Date().toISOString() })
          .eq('student_id', booking.student_id)
        
        refundedCredits = 1
      }
      
    } else if (cancelType === 'future') {
      // Cancelar este e todos os futuros
      const { data: futureBookings } = await supabase
        .from('bookings')
        .select('id, is_reserved, student_id')
        .eq('series_id', seriesId)
        .gte('start_at', booking.start_at)
        .neq('status_canonical', 'CANCELED')
      
      if (futureBookings && futureBookings.length > 0) {
        const ids = futureBookings.map(b => b.id)
        
        await supabase
          .from('bookings')
          .update({ status_canonical: 'CANCELED', updated_at: new Date().toISOString() })
          .in('id', ids)
        
        cancelledIds = ids
        
        // Estornar créditos das confirmadas
        const confirmedBookings = futureBookings.filter(b => !b.is_reserved)
        refundedCredits = confirmedBookings.length
        
        if (refundedCredits > 0 && booking.student_id) {
          const currentBalance = await getStudentCredits(booking.student_id)
          await supabase
            .from('student_class_balance')
            .update({ balance: currentBalance + refundedCredits, updated_at: new Date().toISOString() })
            .eq('student_id', booking.student_id)
        }
      }
      
    } else if (cancelType === 'all') {
      // Cancelar toda a série
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('id, is_reserved, student_id')
        .eq('series_id', seriesId)
        .neq('status_canonical', 'CANCELED')
      
      if (allBookings && allBookings.length > 0) {
        const ids = allBookings.map(b => b.id)
        
        await supabase
          .from('bookings')
          .update({ status_canonical: 'CANCELED', updated_at: new Date().toISOString() })
          .in('id', ids)
        
        cancelledIds = ids
        
        // Estornar créditos das confirmadas
        const confirmedBookings = allBookings.filter(b => !b.is_reserved)
        refundedCredits = confirmedBookings.length
        
        if (refundedCredits > 0 && series.student_id) {
          const currentBalance = await getStudentCredits(series.student_id)
          await supabase
            .from('student_class_balance')
            .update({ balance: currentBalance + refundedCredits, updated_at: new Date().toISOString() })
            .eq('student_id', series.student_id)
        }
        
        // Atualizar status da série
        await supabase
          .from('booking_series')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('id', seriesId)
      }
    }
    
    // Criar notificação
    await supabase
      .from('booking_series_notifications')
      .insert({
        series_id: seriesId,
        booking_id: bookingId,
        user_id: user.userId,
        type: 'BOOKING_CANCELLED',
        message: `${cancelledIds.length} agendamento(s) cancelado(s). ${refundedCredits} crédito(s) estornado(s).`,
        sent_at: new Date().toISOString()
      })
    
    return res.json({
      success: true,
      cancelledCount: cancelledIds.length,
      refundedCredits,
      message: `${cancelledIds.length} agendamento(s) cancelado(s) com sucesso.${refundedCredits > 0 ? ` ${refundedCredits} crédito(s) estornado(s).` : ''}`
    })
    
  } catch (error) {
    console.error('Erro ao cancelar booking:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/booking-series/student/my-series
 * Lista séries do aluno logado
 */
router.get('/student/my-series', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    const { data: series, error } = await supabase
      .from('booking_series')
      .select(`
        *,
        teacher:users!booking_series_teacher_id_fkey(id, name),
        academy:academies(id, name)
      `)
      .eq('student_id', user.userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar séries:', error)
      return res.status(500).json({ error: 'Erro ao buscar séries' })
    }
    
    return res.json(series || [])
    
  } catch (error) {
    console.error('Erro ao buscar séries do aluno:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/booking-series/teacher/my-series
 * Lista séries do professor logado
 */
router.get('/teacher/my-series', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    const { data: series, error } = await supabase
      .from('booking_series')
      .select(`
        *,
        student:users!booking_series_student_id_fkey(id, name),
        academy:academies(id, name)
      `)
      .eq('teacher_id', user.userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar séries:', error)
      return res.status(500).json({ error: 'Erro ao buscar séries' })
    }
    
    return res.json(series || [])
    
  } catch (error) {
    console.error('Erro ao buscar séries do professor:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/booking-series/reserved/pending
 * Lista reservas pendentes que precisam de cobrança (7 dias antes)
 */
router.get('/reserved/pending', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    // Apenas admins podem ver todas as reservas pendentes
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FRANCHISE_ADMIN', 'FRANQUEADORA'].includes(user.role)
    
    // Calcular intervalo: reservas que vencem em 6-8 dias
    const now = new Date()
    const sixDaysFromNow = addDays(now, 6)
    const eightDaysFromNow = addDays(now, 8)
    
    let query = supabase
      .from('bookings')
      .select(`
        id,
        start_at,
        end_at,
        is_reserved,
        series_id,
        student:users!bookings_student_id_fkey(id, name, email),
        teacher:users!bookings_teacher_id_fkey(id, name),
        academy:academies(id, name)
      `)
      .eq('is_reserved', true)
      .neq('status_canonical', 'CANCELED')
      .gte('start_at', sixDaysFromNow.toISOString())
      .lte('start_at', eightDaysFromNow.toISOString())
      .order('start_at', { ascending: true })
    
    // Se não for admin, filtrar por professor/aluno logado
    if (!isAdmin) {
      const isStudent = ['STUDENT', 'ALUNO'].includes(user.role)
      if (isStudent) {
        query = query.eq('student_id', user.userId)
      } else {
        query = query.eq('teacher_id', user.userId)
      }
    }
    
    const { data: reservations, error } = await query
    
    if (error) {
      console.error('Erro ao buscar reservas pendentes:', error)
      return res.status(500).json({ error: 'Erro ao buscar reservas pendentes' })
    }
    
    return res.json({
      count: reservations?.length || 0,
      reservations: reservations || []
    })
    
  } catch (error) {
    console.error('Erro ao buscar reservas pendentes:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/booking-series/process-reservations
 * Processa reservas pendentes - tenta cobrar créditos
 * Este endpoint pode ser chamado por um cron job ou manualmente por admins
 */
router.post('/process-reservations', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }
    
    // Apenas admins podem processar reservas manualmente
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FRANCHISE_ADMIN', 'FRANQUEADORA'].includes(user.role)
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem processar reservas manualmente' })
    }
    
    // Buscar reservas que vencem em exatamente 7 dias
    const now = new Date()
    const sevenDaysFromNow = startOfDay(addDays(now, 7))
    const eightDaysFromNow = startOfDay(addDays(now, 8))
    
    const { data: reservations, error } = await supabase
      .from('bookings')
      .select('id, student_id, teacher_id, start_at, series_id')
      .eq('is_reserved', true)
      .neq('status_canonical', 'CANCELED')
      .gte('start_at', sevenDaysFromNow.toISOString())
      .lt('start_at', eightDaysFromNow.toISOString())
    
    if (error) {
      console.error('Erro ao buscar reservas:', error)
      return res.status(500).json({ error: 'Erro ao buscar reservas' })
    }
    
    const results = {
      processed: 0,
      confirmed: 0,
      cancelled: 0,
      errors: 0,
      details: [] as any[]
    }
    
    for (const reservation of reservations || []) {
      results.processed++
      
      try {
        // Verificar créditos do aluno
        const balance = await getStudentCredits(reservation.student_id)
        
        if (balance >= 1) {
          // Debitar crédito e confirmar
          const debited = await debitStudentCredits(reservation.student_id, 1, reservation.id)
          
          if (debited) {
            await supabase
              .from('bookings')
              .update({ is_reserved: false, updated_at: new Date().toISOString() })
              .eq('id', reservation.id)
            
            // Notificar sucesso
            await supabase
              .from('booking_series_notifications')
              .insert({
                series_id: reservation.series_id,
                booking_id: reservation.id,
                user_id: reservation.student_id,
                type: 'CREDIT_SUCCESS',
                message: `Sua aula do dia ${format(new Date(reservation.start_at), 'dd/MM/yyyy')} foi confirmada!`,
                sent_at: new Date().toISOString()
              })
            
            results.confirmed++
            results.details.push({
              bookingId: reservation.id,
              status: 'confirmed',
              studentId: reservation.student_id
            })
          } else {
            results.errors++
            results.details.push({
              bookingId: reservation.id,
              status: 'error',
              reason: 'Falha ao debitar crédito'
            })
          }
        } else {
          // Cancelar por falta de crédito
          await supabase
            .from('bookings')
            .update({ status_canonical: 'CANCELED', updated_at: new Date().toISOString() })
            .eq('id', reservation.id)
          
          // Notificar aluno
          await supabase
            .from('booking_series_notifications')
            .insert({
              series_id: reservation.series_id,
              booking_id: reservation.id,
              user_id: reservation.student_id,
              type: 'CREDIT_FAILED',
              message: `Sua aula do dia ${format(new Date(reservation.start_at), 'dd/MM/yyyy')} foi cancelada por falta de crédito.`,
              sent_at: new Date().toISOString()
            })
          
          // Notificar professor
          await supabase
            .from('booking_series_notifications')
            .insert({
              series_id: reservation.series_id,
              booking_id: reservation.id,
              user_id: reservation.teacher_id,
              type: 'BOOKING_CANCELLED',
              message: `A reserva para o dia ${format(new Date(reservation.start_at), 'dd/MM/yyyy')} foi cancelada por falta de crédito do aluno.`,
              sent_at: new Date().toISOString()
            })
          
          results.cancelled++
          results.details.push({
            bookingId: reservation.id,
            status: 'cancelled',
            reason: 'Sem crédito disponível',
            studentId: reservation.student_id
          })
        }
      } catch (err) {
        console.error(`Erro ao processar reserva ${reservation.id}:`, err)
        results.errors++
        results.details.push({
          bookingId: reservation.id,
          status: 'error',
          reason: 'Erro interno'
        })
      }
    }
    
    return res.json({
      success: true,
      message: `Processamento concluído: ${results.confirmed} confirmadas, ${results.cancelled} canceladas, ${results.errors} erros`,
      results
    })
    
  } catch (error) {
    console.error('Erro ao processar reservas:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
