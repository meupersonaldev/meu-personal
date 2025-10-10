# Plano de adequação da lógica de créditos (escopo da franqueadora)

## 1. Diagnóstico do modelo atual
- Compras de créditos/alocação de horas exigem `unit_id` em praticamente todas as camadas (`apps/api/src/routes/packages.ts`, `apps/api/src/services/payment-intent.service.ts`, `apps/api/src/services/balance.service.ts`), o que obriga a franqueadora a replicar catálogos por unidade.
- O saldo de alunos e professores é armazenado por unidade (`student_class_balance`, `prof_hour_balance`) e as transações (`student_class_tx`, `hour_tx`) herdam o mesmo vínculo, limitando o uso de créditos fora da unidade de origem.
- Agendamentos feitos pelo aluno (`apps/api/src/routes/student-bookings.ts`) debitam créditos consultando `academies.credits_per_class`, reforçando regras específicas por unidade.
- O front-end do aluno (`apps/web/app/aluno/inicio/page.tsx` e `apps/web/lib/stores/student-units-store.ts`) assume que pacotes, saldo e professores dependem de uma unidade “ativa” selecionada.
- Seeds e migrations (`apps/api/seed-catalogs.js`, `apps/api/migrations/20251004_phase1_schema.sql`) também trabalham com catálogos por unidade, perpetuando a duplicação.

## 2. Resultado desejado
- A franqueadora configura um catálogo único de créditos (alunos) e horas (professores); unidades apenas consomem.
- Alunos e professores utilizam seus créditos/horas em qualquer unidade da mesma franqueadora, sem necessidade de transferência manual.
- Processos automáticos (checkout ASAAS, débito em agendamentos, scheduler T-4h, relatórios financeiros) operam com saldos globais da franqueadora.
- Experiência do front-end remove a dependência de “unidade ativa” para compras e exibição de saldo, mantendo apenas a seleção de unidade no fluxo de agendamento.

## 3. Macro diretrizes de arquitetura
- Introduzir `franqueadora_id` como chave de escopo para pacotes, saldos e transações; `unit_id` passa a ser metadado opcional (local de consumo, não de propriedade).
- Tratar saldos de aluno/professor como agregados globais (por franqueadora) e, opcionalmente, manter visões auxiliares por unidade para BI.
- Centralizar o catálogo em novas tabelas (`franchise_student_packages`, `franchise_hour_packages`) ou normalizar as existentes removendo a obrigatoriedade de `unit_id`.
- Adaptar serviços para aceitar um contexto `{ franqueadoraId, unitContext? }`, garantindo compatibilidade com relatórios por unidade.
- Criar feature flag / toggle (env ou config) para migrar gradualmente clientes do modelo “por unidade” para o “global” se necessário.

## 4. Plano de ação (ordem preferencial)

### Fase 0 — Preparação e alinhamentos
- Validar com produto as regras comerciais (quantidade de catálogos por franqueadora, políticas de preço, limites de uso em unidades).
- Mapear franqueadora(s) existentes e relacionamentos com unidades para alimentar script de migração.
- Definir estratégia de migração de saldo (ex.: somar todos os saldos por aluno/professor entre unidades; guardar backup por unidade).

### Fase 1 — Camada de dados
- Criar migrations para:
  - Adicionar `franqueadora_id` obrigatório em `student_packages`, `hour_packages`, `payment_intents`, `student_class_balance`, `prof_hour_balance`, `student_class_tx`, `hour_tx`.
  - Tornar `unit_id` opcional nesses objetos e renomear para `last_unit_id` (origem de consumo) onde fizer sentido.
  - Criar novas tabelas de catálogo global (se preferido) e views de compatibilidade para consumo antigo.
  - Ajustar índices e constraints (`UNIQUE (student_id, franqueadora_id)` etc.).
- Atualizar seeds (`apps/api/seed-catalogs.js`) para gerar pacotes únicos por franqueadora.
- Preparar scripts de migração: agregar saldos atuais por usuário, transferir histórico e manter log para auditoria.

### Fase 2 — Serviços de domínio
- Refatorar `balanceService` para operar em escopo de franqueadora:
  - Métodos `getStudentBalance`, `purchaseStudentClasses`, `lock/consume/unlock` passam a receber `franqueadoraId` e opcional `contextUnitId`.
  - Registrar `unit_id` apenas como metadado nas transações.
- Ajustar `paymentIntentService` para salvar intents no escopo da franqueadora e remover dependência de `unit_id` obrigatório; metadados devem carregar qual unidade originou a compra (se houver).
- Revisar scheduler (`apps/api/src/jobs/booking-scheduler.ts`) para usar saldos globais ao consumir/desbloquear créditos, mantendo notificações com contexto da unidade agendada.

### Fase 3 — Rotas e controladores
- Atualizar rotas de pacotes (`/api/packages/student`, `/api/packages/professor`) para aceitar filtro opcional de franqueadora e remover obrigação de `unit_id`.
- Adaptar checkout (`/api/packages/*/checkout`) para enviar `franqueadora_id` (derivado do usuário logado) e armazenar a unidade somente como referência de origem da compra, não como chave do saldo.
- Refatorar `/api/bookings/student` para:
  - Debitar créditos globais e validar saldo sem filtrar por unidade.
  - Registrar `unit_id` apenas na transação e no booking.
  - Permitir uso de créditos em qualquer unidade autorizada ao aluno.
- Revisar endpoints de saldo/relatórios (`/api/financial/*`, `/api/packages/*/balance`, `/api/packages/*/transactions`) para operar com dados globais e expor filtros por unidade apenas para visualização.

### Fase 4 — Front-end
- Ajustar stores e páginas do aluno:
  - `apps/web/lib/stores/student-units-store.ts`: manter apenas relação aluno ↔ unidades para agendamento, sem interferir em crédito.
  - `apps/web/app/aluno/inicio/page.tsx`: exibir saldo global, eliminar dependência de unidade ativa para carregar pacotes, e separar claramente “saldo global” de “unidade escolhida para agendar”.
- Implementar telas para administração de pacotes na visão da franqueadora (se ainda inexistente) consumindo o novo catálogo.
- Revisar páginas/professores (agenda, créditos) para usar o novo saldo global, mantendo indicadores de qual unidade consumiu horas.

### Fase 5 — Migração e transição
- Executar scripts para consolidar saldos:
  - Somar `student_class_balance` e `prof_hour_balance` por usuário, criar registros globais e arquivar os anteriores.
  - Atualizar transações antigas (`student_class_tx`, `hour_tx`) com `franqueadora_id` e manter `unit_id` como campo informativo.
  - Converter intents pendentes para o novo formato.
- Definir janela de manutenção (curta) para travar compras/agendamentos durante a migração ou aplicar travas lógicas enquanto scripts rodam.
- Validar dados pós-migração com relatórios (saldo total antes x depois, amostragem de usuários).

### Fase 6 — QA, observabilidade e rollout
- Criar testes de integração cobrindo compra → saldo → agendamento em unidades distintas (aluno/professor).
- Revisar monitoramentos e métricas para considerar escopo global (ex.: dashboards que somavam por unidade).
- Documentar runbook de rollback (backup dos saldos por unidade, ability de restaurar views legadas).
- Habilitar a feature flag para clientes piloto, monitorar, e enfim remover código legado baseado em `unit_id`.

## 5. Riscos e pontos de atenção
- Necessidade de congelar operações durante a migração para evitar saldo inconsistido (avaliar locks transacionais).
- Rotas/admin legadas que ainda filtram por `unit_id` podem quebrar; mapear e ajustar antes da virada.
- Jobs e relatórios financeiros (`apps/api/src/routes/financial.ts`) assumem valor fixo por crédito; validar se mudança de escopo requer ajustes de precificação.
- Garantir que professores só consumam horas nas unidades onde estão habilitados, mesmo com saldo global (precisa de validação adicional na camada de agendamento).

## 6. Entregáveis principais
- Migrations + scripts de migração de saldo.
- Refatoração completa dos serviços/balance/pagamentos para `franqueadora_id`.
- Rotas atualizadas e front-end adaptado ao novo fluxo global.
- Documentação e runbook em português para operação da franqueadora.

> Follow-up: após estabilizar o fluxo global, remover views/flags de compatibilidade e atualizar documentação externa (manual de franquias) para refletir a nova dinâmica de créditos.
