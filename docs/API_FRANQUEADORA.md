# API da Franqueadora - Documentação Técnica

## Overview

Esta documentação descreve a API da franqueadora do sistema Meu Personal, projetada para gerenciar operações de franquias, pacotes, leads e estatísticas.

## Base URL

```
Produção: https://api.meupersonal.com.br/api/franqueadora
Desenvolvimento: http://localhost:3001/api/franqueadora
```

## Autenticação

Todas as requisições exigem autenticação via token JWT no header:

```
Authorization: Bearer <token_jwt>
```

O usuário deve ter a função de administrador da franqueadora (`franqueadora_admin`).

## Respostas

### Formato Padrão de Sucesso

```json
{
  "success": true,
  "data": {
    // dados da resposta
  },
  "pagination": { // para listas paginadas
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "cached": false // para respostas cacheadas
}
```

### Formato de Erro

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Descrição do erro",
  "details": {
    // detalhes adicionais do erro
  }
}
```

## Endpoints

### 1. Contexto da Franqueadora

#### GET `/me`

Obtém informações da franqueadora do admin atual.

**Response:**
```json
{
  "success": true,
  "data": {
    "franqueadora": {
      "id": "uuid",
      "name": "Nome da Franqueadora",
      "email": "contato@franqueadora.com",
      "created_at": "2024-01-01T00:00:00Z",
      // outros campos...
    }
  }
}
```

---

### 2. Pacotes de Franquia (Franchise Packages)

#### GET `/packages`

Lista pacotes de franquia com paginação e filtros.

**Query Parameters:**
- `page` (number): Página atual (default: 1)
- `limit` (number): Itens por página (default: 20, max: 100)
- `sortBy` (string): Campo de ordenação
- `sortOrder` (string): Ordem (asc/desc, default: asc)
- `is_active` (boolean): Filtrar por status ativo
- `name` (string): Filtrar por nome
- `investment_amount` (number): Filtrar por valor de investimento

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Package Basic",
      "description": "Descrição do pacote",
      "investment_amount": 10000,
      "is_active": true,
      "franqueadora_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### POST `/packages`

Cria um novo pacote de franquia.

**Request Body:**
```json
{
  "name": "Package Premium",
  "description": "Descrição detalhada",
  "investment_amount": 25000,
  "features": ["Feature 1", "Feature 2"],
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "package": {
      "id": "uuid",
      "name": "Package Premium",
      // outros campos...
    }
  }
}
```

#### PUT `/packages/:id`

Atualiza um pacote existente.

**Parâmetros de URL:**
- `id` (uuid): ID do pacote

**Request Body:** Mesmo formato do POST

#### DELETE `/packages/:id`

Desativa um pacote (soft delete).

**Parâmetros de URL:**
- `id` (uuid): ID do pacote

**Response:** 204 No Content

---

### 3. Leads

#### GET `/leads`

Lista leads com paginação e filtros.

**Query Parameters:**
- `page` (number): Página atual
- `limit` (number): Itens por página
- `sortBy` (string): Campo de ordenação
- `sortOrder` (string): Ordem (desc/asc, default: desc)
- `status` (string): Filtrar por status
- `name` (string): Filtrar por nome
- `email` (string): Filtrar por email
- `phone` (string): Filtrar por telefone
- `search` (string): Busca textual
- `startDate` (string): Data inicial (YYYY-MM-DD)
- `endDate` (string): Data final (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "phone": "+55 11 99999-9999",
      "status": "new",
      "franqueadora_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    // dados de paginação
  }
}
```

#### PUT `/leads/:id`

Atualiza um lead existente.

**Parâmetros de URL:**
- `id` (uuid): ID do lead

**Request Body:**
```json
{
  "name": "Nome Atualizado",
  "email": "novo@email.com",
  "phone": "+55 11 88888-8888",
  "status": "contacted",
  "notes": "Observações do contato"
}
```

---

### 4. Estatísticas da Academia

#### GET `/academies/:id/stats`

Obtém estatísticas detalhadas de uma academia.

**Parâmetros de URL:**
- `id` (uuid): ID da academia

**Response:**
```json
{
  "success": true,
  "data": {
    "academy": {
      "id": "uuid",
      "name": "Academia Central",
      "monthlyRevenue": 15000
    },
    "totalStudents": 150,
    "activeStudents": 120,
    "totalTeachers": 15,
    "activeTeachers": 15,
    "totalBookings": 500,
    "completedBookings": 450,
    "cancelledBookings": 50,
    "completionRate": 90.0,
    "averageRating": 4.5,
    "totalReviews": 100,
    "creditsBalance": 0,
    "plansActive": 80,
    "lastUpdated": "2024-01-01T00:00:00Z"
  },
  "cached": false
}
```

---

## Segurança

### Rate Limiting

- **Auth endpoints:** 5 requisições por minuto por IP
- **API geral:** 100 requisições por minuto por IP
- **Uploads:** 10 requisições por minuto por IP

Headers de rate limit:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### CORS

Apenas origens permitidas podem acessar a API:

- Produção: URLs configuradas em `CORS_ORIGINS`
- Desenvolvimento: localhost permitido

### Validação de Entrada

Todos os dados de entrada são validados usando Zod schemas:

- Tipos de dados obrigatórios
- Formatos de email e telefone
- Valores numéricos válidos
- Comprimentos máximos de strings

### Auditoria

Todas as operações críticas são auditadas:

- Ações: CREATE, UPDATE, DELETE, LOGIN, LOGOUT
- Recursos: users, academies, franchises, etc.
- IP, User-Agent, timestamp
- Sucesso/Falha da operação

## Performance

### Cache

Estatísticas de academia são cacheadas por 5 minutos.

### Paginação

Listas grandes suportam paginação com máximo de 100 itens por página.

### Consultas Otimizadas

- Índices apropriados em todas as tabelas
- Funções RPC para estatísticas complexas
- Consultas paralelas quando possível

## Códigos de Erro Comuns

| Código | Descrição |
|--------|-----------|
| `UNAUTHORIZED` | Token inválido ou ausente |
| `INSUFFICIENT_PERMISSIONS` | Usuário não tem permissão |
| `VALIDATION_ERROR` | Dados de entrada inválidos |
| `RESOURCE_NOT_FOUND` | Recurso não encontrado |
| `DUPLICATE_ENTRY` | Registro duplicado |
| `RATE_LIMIT_EXCEEDED` | Limite de requisições excedido |
| `NO_FRANQUEADORA_CONTEXT` | Contexto da franqueadora não encontrado |

## Exemplos de Uso

### JavaScript/TypeScript

```typescript
// Buscar pacotes com filtros
const response = await fetch('/api/franqueadora/packages?page=1&limit=10&is_active=true', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
if (data.success) {
  console.log('Pacotes:', data.data)
}
```

### cURL

```bash
# Criar novo pacote
curl -X POST http://localhost:3001/api/franqueadora/packages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Package Basic",
    "description": "Pacote básico",
    "investment_amount": 10000,
    "is_active": true
  }'
```

## Monitoramento

### Logs de Auditoria

Os logs podem ser consultados via:

```sql
SELECT * FROM audit_logs 
WHERE franqueadora_id = 'uuid' 
ORDER BY timestamp DESC 
LIMIT 100;
```

### Health Check

```
GET /health
```

Retorna status do servidor e timestamp.

---

## Suporte

Para dúvidas ou problemas, contate a equipe técnica em:
- Email: tech@meupersonal.com.br
- Documentação atualizada em: docs.meupersonal.com.br