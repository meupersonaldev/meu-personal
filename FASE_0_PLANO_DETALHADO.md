# Fase 0 - Hardening & Base - Plano Detalhado

## Objetivo
Consolidar a base de segurança e autenticação da API, removendo dependências do Supabase Auth e implementando JWT puro com RBAC canônico.

## Status Atual Identificado

### ✅ Já Implementado
- Middleware `requireAuth` com validação JWT
- Middleware `requireRole` com mapeamento parcial de roles
- Rate limiting por IP (auth, api, upload)
- CORS configurado com allowlist
- Cliente Supabase unificado em `apps/api/src/config/supabase.ts`

### ⚠️ Precisa de Ajustes
- Uso de Supabase Auth em endpoints específicos (reset de senha)
- Mapeamento de roles não está 100% canônico
- Timezone não configurado globalmente
- Algumas rotas ainda usam `academies` em vez de `units`

## Ações Específicas

### 1. Remover Dependências de Supabase Auth

**Arquivo: `apps/api/src/routes/auth.ts`**
- **Linha 289-291**: Substituir `supabase.auth.resetPasswordForEmail()` por envio de email via Resend
- **Linha 330**: Remover `supabase.auth.getUser(token)`
- **Linha 337-338**: Remover `supabase.auth.admin.updateUserById()`

**Solução:**
```typescript
// Implementar fluxo de reset de senha com token JWT
// 1. Gerar token único com expiração curta
// 2. Salvar hash do token na tabela users
// 3. Enviar email com link contendo token
// 4. Validar token e permitir troca de senha
```

### 2. Atualizar Middleware requireRole para Roles Canônicos

**Arquivo: `apps/api/src/middleware/auth.ts`**

**Mapeamento Atual (parcial):**
```typescript
const mapCanonical = (role?: string) => {
  if (!role) return undefined
  const r = role.toUpperCase()
  switch (r) {
    case 'ALUNO': return 'STUDENT'
    case 'PROFESSOR': return 'TEACHER'
    case 'FRANQUEADORA': return 'FRANCHISOR'
    case 'FRANQUIA': return 'FRANCHISE_ADMIN'
    default: return r
  }
}
```

**Ajuste Necessário:**
- Garantir que todos os endpoints usem roles canônicos
- Adicionar validação para roles não mapeados
- Implementar fallback seguro para roles desconhecidos

### 3. Mapear Rotas com Autenticação

**Rotas que usam `requireAuth`:**
- `/api/notifications/stream`
- `/api/franqueadora/*`
- `/api/franchises/*`
- `/api/financial/*`
- `/api/academies/*`

**Rotas que precisam de `requireRole`:**
- **ALUNO**: `/api/student/*`, `/api/bookings` (criar reserva)
- **PROFESSOR**: `/api/professors/me`, `/api/availability`
- **FRANQUIA**: `/api/units/*` (CRUD)
- **FRANQUEADORA**: `/api/franchises/*`, `/api/franqueadora/*`

### 4. Configurar Timezone America/Sao_Paulo

**Arquivo: `apps/api/src/server.ts`**
```typescript
// Adicionar no início do arquivo
process.env.TZ = 'America/Sao_Paulo'

// Ou configurar no app.use()
app.use((req, res, next) => {
  req.timezone = 'America/Sao_Paulo'
  next()
})
```

### 5. Verificar Configuração CORS e Rate Limiting

**CORS (já implementado):**
- ✅ Allowlist configurada via `CORS_ORIGINS`
- ✅ Headers de segurança configurados
- ✅ Credentials habilitado

**Rate Limiting (já implementado):**
- ✅ Auth: 5 tentativas / 15 min
- ✅ API: 100 requisições / 15 min
- ✅ Upload: 10 uploads / 1 hora

### 6. Testar Autenticação JWT

**Fluxos para Testar:**
1. Login com JWT
2. Acesso a rotas protegidas
3. Refresh de token (se implementado)
4. Logout
5. Acesso com token expirado

## Arquivos a Modificar

### Principal
- `apps/api/src/routes/auth.ts` - Remover Supabase Auth
- `apps/api/src/middleware/auth.ts` - Ajustar requireRole
- `apps/api/src/server.ts` - Configurar timezone

### Secundário
- `apps/api/src/routes/franqueadora.ts` - Verificar roles
- `apps/api/src/routes/franchises.ts` - Verificar roles
- `apps/api/src/routes/academies.ts` - Verificar roles

## Riscos e Mitigações

### Risco 1: Quebra de fluxo de reset de senha
**Mitigação:** Implementar alternativa com Resend antes de remover Supabase Auth

### Risco 2: Mapeamento incorreto de roles
**Mitigação:** Testar todos os fluxos após atualização do middleware

### Risco 3: Timezone inconsistente
**Mitigação:** Configurar timezone globalmente e testar com datas/horas

## Critérios de Sucesso

- [ ] Nenhuma referência a `supabase.auth` na API
- [ ] Todos os endpoints usam roles canônicos
- [ ] Timezone America/Sao_Paulo configurado
- [ ] Todos os fluxos de autenticação testados
- [ ] Rate limiting funcionando corretamente

## Próximos Passos

1. Implementar fluxo de reset de senha com Resend
2. Atualizar middleware requireRole
3. Configurar timezone globalmente
4. Testar todos os fluxos de autenticação
5. Documentar mudanças

## Tempo Estimado: 1-2 dias

## Dependências
- Conta Resend configurada
- Variáveis de ambiente atualizadas
- Backup do banco de dados (antes de mudanças)