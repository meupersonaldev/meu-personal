# 🚀 Configuração ASAAS - Produção

## ⚠️ ATENÇÃO: AMBIENTE DE PRODUÇÃO
Este ambiente **COBRA DE VERDADE**! Todos os pagamentos serão reais.

---

## ✅ Configurações Aplicadas

### 1. API Key de Produção
```env
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjlkZjU5ZDU3LWQzNWQtNDg4OS04N2Q5LTA1ZDYyZjI1NjFkYzo6JGFhY2hfNjNkNWUyOGQtZjlmZS00Nzg3LWE2ZDEtMTE3ZTlkNzMzODFk
ASAAS_ENV=production
```

### 2. Token de Segurança do Webhook
```env
ASAAS_WEBHOOK_SECRET=wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6
```

---

## 📋 Checklist de Configuração

### Passo 1: Configurar Webhook no Painel ASAAS

1. **Acesse:** https://www.asaas.com
2. **Login** com suas credenciais de produção
3. **Navegue:** Menu → Configurações → Integrações → Webhooks
4. **Clique:** "Adicionar Webhook"

### Passo 2: Dados do Webhook

**URL do Webhook:**
```
https://central-meupersonalweb.es3isr.easypanel.host/api/webhooks/asaas
```

**Token de Autenticação:**
```
wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6
```

**Eventos a Selecionar:**
- ☑️ PAYMENT_CONFIRMED (Essencial)
- ☑️ PAYMENT_RECEIVED (Essencial)
- ☑️ PAYMENT_OVERDUE (Importante)
- ☑️ PAYMENT_REFUNDED (Importante)
- ☑️ PAYMENT_DELETED (Importante)
- ☑️ PAYMENT_UPDATED (Opcional)

### Passo 3: Testar Webhook

1. No painel ASAAS, após criar o webhook
2. Clique em "Testar Webhook"
3. Selecione evento: **PAYMENT_CONFIRMED**
4. Clique em "Enviar Teste"
5. Verifique se retorna: `Status 200 OK`

---

## 🧪 Como Testar em Produção (Com Cuidado!)

### Teste 1: Criar Cobrança Mínima
```bash
# Crie uma cobrança de R$ 0,01 para teste
# Use seu próprio CPF/email para não cobrar clientes reais
```

### Teste 2: Monitorar Logs
```bash
# No servidor, acompanhe os logs:
tail -f /var/log/app.log

# Ou via Docker:
docker logs -f nome-do-container
```

### Teste 3: Verificar Creditamento
```bash
# Após pagamento confirmado, verifique no banco:
# - Tabela: payment_intents (status deve ser PAID)
# - Tabela: student_class_balance ou prof_hour_balance (saldo deve aumentar)
# - Tabela: student_class_tx ou hour_tx (transação registrada)
```

---

## 🔍 Logs Esperados

### Quando Webhook Chegar:
```
🔔 [WEBHOOK] Asaas recebido: {
  timestamp: '2024-01-15T10:30:00.000Z',
  event: 'PAYMENT_CONFIRMED',
  paymentId: 'pay_abc123',
  status: 'CONFIRMED',
  value: 100.00
}
✅ [WEBHOOK] Processando pagamento: { providerId: 'pay_abc123', status: 'CONFIRMED' }
✅ PaymentIntent abc-123-def atualizado para status: PAID
💳 Creditando aulas para aluno user-123...
✅ Aluno user-123 recebeu 10 aulas
✅ [WEBHOOK] Pagamento processado com sucesso
```

---

## ⚠️ Troubleshooting

### Problema: Webhook retorna 401 Unauthorized
**Causa:** Token incorreto
**Solução:** Verifique se o token no ASAAS é exatamente: `wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6`

### Problema: Webhook não chega
**Causa:** URL incorreta ou firewall bloqueando
**Solução:** 
1. Verifique se a URL está acessível publicamente
2. Teste manualmente: `curl https://central-meupersonalweb.es3isr.easypanel.host/api/webhooks/asaas`

### Problema: Créditos não são adicionados
**Causa:** Erro no processamento
**Solução:** Verifique os logs para ver onde falhou

---

## 🔐 Segurança

### ✅ Implementado:
- Token de autenticação no webhook
- Validação de origem (header `asaas-access-token`)
- Idempotência (não processa pagamento duas vezes)
- Logs detalhados para auditoria

### ⚠️ Recomendações:
- Monitore logs diariamente nos primeiros dias
- Configure alertas para erros no webhook
- Faça backup do banco antes de grandes mudanças
- Teste sempre em sandbox antes de produção

---

## 📊 Monitoramento

### Métricas Importantes:
1. **Taxa de sucesso do webhook:** Deve ser > 99%
2. **Tempo de processamento:** Deve ser < 2 segundos
3. **Créditos creditados corretamente:** 100% dos pagamentos confirmados

### Onde Monitorar:
- Logs do servidor: `/var/log/app.log`
- Painel ASAAS: Webhooks → Histórico
- Banco de dados: Tabela `payment_intents`

---

## 🆘 Suporte

### Em caso de problemas:
1. Verifique os logs primeiro
2. Consulte a documentação do ASAAS: https://docs.asaas.com
3. Entre em contato com suporte ASAAS se necessário

### Contatos ASAAS:
- Suporte: suporte@asaas.com
- Telefone: (16) 3509-5060
- Chat: Disponível no painel

---

## ✅ Checklist Final

Antes de ir para produção, confirme:

- [ ] API Key de produção configurada
- [ ] ASAAS_ENV=production
- [ ] Webhook criado no painel ASAAS
- [ ] Token de segurança configurado
- [ ] Teste de webhook realizado com sucesso
- [ ] Logs sendo monitorados
- [ ] Backup do banco de dados feito
- [ ] Equipe avisada sobre a mudança
- [ ] Plano de rollback preparado

---

## 🔄 Rollback (Se Necessário)

Se algo der errado, volte para sandbox:

```env
ASAAS_API_KEY=$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmIwNzZmODk0LTMzM2MtNGVhNS1iN2Q2LWNjMjg3YzNhMTZlZDo6JGFhY2hfZWMxOTgxNTMtYmNjNC00MDQzLTg2YzAtNTY0OTlkOGVhYzk4
ASAAS_ENV=sandbox
```

Reinicie o servidor e reconfigure o webhook para sandbox.

---

**Data de Configuração:** 2024-01-15
**Responsável:** [Seu Nome]
**Status:** ✅ Pronto para Produção
