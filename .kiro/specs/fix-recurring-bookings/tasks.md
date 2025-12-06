# Implementation Plan

- [x] 1. Atualizar endpoint GET /api/bookings para incluir campos de série

  - [x] 1.1 Adicionar series_id e is_reserved na query SELECT para bookings de aluno


    - Modificar a query em `apps/api/src/routes/bookings.ts` na seção de busca por student_id
    - Incluir `series_id` e `is_reserved` no SELECT
    - _Requirements: 1.5, 4.2_

  - [x] 1.2 Adicionar series_id e is_reserved na query SELECT para bookings de professor

    - Modificar a query na seção de busca por teacher_id
    - Incluir `series_id` e `is_reserved` no SELECT
    - _Requirements: 2.2, 4.3_

  - [x] 1.3 Incluir series_id e is_reserved no objeto de resposta formatado

    - Atualizar a função de mapeamento para incluir os novos campos
    - Garantir que campos são retornados mesmo quando null
    - _Requirements: 4.2, 4.3_
  - [x] 1.4 Write property test for API response fields


    - **Property 1: API retorna campos de série para bookings**
    - **Validates: Requirements 1.5, 2.2, 4.2, 4.3**

- [x] 2. Corrigir mapeamento de bookings no dashboard do aluno



  - [x] 2.1 Atualizar mapeamento para incluir series_id da resposta da API


    - Modificar `apps/web/app/aluno/dashboard/page.tsx`
    - Garantir que `series_id` é mapeado de `b.series_id` ou `b.seriesId`
    - _Requirements: 4.4_

  - [x] 2.2 Atualizar mapeamento para incluir is_reserved da resposta da API
    - Garantir que `is_reserved` é mapeado corretamente
    - _Requirements: 4.4_
  - [x] 2.3 Write property test for frontend mapping



    - **Property 2: Cancelamento usa IDs corretos**
    - **Validates: Requirements 1.3, 4.5**

- [x] 3. Corrigir fluxo de cancelamento de série no dashboard do aluno





  - [x] 3.1 Melhorar busca de bookings da série para cancelamento


    - Usar os bookings já carregados que têm series_id correspondente
    - Não depender de busca adicional se bookings já estão no estado
    - _Requirements: 1.3_

  - [x] 3.2 Garantir que series_id correto é usado na requisição de cancelamento

    - Verificar que o series_id do booking selecionado é passado corretamente
    - _Requirements: 4.5_

  - [x] 3.3 Write property test for cancellation flow

    - **Property 3: Cancelamento total estorna créditos corretamente**
    - **Validates: Requirements 1.6, 5.3**

- [x] 4. Checkpoint - Verificar funcionamento do cancelamento





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Atualizar agenda do professor para exibir bookings de série





  - [x] 5.1 Atualizar interface Booking para incluir series_id e is_reserved


    - Modificar `apps/web/app/professor/agenda/page.tsx`
    - Adicionar campos opcionais na interface
    - _Requirements: 2.1_
  - [x] 5.2 Garantir que mapeamento de bookings preserva series_id e is_reserved


    - Verificar que os campos são passados para o componente BookingCard
    - _Requirements: 2.2_
  - [x] 5.3 Write property test for series indicator display


    - **Property 5: Indicador visual de série é exibido corretamente**
    - **Validates: Requirements 2.3**
  - [x] 5.4 Write property test for reserved status display


    - **Property 6: Status reservado é exibido corretamente**
    - **Validates: Requirements 2.4**

- [x] 6. Verificar endpoint de séries do professor






  - [x] 6.1 Testar endpoint GET /api/booking-series/teacher/my-series

    - Verificar que retorna séries com dados completos
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Write property test for teacher series endpoint

    - **Property 4: Séries do professor incluem dados completos**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 7. Final Checkpoint - Verificar integração completa





  - Ensure all tests pass, ask the user if questions arise.
