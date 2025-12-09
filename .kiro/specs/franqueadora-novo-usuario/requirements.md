# Requirements Document - Novo Usuário na Franqueadora

## Introduction

A franqueadora precisa de um fluxo para criar novos usuários (alunos ou professores) diretamente no sistema. O fluxo deve ser intuitivo: primeiro seleciona o tipo de usuário, depois preenche o formulário específico (professor ou aluno), e automaticamente aprova o usuário criado. Um email de boas-vindas é enviado ao novo usuário com instruções de acesso.

## Glossary

- **Franqueadora**: Empresa matriz que gerencia múltiplas franquias
- **Professor**: Profissional que oferece aulas/serviços (requer aprovação normalmente, mas aqui é automática)
- **Aluno**: Cliente que contrata serviços (requer aprovação normalmente, mas aqui é automática)
- **Aprovação Automática**: Usuários criados pela franqueadora são automaticamente aprovados
- **Email de Boas-vindas**: Mensagem enviada ao novo usuário com credenciais e link de acesso
- **Formulário de Cadastro**: Conjunto de campos específicos para professor ou aluno

## Requirements

### Requirement 1

**User Story:** Como administrador da franqueadora, quero criar um novo usuário (professor ou aluno) no sistema, para que eu possa gerenciar meus usuários centralizadamente.

#### Acceptance Criteria

1. WHEN o administrador clica no botão "Novo usuário" THEN o sistema SHALL exibir um modal/página com opção de selecionar tipo de usuário (Professor ou Aluno)
2. WHEN o administrador seleciona "Professor" THEN o sistema SHALL exibir o formulário completo de cadastro de professor
3. WHEN o administrador seleciona "Aluno" THEN o sistema SHALL exibir o formulário completo de cadastro de aluno
4. WHEN o administrador preenche o formulário e clica em "Criar" THEN o sistema SHALL validar todos os campos obrigatórios
5. IF algum campo obrigatório estiver vazio THEN o sistema SHALL exibir mensagem de erro e não criar o usuário

### Requirement 2

**User Story:** Como administrador da franqueadora, quero que usuários criados por mim sejam automaticamente aprovados, para que eles possam acessar a plataforma imediatamente.

#### Acceptance Criteria

1. WHEN um professor é criado pela franqueadora THEN o sistema SHALL definir status como "APPROVED" automaticamente
2. WHEN um aluno é criado pela franqueadora THEN o sistema SHALL definir status como "APPROVED" automaticamente
3. WHEN o usuário é criado THEN o sistema SHALL registrar que foi criado pela franqueadora (audit trail)

### Requirement 3

**User Story:** Como novo usuário criado pela franqueadora, quero receber um email de boas-vindas com instruções de acesso, para que eu possa começar a usar a plataforma.

#### Acceptance Criteria

1. WHEN um novo usuário é criado com sucesso THEN o sistema SHALL enviar um email de boas-vindas para o endereço fornecido
2. WHEN o email é enviado THEN ele SHALL conter o nome do usuário, email de acesso, senha temporária e link para fazer login
3. WHEN o email é enviado THEN ele SHALL seguir o template padrão de boas-vindas da plataforma
4. IF o envio de email falhar THEN o sistema SHALL registrar o erro mas não impedir a criação do usuário
5. WHEN o usuário recebe o email THEN ele SHALL usar a senha temporária para fazer login na primeira vez

### Requirement 4

**User Story:** Como administrador da franqueadora, quero que o formulário de cadastro seja o mesmo usado no cadastro normal, para manter consistência e evitar duplicação de código.

#### Acceptance Criteria

1. WHEN o formulário de professor é exibido THEN o sistema SHALL reutilizar os mesmos campos do cadastro normal de professor
2. WHEN o formulário de aluno é exibido THEN o sistema SHALL reutilizar os mesmos campos do cadastro normal de aluno
3. WHEN o usuário é criado THEN o sistema SHALL aplicar as mesmas validações do cadastro normal
4. WHEN o usuário é criado THEN o sistema SHALL usar os mesmos serviços/endpoints do cadastro normal

### Requirement 5

**User Story:** Como administrador da franqueadora, quero feedback claro sobre o sucesso ou falha da criação, para que eu saiba se o usuário foi criado corretamente.

#### Acceptance Criteria

1. WHEN o usuário é criado com sucesso THEN o sistema SHALL exibir mensagem de sucesso com nome do usuário
2. WHEN o usuário é criado com sucesso THEN o sistema SHALL fechar o modal/formulário e retornar à lista de usuários
3. IF ocorrer erro durante a criação THEN o sistema SHALL exibir mensagem de erro descritiva
4. WHEN o email é enviado com sucesso THEN o sistema SHALL indicar que o email foi enviado
5. WHEN o usuário retorna à lista THEN o novo usuário SHALL aparecer na lista de usuários da franqueadora
