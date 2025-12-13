# Integração de Políticas - Meu Personal

## Visão Geral

O sistema de políticas permite que a **Franqueadora** defina regras centralizadas que são aplicadas em toda a rede de franquias. As franquias podem ter **overrides** específicos para algumas regras.

## Fluxo de Políticas

```
Franqueadora (define políticas)
    ↓
Franquia (herda políticas + overrides opcionais)
    ↓
Professor (respeita limites de aulas/dia, descanso entre aulas)
    ↓
Aluno (respeita antecedência, dias futuros, cancelamentos)
```

## Campos de Política

| Campo | Descrição | Aplicação |
|-------|-----------|-----------|
| `credits_per_class` | Créditos consumidos por aula | Booking |
| `class_duration_minutes` | Duração padrão da aula | Booking, Time Slots |
| `checkin_tolerance_minutes` | Tolerância para check-in | Check-in |
| `student_min_booking_notice_minutes` | Antecedência mínima para agendar | Booking (aluno) |
| `student_reschedule_min_notice_minutes` | Antecedência mínima para reagendar | Booking (aluno) |
| `late_cancel_threshold_minutes` | Janela de late cancel | Cancelamento |
| `late_cancel_penalty_credits` | Penalidade por late cancel | Cancelamento |
| `no_show_penalty_credits` | Penalidade por no-show | Check-in |
| `teacher_minutes_per_class` | Minutos por aula (professor) | Booking (professor) |
| `teacher_rest_minutes_between_classes` | Descanso entre aulas | Booking (professor) |
| `teacher_max_daily_classes` | Máximo de aulas por dia | Booking (professor) |
| `max_future_booking_days` | Dias máximos para agendar no futuro | Booking |
| `max_cancel_per_month` | Limite de cancelamentos por mês | Cancelamento |

## Serviço de Políticas

O serviço `policyService` (`apps/api/src/services/policy.service.ts`) centraliza a lógica de políticas:

### Métodos Disponíveis

```typescript
// Buscar política efetiva (merge franqueadora + overrides)
const policy = await policyService.getEffectivePolicy(academyId)

// Validar criação de booking
const validation = await policyService.validateBookingCreation({
  academyId,
  startAt,
  studentId
})

// Validar cancelamento
const cancellation = await policyService.validateCancellation({
  academyId,
  bookingStartAt,
  studentId
})

// Validar limite diário do professor
const teacherLimit = await policyService.validateTeacherDailyLimit({
  academyId,
  teacherId,
  date
})
```

## Endpoints de Política

### Franqueadora

- `GET /api/franchisor/policies` - Política vigente
- `GET /api/franchisor/policies?status=draft` - Rascunho
- `PUT /api/franchisor/policies` - Salvar rascunho
- `POST /api/franchisor/policies/publish` - Publicar
- `POST /api/franchisor/policies/rollback` - Reverter versão
- `GET /api/franchisor/policies/history` - Histórico
- `GET /api/franchisor/policies/validate-conflicts` - Validar conflitos

### Academia (Franquia)

- `GET /api/academies/:id/policies-effective` - Política efetiva
- `GET /api/academies/:id/policies-overrides` - Overrides
- `PUT /api/academies/:id/policies-overrides` - Atualizar overrides
- `DELETE /api/academies/:id/policies-overrides/:field` - Remover override

## Validações Implementadas

### Criação de Booking (Aluno)

1. ✅ Antecedência mínima (`student_min_booking_notice_minutes`)
2. ✅ Dias máximos no futuro (`max_future_booking_days`)
3. ✅ Limite de cancelamentos por mês (`max_cancel_per_month`)

### Criação de Booking (Professor)

1. ✅ Limite diário de aulas (`teacher_max_daily_classes`)

### Cancelamento

1. ✅ Limite de cancelamentos por mês (`max_cancel_per_month`)
2. ✅ Late cancel baseado em política (`late_cancel_threshold_minutes`)
3. ✅ Penalidade de late cancel (`late_cancel_penalty_credits`)

### Check-in

1. ✅ Tolerância de check-in (`checkin_tolerance_minutes`)

## Interface de Administração

- `/franqueadora/dashboard/politicas` - Gerenciar políticas
  - Aba "Resumo" - Política vigente
  - Aba "Rascunho" - Editor de política
  - Aba "Unidades" - Overrides por franquia
  - Aba "Histórico" - Versões anteriores

## Notificações

Ao publicar uma política, as franquias podem ser notificadas por email com:
- Versão da política
- Data de vigência
- Campos alterados (comparação com versão anterior)

## Rollback

É possível reverter para versões anteriores da política. O rollback:
- Cria uma nova versão com os valores da versão alvo
- Registra metadados de rollback
- Pode notificar franquias
