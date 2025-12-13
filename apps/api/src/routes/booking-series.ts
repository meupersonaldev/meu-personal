import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth } from '../middleware/auth'
import { addDays, addWeeks, addMonths, startOfDay, format, getDay, setDay, isBefore, isAfter } from 'date-fns'
import { balanceService } from '../services/balance.service'

const router = Router()

/**
 * Cria ou atualiza vínculo automático professor-aluno quando aluno agenda pela plataforma
 */
async function ensureTeacherStudentLink(
  teacherId: string,
  studentId: string,
  studentName: string,
  studentEmail: string
): Promise<void> {
  try {
    const { data: existingLink } = await supabase
      .from('teacher_students')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('user_id', studentId)
      .maybeSingle()

    if (existingLink) return

    const { data: existingByEmail } = await supabase
      .from('teacher_students')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('email', studentEmail)
      .maybeSingle()

    if (existingByEmail) {
      await supabase
        .from('teacher_students')
        .update({ user_id: studentId, updated_at: new Date().toISOString() })
        .eq('id', existingByEmail.id)
      return
    }

    await supabase
      .from('teacher_students')
      .insert({
        teacher_id: teacherId,
        user_id: studentId,
        name: studentName,
        email: studentEmail,
        connection_status: 'APPROVED',
        source: 'PLATFORM',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    console.log(`[booking-series] ✅ Vínculo professor-aluno criado: teacher=${teacherId}, student=${studentId}`)
  } catch (err) {
    console.error(`[booking-series] Erro ao criar vínculo professor-aluno:`, err)
  }
}

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
// Helper para calcular saldo disponível
function calculateAvailableCredits(balance: any): number {
  return (balance.total_purchased || 0) - (balance.total_consumed || 0) - (balance.locked_qty || 0)
}

// Helper para buscar franqueadora
async function fetchFranqueadoraIdFromAcademy(academyId: string): Promise<string> {
  const { data } = await supabase
    .from('academies')
    .select('franqueadora_id')
    .eq('id', academyId)
    .single()
  return data?.franqueadora_id || ''
}

/**
 * Busca créditos do aluno usando balanceService
 */
async function getStudentCredits(studentId: string, academyId: string): Promise<number> {
  try {
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(academyId)
    if (!franqueadoraId) return 0

    const balance = await balanceService.getStudentBalance(studentId, franqueadoraId)
    return calculateAvailableCredits(balance)
  } catch (err) {
    console.error('Erro ao buscar saldo:', err)
    return 0
  }
}

/**
 * Debita créditos do aluno
 */
async function debitStudentCredits(studentId: string, amount: number, bookingId: string, academyId: string): Promise<boolean> {
  try {
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(academyId)
    if (!franqueadoraId) return false

    // Verificar saldo antes
    const available = await getStudentCredits(studentId, academyId)
    if (available < amount) return false

    await balanceService.consumeStudentClasses(
      studentId,
      franqueadoraId,
      amount,
      bookingId,
      {
        unitId: null,
        source: 'ALUNO',
        metaJson: {
          booking_id: bookingId,
          origin: 'booking_series_recurrence'
        }
      }
    )

    // Sincronizar cache em users
    const newBalance = await balanceService.getStudentBalance(studentId, franqueadoraId)
    const newAvailable = calculateAvailableCredits(newBalance)

    await supabase
      .from('users')
      .update({
        credits: Math.max(0, newAvailable),
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)

    return true
  } catch (err) {
    console.error('Erro ao debitar créditos:', err)
    return false
  }
}

/**
 * Estorna créditos do aluno
 */
async function refundStudentCredits(studentId: string, amount: number, refId: string, academyId: string, reason: string = 'Booking Refund'): Promise<boolean> {
  try {
    const franqueadoraId = await fetchFranqueadoraIdFromAcademy(academyId)
    if (!franqueadoraId) return false

    const balance = await balanceService.getStudentBalance(studentId, franqueadoraId)

    // Diminuir total_consumed (estorno)
    const newConsumed = Math.max(0, balance.total_consumed - amount)

    await balanceService.updateStudentBalance(studentId, franqueadoraId, {
      total_consumed: newConsumed
    })

    // Registrar transação usando balanceService
    await balanceService.createStudentTransaction(
      studentId,
      franqueadoraId,
      'REFUND',
      amount,
      {
        source: 'SYSTEM',
        metaJson: {
          reason,
          ref_id: refId
        }
      }
    )

    // Sincronizar cache em users
    const newBalance = await balanceService.getStudentBalance(studentId, franqueadoraId)
    const newAvailable = calculateAvailableCredits(newBalance)

    await supabase
      .from('users')
      .update({
        credits: Math.max(0, newAvailable),
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)

    return true
  } catch (err) {
    console.error('Erro ao estornar créditos:', err)
    return false
  }
}

/**
 * Verifica se o professor tem disponibilidade em uma data/hora específica para série recorrente
 * Para séries recorrentes, verificamos APENAS se não há conflito (booking ocupado).
 * Não exigimos slot AVAILABLE porque o professor já aceita a série inteira.
 * 
 * Retorna true se:
 * - Não existe nenhum booking ocupado (com aluno) no horário
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

  console.log(`[checkTeacherAvailability] Verificando disponibilidade para data=${date}, startTime=${startTime}, startAt=${startAt.toISOString()}, endAt=${endAt.toISOString()}`)

  // Para séries recorrentes, verificar APENAS se há conflito
  // Não exigimos slot AVAILABLE porque ao criar uma série, o professor está concordando com todas as datas
  const { data: occupiedBookings, error: occupiedError } = await supabase
    .from('bookings')
    .select('id, start_at, status_canonical, student_id')
    .eq('teacher_id', teacherId)
    .not('student_id', 'is', null) // Tem aluno
    .neq('status_canonical', 'CANCELED') // Não cancelado
    .eq('start_at', startAt.toISOString()) // Mesmo horário exato

  if (occupiedError) {
    console.error(`[checkTeacherAvailability] Erro ao verificar conflitos para ${date}:`, occupiedError)
    // Em caso de erro, assumir que está disponível (permissivo)
    return true
  }

  const hasConflict = (occupiedBookings?.length || 0) > 0

  if (hasConflict) {
    console.log(`[checkTeacherAvailability] ❌ Conflito encontrado para ${date}: ${JSON.stringify(occupiedBookings)}`)
  } else {
    console.log(`[checkTeacherAvailability] ✅ Sem conflito para ${date}, professor disponível`)
  }

  // Se não há booking ocupado, professor está disponível
  return !hasConflict
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

    // Limite máximo: série não pode ultrapassar 6 meses a partir da data inicial
    const maxEndAllowed = addMonths(start, 6)
    const calculatedEnd = calculateEndDate(start, recurrenceType)

    if (isAfter(calculatedEnd, maxEndAllowed)) {
      return res.status(400).json({
        error: 'A série recorrente não pode ultrapassar 6 meses de duração a partir da data inicial.',
        details: {
          startDate,
          requestedEndDate: format(calculatedEnd, 'yyyy-MM-dd'),
          maxAllowedEndDate: format(maxEndAllowed, 'yyyy-MM-dd')
        }
      })
    }

    const end = calculatedEnd
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
    const studentCredits = await getStudentCredits(user.userId, academyId)

    // Verificar disponibilidade do professor para cada data
    const availableDates: string[] = []
    const skippedDates: { date: string; reason: string }[] = []

    console.log(`[booking-series] Datas geradas para a série: ${seriesDates.map(d => format(d, 'yyyy-MM-dd')).join(', ')}`)

    for (const date of seriesDates) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const isAvailable = await checkTeacherAvailability(teacherId, academyId, dateStr, startTime, endTime)

      if (isAvailable) {
        availableDates.push(dateStr)
      } else {
        skippedDates.push({ date: dateStr, reason: 'Professor sem disponibilidade' })
      }
    }

    console.log(`[booking-series] Resumo verificação: ${availableDates.length} datas disponíveis, ${skippedDates.length} datas puladas`)
    if (skippedDates.length > 0) {
      console.log(`[booking-series] Datas puladas: ${JSON.stringify(skippedDates)}`)
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
    const bookingErrors: { date: string; error: string }[] = []
    let creditsUsed = 0
    let confirmedCount = 0
    let reservedCount = 0

    console.log(`[booking-series] Iniciando criação de ${availableDates.length} bookings para série ${series.id}`)

    for (let i = 0; i < availableDates.length; i++) {
      const dateStr = availableDates[i]
      const startAt = createUtcDateTime(dateStr, startTime)
      const endAt = createUtcDateTime(dateStr, endTime)

      try {
        // Verificar se ainda há créditos
        const hasCredit = creditsUsed < studentCredits
        const isReserved = !hasCredit

        console.log(`[booking-series] Processando data ${dateStr} (${i + 1}/${availableDates.length}) - Créditos disponíveis: ${studentCredits - creditsUsed}, Reservado: ${isReserved}`)

        // Buscar o slot disponível do professor para usar como base
        // NOTA: Não filtramos por academy_id/franchise_id porque slots AVAILABLE geralmente têm franchise_id = NULL
        // Usar .maybeSingle() ao invés de .single() para não falhar se não encontrar
        // Buscar slot que começa no horário exato (start_at = startAt)
        const { data: slot, error: slotError } = await supabase
          .from('bookings')
          .select('id')
          .eq('teacher_id', teacherId)
          .eq('status_canonical', 'AVAILABLE')
          .is('student_id', null)
          .eq('start_at', startAt.toISOString())
          .maybeSingle()

        if (slotError && slotError.code !== 'PGRST116') { // PGRST116 = nenhum resultado encontrado (é esperado)
          console.error(`[booking-series] Erro ao buscar slot para ${dateStr}:`, slotError)
        }

        if (slot) {
          // Atualizar o slot existente
          // Garantir que franchise_id seja definido ao atualizar o slot
          console.log(`[booking-series] Slot encontrado ${slot.id} para ${dateStr}, atualizando...`)
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .update({
              student_id: studentId,
              franchise_id: academyId,
              status_canonical: isReserved ? 'RESERVED' : 'PAID',
              series_id: series.id,
              is_reserved: isReserved,
              date: dateStr, // Campo date deve ser apenas a data (YYYY-MM-DD), não data/hora
              updated_at: new Date().toISOString()
            })
            .eq('id', slot.id)
            .select()
            .single()

          if (bookingError) {
            console.error(`[booking-series] Erro ao atualizar slot ${slot.id} para ${dateStr}:`, bookingError)
            bookingErrors.push({ date: dateStr, error: bookingError.message || 'Erro ao atualizar slot' })
            continue // Continuar para próxima data mesmo se falhar
          }

          if (booking) {
            console.log(`[booking-series] ✅ Slot atualizado: booking_id=${booking.id}, franchise_id=${booking.franchise_id}, status=${booking.status_canonical}`)
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
              const debited = await debitStudentCredits(studentId!, 1, booking.id, academyId)
              if (debited) {
                creditsUsed++
                confirmedCount++
              } else {
                console.error(`[booking-series] ⚠️ Falha ao debitar crédito para booking ${booking.id}`)
              }

              // Adicionar hora pendente para o professor (BONUS_LOCK)
              try {
                const franqueadoraId = await fetchFranqueadoraIdFromAcademy(academyId)
                if (franqueadoraId) {
                  await balanceService.lockProfessorBonusHours(
                    teacherId,
                    franqueadoraId,
                    1,
                    booking.id,
                    null,
                    {
                      source: 'ALUNO',
                      metaJson: {
                        booking_id: booking.id,
                        origin: 'booking_series_slot_update',
                        date: dateStr
                      }
                    }
                  )
                  console.log(`[booking-series] ✅ Hora pendente adicionada para professor ${teacherId}`)
                }
              } catch (lockErr) {
                console.error(`[booking-series] ⚠️ Erro ao adicionar hora pendente para professor:`, lockErr)
              }
            } else {
              reservedCount++
            }
          }
        } else {
          // Criar novo booking (caso não encontre slot existente)
          console.log(`[booking-series] Nenhum slot encontrado para ${dateStr}, criando novo booking...`)
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
              teacher_id: teacherId,
              student_id: studentId,
              franchise_id: academyId, // CORRIGIDO: usar franchise_id ao invés de academy_id
              start_at: startAt.toISOString(),
              end_at: endAt.toISOString(),
              date: dateStr, // Campo date deve ser apenas a data (YYYY-MM-DD), não data/hora
              status_canonical: isReserved ? 'RESERVED' : 'PAID',
              series_id: series.id,
              is_reserved: isReserved,
              source: 'ALUNO',
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (bookingError) {
            console.error(`[booking-series] ❌ Erro ao criar booking para ${dateStr}:`, bookingError)
            bookingErrors.push({ date: dateStr, error: bookingError.message || 'Erro ao criar booking' })
            continue // Continuar para próxima data mesmo se falhar
          }

          if (booking) {
            console.log(`[booking-series] ✅ Booking criado: booking_id=${booking.id}, franchise_id=${booking.franchise_id}, status=${booking.status_canonical}`)
            bookings.push({
              id: booking.id,
              date: dateStr,
              startTime,
              endTime,
              status: booking.status_canonical,
              isReserved
            })

            if (!isReserved) {
              const debited = await debitStudentCredits(studentId!, 1, booking.id, academyId)
              if (debited) {
                creditsUsed++
                confirmedCount++
              } else {
                console.error(`[booking-series] ⚠️ Falha ao debitar crédito para booking ${booking.id}`)
              }

              // Adicionar hora pendente para o professor (BONUS_LOCK)
              try {
                const franqueadoraId = await fetchFranqueadoraIdFromAcademy(academyId)
                if (franqueadoraId) {
                  await balanceService.lockProfessorBonusHours(
                    teacherId,
                    franqueadoraId,
                    1,
                    booking.id,
                    null,
                    {
                      source: 'ALUNO',
                      metaJson: {
                        booking_id: booking.id,
                        origin: 'booking_series_new_booking',
                        date: dateStr
                      }
                    }
                  )
                  console.log(`[booking-series] ✅ Hora pendente adicionada para professor ${teacherId}`)
                }
              } catch (lockErr) {
                console.error(`[booking-series] ⚠️ Erro ao adicionar hora pendente para professor:`, lockErr)
              }
            } else {
              reservedCount++
            }
          }
        }
      } catch (error: any) {
        console.error(`[booking-series] ❌ Erro inesperado ao processar ${dateStr}:`, error)
        bookingErrors.push({ date: dateStr, error: error.message || 'Erro inesperado' })
        // Continuar para próxima data mesmo se falhar
      }
    }

    console.log(`[booking-series] Resumo: ${bookings.length} bookings criados/atualizados, ${confirmedCount} confirmados, ${reservedCount} reservados, ${bookingErrors.length} erros`)

    // Se houver erros mas pelo menos alguns bookings foram criados, avisar mas não falhar completamente
    if (bookingErrors.length > 0 && bookings.length === 0) {
      return res.status(500).json({
        error: 'Erro ao criar bookings da série',
        details: bookingErrors
      })
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

    // Criar vínculo automático professor-aluno (se não existir)
    if (studentId && bookings.length > 0) {
      try {
        const { data: studentData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', studentId)
          .single()

        if (studentData) {
          await ensureTeacherStudentLink(
            teacherId,
            studentId,
            studentData.name || 'Aluno',
            studentData.email
          )
        }
      } catch (linkError) {
        console.error(`[booking-series] Erro ao criar vínculo:`, linkError)
      }
    }

    return res.status(201).json({
      seriesId: series.id,
      confirmedCount,
      reservedCount,
      totalCreditsUsed: creditsUsed,
      skippedDates,
      bookings,
      bookingErrors: bookingErrors.length > 0 ? bookingErrors : undefined,
      message: bookingErrors.length > 0
        ? `Série criada com ${confirmedCount} aulas confirmadas e ${reservedCount} reservadas. ${bookingErrors.length} data(s) falharam ao criar booking.`
        : reservedCount > 0
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
 * DELETE /api/booking-series/:seriesId
 * Deleta a série inteira e todos os bookings associados
 * Usado quando não há bookingId disponível ou para forçar remoção completa
 */
router.delete('/:seriesId', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    const { seriesId } = req.params

    console.log(`[booking-series/delete] Iniciando deleção da série ${seriesId}`)

    // Buscar série
    const { data: series, error: seriesError } = await supabase
      .from('booking_series')
      .select('*')
      .eq('id', seriesId)
      .single()

    if (seriesError || !series) {
      console.error(`[booking-series/delete] Série não encontrada: ${seriesId}`)
      return res.status(404).json({ error: 'Série não encontrada' })
    }

    // Verificar permissão
    const isOwner = series.student_id === user.userId || series.teacher_id === user.userId
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'FRANCHISE_ADMIN', 'FRANQUEADORA'].includes(user.role)

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para deletar esta série' })
    }

    // Buscar todos os bookings da série para estornar créditos
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, is_reserved, status_canonical')
      .eq('series_id', seriesId)

    if (bookingsError) {
      console.error(`[booking-series/delete] Erro ao buscar bookings:`, bookingsError)
    }

    console.log(`[booking-series/delete] Encontrados ${allBookings?.length || 0} bookings para a série`)

    // Contar créditos a estornar (apenas bookings que foram confirmados/pagos)
    const confirmedBookings = allBookings?.filter(b =>
      !b.is_reserved &&
      b.status_canonical !== 'CANCELED' &&
      b.status_canonical !== 'CANCELLED'
    ) || []
    const refundedCredits = confirmedBookings.length

    console.log(`[booking-series/delete] Créditos a estornar: ${refundedCredits}`)

    // Deletar todos os bookings da série (não apenas marcar como cancelado, mas remover)
    if (allBookings && allBookings.length > 0) {
      const ids = allBookings.map(b => b.id)

      const { error: deleteBookingsError } = await supabase
        .from('bookings')
        .delete()
        .in('id', ids)

      if (deleteBookingsError) {
        console.error(`[booking-series/delete] Erro ao deletar bookings:`, deleteBookingsError)
        // Fallback: tentar marcar como cancelado
        await supabase
          .from('bookings')
          .update({ status_canonical: 'CANCELED', updated_at: new Date().toISOString() })
          .in('id', ids)
      } else {
        console.log(`[booking-series/delete] ${ids.length} bookings deletados`)
      }
    }

    // Estornar créditos
    if (refundedCredits > 0 && series.student_id) {
      const refunded = await refundStudentCredits(
        series.student_id,
        refundedCredits,
        seriesId,
        series.academy_id,
        'BOOKING_SERIES_DELETED'
      )

      if (refunded) {
        console.log(`[booking-series/delete] ${refundedCredits} créditos estornados para ${series.student_id}`)
      } else {
        console.error(`[booking-series/delete] Falha ao estornar créditos para ${series.student_id}`)
      }
    }

    // Deletar notificações da série
    await supabase
      .from('booking_series_notifications')
      .delete()
      .eq('series_id', seriesId)

    // Deletar a série
    const { error: deleteSeriesError } = await supabase
      .from('booking_series')
      .delete()
      .eq('id', seriesId)

    if (deleteSeriesError) {
      console.error(`[booking-series/delete] Erro ao deletar série:`, deleteSeriesError)
      // Fallback: marcar como cancelada
      await supabase
        .from('booking_series')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', seriesId)
    } else {
      console.log(`[booking-series/delete] Série ${seriesId} deletada`)
    }

    return res.json({
      success: true,
      deletedBookings: allBookings?.length || 0,
      refundedCredits,
      message: `Série deletada com sucesso. ${allBookings?.length || 0} agendamento(s) removido(s).${refundedCredits > 0 ? ` ${refundedCredits} crédito(s) estornado(s).` : ''}`
    })

  } catch (error) {
    console.error('Erro ao deletar série:', error)
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
        const refunded = await refundStudentCredits(
          booking.student_id,
          1,
          booking.id,
          booking.franchise_id || series.academy_id, // fallback for academy
          'BOOKING_CANCELLED_SINGLE'
        )
        if (refunded) refundedCredits = 1
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
          await refundStudentCredits(
            booking.student_id,
            refundedCredits,
            booking.id, // using current booking id as ref
            booking.franchise_id || series.academy_id,
            'BOOKING_CANCELLED_FUTURE'
          )
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
          await refundStudentCredits(
            series.student_id,
            refundedCredits,
            seriesId, // using series id as ref
            series.academy_id,
            'BOOKING_CANCELLED_ALL'
          )
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
 * Inclui contagem de bookings confirmados vs reservados (Requirement 3.4)
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

    // Enrich each series with booking counts (Requirement 3.4)
    const enrichedSeries = await Promise.all(
      (series || []).map(async (s: any) => {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, is_reserved, status_canonical')
          .eq('series_id', s.id)

        const confirmedCount = bookings?.filter(
          (b: any) => !b.is_reserved && b.status_canonical !== 'CANCELED'
        ).length || 0
        const reservedCount = bookings?.filter(
          (b: any) => b.is_reserved && b.status_canonical !== 'CANCELED'
        ).length || 0

        return {
          ...s,
          confirmedCount,
          reservedCount
        }
      })
    )

    return res.json(enrichedSeries)

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
      .select('id, student_id, teacher_id, start_at, series_id, franchise_id')
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
        const balance = await getStudentCredits(reservation.student_id, reservation.franchise_id)

        if (balance >= 1) {
          // Debitar crédito e confirmar
          const debited = await debitStudentCredits(reservation.student_id, 1, reservation.id, reservation.franchise_id)

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

/**
 * POST /api/booking-series/:seriesId/regenerate
 * Regenera os bookings faltantes de uma série existente
 * Útil para corrigir séries que foram criadas com bugs
 */
router.post('/:seriesId/regenerate', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    const { seriesId } = req.params

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
      return res.status(403).json({ error: 'Sem permissão para regenerar esta série' })
    }

    console.log(`[booking-series/regenerate] Regenerando bookings para série ${seriesId}`)
    console.log(`[booking-series/regenerate] Dados da série:`, {
      start_date: series.start_date,
      end_date: series.end_date,
      day_of_week: series.day_of_week,
      start_time: series.start_time,
      end_time: series.end_time,
      recurrence_type: series.recurrence_type
    })

    // Calcular datas da série
    const start = new Date(series.start_date + 'T00:00:00')
    const end = new Date(series.end_date + 'T00:00:00')
    const seriesDates = generateSeriesDates(start, end, series.day_of_week)

    console.log(`[booking-series/regenerate] Datas da série: ${seriesDates.map(d => format(d, 'yyyy-MM-dd')).join(', ')}`)

    // Buscar bookings existentes da série pelo start_at exato (não apenas pela data)
    const { data: existingBookings, error: existingError } = await supabase
      .from('bookings')
      .select('id, date, start_at, status_canonical')
      .eq('series_id', seriesId)

    if (existingError) {
      console.error('[booking-series/regenerate] Erro ao buscar bookings existentes:', existingError)
    }

    // Usar start_at como chave para evitar duplicatas em horários diferentes do mesmo dia
    const existingStartAts = new Set(
      (existingBookings || []).map(b => b.start_at).filter(Boolean)
    )

    console.log(`[booking-series/regenerate] Bookings existentes: ${existingBookings?.length || 0}`)
    console.log(`[booking-series/regenerate] start_at existentes: ${existingStartAts.size}`)

    // Calcular quais start_at precisam ser criados
    const bookingsToCreate: { dateStr: string; startAt: string; endAt: string }[] = []

    for (const date of seriesDates) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const startAt = createUtcDateTime(dateStr, series.start_time)
      const startAtStr = startAt.toISOString()

      if (!existingStartAts.has(startAtStr)) {
        const endAt = createUtcDateTime(dateStr, series.end_time)
        bookingsToCreate.push({
          dateStr,
          startAt: startAtStr,
          endAt: endAt.toISOString()
        })
      }
    }

    console.log(`[booking-series/regenerate] Bookings a criar: ${bookingsToCreate.length}`)

    if (bookingsToCreate.length === 0) {
      return res.json({
        success: true,
        message: 'Todos os bookings da série já existem',
        existingCount: existingBookings?.length || 0,
        createdCount: 0
      })
    }

    // Buscar créditos disponíveis do aluno
    let studentCredits = 0
    if (series.student_id) {
      studentCredits = await getStudentCredits(series.student_id, series.academy_id)
      console.log(`[booking-series/regenerate] Créditos do aluno: ${studentCredits}`)
    }

    // Criar bookings faltantes
    const createdBookings: any[] = []
    const errors: { date: string; error: string }[] = []
    let creditsUsed = 0

    for (const { dateStr, startAt, endAt } of bookingsToCreate) {
      try {
        // Verificar se ainda há créditos
        const hasCredit = creditsUsed < studentCredits
        const isReserved = !hasCredit

        console.log(`[booking-series/regenerate] Criando booking para ${dateStr} - hasCredit: ${hasCredit}, isReserved: ${isReserved}`)

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            teacher_id: series.teacher_id,
            student_id: series.student_id,
            franchise_id: series.academy_id,
            start_at: startAt,
            end_at: endAt,
            date: dateStr,
            status_canonical: isReserved ? 'RESERVED' : 'PAID',
            series_id: seriesId,
            is_reserved: isReserved,
            source: 'ALUNO',
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (bookingError) {
          console.error(`[booking-series/regenerate] ❌ Erro ao criar booking para ${dateStr}:`, bookingError)
          errors.push({ date: dateStr, error: bookingError.message || 'Erro ao criar' })
        } else if (booking) {
          console.log(`[booking-series/regenerate] ✅ Booking criado: ${booking.id}, status: ${booking.status_canonical}`)
          createdBookings.push({
            id: booking.id,
            date: dateStr,
            status: booking.status_canonical
          })

          // Debitar crédito se não for reserva
          if (!isReserved && series.student_id) {
            const debited = await debitStudentCredits(series.student_id, 1, booking.id, series.academy_id)
            if (debited) {
              creditsUsed++
            }
          }
        }
      } catch (error: any) {
        console.error(`[booking-series/regenerate] ❌ Erro inesperado para ${dateStr}:`, error)
        errors.push({ date: dateStr, error: error.message || 'Erro inesperado' })
      }
    }

    return res.json({
      success: true,
      message: `Regeneração concluída: ${createdBookings.length} bookings criados, ${errors.length} erros`,
      existingCount: existingBookings?.length || 0,
      createdCount: createdBookings.length,
      creditsUsed,
      createdBookings,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Erro ao regenerar série:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
