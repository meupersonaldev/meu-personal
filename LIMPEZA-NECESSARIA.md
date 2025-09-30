# 🧹 LIMPEZA NECESSÁRIA DO PROJETO

## ❌ TABELAS DO SUPABASE NÃO UTILIZADAS

### 1. **royalty_payments** (0 rows)
- ❌ Não possui rotas na API
- ❌ Não é referenciada no frontend
- **AÇÃO**: Dropar tabela

### 2. **student_subscriptions** (0 rows)
- ❌ Não possui rotas específicas na API
- ❌ Não é usada no frontend
- ❌ Referencia `student_plans` (que também não é usada corretamente)
- **AÇÃO**: Dropar tabela

### 3. **teacher_subscriptions** (0 rows)
- ❌ Não possui rotas específicas na API
- ❌ Não é usada no frontend
- **AÇÃO**: Dropar tabela

### 4. **notifications** (0 rows) - TABELA DUPLICADA
- ⚠️ Existe `franchise_notifications` que é a correta
- ❌ Esta tabela genérica não é usada
- **AÇÃO**: Dropar tabela

### 5. **student_plans** (3 rows)
- ⚠️ Usada em `apps/api/src/routes/plans.ts`
- ⚠️ Mas o correto é usar `academy_plans` (que já existe e está sendo usado)
- **PROBLEMA**: Duplicação de conceito
- **AÇÃO**: Verificar se pode migrar dados para `academy_plans` e dropar

### 6. **teacher_plans** (0 rows)
- ✅ Tem rota na API (`/api/plans/teachers`)
- ✅ É referenciado no store da franquia
- ⚠️ MAS não é usado de forma efetiva no MVP
- **AÇÃO**: Manter por enquanto (feature futura)

---

## ❌ ARQUIVOS OBSOLETOS NO FRONTEND

### Stores duplicados:
```
apps/web/lib/stores/auth-store-old.ts          ❌ REMOVER
apps/web/lib/stores/auth-store-supabase.ts     ❌ REMOVER
apps/web/lib/stores/simple-auth-store.ts       ❌ REMOVER
```
**Manter apenas**: `auth-store.ts` (consolidado)

### Páginas temporárias/versões antigas:
```
apps/web/app/cadastro/page_clean.tsx           ❌ REMOVER
apps/web/app/cadastro/page_figma.tsx           ❌ REMOVER
apps/web/app/cadastro/page_new.tsx             ❌ REMOVER
apps/web/app/franquia/page-old.tsx             ❌ REMOVER
apps/web/app/professor/dashboard/page-new.tsx  ❌ REMOVER
apps/web/app/professor/dashboard/page_new.tsx  ❌ REMOVER
apps/web/app/professor/dashboard/page-clean.tsx ❌ REMOVER (se existir)
```

### Componentes de layout duplicados:
```
apps/web/components/layout/professor-layout-new.tsx     ❌ REMOVER
apps/web/components/layout/professor-sidebar-new.tsx    ❌ REMOVER
```
**Manter apenas**: `professor-layout.tsx` e `professor-sidebar.tsx`

---

## ❌ ROTAS DA API NÃO UTILIZADAS OU INCOMPLETAS

### Verificar e possivelmente remover:

1. **apps/api/src/routes/plans.ts**
   - ⚠️ Tem rotas para `student_plans` e `teacher_plans`
   - ✅ Mas `teacher_plans` é usado no store da franquia
   - ❌ `student_plans` deveria ser `academy_plans`
   - **AÇÃO**: Refatorar para usar `academy_plans`

2. **apps/api/src/routes/notifications.ts**
   - ⚠️ Verifica se usa a tabela `notifications` (genérica) ou `franchise_notifications`
   - **AÇÃO**: Verificar e consolidar

---

## ❌ SCHEMA ANTIGO

```
supabase-schema.sql  ❌ REMOVER (obsoleto)
```
**Manter apenas**: `supabase-schema-complete.sql`

---

## 📋 RESUMO DE AÇÕES

### 1. DROPAR TABELAS DO SUPABASE:
```sql
DROP TABLE IF EXISTS royalty_payments CASCADE;
DROP TABLE IF EXISTS student_subscriptions CASCADE;
DROP TABLE IF EXISTS teacher_subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;  -- Usar franchise_notifications
DROP TABLE IF EXISTS student_plans CASCADE;  -- Usar academy_plans
```

### 2. REMOVER ARQUIVOS:
```bash
# Stores obsoletos
rm apps/web/lib/stores/auth-store-old.ts
rm apps/web/lib/stores/auth-store-supabase.ts
rm apps/web/lib/stores/simple-auth-store.ts

# Páginas temporárias
rm apps/web/app/cadastro/page_clean.tsx
rm apps/web/app/cadastro/page_figma.tsx
rm apps/web/app/cadastro/page_new.tsx
rm apps/web/app/franquia/page-old.tsx
rm apps/web/app/professor/dashboard/page-new.tsx
rm apps/web/app/professor/dashboard/page_new.tsx

# Layouts duplicados
rm apps/web/components/layout/professor-layout-new.tsx
rm apps/web/components/layout/professor-sidebar-new.tsx

# Schema antigo
rm supabase-schema.sql
```

### 3. REFATORAR:
- [ ] Atualizar `apps/api/src/routes/plans.ts` para usar `academy_plans` em vez de `student_plans`
- [ ] Verificar `apps/api/src/routes/notifications.ts` se usa tabela correta
- [ ] Atualizar stores se necessário

---

## ⚠️ MANTER (Features Futuras)

### Tabelas:
- ✅ `teacher_plans` - Para sistema de créditos de professores
- ✅ `approval_requests` - Sistema de aprovações
- ✅ `franchise_notifications` - Notificações das franquias

### Arquivos:
- ✅ Todos os arquivos sem sufixo `-old`, `-new`, `_clean`, `_figma`

---

## 🎯 RESULTADO ESPERADO

- ✅ 5 tabelas removidas do Supabase
- ✅ 11 arquivos removidos do frontend
- ✅ 1 schema antigo removido
- ✅ Código 100% limpo e sem duplicações
- ✅ Apenas código em uso permanece no projeto