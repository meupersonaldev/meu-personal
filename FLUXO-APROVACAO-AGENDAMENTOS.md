# Fluxo de Aprovação de Agendamentos

## 📋 Visão Geral

Quando um **aluno** ou **professor** agenda uma aula, o agendamento deve ser criado com status `PENDING` e enviado para aprovação da **franquia/academia**. Somente após a aprovação, a aula é confirmada (`CONFIRMED`) e aparece na agenda de todos.

---

## 🔄 Fluxo Completo

```
┌─────────────────┐
│ Aluno/Professor │
│  Cria Aula      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Booking criado com      │
│ status: PENDING         │
│ (aguardando aprovação)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Franquia recebe         │
│ notificação             │
│ (/dashboard/approvals)  │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐   ┌─────────┐
│APROV│   │REJEITAR │
└──┬──┘   └────┬────┘
   │           │
   ▼           ▼
CONFIRMED   CANCELLED
   │           │
   ▼           ▼
Aparece    Notifica
na agenda  rejeição
```

---

## 🎯 Implementações Necessárias

### 1. **Dashboard do Aluno** (`/aluno/agendar-aula`)

#### Localização
- `apps/web/app/aluno/agendar-aula/page.tsx`

#### Mudanças Necessárias

**ANTES:**
```typescript
// Criar booking direto com status CONFIRMED
const booking = {
  student_id: user.id,
  teacher_id: selectedTeacher,
  date: selectedDate,
  status: 'CONFIRMED' // ❌ Não deve ser confirmado automaticamente
}
```

**DEPOIS:**
```typescript
// Criar booking com status PENDING para aprovação
const booking = {
  student_id: user.id,
  teacher_id: selectedTeacher,
  date: selectedDate,
  duration: 60,
  notes: observacoes || undefined,
  credits_cost: 1,
  status: 'PENDING', // ✅ Aguarda aprovação da franquia
  franchise_id: academyId // Importante para filtrar por academia
}

// Fazer requisição para API
const response = await fetch('http://localhost:3001/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(booking)
})

if (response.ok) {
  toast.success('Agendamento enviado para aprovação da academia!')
  toast.info('Você será notificado quando for aprovado.')
} else {
  toast.error('Erro ao criar agendamento')
}
```

#### Checklist de Implementação

- [ ] Mudar status default de `CONFIRMED` para `PENDING`
- [ ] Adicionar `franchise_id` (academy_id) ao booking
- [ ] Atualizar mensagem de sucesso para indicar "aguardando aprovação"
- [ ] Mostrar badge "PENDENTE" nos agendamentos do aluno
- [ ] Implementar filtro para ver agendamentos pendentes vs confirmados

---

### 2. **Dashboard do Professor** (`/professor/agenda/reservar-espaco`)

#### Localização
- `apps/web/app/professor/agenda/reservar-espaco/page.tsx`

#### Mudanças Necessárias

**ANTES:**
```typescript
// Criar disponibilidade ou agendamento direto
const booking = {
  teacher_id: user.id,
  date: selectedDate,
  status: 'AVAILABLE' // ou 'CONFIRMED'
}
```

**DEPOIS:**
```typescript
// Se é agendamento COM aluno → PENDING
// Se é apenas disponibilidade → AVAILABLE

const booking = {
  teacher_id: user.id,
  student_id: selectedStudent || null, // null = disponibilidade
  date: selectedDate,
  duration: duration || 60,
  notes: observacoes || undefined,
  credits_cost: 1,
  status: selectedStudent ? 'PENDING' : 'AVAILABLE', // ✅ PENDING se tem aluno
  franchise_id: user.academy_id
}

// Fazer requisição para API
const response = await fetch('http://localhost:3001/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(booking)
})

if (response.ok) {
  if (selectedStudent) {
    toast.success('Agendamento enviado para aprovação da academia!')
  } else {
    toast.success('Horário disponibilizado com sucesso!')
  }
}
```

#### Checklist de Implementação

- [ ] Diferenciar entre "disponibilidade" e "agendamento com aluno"
- [ ] Se tem `student_id` → status `PENDING`
- [ ] Se não tem `student_id` → status `AVAILABLE`
- [ ] Adicionar `franchise_id` aos bookings
- [ ] Mostrar badge "AGUARDANDO APROVAÇÃO" para bookings pendentes
- [ ] Permitir professor cancelar agendamento pendente

---

### 3. **Visualização na Agenda** (Aluno e Professor)

#### Componente de Calendário

**Badge de Status:**
```tsx
const getStatusBadge = (status: string) => {
  switch(status) {
    case 'PENDING':
      return <Badge className="bg-orange-100 text-orange-800">Aguardando Aprovação</Badge>
    case 'CONFIRMED':
      return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
    case 'COMPLETED':
      return <Badge className="bg-blue-100 text-blue-800">Concluído</Badge>
    case 'CANCELLED':
      return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
    case 'AVAILABLE':
      return <Badge className="bg-gray-100 text-gray-800">Disponível</Badge>
    default:
      return null
  }
}
```

**Cores no Calendário:**
```tsx
const getEventColor = (status: string) => {
  switch(status) {
    case 'PENDING': return 'bg-orange-200 border-orange-500'
    case 'CONFIRMED': return 'bg-green-200 border-green-500'
    case 'COMPLETED': return 'bg-blue-200 border-blue-500'
    case 'CANCELLED': return 'bg-red-200 border-red-500'
    case 'AVAILABLE': return 'bg-gray-200 border-gray-500'
  }
}
```

#### Checklist de Implementação

- [ ] Adicionar badges de status em todas as visualizações de agenda
- [ ] Aplicar cores diferentes para cada status no calendário
- [ ] Adicionar tooltip explicando o status
- [ ] Filtrar agendamentos por status (pendente, confirmado, etc)

---

### 4. **Notificações** (Sistema de Alertas)

#### Quando criar agendamento:
```typescript
// Notificar a franquia que há um novo agendamento pendente
await createNotification({
  type: 'new_booking_pending',
  academy_id: academyId,
  title: 'Novo agendamento aguardando aprovação',
  message: `${studentName} agendou aula com ${teacherName} para ${date}`,
  link: '/franquia/dashboard/approvals'
})
```

#### Quando aprovar:
```typescript
// Notificar aluno e professor
await Promise.all([
  createNotification({
    user_id: studentId,
    type: 'booking_approved',
    title: 'Aula aprovada!',
    message: `Sua aula com ${teacherName} foi confirmada para ${date}`
  }),
  createNotification({
    user_id: teacherId,
    type: 'booking_approved',
    title: 'Aula confirmada',
    message: `Aula com ${studentName} foi aprovada para ${date}`
  })
])
```

#### Quando rejeitar:
```typescript
// Notificar aluno e professor com motivo
await Promise.all([
  createNotification({
    user_id: studentId,
    type: 'booking_rejected',
    title: 'Aula não aprovada',
    message: `Sua aula foi rejeitada. Motivo: ${reason}`
  }),
  createNotification({
    user_id: teacherId,
    type: 'booking_rejected',
    title: 'Aula não aprovada',
    message: `Aula com ${studentName} foi rejeitada. Motivo: ${reason}`
  })
])
```

#### Checklist de Implementação

- [ ] Criar sistema de notificações (tabela `notifications`)
- [ ] Enviar notificação para franquia ao criar booking
- [ ] Enviar notificação para aluno/professor ao aprovar
- [ ] Enviar notificação para aluno/professor ao rejeitar
- [ ] Adicionar badge de contador no ícone de notificações

---

## 🗂️ Estrutura de Dados

### Tabela `bookings`

```sql
bookings {
  id: uuid
  student_id: uuid (nullable - se for disponibilidade)
  teacher_id: uuid
  franchise_id: uuid (academy_id)
  date: timestamp
  duration: integer (default 60)
  status: enum (PENDING, CONFIRMED, COMPLETED, CANCELLED, AVAILABLE)
  notes: text
  credits_cost: integer
  created_at: timestamp
  updated_at: timestamp
}
```

### Tabela `notifications` (a criar)

```sql
notifications {
  id: uuid
  user_id: uuid (null se for para academia)
  academy_id: uuid (null se for para usuário)
  type: text
  title: text
  message: text
  link: text
  is_read: boolean (default false)
  created_at: timestamp
}
```

---

## 📝 Endpoints da API

### Já Implementados ✅

- `GET /api/bookings?status=PENDING` - Listar bookings pendentes
- `POST /api/bookings` - Criar novo booking
- `PATCH /api/bookings/:id` - Atualizar status do booking
- `PUT /api/bookings/:id` - Atualizar booking completo
- `DELETE /api/bookings/:id` - Cancelar booking

### A Implementar 🔨

- `POST /api/notifications` - Criar notificação
- `GET /api/notifications?user_id=X` - Buscar notificações do usuário
- `GET /api/notifications?academy_id=X` - Buscar notificações da academia
- `PATCH /api/notifications/:id/read` - Marcar como lida

---

## 🎨 UI/UX Recomendações

### Para o Aluno:

1. **Ao agendar:**
   - Mostrar modal de confirmação: "Seu agendamento será enviado para aprovação da academia"
   - Botão: "Enviar para Aprovação"

2. **Na lista de agendamentos:**
   - Badge laranja: "Aguardando Aprovação"
   - Badge verde: "Confirmado"
   - Opção de cancelar agendamentos pendentes

3. **Notificações:**
   - Push notification quando aprovado/rejeitado
   - Badge no ícone de sino com contador

### Para o Professor:

1. **Ao criar agendamento com aluno:**
   - Avisar que precisa de aprovação da academia
   - Diferente de criar disponibilidade (que é imediato)

2. **Na agenda:**
   - Cores diferentes para status
   - Legenda explicando cada cor
   - Filtro por status

### Para a Franquia:

1. **Dashboard de aprovações:**
   - ✅ Já implementado em `/franquia/dashboard/approvals`
   - Lista clara de agendamentos pendentes
   - Botões de aprovar/rejeitar
   - Modal com detalhes completos

---

## 🚀 Ordem de Implementação

### Sprint 1: Backend & Estrutura
1. [ ] Criar tabela `notifications`
2. [ ] Criar endpoints de notificações
3. [ ] Atualizar endpoint POST /bookings para criar notificações
4. [ ] Atualizar endpoint PATCH /bookings para criar notificações

### Sprint 2: Dashboard do Aluno
1. [ ] Atualizar página de agendamento para status PENDING
2. [ ] Adicionar badges de status na lista de agendamentos
3. [ ] Implementar filtros por status
4. [ ] Integrar sistema de notificações

### Sprint 3: Dashboard do Professor
1. [ ] Atualizar reserva de espaço para diferenciar disponibilidade vs agendamento
2. [ ] Adicionar badges de status na agenda
3. [ ] Implementar cores no calendário por status
4. [ ] Integrar sistema de notificações

### Sprint 4: Testes & Ajustes
1. [ ] Testar fluxo completo (aluno → franquia → professor)
2. [ ] Testar fluxo de rejeição
3. [ ] Testar notificações
4. [ ] Ajustes finais de UI/UX

---

## 📊 Métricas de Sucesso

- [ ] Todos os agendamentos passam por aprovação
- [ ] Notificações funcionam corretamente
- [ ] Zero agendamentos sem `franchise_id`
- [ ] UI clara e intuitiva para todos os usuários
- [ ] Tempo médio de aprovação < 24h

---

## ⚠️ Pontos de Atenção

1. **Créditos do Aluno:**
   - ❌ **NÃO** debitar créditos ao criar booking PENDING
   - ✅ Debitar apenas quando status mudar para CONFIRMED
   - Se rejeitado, créditos não devem ser debitados

2. **Multi-tenancy:**
   - Sempre incluir `franchise_id` nos bookings
   - Filtrar bookings por academia nas queries

3. **Sincronização:**
   - Usar WebSockets ou polling para atualizar status em tempo real
   - Invalidar cache ao aprovar/rejeitar

4. **Cancelamento:**
   - Aluno/Professor pode cancelar booking PENDING
   - Franquia pode cancelar booking CONFIRMED (com notificação)

---

## 📚 Referências

- Código atual: `/franquia/dashboard/approvals/page.tsx` ✅
- API de bookings: `apps/api/src/routes/bookings.ts` ✅
- Store da franquia: `apps/web/lib/stores/franquia-store.ts`
- Store do aluno: `apps/web/lib/stores/student-store.ts`
- Store do professor: `apps/web/lib/stores/auth-store.ts`

---

**Status:** 📝 Documento de Especificação
**Última atualização:** 2025-10-01
**Responsável:** Desenvolvimento Full-Stack
