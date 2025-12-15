/**
 * NotificationBuilder - Construtor de mensagens de notificação padronizadas
 * 
 * Este serviço gera títulos e mensagens formatados em português para cada tipo de notificação.
 * 
 * Requirements: 1.1-1.7, 2.1-2.8
 */

import { NotificationType } from '../types/notification-types'

export interface NotificationData {
  // Booking data
  bookingId?: string
  bookingDate?: Date | string
  bookingTime?: string
  oldDate?: Date | string
  oldTime?: string
  
  // User data
  studentName?: string
  teacherName?: string
  userName?: string
  
  // Academy data
  academyName?: string
  academyId?: string
  
  // Credit data
  amount?: number
  balance?: number
  expirationDate?: Date | string
  threshold?: number
  
  // Payment data
  paymentId?: string
  paymentValue?: number
  paymentDescription?: string
  paymentReason?: string
  
  // Rating data
  rating?: number
  ratingComment?: string
  
  // Approval data
  reason?: string
  
  // Wallet data
  withdrawAmount?: number
  withdrawDeadline?: string
  
  // Franchise data
  franchiseName?: string
  franchiseId?: string
  
  // Franqueadora data
  milestone?: number
  dropPercentage?: number
  daysSinceLastActivity?: number
  
  // Generic
  link?: string
  [key: string]: any
}

export interface NotificationPayload {
  type: NotificationType
  title: string
  message: string
  data: Record<string, any>
  link?: string
}

/**
 * Formata data para exibição em português
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata valor monetário em BRL
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Templates de notificação em português
 */
const notificationTemplates: Record<NotificationType, (data: NotificationData) => { title: string; message: string }> = {
  // ============================================
  // Bookings - Professor (Requirements 1.1-1.7)
  // ============================================
  teacher_new_booking: (data) => ({
    title: 'Nova aula agendada',
    message: `${data.studentName || 'Um aluno'} agendou uma aula para ${formatDate(data.bookingDate)}${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),
  
  teacher_booking_cancelled: (data) => ({
    title: 'Aula cancelada',
    message: `${data.studentName || 'O aluno'} cancelou a aula de ${formatDate(data.bookingDate)}${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),
  
  teacher_booking_rescheduled: (data) => ({
    title: 'Aula reagendada',
    message: `${data.studentName || 'O aluno'} reagendou a aula de ${formatDate(data.oldDate)} para ${formatDate(data.bookingDate)}${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),
  
  teacher_booking_reminder: (data) => ({
    title: 'Lembrete de aula',
    message: `Você tem uma aula com ${data.studentName || 'um aluno'} amanhã${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),
  
  teacher_student_low_credits: (data) => ({
    title: 'Aluno com créditos baixos',
    message: `${data.studentName || 'O aluno'} está com créditos insuficientes para a aula agendada. A aula pode ser cancelada.`
  }),
  
  teacher_new_student: (data) => ({
    title: 'Novo aluno vinculado',
    message: `${data.studentName || 'Um novo aluno'} foi vinculado ao seu perfil.`
  }),
  
  teacher_new_rating: (data) => ({
    title: 'Nova avaliação recebida',
    message: `${data.studentName || 'Um aluno'} avaliou você com ${data.rating || 5} estrelas.${data.ratingComment ? ` "${data.ratingComment}"` : ''}`
  }),

  // ============================================
  // Bookings - Aluno (Requirements 2.1-2.8)
  // ============================================
  student_booking_cancelled: (data) => ({
    title: 'Aula cancelada',
    message: `${data.teacherName || 'O professor'} cancelou a aula de ${formatDate(data.bookingDate)}.${data.reason ? ` Motivo: ${data.reason}` : ''}`
  }),
  
  student_booking_confirmed: (data) => ({
    title: 'Aula confirmada',
    message: `${data.teacherName || 'O professor'} confirmou sua aula de ${formatDate(data.bookingDate)}${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),
  
  student_booking_reminder: (data) => ({
    title: 'Lembrete de aula',
    message: `Você tem uma aula com ${data.teacherName || 'seu professor'} amanhã${data.bookingTime ? ` às ${data.bookingTime}` : ''}${data.academyName ? ` na ${data.academyName}` : ''}.`
  }),
  
  student_booking_completed: (data) => ({
    title: 'Aula concluída',
    message: `Sua aula com ${data.teacherName || 'o professor'} foi concluída. Que tal avaliar?`
  }),
  
  student_booking_created: (data) => ({
    title: 'Agendamento confirmado',
    message: `Sua aula com ${data.teacherName || 'o professor'} foi agendada para ${formatDate(data.bookingDate)}${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),
  
  student_availability_changed: (data) => ({
    title: 'Disponibilidade alterada',
    message: `${data.teacherName || 'O professor'} alterou sua disponibilidade. Verifique se suas aulas foram afetadas.`
  }),
  
  student_credits_needed: (data) => ({
    title: 'Créditos necessários',
    message: `Você precisa comprar créditos para manter seus agendamentos. Saldo atual: ${data.balance || 0} créditos.`
  }),
  
  student_series_expiring: (data) => ({
    title: 'Série expirando',
    message: `Sua série de aulas recorrentes está próxima de expirar. Renove para continuar treinando!`
  }),

  // ============================================
  // Credits - Aluno (Requirements 3.1-3.7)
  // ============================================
  student_credits_debited: (data) => ({
    title: 'Créditos debitados',
    message: `${data.amount || 1} crédito(s) debitado(s) para sua aula. Saldo restante: ${data.balance || 0} créditos.`
  }),
  
  student_credits_low: (data) => ({
    title: 'Saldo baixo',
    message: `Seu saldo está baixo: ${data.balance || 0} créditos. Compre mais para continuar agendando aulas.`
  }),
  
  student_credits_purchased: (data) => ({
    title: 'Créditos adicionados',
    message: `${data.amount || 0} créditos foram adicionados à sua conta. Novo saldo: ${data.balance || 0} créditos.`
  }),
  
  student_credits_refunded: (data) => ({
    title: 'Créditos estornados',
    message: `${data.amount || 0} crédito(s) estornado(s) por cancelamento. Novo saldo: ${data.balance || 0} créditos.`
  }),
  
  student_credits_expiring: (data) => ({
    title: 'Créditos expirando',
    message: `${data.amount || 0} créditos expiram em ${formatDate(data.expirationDate)}. Use-os antes que expirem!`
  }),
  
  student_credits_expired: (data) => ({
    title: 'Créditos expirados',
    message: `${data.amount || 0} créditos expiraram. Compre novos créditos para continuar treinando.`
  }),
  
  student_credits_zero: (data) => ({
    title: 'Saldo zerado',
    message: `Seu saldo de créditos chegou a zero. Compre mais para agendar novas aulas.`
  }),

  // ============================================
  // Payments (Requirements 4.1-4.3)
  // ============================================
  payment_confirmed: (data) => ({
    title: 'Pagamento confirmado',
    message: `Seu pagamento de ${formatCurrency(data.paymentValue)} foi confirmado.${data.paymentDescription ? ` ${data.paymentDescription}` : ''}`
  }),
  
  payment_failed: (data) => ({
    title: 'Pagamento não processado',
    message: `Seu pagamento de ${formatCurrency(data.paymentValue)} não foi processado.${data.paymentReason ? ` Motivo: ${data.paymentReason}` : ''}`
  }),
  
  payment_refunded: (data) => ({
    title: 'Reembolso processado',
    message: `O reembolso de ${formatCurrency(data.paymentValue)} foi processado com sucesso.`
  }),

  // ============================================
  // Approvals (Requirements 5.1-5.4)
  // ============================================
  franchise_new_teacher: (data) => ({
    title: 'Novo professor cadastrado',
    message: `${data.teacherName || 'Um novo professor'} se cadastrou e aguarda aprovação.`
  }),
  
  franchise_new_student: (data) => ({
    title: 'Novo aluno cadastrado',
    message: `${data.studentName || 'Um novo aluno'} se cadastrou na academia.`
  }),
  
  teacher_approved: (data) => ({
    title: 'Cadastro aprovado',
    message: `Parabéns! Seu cadastro foi aprovado${data.academyName ? ` na ${data.academyName}` : ''}. Você já pode receber agendamentos.`
  }),
  
  teacher_rejected: (data) => ({
    title: 'Cadastro não aprovado',
    message: `Seu cadastro não foi aprovado${data.academyName ? ` na ${data.academyName}` : ''}.${data.reason ? ` Motivo: ${data.reason}` : ''}`
  }),

  // ============================================
  // Check-in (Requirements 6.1-6.3)
  // ============================================
  teacher_student_checkin: (data) => ({
    title: 'Aluno fez check-in',
    message: `${data.studentName || 'Seu aluno'} fez check-in e está aguardando a aula.`
  }),
  
  franchise_checkin: (data) => ({
    title: 'Check-in registrado',
    message: `${data.studentName || 'Um aluno'} fez check-in na academia.`
  }),
  
  teacher_student_noshow: (data) => ({
    title: 'Aluno não compareceu',
    message: `${data.studentName || 'O aluno'} não fez check-in para a aula de ${formatDate(data.bookingDate)}${data.bookingTime ? ` às ${data.bookingTime}` : ''}.`
  }),

  // ============================================
  // Franquia - Academia (Requirements 7.1-7.10)
  // ============================================
  franchise_new_booking: (data) => ({
    title: 'Novo agendamento',
    message: `${data.studentName || 'Um aluno'} agendou aula com ${data.teacherName || 'um professor'} para ${formatDate(data.bookingDate)}.`
  }),
  
  franchise_booking_cancelled: (data) => ({
    title: 'Agendamento cancelado',
    message: `Aula de ${data.studentName || 'um aluno'} com ${data.teacherName || 'um professor'} em ${formatDate(data.bookingDate)} foi cancelada.`
  }),
  
  franchise_payment_received: (data) => ({
    title: 'Pagamento recebido',
    message: `Pagamento de ${formatCurrency(data.paymentValue)} recebido de ${data.studentName || data.userName || 'um usuário'}.`
  }),
  
  franchise_payment_failed: (data) => ({
    title: 'Pagamento falhou',
    message: `Pagamento de ${formatCurrency(data.paymentValue)} de ${data.studentName || data.userName || 'um usuário'} não foi processado.`
  }),
  
  franchise_withdraw_request: (data) => ({
    title: 'Solicitação de saque',
    message: `${data.teacherName || 'Um professor'} solicitou saque de ${formatCurrency(data.withdrawAmount)}.`
  }),
  
  franchise_schedule_conflict: (data) => ({
    title: 'Conflito de horários',
    message: `Detectado conflito de horários entre professores. Verifique a agenda.`
  }),
  
  franchise_inactive_student: (data) => ({
    title: 'Aluno inativo',
    message: `${data.studentName || 'Um aluno'} está inativo há ${data.daysSinceLastActivity || 30}+ dias.`
  }),

  // ============================================
  // Wallet - Professor (Requirements 9.1-9.4)
  // ============================================
  teacher_earnings: (data) => ({
    title: 'Valor creditado',
    message: `${formatCurrency(data.amount)} foi creditado na sua carteira pela aula concluída.`
  }),
  
  teacher_withdraw_requested: (data) => ({
    title: 'Saque solicitado',
    message: `Seu saque de ${formatCurrency(data.withdrawAmount)} foi solicitado.${data.withdrawDeadline ? ` Prazo: ${data.withdrawDeadline}` : ''}`
  }),
  
  teacher_withdraw_processed: (data) => ({
    title: 'Saque processado',
    message: `Seu saque de ${formatCurrency(data.withdrawAmount)} foi processado e transferido.`
  }),
  
  teacher_withdraw_available: (data) => ({
    title: 'Saque disponível',
    message: `Você tem ${formatCurrency(data.balance)} disponível para saque na sua carteira.`
  }),

  // ============================================
  // Disponibilidade - Professor (Requirements 10.1-10.3)
  // ============================================
  teacher_availability_updated: (data) => ({
    title: 'Disponibilidade atualizada',
    message: `Sua disponibilidade foi atualizada com sucesso.`
  }),
  
  teacher_availability_conflict: (data) => ({
    title: 'Conflito de disponibilidade',
    message: `Existem agendamentos que conflitam com sua nova disponibilidade. Verifique sua agenda.`
  }),
  
  teacher_blocked_time_impact: (data) => ({
    title: 'Horário bloqueado',
    message: `O horário bloqueado afeta aulas agendadas. Verifique quais aulas precisam ser reagendadas.`
  }),

  // ============================================
  // Franqueadora (Requirements 11.1-11.8)
  // ============================================
  franqueadora_new_franchise: (data) => ({
    title: 'Nova franquia ativada',
    message: `A franquia ${data.franchiseName || ''} foi ativada com sucesso.`
  }),
  
  franqueadora_new_lead: (data) => ({
    title: 'Novo lead cadastrado',
    message: `Um novo lead foi cadastrado no sistema.`
  }),
  
  franqueadora_policy_updated: (data) => ({
    title: 'Políticas atualizadas',
    message: `As políticas foram atualizadas e notificadas às franquias afetadas.`
  }),
  
  franqueadora_revenue_milestone: (data) => ({
    title: 'Meta atingida',
    message: `A franquia ${data.franchiseName || ''} atingiu a meta de ${formatCurrency(data.milestone)}.`
  }),
  
  franqueadora_booking_drop: (data) => ({
    title: 'Queda de agendamentos',
    message: `A franquia ${data.franchiseName || ''} teve queda de ${data.dropPercentage || 0}% nos agendamentos.`
  }),
  
  franqueadora_teacher_approved: (data) => ({
    title: 'Professor aprovado',
    message: `${data.teacherName || 'Um professor'} foi aprovado na franquia ${data.franchiseName || ''}.`
  }),
  
  franqueadora_negative_review: (data) => ({
    title: 'Avaliação negativa',
    message: `Uma avaliação negativa foi registrada na franquia ${data.franchiseName || ''}.`
  }),
  
  franqueadora_royalty_payment: (data) => ({
    title: 'Pagamento de royalties',
    message: `Pagamento de royalties de ${formatCurrency(data.paymentValue)} recebido da franquia ${data.franchiseName || ''}.`
  }),

  // ============================================
  // Legacy types (compatibilidade)
  // ============================================
  new_booking: (data) => ({
    title: 'Novo agendamento',
    message: `Nova aula agendada para ${formatDate(data.bookingDate)}.`
  }),
  
  booking_cancelled: (data) => ({
    title: 'Agendamento cancelado',
    message: `Aula de ${formatDate(data.bookingDate)} foi cancelada.`
  }),
  
  checkin: (data) => ({
    title: 'Check-in realizado',
    message: `${data.studentName || 'Um aluno'} fez check-in.`
  }),
  
  new_student: (data) => ({
    title: 'Novo aluno',
    message: `${data.studentName || 'Um novo aluno'} se cadastrou.`
  }),
  
  payment_received: (data) => ({
    title: 'Pagamento recebido',
    message: `Pagamento de ${formatCurrency(data.paymentValue)} recebido.`
  }),
  
  plan_purchased: (data) => ({
    title: 'Plano adquirido',
    message: `Um plano foi adquirido com sucesso.`
  }),
  
  teacher_approval_needed: (data) => ({
    title: 'Aprovação necessária',
    message: `${data.teacherName || 'Um professor'} aguarda aprovação.`
  }),
  
  student_approval_needed: (data) => ({
    title: 'Aprovação necessária',
    message: `${data.studentName || 'Um aluno'} aguarda aprovação.`
  }),
  
  new_teacher: (data) => ({
    title: 'Novo professor',
    message: `${data.teacherName || 'Um novo professor'} se cadastrou.`
  }),
  
  booking_created: (data) => ({
    title: 'Agendamento criado',
    message: `Aula agendada para ${formatDate(data.bookingDate)}.`
  }),
  
  new_teacher_link: (data) => ({
    title: 'Novo vínculo',
    message: `${data.teacherName || 'Um professor'} foi vinculado.`
  }),
}

/**
 * Constrói uma notificação com título e mensagem formatados
 */
export function buildNotification(type: NotificationType, data: NotificationData): NotificationPayload {
  const template = notificationTemplates[type]
  
  if (!template) {
    return {
      type,
      title: 'Notificação',
      message: 'Você tem uma nova notificação.',
      data: data as Record<string, any>,
      link: data.link
    }
  }
  
  const { title, message } = template(data)
  
  return {
    type,
    title,
    message,
    data: data as Record<string, any>,
    link: data.link
  }
}

/**
 * Classe NotificationBuilder para uso com injeção de dependência
 */
export class NotificationBuilder {
  build(type: NotificationType, data: NotificationData): NotificationPayload {
    return buildNotification(type, data)
  }
}

export default NotificationBuilder
