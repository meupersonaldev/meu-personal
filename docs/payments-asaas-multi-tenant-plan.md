# Plano de Ação — Pagamentos Multi‑Tenant com Asaas (Franqueadora + Subcontas + Royalties)

Este plano descreve como operar pagamentos centralizados na API, usando a conta da Franqueadora no Asaas para gerenciar subcontas por Franquia. Cada Franquia recebe 100% dos pagamentos dos seus clientes; a Franqueadora cobra o royalty automaticamente 1x/mês.

## Objetivo
- Cobranças dos alunos/professores fluindo para a subconta da Franquia (sem split em tempo real).
- Cálculo mensal do royalty por franquia e emissão de cobrança automatizada pela Franqueadora para a Franquia.
- Manter uma única API multi‑tenant (não é necessária uma API por franquia).

## Visão Geral da Arquitetura
- Conta master (Franqueadora): guarda credencial principal; cria/gerencia subcontas; emite fatura de royalty.
- Subconta por Franquia: cada Franquia possui `asaas_api_key` própria; o checkout acontece na subconta correta.
- Webhook único: todas as subcontas apontam para o mesmo endpoint `/api/webhooks/asaas` com token por franquia ou correlação via `externalReference`.
- Royalty mensal: job agrega faturamento da franquia no período e cria cobrança via conta master.

## Escopo
- Adições de schema (franquias + credenciais + royalties).
- Refactor do provider Asaas para ser “contextual por franquia”.
- Checkout usando a credencial da franquia.
- Webhooks multi‑conta.
- Job mensal de royalties.
- Split de pagamento em tempo real (opcional por franquia), com regras configuráveis.

Não escopo (por ora)
- Carteiras/métodos salvos (tokenização) além do fluxo Asaas básico.

---

## Roadmap por Fases

### Fase 0 — Pré‑requisitos
1) Definir como mapear Unidade/Academia → Franquia (via `units.franchise_id` ou mapeamento existente).  
2) Criar subcontas no Asaas (ou obter `asaas_api_key`) para cada Franquia piloto.  
3) Configurar webhook nas subcontas para a URL única da API: `/api/webhooks/asaas` e definir token secreto por subconta.

### Fase 1 — Migrações de Banco
1) Tabela/entidade de Franquia com credenciais:
- Adicionar à `franchises` (ou criar se não existir):
  - `asaas_account_id` TEXT
  - `asaas_api_key_enc` TEXT (armazenar criptografado)
  - `royalty_percentage` NUMERIC(5,2) NOT NULL DEFAULT 0
  - `royalty_min_fee_cents` INTEGER NOT NULL DEFAULT 0
  - `royalty_cycle_day` INTEGER CHECK (royalty_cycle_day BETWEEN 1 AND 28) DEFAULT 5
  - `settlement_mode` TEXT NOT NULL DEFAULT 'MONTHLY_ROYALTY' CHECK (settlement_mode IN ('MONTHLY_ROYALTY','SPLIT_REALTIME'))
  - `split_rules_json` JSONB DEFAULT '{}'::jsonb  -- porcentagens/valores fixos por recebedor

2) Pagamentos associados à franquia:
- Em `payment_intents`: adicionar `franchise_id UUID` (além de `franqueadora_id`). Indexar `(franchise_id, status, created_at)`.
 - (Opcional) `receiver_snapshot_json` JSONB para armazenar como o split foi aplicado naquele intent.

3) Tabela de faturas de royalty:
- `royalty_invoices`:
  - `id UUID PK`
  - `franchise_id UUID NOT NULL REFERENCES franchises(id)`
  - `period_start DATE NOT NULL`, `period_end DATE NOT NULL`
  - `amount_cents INTEGER NOT NULL`
  - `status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELED'))`
  - `asaas_payment_id TEXT`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - Índices: `(franchise_id, period_start, period_end) UNIQUE`, `(status, created_at)`

4) Segurança/operacional (opcional):
- Tabela `payment_customers (user_id, franchise_id, provider_customer_id)` para evitar colisão de `users.asaas_customer_id` em multi‑conta.

### Fase 2 — Provider Asaas multi‑conta + Split (refactor)
1) `apps/api/src/services/asaas.service.ts`
- Alterar construtor para aceitar `apiKey` (não depender direto de `process.env.ASAAS_API_KEY`).
- Adicionar factory `AsaasService.fromApiKey(apiKey: string)`.
- Manter suporte a `ASAAS_ENV` para base URL (sandbox/production).
 - Adicionar suporte a criação de pagamento com `split` (lista de recebedores e percentuais/valores).

2) `apps/api/src/services/payments/provider.ts`
- Mudar `getPaymentProvider()` para `getPaymentProvider(ctx?: { apiKey: string })` e repassar ao `AsaasService`.
- Extender interface do provider para aceitar `split` opcional em `createPayment`.

### Fase 3 — Checkout com credencial da franquia e Split opcional
1) `apps/api/src/routes/packages.ts`
- Resolver `franchiseId` antes do checkout: via `unit_id` → `units.franchise_id`; ou via contexto informado (query/parâmetro).  
- Carregar `asaas_api_key_enc` da franquia; descriptografar em memória.
- Criar provider: `getPaymentProvider({ apiKey })` e usar no `paymentIntentService`.
 - Se `franchises.settlement_mode = 'SPLIT_REALTIME'`, montar `split_rules` a partir de `split_rules_json`:
   - Exemplo de regra: `[{ recipient: 'FRANCHISE', percentage: 90 }, { recipient: 'FRANCHISOR', percentage: 10 }]`.
   - Mapear recipients para IDs do Asaas (guardar em `franchises` e em uma config da franqueadora, ex.: `settings.asaas_master_recipient_id`).

2) `apps/api/src/services/payment-intent.service.ts`
- Adaptar `createPaymentIntent` para aceitar provider/contexto (ou resolver internamente a franquia e invocar `getPaymentProvider({ apiKey })`).
- Preencher `payment_intents.franchise_id` no insert.
- Incluir `externalReference` com padrão: `franchise:<franchise_id>:intent:<intent_id>` para facilitar reconciliação e webhooks.
 - Ao criar o pagamento: se houver `split_rules`, enviar para o provider e persistir `receiver_snapshot_json` no intent.

3) Clientes Asaas por franquia
- Evitar gravar `users.asaas_customer_id` global; usar `payment_customers` com `(user_id, franchise_id)` quando houver multi‑contas.

### Fase 4 — Webhooks multi‑conta
1) `apps/api/src/routes/webhooks.ts`
- Validar header `asaas-access-token`. Mapear token → `franchise_id`.  
- Caso não haja token por subconta, parsear `externalReference` `{ franchise_id }` e seguir sem token.
- Após obter `providerId`/`status`, localizar o `payment_intents` por `provider_id` e/ou `externalReference` e atualizar status; usar `franchise_id` do intent.

2) Idempotência e logs
- Ignorar intents já marcados como `PAID`.
- Log estruturado com `intentId, franchiseId, providerId, status`.

### Fase 5 — Job mensal de royalties (modo mensal)
1) Novo arquivo: `apps/api/src/jobs/royalty-billing.ts`
- Função `runRoyaltyBilling(forDate = new Date())`:
  - Para cada franquia ativa: ler `royalty_cycle_day`, definir período mensal a cobrar (ex: mês anterior se for ciclo do dia).  
  - Agregar receita (somar `payment_intents.amount_cents` `status='PAID'` e `franchise_id = X` no período).  
  - Calcular `royaltyAmount = max(min_fee, floor(revenue * percentage))`.
  - Se já existe `royalty_invoices` no período: pular.  
  - Criar cobrança no Asaas “master” (Franqueadora) para os dados cadastrais da Franquia (CNPJ/email).  
  - Persistir em `royalty_invoices` com `asaas_payment_id` e `status` inicial (`PENDING`).

2) Agendamento
- Integrar ao scheduler existente (`booking-scheduler.ts`) para rodar diariamente e somente executar no dia de ciclo de cada franquia.

3) Webhook de royalties
- Na confirmação de pagamento (webhook Asaas master), atualizar `royalty_invoices.status` para `PAID`.

Observação: quando `settlement_mode = 'SPLIT_REALTIME'`, o job mensal não emite fatura; a franqueadora já recebe sua parte em cada transação.

### Fase 6 — Segurança de segredos
1) Criptografia em repouso para `asaas_api_key_enc` (AES‑256‑GCM):
- Novo util: `crypto-util.ts` com `encrypt/decrypt` usando `ENCRYPTION_KEY` env.  
- Descriptografar apenas no uso.

2) Segregação de privilégios
- Garantir que apenas serviços internos podem ler/decriptar chaves.

### Fase 7 — Observabilidade e Auditoria
1) Logs estruturados: adicionar `correlationId`, `franchiseId`, `intentId` em todos os logs de pagamento.
2) Auditoria: registrar eventos chaves (criação de intent, confirmação de pagamento, emissão de royalty).

### Fase 8 — Testes
1) Unit
- Provider Asaas: criação de cliente/pagamento com API key injetada; fallback de erro.
- Resolver franquia por `unit_id`.

2) Integração
- Checkout aluno/professor com provider mock (sem rede).  
- Webhook: processar `CONFIRMED/RECEIVED` e creditar saldos.  
- Royalty: simular período e conferir geração em `royalty_invoices`.

3) E2E (opcional)
- Asaas sandbox: criar pagamento real e validar webhook.

### Fase 9 — Rollout
1) Habilitar em 1–2 franquias piloto; conferir recebimento 100% nas subcontas.  
2) Configurar tokens de webhook por subconta.  
3) Habilitar job de royalties; validar primeira fatura.

### Fase 10 — Operação e Suporte
1) Reconciliação diária com Asaas (listar pagamentos e comparar com `payment_intents`).  
2) Reemissão/Cancelamento de faturas de royalty (rotas admin).  
3) Painel de acompanhamento (royalties pendentes/pagos por franquia).

---

## Passo a Passo Detalhado

### 1) Migrações SQL (exemplos)
- Adicionar colunas na `franchises`:
```sql
ALTER TABLE franchises
  ADD COLUMN IF NOT EXISTS asaas_account_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_api_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS royalty_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS royalty_min_fee_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS royalty_cycle_day INTEGER DEFAULT 5 CHECK (royalty_cycle_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS settlement_mode TEXT NOT NULL DEFAULT 'MONTHLY_ROYALTY' CHECK (settlement_mode IN ('MONTHLY_ROYALTY','SPLIT_REALTIME')),
  ADD COLUMN IF NOT EXISTS split_rules_json JSONB DEFAULT '{}'::jsonb;
```
- `payment_intents.franchise_id`:
```sql
ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS franchise_id UUID;
CREATE INDEX IF NOT EXISTS idx_payment_intents_franchise_status
  ON payment_intents (franchise_id, status, created_at DESC);
```
- `royalty_invoices`:
```sql
CREATE TABLE IF NOT EXISTS royalty_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES franchises(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','OVERDUE','CANCELED')),
  asaas_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (franchise_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_royalty_invoices_status_created
  ON royalty_invoices (status, created_at DESC);
```
- (Opcional) `payment_customers`:
```sql
CREATE TABLE IF NOT EXISTS payment_customers (
  user_id UUID NOT NULL,
  franchise_id UUID NOT NULL,
  provider_customer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, franchise_id)
);
```

### 2) Variáveis de Ambiente
- Franqueadora (master): `ASAAS_API_KEY_MASTER`, `ASAAS_WEBHOOK_SECRET_MASTER`.
- Subcontas (por franquia): guardadas em `franchises.asaas_api_key_enc`.
- Gerais: `ASAAS_ENV`, `PAYMENT_PROVIDER=ASAAS`, `ENCRYPTION_KEY` (32 bytes), `JWT_SECRET`.
 - (Split) IDs/recipients conforme configuração Asaas Marketplace, caso necessário (`ASAAS_MASTER_RECIPIENT_ID`).

### 3) Refactor de Código
- `src/services/asaas.service.ts`:
  - `constructor(apiKey: string, env: 'sandbox'|'production')`.
  - `static fromApiKey(apiKey: string): AsaasService`.
  - Métodos existentes inalterados (assinatura), usando a instância com `apiKey`.
  - Novo parâmetro opcional em `createPayment` para `split`.
- `src/services/payments/provider.ts`:
  - `getPaymentProvider(ctx?: { apiKey: string }): PaymentProvider`.
  - Interface `createPayment({ ..., split?: SplitRule[] })`.
- `src/services/payment-intent.service.ts`:
  - `createPaymentIntent(params, ctx?: { apiKey: string })`.
  - Preencher `franchise_id` e `externalReference` no insert.
  - Persistir `receiver_snapshot_json` quando houver split.
- `src/routes/packages.ts`:
  - Resolver `franchiseId` a partir de `unit_id` (ou query).  
  - Buscar `franchises.asaas_api_key_enc`, decriptar, criar provider contextual.
  - Montar `split_rules` se `settlement_mode='SPLIT_REALTIME'`.
- `src/routes/webhooks.ts`:
  - Validar token por franquia (mapa token→franchise) OU confiar no `externalReference`.
  - Chamar `paymentIntentService.processWebhook(providerId, status)`.
- (Novo) `src/jobs/royalty-billing.ts`:
  - Implementar cálculo e emissão das faturas mensais.

### 4) Segurança
- Utilitário `crypto-util.ts` com AES‑256‑GCM.  
- Rotas administrativas para registrar/atualizar a `asaas_api_key` da franquia (somente SUPER_ADMIN/FRANQUEADORA).

### 5) Testes
- Unit: provider com `apiKey` injetada; crypto util; resolução de franquia.
- Integração: checkout + webhook (mock do Asaas), geração de royalty em ambiente de teste.
- E2E (sandbox): um fluxo completo para 1 franquia piloto.

### 6) Rollout
- Criar 1–2 subcontas reais no Asaas; salvar chaves (criptografadas).  
- Apontar webhooks para `/api/webhooks/asaas` com tokens distintos (ou externalReference).  
- Habilitar job mensal somente para essas franquias piloto.  
- Monitorar intents/royalties por 1 ciclo; expandir gradualmente.

### 7) Observabilidade
- Logs: `payment_intent_created`, `payment_intent_paid`, `royalty_invoice_created`, `royalty_invoice_paid` com campos de correlação.  
- Painéis: total faturado por franquia, royalties a pagar/pagos, tempo de confirmação de pagamentos.

### 8) Plano de Contingência
- Se webhook falhar: reconciliação diária com listagem do Asaas (cron) e atualização de intents/royalties.
- Se a `asaas_api_key` expirar: alarme + UI para revalidar credencial.  
- Rollback: manter código antigo com provider global via feature flag (`PAYMENTS_MULTI_TENANT=false`).

---

## Anexos

### Exemplo de `externalReference`
- `franchise:<franchise_id>:intent:<intent_id>`

### Exemplo de payload de webhook (Asaas)
- Header: `asaas-access-token: <token_da_subconta>` (opcional)  
- Body base: `{ event, payment: { id, status, value, externalReference } }`

### Checklist de Go‑Live
- [ ] Migrações aplicadas em staging e produção
- [ ] Subcontas criadas; chaves inseridas (criptografadas)
- [ ] Webhooks configurados e validados
- [ ] Job mensal habilitado (janela segura)
- [ ] Painéis/alertas ativos
- [ ] Plano de rollback definido
