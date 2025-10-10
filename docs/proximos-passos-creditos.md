# Proximos passos para consolidar creditos globais

1. **Revisar configuracoes**
   - Confirmar variaveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em `.env` e no ambiente de execucao da API.
   - Garantir que `DEFAULT_FRANQUEADORA_ID` esteja definido quando aplicavel.

2. **Aplicar migrations**
   - Executar o pipeline de migrations (ex.: `npm run db:migrate` ou script equivalente) para aplicar `20251009_global_credits.sql`.
   - Validar no banco se as colunas `franqueadora_id` foram populadas para pacotes, intents, balances e transacoes.

3. **Atualizar catalogos**
   - Rodar `node apps/api/seed-catalogs.js` se precisar gerar os pacotes padrao globais para cada franqueadora.
   - Revisar catalogos customizados existentes e ajustar para o novo formato global.

4. **Sincronizar creditos legados**
   - Executar `node apps/api/scripts/sync-user-credits.js` para alinhar o campo `users.credits` ao saldo global calculado em `student_class_balance`.
   - Repetir o script sempre que necessario ate desativar o campo legado nas UIs.

5. **Testar fluxos principais**
   - Compra de pacotes (aluno e professor) via `/api/packages/*/checkout`.
   - Agendamento de aula pelo aluno utilizando creditos globais (unidades diferentes da franqueadora).
   - Cancelamento com reembolso e execucao do scheduler de locks.
   - Conferir exibicao de saldo no dashboard do aluno e painel do professor.

6. **Atualizar dashboards legados**
   - Conferir telas que ainda exibem `user.credits` diretamente (franquia, franqueadora, professor) e migrar para os novos endpoints de saldo.
   - Ajustar consultas/relatorios financeiros para considerar o escopo `franqueadora_id`.

7. **Monitorar e documentar**
   - Acrescentar as novas rotinas ao runbook operacional.
   - Registrar no CHANGELOG a alteracao de modelo de creditos.
   - Planejar remocao definitiva do campo `users.credits` e das views/rotas antigas assim que todas as UIs dependerem do saldo global.
