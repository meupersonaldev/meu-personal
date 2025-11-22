# Emissão de Nota Fiscal - Meu Personal

Este documento explica como emitir notas fiscais para todas as vendas do sistema.

## 📋 Visão Geral

O sistema permite emitir notas fiscais (NF-e) para todas as vendas confirmadas (pagamentos com status `PAID`). A integração suporta múltiplos provedores de emissão de nota fiscal.

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` do backend:

```env
# Provedor de Nota Fiscal (NFE_IO, BLING, etc)
INVOICE_PROVIDER=NFE_IO

# NFe.io API Key (obtenha em https://nfe.io)
NFE_IO_API_KEY=sua_api_key_aqui
```

### 2. Executar Migration

Execute a migration para criar a tabela de notas fiscais:

```bash
cd apps/api
# Execute a migration manualmente ou via script
psql $DATABASE_URL -f migrations/20250115_create_invoices_table.sql
```

Ou use o script de migração do projeto:

```bash
npm run db:push
```

## 📊 Estrutura de Dados

### Tabela `invoices`

Armazena todas as notas fiscais emitidas:

- `id`: UUID da invoice
- `payment_intent_id`: Referência ao pagamento
- `status`: PENDING, ISSUED, CANCELED, ERROR
- `nfe_key`: Chave de acesso da NFe
- `nfe_url`: URL para download da NFe
- `customer_*`: Dados do cliente
- `service_description`: Descrição do serviço
- `amount_cents`: Valor em centavos

## 🚀 Como Usar

### 1. Listar Vendas sem Nota Fiscal

```bash
GET /api/invoices/sales-without-invoice?franqueadora_id=xxx&limit=50
```

Retorna todas as vendas pagas que ainda não têm nota fiscal associada.

### 2. Criar Invoice (Preparar para Emissão)

```bash
POST /api/invoices
{
  "payment_intent_id": "uuid-do-payment-intent",
  "type": "NFE",  // ou "NFC_E"
  "service_code": "1401"  // opcional
}
```

Cria um registro de invoice pendente (não emite ainda).

### 3. Emitir Nota Fiscal

```bash
POST /api/invoices/:invoice_id/issue
```

Emite a nota fiscal através do provedor configurado.

### 4. Emitir em Lote

```bash
POST /api/invoices/batch-issue
{
  "payment_intent_ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "type": "NFE"
}
```

Emite múltiplas notas fiscais de uma vez.

### 5. Listar Todas as Notas Fiscais

```bash
GET /api/invoices?status=ISSUED&start_date=2025-01-01&limit=50
```

### 6. Cancelar Nota Fiscal

```bash
POST /api/invoices/:invoice_id/cancel
```

## 📝 Fluxo Recomendado

### Emissão Manual (via API)

1. **Listar vendas sem nota fiscal:**
   ```bash
   GET /api/invoices/sales-without-invoice
   ```

2. **Emitir em lote:**
   ```bash
   POST /api/invoices/batch-issue
   {
     "payment_intent_ids": ["id1", "id2", ...]
   }
   ```

### Emissão Automática (Futuro)

Pode ser implementado um job que:
- Roda periodicamente (ex: diariamente)
- Busca vendas pagas sem nota fiscal
- Emite automaticamente para todas

## 🔌 Integração com NFe.io

O sistema está preparado para integração com NFe.io. Para usar:

1. Crie uma conta em https://nfe.io
2. Obtenha sua API Key
3. Configure `NFE_IO_API_KEY` no `.env`
4. Configure `INVOICE_PROVIDER=NFE_IO`

### Dados Necessários no NFe.io

- CNPJ da empresa
- Certificado digital (A1 ou A3)
- Configuração de ambiente (homologação ou produção)

## 🔄 Outros Provedores

O sistema foi projetado para suportar múltiplos provedores. Para adicionar um novo:

1. Implemente a interface `InvoiceProvider` em `invoice.service.ts`
2. Adicione a lógica no método `getProvider()`
3. Configure as variáveis de ambiente necessárias

### Provedores Suportados

- ✅ **NFE_IO**: Implementado (requer configuração)
- ⏳ **Bling**: Pode ser implementado
- ⏳ **Tray Commerce**: Pode ser implementado
- ⏳ **API própria**: Pode ser implementado

## 📊 Status das Notas Fiscais

- **PENDING**: Invoice criada, aguardando emissão
- **ISSUED**: Nota fiscal emitida com sucesso
- **CANCELED**: Nota fiscal cancelada
- **ERROR**: Erro ao emitir (ver `error_message`)

## 🛠️ Troubleshooting

### Erro: "Provedor de nota fiscal não configurado"

- Verifique se `INVOICE_PROVIDER` está configurado
- Verifique se a API key do provedor está configurada
- Verifique se o provedor está implementado

### Erro: "Payment intent não encontrado"

- Verifique se o `payment_intent_id` existe
- Verifique se o pagamento está com status `PAID`

### Erro ao emitir nota fiscal

- Verifique os logs do servidor
- Verifique `error_message` e `error_details` na invoice
- Verifique se os dados do cliente estão completos (CPF, endereço)

## 📈 Próximos Passos

1. **Interface Web**: Criar página no dashboard para gerenciar notas fiscais
2. **Emissão Automática**: Job para emitir automaticamente após pagamento
3. **Notificação**: Enviar email com NFe para o cliente
4. **Relatórios**: Dashboard com estatísticas de emissão
5. **Integração Bling**: Adicionar suporte ao Bling

## 🔐 Permissões

- **FRANQUEADORA**: Pode listar, criar e emitir notas fiscais
- **SUPER_ADMIN**: Pode listar, criar, emitir e cancelar notas fiscais
- **FRANQUIA**: Pode listar e criar notas fiscais da sua unidade

## 📞 Suporte

Em caso de dúvidas:
1. Verifique os logs do servidor
2. Verifique a documentação do provedor de NFe
3. Consulte a tabela `invoices` no banco de dados


