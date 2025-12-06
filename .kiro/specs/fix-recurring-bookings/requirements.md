# Requirements Document

## Introduction

Este documento especifica os requisitos para corrigir e completar a integração do sistema de agendamentos recorrentes (séries). Atualmente, existem problemas que impedem o funcionamento completo:

1. O aluno não consegue cancelar séries de agendamentos recorrentes
2. Os agendamentos recorrentes não aparecem corretamente para o professor na agenda
3. O professor não consegue visualizar suas séries de alunos
4. Os campos series_id e is_reserved não estão sendo retornados pelo backend

O sistema de recorrência permite que alunos agendem aulas semanais fixas com um professor. Quando uma série é criada, múltiplos bookings são gerados com um `series_id` comum. O professor precisa visualizar essas aulas na sua agenda, e tanto aluno quanto professor precisam poder gerenciar a série.

## Glossary

- **Booking**: Um agendamento individual de aula entre aluno e professor
- **Booking Series**: Uma série de agendamentos recorrentes (semanais) criada pelo aluno
- **series_id**: Identificador único que vincula múltiplos bookings a uma mesma série
- **is_reserved**: Flag que indica se o booking está reservado (aguardando crédito) ou confirmado
- **status_canonical**: Status normalizado do booking (AVAILABLE, PAID, RESERVED, CANCELED, DONE)
- **Dashboard do Aluno**: Página `/aluno/dashboard` onde o aluno visualiza e gerencia suas aulas
- **Agenda do Professor**: Página `/professor/agenda` onde o professor visualiza seus agendamentos
- **API de Bookings**: Endpoint `/api/bookings` que lista agendamentos
- **API de Booking Series**: Endpoint `/api/booking-series` que gerencia séries recorrentes

## Requirements

### Requirement 1

**User Story:** Como aluno, eu quero cancelar uma série de agendamentos recorrentes, para que eu possa desistir de aulas futuras quando necessário.

#### Acceptance Criteria

1. WHEN o aluno visualiza suas séries ativas no dashboard THEN o sistema SHALL exibir o botão "Cancelar Série" para cada série ativa
2. WHEN o aluno clica em "Cancelar Série" THEN o sistema SHALL exibir um modal com opções de cancelamento (apenas próxima aula ou toda a série)
3. WHEN o aluno confirma o cancelamento THEN o sistema SHALL enviar a requisição para o endpoint de cancelamento com o series_id e booking_id corretos
4. WHEN o cancelamento é processado com sucesso THEN o sistema SHALL atualizar a lista de séries e bookings do aluno
5. WHEN o endpoint de listagem de bookings é chamado para um aluno THEN o sistema SHALL retornar o campo series_id para cada booking que pertence a uma série
6. WHEN o cancelamento de toda a série é confirmado THEN o sistema SHALL cancelar todos os bookings futuros da série e estornar os créditos correspondentes

### Requirement 2

**User Story:** Como professor, eu quero visualizar os agendamentos recorrentes dos meus alunos na minha agenda, para que eu possa me preparar adequadamente para as aulas.

#### Acceptance Criteria

1. WHEN o professor acessa sua agenda THEN o sistema SHALL exibir todos os bookings com alunos, incluindo os de séries recorrentes
2. WHEN o endpoint de listagem de bookings é chamado para um professor THEN o sistema SHALL retornar os campos series_id e is_reserved para cada booking
3. WHEN um booking pertence a uma série THEN o sistema SHALL exibir um indicador visual "🔄 Série" no card do booking
4. WHEN um booking está reservado (is_reserved=true) THEN o sistema SHALL exibir o status "Reservada" com cor âmbar
5. WHEN o professor clica em um booking de série THEN o sistema SHALL exibir os detalhes incluindo informação de que faz parte de uma série

### Requirement 3

**User Story:** Como professor, eu quero visualizar as séries de agendamentos dos meus alunos, para que eu possa ter uma visão geral dos compromissos recorrentes.

#### Acceptance Criteria

1. WHEN o professor acessa o endpoint GET /api/booking-series/teacher/my-series THEN o sistema SHALL retornar todas as séries onde o professor é o teacher_id
2. WHEN a lista de séries é retornada THEN o sistema SHALL incluir informações do aluno (nome), academia e detalhes da recorrência
3. WHEN uma série está ativa THEN o sistema SHALL exibir o status "ACTIVE" e permitir visualização dos bookings associados
4. WHEN o professor visualiza uma série THEN o sistema SHALL mostrar quantas aulas estão confirmadas e quantas estão reservadas

### Requirement 4

**User Story:** Como sistema, eu quero garantir que os dados de séries sejam consistentes entre frontend e backend, para que as operações funcionem corretamente.

#### Acceptance Criteria

1. WHEN um booking é criado como parte de uma série THEN o sistema SHALL persistir o series_id no banco de dados
2. WHEN o endpoint GET /api/bookings retorna bookings para aluno THEN o sistema SHALL incluir series_id e is_reserved na resposta JSON
3. WHEN o endpoint GET /api/bookings retorna bookings para professor THEN o sistema SHALL incluir series_id e is_reserved na resposta JSON
4. WHEN o frontend recebe a lista de bookings THEN o sistema SHALL mapear corretamente os campos series_id e is_reserved para o estado local
5. WHEN o frontend tenta cancelar uma série THEN o sistema SHALL usar o series_id correto do booking selecionado

### Requirement 5

**User Story:** Como professor, eu quero poder cancelar aulas de séries recorrentes quando necessário, para que eu possa gerenciar minha disponibilidade.

#### Acceptance Criteria

1. WHEN o professor visualiza um booking de série na agenda THEN o sistema SHALL permitir cancelar apenas aquela aula específica
2. WHEN o professor cancela uma aula de série THEN o sistema SHALL notificar o aluno sobre o cancelamento
3. WHEN uma aula de série é cancelada pelo professor THEN o sistema SHALL estornar o crédito do aluno se a aula estava confirmada
