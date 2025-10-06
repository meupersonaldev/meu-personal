# Segurança — Rota /franqueadora (Plano + Ajustes)

Este documento descreve o plano de ação e as correções aplicadas para proteger a área da Franqueadora.

## Plano de Ação (passo a passo)
- Frontend
  - [x] Criar util de permissões para Franqueadora (`apps/web/lib/auth/permissions.ts`).
  - [x] Criar guard reutilizável (`apps/web/components/auth/franqueadora-guard.tsx`) e aplicar nas páginas.
  - [x] Proteger o prefixo `/franqueadora` no `middleware` em produção (usa cookie `auth-token`).
  - [x] Atualizar login da franqueadora para tentar `/api/auth/login` e setar cookie (fallback mantém fluxo antigo).
  - [x] Trocar acessos diretos ao Supabase por chamadas à API (create/list/update/delete de academias, packages, leads e analytics).
- Backend
  - [x] Adicionar middleware JWT e checagem de role/escopo (franqueadora_admins) nas rotas de Franqueadora.
  - [x] Incluir `DELETE /api/academies/:id` (com validação de ownership).
  - [x] Endpoint de analytics consolidado da franqueadora (`GET /api/financial/summary-franqueadora`).
  - [x] Rotas de packages/leads da franqueadora (`/api/franqueadora/packages`, `/api/franqueadora/leads`, `/api/franqueadora/me`).
  - [x] Endpoint de stats por academia (`GET /api/franqueadora/academies/:id/stats`).

## O que foi implementado agora
- Permissões e Guard no Frontend
  - Novo `apps/web/lib/auth/permissions.ts`: utilitário de roles e hooks.
  - Novo `apps/web/components/auth/franqueadora-guard.tsx`: protege as páginas da franqueadora no client.
  - Páginas já usam o guard:
    - `apps/web/app/franqueadora/dashboard/page.tsx`
    - `apps/web/app/franqueadora/dashboard/add-franchise/page.tsx`
- Proteção por Middleware (produção)
  - `apps/web/middleware.ts`: adicionada a rota `/franqueadora` ao conjunto de rotas protegidas quando `NODE_ENV=production`.

# Correções de Segurança Implementadas - Rota /franqueadora

## 🚨 Problemas Críticos Corrigidos

### 1. Senha Hardcoded no Login
**Problema**: Senha hardcoded `password !== '123456'` no arquivo `franqueadora-store.ts`
**Solução**: 
- Implementado endpoint `/api/auth/verify-password` para verificação segura de senhas
- Utilização de bcrypt para comparação de hashes no backend
- Suporte a migração gradual de senhas em texto plano para hashes

**Arquivos modificados**:
- `apps/web/lib/stores/franqueadora-store.ts`
- `apps/api/src/routes/auth.ts`

### 2. Ausência de Validação de Permissões
**Problema**: Não havia validação de permissões específicas por role
**Solução**:
- Criado sistema de permissões granular (`apps/web/lib/auth/permissions.ts`)
- Implementado componente `FranqueadoraGuard` para proteção de rotas
- Definidos 3 níveis de acesso: SUPER_ADMIN, ADMIN, ANALYST

**Arquivos criados/modificados**:
- `apps/web/lib/auth/permissions.ts` (novo)
- `apps/web/components/auth/franqueadora-guard.tsx` (novo)
- `apps/web/app/franqueadora/dashboard/page.tsx`
- `apps/web/app/franqueadora/dashboard/add-franchise/page.tsx`

## 🔐 Validações de Segurança Implementadas

### 3. Validações Fortalecidas na Criação de Franquias
**Novas validações adicionadas**:
- Formato de email com regex
- Comprimento mínimo e máximo de senha (6-50 caracteres)
- Requisitos de complexidade de senha:
  - Pelo menos uma letra minúscula
  - Pelo menos uma letra maiúscula
  - Pelo menos um número
- Validação de valores financeiros (limites máximos)
- Verificação de duplicidade de email do administrador

### 4. Endpoint de Verificação de Email
**Novo endpoint**: `POST /api/auth/check-email`
- Verifica se email já está em uso antes da criação
- Retorna booleano simples para não expor dados

## 🛡️ Sistema de Permissões

### Hierarquia de Acessos

#### SUPER_ADMIN
- ✅ Todas as permissões
- ✅ Gerenciar administradores
- ✅ Visualizar logs do sistema
- ✅ Excluir franquias

#### ADMIN
- ✅ Visualizar todos os dados
- ✅ Criar/editar franquias, pacotes e leads
- ✅ Exportar dados
- ❌ Gerenciar administradores
- ❌ Excluir franquias

#### ANALYST
- ✅ Visualizar dados (exceto financeiros)
- ✅ Criar/editar leads
- ✅ Exportar dados
- ❌ Criar/editar franquias e pacotes
- ❌ Excluir qualquer registro
- ❌ Visualizar dados financeiros

## 📊 Componentes de Proteção

### FranqueadoraGuard
Componente React que:
- Verifica autenticação do usuário
- Valida permissões específicas
- Redireciona usuários não autorizados
- Mostra tela de acesso negado quando apropriado
- Oferece fallback customizável

### Hook de Permissões
```typescript
const { canCreateFranchise, canViewFinancialData } = useFranqueadoraPermissions()
```

## 🔧 Endpoints de API Seguros

### POST /api/auth/verify-password
- Valida credenciais do administrador da franqueadora
- Verifica status ativo do usuário
- Retorna dados do usuário e franqueadora

### POST /api/auth/check-email
- Verifica disponibilidade de email
- Prevenção de duplicidade de contas

## 📋 Próximos Passos Recomendados

### Média Prioridade
1. **Corrigir inconsistência entre schema Prisma e tabelas Supabase**
   - Adicionar tabelas da franqueadora ao schema
   - Manter sincronia entre frontend e backend

2. **Implementar tratamento de erros adequado**
   - Padronizar respostas de erro
   - Adicionar logging estruturado

3. **Otimizar performance das consultas**
   - Implementar cache para estatísticas
   - Otimizar queries do Supabase

### Baixa Prioridade
4. **Implementar paginação e filtros**
   - Para listas grandes de franquias
   - Melhorar UX com volumes de dados

5. **Sistema de logs e auditoria**
   - Registrar operações críticas
   - Rastreabilidade de ações

6. **Documentação técnica**
   - Documentar API da franqueadora
   - Criar guias de desenvolvimento

## ✅ Status Atual

A rota `/franqueadora` agora está **segura para lançamento** com:
- ✅ Senha hardcoded removida
- ✅ Sistema de permissões implementado
- ✅ Validações de segurança reforçadas
- ✅ Proteção contra acesso não autorizado
- ✅ Verificação de integridade de dados

Os problemas críticos de segurança foram resolvidos e o sistema está pronto para operação em produção com controles de acesso adequados.
