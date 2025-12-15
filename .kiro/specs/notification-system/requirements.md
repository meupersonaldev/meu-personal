# Requirements Document

## Introduction

Sistema de notificações completo para o Meu Personal, garantindo que todos os usuários (alunos, professores, franquias, franqueadora) sejam notificados em tempo real sobre eventos relevantes. O sistema já possui infraestrutura base (SSE, pub/sub, tabela notifications) e precisa ser expandido para cobrir todos os eventos do sistema.

## Glossary

- **Notification_System**: Sistema responsável por criar, armazenar e entregar notificações aos usuários
- **SSE (Server-Sent Events)**: Protocolo de comunicação em tempo real já implementado
- **Aluno**: Usuário que agenda aulas com professores
- **Professor**: Profissional que oferece aulas e gerencia disponibilidade
- **Franquia**: Academia individual que gerencia professores e alunos
- **Franqueadora**: Entidade que gerencia múltiplas franquias

## Requirements

### Requirement 1: Notificações de Agendamento para Professor

**User Story:** Como professor, quero ser notificado sobre todas as atividades dos meus alunos, para que eu possa me preparar e acompanhar minha agenda.

#### Acceptance Criteria

1. WHEN um aluno cria um novo agendamento THEN the Notification_System SHALL criar uma notificação para o professor com título, nome do aluno, data e horário da aula
2. WHEN um aluno cancela um agendamento THEN the Notification_System SHALL notificar o professor informando o cancelamento e liberar o horário
3. WHEN um aluno reagenda uma aula THEN the Notification_System SHALL notificar o professor sobre a mudança de data/horário
4. WHEN faltam 24 horas para uma aula THEN the Notification_System SHALL enviar lembrete ao professor com detalhes do aluno e horário
5. WHEN um aluno está com créditos insuficientes para aula agendada THEN the Notification_System SHALL alertar o professor sobre possível cancelamento
6. WHEN um novo aluno se vincula ao professor THEN the Notification_System SHALL notificar o professor sobre o novo aluno
7. WHEN um aluno avalia o professor THEN the Notification_System SHALL notificar o professor sobre a nova avaliação

### Requirement 2: Notificações de Agendamento para Aluno

**User Story:** Como aluno, quero ser notificado sobre tudo relacionado às minhas aulas e conta, para que eu tenha controle total.

#### Acceptance Criteria

1. WHEN um professor cancela uma aula THEN the Notification_System SHALL notificar o aluno imediatamente com motivo (se disponível) e sugestão de reagendamento
2. WHEN um professor confirma uma aula THEN the Notification_System SHALL notificar o aluno sobre a confirmação
3. WHEN faltam 24 horas para uma aula THEN the Notification_System SHALL enviar um lembrete ao aluno com detalhes da aula (professor, horário, local)
4. WHEN uma aula é concluída THEN the Notification_System SHALL notificar o aluno para avaliar o professor
5. WHEN o agendamento é criado com sucesso THEN the Notification_System SHALL confirmar ao aluno com resumo da aula
6. WHEN o professor altera disponibilidade afetando aula futura THEN the Notification_System SHALL alertar o aluno sobre possível impacto
7. WHEN o aluno precisa comprar créditos para manter agendamentos THEN the Notification_System SHALL enviar alerta com link para compra
8. WHEN a série recorrente está próxima de expirar THEN the Notification_System SHALL lembrar o aluno de renovar

### Requirement 3: Notificações de Créditos

**User Story:** Como aluno, quero ser notificado sobre todas as movimentações nos meus créditos, para que eu tenha controle total do meu saldo.

#### Acceptance Criteria

1. WHEN créditos são debitados para uma aula THEN the Notification_System SHALL notificar o aluno com o valor debitado e saldo restante
2. WHEN o saldo de créditos fica abaixo de 2 aulas THEN the Notification_System SHALL alertar o aluno sobre saldo baixo com link para compra
3. WHEN uma compra de créditos é confirmada THEN the Notification_System SHALL notificar o aluno sobre os créditos adicionados e novo saldo
4. WHEN créditos são estornados por cancelamento THEN the Notification_System SHALL notificar o aluno sobre o estorno e novo saldo
5. WHEN créditos estão prestes a expirar THEN the Notification_System SHALL alertar o aluno com antecedência de 7 dias
6. WHEN créditos expiram THEN the Notification_System SHALL notificar o aluno sobre a perda e sugerir nova compra
7. WHEN o saldo chega a zero THEN the Notification_System SHALL alertar o aluno que não poderá agendar novas aulas

### Requirement 4: Notificações de Pagamento

**User Story:** Como usuário, quero ser notificado sobre o status dos meus pagamentos, para que eu saiba quando foram processados.

#### Acceptance Criteria

1. WHEN um pagamento é confirmado THEN the Notification_System SHALL notificar o usuário com valor e descrição
2. WHEN um pagamento falha THEN the Notification_System SHALL notificar o usuário com motivo e link para tentar novamente
3. WHEN um reembolso é processado THEN the Notification_System SHALL notificar o usuário sobre o valor estornado

### Requirement 5: Notificações de Aprovação

**User Story:** Como administrador de franquia, quero ser notificado quando novos professores ou alunos precisarem de aprovação, para que eu possa agir rapidamente.

#### Acceptance Criteria

1. WHEN um novo professor se cadastra THEN the Notification_System SHALL notificar os administradores da franquia
2. WHEN um novo aluno se cadastra (se aprovação necessária) THEN the Notification_System SHALL notificar os administradores
3. WHEN um professor é aprovado THEN the Notification_System SHALL notificar o professor sobre a aprovação
4. WHEN um professor é rejeitado THEN the Notification_System SHALL notificar o professor com motivo da rejeição

### Requirement 6: Notificações de Check-in

**User Story:** Como professor, quero ser notificado quando meu aluno fizer check-in, para que eu saiba que ele chegou.

#### Acceptance Criteria

1. WHEN um aluno faz check-in na academia THEN the Notification_System SHALL notificar o professor da aula agendada com nome do aluno
2. WHEN um check-in é registrado THEN the Notification_System SHALL notificar a recepção/admin da franquia
3. WHEN um aluno não faz check-in até 15 minutos após horário da aula THEN the Notification_System SHALL alertar o professor sobre possível falta

### Requirement 9: Notificações de Carteira do Professor

**User Story:** Como professor, quero ser notificado sobre movimentações na minha carteira, para acompanhar meus ganhos.

#### Acceptance Criteria

1. WHEN uma aula é concluída THEN the Notification_System SHALL notificar o professor sobre o valor creditado na carteira
2. WHEN um saque é solicitado THEN the Notification_System SHALL confirmar ao professor o valor e prazo de processamento
3. WHEN um saque é processado THEN the Notification_System SHALL notificar o professor que o valor foi transferido
4. WHEN o saldo da carteira atinge um valor mínimo para saque THEN the Notification_System SHALL informar o professor que pode sacar

### Requirement 10: Notificações de Disponibilidade do Professor

**User Story:** Como professor, quero ser notificado sobre conflitos e mudanças na minha disponibilidade.

#### Acceptance Criteria

1. WHEN a disponibilidade é atualizada com sucesso THEN the Notification_System SHALL confirmar ao professor as alterações
2. WHEN existe conflito entre disponibilidade e agendamentos THEN the Notification_System SHALL alertar o professor sobre os conflitos
3. WHEN um horário bloqueado afeta agendamentos futuros THEN the Notification_System SHALL listar as aulas que precisam ser reagendadas

### Requirement 7: Notificações para Franquia (Academia)

**User Story:** Como administrador de franquia, quero ser notificado sobre todas as atividades da minha academia, para ter controle total do negócio.

#### Acceptance Criteria

1. WHEN um novo agendamento é criado na academia THEN the Notification_System SHALL notificar os administradores da franquia
2. WHEN um agendamento é cancelado THEN the Notification_System SHALL notificar os administradores da franquia
3. WHEN um novo aluno se cadastra na academia THEN the Notification_System SHALL notificar os administradores
4. WHEN um novo professor se cadastra na academia THEN the Notification_System SHALL notificar os administradores
5. WHEN um pagamento é recebido THEN the Notification_System SHALL notificar os administradores com valor e origem
6. WHEN um pagamento falha THEN the Notification_System SHALL alertar os administradores
7. WHEN um check-in é realizado THEN the Notification_System SHALL notificar a recepção/admin
8. WHEN um professor solicita saque THEN the Notification_System SHALL notificar os administradores para aprovação
9. WHEN há conflito de horários entre professores THEN the Notification_System SHALL alertar os administradores
10. WHEN um aluno fica inativo por mais de 30 dias THEN the Notification_System SHALL alertar os administradores

### Requirement 11: Notificações para Franqueadora

**User Story:** Como administrador da franqueadora, quero receber notificações agregadas de todas as academias, para ter visibilidade completa do negócio.

#### Acceptance Criteria

1. WHEN uma nova franquia é ativada THEN the Notification_System SHALL notificar os administradores da franqueadora
2. WHEN um novo lead é cadastrado THEN the Notification_System SHALL notificar os administradores da franqueadora
3. WHEN políticas são atualizadas THEN the Notification_System SHALL notificar todas as franquias afetadas
4. WHEN uma franquia atinge meta de faturamento THEN the Notification_System SHALL notificar a franqueadora
5. WHEN uma franquia tem queda significativa de agendamentos THEN the Notification_System SHALL alertar a franqueadora
6. WHEN um novo professor é aprovado em qualquer franquia THEN the Notification_System SHALL notificar a franqueadora
7. WHEN há reclamação ou avaliação negativa THEN the Notification_System SHALL alertar a franqueadora
8. WHEN um pagamento de royalties é processado THEN the Notification_System SHALL notificar a franqueadora

### Requirement 8: Entrega em Tempo Real

**User Story:** Como usuário, quero receber notificações instantaneamente, para que eu possa reagir rapidamente.

#### Acceptance Criteria

1. WHEN uma notificação é criada THEN the Notification_System SHALL publicar via SSE em menos de 1 segundo
2. WHEN o usuário está offline THEN the Notification_System SHALL armazenar a notificação para entrega quando reconectar
3. WHEN o usuário reconecta THEN the Notification_System SHALL entregar notificações pendentes desde a última conexão
