# Implementation Plan - Novo Usuário na Franqueadora

- [x] 1. Criar endpoint backend para criar novo usuário





  - Implementar POST /api/franqueadora/usuarios
  - Validar autenticação como franqueadora
  - Validar dados (CPF, email, senha, etc)
  - Criar usuário com status APPROVED
  - Gerar senha temporária
  - Registrar created_by_franqueadora = true
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 4.3_

- [ ]* 1.1 Write property test for user creation with APPROVED status
  - **Property 1: Usuário criado é automaticamente aprovado**
  - **Validates: Requirements 2.1, 2.2**

- [ ] 2. Implementar upload de carteirinha para professor
  - Adicionar suporte a upload de arquivo no endpoint
  - Salvar arquivo no storage (Supabase)
  - Registrar URL da carteirinha no banco
  - _Requirements: 1.2, 4.1_

- [ ]* 2.1 Write property test for professor CREF and card
  - **Property 4: Professor criado tem CREF e carteirinha**
  - **Validates: Requirements 4.1**

- [ ] 3. Implementar envio de email de boas-vindas
  - Criar template de email de boas-vindas
  - Enviar email com credenciais e senha temporária
  - Registrar erro se falhar, mas não impedir criação
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 3.1 Write property test for welcome email
  - **Property 2: Email de boas-vindas contém credenciais**
  - **Validates: Requirements 3.1, 3.2**

- [ ] 4. Criar componente Modal de seleção de tipo
  - Implementar ModalNovoUsuário com seletor Professor/Aluno
  - Exibir botões de seleção com ícones
  - Ao selecionar, exibir formulário específico
  - _Requirements: 1.1_

- [ ]* 4.1 Write unit test for modal type selection
  - Verificar que modal exibe dois botões (Professor/Aluno)
  - Verificar que ao clicar em Professor, formulário de professor aparece
  - Verificar que ao clicar em Aluno, formulário de aluno aparece

- [ ] 5. Reutilizar formulário de cadastro existente
  - Extrair campos comuns do RegisterTemplate
  - Criar componente FormulárioUsuário reutilizável
  - Adicionar campos específicos de professor (CREF, carteirinha)
  - _Requirements: 1.2, 1.3, 4.1, 4.2_

- [ ]* 5.1 Write unit test for form field validation
  - Verificar validação de CPF
  - Verificar validação de email
  - Verificar validação de senha (mínimo 6 caracteres)
  - Verificar validação de CREF (formato)

- [ ] 6. Integrar modal na página de usuários da franqueadora
  - Adicionar botão "Novo usuário" na página /franqueadora/dashboard/usuarios
  - Conectar botão ao modal
  - Ao submeter, chamar endpoint de criação
  - _Requirements: 1.1, 5.1, 5.2_

- [ ]* 6.1 Write integration test for complete flow
  - Clicar em "Novo usuário"
  - Selecionar tipo (Professor ou Aluno)
  - Preencher formulário
  - Submeter
  - Verificar que usuário foi criado
  - Verificar que modal fechou
  - Verificar que usuário aparece na lista

- [ ] 7. Implementar feedback de sucesso/erro
  - Exibir toast de sucesso ao criar usuário
  - Exibir toast de erro se falhar
  - Indicar se email foi enviado com sucesso
  - Fechar modal após sucesso
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 7.1 Write property test for error messages
  - **Property 3: Mensagens de erro descritivas**
  - **Validates: Requirements 5.3**

- [ ] 8. Atualizar lista de usuários após criação
  - Recarregar lista de usuários após sucesso
  - Novo usuário deve aparecer na lista
  - _Requirements: 5.5_

- [ ]* 8.1 Write property test for user appearing in list
  - **Property 5: Usuário criado aparece na lista**
  - **Validates: Requirements 5.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implementar validações de dados
  - Validar CPF (formato e dígitos verificadores)
  - Validar email (formato e unicidade)
  - Validar senha (mínimo 6 caracteres)
  - Validar CREF (formato 12345-G/SP)
  - Validar campos obrigatórios
  - _Requirements: 1.4, 1.5, 4.3_

- [ ]* 10.1 Write property test for validation consistency
  - **Property 3: Formulário reutiliza validações**
  - **Validates: Requirements 4.3**

- [ ] 11. Implementar geração de senha temporária
  - Gerar senha aleatória (mínimo 6 caracteres)
  - Enviar no email
  - Usuário deve alterar na primeira vez que fizer login
  - _Requirements: 3.2, 3.5_

- [ ]* 11.1 Write unit test for temporary password generation
  - Verificar que senha tem mínimo 6 caracteres
  - Verificar que senha é aleatória
  - Verificar que senha é enviada no email

- [ ] 12. Adicionar auditoria (created_by_franqueadora)
  - Registrar que usuário foi criado pela franqueadora
  - Usar para diferenciar aprovação automática
  - _Requirements: 2.3_

- [ ]* 12.1 Write property test for audit trail
  - **Property 1: Usuário criado é automaticamente aprovado**
  - **Validates: Requirements 2.3**

- [ ] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
