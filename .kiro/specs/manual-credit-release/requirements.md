# Documento de Requisitos

## Introdução

A funcionalidade de liberação manual de créditos permite que administradores da Franqueadora e Franquia concedam créditos (aulas para alunos ou horas para professores) diretamente pelo painel administrativo. O sistema utiliza a infraestrutura existente de `balance.service.ts`, adicionando um novo tipo de transação `GRANT` com origem `ADMIN`.

## Glossário

- **Crédito**: Unidade de valor que representa aulas (para alunos) ou horas (para professores)
- **STUDENT_CLASS**: Tipo de crédito que representa aulas disponíveis para alunos
- **PROFESSOR_HOUR**: Tipo de crédito que representa horas disponíveis para professores
- **GRANT**: Tipo de transação que representa liberação manual de créditos por administrador
- **Franqueadora**: Entidade matriz que administra todas as franquias
- **Franquia**: Academia individual que opera sob a franqueadora
- **Admin Franqueadora**: Usuário com permissão de administrador na franqueadora
- **Admin Franquia**: Usuário com permissão de administrador em uma franquia específica
- **Saldo**: Quantidade atual de créditos disponíveis para um usuário
- **Transação**: Registro de movimentação de créditos (entrada ou saída)
- **Auditoria**: Registro detalhado de operações para rastreabilidade
- **Sistema_Creditos_Manual**: O sistema de liberação manual de créditos
- **Funcionalidade Habilitada**: Flag que indica se uma franquia específica pode usar a liberação manual de créditos

## Requisitos

### Requisito 1: Liberação de Créditos

**História do Usuário:** Como administrador, quero liberar créditos manualmente para usuários, para que eu possa conceder créditos fora do fluxo normal de compra.

#### Critérios de Aceitação

1. WHEN um admin submete uma requisição de liberação com email válido, tipo de crédito, quantidade e motivo THEN o Sistema_Creditos_Manual SHALL criar uma transação do tipo GRANT e atualizar o saldo do usuário
2. WHEN uma liberação de créditos é processada THEN o Sistema_Creditos_Manual SHALL aumentar o saldo do destinatário exatamente pela quantidade liberada
3. WHEN uma liberação de créditos é bem-sucedida THEN o Sistema_Creditos_Manual SHALL retornar o saldo atualizado, detalhes da transação e ID de auditoria
4. WHEN um admin tenta liberar créditos para um email inexistente THEN o Sistema_Creditos_Manual SHALL rejeitar a requisição com código de erro USER_NOT_FOUND
5. WHEN uma liberação de créditos é bem-sucedida THEN o Sistema_Creditos_Manual SHALL criar um registro de auditoria na tabela credit_grants com todos os campos obrigatórios

### Requisito 2: Controle de Habilitação por Franquia

**História do Usuário:** Como admin de franqueadora, quero habilitar ou desabilitar a funcionalidade de liberação manual de créditos para cada franquia, para que eu tenha controle sobre quais franquias podem usar este recurso.

#### Critérios de Aceitação

1. WHEN um admin de franqueadora acessa as configurações de uma franquia THEN o Sistema_Creditos_Manual SHALL exibir opção para habilitar ou desabilitar liberação manual de créditos
2. WHEN a funcionalidade está desabilitada para uma franquia THEN o Sistema_Creditos_Manual SHALL ocultar o menu de créditos no painel da franquia
3. WHEN um admin de franquia com funcionalidade desabilitada tenta acessar /franquia/dashboard/creditos THEN o Sistema_Creditos_Manual SHALL redirecionar para o dashboard com mensagem de funcionalidade não disponível
4. WHEN um admin de franquia com funcionalidade desabilitada tenta usar a API de liberação THEN o Sistema_Creditos_Manual SHALL rejeitar com código de erro FEATURE_DISABLED
5. WHEN a franqueadora habilita a funcionalidade para uma franquia THEN o Sistema_Creditos_Manual SHALL permitir acesso imediato sem necessidade de reload

### Requisito 3: Escopo de Permissões

**História do Usuário:** Como administrador do sistema, quero que admins de franquia gerenciem apenas usuários de sua franquia, para que o isolamento de dados seja mantido entre franquias.

#### Critérios de Aceitação

1. WHEN um admin de franqueadora busca usuários THEN o Sistema_Creditos_Manual SHALL retornar usuários de todas as franquias sob aquela franqueadora
2. WHEN um admin de franquia busca usuários THEN o Sistema_Creditos_Manual SHALL retornar apenas usuários associados àquela franquia específica
3. WHEN um admin de franqueadora libera créditos THEN o Sistema_Creditos_Manual SHALL permitir liberação para qualquer usuário sob aquela franqueadora
4. WHEN um admin de franquia tenta liberar créditos para um usuário não associado à sua franquia THEN o Sistema_Creditos_Manual SHALL rejeitar com código de erro UNAUTHORIZED_FRANCHISE

### Requisito 4: Tipos de Crédito

**História do Usuário:** Como administrador, quero liberar diferentes tipos de créditos, para que eu possa atender tanto alunos quanto professores.

#### Critérios de Aceitação

1. WHEN um admin seleciona tipo de crédito STUDENT_CLASS THEN o Sistema_Creditos_Manual SHALL utilizar as tabelas student_class_balance e student_class_tx
2. WHEN um admin seleciona tipo de crédito PROFESSOR_HOUR THEN o Sistema_Creditos_Manual SHALL utilizar as tabelas prof_hour_balance e hour_tx
3. WHEN uma transação GRANT é criada THEN o Sistema_Creditos_Manual SHALL usar o tipo de transação GRANT na tabela de transações apropriada

### Requisito 5: Histórico de Liberações

**História do Usuário:** Como administrador, quero visualizar o histórico de liberações de créditos, para que eu possa auditar e rastrear todas as liberações manuais.

#### Critérios de Aceitação

1. WHEN um admin solicita o histórico de liberações THEN o Sistema_Creditos_Manual SHALL retornar resultados paginados com detalhes das liberações
2. WHEN um admin filtra o histórico por período THEN o Sistema_Creditos_Manual SHALL retornar apenas liberações dentro daquele período
3. WHEN um admin filtra o histórico por email do destinatário THEN o Sistema_Creditos_Manual SHALL retornar apenas liberações para aquele destinatário
4. WHEN um admin filtra o histórico por tipo de crédito THEN o Sistema_Creditos_Manual SHALL retornar apenas liberações daquele tipo
5. WHEN um admin de franquia solicita o histórico THEN o Sistema_Creditos_Manual SHALL retornar apenas liberações feitas dentro do escopo de sua franquia

### Requisito 6: Validações e Segurança

**História do Usuário:** Como administrador do sistema, quero validações adequadas nas liberações de créditos, para que o sistema mantenha a integridade dos dados.

#### Critérios de Aceitação

1. WHEN um admin tenta liberar quantidade zero ou negativa THEN o Sistema_Creditos_Manual SHALL rejeitar com código de erro INVALID_QUANTITY
2. WHEN um admin tenta liberar mais de 100 créditos sem confirmação THEN o Sistema_Creditos_Manual SHALL rejeitar com código de erro HIGH_QUANTITY_NOT_CONFIRMED
3. WHEN um usuário não possui registro de saldo existente THEN o Sistema_Creditos_Manual SHALL criar um novo registro de saldo com a quantidade liberada
4. WHEN qualquer etapa da operação de liberação falha THEN o Sistema_Creditos_Manual SHALL reverter todas as mudanças e manter o estado original do saldo
5. WHEN uma operação de liberação é concluída THEN o Sistema_Creditos_Manual SHALL garantir atomicidade da atualização de saldo, criação de transação e registro de auditoria

### Requisito 7: Busca de Usuário

**História do Usuário:** Como administrador, quero buscar usuários por email antes de liberar créditos, para que eu possa verificar o destinatário e ver seu saldo atual.

#### Critérios de Aceitação

1. WHEN um admin busca um usuário por email THEN o Sistema_Creditos_Manual SHALL retornar detalhes do usuário incluindo nome e papel
2. WHEN buscando um aluno THEN o Sistema_Creditos_Manual SHALL retornar o saldo atual de aulas do aluno
3. WHEN buscando um professor THEN o Sistema_Creditos_Manual SHALL retornar o saldo atual de horas do professor
4. WHEN buscando um usuário com ambos os papéis THEN o Sistema_Creditos_Manual SHALL retornar ambos os tipos de saldo
5. WHEN o email buscado não existe THEN o Sistema_Creditos_Manual SHALL retornar um resultado vazio sem erro

### Requisito 8: Interface de Usuário

**História do Usuário:** Como administrador, quero uma página dedicada para gerenciar liberações de créditos, para que eu possa facilmente liberar créditos e visualizar o histórico.

#### Critérios de Aceitação

1. WHEN um admin de franqueadora acessa /franqueadora/dashboard/creditos THEN o Sistema_Creditos_Manual SHALL exibir a interface de liberação de créditos
2. WHEN um admin de franquia acessa /franquia/dashboard/creditos THEN o Sistema_Creditos_Manual SHALL exibir a interface de liberação de créditos com escopo de sua franquia
3. WHEN exibindo o formulário de liberação THEN o Sistema_Creditos_Manual SHALL mostrar campos para busca por email, seleção de tipo de crédito, entrada de quantidade e texto de motivo
4. WHEN exibindo o histórico de liberações THEN o Sistema_Creditos_Manual SHALL mostrar destinatário, tipo, quantidade, motivo, liberador e timestamp
5. WHEN uma liberação de alta quantidade é tentada THEN o Sistema_Creditos_Manual SHALL exibir um diálogo de confirmação antes de prosseguir
