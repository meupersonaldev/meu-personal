# Integração de Planos com Asaas

## 📋 Visão Geral

Este guia explica como integrar os planos criados no dashboard da franquia com o sistema de pagamentos Asaas.

## 🎯 Objetivo

Quando você cria um plano no `/franquia/dashboard/planos`, ele deve:
1. Ser salvo no banco de dados (Supabase)
2. Ser criado no Asaas como um plano de assinatura
3. Receber um `asaas_plan_id` para vincular os dois sistemas
4. Permitir que alunos/professores assinem e paguem via Asaas

## 📊 Fluxo de Integração com Asaas

### ✅ Fluxo Implementado (Correto)
```
1. Franquia cria plano no dashboard
2. ✅ Plano é salvo no Supabase
3. ✅ Aluno/Professor compra o plano
4. ✅ Backend cria cobrança no Asaas (payment/subscription)
5. ✅ Asaas processa o pagamento
6. ✅ Webhook notifica o backend
7. ✅ Backend libera créditos/acesso
```

**Nota:** O Asaas não tem uma API para criar "planos" separadamente. Os planos são apenas catálogos no seu sistema. A cobrança é criada no momento da compra.

## 🔧 Implementação

### Passo 1: Atualizar o Backend (API)

#### 1.1 Adicionar método no AsaasService

**Arquivo:** `apps/api/src/services/asaas.service.ts`

```typescript
/**
 * Criar plano de assinatura no Asaas
 */
async createSubscriptionPlan(data: {
  name: string
  description: string
  value: number // Valor em reais
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
}) {
  try {
    const response = await this.client.post('/subscriptions/plans', {
      name: data.name,
      description: data.description,
      value: data.value,
      cycle: data.cycle,
      billingType: data.billingType
    })

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('Error creating Asaas subscription plan:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data || error.message
    }
  }
}

/**
 * Atualizar plano de assinatura no Asaas
 */
async updateSubscriptionPlan(planId: string, data: {
  name?: string
  description?: string
  value?: number
}) {
  try {
    const response = await this.client.put(`/subscriptions/plans/${planId}`, data)

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('Error updating Asaas subscription plan:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data || error.message
    }
  }
}

/**
 * Deletar plano de assinatura no Asaas
 */
async deleteSubscriptionPlan(planId: string) {
  try {
    await this.client.delete(`/subscriptions/plans/${planId}`)

    return {
      success: true
    }
  } catch (error: any) {
    console.error('Error deleting Asaas subscription plan:', error.response?.data || error.message)
    return {
      success: false,
      error: error.response?.data || error.message
    }
  }
}
```

#### 1.2 Atualizar rota de criação de planos

**Arquivo:** `apps/api/src/routes/plans.ts`

Encontre a rota `POST /api/plans/student` e atualize:

```typescript
// Criar plano para alunos
router.post('/student', async (req, res) => {
  try {
    const { 
      academy_id, 
      name, 
      description, 
      price, 
      credits_included, 
      validity_days,
      features 
    } = req.body

    // Validações
    if (!academy_id || !name || !price) {
      return res.status(400).json({ 
        error: 'academy_id, name e price são obrigatórios' 
      })
    }

    // 1. Criar plano no Asaas primeiro
    const asaasResult = await asaasService.createSubscriptionPlan({
      name: `${name} - Academia`,
      description: description || `Plano ${name}`,
      value: price,
      cycle: 'MONTHLY', // Ajuste conforme necessário
      billingType: 'UNDEFINED' // Permite qualquer forma de pagamento
    })

    if (!asaasResult.success) {
      console.error('Erro ao criar plano no Asaas:', asaasResult.error)
      return res.status(500).json({ 
        error: 'Erro ao criar plano no Asaas',
        details: asaasResult.error
      })
    }

    const asaas_plan_id = asaasResult.data.id

    // 2. Salvar plano no Supabase com asaas_plan_id
    const { data, error } = await supabase
      .from('academy_plans')
      .insert({
        academy_id,
        name,
        description,
        price,
        credits_included,
        validity_days,
        features: features || [],
        is_active: true,
        asaas_plan_id // ✅ Vincula com Asaas
      })
      .select()
      .single()

    if (error) {
      // Se falhar ao salvar no Supabase, deletar plano do Asaas
      await asaasService.deleteSubscriptionPlan(asaas_plan_id)
      throw error
    }

    res.json({ 
      plan: data,
      message: 'Plano criado com sucesso e integrado ao Asaas'
    })
  } catch (error) {
    console.error('Error creating student plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})
```

Faça o mesmo para `POST /api/plans/teacher`.

#### 1.3 Atualizar rota de atualização de planos

```typescript
// Atualizar plano de alunos
router.put('/student/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, credits_included, validity_days, features } = req.body

    // Buscar plano atual para pegar asaas_plan_id
    const { data: currentPlan } = await supabase
      .from('academy_plans')
      .select('asaas_plan_id')
      .eq('id', id)
      .single()

    // Se tem asaas_plan_id, atualizar no Asaas também
    if (currentPlan?.asaas_plan_id) {
      const asaasResult = await asaasService.updateSubscriptionPlan(
        currentPlan.asaas_plan_id,
        {
          name,
          description,
          value: price
        }
      )

      if (!asaasResult.success) {
        console.error('Erro ao atualizar plano no Asaas:', asaasResult.error)
        // Continua mesmo se falhar no Asaas (pode avisar o usuário)
      }
    }

    // Atualizar no Supabase
    const { data, error } = await supabase
      .from('academy_plans')
      .update({
        name,
        description,
        price,
        credits_included,
        validity_days,
        features
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ plan: data })
  } catch (error) {
    console.error('Error updating student plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})
```

#### 1.4 Atualizar rota de deleção de planos

```typescript
// Deletar plano de alunos
router.delete('/student/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Buscar plano para pegar asaas_plan_id
    const { data: plan } = await supabase
      .from('academy_plans')
      .select('asaas_plan_id')
      .eq('id', id)
      .single()

    // Se tem asaas_plan_id, deletar do Asaas também
    if (plan?.asaas_plan_id) {
      const asaasResult = await asaasService.deleteSubscriptionPlan(plan.asaas_plan_id)
      
      if (!asaasResult.success) {
        console.error('Erro ao deletar plano no Asaas:', asaasResult.error)
        // Continua mesmo se falhar no Asaas
      }
    }

    // Soft delete no Supabase (apenas desativa)
    const { error } = await supabase
      .from('academy_plans')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Plano desativado com sucesso' })
  } catch (error) {
    console.error('Error deleting student plan:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})
```

### Passo 2: Atualizar o Frontend (Dashboard)

#### 2.1 Mostrar status de integração Asaas

**Arquivo:** `apps/web/app/franquia/dashboard/planos/page.tsx`

Adicione um badge para mostrar se o plano está integrado:

```typescript
{plan.asaas_plan_id ? (
  <Badge className="bg-green-100 text-green-800">
    ✓ Integrado com Asaas
  </Badge>
) : (
  <Badge className="bg-yellow-100 text-yellow-800">
    ⚠ Não integrado
  </Badge>
)}
```

#### 2.2 Adicionar botão de sincronização manual

Para planos antigos que não têm `asaas_plan_id`:

```typescript
const syncWithAsaas = async (planId: string) => {
  try {
    const response = await fetch(
      `${API_URL}/api/plans/student/${planId}/sync-asaas`,
      { method: 'POST', credentials: 'include' }
    )

    if (!response.ok) throw new Error('Falha ao sincronizar')

    toast.success('Plano sincronizado com Asaas!')
    loadPlans()
  } catch (error) {
    toast.error('Erro ao sincronizar com Asaas')
  }
}
```

### Passo 3: Criar endpoint de sincronização manual

**Arquivo:** `apps/api/src/routes/plans.ts`

```typescript
// Sincronizar plano existente com Asaas
router.post('/student/:id/sync-asaas', async (req, res) => {
  try {
    const { id } = req.params

    // Buscar plano
    const { data: plan, error: fetchError } = await supabase
      .from('academy_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Se já tem asaas_plan_id, não precisa sincronizar
    if (plan.asaas_plan_id) {
      return res.json({ 
        message: 'Plano já está sincronizado',
        asaas_plan_id: plan.asaas_plan_id
      })
    }

    // Criar no Asaas
    const asaasResult = await asaasService.createSubscriptionPlan({
      name: `${plan.name} - Academia`,
      description: plan.description || `Plano ${plan.name}`,
      value: plan.price,
      cycle: 'MONTHLY',
      billingType: 'UNDEFINED'
    })

    if (!asaasResult.success) {
      return res.status(500).json({ 
        error: 'Erro ao criar plano no Asaas',
        details: asaasResult.error
      })
    }

    // Atualizar com asaas_plan_id
    const { error: updateError } = await supabase
      .from('academy_plans')
      .update({ asaas_plan_id: asaasResult.data.id })
      .eq('id', id)

    if (updateError) throw updateError

    res.json({ 
      message: 'Plano sincronizado com sucesso',
      asaas_plan_id: asaasResult.data.id
    })
  } catch (error) {
    console.error('Error syncing plan with Asaas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})
```

## 🎯 Como Usar

### Para Planos Novos:
1. Crie o plano no dashboard `/franquia/dashboard/planos`
2. O backend automaticamente:
   - Cria o plano no Asaas
   - Salva no Supabase com `asaas_plan_id`
3. Plano já está pronto para assinaturas!

### Para Planos Existentes:
1. Acesse `/franquia/dashboard/planos`
2. Veja quais planos têm badge "⚠ Não integrado"
3. Clique em "Sincronizar com Asaas"
4. Plano será criado no Asaas e vinculado

## 📋 Checklist de Implementação

### Backend:
- [ ] Adicionar métodos no `AsaasService`:
  - [ ] `createSubscriptionPlan()`
  - [ ] `updateSubscriptionPlan()`
  - [ ] `deleteSubscriptionPlan()`
- [ ] Atualizar rotas de planos:
  - [ ] `POST /api/plans/student` (criar)
  - [ ] `POST /api/plans/teacher` (criar)
  - [ ] `PUT /api/plans/student/:id` (atualizar)
  - [ ] `PUT /api/plans/teacher/:id` (atualizar)
  - [ ] `DELETE /api/plans/student/:id` (deletar)
  - [ ] `DELETE /api/plans/teacher/:id` (deletar)
- [ ] Criar endpoint de sincronização:
  - [ ] `POST /api/plans/student/:id/sync-asaas`
  - [ ] `POST /api/plans/teacher/:id/sync-asaas`

### Frontend:
- [ ] Adicionar badge de status Asaas
- [ ] Adicionar botão de sincronização manual
- [ ] Mostrar feedback visual de integração

### Banco de Dados:
- [ ] Verificar se coluna `asaas_plan_id` existe em:
  - [ ] `academy_plans`
  - [ ] `teacher_plans`

## 🔍 Testando a Integração

### 1. Criar Plano Novo:
```bash
# 1. Acesse o dashboard
http://localhost:3000/franquia/dashboard/planos

# 2. Clique em "Adicionar Plano"
# 3. Preencha os dados
# 4. Salve

# 5. Verifique no Asaas:
# https://sandbox.asaas.com/subscriptions/plans
# Deve aparecer o plano criado
```

### 2. Sincronizar Plano Existente:
```bash
# 1. Identifique planos sem asaas_plan_id
SELECT id, name, asaas_plan_id FROM academy_plans WHERE asaas_plan_id IS NULL;

# 2. Sincronize via API:
POST http://localhost:3001/api/plans/student/{id}/sync-asaas

# 3. Verifique se asaas_plan_id foi preenchido
SELECT id, name, asaas_plan_id FROM academy_plans WHERE id = '{id}';
```

## ⚠️ Observações Importantes

### 1. Ambiente Sandbox vs Produção
- **Sandbox**: Use para testes (não cobra de verdade)
- **Produção**: Use apenas quando tudo estiver testado

### 2. Ciclo de Cobrança
- `MONTHLY`: Mensal (mais comum)
- `YEARLY`: Anual
- Ajuste conforme seu modelo de negócio

### 3. Forma de Pagamento
- `UNDEFINED`: Permite qualquer forma (PIX, Boleto, Cartão)
- `CREDIT_CARD`: Apenas cartão
- `BOLETO`: Apenas boleto
- `PIX`: Apenas PIX

### 4. Rollback em Caso de Erro
- Se criar no Asaas mas falhar no Supabase → Deleta do Asaas
- Se atualizar no Asaas mas falhar no Supabase → Reverte no Asaas
- Sempre manter os dois sistemas sincronizados

## 📚 Documentação Asaas

- [API de Planos](https://docs.asaas.com/reference/criar-plano-de-assinatura)
- [API de Assinaturas](https://docs.asaas.com/reference/criar-assinatura)

---

**Criado em**: 2025-10-01
**Versão**: 1.0
**Status**: Guia Completo
