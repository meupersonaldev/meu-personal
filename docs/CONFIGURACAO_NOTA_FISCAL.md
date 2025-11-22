# Configuração de Nota Fiscal

Este documento explica como configurar o sistema de emissão de notas fiscais.

## 🔧 Configuração Rápida

### Para Desenvolvimento/Testes (MOCK)

Adicione no arquivo `.env` do backend (`apps/api/.env`):

```env
INVOICE_PROVIDER=MOCK
```

O modo MOCK permite testar o fluxo completo sem precisar de uma API real de NFe. Ele gera dados fictícios mas válidos.

### Para Produção (NFe.io)

1. Crie uma conta em [NFe.io](https://nfe.io)
2. Obtenha sua API Key
3. Configure no `.env`:

```env
INVOICE_PROVIDER=NFE_IO
NFE_IO_API_KEY=sua_api_key_aqui
```

## 📋 Variáveis de Ambiente

| Variável | Descrição | Obrigatório | Padrão |
|----------|-----------|-------------|--------|
| `INVOICE_PROVIDER` | Provedor de NFe (MOCK, NFE_IO) | Não | `NFE_IO` |
| `NFE_IO_API_KEY` | API Key do NFe.io | Sim (se usar NFE_IO) | - |

## 🧪 Modo MOCK

O modo MOCK é útil para:
- ✅ Desenvolvimento local
- ✅ Testes automatizados
- ✅ Demonstrações
- ✅ Validação do fluxo sem custos

**Características:**
- Gera chaves de acesso fictícias (formato válido)
- Simula delay de API real
- Permite testar todo o fluxo
- Não emite notas fiscais reais

## 🚀 NFe.io (Produção)

### Requisitos

1. **Conta NFe.io ativa**
2. **Certificado digital** (A1 ou A3)
3. **CNPJ cadastrado**
4. **Ambiente configurado** (homologação ou produção)

### Configuração

1. Acesse [NFe.io Dashboard](https://app.nfe.io)
2. Vá em **Configurações > API**
3. Copie sua **API Key**
4. Adicione no `.env`:

```env
INVOICE_PROVIDER=NFE_IO
NFE_IO_API_KEY=seu_token_aqui
```

### Dados Necessários

O sistema precisa dos seguintes dados do cliente para emitir NFe:
- ✅ Nome completo
- ✅ Email
- ✅ CPF/CNPJ
- ⚠️ Endereço completo (opcional, mas recomendado)

## 🔍 Verificar Configuração

Para verificar se está configurado corretamente:

1. **Backend rodando**: Verifique os logs ao iniciar
2. **Teste de emissão**: Tente emitir uma nota fiscal pela interface
3. **Logs**: Verifique se há erros relacionados ao provedor

## ⚠️ Troubleshooting

### Erro: "Provedor de nota fiscal não configurado"

**Solução:**
- Adicione `INVOICE_PROVIDER=MOCK` no `.env` para desenvolvimento
- Ou configure `NFE_IO_API_KEY` para produção

### Erro: "NFe.io API key não configurada"

**Solução:**
- Verifique se `NFE_IO_API_KEY` está no `.env`
- Reinicie o servidor após adicionar a variável
- Verifique se não há espaços extras na chave

### Erro ao emitir nota fiscal

**Possíveis causas:**
- CPF/CNPJ inválido ou incompleto
- Dados do cliente incompletos
- Problemas com certificado digital no NFe.io
- API Key inválida ou expirada

## 📝 Exemplo de .env Completo

```env
# Backend
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=seu-jwt-secret
JWT_EXPIRES_IN=7d

# Pagamentos
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=sua_asaas_key

# Notas Fiscais (Desenvolvimento)
INVOICE_PROVIDER=MOCK

# Notas Fiscais (Produção)
# INVOICE_PROVIDER=NFE_IO
# NFE_IO_API_KEY=sua_nfe_io_key
```

## 🔄 Migração de MOCK para Produção

Quando estiver pronto para produção:

1. Configure conta no NFe.io
2. Obtenha API Key
3. Atualize `.env`:
   ```env
   INVOICE_PROVIDER=NFE_IO
   NFE_IO_API_KEY=sua_key_real
   ```
4. Reinicie o servidor
5. Teste com uma venda real

## 📞 Suporte

- **NFe.io**: [Documentação](https://nfe.io/docs)
- **Problemas**: Verifique os logs do servidor
- **Dúvidas**: Consulte `docs/EMISSAO_NOTA_FISCAL.md`


