# Auditoria Completa – Pendências e Ações Recomendadas

## Segurança / Compliance
- **RLS aberto**: policies permissivas (allow-all) para `public.*`. Plano: criar claims JWT (`role`, `user_id`, `franchise_id`) e policies por tabela (bookings, users, payments, storage). Bloquear `public` e forçar uso via API.
- **Service Role exposto no FE**: `apps/web/lib/stores/franquia-store.ts` e `franqueadora-store.ts` fazem queries diretas Supabase com service key → risco total. Migrar para API e revogar chave antiga.
- **CORS/CSP**: `apps/api/src/server.ts` usa `connectSrc 'self'`; falta incluir domínios Supabase/Asaas/CDN em produção e separar allowlist por ambiente. Revisar CORS dev vs prod.
- **JWT**: sem rotação/`aud`/`iss`; senha forte não aplicada em `auth.ts`. Implementar complexidade (mín 12 chars), rotação de secret, tempos curtos e refresh controlado.
- **Logs sensíveis**: `asaas.service.ts` loga prefix de key; server/routes com muitos `console.log` (dados pessoais). Criar logger com redaction e níveis; remover debug em prod.
- **Rate limiting**: global, mas não específico em pagamentos/webhooks/admin. Adicionar limites mais baixos e detecção de burst/abuso.
- **Webhooks**: falta verificação de assinatura/idempotência (Asaas e provider cliente). Rejeitar sem assinatura; gravar idempotency key.

## Agendamento / Disponibilidade
- **Dedupe inexistente**: `POST /api/bookings/availability` insere AVAILABLE sem checar duplicidade (teacher+franchise+start). Adicionar unique lógico ou checagem antes de inserir.
- **Capacidade**: slots AVAILABLE não validam `units.capacity_per_slot`; risco de overbooking. Validar na criação e na reserva.
- **Timezone/segundos**: FE usa `toLocaleTimeString` e ISO no filtro; DST pode quebrar match. Normalizar horário em UTC puro e chavear sem segundos.
- **Cancelamento reabrindo slot**: `cancelBooking` volta para AVAILABLE mesmo após cutoff ou perto da aula → permite rebook tardio. Ajustar para não reabrir após limite.
- **Bloqueios**: `POST /teachers/{id}/blocks/custom` não remove disponibilidades existentes; risco de alunos agendarem em períodos bloqueados. Sincronizar bloqueio com delete/invalidar slots.
- **Órfãos**: existência de `cleanup-orphans` indica inconsistência; revisar criação/remoção atômica.
- **Jobs**: `booking-scheduler.ts` (locks T-4h) precisa garantia de execução e observabilidade; não transacional com saldo.

## Pagamentos / Financeiro
- **Provider cliente stub**: `apps/api/src/services/payments/cliente.provider.ts` todos métodos TODO (customer, payment, link, webhook).
- **Split Asaas TODO**: `asaas.service.ts` marca “100% para franquia” pendente de regra real.
- **Idempotência/assinatura**: checar rotas `/api/asaas`, `/api/payments` para validar assinatura e idempotency key; registrar `payment_intents`/`payments`/`transactions` de forma transacional.
- **Compensação de saldo**: créditos/horas debitados fora de transação com booking; falhas intermediárias geram drift. Precisar de transação ou job reconciliador.

## Check-in / Notificações
- **Check-ins não validados**: tabela vazia (segundo plano) e rota existe; faltam testes E2E (scan → persistência → stats).
- **Notificações**: `createNotification`/`createUserNotification` chamados, mas SSE/persistência não confirmados (plano diz “não persiste”). Revisar triggers e storage.

## Dados / Seed / Env
- **Seeds inexistentes**: criar script mínimo (franqueadora, academias com `franqueadora_id`, `academy_time_slots`, professor aprovado, aluno com saldo).
- **Validador de env**: garantir variáveis críticas (`SUPABASE_*`, `ASAAS_*`, `JWT_*`, `CORS_ORIGINS`, `FRONTEND_URL`) com schema e fail-fast em boot.
- **Migrações TODO**: `prisma/migrations/create_academy_stats_function.sql` linhas 73-76 com TODOs (rating/credits/plans). Sincronizar schema/migrações com Supabase real.

## Frontend
- **Uso direto de Supabase**: stores `franquia-store.ts`, `franqueadora-store.ts` (~1200/1300 linhas) devem ir para API.
- **Disponibilidade UI**: depende de filter local; falta feedback de conflitos e alinhamento com bloqueios/capacidade. Ajustar para usar respostas consolidadas da API.
- **Páginas antigas**: `app/professor/agenda/page-old.tsx` ainda referenciada; definir legado ou remover.

## Backend
- **Roteamento crítico**: bookings, booking-series, payments, approvals, admin precisam de testes e hardening de auth/roles.
- **Scheduler/Jobs**: falta healthcheck/monitoramento; definir como são disparados em prod.
- **Logs**: limpar debug (`server.ts` “CÓDIGO ATUALIZADO” etc.) e mascarar dados.

## Testes / Observabilidade
- **Sem testes automáticos**: criar smoke E2E (login, criar disponibilidade, agendar, cancelar, pagamento fake) e unit para serviços de saldo/pagamento.
- **Monitoramento**: métricas para jobs, falhas de pagamento, erros 5xx; dashboards básicos.

## Documentação
- **OpenAPI/Swagger**: inexistente; gerar docs para bookings, series, payments/webhooks.
- **Runbooks**: pagamento Asaas, reconciliação de saldo, seeds e deploy/homologação.

## Passos rápidos para 100%
1) Trancar segurança: remover Supabase direto no FE, endurecer CORS/CSP/JWT, definir RLS e rotas com rate limit forte.  
2) Hardening agendamento: dedupe + capacidade + timezone + cancelamento sem reabrir; bloqueios invalidam slots.  
3) Pagamentos: implementar provider cliente/Asaas com assinatura/idempotência e transação de saldo; definir split.  
4) Seeds/validador de env e testes E2E mínimos (booking/payments/cancel).  
5) Observabilidade: logger com redaction, health dos jobs, métricas básicas.  
6) Limpeza: remover páginas/rotas legadas, TODOs em migrations/stubs.
