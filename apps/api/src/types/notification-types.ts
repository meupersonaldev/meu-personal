/**
 * Notification Types - Sistema de Notificações Completo
 * 
 * Este arquivo define todos os tipos de notificação suportados pelo sistema.
 * Cada tipo corresponde a um evento específico que gera notificação para usuários.
 * 
 * Requirements: 1.1-1.7, 2.1-2.8, 3.1-3.7, 4.1-4.3, 5.1-5.4, 6.1-6.3, 7.1-7.10, 9.1-9.4, 10.1-10.3, 11.1-11.8
 */

export const notificationTypes = [
  // ============================================
  // Bookings - Professor (Requirements 1.1-1.7)
  // ============================================
  'teacher_new_booking',           // 1.1 - Aluno cria novo agendamento
  'teacher_booking_cancelled',     // 1.2 - Aluno cancela agendamento
  'teacher_booking_rescheduled',   // 1.3 - Aluno reagenda aula
  'teacher_booking_reminder',      // 1.4 - Lembrete 24h antes da aula
  'teacher_student_low_credits',   // 1.5 - Aluno com créditos insuficientes
  'teacher_new_student',           // 1.6 - Novo aluno vinculado
  'teacher_new_rating',            // 1.7 - Nova avaliação recebida

  // ============================================
  // Bookings - Aluno (Requirements 2.1-2.8)
  // ============================================
  'student_booking_cancelled',     // 2.1 - Professor cancela aula
  'student_booking_confirmed',     // 2.2 - Professor confirma aula
  'student_booking_reminder',      // 2.3 - Lembrete 24h antes da aula
  'student_booking_completed',     // 2.4 - Aula concluída (avaliar professor)
  'student_booking_created',       // 2.5 - Agendamento criado com sucesso
  'student_availability_changed',  // 2.6 - Professor alterou disponibilidade
  'student_credits_needed',        // 2.7 - Precisa comprar créditos
  'student_series_expiring',       // 2.8 - Série recorrente expirando

  // ============================================
  // Credits - Aluno (Requirements 3.1-3.7)
  // ============================================
  'student_credits_debited',       // 3.1 - Créditos debitados para aula
  'student_credits_low',           // 3.2 - Saldo abaixo de 2 aulas
  'student_credits_purchased',     // 3.3 - Compra de créditos confirmada
  'student_credits_refunded',      // 3.4 - Créditos estornados
  'student_credits_expiring',      // 3.5 - Créditos expirando em 7 dias
  'student_credits_expired',       // 3.6 - Créditos expiraram
  'student_credits_zero',          // 3.7 - Saldo zerou

  // ============================================
  // Payments (Requirements 4.1-4.3)
  // ============================================
  'payment_confirmed',             // 4.1 - Pagamento confirmado
  'payment_failed',                // 4.2 - Pagamento falhou
  'payment_refunded',              // 4.3 - Reembolso processado

  // ============================================
  // Approvals (Requirements 5.1-5.4)
  // ============================================
  'franchise_new_teacher',         // 5.1 - Novo professor cadastrado
  'franchise_new_student',         // 5.2 - Novo aluno cadastrado
  'teacher_approved',              // 5.3 - Professor aprovado
  'teacher_rejected',              // 5.4 - Professor rejeitado

  // ============================================
  // Check-in (Requirements 6.1-6.3)
  // ============================================
  'teacher_student_checkin',       // 6.1 - Aluno fez check-in
  'franchise_checkin',             // 6.2 - Check-in registrado (admin)
  'teacher_student_noshow',        // 6.3 - Aluno não fez check-in (15 min)

  // ============================================
  // Franquia - Academia (Requirements 7.1-7.10)
  // ============================================
  'franchise_new_booking',         // 7.1 - Novo agendamento na academia
  'franchise_booking_cancelled',   // 7.2 - Agendamento cancelado
  // 7.3 e 7.4 usam franchise_new_student e franchise_new_teacher
  'franchise_payment_received',    // 7.5 - Pagamento recebido
  'franchise_payment_failed',      // 7.6 - Pagamento falhou
  // 7.7 usa franchise_checkin
  'franchise_withdraw_request',    // 7.8 - Professor solicitou saque
  'franchise_schedule_conflict',   // 7.9 - Conflito de horários
  'franchise_inactive_student',    // 7.10 - Aluno inativo 30+ dias

  // ============================================
  // Wallet - Professor (Requirements 9.1-9.4)
  // ============================================
  'teacher_earnings',              // 9.1 - Valor creditado na carteira
  'teacher_withdraw_requested',    // 9.2 - Saque solicitado
  'teacher_withdraw_processed',    // 9.3 - Saque processado
  'teacher_withdraw_available',    // 9.4 - Saldo disponível para saque

  // ============================================
  // Disponibilidade - Professor (Requirements 10.1-10.3)
  // ============================================
  'teacher_availability_updated',  // 10.1 - Disponibilidade atualizada
  'teacher_availability_conflict', // 10.2 - Conflito com agendamentos
  'teacher_blocked_time_impact',   // 10.3 - Horário bloqueado afeta aulas

  // ============================================
  // Franqueadora (Requirements 11.1-11.8)
  // ============================================
  'franqueadora_new_franchise',    // 11.1 - Nova franquia ativada
  'franqueadora_new_lead',         // 11.2 - Novo lead cadastrado
  'franqueadora_policy_updated',   // 11.3 - Políticas atualizadas
  'franqueadora_revenue_milestone',// 11.4 - Franquia atingiu meta
  'franqueadora_booking_drop',     // 11.5 - Queda de agendamentos
  'franqueadora_teacher_approved', // 11.6 - Professor aprovado
  'franqueadora_negative_review',  // 11.7 - Avaliação negativa
  'franqueadora_royalty_payment',  // 11.8 - Pagamento de royalties

  // ============================================
  // Legacy types (compatibilidade)
  // ============================================
  'new_booking',                   // Legacy: novo agendamento
  'booking_cancelled',             // Legacy: agendamento cancelado
  'checkin',                       // Legacy: check-in
  'new_student',                   // Legacy: novo aluno
  'payment_received',              // Legacy: pagamento recebido
  'plan_purchased',                // Legacy: plano comprado
  'teacher_approval_needed',       // Legacy: aprovação necessária
  'student_approval_needed',       // Legacy: aprovação necessária
  'new_teacher',                   // Legacy: novo professor
  'booking_created',               // Legacy: agendamento criado
  'new_teacher_link',              // Legacy: novo vínculo professor
] as const

export type NotificationType = typeof notificationTypes[number]

/**
 * Categorias de notificação para agrupamento e filtragem
 */
export const notificationCategories = {
  booking: [
    'teacher_new_booking',
    'teacher_booking_cancelled',
    'teacher_booking_rescheduled',
    'teacher_booking_reminder',
    'student_booking_cancelled',
    'student_booking_confirmed',
    'student_booking_reminder',
    'student_booking_completed',
    'student_booking_created',
    'franchise_new_booking',
    'franchise_booking_cancelled',
    'new_booking',
    'booking_cancelled',
    'booking_created',
  ],
  credits: [
    'teacher_student_low_credits',
    'student_credits_debited',
    'student_credits_low',
    'student_credits_purchased',
    'student_credits_refunded',
    'student_credits_expiring',
    'student_credits_expired',
    'student_credits_zero',
    'student_credits_needed',
  ],
  payment: [
    'payment_confirmed',
    'payment_failed',
    'payment_refunded',
    'franchise_payment_received',
    'franchise_payment_failed',
    'payment_received',
    'plan_purchased',
  ],
  checkin: [
    'teacher_student_checkin',
    'franchise_checkin',
    'teacher_student_noshow',
    'checkin',
  ],
  approval: [
    'franchise_new_teacher',
    'franchise_new_student',
    'teacher_approved',
    'teacher_rejected',
    'teacher_approval_needed',
    'student_approval_needed',
    'new_teacher',
    'new_student',
    'new_teacher_link',
  ],
  wallet: [
    'teacher_earnings',
    'teacher_withdraw_requested',
    'teacher_withdraw_processed',
    'teacher_withdraw_available',
    'franchise_withdraw_request',
  ],
  availability: [
    'teacher_availability_updated',
    'teacher_availability_conflict',
    'teacher_blocked_time_impact',
    'student_availability_changed',
    'student_series_expiring',
  ],
  franchise: [
    'franchise_schedule_conflict',
    'franchise_inactive_student',
  ],
  franqueadora: [
    'franqueadora_new_franchise',
    'franqueadora_new_lead',
    'franqueadora_policy_updated',
    'franqueadora_revenue_milestone',
    'franqueadora_booking_drop',
    'franqueadora_teacher_approved',
    'franqueadora_negative_review',
    'franqueadora_royalty_payment',
  ],
} as const

export type NotificationCategory = keyof typeof notificationCategories

/**
 * Verifica se um tipo de notificação é válido
 */
export function isValidNotificationType(type: string): type is NotificationType {
  return notificationTypes.includes(type as NotificationType)
}

/**
 * Retorna a categoria de um tipo de notificação
 */
export function getNotificationCategory(type: NotificationType): NotificationCategory | null {
  for (const [category, types] of Object.entries(notificationCategories)) {
    if ((types as readonly string[]).includes(type)) {
      return category as NotificationCategory
    }
  }
  return null
}
