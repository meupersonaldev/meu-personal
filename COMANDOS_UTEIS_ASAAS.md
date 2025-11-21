# 🛠️ Comandos Úteis - Sistema de Pagamentos ASAAS

## 🧪 Testes

### Testar Webhook Localmente
```bash
# Executar script de teste
bash apps/api/test-webhook.sh

# Ou manualmente com curl:
curl -X POST http://localhost:3001/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "status": "CONFIRMED",
      "value": 100.00
    }
  }'
```

### Testar Webhook em Produção
```bash
curl -X POST https://central-meupersonalweb.es3isr.easypanel.host/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_456",
      "status": "CONFIRMED",
      "value": 50.00
    }
  }'
```

---

## 📊 Consultas no Banco de Dados

### Ver Payment Intents Pendentes
```sql
SELECT 
  id,
  type,
  actor_user_id,
  amount_cents / 100.0 as amount_reais,
  status,
  created_at
FROM payment_intents
WHERE status = 'PENDING'
ORDER BY created_at DESC
LIMIT 10;
```

### Ver Últimos Pagamentos Confirmados
```sql
SELECT 
  pi.id,
  pi.type,
  u.name as user_name,
  u.email,
  pi.amount_cents / 100.0 as amount_reais,
  pi.status,
  pi.created_at,
  pi.updated_at
FROM payment_intents pi
JOIN users u ON u.id = pi.actor_user_id
WHERE pi.status = 'PAID'
ORDER BY pi.updated_at DESC
LIMIT 20;
```

### Ver Saldo de Aluno
```sql
SELECT 
  u.name,
  u.email,
  scb.total_purchased,
  scb.total_consumed,
  scb.locked_qty,
  (scb.total_purchased - scb.total_consumed - scb.locked_qty) as available
FROM student_class_balance scb
JOIN users u ON u.id = scb.student_id
WHERE scb.student_id = 'USER_ID_AQUI';
```

### Ver Saldo de Professor
```sql
SELECT 
  u.name,
  u.email,
  phb.available_hours,
  phb.locked_hours,
  (phb.available_hours - phb.locked_hours) as truly_available
FROM prof_hour_balance phb
JOIN users u ON u.id = phb.professor_id
WHERE phb.professor_id = 'USER_ID_AQUI';
```

### Ver Transações de Aluno
```sql
SELECT 
  type,
  qty,
  source,
  booking_id,
  meta_json,
  created_at
FROM student_class_tx
WHERE student_id = 'USER_ID_AQUI'
ORDER BY created_at DESC
LIMIT 20;
```

### Ver Transações de Professor
```sql
SELECT 
  type,
  hours,
  source,
  booking_id,
  meta_json,
  created_at
FROM hour_tx
WHERE professor_id = 'USER_ID_AQUI'
ORDER BY created_at DESC
LIMIT 20;
```

### Estatísticas de Pagamentos (Hoje)
```sql
SELECT 
  status,
  COUNT(*) as quantidade,
  SUM(amount_cents) / 100.0 as total_reais
FROM payment_intents
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY status;
```

### Estatísticas de Pagamentos (Últimos 7 dias)
```sql
SELECT 
  DATE(created_at) as data,
  status,
  COUNT(*) as quantidade,
  SUM(amount_cents) / 100.0 as total_reais
FROM payment_intents
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), status
ORDER BY data DESC, status;
```

---

## 🔍 Monitoramento

### Ver Logs em Tempo Real
```bash
# Docker
docker logs -f nome-do-container | grep WEBHOOK

# PM2
pm2 logs api | grep WEBHOOK

# Arquivo de log
tail -f /var/log/app.log | grep WEBHOOK
```

### Filtrar Apenas Erros
```bash
tail -f /var/log/app.log | grep -E "❌|ERROR|ERRO"
```

### Filtrar Apenas Sucessos
```bash
tail -f /var/log/app.log | grep "✅"
```

### Contar Webhooks Recebidos Hoje
```bash
grep "WEBHOOK" /var/log/app.log | grep "$(date +%Y-%m-%d)" | wc -l
```

---

## 🔧 Manutenção

### Reprocessar Pagamento Manualmente
```bash
# Se um webhook falhou, você pode reprocessar manualmente
curl -X POST http://localhost:3001/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "PAYMENT_ID_DO_ASAAS",
      "status": "CONFIRMED",
      "value": 100.00
    }
  }'
```

### Creditar Manualmente (Emergência)
```sql
-- CUIDADO! Use apenas em emergências
-- Creditar aulas para aluno
INSERT INTO student_class_tx (
  student_id,
  franqueadora_id,
  type,
  source,
  qty,
  meta_json
) VALUES (
  'USER_ID',
  'FRANQUEADORA_ID',
  'PURCHASE',
  'SYSTEM',
  10,
  '{"reason": "Manual credit - emergency", "admin": "YOUR_NAME"}'::jsonb
);

-- Atualizar saldo
UPDATE student_class_balance
SET total_purchased = total_purchased + 10
WHERE student_id = 'USER_ID' 
  AND franqueadora_id = 'FRANQUEADORA_ID';
```

### Reverter Crédito (Emergência)
```sql
-- CUIDADO! Use apenas em emergências
-- Reverter aulas de aluno
INSERT INTO student_class_tx (
  student_id,
  franqueadora_id,
  type,
  source,
  qty,
  meta_json
) VALUES (
  'USER_ID',
  'FRANQUEADORA_ID',
  'REVOKE',
  'SYSTEM',
  10,
  '{"reason": "Manual revoke - emergency", "admin": "YOUR_NAME"}'::jsonb
);

-- Atualizar saldo
UPDATE student_class_balance
SET total_purchased = total_purchased - 10
WHERE student_id = 'USER_ID' 
  AND franqueadora_id = 'FRANQUEADORA_ID';
```

---

## 🚨 Troubleshooting Rápido

### Webhook não está chegando
```bash
# 1. Teste se a URL está acessível
curl -I https://central-meupersonalweb.es3isr.easypanel.host/api/webhooks/asaas

# 2. Verifique se o servidor está rodando
curl http://localhost:3001/health

# 3. Teste webhook manualmente
bash apps/api/test-webhook.sh
```

### Pagamento confirmado mas créditos não foram adicionados
```sql
-- 1. Verificar se payment_intent existe
SELECT * FROM payment_intents 
WHERE provider_id = 'PAYMENT_ID_DO_ASAAS';

-- 2. Verificar status
-- Se status = PENDING, webhook não chegou ou falhou
-- Se status = PAID, verificar transações

-- 3. Verificar transações
SELECT * FROM student_class_tx 
WHERE meta_json->>'payment_intent_id' = 'PAYMENT_INTENT_ID';

-- 4. Verificar saldo
SELECT * FROM student_class_balance 
WHERE student_id = 'USER_ID';
```

### Token de webhook inválido
```bash
# 1. Verificar token no .env
cat apps/api/.env | grep ASAAS_WEBHOOK_SECRET

# 2. Verificar token no painel ASAAS
# Deve ser exatamente: wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6

# 3. Reiniciar servidor após mudar .env
pm2 restart api
# ou
docker restart nome-do-container
```

---

## 📈 Relatórios

### Receita do Dia
```sql
SELECT 
  SUM(amount_cents) / 100.0 as receita_total_reais,
  COUNT(*) as total_pagamentos
FROM payment_intents
WHERE status = 'PAID'
  AND DATE(updated_at) = CURRENT_DATE;
```

### Receita do Mês
```sql
SELECT 
  SUM(amount_cents) / 100.0 as receita_total_reais,
  COUNT(*) as total_pagamentos,
  AVG(amount_cents) / 100.0 as ticket_medio
FROM payment_intents
WHERE status = 'PAID'
  AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE);
```

### Top 10 Clientes (Maior Gasto)
```sql
SELECT 
  u.name,
  u.email,
  COUNT(*) as total_compras,
  SUM(pi.amount_cents) / 100.0 as total_gasto_reais
FROM payment_intents pi
JOIN users u ON u.id = pi.actor_user_id
WHERE pi.status = 'PAID'
GROUP BY u.id, u.name, u.email
ORDER BY total_gasto_reais DESC
LIMIT 10;
```

### Taxa de Conversão (Pagamentos Confirmados vs Pendentes)
```sql
SELECT 
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM payment_intents
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

---

## 🔐 Segurança

### Gerar Novo Token de Webhook
```bash
# Gerar token aleatório seguro
node -e "console.log('wh_prod_' + require('crypto').randomBytes(32).toString('hex'))"

# Atualizar no .env
# Atualizar no painel ASAAS
# Reiniciar servidor
```

### Verificar Logs de Tentativas de Acesso Não Autorizado
```bash
grep "401" /var/log/app.log | grep "webhook" | tail -20
```

---

## 📞 Contatos Úteis

### ASAAS
- Suporte: suporte@asaas.com
- Telefone: (16) 3509-5060
- Documentação: https://docs.asaas.com

### Links Úteis
- Painel Produção: https://www.asaas.com
- Painel Sandbox: https://sandbox.asaas.com
- Documentação API: https://docs.asaas.com/reference
- Webhooks: https://docs.asaas.com/docs/sobre-os-webhooks

---

**Última Atualização:** 2024-01-15
