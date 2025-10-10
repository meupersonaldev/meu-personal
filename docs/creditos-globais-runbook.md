# Runbook: Créditos Globais e Fluxo de Agendamentos

## Visão Geral
- **Objetivo**: Centralizar o saldo de aulas/horas por franqueadora e padronizar o consumo via endpoints de API.
- **Abrangência**: Aluno possui saldo de aulas; Professor possui saldo de horas. Operações de agendamento bloqueiam/desbloqueiam/consomem conforme o status do booking.

## Tabelas Principais (Postgres)
- **student_class_balance**: saldo agregado do aluno por franqueadora.
  - Campos-chave: `student_id`, `franqueadora_id`, `total_purchased`, `total_consumed`, `locked_qty`.
- **student_class_tx**: transações de aulas do aluno.
  - Tipos: `PURCHASE`, `LOCK`, `UNLOCK`, `CONSUME`, `REFUND`, `REVOKE`.
- **prof_hour_balance**: saldo agregado de horas do professor por franqueadora.
  - Campos-chave: `professor_id`, `franqueadora_id`, `available_hours`, `locked_hours`.
- **hour_tx**: transações de horas do professor.
  - Tipos: `PURCHASE`, `BONUS_LOCK`, `BONUS_UNLOCK`, `CONSUME`, `REFUND`, `REVOKE`.

## Serviços
- **Arquivo**: `apps/api/src/services/balance.service.ts`
  - Aluno: `getStudentBalance`, `purchaseStudentClasses`, `lockStudentClasses`, `unlockStudentClasses`, `consumeStudentClasses`.
  - Professor: `getProfessorBalance`, `purchaseProfessorHours`, `lockProfessorHours`, `unlockProfessorHours`, `consumeProfessorHours`.

## Fluxo Canônico de Booking
- **Arquivos**: `apps/api/src/services/booking-canonical.service.ts`, `apps/api/src/routes/bookings.ts`.
- **Status**: `RESERVED` → `PAID` → `DONE`/`CANCELED`.
- **Efeitos**:
  - Criar (aluno-led/professor-led): `LOCK` 1 aula do aluno e `BONUS_LOCK` 1 hora do professor (cancellable_until).
  - Cancelar: `UNLOCK` aula e `BONUS_UNLOCK` hora.
  - Confirmar pagamento (`PAID`): mantém locks.
  - Concluir (`DONE`): `CONSUME` aula e `CONSUME` hora (reduz também locks remanescentes).

## Resolução de Franqueadora/Unidade
- **Arquivo**: `apps/api/src/routes/packages.ts` (`resolveFranqueadoraId`).
  - Ordem: `franqueadora_id` explícito → derivado por `unit_id` (via `academies`/`units`) → fallback `DEFAULT_FRANQUEADORA_ID`.

## Endpoints Principais (Backend)
- Catálogo (aluno): `GET /api/packages/student`
- Saldo (aluno): `GET /api/packages/student/balance`
- Transações (aluno): `GET /api/packages/student/transactions`
- Checkout (aluno): `POST /api/packages/student/checkout`
- Booking:
  - Listar: `GET /api/bookings` (filtros: `unit_id`, `teacher_id`, `student_id`, `status`, `from`, `to`)
  - Criar: `POST /api/bookings` (body: `source`, `studentId?`, `professorId`, `unitId`, `startAt`, `endAt`, `...notes`)
  - Atualizar status: `PATCH /api/bookings/:id` (`PAID`/`DONE`/`CANCELED`)
  - Cancelar: `DELETE /api/bookings/:id`

### Exemplos de Request (curl)
```bash
# Saldo do aluno (requer Bearer token)
curl -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/packages/student/balance?unit_id=$UNIT_ID"

# Criar booking aluno-led
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "source":"ALUNO",
    "professorId":"<TEACHER_ID>",
    "unitId":"<UNIT_ID>",
    "startAt":"2025-10-11T10:00:00.000Z",
    "endAt":"2025-10-11T11:00:00.000Z"
  }' \
  "$API_URL/api/bookings"

# Cancelar booking
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/bookings/$BOOKING_ID"
```

## Frontend (Next.js)
- **Base de API**: `apps/web/lib/api.ts` expõe `API_BASE_URL` a partir de `NEXT_PUBLIC_API_URL`.
- **Auth**: `apps/web/lib/stores/auth-store.ts`
  - Armazena `user`/`token` (Zustand + persist) e gerencia cookie `auth-token`.
  - O front deve obter saldo via endpoint global e não usar `user.credits`.
- **Padrões**:
  - Evitar hardcodes de URL; sempre importar `API_BASE_URL`.
  - Usar Bearer token nas chamadas autenticadas.

## Variáveis de Ambiente
- **Backend (`apps/api/.env`)**:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `DEFAULT_FRANQUEADORA_ID`
  - `FRONTEND_URL`, `CORS_ORIGINS`
- **Frontend (`apps/web/.env.local`)**:
  - `NEXT_PUBLIC_API_URL`

## Teste Rápido (Checklist)
- [ ] Login aluno e obter token
- [ ] `GET /api/packages/student/balance` (verificar `available_classes`)
- [ ] `POST /api/bookings` (futuro +60m)
- [ ] `GET /api/packages/student/balance` (espera `locked_qty` ↑)
- [ ] `DELETE /api/bookings/:id` (espera `locked_qty` ↓)

## Troubleshooting
- **Saldo não muda ao criar/cancelar**: ver `booking-canonical.service.ts` (locks) e logs do endpoint `bookings`.
- **`franqueadora_id` ausente**: checar `resolveFranqueadoraId` e se `unit_id`/`academies` estão consistentes.
- **CORS/URL**: confirmar `FRONTEND_URL`/`CORS_ORIGINS` (API) e `NEXT_PUBLIC_API_URL` (web).

## Roadmap Curto
- Testes de integração para `balance.service.ts` e `bookings`.
- Remover incoerências legadas e consolidar métricas de saldo no dashboard.
- Reativar gradualmente regras de lint estritas por diretório após tiparmos `any` críticos.
