{{ ... }}

Este documento alinha o estado atual do repositório ao escopo canônico solicitado e define um plano de ação completo, faseado e verificável para chegar ao MVP descrito. O foco é entregar a API e o Front nos termos do blueprint final, com dados, rotas e fluxos coerentes, segurança adequada e testes E2E mínimos.

---

## 1) Premissas (travado)

- Produto Web responsivo (aluno, professor, unidade, franqueadora).
- Monorepo: Next.js 15 + React 19 (Front) e Express + TS (API), PostgreSQL (Neon/Supabase).
- Autenticação: JWT próprio na API (não usar Supabase Auth como sessão).
- Pagamentos: Asaas (link/checkout); sem split $.
- Professor compra pacotes de horas (Asaas). Aluno compra pacotes de aulas (Asaas).
- Repasse: a cada aula confirmada, professor ganha +1h de bônus (crédito interno, não dinheiro).
- Janela de cancelamento: >4h reembolsa; ≤4h não reembolsa.
- Check-in/catraca: fora do MVP; manter stub que apenas registra tentativa.
- Reviews: comentário visível após 7 dias.
- Timezone padrão: America/Sao_Paulo.
- Pagamentos Asaas: ambiente sandbox no MVP.
- Scheduler: job no mesmo processo da API a cada 1 min (MVP).
- Frontend acessa dados apenas via API (JWT); Supabase Storage opcional para avatar.
- Backend: cliente Supabase unificado (`apps/api/src/config/supabase.ts`).
- Migração `academies` → `units` e criação de `franchises` autorizadas.
- Decisões confirmadas: manter histórico de alterações em bookings e transações.
- Consistência de dados: garantir que Supabase Auth e Supabase Storage sejam acessados via API (JWT).
- Acesso direto ao front: evitar acesso direto ao Supabase via front (ex.: Next.js API routes).
- Gaps de Supabase duplicado: remover duplicatas em rotas e models.

---

## 2) Estado atual (síntese)

- API Express TS com módulos de bookings, notifications, franqueadora, franchises, etc. Autenticação JWT já presente em parte (ex.: franqueadora), mas há vestígios/uso híbrido com Supabase em pontos.
- Notificações SSE implementadas (academy, user e franqueadora), store/Provider no Front.
- Check-in via recepção implementado (com notificações), e um fluxo de QR p/ professor (parcial). Para o MVP, manter stub simples “POST /checkin”.
- Integração Asaas presente (webhooks/base), mas precisará ser alinhada a PaymentIntent canônica.
- Front Next com stores (aluno/professor/unidade/franqueadora), Provider de notificações e páginas principais; falta alinhar com o domínio canônico e fluxos de compra/agenda/saldos.

Gaps principais vs. escopo canônico:
- Modelo de dados canônico (locks, balances e transações) não consolidado ainda.
- Rotas canônicas faltantes/sobrepostas; nomenclatura divergente.
- Scheduler T-4h (promover/revogar locks) não implementado.
- RBAC unificado por roles canônicos pendente (ALUNO | PROFESSOR | FRANQUIA | FRANQUEADORA).
- Reviews com visible_at (+7 dias) não implementado.
- Capacidade por horário (unidade) não aplicada no motor de reserva.

---

## 3) Modelo de Dados canônico (a implementar)

Criar/migrar tabelas (nomes e colunas canônicos):

- users(id, name, email, password_hash, role[ALUNO|PROFESSOR|FRANQUIA|FRANQUEADORA], created_at)
- franchises(id, name, active)
- units(id, franchise_id, name, city, state, capacity_per_slot, opening_hours_json)
- professor_profiles(user_id PK, bio, tags[], value_hour_info, avatar_url, units_allowed[])
- student_packages(id, unit_id?, title, classes_qty, price_brl, active)
- student_class_balance(id, student_id, unit_id?, total_purchased, total_consumed, updated_at)
- student_class_tx(id, student_id, type[PUCHASE|CONSUME|REFUND|LOCK|UNLOCK|REVOKE], qty, booking_id?, meta JSONB, created_at, unlock_at?)
- hour_packages(id, unit_id?, title, hours_qty, price_brl, active)
- prof_hour_balance(id, professor_id, unit_id?, available_hours, locked_hours, updated_at)
- hour_tx(id, professor_id, type[PURCHASE|CONSUME|REFUND|BONUS_LOCK|BONUS_UNLOCK|REVOKE], hours, booking_id?, meta JSONB, created_at, unlock_at?)
- bookings(id, source[ALUNO|PROFESSOR], student_id?, professor_id, unit_id, start_at, end_at, status[RESERVED|PAID|CANCELED|DONE], cancellable_until)
- payment_intents(id, type[STUDENT_PACKAGE|PROF_HOURS], provider[ASAAS], provider_id, amount, status[PENDING|PAID|FAILED|CANCELED], checkout_url, payload_json, actor_user_id, created_at)
- reviews(id, booking_id, stars, comment, visible_at)
- audit_logs(id, actor_user_id, action, entity, entity_id, diff_json, created_at)

Índices essenciais: por FK, (student_id, created_at), (professor_id, created_at), por start_at/end_at em bookings, e por unlock_at em transações LOCK/UNLOCK.

---

## 4) API canônica (Express, REST)

Auth
- POST /auth/signup, POST /auth/signin, POST /auth/signout
- JWT (roles canônicos) + middlewares `requireAuth`, `requireRole([...])`.

Unidades/Franquias
- GET /units • POST /units (FRANQUIA/FRANQUEADORA) • PATCH /units/:id
- GET /franchises • POST /franchises • PATCH /franchises/:id

Professores
- GET /professors/me • PUT /professors/me (bio, tags, valor, avatar, units_allowed)
- GET /public/professors?city&state&unitId&q • GET /public/professors/:id

Disponibilidade & Agenda
- GET /availability?professorId=me&unitId
- POST /availability (weekday, start, end, slot=60) • DELETE /availability/:id
- GET /bookings?role=professor|aluno|unit&from&to&status
- POST /bookings
  - source=ALUNO: valida saldo aluno (gera LOCK), valida capacidade, cria BONUS_LOCK (professor), status RESERVED, define cancellable_until.
  - source=PROFESSOR: valida available_hours ≥ 1 → CONSUME(−1); status RESERVED.
- POST /bookings/:id/cancel
  - >4h: REVOKE locks (aluno recupera crédito; professor não ganha bônus) / REFUND 1h (professor-led).
  - ≤4h: mantém consumo/bônus.

Pacotes & Saldos — Aluno
- GET /student/packages
- POST /student/packages/checkout → PaymentIntent (STUDENT_PACKAGE) + checkout Asaas
- POST /webhooks/asaas/student-package → PAID ⇒ student_class_tx: PURCHASE(+N)
- GET /student/balance • GET /student/transactions

Pacotes & Saldos — Professor
- GET /prof/hours/packages
- POST /prof/hours/checkout → PaymentIntent (PROF_HOURS) + checkout Asaas
- POST /webhooks/asaas/prof-hours → PAID ⇒ hour_tx: PURCHASE(+N)
- GET /prof/hours/balance • GET /prof/hours/transactions

Avaliações
- POST /reviews (após DONE, visible_at = now + 7d)
- GET /public/professors/:id/reviews (apenas visible_at ≤ now)

Check‑in (stub)
- POST /checkin → grava tentativa com booking_id, professor_id, timestamp.

---

## 5) Scheduler T‑4h

- Job a cada 1 minuto (no mesmo servidor inicialmente), que:
  - Promove student_class_tx: LOCK → UNLOCK/CONSUME quando unlock_at ≤ now.
  - Promove hour_tx: BONUS_LOCK → BONUS_UNLOCK quando unlock_at ≤ now.
  - Remove locks em bookings cancelados >4h antes do unlock.
- Guardar unlock_at = start_at − 4h nos dois locks no momento da criação do booking (aluno-led).

---

## 6) Plano de Ação por Fases

Fase 0 — Hardening & Base (1–2 dias)
- Consolidar uso de JWT (remover dependência de sessão Supabase Auth onde existir).
- RBAC mínimo: middlewares `requireAuth` e `requireRole` com roles canônicos.
- CORS seguro (allowlist), Helmet, Rate-limit, logs básicos.
- Criar migrações iniciais das tabelas canônicas (DDL em SQL ou Prisma, mantendo compatibilidade com DB atual quando possível).
- Timezone: configurar "America/Sao_Paulo" na API, scheduler e cálculos de `start_at`/`end_at`/`unlock_at`.

Fase 1 — Modelo de Dados (2–3 dias)
- Implementar balances (student_class_balance, prof_hour_balance) e transações (student_class_tx, hour_tx) com unlock_at.
- Popular catálogos (student_packages, hour_packages) e relacionamentos (units, franchises).
- Adicionar índices críticos.

Fase 2 — API de Pacotes & PaymentIntent (Asaas) (2–3 dias)
- Endpoints de catálogo e checkout (aluno e professor) + payment_intents.
- Webhooks Asaas idempotentes por provider_id + type.
- Ao PAID: gerar transação PURCHASE e atualizar balances.

Fase 3 — Agenda e Reservas (3–4 dias)
- Disponibilidade (CRUD simples por professor/unidade).
- POST /bookings (aluno-led): valida saldo e capacidade, cria LOCK/ BONUS_LOCK com unlock_at, RESERVED.
- POST /bookings (professor-led): CONSUME(−1) e RESERVED.
- Cancelamentos conforme regra (>4h / ≤4h) com REVOKE/REFUND.
- GET /bookings com filtros e paginação.

Fase 4 — Scheduler T‑4h (1–2 dias)
- Worker simples (setInterval/cron) para promover/revogar locks.
- Logs de auditoria para operações automáticas.

Fase 5 — Reviews (1–2 dias)
- POST /reviews com visible_at = now+7d após DONE.
- GET público de reviews com filtro de visibilidade.

Fase 6 — Check‑in Stub (0,5 dia)
- POST /checkin (apenas persiste tentativa associada ao booking/professor/timestamp).

Fase 7 — RBAC & Auditoria (1–2 dias)
- Endurecer requireRole por rota.
- Registrar audit_logs nas operações sensíveis (CRUD unidades/franquias, intents, bookings, scheduler promotions/cancels).

Fase 8 — Front (2–4 dias)
- Professor: dashboard (KPIs), comprar horas, próximas aulas, agenda compacta, carteira de horas.
- Aluno: buscar professor (cidade/estado/unidade), perfil/disponibilidade, comprar pacote, saldo, reservar/cancelar.
- Unidade (franquia): CRUD unidade, vincular professores, agenda geral.
- Franqueadora: CRUD franquias, dashboard simples (aulas confirmadas/unidade, profs ativos, receita bruta, contadores).
- Integração com API canônica e toasts/unhappy path.

Fase 9 — Testes & Entregáveis (2–3 dias)
- E2E mínimos (roteiro abaixo), Postman/OpenAPI, README, seed, jobs.
- Relatório rápido de conciliação (payment_intents e status).

---

## 7) Migrações (sugestão inicial)

- Criar tabelas canônicas listadas (ver seção 3) com FKs, índices, e colunas `unlock_at` nas transações de LOCK/BONUS_LOCK.
- Migration helper: scripts SQL versionados em `apps/api/migrations/` ou via Prisma (preservando nomes canônicos de tabelas/colunas).

---

## 8) RBAC

- Roles: ALUNO, PROFESSOR, FRANQUIA, FRANQUEADORA.
- requireRole: mapear endpoints (ex.: POST /units → FRANQUIA/FRANQUEADORA; POST /bookings aluno-led → ALUNO; professor-led → PROFESSOR).
- SSE/Notificações: manter canais por user e por unidade/franqueadora, acesso condicionado ao user_id/escopo do admin.

---

## 9) Testes E2E mínimos (mapeados)

- SP‑01: StudentPackage → Paga (webhook) → saldo de aulas +N.
- AL‑01: Aluno‑led reserva 08:00 → cria 2 locks + booking RESERVED.
- AL‑02: Cancelar 07:50 (≤4h) → crédito consumido, bônus permanece/unlock.
- AL‑03: Cancelar D‑1 (>4h) → remove locks (sem consumo/bônus).
- PL‑01: Professor‑led reserva com 0h → bloqueia.
- PL‑02: Professor‑led reserva com 1h → CONSUME (−1); cancelar D‑1 → REFUND (+1).
- CAP‑01: Slot lotado → 409.
- RBA‑01: Rota admin com JWT de professor → 403.
- WBH‑01: Webhook duplicado → idempotência (uma única transação).

---

## 10) Entregáveis

- API com rotas canônicas + scheduler de locks (job interno).
- Front com dashboards e fluxos centrais (professor/aluno/unidade/franqueadora).
- README (setup, .env.example, seed, jobs, rotas) e OpenAPI/Postman.
- Relatório de conciliação (payment_intents x status).

---

## 11) Riscos & Mitigações

- Conciliação financeira: assegurar idempotência e logs por provider_id.
- Consistência de locks: garantir transações atômicas (BEGIN/COMMIT) ao criar/cancelar bookings.
- RBAC: endurecer middlewares, testes RBA‑01.
- CORS/cookies em dev: priorizar Authorization: Bearer e allowlist de origens.

---

## 12) Cronograma (estimativa)

- Semana 1: Fases 0–2 (base, dados, pacotes/pagamentos).
- Semana 2: Fases 3–5 (agenda/locks/scheduler/reviews/check‑in stub).
- Semana 3: Fases 6–9 (front completo, testes, entregáveis).

---

## 13) Próximos Passos Imediatos

1. Confirmar/ajustar variáveis de ambiente (JWT_SECRET ≥ 32 chars, Asaas keys, DB URL).
2. Especificar DDL das novas tabelas e aplicar migrações.
3. Implementar endpoints de catálogo/checkout/payment_intents e webhooks com idempotência.
4. Implementar POST /bookings (aluno-led e professor-led) com locks e capacidade.
5. Implementar scheduler T‑4h e cancelamentos.
6. Ajustar Front para fluxos de compra, saldos e agenda.
7. Entregar testes E2E mapeados e documentação final.

---

## 14) Progresso Fase 0 (2025-10-04)

- Unificação do cliente Supabase no backend: concluída
  - `apps/api/src/services/asaas.service.ts` agora importa `supabase` de `apps/api/src/config/supabase.ts`.
- Consolidação de variáveis de ambiente: concluída
  - `/.env.example` e `/.env` atualizados com: `APP_BASE_URL`, `NEXT_PUBLIC_API_URL`, `ASAAS_ENV=sandbox`, `ASAAS_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_*`, `DEFAULT_CREDITS_PER_CLASS`.
- Timezone: registrado no plano (America/Sao_Paulo)
- CORS/Segurança: concluída (allowlist por `FRONTEND_URL`/`CORS_ORIGINS`, rate-limits aplicados).
- Front (JWT/API): `apps/web/lib/stores/auth-store.ts` e `apps/web/lib/stores/student-store.ts` atualizados para usar a API com `NEXT_PUBLIC_API_URL`; cookie `auth-token` setado/removido no front; removido Supabase direto nesses fluxos.

---

## 15) Fase 1 — DDL canônica (Especificação)

- **`franchises`**
  - Colunas: `id (uuid pk)`, `name`, `slug`, `email`, `phone`, `cnpj`, `is_active`, `created_at`, `updated_at`.
  - Índices: `slug unique`, `is_active`.

- **`units`** (migração de `academies`)
  - Colunas: `id (uuid pk)`, `franchise_id fk → franchises(id)`, `name`, `slug`, `city`, `state`, `address`, `zip_code`, `capacity_per_slot`, `opening_hours_json`, `is_active`, timestamps.
  - Índices: `franchise_id`, `slug unique`, `city/state`, `is_active`.
  - Estratégia: migrar dados de `academies` para `units`; manter view/compat temporária (`academies` → `units`) se necessário.

- **`student_packages`**
  - Colunas: `id`, `unit_id fk → units(id)`, `title`, `classes_qty`, `price_cents`, `status`, `metadata_json`, timestamps.
  - Índices: `unit_id`, `(status, unit_id)`.

- **`student_class_balance`**
  - Colunas: `id`, `student_id`, `unit_id`, `total_purchased`, `total_consumed`, `locked_qty`, `updated_at`.
  - Índices: `(student_id, unit_id)` unique.

- **`student_class_tx`**
  - Colunas: `id`, `student_id`, `unit_id`, `type` (`PURCHASE|CONSUME|LOCK|UNLOCK|REFUND|REVOKE`), `qty`, `booking_id`, `meta_json`, `created_at`, `unlock_at`, `source` (`ALUNO|PROFESSOR|SYSTEM`).
  - Índices: `(student_id, created_at desc)`, `(unlock_at)`.

- **`hour_packages`**
  - Colunas: `id`, `unit_id`, `title`, `hours_qty`, `price_cents`, `status`, timestamps.
  - Índices: `unit_id`, `(status, unit_id)`.

- **`prof_hour_balance`**
  - Colunas: `id`, `professor_id`, `unit_id`, `available_hours`, `locked_hours`, `updated_at`.
  - Índices: `(professor_id, unit_id)` unique.

- **`hour_tx`**
  - Colunas: `id`, `professor_id`, `unit_id`, `type` (`PURCHASE|CONSUME|BONUS_LOCK|BONUS_UNLOCK|REFUND|REVOKE`), `hours`, `booking_id`, `meta_json`, `created_at`, `unlock_at`, `source`.
  - Índices: `(professor_id, created_at desc)`, `(unlock_at)`.

- **`payment_intents`**
  - Colunas: `id`, `type` (`STUDENT_PACKAGE|PROF_HOURS`), `provider` (`ASAAS`), `provider_id`, `amount_cents`, `status` (`PENDING|PAID|FAILED|CANCELED`), `checkout_url`, `payload_json`, `actor_user_id`, `unit_id`, timestamps.
  - Restrições: `provider_id` unique por `provider`.
  - Índices: `(status, created_at)`, `(actor_user_id, created_at desc)`.

- **`audit_logs`**
  - Colunas: `id`, `actor_user_id`, `action`, `entity`, `entity_id`, `diff_json`, `metadata_json`, `created_at`.
  - Índices: `(entity, entity_id)`, `(actor_user_id, created_at desc)`.

- **`reviews`**
  - Adicionar coluna `visible_at` (timestamp) e índice `(visible_at)`.

- **`bookings`** (ajustes)
  - Novas colunas: `source` (`ALUNO|PROFESSOR`), `start_at`, `end_at`, `cancellable_until`, `status` (`RESERVED|PAID|CANCELED|DONE`), `unit_id` fk → units(id), `student_notes`, `professor_notes`, `payment_intent_id` fk.
  - Atualizações: migrar `date/duration` para `start_at/end_at`; remover dependências de `academies` (usar `unit_id`).
  - Índices: `(unit_id, start_at)`, `(student_id, start_at desc)`, `(professor_id, start_at desc)`, `(unlock_at)` para locks relacionados.

- **Foreign Keys & Constraints**
  - Garantir FKs com `ON DELETE RESTRICT` para balances/transactions; `CASCADE` apenas onde necessário (ex.: `units` ao remover `franchises`).
  - Adicionar `CHECK` para `unlock_at >= created_at` e `qty/hours > 0`.

- **Estratégia de Migração**
  - Criar migrações SQL versionadas em `apps/api/migrations/`.
  - Etapa de compat: copiar dados de `academies` → `units`, atualizar referências (`academy_id` → `unit_id`).
  - Ajustar APIs para novo esquema antes de remover colunas antigas.

