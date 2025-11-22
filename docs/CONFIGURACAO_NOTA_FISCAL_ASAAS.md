# Configuração de Nota Fiscal via ASAAS

O ASAAS permite emitir notas fiscais de serviço (NFS-e) diretamente pela plataforma, sem necessidade de software externo!

## ✅ Vantagens de Usar ASAAS

- ✅ **Já está configurado** - Você já usa ASAAS para pagamentos
- ✅ **Sem custo adicional** - Usa a mesma API key
- ✅ **Integração nativa** - Nota vinculada ao pagamento
- ✅ **Sem configuração extra** - Não precisa de outro serviço

## 🔧 Configuração

### 1. Configurar no Backend

Adicione no arquivo `.env` do backend (`apps/api/.env`):

```env
INVOICE_PROVIDER=ASAAS
```

**Pronto!** Não precisa de mais nada, pois o `ASAAS_API_KEY` já está configurado para pagamentos.

### 2. Configurar no Painel ASAAS

Para emitir notas fiscais, você precisa configurar no painel do ASAAS:

1. **Acesse** [https://www.asaas.com](https://www.asaas.com)
2. **Login** com suas credenciais
3. **Vá em:** Menu → Notas Fiscais → Configurações
4. **Preencha:**
   - Dados da empresa (CNPJ, razão social, endereço)
   - Inscrição Municipal
   - Certificado Digital (se exigido pela prefeitura)
   - Códigos de serviço (NBS) que você oferece

### 3. Homologação na Prefeitura

⚠️ **Importante:** Você precisa estar homologado na prefeitura do seu município para emitir NFS-e.

- Algumas prefeituras exigem certificado digital
- Outras usam usuário/senha do portal da prefeitura
- O processo varia por município

## 📋 Requisitos

- ✅ Conta ASAAS ativa
- ✅ CNPJ cadastrado e aprovado no ASAAS
- ✅ Homologação na prefeitura (para NFS-e)
- ✅ Inscrição Municipal ativa
- ✅ Certificado Digital (se exigido)

## 🚀 Como Funciona

1. **Cliente faz pagamento** → Pagamento processado pelo ASAAS
2. **Sistema cria invoice** → Registro na tabela `invoices` com status `PENDING`
3. **Emissão da nota** → Sistema chama API do ASAAS vinculando ao pagamento
4. **Nota emitida** → Status muda para `ISSUED` com dados da NFS-e

## 🔍 Verificar Configuração

Para verificar se está funcionando:

1. **Backend rodando** com `INVOICE_PROVIDER=ASAAS`
2. **Teste de emissão** - Tente emitir uma nota fiscal pela interface
3. **Logs do servidor** - Verifique se há erros

## ⚠️ Troubleshooting

### Erro: "Cliente ou pagamento não encontrado no ASAAS"

**Solução:**
- Verifique se o pagamento foi processado pelo ASAAS
- Confirme que o `provider_id` está salvo no `payment_intents`
- Verifique se o cliente tem `asaas_customer_id` cadastrado

### Erro: "Payment intent não encontrado"

**Solução:**
- Verifique se o `payment_intent_id` está correto
- Confirme que o pagamento existe no banco de dados

### Erro: "Não é possível emitir nota fiscal"

**Solução:**
- Verifique se está homologado na prefeitura
- Confirme que os dados da empresa estão corretos no ASAAS
- Verifique se o certificado digital está válido (se exigido)

### Nota não aparece no ASAAS

**Solução:**
- Verifique os logs do servidor para erros da API
- Confirme que a API key do ASAAS está correta
- Verifique se o pagamento está com status `PAID` no ASAAS

## 📝 Exemplo de .env

```env
# Backend
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=seu-jwt-secret
JWT_EXPIRES_IN=7d

# Pagamentos (ASAAS)
ASAAS_ENV=production
ASAAS_API_KEY=sua_asaas_api_key

# Notas Fiscais (ASAAS - mesmo provedor!)
INVOICE_PROVIDER=ASAAS
```

## 🔄 Alternativa: NFe.io

Se preferir usar NFe.io (ou se o ASAAS não atender suas necessidades):

```env
INVOICE_PROVIDER=NFE_IO
NFE_IO_API_KEY=sua_nfe_io_key
```

## 📞 Suporte

- **ASAAS**: [Central de Ajuda](https://ajuda.asaas.com)
- **Documentação**: [Como emitir notas fiscais](https://ajuda.asaas.com/pt-BR/articles/9571904-como-emitir-notas-fiscais)
- **Logs**: Verifique os logs do servidor para erros detalhados

## 💡 Dica

O ASAAS emite **NFS-e** (Nota Fiscal de Serviço Eletrônica), que é perfeito para serviços de personal training. Se você vende produtos físicos, precisará de outro sistema para NF-e.


