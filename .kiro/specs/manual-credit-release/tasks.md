# Plano de Implementação - Liberação Manual de Créditos

- [x] 1. Criar migração de banco de dados

  - [x] 1.1 Criar tabela credit_grants com índices
    - Criar arquivo de migração SQL em apps/api/migrations/
    - Definir tabela com campos: id, recipient_id, recipient_email, recipient_name, credit_type, quantity, reason, granted_by_id, granted_by_email, franqueadora_id, franchise_id, transaction_id, created_at
    - Criar índices para recipient_id, granted_by_id, franqueadora_id, franchise_id, created_at
    - _Requirements: 1.5_
  - [x] 1.2 Atualizar constraints das tabelas de transação
    - Adicionar tipo GRANT nas constraints de student_class_tx e hour_tx
    - Adicionar source ADMIN nas constraints de ambas as tabelas
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Atualizar enums no Prisma schema

  - [x] 2.1 Adicionar GRANT aos enums de tipo de transação
    - Atualizar StudentClassTxType para incluir GRANT
    - Atualizar HourTxType para incluir GRANT
    - Adicionar ADMIN ao TxSourceEnum
    - Executar prisma generate
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Estender o BalanceService

  - [x] 3.1 Adicionar método grantStudentClasses
    - Implementar método que cria transação GRANT e atualiza total_purchased
    - Garantir criação automática de saldo se não existir
    - Usar source ADMIN na transação
    - _Requirements: 1.1, 1.2, 4.1, 6.3_
  - [x] 3.2 Adicionar método grantProfessorHours
    - Implementar método que cria transação GRANT e atualiza available_hours
    - Garantir criação automática de saldo se não existir
    - Usar source ADMIN na transação
    - _Requirements: 1.1, 1.2, 4.2, 6.3_

- [x] 4. Criar serviço de auditoria de créditos

  - [x] 4.1 Criar credit-grant.service.ts
    - Implementar método createGrantAudit para registrar na tabela credit_grants
    - Implementar método getGrantHistory com filtros e paginação
    - _Requirements: 1.5, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Criar rotas de API para liberação de créditos

  - [x] 5.1 Criar arquivo credits.ts em routes
    - Configurar router com requireAuth e requireRole
    - Implementar middleware de verificação de funcionalidade habilitada
    - _Requirements: 2.4_
  - [x] 5.2 Implementar POST /api/admin/credits/grant
    - Validar entrada com Zod (userEmail, creditType, quantity, reason)
    - Verificar se usuário existe (USER_NOT_FOUND)
    - Verificar escopo de franquia (UNAUTHORIZED_FRANCHISE)
    - Verificar quantidade válida (INVALID_QUANTITY)
    - Verificar confirmação para qty > 100 (HIGH_QUANTITY_NOT_CONFIRMED)
    - Chamar balanceService.grantStudentClasses ou grantProfessorHours
    - Criar registro de auditoria
    - Retornar balance, transaction e grantId
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.3, 3.4, 6.1, 6.2_
  - [x] 5.3 Implementar GET /api/admin/credits/search-user
    - Buscar usuário por email
    - Retornar dados do usuário, saldos e franquias associadas
    - Aplicar escopo de franquia para admin de franquia
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 3.1, 3.2_
  - [x] 5.4 Implementar GET /api/admin/credits/history
    - Implementar filtros por período, email, tipo, grantedBy
    - Aplicar escopo de franquia para admin de franquia
    - Retornar resultados paginados
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 5.5 Registrar rotas no server.ts
    - Importar e usar creditsRouter
    - _Requirements: 1.1_

- [x] 6. Implementar verificação de funcionalidade habilitada
  - [x] 6.1 Criar middleware checkCreditReleaseEnabled
    - Verificar settings.manualCreditReleaseEnabled da franquia
    - Retornar FEATURE_DISABLED se desabilitado
    - Permitir sempre para admin de franqueadora
    - _Requirements: 2.4_

- [x] 7. Implementar escopo de permissões
  - [x] 7.1 Criar helper para verificar associação usuário-franquia
    - Verificar em academy_students e academy_teachers
    - Retornar true se usuário está associado à franquia
    - _Requirements: 3.2, 3.4_

- [x] 8. Criar componentes compartilhados de créditos

  - [x] 8.1 Criar componente CreditGrantForm
    - Criar arquivo apps/web/components/credits/credit-grant-form.tsx
    - Campo de busca de email com debounce usando React Query
    - Exibir dados do usuário encontrado e saldo atual
    - Select para tipo de crédito (STUDENT_CLASS, PROFESSOR_HOUR)
    - Input para quantidade com validação
    - Textarea para motivo obrigatório
    - Diálogo de confirmação para qty > 100
    - _Requirements: 8.3, 8.5_

  - [x] 8.2 Criar componente CreditGrantHistory
    - Criar arquivo apps/web/components/credits/credit-grant-history.tsx
    - Tabela com colunas: destinatário, tipo, quantidade, motivo, liberador, data
    - Filtros por período, email, tipo
    - Paginação com React Query
    - _Requirements: 8.4_

- [x] 9. Criar página de créditos para Franqueadora

  - [x] 9.1 Criar página /franqueadora/dashboard/creditos
    - Criar arquivo apps/web/app/franqueadora/dashboard/creditos/page.tsx
    - Usar layout existente da franqueadora
    - Integrar CreditGrantForm e CreditGrantHistory
    - Permitir visualizar todas as franquias
    - _Requirements: 8.1, 8.3, 8.4_

- [x] 10. Criar página de créditos para Franquia

  - [x] 10.1 Criar página /franquia/dashboard/creditos
    - Criar arquivo apps/web/app/franquia/dashboard/creditos/page.tsx
    - Reutilizar componentes CreditGrantForm e CreditGrantHistory
    - Aplicar escopo de franquia automaticamente
    - Verificar se funcionalidade está habilitada via API
    - Redirecionar para dashboard se desabilitada
    - _Requirements: 8.2, 2.3_

  - [x] 10.2 Adicionar item no menu da franquia
    - Atualizar menu lateral da franquia
    - Adicionar link para /franquia/dashboard/creditos
    - Ocultar se funcionalidade desabilitada (verificar settings)
    - _Requirements: 2.2_

- [x] 11. Implementar configuração de habilitação na UI

  - [x] 11.1 Adicionar toggle nas configurações da franquia (visão franqueadora)
    - Atualizar página apps/web/app/franqueadora/dashboard/franquia/[id]/page.tsx
    - Adicionar switch para manualCreditReleaseEnabled
    - Disponível apenas para admin de franqueadora
    - Atualizar settings da academy via API PATCH /api/academies/:id
    - _Requirements: 2.1, 2.5_
