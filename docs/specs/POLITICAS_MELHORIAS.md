# Spec: Melhorias no Sistema de Políticas da Franqueadora

## Visão Geral

Implementar 3 funcionalidades para melhorar o gerenciamento de políticas:
1. **Notificação às Franquias** - Email automático quando nova política é publicada
2. **Rollback de Versão** - Reverter para uma versão anterior publicada
3. **Validação de Conflitos** - Alertar sobre overrides inválidos antes de publicar

---

## 1. Notificação às Franquias

### Objetivo
Quando uma nova política é publicada, enviar email para todas as franquias (academias) ativas da franqueadora informando sobre as mudanças.

### Backend

#### Endpoint Modificado
`POST /api/franchisor/policies/publish`

#### Fluxo
1. Publicar política (já existente)
2. Buscar todas as academias ativas da franqueadora
3. Para cada academia com email válido, enviar notificação
4. Registrar envios no log de emails

#### Dados do Email
```typescript
interface PolicyNotificationData {
  academyName: string
  franqueadoraName: string
  version: number
  effectiveFrom: string // data formatada
  changedFields: Array<{
    field: string
    label: string
    oldValue: number
    newValue: number
  }>
  dashboardUrl: string
}
```

#### Template de Email
- Slug: `policy-published`
- Assunto: "Nova Política de Operação - Versão {version}"
- Conteúdo: Lista de campos alterados, data de vigência, link para dashboard

### Frontend

#### Checkbox na Publicação
- Adicionar checkbox "Notificar franquias por email" (default: true)
- Mostrar quantidade de franquias que serão notificadas

#### Parâmetro Adicional
```typescript
POST /api/franchisor/policies/publish
Body: {
  effective_from?: string
  notify_franchises?: boolean // novo
}
```

---

## 2. Rollback de Versão

### Objetivo
Permitir que a franqueadora reverta para uma versão anterior da política publicada.

### Backend

#### Novo Endpoint
`POST /api/franchisor/policies/rollback`

#### Request
```typescript
{
  target_version: number // versão para a qual reverter
  comment?: string // motivo do rollback
}
```

#### Response
```typescript
{
  success: true
  data: FranchisorPolicy // nova política criada
  rolledBackFrom: number // versão anterior
  rolledBackTo: number // versão alvo
}
```

#### Fluxo
1. Validar que `target_version` existe e é publicada
2. Buscar política da versão alvo
3. Criar nova versão publicada com os valores da versão alvo
4. Incrementar número da versão (não reutilizar)
5. Registrar no histórico com flag `is_rollback: true`
6. Opcionalmente notificar franquias

#### Regras de Negócio
- Não pode fazer rollback para versão draft
- Não pode fazer rollback para a versão atual
- Manter histórico completo (não deletar versões)
- Nova versão criada recebe `rollback_from_version` e `rollback_to_version`

### Alterações no Schema

```sql
ALTER TABLE franchisor_policies 
ADD COLUMN IF NOT EXISTS is_rollback boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rollback_from_version integer,
ADD COLUMN IF NOT EXISTS rollback_to_version integer;
```

### Frontend

#### Aba Histórico
- Adicionar botão "Reverter" em cada versão (exceto a atual)
- Modal de confirmação com:
  - Resumo das diferenças entre versão atual e versão alvo
  - Campo de comentário (opcional)
  - Checkbox para notificar franquias
- Badge "Rollback" nas versões que foram criadas por rollback

---

## 3. Validação de Conflitos

### Objetivo
Antes de publicar uma política, verificar se algum override de academia ficará inválido com os novos limites.

### Backend

#### Novo Endpoint
`GET /api/franchisor/policies/validate-conflicts`

#### Query Params
```typescript
{
  use_draft?: boolean // true = validar contra draft, false = contra publicada
}
```

#### Response
```typescript
{
  success: true
  conflicts: Array<{
    academyId: string
    academyName: string
    field: string
    fieldLabel: string
    currentValue: number
    policyMin?: number
    policyMax?: number
    error: string
  }>
  academiesChecked: number
  academiesWithOverrides: number
}
```

#### Fluxo
1. Buscar política (draft ou publicada)
2. Buscar todas as academias da franqueadora
3. Buscar overrides de cada academia
4. Para cada override, validar se está dentro dos limites
5. Retornar lista de conflitos

### Frontend

#### Antes de Publicar
1. Chamar endpoint de validação
2. Se houver conflitos, mostrar modal de alerta:
   - Lista de academias com problemas
   - Campos conflitantes e valores
   - Opções:
     - "Cancelar" - não publicar
     - "Publicar mesmo assim" - publicar ignorando conflitos
     - "Corrigir overrides" - redirecionar para aba Unidades

#### Indicador Visual
- Na aba "Rascunho", mostrar badge de alerta se houver conflitos
- Tooltip explicando o problema

---

## Tarefas de Implementação

### Fase 1: Backend (Estimativa: 2-3h)

#### 1.1 Validação de Conflitos
- [ ] Criar constante `POLICY_FIELDS` com labels e limites
- [ ] Criar função `validateOverrideValue(field, value)`
- [ ] Criar endpoint `GET /validate-conflicts`
- [ ] Testes unitários

#### 1.2 Rollback
- [ ] Criar migration para novos campos
- [ ] Criar endpoint `POST /rollback`
- [ ] Atualizar endpoint `GET /history` para incluir info de rollback
- [ ] Testes unitários

#### 1.3 Notificação
- [ ] Criar template de email `policy-published`
- [ ] Modificar endpoint `POST /publish` para aceitar `notify_franchises`
- [ ] Implementar envio em batch
- [ ] Testes unitários

### Fase 2: Frontend (Estimativa: 2-3h)

#### 2.1 Validação de Conflitos
- [ ] Criar hook `usePolicyConflicts()`
- [ ] Criar componente `ConflictsAlert`
- [ ] Integrar na aba Rascunho
- [ ] Modal de confirmação antes de publicar

#### 2.2 Rollback
- [ ] Adicionar botão "Reverter" no histórico
- [ ] Criar modal `RollbackConfirmDialog`
- [ ] Mostrar badge de rollback no histórico

#### 2.3 Notificação
- [ ] Adicionar checkbox na publicação
- [ ] Mostrar contador de franquias

### Fase 3: Testes e Refinamentos (Estimativa: 1h)

- [ ] Testar fluxo completo de publicação com notificação
- [ ] Testar rollback e verificar histórico
- [ ] Testar validação de conflitos com overrides reais
- [ ] Ajustes de UX baseados em feedback

---

## Arquivos a Modificar

### Backend
- `apps/api/src/routes/franchisor-policies.ts` - Novos endpoints
- `apps/api/migrations/YYYYMMDD_add_rollback_fields.sql` - Migration
- `apps/api/src/services/email-template.service.ts` - Template de email

### Frontend
- `apps/web/app/franqueadora/dashboard/politicas/page.tsx` - UI principal
- `apps/web/components/policies/ConflictsAlert.tsx` - Novo componente
- `apps/web/components/policies/RollbackConfirmDialog.tsx` - Novo componente

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Envio de muitos emails | Média | Alto | Rate limiting, envio em batch |
| Rollback para versão com conflitos | Baixa | Médio | Validar conflitos antes do rollback |
| Performance com muitas academias | Baixa | Médio | Paginação, cache |

---

## Critérios de Aceite

### Notificação
- [ ] Email enviado para todas as franquias ativas
- [ ] Email contém lista de campos alterados
- [ ] Checkbox funciona para desabilitar envio
- [ ] Log de emails registrado

### Rollback
- [ ] Pode reverter para qualquer versão anterior
- [ ] Nova versão é criada (não sobrescreve)
- [ ] Histórico mostra badge de rollback
- [ ] Comentário é salvo

### Validação de Conflitos
- [ ] Detecta overrides fora dos limites
- [ ] Modal mostra lista de conflitos
- [ ] Permite publicar mesmo com conflitos
- [ ] Badge de alerta na aba Rascunho
