# Ajuste de disponibilidades de professor

Este guia resume as ações necessárias para que os professores possam abrir horários livres e agendar alunos usando o fluxo atualizado.

## 1. Atualizar o banco de dados

1. Conectar ao banco (Supabase SQL editor, CLI ou `psql`).
2. Executar o bloco abaixo **uma única vez** para garantir o valor `AVAILABLE` no enum:

   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
       FROM pg_enum
       WHERE enumlabel = 'AVAILABLE'
         AND enumtypid = 'booking_status_enum'::regtype
     ) THEN
       ALTER TYPE booking_status_enum ADD VALUE 'AVAILABLE';
     END IF;
   END
   $$;
   ```
3. Verifique:

   ```sql
   SELECT unnest(enum_range(NULL::booking_status_enum));
   ```

4. (Opcional, mas recomendado) Normalizar registros antigos:

   ```sql
   UPDATE bookings
      SET status = 'AVAILABLE'
    WHERE status_canonical = 'AVAILABLE'
      AND student_id IS NULL
      AND status IS DISTINCT FROM 'AVAILABLE';
   ```

## 2. Back-end

- Garantir que `bookingCanonicalService` grave `status = 'AVAILABLE'` ao criar slots de professor (`apps/api/src/services/booking-canonical.service.ts`).
- Validar se rotas `POST /api/bookings` aceitam payload no formato:

  ```json
  {
    "source": "PROFESSOR",
    "professorId": "<uuid>",
    "unitId": "<uuid>",
    "studentId": "<uuid|null>",
    "startAt": "<ISO>",
    "endAt": "<ISO>",
    "professorNotes": "Horário disponível"
  }
  ```

- Confirmar normalização de status na util `apps/api/src/utils/booking-status.ts`.

## 3. Front-end (app do professor)

### Agenda (`/professor/agenda`)

- Filtrar aulas do dashboard mostrando apenas bookings com `studentId`.
- Considerar `PAID` como “confirmado” e `CANCELED/CANCELLED` como cancelado.
- No modal, usar `PATCH /api/bookings/:id` com status `PAID`, `CANCELED`, `DONE` conforme o fluxo.

### Reservar espaço (`/professor/agenda/reservar-espaco`)

- Buscar franquias com `authFetch` para incluir o token.
- Enviar o payload atualizado com `source`, `professorId`, `studentId`, `unitId`, `startAt`/`endAt`.
- Após reservar, recarregar bookings e slots para refletir a disponibilidade.

## 4. Testes manuais sugeridos

1. Como professor, abrir um horário via `/professor/agenda`.
2. Reservar um horário para um aluno em `/professor/agenda/reservar-espaco`.
3. Mostrar o horário reservado no dashboard.
4. Cancelar e confirmar bookings para validar transições `PENDING → PAID → DONE` e `CANCELED`.
5. Verificar que slots livres permanecem visíveis apenas na agenda do professor (não no dashboard).

## 5. Pontos de atenção

- Garantir que o professor possua academias vinculadas (preferências) para que as unidades apareçam no fluxo de reserva.
- Se o professor não tiver `token` válido, as páginas retornam 401 e nenhuma unidade é exibida; orientar login novamente.
- Sempre rodar a atualização do enum em ambientes novos (dev, staging, prod) antes de implantar o front/back atualizados.
