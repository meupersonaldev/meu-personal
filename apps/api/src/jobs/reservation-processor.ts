import { supabase } from '../lib/supabase'
import { addDays, startOfDay, format } from 'date-fns'

/**
 * Job de processamento de reservas recorrentes
 * 
 * Executa diariamente para:
 * 1. Buscar reservas que vencem em 7 dias
 * 2. Tentar debitar créditos do aluno
 * 3. Confirmar ou cancelar a reserva
 * 4. Enviar notificações
 */

interface ProcessingResult {
  processed: number
  confirmed: number
  cancelled: number
  errors: number
  details: Array<{
    bookingId: string
    status: 'confirmed' | 'cancelled' | 'error'
    reason?: string
    studentId?: string
  }>
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
  const currentBalance = await getStudentCredits(studentId)
  
  if (currentBalance < amount) {
    return false
  }
  
  const { error: updateError } = await supabase
    .from('student_class_balance')
    .update({ 
      balance: currentBalance - amount,
      updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)
  
  if (updateError) {
    console.error('[ReservationProcessor] Erro ao debitar créditos:', updateError)
    return false
  }
  
  // Registrar a transação
  await supabase
    .from('student_class_tx')
    .insert({
      student_id: studentId,
      delta: -amount,
      reason: 'BOOKING_RECURRING_AUTO',
      ref_id: bookingId,
      created_at: new Date().toISOString()
    })
  
  return true
}

/**
 * Envia notificação para o sistema de notificações existente
 */
async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'BOOKING'
): Promise<void> {
  try {
    // Inserir na tabela de notificações do sistema
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        read: false,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('[ReservationProcessor] Erro ao enviar notificação:', error)
  }
}

/**
 * Processa todas as reservas pendentes que vencem em 7 dias
 */
async function processReservations(): Promise<ProcessingResult> {
  const results: ProcessingResult = {
    processed: 0,
    confirmed: 0,
    cancelled: 0,
    errors: 0,
    details: []
  }
  
  try {
    const now = new Date()
    const sevenDaysFromNow = startOfDay(addDays(now, 7))
    const eightDaysFromNow = startOfDay(addDays(now, 8))
    
    console.log(`[ReservationProcessor] Buscando reservas entre ${sevenDaysFromNow.toISOString()} e ${eightDaysFromNow.toISOString()}`)
    
    // Buscar reservas pendentes
    const { data: reservations, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        teacher_id,
        start_at,
        series_id,
        student:users!bookings_student_id_fkey(name, email),
        teacher:users!bookings_teacher_id_fkey(name)
      `)
      .eq('is_reserved', true)
      .neq('status_canonical', 'CANCELED')
      .gte('start_at', sevenDaysFromNow.toISOString())
      .lt('start_at', eightDaysFromNow.toISOString())
    
    if (error) {
      console.error('[ReservationProcessor] Erro ao buscar reservas:', error)
      return results
    }
    
    if (!reservations || reservations.length === 0) {
      console.log('[ReservationProcessor] Nenhuma reserva pendente encontrada')
      return results
    }
    
    console.log(`[ReservationProcessor] Encontradas ${reservations.length} reservas para processar`)
    
    for (const reservation of reservations) {
      results.processed++
      
      try {
        const balance = await getStudentCredits(reservation.student_id)
        const formattedDate = format(new Date(reservation.start_at), 'dd/MM/yyyy')
        const studentName = (reservation.student as any)?.name || 'Aluno'
        const teacherName = (reservation.teacher as any)?.name || 'Professor'
        
        if (balance >= 1) {
          // Debitar crédito e confirmar
          const debited = await debitStudentCredits(reservation.student_id, 1, reservation.id)
          
          if (debited) {
            // Atualizar booking para confirmado
            await supabase
              .from('bookings')
              .update({ 
                is_reserved: false, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', reservation.id)
            
            // Registrar na tabela de notificações da série
            if (reservation.series_id) {
              await supabase
                .from('booking_series_notifications')
                .insert({
                  series_id: reservation.series_id,
                  booking_id: reservation.id,
                  user_id: reservation.student_id,
                  type: 'CREDIT_SUCCESS',
                  message: `Sua aula do dia ${formattedDate} foi confirmada!`,
                  sent_at: new Date().toISOString()
                })
            }
            
            // Enviar notificação para o aluno
            await sendNotification(
              reservation.student_id,
              'Aula Confirmada! ✅',
              `Sua aula com ${teacherName} no dia ${formattedDate} foi confirmada automaticamente.`
            )
            
            results.confirmed++
            results.details.push({
              bookingId: reservation.id,
              status: 'confirmed',
              studentId: reservation.student_id
            })
            
            console.log(`[ReservationProcessor] ✅ Reserva ${reservation.id} confirmada`)
          } else {
            results.errors++
            results.details.push({
              bookingId: reservation.id,
              status: 'error',
              reason: 'Falha ao debitar crédito'
            })
            console.error(`[ReservationProcessor] ❌ Falha ao debitar crédito para reserva ${reservation.id}`)
          }
        } else {
          // Cancelar por falta de crédito
          await supabase
            .from('bookings')
            .update({ 
              status_canonical: 'CANCELED', 
              updated_at: new Date().toISOString() 
            })
            .eq('id', reservation.id)
          
          // Registrar na tabela de notificações da série
          if (reservation.series_id) {
            await supabase
              .from('booking_series_notifications')
              .insert({
                series_id: reservation.series_id,
                booking_id: reservation.id,
                user_id: reservation.student_id,
                type: 'CREDIT_FAILED',
                message: `Sua aula do dia ${formattedDate} foi cancelada por falta de crédito.`,
                sent_at: new Date().toISOString()
              })
            
            // Notificação para o professor
            await supabase
              .from('booking_series_notifications')
              .insert({
                series_id: reservation.series_id,
                booking_id: reservation.id,
                user_id: reservation.teacher_id,
                type: 'BOOKING_CANCELLED',
                message: `A reserva de ${studentName} para ${formattedDate} foi cancelada por falta de crédito.`,
                sent_at: new Date().toISOString()
              })
          }
          
          // Enviar notificação para o aluno
          await sendNotification(
            reservation.student_id,
            'Aula Cancelada ❌',
            `Sua aula com ${teacherName} no dia ${formattedDate} foi cancelada por falta de crédito. Adquira mais créditos para reagendar.`
          )
          
          // Enviar notificação para o professor
          await sendNotification(
            reservation.teacher_id,
            'Reserva Cancelada',
            `A reserva de ${studentName} para ${formattedDate} foi cancelada automaticamente por falta de crédito.`
          )
          
          results.cancelled++
          results.details.push({
            bookingId: reservation.id,
            status: 'cancelled',
            reason: 'Sem crédito disponível',
            studentId: reservation.student_id
          })
          
          console.log(`[ReservationProcessor] ⚠️ Reserva ${reservation.id} cancelada por falta de crédito`)
        }
      } catch (err) {
        console.error(`[ReservationProcessor] ❌ Erro ao processar reserva ${reservation.id}:`, err)
        results.errors++
        results.details.push({
          bookingId: reservation.id,
          status: 'error',
          reason: 'Erro interno'
        })
      }
    }
    
    return results
    
  } catch (error) {
    console.error('[ReservationProcessor] Erro geral:', error)
    return results
  }
}

/**
 * Envia lembretes para reservas que vencem em 7 dias
 * (Roda junto com o processamento, mas para reservas do dia seguinte)
 */
async function sendReminders(): Promise<number> {
  let remindersSent = 0
  
  try {
    const now = new Date()
    const eightDaysFromNow = startOfDay(addDays(now, 8))
    const nineDaysFromNow = startOfDay(addDays(now, 9))
    
    // Buscar reservas que vencem em 8 dias (lembrete antecipado)
    const { data: reservations, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        start_at,
        series_id,
        teacher:users!bookings_teacher_id_fkey(name)
      `)
      .eq('is_reserved', true)
      .neq('status_canonical', 'CANCELED')
      .gte('start_at', eightDaysFromNow.toISOString())
      .lt('start_at', nineDaysFromNow.toISOString())
    
    if (error || !reservations) {
      return remindersSent
    }
    
    for (const reservation of reservations) {
      const formattedDate = format(new Date(reservation.start_at), 'dd/MM/yyyy')
      const teacherName = (reservation.teacher as any)?.name || 'seu professor'
      const balance = await getStudentCredits(reservation.student_id)
      
      if (balance < 1) {
        // Enviar lembrete de crédito necessário
        await sendNotification(
          reservation.student_id,
          'Crédito Necessário ⚠️',
          `Você precisa de crédito para sua aula com ${teacherName} no dia ${formattedDate}. Sem crédito, a reserva será cancelada automaticamente.`
        )
        
        if (reservation.series_id) {
          await supabase
            .from('booking_series_notifications')
            .insert({
              series_id: reservation.series_id,
              booking_id: reservation.id,
              user_id: reservation.student_id,
              type: 'REMINDER_7_DAYS',
              message: `Lembrete: você precisa de crédito para a aula do dia ${formattedDate}.`,
              sent_at: new Date().toISOString()
            })
        }
        
        remindersSent++
        console.log(`[ReservationProcessor] 📧 Lembrete enviado para reserva ${reservation.id}`)
      }
    }
    
    return remindersSent
    
  } catch (error) {
    console.error('[ReservationProcessor] Erro ao enviar lembretes:', error)
    return remindersSent
  }
}

/**
 * Classe principal do scheduler de reservas
 */
class ReservationScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  
  /**
   * Inicia o scheduler para rodar diariamente
   * @param hourToRun Hora do dia para executar (0-23), padrão 8 (08:00)
   */
  startDailyScheduler(hourToRun: number = 8): void {
    if (this.intervalId) {
      console.log('[ReservationScheduler] Scheduler já está rodando')
      return
    }
    
    console.log(`[ReservationScheduler] ⏰ Iniciando scheduler diário (execução às ${hourToRun}:00)`)
    
    // Verificar a cada hora se é hora de executar
    this.intervalId = setInterval(async () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Executar apenas na hora configurada (com margem de 5 minutos)
      if (currentHour === hourToRun && currentMinute < 5) {
        await this.runProcessing()
      }
    }, 60 * 60 * 1000) // Verificar a cada hora
    
    // Também executar imediatamente se estiver na hora certa
    const now = new Date()
    if (now.getHours() === hourToRun) {
      this.runProcessing()
    }
  }
  
  /**
   * Inicia o scheduler para rodar a cada X minutos (para testes)
   */
  startIntervalScheduler(intervalMinutes: number = 60): void {
    if (this.intervalId) {
      console.log('[ReservationScheduler] Scheduler já está rodando')
      return
    }
    
    console.log(`[ReservationScheduler] ⏰ Iniciando scheduler de intervalo (a cada ${intervalMinutes} minutos)`)
    
    this.intervalId = setInterval(async () => {
      await this.runProcessing()
    }, intervalMinutes * 60 * 1000)
    
    // Executar uma vez na inicialização
    // this.runProcessing() // Comentado para não executar na inicialização
  }
  
  /**
   * Executa o processamento de reservas
   */
  async runProcessing(): Promise<void> {
    if (this.isRunning) {
      console.log('[ReservationScheduler] Processamento já em andamento, pulando...')
      return
    }
    
    this.isRunning = true
    const startTime = Date.now()
    
    console.log('[ReservationScheduler] 🚀 Iniciando processamento de reservas...')
    
    try {
      // Processar reservas que vencem em 7 dias
      const results = await processReservations()
      
      // Enviar lembretes para reservas que vencem em 8 dias
      const remindersSent = await sendReminders()
      
      const duration = Date.now() - startTime
      
      console.log('[ReservationScheduler] ✅ Processamento concluído!')
      console.log(`  - Processadas: ${results.processed}`)
      console.log(`  - Confirmadas: ${results.confirmed}`)
      console.log(`  - Canceladas: ${results.cancelled}`)
      console.log(`  - Erros: ${results.errors}`)
      console.log(`  - Lembretes enviados: ${remindersSent}`)
      console.log(`  - Duração: ${duration}ms`)
      
    } catch (error) {
      console.error('[ReservationScheduler] ❌ Erro no processamento:', error)
    } finally {
      this.isRunning = false
    }
  }
  
  /**
   * Para o scheduler
   */
  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[ReservationScheduler] ⏹️ Scheduler parado')
    }
  }
  
  /**
   * Executa manualmente (para testes ou chamadas de API)
   */
  async runManually(): Promise<ProcessingResult> {
    console.log('[ReservationScheduler] 🔧 Execução manual iniciada')
    return await processReservations()
  }
}

// Exportar instância singleton
export const reservationScheduler = new ReservationScheduler()

// Exportar funções individuais para uso em endpoints
export { processReservations, sendReminders, getStudentCredits }
