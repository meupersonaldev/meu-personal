# Plano: Agendamento Recorrente com Sistema de Reservas

> **Início:** 29/11/2025  
> **Status:** 🚧 Em andamento

---

## Resumo

Sistema que permite alunos e professores agendarem aulas com recorrência semanal. Aulas são confirmadas se houver crédito, ou reservadas caso contrário. Reservas são cobradas automaticamente 7 dias antes.

### Regras de Negócio

| Situação | Ação |
|----------|------|
| Aluno tem crédito | Aula confirmada (`SCHEDULED`) |
| Aluno sem crédito | Reserva (`RESERVED`) - aparece na agenda do professor |
| 7 dias antes de reserva | Job tenta debitar crédito |
| Crédito disponível | Confirma a aula |
| Sem crédito | Cancela aquela semana, continua as próximas |
| Professor sem disponibilidade na data | Pula a semana, avisa o aluno |

### Períodos de Recorrência

- 15 dias (~2 aulas)
- 1 mês (~4 aulas)
- 3 meses / Trimestre (~12 aulas)
- 6 meses / Semestre (~24 aulas)
- 1 ano (~52 aulas)

---

## Checklist de Implementação

### Fase 1: Banco de Dados ✅
- [x] 1.1 Criar tabela `booking_series`
- [x] 1.2 Adicionar campos `series_id` e `is_reserved` em `bookings`
- [x] 1.3 Criar tabela `booking_series_notifications`
- [x] 1.4 Aplicar migração no Supabase

### Fase 2: Backend - Endpoints ✅
- [x] 2.1 `POST /api/booking-series` - Criar série recorrente
- [x] 2.2 `GET /api/booking-series/:seriesId` - Detalhes da série
- [x] 2.3 `DELETE /api/booking-series/:seriesId/bookings/:bookingId` - Cancelamento com opções (single/future/all)
- [x] 2.4 `GET /api/booking-series/reserved/pending` - Listar reservas pendentes
- [x] 2.5 `POST /api/booking-series/process-reservations` - Processar reservas (job)
- [x] 2.6 `GET /api/booking-series/student/my-series` - Listar séries do aluno
- [x] 2.7 `GET /api/booking-series/teacher/my-series` - Listar séries do professor

### Fase 3: Job de Cobrança Automática ✅
- [x] 3.1 Criar função de processamento de reservas (`reservation-processor.ts`)
- [x] 3.2 Configurar scheduler diário (padrão 08:00, configurável via `RESERVATION_SCHEDULER_HOUR`)
- [x] 3.3 Integrar com sistema de créditos (`student_class_balance` e `student_class_tx`)
- [x] 3.4 Integrar com sistema de notificações (tabela `notifications` + `booking_series_notifications`)
- [x] 3.5 Envio de lembretes antecipados (8 dias antes)

### Fase 4: Frontend - Aluno
- [x] 4.1 Componente: Seletor de recorrência na tela de agendamento (`/aluno/agendar`)
- [x] 4.2 Modal de confirmação (confirmadas vs reservadas)
- [ ] 4.3 Listagem de aulas com badges (Confirmada/Reservada/Série)
- [ ] 4.4 Modal de cancelamento (só esta / futuras / toda série)

### Fase 5: Frontend - Professor
- [ ] 5.1 Agenda: mostrar reservas com visual diferenciado
- [ ] 5.2 Disponibilidade recorrente (criar múltiplos slots)
- [ ] 5.3 Visualizar séries de aulas agendadas

### Fase 6: Notificações
- [ ] 6.1 Série criada → Aluno
- [ ] 6.2 Série criada → Professor
- [ ] 6.3 Lembrete 7 dias antes (reserva pendente) → Aluno
- [ ] 6.4 Crédito debitado com sucesso → Aluno
- [ ] 6.5 Aula cancelada por falta de crédito → Aluno
- [ ] 6.6 Reserva cancelada → Professor
- [ ] 6.7 Data pulada (professor indisponível) → Aluno

### Fase 7: Testes e Validação
- [ ] 7.1 Testar criação de série com créditos suficientes
- [ ] 7.2 Testar criação de série com créditos parciais
- [ ] 7.3 Testar job de cobrança automática
- [ ] 7.4 Testar cancelamento parcial e total
- [ ] 7.5 Testar notificações

---

## Detalhes Técnicos

### 1. Estrutura do Banco de Dados

#### Tabela `booking_series`
```sql
CREATE TABLE booking_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  teacher_id UUID REFERENCES users(id),
  academy_id UUID REFERENCES academies(id),
  
  -- Padrão de recorrência
  day_of_week INTEGER NOT NULL,        -- 0=Dom, 1=Seg, ..., 6=Sab
  start_time TIME NOT NULL,            -- ex: '19:00'
  end_time TIME NOT NULL,              -- ex: '20:00'
  
  -- Período
  recurrence_type VARCHAR(20) NOT NULL, -- '15_DAYS', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Controle
  created_by UUID REFERENCES users(id),
  created_by_role VARCHAR(20),         -- 'STUDENT', 'TEACHER'
  status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'CANCELLED', 'COMPLETED'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Novos campos em `bookings`
```sql
ALTER TABLE bookings ADD COLUMN series_id UUID REFERENCES booking_series(id);
ALTER TABLE bookings ADD COLUMN is_reserved BOOLEAN DEFAULT FALSE;
```

#### Tabela `booking_series_notifications`
```sql
CREATE TABLE booking_series_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES booking_series(id),
  booking_id UUID REFERENCES bookings(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Endpoint Principal: `POST /api/bookings/recurring`

**Request:**
```json
{
  "teacherId": "uuid",
  "academyId": "uuid",
  "dayOfWeek": 2,
  "startTime": "19:00",
  "endTime": "20:00",
  "recurrenceType": "QUARTER",
  "startDate": "2025-12-01"
}
```

**Response:**
```json
{
  "seriesId": "uuid",
  "confirmedCount": 10,
  "reservedCount": 2,
  "skippedDates": ["2025-12-25"],
  "totalCreditsUsed": 10,
  "bookings": [
    {
      "id": "uuid",
      "date": "2025-12-02",
      "status": "SCHEDULED",
      "isReserved": false
    },
    {
      "id": "uuid",
      "date": "2025-12-09",
      "status": "SCHEDULED",
      "isReserved": true
    }
  ]
}
```

### 3. Job de Cobrança Automática

```typescript
// Roda diariamente às 08:00 UTC
async function processReservedBookings() {
  const targetDate = addDays(new Date(), 7) // 7 dias no futuro
  
  const reservations = await db.bookings.findMany({
    where: {
      is_reserved: true,
      status_canonical: 'SCHEDULED',
      start_at: {
        gte: startOfDay(targetDate),
        lt: endOfDay(targetDate)
      }
    }
  })
  
  for (const booking of reservations) {
    const balance = await getStudentCredits(booking.student_id)
    
    if (balance >= 1) {
      await debitCredit(booking.student_id, 1)
      await db.bookings.update({
        where: { id: booking.id },
        data: { is_reserved: false }
      })
      await notify(booking.student_id, 'CREDIT_SUCCESS', booking)
    } else {
      await db.bookings.update({
        where: { id: booking.id },
        data: { status_canonical: 'CANCELED' }
      })
      await notify(booking.student_id, 'CREDIT_FAILED', booking)
      await notify(booking.teacher_id, 'RESERVATION_CANCELLED', booking)
    }
  }
}
```

### 4. UI - Modal de Confirmação

```
┌─────────────────────────────────────────────┐
│  Confirmar Agendamento Recorrente           │
├─────────────────────────────────────────────┤
│  Professora: Marcela                        │
│  Horário: Terças, 19:00 - 20:00             │
│  Período: 3 meses (12 semanas)              │
│                                             │
│  ✅ 10 aulas confirmadas (créditos usados)  │
│  ⏳ 2 aulas reservadas                       │
│                                             │
│  ⚠️ As aulas reservadas precisam de crédito │
│  até 7 dias antes. Caso contrário, serão    │
│  canceladas automaticamente.                │
│                                             │
│  ⚠️ Datas não disponíveis (puladas):        │
│  • 25/12/2025 (Natal)                       │
│                                             │
│  [Cancelar]              [Confirmar]        │
└─────────────────────────────────────────────┘
```

### 5. UI - Modal de Cancelamento

```
┌─────────────────────────────────────────────┐
│  Cancelar Aula                              │
├─────────────────────────────────────────────┤
│  Esta aula faz parte de uma série semanal.  │
│                                             │
│  O que você deseja cancelar?                │
│                                             │
│  ○ Apenas esta aula (01/12/2025)            │
│  ○ Esta e todas as próximas                 │
│  ○ Toda a série                             │
│                                             │
│  [Voltar]                [Confirmar]        │
└─────────────────────────────────────────────┘
```

---

## Notificações

| Evento | Destinatário | Template |
|--------|--------------|----------|
| Série criada | Aluno | "Série criada: {confirmed} aulas confirmadas, {reserved} reservadas" |
| Série criada | Professor | "Nova série de aulas com {aluno} às {horário}" |
| 7 dias antes (reserva) | Aluno | "Você precisa de crédito para a aula de {data}" |
| Crédito debitado | Aluno | "Sua aula de {data} foi confirmada!" |
| Cancelada por falta de crédito | Aluno | "Sua aula de {data} foi cancelada por falta de crédito" |
| Reserva cancelada | Professor | "A reserva de {aluno} para {data} foi cancelada" |
| Data pulada | Aluno | "Não foi possível agendar em {data} - professor indisponível" |

---

## Estimativa de Tempo

| Fase | Descrição | Estimativa | Status |
|------|-----------|------------|--------|
| 1 | Migração do banco | 1h | ✅ Concluído |
| 2 | Endpoints backend | 5h | ✅ Concluído |
| 3 | Job de cobrança | 2h | ✅ Concluído |
| 4 | Frontend aluno | 4h | 🚧 Em andamento |
| 5 | Frontend professor | 2h | ⬜ Pendente |
| 6 | Notificações | 1h | ⬜ Pendente |
| 7 | Testes | 2h | ⬜ Pendente |
| **Total** | | **~17h** | |

---

## Histórico de Atualizações

| Data | Descrição |
|------|-----------|
| 29/11/2025 | Plano criado |
| 29/11/2025 | Fase 1 concluída: tabelas `booking_series`, `booking_series_notifications` e campos em `bookings` |
| 29/11/2025 | Fase 2 concluída: todos os endpoints de `booking-series` implementados |
| 29/11/2025 | Fase 3 concluída: job de processamento de reservas com scheduler diário |
| 29/11/2025 | Fase 4 (parcial): seletor de recorrência e modal de confirmação na página de agendamento |

