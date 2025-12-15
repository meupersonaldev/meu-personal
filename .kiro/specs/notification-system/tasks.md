# Implementation Plan

## Sistema de Notificações Completo

- [x] 1. Criar tipos e infraestrutura base
  - [x] 1.1 Criar arquivo de tipos de notificação expandido
    - Criar `apps/api/src/types/notification-types.ts` com todos os 50+ tipos
    - Exportar type `NotificationType` e array `notificationTypes`
    - _Requirements: 1.1-1.7, 2.1-2.8, 3.1-3.7, 4.1-4.3, 5.1-5.4, 6.1-6.3, 7.1-7.10, 9.1-9.4, 10.1-10.3, 11.1-11.8_

  - [x] 1.2 Criar NotificationBuilder para mensagens padronizadas
    - Criar `apps/api/src/services/notification-builder.ts`
    - Implementar método `build(type, data)` que retorna título e mensagem formatados
    - Criar templates de mensagem em português para cada tipo
    - _Requirements: 1.1-1.7, 2.1-2.8_

- [x] 2. Implementar NotificationService centralizado
  - [x] 2.1 Criar estrutura base do NotificationService
    - Criar `apps/api/src/services/notification.service.ts`
    - Implementar método privado `createAndPublish()` que persiste e publica via SSE
    - Injetar dependências (supabase, publish)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.2 Write property test for notification persistence (Property 9)
    - **Property 9: Notification Persistence**
    - **Validates: Requirements 8.2, 8.3**

  - [x] 2.3 Implementar métodos de notificação para Professor (Bookings)
    - `notifyTeacherNewBooking()`, `notifyTeacherBookingCancelled()`, `notifyTeacherBookingRescheduled()`
    - `notifyTeacherBookingReminder()`, `notifyTeacherStudentLowCredits()`
    - `notifyTeacherNewStudent()`, `notifyTeacherNewRating()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.4 Write property test for booking creation notifications (Property 1)
    - **Property 1: Booking Creation Notifies Both Parties**
    - **Validates: Requirements 1.1, 2.5**

  - [x] 2.5 Implementar métodos de notificação para Aluno (Bookings)
    - `notifyStudentBookingConfirmed()`, `notifyStudentBookingCancelled()`
    - `notifyStudentBookingReminder()`, `notifyStudentBookingCompleted()`
    - `notifyStudentBookingCreated()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.6 Write property test for booking cancellation notifications (Property 2)
    - **Property 2: Booking Cancellation Notifies Affected Party**
    - **Validates: Requirements 1.2, 2.1**

  - [x] 2.7 Implementar métodos de notificação de Créditos
    - `notifyStudentCreditsDebited()`, `notifyStudentCreditsLow()`
    - `notifyStudentCreditsPurchased()`, `notifyStudentCreditsRefunded()`
    - `notifyStudentCreditsExpiring()`, `notifyStudentCreditsExpired()`, `notifyStudentCreditsZero()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 2.8 Write property test for credit transactions (Property 3 and 4)
    - **Property 3: Credit Transaction Creates Notification**
    - **Property 4: Low Balance Threshold Triggers Alert**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.7**

  - [x] 2.9 Implementar métodos de Check-in
    - `notifyTeacherStudentCheckin()`, `notifyTeacherStudentNoShow()`
    - `notifyFranchiseCheckin()`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.10 Write property test for check-in notifications (Property 5)
    - **Property 5: Check-in Creates Notifications**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 2.11 Implementar métodos de Carteira do Professor
    - `notifyTeacherEarnings()`, `notifyTeacherWithdrawRequested()`
    - `notifyTeacherWithdrawProcessed()`, `notifyTeacherWithdrawAvailable()`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 2.12 Write property test for wallet transactions (Property 10)
    - **Property 10: Wallet Transaction Creates Notification**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 2.13 Implementar métodos de Pagamento
    - `notifyUserPaymentConfirmed()`, `notifyUserPaymentFailed()`, `notifyUserPaymentRefunded()`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.14 Write property test for payment notifications (Property 6)
    - **Property 6: Payment Status Creates Notification**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 2.15 Implementar métodos de Aprovação
    - `notifyFranchiseNewTeacher()`, `notifyFranchiseNewStudent()`
    - `notifyTeacherApproved()`, `notifyTeacherRejected()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.16 Write property test for approval notifications (Property 7 and 8)






    - **Property 7: Approval Status Creates Notification**
    - **Property 8: New Registration Creates Admin Notification**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 2.17 Implementar métodos para Franquia
    - `notifyFranchiseNewBooking()`, `notifyFranchiseBookingCancelled()`
    - `notifyFranchisePaymentReceived()`, `notifyFranchisePaymentFailed()`
    - `notifyFranchiseWithdrawRequest()`, `notifyFranchiseScheduleConflict()`
    - `notifyFranchiseInactiveStudent()`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [x] 2.18 Implementar métodos para Franqueadora
    - `notifyFranqueadoraNewFranchise()`, `notifyFranqueadoraNewLead()`
    - `notifyFranqueadoraPolicyUpdated()`, `notifyFranqueadoraRevenueMilestone()`
    - `notifyFranqueadoraBookingDrop()`, `notifyFranqueadoraTeacherApproved()`
    - `notifyFranqueadoraNegativeReview()`, `notifyFranqueadoraRoyaltyPayment()`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [x] 3. Checkpoint - Verificar NotificationService
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrar notificações nas rotas de Bookings
  - [x] 4.1 Integrar no fluxo de criação de booking
    - Editar `apps/api/src/lib/events.ts` (onBookingCreated)
    - Chamar `notificationService.notifyTeacherNewBooking()` e `notifyStudentBookingCreated()`
    - Chamar `notificationService.notifyFranchiseNewBooking()`
    - _Requirements: 1.1, 2.5, 7.1_

  - [x] 4.2 Integrar no fluxo de cancelamento de booking
    - Editar `apps/api/src/lib/events.ts` (onBookingCancelled)
    - Identificar quem cancelou (aluno ou professor)
    - Chamar método apropriado de notificação
    - Chamar `notificationService.notifyFranchiseBookingCancelled()`
    - _Requirements: 1.2, 2.1, 7.2_

  - [x] 4.3 Integrar no fluxo de reagendamento
    - Editar `apps/api/src/lib/events.ts` (onBookingRescheduled)
    - Chamar `notificationService.notifyTeacherBookingRescheduled()`
    - _Requirements: 1.3_

- [x] 5. Integrar notificações nas rotas de Créditos
  - [x] 5.1 Integrar no fluxo de débito de créditos
    - Editar `apps/api/src/lib/events.ts` (onCreditsDebited)
    - Chamar `notifyStudentCreditsDebited()` após débito
    - Verificar threshold e chamar `notifyStudentCreditsLow()` se necessário
    - Chamar `notifyStudentCreditsZero()` se saldo zerou
    - _Requirements: 3.1, 3.2, 3.7_

  - [x] 5.2 Integrar no fluxo de compra de créditos
    - Editar `apps/api/src/lib/events.ts` (onCreditsPurchased)
    - Chamar `notifyStudentCreditsPurchased()` após confirmação
    - _Requirements: 3.3_

  - [x] 5.3 Integrar no fluxo de estorno
    - Editar `apps/api/src/lib/events.ts` (onCreditsRefunded)
    - Chamar `notifyStudentCreditsRefunded()` após estorno
    - _Requirements: 3.4_

- [x] 6. Integrar notificações nas rotas de Pagamentos
  - [x] 6.1 Integrar nos eventos de pagamento
    - Editar `apps/api/src/lib/events.ts` (onPaymentConfirmed, onPaymentFailed, onPaymentRefunded)
    - Chamar métodos de notificação baseado no status do pagamento
    - Chamar `notifyFranchisePaymentReceived()` ou `notifyFranchisePaymentFailed()`
    - _Requirements: 4.1, 4.2, 4.3, 7.5, 7.6_

- [x] 7. Integrar notificações nas rotas de Check-in
  - [x] 7.1 Integrar no fluxo de check-in
    - Editar `apps/api/src/lib/events.ts` (onCheckinCreated)
    - Chamar `notifyTeacherStudentCheckin()` e `notifyFranchiseCheckin()`
    - _Requirements: 6.1, 6.2, 7.7_

- [x] 8. Integrar notificações nas rotas de Aprovação
  - [x] 8.1 Integrar no fluxo de aprovação de professor
    - Editar `apps/api/src/lib/events.ts` (onTeacherApproved, onTeacherRejected)
    - Chamar `notifyTeacherApproved()` ou `notifyTeacherRejected()`
    - Chamar `notifyFranqueadoraTeacherApproved()` quando aprovado
    - _Requirements: 5.3, 5.4, 11.6_

  - [x] 8.2 Integrar no cadastro de professor/aluno
    - Editar `apps/api/src/lib/events.ts` (onNewTeacherRegistered, onNewStudentRegistered)
    - Chamar `notifyFranchiseNewTeacher()` ou `notifyFranchiseNewStudent()`
    - _Requirements: 5.1, 5.2, 7.3, 7.4_

- [x] 9. Integrar notificações na Carteira do Professor
  - [x] 9.1 Integrar no fluxo de ganhos
    - Editar `apps/api/src/services/booking-canonical.service.ts`
    - Chamar `notifyTeacherEarnings()` quando aula é concluída
    - _Requirements: 9.1_

  - [x] 9.2 Integrar no fluxo de saque
    - Editar `apps/api/src/routes/teachers.ts`
    - Chamar `notifyTeacherWithdrawRequested()` ao solicitar
    - Chamar `notifyFranchiseWithdrawRequest()` para admin aprovar
    - Chamar `notifyTeacherWithdrawProcessed()` quando processado
    - _Requirements: 9.2, 9.3, 7.8_

- [x] 10. Checkpoint - Verificar integrações
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Criar jobs para notificações agendadas
  - [x] 11.1 Criar job de lembrete 24h antes da aula
    - Criar `apps/api/src/jobs/notification-scheduler.ts`
    - Buscar aulas nas próximas 24h e enviar lembretes
    - Chamar `notifyTeacherBookingReminder()` e `notifyStudentBookingReminder()`
    - _Requirements: 1.4, 2.3_

  - [x] 11.2 Criar job de aluno no-show (15 min sem check-in)
    - Verificar aulas que passaram 15 min sem check-in
    - Chamar `notifyTeacherStudentNoShow()`
    - _Requirements: 6.3_

  - [x] 11.3 Criar job de créditos expirando (7 dias)
    - Buscar créditos que expiram em 7 dias
    - Chamar `notifyStudentCreditsExpiring()`
    - _Requirements: 3.5_

  - [x] 11.4 Criar job de créditos expirados
    - Processar créditos expirados e notificar
    - Chamar `notifyStudentCreditsExpired()`
    - _Requirements: 3.6_

  - [x] 11.5 Criar job de aluno inativo (30+ dias)
    - Buscar alunos sem atividade há 30 dias
    - Chamar `notifyFranchiseInactiveStudent()`
    - _Requirements: 7.10_

- [x] 12. Atualizar tipos de notificação na rota existente
  - [x] 12.1 Atualizar `apps/api/src/routes/notifications.ts`
    - Importar novos tipos de `notification-types.ts`
    - Atualizar schema de validação Zod
    - _Requirements: 8.1_

- [x] 13. Checkpoint Final
  - Ensure all tests pass, ask the user if questions arise.
