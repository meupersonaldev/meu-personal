# Plano de Melhorias e Referências Rápidas

## Fluxo de Agendamento (frontend → API → tabelas) e pontos de falha
- **Disponibilidade (professor)**: `apps/web/app/professor/disponibilidade/page.tsx` chama `POST /api/bookings/availability` → `bookingCanonicalService.createProfessorLedBooking` grava em `public.bookings` com `status_canonical=AVAILABLE`, `teacher_id`, `franchise_id`, `start_at/end_at`, `cancellable_until`.  
  - *Falha*: não há deduplicação (mesmo horário pode ser criado várias vezes) e não valida `capacity_per_slot` da unidade.
- **Listagem de disponibilidade**: `GET /api/time-slots?academy_id` lê `public.academy_time_slots`; `GET /api/bookings?teacher_id` retorna slots e o front filtra `AVAILABLE` por academia.  
  - *Falha*: comparação por ISO+timezone pode divergir (segundos/dst) e o filtro acontece só no cliente.
- **Reserva aluno-led**: `POST /api/bookings` com `source=ALUNO, bookingId` → `updateBookingToStudent` verifica slot livre, atualiza para `status_canonical=PAID`, seta `student_id`, grava `cancellable_until`, consome 1 crédito (`student_class_tx`, `student_class_balance`, `users.credits`), credita 1h ao professor (`prof_hour_balance`, `hour_tx`).  
  - *Falha*: se `academies.franqueadora_id` estiver vazio, falha geral; não há checagem de capacidade da unidade no slot existente.
- **Reserva direta sem slot prévio**: mesmo endpoint, `createStudentLedBooking` cria booking já `PAID` se não achar `AVAILABLE`.  
  - *Falha*: pode burlar janela de criação/limite de capacidade; overbooking.
- **Agendamento professor-led para aluno**: `createProfessorLedBooking` com `studentId` debita horas do professor, valida `units.capacity_per_slot` e cria booking. Aluno não consome crédito aqui.  
  - *Falha*: se falhar depois do débito, não há transação; risco de saldo inconsistido.
- **Cancelamento**: `PATCH /api/bookings/:id` (`status=CANCELED`) ou `DELETE /api/bookings/:id`. `cancelBooking` estorna crédito do aluno e revoga hora do professor se até 4h antes; também reabre o slot (`status_canonical=AVAILABLE`, `student_id=null`).  
  - *Falha*: reabre mesmo após cutoff ou perto do horário, permitindo nova reserva tardia; deletar disponibilidade não checa bloqueios.
- **Bloqueios**: `POST /api/teachers/{id}/blocks/custom` (tela de disponibilidade) cria bloqueios por hora/dia.  
  - *Falha*: pode divergir da disponibilidade já criada (bloqueio depois do slot exige remoção manual).

### Ações sugeridas para agendamento
1) Adicionar unique lógico (teacher_id + franchise_id + start_at) ou checagem manual antes de inserir disponibilidade.  
2) Validar `capacity_per_slot` ao criar disponibilidade e ao reservar; impedir criação se slot exceder.  
3) Normalizar timezone (persistir e comparar sempre em UTC puro) e evitar `toLocaleTimeString` no front para chavear slots.  
4) Cancelamento após cutoff não deve reabrir o slot; apenas marcar `CANCELED` sem liberar.  
5) Encapsular operações de débito/crédito em transações (Postgres/RPC) ou compensações claras em caso de erro.  
6) Bloqueios devem invalidar/limpar `bookings AVAILABLE` que colidam (job ou verificação na criação).

## Segurança (CORS/JWT/Supabase/planes RLS)
- **CORS**: `apps/api/src/server.ts` usa allowlist de `CORS_ORIGINS`/`FRONTEND_URL`, mas em dev qualquer localhost passa.  
  - *Melhorias*: separar configs por ambiente, logar origem bloqueada com nível warning, adicionar testes automatizados de CORS.
- **JWT**: tokens validados no middleware `requireAuth`; `JWT_SECRET` vem do `.env`.  
  - *Melhorias*: rotação periódica, expiração curta em prod (e refresh controlado), adicionar `aud/iss` e checar `sub`.
- **Supabase service role**: API usa service role (poder total). RLS está permissivo (políticas allow-all).  
  - *Plano RLS*: (1) mapear claims do JWT (user_id, role, franchise_id), (2) criar policies de leitura/escrita mínimas para `bookings`, `students`, `teachers`, (3) revisar buckets de storage, (4) remover `p_select_all` etc. após migrar chamadas diretas do front para a API.
- **Headers/Helmet**: CSP atual não inclui `connectSrc` para Supabase/Asaas em produção (hoje `"self"`).  
  - *Melhorias*: parametrizar CSP por ambiente/domínios externos (Supabase, Asaas, CDN). Habilitar `referrerPolicy`, `permissionsPolicy` para câmera/geo se não usados.
- **Rate limiting**: existe `authRateLimit` e `apiRateLimit`, mas não há proteção por rota sensível de pagamentos/webhooks.  
  - *Melhorias*: rate limit mais restrito em `/api/bookings`, `/api/payments`, `/api/webhooks`.
- **Logging**: muitos logs com dados sensíveis (ASAAS_API_KEY masked parcialmente).  
  - *Melhorias*: remover prefix/length em produção; mascarar emails/cpf nos logs; centralizar logger com níveis.

## Checklist de setup (local e produção)
- **Requisitos**: Node 18+, npm, Supabase project ativo, Redis (opcional se precisar de cache/filas).  
- **Front (.env.local)**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.  
- **API (.env)**: `PORT`, `FRONTEND_URL`(lista, vírgula), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DEFAULT_CREDITS_PER_CLASS`, opcional `ASAAS_*`, `REDIS_*`.  
- **Scripts úteis**:  
  - `npm run dev` (root) para subir web+api.  
  - `npm run dev --workspace=api` / `--workspace=web` para rodar isolado.  
  - `npm run prisma:push` (api) se usar Prisma; hoje Supabase é primário.  
  - `npm run db:push` (root) chama `prisma:push` da API.  
- **Seeds/dados mínimos**: garantir `academies` com `franqueadora_id`, `academy_time_slots` preenchidos, professores aprovados e alunos com saldo (`student_class_balance`), horários base na tabela `bookings` somente via API.  
- **Produção**: ajustar `CORS_ORIGINS`, `NODE_ENV=production`, desativar logs verbosos, configurar CDN de assets, chaves ASAAS de prod, revisar CSP.

## Rotas e payloads críticos
- **Bookings** (`apps/api/src/routes/bookings.ts`):  
  - `POST /api/bookings/availability` → `{source:'PROFESSOR', professorId, academyId, startAt, endAt, professorNotes?}` cria `bookings` AVAILABLE.  
  - `POST /api/bookings` → `{source:'ALUNO'|'PROFESSOR', bookingId, studentId?, studentNotes?, professorNotes?}` atualiza slot para aluno ou cria direto.  
  - `PATCH /api/bookings/:id` → `{status:'CANCELED'|'PAID'|'DONE'}` aciona service (cancel/confirm/complete).  
  - `DELETE /api/bookings/:id` remove disponibilidade ou cancela/deleta agendamento.  
  - `GET /api/bookings?teacher_id|student_id|franchise_id|status` lista com join básico; `GET /api/bookings/:id` detalhes.  
- **Booking Series** (`apps/api/src/routes/booking-series.ts`): cria/atualiza séries recorrentes (campos: `teacher_id`, `student_id?`, `academy_id`, `day_of_week`, `start_time`, `end_time`, `recurrence_type`, `start_date`, `end_date`). Jobs usam `booking_series_notifications`.  
- **Pagamentos/Asaas** (`apps/api/src/routes/payments.ts`, `asaas.ts`):  
  - Criar intent/checkout: payload inclui `amount`, `student_id`, `package_id` ou horas; persiste em `payment_intents`, depois `payments`.  
  - Webhooks: `/api/webhooks/asaas` atualiza status, pode criar `transactions`/créditos. Rate limit e verificação de assinatura recomendados.  
- **Bloqueios** (`apps/api/src/routes/teachers.ts`): `POST /api/teachers/{id}/blocks/custom` com `{academy_id, date, hours[], notes?}` grava bloqueios (usado pelo front de disponibilidade).

## Próximos passos recomendados
1) Implementar dedupe e capacidade na criação de disponibilidade; impedir reabertura de slot após cutoff.  
2) Endurecer segurança: CSP parametrizada, RLS com claims JWT, rate limit em pagamentos/webhooks.  
3) Criar script de seed mínimo (academia + slots + professor aprovado + aluno com saldo) para facilitar onboarding.  
4) Especificar payloads de pagamentos com exemplos reais (Asaas) e assinar/verificar webhooks.  
5) Automatizar checklist de env (lint que valide variáveis obrigatórias em build/start).
