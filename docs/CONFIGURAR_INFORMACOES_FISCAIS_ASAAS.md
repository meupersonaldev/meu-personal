# Como Configurar Informações Fiscais no ASAAS

## ⚠️ Erro Comum

Se você recebeu o erro:
> "Você precisa informar suas informações fiscais antes de emitir notas fiscais de serviço"

Isso significa que a **franqueadora** precisa configurar as informações fiscais no painel do ASAAS antes de poder emitir notas fiscais.

## 🔧 Passo a Passo

### 1. Acessar o Painel do ASAAS

1. Acesse [https://www.asaas.com](https://www.asaas.com)
2. Faça login com as credenciais da **franqueadora**
3. Certifique-se de estar logado na conta correta (da franqueadora, não de uma unidade)

### 2. Configurar Informações Fiscais

1. No menu lateral, clique em **"Notas Fiscais"**
2. Clique em **"Configurações"**
3. Preencha todas as informações solicitadas:

#### Dados da Empresa (Franqueadora)
- ✅ **CNPJ** da franqueadora
- ✅ **Razão Social**
- ✅ **Nome Fantasia**
- ✅ **Endereço completo** (rua, número, complemento, bairro, cidade, estado, CEP)
- ✅ **Telefone**

#### Informações Fiscais
- ✅ **Inscrição Municipal** (obrigatório para NFS-e)
- ✅ **Código CNAE** (se aplicável)
- ✅ **Regime Especial de Tributação** (se aplicável)

#### Certificado Digital
- ✅ **Certificado Digital A1** (formato .p12 ou .pfx)
  - Algumas prefeituras exigem certificado digital
  - Outras usam usuário/senha do portal da prefeitura
  - Verifique os requisitos da sua prefeitura

#### Dados de Acesso à Prefeitura
- ✅ **Usuário** do portal da prefeitura (se não usar certificado)
- ✅ **Senha** do portal da prefeitura (se não usar certificado)
- ✅ **Token de autenticação** (se aplicável)

### 3. Cadastrar Serviços

1. Ainda em **"Notas Fiscais" → "Configurações"**
2. Vá em **"Serviços"** ou **"Cadastrar Serviços"**
3. Adicione os serviços que você oferece:
   - **Código de Serviço Municipal** (NBS - Nomenclatura Brasileira de Serviços)
   - **Descrição do Serviço**
   - **Alíquota de ISS** (Imposto Sobre Serviços)
   - **Código CNAE** (se aplicável)

#### Exemplos de Códigos NBS para Personal Training:
- **1401** - Serviços de personal trainer
- **1402** - Serviços de treinamento físico
- **1403** - Serviços de orientação física

### 4. Homologação na Prefeitura

⚠️ **IMPORTANTE:** Você precisa estar **homologado** na prefeitura do seu município para emitir NFS-e.

1. Verifique se sua empresa está homologada na prefeitura
2. Se não estiver, siga o processo de homologação:
   - Acesse o portal da prefeitura
   - Preencha o cadastro
   - Aguarde aprovação
3. Após homologação, configure no ASAAS:
   - Usuário e senha do portal
   - Ou faça upload do certificado digital

### 5. Configurar Emissão Automática (Opcional)

1. Em **"Notas Fiscais" → "Configurações"**
2. Ative **"Emissão Automática"**
3. Configure:
   - Emitir automaticamente após pagamento confirmado
   - Serviço padrão a ser usado
   - Outras preferências

## ✅ Verificar Configuração

Após configurar, verifique se está tudo certo:

1. **Teste de Emissão:**
   - Vá em **"Pagamentos"**
   - Selecione um pagamento pago
   - Clique em **"Emitir Nota Fiscal"**
   - Se funcionar, está configurado corretamente!

2. **Verificar Logs:**
   - Se ainda der erro, verifique os logs do servidor
   - Veja qual informação está faltando

## 🔍 Troubleshooting

### Erro: "Inscrição Municipal não encontrada"

**Solução:**
- Verifique se a inscrição municipal está correta
- Confirme que está ativa na prefeitura
- Verifique se está cadastrada no ASAAS

### Erro: "Certificado Digital inválido"

**Solução:**
- Verifique se o certificado não está expirado
- Confirme que a senha está correta
- Tente fazer upload novamente

### Erro: "Serviço não cadastrado"

**Solução:**
- Cadastre o serviço em "Notas Fiscais → Configurações → Serviços"
- Use o código NBS correto
- Verifique se a alíquota de ISS está correta

### Erro: "Não homologado na prefeitura"

**Solução:**
- Complete o processo de homologação na prefeitura
- Aguarde a aprovação
- Configure os dados de acesso no ASAAS

## 📋 Checklist de Configuração

- [ ] CNPJ da franqueadora cadastrado
- [ ] Endereço completo preenchido
- [ ] Inscrição Municipal informada
- [ ] Certificado Digital configurado (se exigido)
- [ ] Serviços cadastrados com códigos NBS
- [ ] Homologação na prefeitura concluída
- [ ] Teste de emissão funcionando

## 📞 Suporte

- **ASAAS**: [Central de Ajuda](https://ajuda.asaas.com)
- **Documentação**: [Como configurar notas fiscais](https://ajuda.asaas.com/pt-BR/articles/32087943589403-Como-configurar-a-emiss%C3%A3o-de-notas-fiscais-e-cadastrar-meus-servi%C3%A7os-no-Asaas)
- **Suporte ASAAS**: Através do painel ou email

## 💡 Dica

Após configurar, as notas fiscais podem ser emitidas:
- **Automaticamente** (se configurado)
- **Pelo painel** (manual)
- **Via API** (se o ASAAS disponibilizar)

Lembre-se: A emissão de notas fiscais é de responsabilidade da **franqueadora**, não das unidades individuais.


