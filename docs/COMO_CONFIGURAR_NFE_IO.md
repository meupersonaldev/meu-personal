# Como Configurar NFe.io para Emissão de Notas Fiscais

Este guia explica passo a passo como configurar o NFe.io para emitir notas fiscais reais no sistema.

## 📋 Pré-requisitos

1. **CNPJ ativo** da empresa
2. **Certificado digital** (A1 ou A3) - pode ser obtido em certificadoras como Serasa, Certisign, etc.
3. **Conta no NFe.io** - [Criar conta](https://app.nfe.io/signup)

## 🚀 Passo a Passo

### 1. Criar Conta no NFe.io

1. Acesse [https://app.nfe.io/signup](https://app.nfe.io/signup)
2. Preencha os dados e crie sua conta
3. Confirme o email

### 2. Obter API Key

1. Faça login no [painel do NFe.io](https://app.nfe.io)
2. Vá em **Conta** → **Chaves de Acesso**
3. Copie a **"Chave de Nota Fiscal"** (API Key)
4. Esta chave será usada para autenticar as requisições

### 3. Cadastrar Empresa

1. No painel do NFe.io, vá em **Empresas**
2. Clique em **"Criar Empresa"**
3. Preencha todos os dados:
   - Razão Social
   - CNPJ
   - Endereço completo
   - Regime tributário
   - Inscrição municipal (se aplicável)
4. Salve e anote o **ID da empresa** (se necessário)

### 4. Configurar Certificado Digital

1. Na empresa criada, vá em **Certificados**
2. Faça upload do certificado digital (formato .pfx ou .pem)
3. Informe a senha do certificado
4. Aguarde a validação

### 5. Configurar no Backend

Adicione no arquivo `.env` do backend (`apps/api/.env`):

```env
# Notas Fiscais - NFe.io
INVOICE_PROVIDER=NFE_IO
NFE_IO_API_KEY=sua_chave_aqui
# Opcional: se tiver múltiplas empresas, especifique o ID
# NFE_IO_COMPANY_ID=seu_company_id_aqui
```

### 6. Reiniciar Servidor

Após adicionar as variáveis, reinicie o servidor backend:

```bash
cd apps/api
npm run dev
```

## ✅ Verificar Configuração

Para testar se está funcionando:

1. Acesse a interface de notas fiscais
2. Tente emitir uma nota fiscal para uma venda paga
3. Verifique os logs do servidor para ver se há erros

## 🔍 Troubleshooting

### Erro: "NFE_IO_API_KEY não configurada"

**Solução:**
- Verifique se adicionou `NFE_IO_API_KEY` no `.env`
- Reinicie o servidor após adicionar
- Verifique se não há espaços extras na chave

### Erro: "Empresa não encontrada"

**Solução:**
- Verifique se cadastrou a empresa no NFe.io
- Se tiver múltiplas empresas, configure `NFE_IO_COMPANY_ID
- Verifique se a API key tem permissão para acessar a empresa

### Erro: "Certificado digital não configurado"

**Solução:**
- Faça upload do certificado digital no painel do NFe.io
- Verifique se o certificado não está expirado
- Confirme que a senha está correta

### Erro: "CPF inválido"

**Solução:**
- Verifique se o CPF do cliente está completo (11 dígitos)
- Certifique-se de que o CPF está no formato correto (apenas números)

### Erro 401 (Unauthorized)

**Solução:**
- Verifique se a API key está correta
- Confirme que copiou a chave completa
- Verifique se a chave não expirou

### Erro 400 (Bad Request)

**Solução:**
- Verifique os logs do servidor para ver o erro específico
- Confirme que todos os dados obrigatórios estão preenchidos
- Verifique o formato dos dados (CPF, valores, etc.)

## 📞 Suporte

- **Documentação NFe.io**: [https://nfe.io/docs](https://nfe.io/docs)
- **Suporte NFe.io**: Através do painel ou email
- **Logs do servidor**: Verifique `apps/api` para erros detalhados

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- Nunca commite a `NFE_IO_API_KEY` no Git
- Mantenha o arquivo `.env` no `.gitignore`
- Use variáveis de ambiente em produção
- Rotacione a API key periodicamente

## 💰 Custos

O NFe.io cobra por nota fiscal emitida. Verifique os planos em:
[https://nfe.io/pricing](https://nfe.io/pricing)

Para testes, você pode usar o ambiente de homologação (gratuito, mas as notas não são válidas).


