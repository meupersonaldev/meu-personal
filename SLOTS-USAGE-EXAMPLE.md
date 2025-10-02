# Sistema de Slots de Agendamento - Guia de Uso

## 📋 Visão Geral

O sistema de slots gerencia a disponibilidade de horários nas academias, garantindo que:
- ✅ Slots são bloqueados automaticamente quando atingem capacidade máxima
- ✅ Slots são liberados automaticamente quando agendamentos são cancelados
- ✅ Validação se todas as academias têm slots disponíveis
- ✅ Controle de capacidade simultânea por horário

## 🗄️ Estrutura do Banco de Dados

### Tabela: `academy_time_slots`
```sql
- id: UUID
- academy_id: UUID (FK para academies)
- day_of_week: INTEGER (0=Domingo, 6=Sábado)
- time: TIME (horário do slot)
- is_available: BOOLEAN
- max_capacity: INTEGER (quantos agendamentos simultâneos)
- current_bookings: INTEGER (quantos já foram feitos)
- blocked_reason: TEXT (motivo do bloqueio, se aplicável)
```

### Tabela: `bookings` (campos adicionados)
```sql
- academy_id: UUID (FK para academies)
- time_slot_id: UUID (FK para academy_time_slots)
```

## 🔧 Funções SQL Disponíveis

### 1. Verificar Disponibilidade
```sql
SELECT check_slot_availability(
  'academy-uuid'::UUID,
  1, -- Segunda-feira
  '09:00:00'::TIME
);
-- Retorna: TRUE ou FALSE
```

### 2. Reservar Slot
```sql
SELECT book_time_slot(
  'slot-uuid'::UUID,
  'booking-uuid'::UUID
);
-- Retorna: TRUE se sucesso, FALSE se falhou
```

### 3. Liberar Slot
```sql
SELECT release_time_slot('slot-uuid'::UUID);
-- Retorna: TRUE se sucesso
```

### 4. Listar Slots Disponíveis
```sql
SELECT * FROM get_available_slots(
  'academy-uuid'::UUID,
  1 -- Segunda-feira
);
-- Retorna: slot_id, slot_time, max_capacity, available_capacity
```

### 5. Verificar Todas as Academias
```sql
SELECT * FROM check_all_academies_have_slots(1);
-- Retorna: academy_id, academy_name, has_available_slots, total_slots, available_slots
```

## 💻 Uso no Frontend

### Exemplo 1: Componente de Seleção de Horário

```tsx
'use client'

import { useState } from 'react'
import { SlotSelector } from '@/components/booking/slot-selector'
import { useSlots } from '@/hooks/use-slots'

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlotId, setSelectedSlotId] = useState<string>()
  
  const academyId = 'your-academy-uuid'
  
  const {
    slots,
    loading,
    academiesStatus,
    allAcademiesHaveSlots,
    getAcademiesWithoutSlots
  } = useSlots({
    academyId,
    dayOfWeek: selectedDate.getDay(),
    autoLoad: true
  })

  const handleSlotSelect = (slotId: string, time: string) => {
    setSelectedSlotId(slotId)
    console.log('Slot selecionado:', slotId, time)
  }

  // Validar se todas as academias têm slots
  const canProceed = allAcademiesHaveSlots()
  
  if (!canProceed) {
    const academiesWithoutSlots = getAcademiesWithoutSlots()
    console.warn('Academias sem slots:', academiesWithoutSlots)
  }

  return (
    <div>
      <SlotSelector
        academyId={academyId}
        selectedDate={selectedDate}
        onSlotSelect={handleSlotSelect}
        selectedSlotId={selectedSlotId}
      />
      
      {!canProceed && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            ⚠️ Algumas academias não têm horários disponíveis neste dia
          </p>
        </div>
      )}
    </div>
  )
}
```

### Exemplo 2: Fazer um Agendamento com Slot

```tsx
import { bookTimeSlot } from '@/lib/slots-api'
import { useAuthStore } from '@/lib/stores/auth-store'

const handleCreateBooking = async () => {
  const { token } = useAuthStore.getState()
  
  // 1. Criar o booking primeiro
  const bookingResponse = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      student_id: studentId,
      teacher_id: teacherId,
      date: selectedDate,
      academy_id: academyId,
      credits_cost: 1
    })
  })
  
  const booking = await bookingResponse.json()
  
  // 2. Reservar o slot
  const slotBooked = await bookTimeSlot(
    selectedSlotId,
    booking.id,
    token
  )
  
  if (slotBooked) {
    toast.success('Agendamento criado e horário reservado!')
  } else {
    // Reverter o booking se não conseguiu reservar o slot
    await fetch(`/api/bookings/${booking.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    toast.error('Horário não está mais disponível')
  }
}
```

### Exemplo 3: Cancelar Agendamento (Libera Slot Automaticamente)

```tsx
const handleCancelBooking = async (bookingId: string) => {
  const { token } = useAuthStore.getState()
  
  // Apenas cancele o booking - o trigger SQL libera o slot automaticamente
  const response = await fetch(`/api/bookings/${bookingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'CANCELLED'
    })
  })
  
  if (response.ok) {
    toast.success('Agendamento cancelado e horário liberado!')
  }
}
```

### Exemplo 4: Dashboard de Disponibilidade

```tsx
import { useSlotsAvailability } from '@/hooks/use-slots'

export function AvailabilityDashboard() {
  const dayOfWeek = new Date().getDay()
  
  const {
    academiesStatus,
    loading,
    allAvailable,
    someAvailable,
    noneAvailable
  } = useSlotsAvailability(dayOfWeek)

  return (
    <div>
      <h2>Status das Academias</h2>
      
      {allAvailable && (
        <div className="text-green-600">
          ✅ Todas as academias têm horários disponíveis
        </div>
      )}
      
      {noneAvailable && (
        <div className="text-red-600">
          ❌ Nenhuma academia tem horários disponíveis
        </div>
      )}
      
      <ul>
        {academiesStatus.map(academy => (
          <li key={academy.academy_id}>
            {academy.academy_name}: {academy.available_slots}/{academy.total_slots} slots
            {academy.has_available_slots ? ' ✅' : ' ❌'}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## 🔄 Fluxo Completo de Agendamento

1. **Professor/Aluno seleciona data e horário**
   - Sistema verifica slots disponíveis
   - Mostra apenas horários com capacidade

2. **Confirma agendamento**
   - Cria registro em `bookings`
   - Chama `book_time_slot()` para reservar
   - Incrementa `current_bookings`
   - Bloqueia slot se atingir `max_capacity`

3. **Cancela agendamento**
   - Atualiza status do booking para `CANCELLED`
   - Trigger SQL chama `release_time_slot()` automaticamente
   - Decrementa `current_bookings`
   - Reativa slot

## 🎯 Validações Importantes

### Antes de Permitir Agendamento:
```tsx
const { allAcademiesHaveSlots } = useSlots({ dayOfWeek: 1 })

if (!allAcademiesHaveSlots()) {
  toast.error('Algumas academias não têm horários disponíveis')
  return
}
```

### Verificar Capacidade Restante:
```tsx
const slot = slots.find(s => s.slot_id === selectedSlotId)
if (slot && slot.available_capacity === 1) {
  toast.warning('⚠️ Última vaga disponível neste horário!')
}
```

## 📊 Métricas e Relatórios

```tsx
const { stats } = useSlots({ academyId, dayOfWeek })

console.log(`Taxa de ocupação: ${stats.utilizationRate}%`)
console.log(`Slots disponíveis: ${stats.available}/${stats.total}`)
```

## 🚨 Tratamento de Erros

O sistema trata automaticamente:
- ✅ Tentativa de reservar slot já cheio
- ✅ Tentativa de liberar slot já vazio
- ✅ Slots inexistentes
- ✅ Conflitos de concorrência (usando `FOR UPDATE`)

## 🔐 Segurança

- Todas as operações de modificação requerem autenticação (token JWT)
- Validações no banco de dados garantem integridade
- Triggers automáticos previnem inconsistências

## 📝 Notas Importantes

1. **Capacidade Simultânea**: Cada slot pode ter múltiplos agendamentos até `max_capacity`
2. **Bloqueio Automático**: Quando `current_bookings >= max_capacity`, o slot fica indisponível
3. **Liberação Automática**: Trigger SQL libera slots quando bookings são cancelados
4. **Validação em Tempo Real**: Sempre verifique disponibilidade antes de confirmar agendamento
