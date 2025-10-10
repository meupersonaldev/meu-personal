# Checklist – Nova lógica de créditos por franqueadora

## 1. Preparação do ambiente
- [ ] Atualizar `.env`/config server com as novas variáveis já exigidas (Supabase, ASAAS, etc.).
- [ ] Instalar dependências e aplicar migrations:
  ```bash
  npm install
  npm run db:migrate
  ```
- [ ] Validar se o serviço da API sobe sem erros (`npm run dev` ou equivalente).

## 2. Normalização dos dados existentes
- [ ] Fazer backup das tabelas antigas (`student_packages`, `hour_packages`, `student_class_balance`, `prof_hour_balance`, etc.).
- [ ] Executar a migration `20251009_global_credits.sql` (já inclusa) para adicionar `franqueadora_id` e ajustes.
- [ ] Conferir se todos os registros receberam `franqueadora_id` (consultas no Supabase).

## 3. Seed de pacotes padrão
- [ ] Configurar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] (Opcional) Limpar registros anteriores das tabelas de pacotes.
- [ ] Rodar:
  ```bash
  node apps/api/seed-catalogs.js
  ```
- [ ] Verificar pacotes criados (`docs/instrucoes-seed-pacotes.md` tem os detalhes).

## 4. Sincronização do saldo legado
- [ ] Executar `node apps/api/scripts/sync-user-credits.js` para alinhar `users.credits` ao saldo global.
- [ ] Caso necessário, reexecutar após migrações manuais.

## 5. Testes de fluxo (API + Web)
- [ ] Comprar pacote como aluno → verificar checkout Asaas e saldo global.
- [ ] Comprar pacote de horas como professor → verificar saldo disponível.
- [ ] Agendar aula usando créditos globais: unidade A (aluno) x unidade B (professor) com saldo global.
- [ ] Cancelar aula >4h e confirmar reembolso dos créditos globais.
- [ ] Validar scheduler T-4h (locks → consumo).

## 6. Validar telas e menus
- [ ] `/franqueadora/pacotes/aluno` e `/franqueadora/pacotes/professor` exibindo apenas 2 pacotes default e criação funcionando.
- [ ] `/aluno/comprar` mostrando apenas pacotes definidos pela franqueadora (dependendo da unidade ativa).
- [ ] `/professor/comprar-horas` filtrando os novos pacotes globais.
- [ ] Ajustar dashboards legados (franquia/professor) que ainda apontem para `users.credits`.

## 7. Monitoramento e rollout
- [ ] Adicionar métricas/logs para novas rotas (`/packages/*/manage`).
- [ ] Atualizar documentações internas (`logicaplanos.md`, runbooks).
- [ ] Comunicar times (produto/ops) sobre o novo modelo de créditos.

## 8. Pós-deploy
- [ ] Verificar logs do Asaas (callbacks) e Supabase (RPCs de crédito).
- [ ] Monitorar feedback dos usuários (aluno/professor) nas primeiras horas.
- [ ] Planejar remoção futura do campo legado `users.credits` após confirmação do rollout.
