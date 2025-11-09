# Plano de Ação de Segurança – Supabase (Security Advisor)

Este documento consolida o diagnóstico do Security Advisor do Supabase e define um plano de ação seguro (sem quebrar funcionalidades) para mitigar os riscos identificados.

## Objetivo
- Endurecer segurança de dados e acesso (RLS e funções),
- Evitar regressões aplicando mudanças em ambiente isolado primeiro,
- Estabelecer processo contínuo de verificação.

## Contexto do Projeto
- Organização: mvpbackend (id: `rtmiuxcsiitzmfymftmw`)
- Projeto: meupersonaldev's Project (id: `fstbhakmmznfdeluyexc`, região: `sa-east-1`)

## Diagnóstico (Security Advisor)
Fonte: Supabase Security Advisor (MCP).

### P0 – ERROS (ação imediata)
- RLS desativado em tabelas do schema `public` (expostas via PostgREST):
  - `users`
  - `bookings`
  - `reviews`
  - `transactions`
  - `academy_time_slots`
  - `approval_requests`
  - `franchise_leads`
  - `franchise_notifications`
  - `student_units`, `professor_units`
  - `student_subscriptions`, `teacher_subscriptions`, `teacher_preferences`
  - `franchisor_policies`, `franqueadora_contacts`, `academy_policy_overrides`

Risco: dados expostos/leitura/escrita indevida por clientes se endpoints estiverem acessíveis via PostgREST.

### P1 – ALERTAS (endurecimento recomendado)
- `function_search_path_mutable`: funções PL/pgSQL sem `search_path` fixo, ex.: 
  - `public.ensure_single_active_unit`, `increment_consumed`, `increment_locked`,
  - `get_academy_stats`, `set_updated_at_timestamp`, `update_notifications_updated_at`, `update_payments_updated_at`,
  - `check_slot_availability`, `book_time_slot`, `release_time_slot`, `get_available_slots`, `check_all_academies_have_slots`,
  - `auto_release_slot_on_cancel`, `handle_new_user`, `update_updated_at_column`, `add_credits`, `add_teacher_hours`, ...

Risco: alteração de `search_path` por caller/role pode direcionar a chamadas inadvertidas.

### P2 – Configurações de Autenticação
- `Leaked Password Protection` desativado.

Risco: senhas comprometidas não são bloqueadas.

> Referências de remediação (Supabase):
> - RLS: https://supabase.com/docs/guides/auth/row-level-security
> - Funções/search_path: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
> - Password security: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## Estratégia Sem Quebra (Rollout em Fases)

### Fase 0 – Preparação (Sem Downtime)
1. Criar branch de desenvolvimento no Supabase para testes isolados (ex.: `secure-audit`).
   - Usaremos MCP para criar o branch (custo baixo, confirmado previamente) e aplicar migrações/ajustes lá.
2. Exportar/mirror das funções e políticas atuais (para diff/rollback).
3. Mapear chamadas sensíveis do backend (service role) e do frontend (anon) para saber quem precisa bypass/claims.

### Fase 1 – Ativar RLS com Políticas Permissivas de Transição
Objetivo: ligar RLS sem quebrar. Políticas temporárias (equivalentes ao comportamento atual), e depois endurecer por tabela.

Exemplos (template):
- Papel service role (backend): permitir tudo nas tabelas necessárias (uso via `SUPABASE_SERVICE_ROLE` no backend).
- Usuário autenticado: permitir somente o que já faz hoje via API. Exemplos iniciais:
  - `users`: SELECT/UPDATE somente na própria linha (`id = auth.uid()`).
  - `bookings`:
    - aluno: SELECT/INSERT/UPDATE/DELETE onde `student_id = auth.uid()`;
    - professor: SELECT onde `teacher_id = auth.uid()`;
  - `reviews`: aluno só cria/edita as próprias; professor pode ler as suas.
  - `academy_time_slots`: SELECT público autenticado; INSERT/UPDATE restrito a service role/gestão.
  - `transactions`: SELECT somente do dono (`user_id = auth.uid()`); INSERT/UPDATE somente por service role.

Passos práticos por tabela (em `secure-audit`):
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
2. Criar políticas com `USING` e `WITH CHECK` que reflitam as regras acima.
3. Testes end-to-end no ambiente de branch.

### Fase 2 – Endurecimento por Domínio
Refinar políticas usando claims e papéis:
- Perfis/roles: `role` no JWT (`student`, `teacher`, `admin`) para simplificar políticas.
- Permissões por coluna (se necessário) e separação de escrita/leitura.
- Políticas específicas de auditoria (ex.: impedir UPDATE em campos sensíveis).

### Fase 3 – Funções com `search_path` Fixo
Aplicar `ALTER FUNCTION schema.fn SET search_path = 'pg_catalog, public';` (ou conforme recomendação do linter) para todas as funções sinalizadas.
- Onde houver `SECURITY DEFINER`, garantir `set search_path` e revisar privilégios do owner.
- Rodar novamente o advisor até zerar os avisos.

### Fase 4 – Autenticação
- Ativar `Leaked Password Protection` no Supabase Auth.
- (Opcional) Fortalecer requisitos de senha e MFA para perfis internos.

### Fase 5 – Revisão e Rollout
1. Reexecutar Security Advisor no branch `secure-audit` até “verde”.
2. Janela de mudança: aplicar as mesmas migrações no projeto principal.
3. Smoke tests (login, cadastro, agendamento, avaliações, pagamentos, check-in QR, etc.).
4. Monitoramento (logs e SLOs) por 24-48h.

---

## Plano Técnico por Item (Resumo)

### 1) RLS
- Habilitar RLS por tabela do `public`.
- Criar políticas mínimas por ator (aluno/professor/admin) e por operação.
- Testar queries do frontend (anon/authed) e backend (service role) antes do rollout.

### 2) Funções
- Listar todas as funções sinalizadas.
- Executar `ALTER FUNCTION ... SET search_path = 'pg_catalog, public';`.
- Recriar com owner adequado e revisar `SECURITY DEFINER` só quando inevitável.

### 3) Auth
- Ativar proteção de senhas vazadas.
- (Opcional) Configurar MFA para painéis administrativos.

### 4) Automação/CI
- Adicionar passo de auditoria no CI que chama o Security Advisor (MCP) e falha PRs com regressões críticas (RLS desligado, funções sem `search_path`, etc.).

---

## Checklist de Execução
- [ ] Criar branch Supabase `secure-audit` e migrar.
- [ ] Mapear fluxos de dados e papéis (JWT claims) no backend/FE.
- [ ] Ativar RLS + políticas de transição nas tabelas listadas.
- [ ] Endurecer políticas por domínio (bookings, reviews, subscriptions, etc.).
- [ ] Fixar `search_path` em todas as funções sinalizadas.
- [ ] Ativar `Leaked Password Protection` no Auth.
- [ ] Revalidar Security Advisor e resolver resíduos.
- [ ] Aplicar mudanças no projeto principal e monitorar.

---

## Riscos e Mitigações
- Quebra de consultas por RLS: começar com políticas de transição e validar no branch.
- Funções quebrando por `search_path`: aplicar primeiro no branch e executar testes de agendamento/slots.
- Janela de indisponibilidade: executar DDL fora de horário de pico; migrações pequenas e reversíveis.

---

## Observações Finais
- Este plano prioriza segurança sem interromper o produto. 
- Próximo passo: criar o branch `secure-audit` e iniciar a Fase 1 (RLS + políticas de transição), acompanhando com testes end-to-end.
