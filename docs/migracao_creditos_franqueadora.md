# Migração para créditos globais por franqueadora

## Objetivo
Consolidar os créditos e horas de alunos e professores no escopo da franqueadora, substituindo o modelo baseado em unidade. Este guia complementa as migrations e scripts adicionados no código (`apps/api/migrations/20251009_global_credits.sql` e `apps/api/scripts/sync-user-credits.js`).

## Passo a passo sugerido

1. **Preparação**
   - Certifique-se de que as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estejam configuradas.
   - Programe uma janela curta de manutenção ou habilite travas lógicas em compras/agendamentos.

2. **Aplicar migrations**
   - Execute as migrations para adicionar `franqueadora_id` às tabelas de pacotes, saldos, transações e payment intents.
   - Valide se todos os registros existentes receberam o `franqueadora_id` via scripts de atualização da migration.

3. **Popular catálogos globais**
   - Rode `node apps/api/seed-catalogs.js` para regenerar pacotes de aluno e professor por franqueadora (opcional se já houver catálogo definitivo).

4. **Sincronizar créditos legados**
   - Após a migração, execute `node apps/api/scripts/sync-user-credits.js` para alinhar o campo `users.credits` ao saldo global calculado a partir de `student_class_balance`. Esse passo é importante enquanto a UI ainda lê `user.credits`.

5. **Verificações**
   - Consulte os endpoints `/api/packages/student/balance` e `/api/packages/professor/balance` para validar os saldos globais.
   - Execute relatórios comparando o total de créditos antes/depois da migração.

6. **Rollout**
   - Atualize os front-ends móveis/desktops para consumir os novos endpoints com escopo por franqueadora.
   - Monitore o scheduler e rotas de agendamento para garantir que os créditos/hora globais estejam sendo debitados corretamente.

## Observações
- O script `sync-user-credits.js` pode ser executado sempre que necessário para manter `users.credits` sincronizado até que o campo seja oficialmente depreciado.
- O novo modelo mantém `unit_id` como metadado informativo, permitindo relatórios específicos por unidade sem bloquear o uso global.
