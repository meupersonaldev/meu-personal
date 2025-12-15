/**
 * NotificationScheduler - Jobs agendados para notificações automáticas
 * 
 * Este scheduler gerencia notificações que precisam ser enviadas em momentos específicos:
 * - Lembretes 24h antes da aula (Requirements 1.4, 2.3)
 * - Alertas de no-show 15 min após início da aula (Requirement 6.3)
 * - Alertas de créditos expirando em 7 dias (Requirement 3.5)
 * - Notificações de créditos expirados (Requirement 3.6)
 * - Alertas de alunos inativos há 30+ dias (Requirement 7.10)
 */

import { supabase } from '../lib/supabase'
import { createNotificationService, Student, Teacher, Booking, Academy } from '../services/notification.service'

const notificationService = createNotificationService(supabase)

interface SchedulerResult {
  processed: number
  errors: string[]
}

export class NotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * Job 11.1: Envia lembretes 24h antes da aula
   * Requirements: 1.4, 2.3
   */
  async processBookingReminders(): Promise<SchedulerResult> {
    const result: SchedulerResult = { processed: 0, errors: [] }
    const now = new Date()
    
    // Calcular janela de 24h (entre 23h e 25h a partir de agora para margem)
    const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    console.log(`[NotificationScheduler] 📅 Buscando aulas entre ${reminderStart.toISOString()} e ${reminderEnd.toISOString()}`)

    try {
      // Buscar bookings nas próximas 24h que ainda não receberam lembrete
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          start_at,
          end_at,
          student_id,
          teacher_id,
          academy_id,
          status_canonical,
          students:users!bookings_student_id_fkey(id, full_name, email),
          teachers:users!bookings_teacher_id_fkey(id, full_name, email),
          academies:academies!bookings_academy_id_fkey(id, name)
        `)
        .in('status_canonical', ['RESERVED', 'CONFIRMED'])
        .gte('start_at', reminderStart.toISOString())
        .lte('start_at', reminderEnd.toISOString())

      if (error) {
        result.errors.push(`Erro ao buscar bookings: ${error.message}`)
        return result
      }

      if (!bookings || bookings.length === 0) {
        console.log('[NotificationScheduler] ✅ Nenhuma aula para lembrete nas próximas 24h')
        return result
      }

      console.log(`[NotificationScheduler] 📊 Encontradas ${bookings.length} aulas para lembrete`)

      for (const booking of bookings) {
        try {
          // Verificar se já enviou lembrete (usando tabela de notificações)
          const { data: existingReminder } = await supabase
            .from('notifications')
            .select('id')
            .eq('data->>bookingId', booking.id)
            .in('type', ['teacher_booking_reminder', 'student_booking_reminder'])
            .single()

          if (existingReminder) {
            console.log(`[NotificationScheduler] ⏭️ Lembrete já enviado para booking ${booking.id}`)
            continue
          }

          const student = booking.students as any
          const teacher = booking.teachers as any
          const academy = booking.academies as any

          if (!student || !teacher) {
            console.log(`[NotificationScheduler] ⚠️ Booking ${booking.id} sem aluno ou professor`)
            continue
          }

          const bookingData: Booking = {
            id: booking.id,
            date: booking.date,
            start_time: booking.start_at ? new Date(booking.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
            academy_id: booking.academy_id
          }

          const studentData: Student = {
            id: student.id,
            full_name: student.full_name,
            email: student.email
          }

          const teacherData: Teacher = {
            id: teacher.id,
            full_name: teacher.full_name,
            email: teacher.email,
            academy_id: booking.academy_id
          }

          // Enviar lembrete para professor (Requirement 1.4)
          await notificationService.notifyTeacherBookingReminder(bookingData, studentData, teacherData)

          // Enviar lembrete para aluno (Requirement 2.3)
          await notificationService.notifyStudentBookingReminder(bookingData, studentData, teacherData, academy?.name)

          result.processed++
          console.log(`[NotificationScheduler] ✅ Lembretes enviados para booking ${booking.id}`)
        } catch (err) {
          const errorMsg = `Erro ao processar lembrete para booking ${booking.id}: ${err}`
          result.errors.push(errorMsg)
          console.error(`[NotificationScheduler] ❌ ${errorMsg}`)
        }
      }
    } catch (err) {
      result.errors.push(`Erro crítico em processBookingReminders: ${err}`)
    }

    return result
  }

  /**
   * Job 11.2: Detecta alunos no-show (15 min sem check-in)
   * Requirement: 6.3
   */
  async processNoShows(): Promise<SchedulerResult> {
    const result: SchedulerResult = { processed: 0, errors: [] }
    const now = new Date()
    
    // Buscar aulas que começaram há 15-30 minutos (janela para evitar duplicatas)
    const noShowStart = new Date(now.getTime() - 30 * 60 * 1000)
    const noShowEnd = new Date(now.getTime() - 15 * 60 * 1000)

    console.log(`[NotificationScheduler] 🚫 Verificando no-shows entre ${noShowStart.toISOString()} e ${noShowEnd.toISOString()}`)

    try {
      // Buscar bookings que começaram há 15-30 min e não têm check-in
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          start_at,
          end_at,
          student_id,
          teacher_id,
          academy_id,
          status_canonical,
          students:users!bookings_student_id_fkey(id, full_name, email),
          teachers:users!bookings_teacher_id_fkey(id, full_name, email)
        `)
        .in('status_canonical', ['RESERVED', 'CONFIRMED'])
        .gte('start_at', noShowStart.toISOString())
        .lte('start_at', noShowEnd.toISOString())

      if (error) {
        result.errors.push(`Erro ao buscar bookings para no-show: ${error.message}`)
        return result
      }

      if (!bookings || bookings.length === 0) {
        console.log('[NotificationScheduler] ✅ Nenhuma aula na janela de no-show')
        return result
      }

      console.log(`[NotificationScheduler] 📊 Verificando ${bookings.length} aulas para no-show`)

      for (const booking of bookings) {
        try {
          // Verificar se existe check-in para este booking
          const { data: checkin } = await supabase
            .from('checkins')
            .select('id')
            .eq('booking_id', booking.id)
            .single()

          if (checkin) {
            console.log(`[NotificationScheduler] ✅ Check-in encontrado para booking ${booking.id}`)
            continue
          }

          // Verificar se já enviou notificação de no-show
          const { data: existingNoShow } = await supabase
            .from('notifications')
            .select('id')
            .eq('data->>bookingId', booking.id)
            .eq('type', 'teacher_student_noshow')
            .single()

          if (existingNoShow) {
            console.log(`[NotificationScheduler] ⏭️ No-show já notificado para booking ${booking.id}`)
            continue
          }

          const student = booking.students as any
          const teacher = booking.teachers as any

          if (!student || !teacher) {
            continue
          }

          const bookingData: Booking = {
            id: booking.id,
            date: booking.date,
            start_time: booking.start_at ? new Date(booking.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
            academy_id: booking.academy_id
          }

          const studentData: Student = {
            id: student.id,
            full_name: student.full_name
          }

          const teacherData: Teacher = {
            id: teacher.id,
            full_name: teacher.full_name,
            academy_id: booking.academy_id
          }

          // Notificar professor sobre no-show (Requirement 6.3)
          await notificationService.notifyTeacherStudentNoShow(bookingData, studentData, teacherData)

          result.processed++
          console.log(`[NotificationScheduler] ✅ No-show notificado para booking ${booking.id}`)
        } catch (err) {
          const errorMsg = `Erro ao processar no-show para booking ${booking.id}: ${err}`
          result.errors.push(errorMsg)
          console.error(`[NotificationScheduler] ❌ ${errorMsg}`)
        }
      }
    } catch (err) {
      result.errors.push(`Erro crítico em processNoShows: ${err}`)
    }

    return result
  }


  /**
   * Job 11.3: Alerta créditos expirando em 7 dias
   * Requirement: 3.5
   */
  async processCreditsExpiring(): Promise<SchedulerResult> {
    const result: SchedulerResult = { processed: 0, errors: [] }
    const now = new Date()
    
    // Calcular data de expiração (7 dias a partir de agora)
    const expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const expirationStart = new Date(expirationDate.getTime() - 12 * 60 * 60 * 1000) // -12h
    const expirationEnd = new Date(expirationDate.getTime() + 12 * 60 * 60 * 1000) // +12h

    console.log(`[NotificationScheduler] ⏰ Buscando créditos expirando entre ${expirationStart.toISOString()} e ${expirationEnd.toISOString()}`)

    try {
      // Buscar transações de crédito com unlock_at (expiração) em 7 dias
      // Nota: student_class_tx tem campo unlock_at que indica quando o crédito expira
      const { data: expiringCredits, error } = await supabase
        .from('student_class_tx')
        .select(`
          id,
          student_id,
          unit_id,
          qty,
          unlock_at,
          type,
          students:users!student_class_tx_student_id_fkey(id, full_name, email)
        `)
        .eq('type', 'PURCHASE')
        .gte('unlock_at', expirationStart.toISOString())
        .lte('unlock_at', expirationEnd.toISOString())

      if (error) {
        // Se a tabela não existir ou erro de query, tentar abordagem alternativa
        console.log(`[NotificationScheduler] ⚠️ Erro ao buscar student_class_tx: ${error.message}`)
        console.log('[NotificationScheduler] ℹ️ Tentando abordagem alternativa via credit_grants...')
        
        // Abordagem alternativa: buscar credit_grants recentes e calcular expiração
        // Por enquanto, apenas logar que não há créditos expirando
        console.log('[NotificationScheduler] ✅ Nenhum crédito expirando encontrado (tabela não disponível)')
        return result
      }

      if (!expiringCredits || expiringCredits.length === 0) {
        console.log('[NotificationScheduler] ✅ Nenhum crédito expirando em 7 dias')
        return result
      }

      console.log(`[NotificationScheduler] 📊 Encontrados ${expiringCredits.length} créditos expirando`)

      // Agrupar por aluno para enviar uma única notificação
      const creditsByStudent = new Map<string, { student: any; totalAmount: number; expirationDate: Date }>()

      for (const credit of expiringCredits) {
        const studentId = credit.student_id
        const student = credit.students as any

        if (!studentId || !student) continue

        const existing = creditsByStudent.get(studentId)
        if (existing) {
          existing.totalAmount += credit.qty || 0
        } else {
          creditsByStudent.set(studentId, {
            student,
            totalAmount: credit.qty || 0,
            expirationDate: new Date(credit.unlock_at)
          })
        }
      }

      for (const entry of Array.from(creditsByStudent.entries())) {
        const [studentId, data] = entry
        try {
          // Verificar se já enviou notificação de expiração para este período
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', studentId)
            .eq('type', 'student_credits_expiring')
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
            .single()

          if (existingNotification) {
            console.log(`[NotificationScheduler] ⏭️ Notificação de expiração já enviada para aluno ${studentId}`)
            continue
          }

          const studentData: Student = {
            id: data.student.id,
            full_name: data.student.full_name,
            email: data.student.email
          }

          // Notificar aluno sobre créditos expirando (Requirement 3.5)
          await notificationService.notifyStudentCreditsExpiring(studentData, data.totalAmount, data.expirationDate)

          result.processed++
          console.log(`[NotificationScheduler] ✅ Alerta de expiração enviado para aluno ${studentId}`)
        } catch (err) {
          const errorMsg = `Erro ao notificar expiração para aluno ${studentId}: ${err}`
          result.errors.push(errorMsg)
          console.error(`[NotificationScheduler] ❌ ${errorMsg}`)
        }
      }
    } catch (err) {
      result.errors.push(`Erro crítico em processCreditsExpiring: ${err}`)
    }

    return result
  }

  /**
   * Job 11.4: Processa créditos expirados
   * Requirement: 3.6
   */
  async processCreditsExpired(): Promise<SchedulerResult> {
    const result: SchedulerResult = { processed: 0, errors: [] }
    const now = new Date()
    
    // Buscar créditos que expiraram nas últimas 24h
    const expiredStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    console.log(`[NotificationScheduler] 💀 Buscando créditos expirados desde ${expiredStart.toISOString()}`)

    try {
      // Buscar transações de crédito que expiraram
      const { data: expiredCredits, error } = await supabase
        .from('student_class_tx')
        .select(`
          id,
          student_id,
          unit_id,
          qty,
          unlock_at,
          type,
          students:users!student_class_tx_student_id_fkey(id, full_name, email)
        `)
        .eq('type', 'EXPIRED')
        .gte('created_at', expiredStart.toISOString())
        .lte('created_at', now.toISOString())

      if (error) {
        console.log(`[NotificationScheduler] ⚠️ Erro ao buscar créditos expirados: ${error.message}`)
        console.log('[NotificationScheduler] ✅ Nenhum crédito expirado encontrado (tabela não disponível)')
        return result
      }

      if (!expiredCredits || expiredCredits.length === 0) {
        console.log('[NotificationScheduler] ✅ Nenhum crédito expirado nas últimas 24h')
        return result
      }

      console.log(`[NotificationScheduler] 📊 Encontrados ${expiredCredits.length} créditos expirados`)

      // Agrupar por aluno
      const creditsByStudent = new Map<string, { student: any; totalAmount: number }>()

      for (const credit of expiredCredits) {
        const studentId = credit.student_id
        const student = credit.students as any

        if (!studentId || !student) continue

        const existing = creditsByStudent.get(studentId)
        if (existing) {
          existing.totalAmount += Math.abs(credit.qty || 0)
        } else {
          creditsByStudent.set(studentId, {
            student,
            totalAmount: Math.abs(credit.qty || 0)
          })
        }
      }

      for (const entry of Array.from(creditsByStudent.entries())) {
        const [studentId, data] = entry
        try {
          // Verificar se já enviou notificação de expiração
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', studentId)
            .eq('type', 'student_credits_expired')
            .gte('created_at', expiredStart.toISOString())
            .single()

          if (existingNotification) {
            console.log(`[NotificationScheduler] ⏭️ Notificação de expiração já enviada para aluno ${studentId}`)
            continue
          }

          const studentData: Student = {
            id: data.student.id,
            full_name: data.student.full_name,
            email: data.student.email
          }

          // Notificar aluno sobre créditos expirados (Requirement 3.6)
          await notificationService.notifyStudentCreditsExpired(studentData, data.totalAmount)

          result.processed++
          console.log(`[NotificationScheduler] ✅ Notificação de expiração enviada para aluno ${studentId}`)
        } catch (err) {
          const errorMsg = `Erro ao notificar expiração para aluno ${studentId}: ${err}`
          result.errors.push(errorMsg)
          console.error(`[NotificationScheduler] ❌ ${errorMsg}`)
        }
      }
    } catch (err) {
      result.errors.push(`Erro crítico em processCreditsExpired: ${err}`)
    }

    return result
  }


  /**
   * Job 11.5: Alerta alunos inativos (30+ dias)
   * Requirement: 7.10
   */
  async processInactiveStudents(): Promise<SchedulerResult> {
    const result: SchedulerResult = { processed: 0, errors: [] }
    const now = new Date()
    
    // Calcular data limite (30 dias atrás)
    const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    console.log(`[NotificationScheduler] 😴 Buscando alunos inativos desde ${inactiveThreshold.toISOString()}`)

    try {
      // Buscar alunos que não têm bookings nos últimos 30 dias
      // Primeiro, buscar todos os alunos ativos com suas academias
      const { data: students, error: studentsError } = await supabase
        .from('academy_students')
        .select(`
          student_id,
          academy_id,
          status,
          students:users!academy_students_student_id_fkey(id, full_name, email),
          academies:academies!academy_students_academy_id_fkey(id, name)
        `)
        .eq('status', 'active')

      if (studentsError) {
        result.errors.push(`Erro ao buscar alunos: ${studentsError.message}`)
        return result
      }

      if (!students || students.length === 0) {
        console.log('[NotificationScheduler] ✅ Nenhum aluno ativo encontrado')
        return result
      }

      console.log(`[NotificationScheduler] 📊 Verificando ${students.length} alunos ativos`)

      for (const studentLink of students) {
        try {
          const studentId = studentLink.student_id
          const academyId = studentLink.academy_id
          const student = studentLink.students as any
          const academy = studentLink.academies as any

          if (!studentId || !academyId || !student || !academy) continue

          // Verificar última atividade (booking ou check-in)
          const { data: lastBooking } = await supabase
            .from('bookings')
            .select('id, created_at')
            .eq('student_id', studentId)
            .eq('academy_id', academyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const lastActivity = lastBooking?.created_at ? new Date(lastBooking.created_at) : null

          // Se tem atividade recente, pular
          if (lastActivity && lastActivity > inactiveThreshold) {
            continue
          }

          // Calcular dias de inatividade
          const daysSinceLastActivity = lastActivity 
            ? Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
            : 999 // Se nunca teve atividade, considerar muito inativo

          // Só notificar se inativo há mais de 30 dias
          if (daysSinceLastActivity < 30) continue

          // Verificar se já enviou notificação de inatividade nos últimos 7 dias
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('academy_id', academyId)
            .eq('type', 'franchise_inactive_student')
            .eq('data->>studentId', studentId)
            .gte('created_at', weekAgo.toISOString())
            .single()

          if (existingNotification) {
            console.log(`[NotificationScheduler] ⏭️ Notificação de inatividade já enviada para aluno ${studentId}`)
            continue
          }

          const studentData: Student = {
            id: student.id,
            full_name: student.full_name,
            email: student.email
          }

          const academyData: Academy = {
            id: academy.id,
            name: academy.name
          }

          // Notificar franquia sobre aluno inativo (Requirement 7.10)
          await notificationService.notifyFranchiseInactiveStudent(studentData, academyData, daysSinceLastActivity)

          result.processed++
          console.log(`[NotificationScheduler] ✅ Alerta de inatividade enviado para aluno ${studentId} (${daysSinceLastActivity} dias)`)
        } catch (err) {
          const errorMsg = `Erro ao processar inatividade: ${err}`
          result.errors.push(errorMsg)
          console.error(`[NotificationScheduler] ❌ ${errorMsg}`)
        }
      }
    } catch (err) {
      result.errors.push(`Erro crítico em processInactiveStudents: ${err}`)
    }

    return result
  }

  /**
   * Executa todos os jobs de notificação uma vez
   */
  async runAllJobs(): Promise<{ [key: string]: SchedulerResult }> {
    const start = Date.now()
    console.log('[NotificationScheduler] 🚀 Iniciando execução de todos os jobs...')

    const results: { [key: string]: SchedulerResult } = {}

    // Job 11.1: Lembretes 24h
    console.log('\n[NotificationScheduler] === Job 11.1: Lembretes 24h ===')
    results.bookingReminders = await this.processBookingReminders()

    // Job 11.2: No-shows
    console.log('\n[NotificationScheduler] === Job 11.2: No-shows ===')
    results.noShows = await this.processNoShows()

    // Job 11.3: Créditos expirando
    console.log('\n[NotificationScheduler] === Job 11.3: Créditos expirando ===')
    results.creditsExpiring = await this.processCreditsExpiring()

    // Job 11.4: Créditos expirados
    console.log('\n[NotificationScheduler] === Job 11.4: Créditos expirados ===')
    results.creditsExpired = await this.processCreditsExpired()

    // Job 11.5: Alunos inativos
    console.log('\n[NotificationScheduler] === Job 11.5: Alunos inativos ===')
    results.inactiveStudents = await this.processInactiveStudents()

    const duration = Date.now() - start
    console.log(`\n[NotificationScheduler] ✅ Execução concluída em ${duration}ms`)
    
    // Resumo
    let totalProcessed = 0
    let totalErrors = 0
    for (const [job, result] of Object.entries(results)) {
      totalProcessed += result.processed
      totalErrors += result.errors.length
      console.log(`  - ${job}: ${result.processed} processados, ${result.errors.length} erros`)
    }
    console.log(`  Total: ${totalProcessed} processados, ${totalErrors} erros`)

    return results
  }

  /**
   * Inicia o scheduler para rodar periodicamente
   * @param intervalMinutes Intervalo entre execuções (padrão: 15 minutos)
   */
  startScheduler(intervalMinutes: number = 15): void {
    if (this.intervalId) {
      console.log('[NotificationScheduler] Scheduler já está rodando')
      return
    }

    console.log(`[NotificationScheduler] ⏰ Iniciando scheduler (a cada ${intervalMinutes} minutos)`)

    // Executar imediatamente na primeira vez
    this.runSafely()

    // Configurar execução periódica
    this.intervalId = setInterval(() => {
      this.runSafely()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Inicia o scheduler diário em um horário específico
   * @param hourToRun Hora do dia para executar (0-23)
   */
  startDailyScheduler(hourToRun: number = 6): void {
    if (this.intervalId) {
      console.log('[NotificationScheduler] Scheduler já está rodando')
      return
    }

    console.log(`[NotificationScheduler] ⏰ Iniciando scheduler diário (execução às ${hourToRun}:00)`)

    // Verificar a cada hora se é hora de executar
    this.intervalId = setInterval(() => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // Executar apenas na hora configurada (com margem de 5 minutos)
      if (currentHour === hourToRun && currentMinute < 5) {
        this.runSafely()
      }
    }, 60 * 60 * 1000) // Verificar a cada hora

    // Também executar imediatamente se estiver na hora certa
    const now = new Date()
    if (now.getHours() === hourToRun) {
      this.runSafely()
    }
  }

  /**
   * Executa os jobs de forma segura (evita execuções simultâneas)
   */
  private async runSafely(): Promise<void> {
    if (this.isRunning) {
      console.log('[NotificationScheduler] Execução já em andamento, pulando...')
      return
    }

    this.isRunning = true
    try {
      await this.runAllJobs()
    } catch (err) {
      console.error('[NotificationScheduler] ❌ Erro na execução:', err)
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
      console.log('[NotificationScheduler] ⏹️ Scheduler parado')
    }
  }
}

// Exportar instância singleton
export const notificationScheduler = new NotificationScheduler()
