# Validação de CPF

## Validação em Duas Camadas

O sistema implementa validação de CPF em duas camadas:

### 1. Validação Local (Sempre Ativa)
- Verifica se o CPF tem 11 dígitos
- Valida os dígitos verificadores usando o algoritmo brasileiro
- Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
- **Esta validação sempre ocorre e é obrigatória**

### 2. Validação via API Externa (Opcional)
- Consulta APIs externas para verificar se o CPF existe na Receita Federal
- Confirma se o CPF está ativo e registrado oficialmente
- **Esta validação é opcional e pode ser habilitada via variável de ambiente**

## Configuração

### Habilitar Validação via API

Adicione no arquivo `.env`:

```env
# Habilitar validação via API externa
ENABLE_CPF_API_VALIDATION=true

# URL da API de validação (opcional, tem valor padrão)
CPF_VALIDATION_API_URL=https://brasilapi.com.br/api/cpf/v1
```

### APIs Disponíveis

#### 1. Brasil API (Recomendada - Gratuita)
```env
CPF_VALIDATION_API_URL=https://brasilapi.com.br/api/cpf/v1
```
- **Gratuita**
- **Rate limit**: Generoso
- **Formato**: `GET /api/cpf/v1/{cpf}`
- **Resposta**: `{ cpf: '...', nome: '...', nascimento: '...' }` ou erro

#### 2. ReceitaWS (Gratuita, mas com limitações)
```env
CPF_VALIDATION_API_URL=https://www.receitaws.com.br/v1/cpf
```
- **Gratuita**
- **Rate limit**: Restritivo (3 consultas/minuto)
- **Formato**: `GET /v1/cpf/{cpf}`
- **Resposta**: `{ status: 'OK' }` ou `{ status: 'ERROR', message: '...' }`

#### 3. CPF/CNPJ API (Paga, mais confiável)
```env
CPF_VALIDATION_API_URL=https://www.cpfcnpj.com.br/api/{cpf}
```
- **Paga** (planos disponíveis)
- **Mais confiável**
- Requer API key

#### 4. Serpro (Oficial, requer cadastro)
- API oficial do governo
- Requer cadastro e credenciais
- Mais confiável, mas processo de cadastro mais complexo

## Comportamento

### Quando `ENABLE_CPF_API_VALIDATION=false` (Padrão)
- Apenas valida dígitos verificadores localmente
- Mais rápido
- Não confirma se CPF existe na Receita Federal
- Aceita qualquer CPF com dígitos válidos

### Quando `ENABLE_CPF_API_VALIDATION=true`
1. Primeiro valida dígitos verificadores localmente
2. Se válido, consulta API externa
3. Se API confirmar que CPF existe → aceita
4. Se API retornar erro → rejeita
5. Se API falhar/timeout → aceita (fallback para não bloquear cadastros)

## Tratamento de Erros

- **API indisponível**: Aceita CPF se dígitos estão corretos (não bloqueia cadastro)
- **Timeout**: Aceita CPF se dígitos estão corretos
- **CPF não encontrado**: Rejeita o cadastro
- **Rate limit**: Aceita CPF se dígitos estão corretos (não bloqueia)

## Recomendações

1. **Desenvolvimento/Teste**: Deixe `ENABLE_CPF_API_VALIDATION=false`
2. **Produção**: Habilite `ENABLE_CPF_API_VALIDATION=true` para maior segurança
3. **API Recomendada**: Brasil API (gratuita e confiável)
4. **Para alta demanda**: Considere APIs pagas como CPF/CNPJ API

## Exemplo de Uso

```typescript
import { validateCpfWithAPI } from '../utils/validation'

// Validar CPF
const result = await validateCpfWithAPI('123.456.789-00')
if (!result.valid) {
  console.error('CPF inválido:', result.error)
}
```

