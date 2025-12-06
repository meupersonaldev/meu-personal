# Design Document: Fix Recurring Bookings Integration

## Overview

Este documento descreve o design para corrigir e completar a integração do sistema de agendamentos recorrentes (séries). O problema principal é que os campos `series_id` e `is_reserved` não estão sendo retornados pelo endpoint `/api/bookings`, impedindo que o frontend identifique bookings de séries e execute operações de cancelamento.

A solução envolve:
1. Modificar o endpoint `/api/bookings` para incluir `series_id` e `is_reserved` nas respostas
2. Atualizar o mapeamento no frontend para usar esses campos
3. Corrigir o fluxo de cancelamento de séries no dashboard do aluno
4. Garantir que a agenda do professor exiba corretamente bookings de séries

## Architecture

```mermaid
flowchart TB
    subgraph Frontend
        AD[Aluno Dashboard]
        PA[Professor Agenda]
    end
    
    subgraph API
        AB[/api/bookings]
        ABS[/api/booking-series]
    end
    
    subgraph Database
        BT[(bookings)]
        BST[(booking_series)]
    end
    
    AD -->|GET bookings| AB
    AD -->|GET my-series| ABS
    AD -->|DELETE series/booking| ABS
    
    PA -->|GET bookings| AB
    PA -->|GET teacher/my-series| ABS
    
    AB -->|SELECT with series_id, is_reserved| BT
    ABS -->|SELECT| BST
    ABS -->|UPDATE/DELETE| BT
```

## Components and Interfaces

### 1. Backend - Endpoint GET /api/bookings

**Arquivo:** `apps/api/src/routes/bookings.ts`

**Modificações necessárias:**

1. Adicionar `series_id` e `is_reserved` na query SELECT para bookings de aluno
2. Adicionar `series_id` e `is_reserved` na query SELECT para bookings de professor
3. Incluir esses campos no objeto de resposta formatado

**Interface de resposta atualizada:**
```typescript
interface BookingResponse {
  id: string
  studentId?: string
  studentName?: string
  teacherId: string
  teacherName?: string
  franchiseId?: string
  franchiseName?: string
  date: string
  startAt?: string
  endAt?: string
  duration: number
  status: string
  notes?: string
  creditsCost: number
  source?: string
  hourlyRate?: number
  cancellableUntil?: string
  // Novos campos para séries
  series_id?: string | null
  is_reserved?: boolean
}
```

### 2. Frontend - Dashboard do Aluno

**Arquivo:** `apps/web/app/aluno/dashboard/page.tsx`

**Modificações necessárias:**

1. Garantir que o mapeamento de bookings inclua `series_id` e `is_reserved` da resposta da API
2. Corrigir a função `handleCancelSeriesConfirm` para usar o `series_id` correto
3. Melhorar a busca de bookings da série para o cancelamento

### 3. Frontend - Agenda do Professor

**Arquivo:** `apps/web/app/professor/agenda/page.tsx`

**Modificações necessárias:**

1. Atualizar a interface `Booking` para incluir `series_id` e `is_reserved`
2. Garantir que o mapeamento de bookings preserve esses campos
3. O componente `BookingCard` já suporta `series_id` e `is_reserved`, apenas precisa receber os dados

## Data Models

### Booking (existente - campos relevantes)

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  teacher_id UUID REFERENCES users(id),
  franchise_id UUID REFERENCES academies(id),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status_canonical VARCHAR(20),
  -- Campos de série (já existem)
  series_id UUID REFERENCES booking_series(id),
  is_reserved BOOLEAN DEFAULT FALSE
);
```

### Booking Series (existente)

```sql
CREATE TABLE booking_series (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES users(id),
  teacher_id UUID REFERENCES users(id),
  academy_id UUID REFERENCES academies(id),
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  recurrence_type VARCHAR(20),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE'
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API retorna campos de série para bookings

*For any* booking que possui `series_id` no banco de dados, quando o endpoint GET /api/bookings é chamado (seja para aluno ou professor), a resposta JSON deve incluir o campo `series_id` com o valor correto e o campo `is_reserved` com o valor booleano correspondente.

**Validates: Requirements 1.5, 2.2, 4.2, 4.3**

### Property 2: Cancelamento usa IDs corretos

*For any* operação de cancelamento de série, o frontend deve enviar o `series_id` e `booking_id` que correspondem exatamente aos valores armazenados no banco de dados para o booking selecionado.

**Validates: Requirements 1.3, 4.5**

### Property 3: Cancelamento total estorna créditos corretamente

*For any* série com N bookings confirmados (is_reserved=false, status_canonical='PAID'), quando o cancelamento total é executado, o sistema deve cancelar todos os N bookings e estornar exatamente N créditos para o aluno.

**Validates: Requirements 1.6, 5.3**

### Property 4: Séries do professor incluem dados completos

*For any* série retornada pelo endpoint GET /api/booking-series/teacher/my-series, a resposta deve incluir: nome do aluno, nome da academia, day_of_week, start_time, end_time, recurrence_type, status, e contagem de bookings confirmados vs reservados.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 5: Indicador visual de série é exibido corretamente

*For any* booking renderizado na UI (dashboard do aluno ou agenda do professor), se o booking possui `series_id` não-nulo, então o indicador visual "🔄 Série" deve ser exibido.

**Validates: Requirements 2.3**

### Property 6: Status reservado é exibido corretamente

*For any* booking renderizado na UI, se `is_reserved` é true, então o status exibido deve ser "Reservada" com estilo visual âmbar.

**Validates: Requirements 2.4**

## Error Handling

1. **Booking não encontrado para cancelamento**: Retornar erro 404 com mensagem clara
2. **Série não encontrada**: Retornar erro 404 com mensagem clara
3. **Permissão negada**: Retornar erro 403 se usuário não é dono da série
4. **Falha ao estornar créditos**: Logar erro e retornar 500, mas manter bookings cancelados
5. **Campos ausentes na resposta**: Frontend deve tratar `series_id` e `is_reserved` como opcionais

## Testing Strategy

### Unit Tests

1. Testar formatação de booking com e sem series_id
2. Testar mapeamento de campos no frontend
3. Testar lógica de exibição de badges de série/reservado

### Property-Based Tests

Usar a biblioteca `fast-check` para TypeScript:

1. **Property 1**: Gerar bookings aleatórios com series_id, chamar endpoint, verificar campos na resposta
2. **Property 2**: Gerar séries e bookings, simular cancelamento, verificar IDs enviados
3. **Property 3**: Gerar séries com N bookings confirmados, executar cancelamento, verificar estorno
4. **Property 4**: Gerar séries para professor, chamar endpoint, verificar completude da resposta
5. **Property 5**: Gerar bookings com/sem series_id, renderizar, verificar indicador
6. **Property 6**: Gerar bookings com is_reserved true/false, renderizar, verificar status

### Integration Tests

1. Fluxo completo de cancelamento de série pelo aluno
2. Visualização de bookings de série na agenda do professor
3. Listagem de séries do professor
