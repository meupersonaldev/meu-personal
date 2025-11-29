# 📋 Meu Personal - Plano de Finalização V1 + Roadmap V2

> **Última atualização:** 29 de Novembro de 2024  
> **Fonte:** Análise do código + consulta direta ao Supabase (project: `fstbhakmmznfdeluyexc`)  
> **Objetivo:** Estabilizar funcionalidades implementadas (V1) e mapear melhorias para V2

---

## 📊 Estado Atual do Projeto

### Banco de Dados - Supabase

| Tabela | Registros | Status |
|--------|-----------|--------|
| `users` | 68 | ✅ Funcional |
| `bookings` | 79 | ✅ Funcional (73 AVAILABLE, 6 CANCELLED) |
| `academies` | 1 | ✅ Funcional |
| `teacher_profiles` | 14 | ✅ Funcional |
| `student_packages` | 13 | ✅ Funcional |
| `student_class_balance` | 41 | ✅ Funcional |
| `student_class_tx` | 72 | ✅ Funcional |
| `payment_intents` | 29 | ✅ Funcional |
| `franqueadora` | 2 | ✅ Funcional |
| `franchisor_policies` | 4 | ✅ Funcional |
| `hour_packages` | 7 | ✅ Funcional |
| `invoices` | 1 | ✅ Funcional |
| `reviews` | 0 | 🔵 V2 - Tabela existe |
| `teacher_ratings` | 0 | 🔵 V2 - Tabela existe |
| `notifications` | 0 | ⚠️ Corrigir - SSE existe mas não persiste |
| `checkins` | 0 | ⚠️ Verificar fluxo |

### Usuários por Role

| Role | Aprovados | Pendentes | Total |
|------|-----------|-----------|-------|
| STUDENT | 10 | 37 | 47 |
| TEACHER | 13 | 1 | 14 |
| FRANCHISE_ADMIN | 1 | 3 | 4 |
| SUPER_ADMIN | 1 | 2 | 3 |

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS (V1)

### 1. Autenticação e Usuários
- ✅ Login/Registro com JWT próprio
- ✅ Roles: STUDENT, TEACHER, FRANCHISE_ADMIN, SUPER_ADMIN
- ✅ Fluxo de aprovação de professores
- ✅ Upload de avatar (Supabase Storage)
- ✅ Redefinição de senha

### 2. Sistema de Créditos Globais
- ✅ Compra de pacotes de aulas (alunos)
- ✅ Compra de pacotes de horas (professores)
- ✅ Saldo global por franqueadora
- ✅ Transações registradas (`student_class_tx`, `hour_tx`)
- ✅ Integração Asaas (PIX, Boleto)

### 3. Agendamentos
- ✅ Slots de horário por academia
- ✅ Booking com débito de créditos
- ✅ Cancelamento com regras de prazo
- ✅ Scheduler T-4h automático
- ✅ Status: AVAILABLE, RESERVED, PAID, DONE, CANCELLED

### 4. Dashboard Aluno
- ✅ Seleção de unidade
- ✅ Visualização de créditos
- ✅ Lista de professores disponíveis
- ✅ Agendamento de aulas
- ✅ Histórico de aulas

### 5. Dashboard Professor
- ✅ Agenda visual (semana/dia)
- ✅ Bloqueio/liberação de horários
- ✅ Lista de alunos
- ✅ Estatísticas e histórico
- ✅ Configurações de perfil

### 6. Dashboard Franquia
- ✅ KPIs (alunos, professores, aulas, receita)
- ✅ Gestão de professores
- ✅ Gestão de alunos
- ✅ Agenda da unidade
- ✅ Histórico de agendamentos e check-ins

### 7. Dashboard Franqueadora
- ✅ Visão geral das academias
- ✅ Cadastro de novas franquias
- ✅ Gestão de usuários (contacts)
- ✅ Políticas globais (créditos, duração, tolerâncias)
- ✅ Pacotes de créditos/horas

### 8. Infraestrutura
- ✅ 43 tabelas no Supabase
- ✅ API Express com 27 arquivos de rotas
- ✅ Docker configurado
- ✅ Documentação de deploy (EasyPanel)

---

## 🔧 PLANO DE AÇÃO V1 - ESTABILIZAÇÃO

### Fase 1: Segurança (CRÍTICO)
**Objetivo:** Proteger dados antes de ir para produção

| # | Tarefa | Prioridade | Esforço |
|---|--------|------------|---------|
| 1.1 | Migrar queries diretas do FE (`franquia-store.ts`, `franqueadora-store.ts`) para API | 🔴 Alta | 2-3 dias |
| 1.2 | Criar políticas RLS restritivas (substituir `USING (true)`) | 🔴 Alta | 1-2 dias |
| 1.3 | Implementar validação de senha forte (mín 12 chars, complexidade) | 🟡 Média | 0.5 dia |
| 1.4 | Remover `test-supabase.tsx` e logs sensíveis | 🟡 Média | 0.5 dia |

### Fase 2: Correções de Fluxo
**Objetivo:** Garantir que fluxos implementados funcionem corretamente

| # | Tarefa | Prioridade | Esforço |
|---|--------|------------|---------|
| 2.1 | Verificar/corrigir fluxo de check-in (tabela vazia) | 🔴 Alta | 1 dia |
| 2.2 | Ativar persistência de notificações nos eventos de booking | 🟡 Média | 1 dia |
| 2.3 | Testar fluxo E2E: Cadastro → Compra → Agendamento → Check-in | 🔴 Alta | 1-2 dias |
| 2.4 | Verificar emails transacionais (Resend) | 🟡 Média | 0.5 dia |

### Fase 3: Limpeza de Código
**Objetivo:** Preparar para produção

| # | Tarefa | Prioridade | Esforço |
|---|--------|------------|---------|
| 3.1 | Remover/condicionar console.logs de debug | 🟡 Média | 0.5 dia |
| 3.2 | Revisar TODOs críticos (scheduler, agenda) | 🟡 Média | 1 dia |
| 3.3 | Atualizar páginas legais (termos, privacidade) com textos reais | 🟢 Baixa | Cliente |

---

## 📅 CRONOGRAMA V1 (Estimativa: 1.5-2 semanas)

```
Semana 1: Segurança
├── Dia 1-2: Migrar queries FE → API (franquia-store)
├── Dia 3-4: Migrar queries FE → API (franqueadora-store)
└── Dia 5: RLS + Senha forte

Semana 2: Correções + Finalização
├── Dia 1: Check-in + Notificações
├── Dia 2: Limpeza de código + TODOs
├── Dia 3: Deploy em homologação
└── Dia 4-5: Validação + Correções finais
```

---

## 🔵 FUNCIONALIDADES PARA V2 (Pós-Lançamento)

### Features Novas
| Feature | Descrição | Tabelas Existem? |
|---------|-----------|------------------|
| **Sistema de Avaliações** | Aluno avalia professor após aula | ✅ `reviews`, `teacher_ratings` |
| **Chat Aluno/Professor** | Mensagens em tempo real | ❌ Criar `messages` |
| **Relatórios PDF/Excel** | Export de dados financeiros | N/A |
| **Push Notifications** | PWA com Service Worker | N/A |
| **Favoritar Professores** | Lista de favoritos do aluno | ❌ Criar tabela |
| **QR Code Dinâmico** | QR por aula para check-in | N/A (código) |

### Melhorias de UX
| Melhoria | Descrição |
|----------|-----------|
| **Wizard Cadastro Franquia** | Dividir em etapas |
| **Dashboard Analytics** | Gráficos avançados |
| **Filtros Avançados** | Busca por especialidade, rating |

### Melhorias Técnicas
| Melhoria | Descrição |
|----------|-----------|
| **Cache Redis** | Otimizar queries frequentes |
| **Documentação API** | Swagger/OpenAPI |
| **Performance N+1** | Otimizar `/api/users` |

---

## 🔗 Arquivos Chave para V1

### Frontend (Migrar para API)
```
apps/web/lib/stores/franquia-store.ts      # ~1200 linhas - queries diretas
apps/web/lib/stores/franqueadora-store.ts  # ~1300 linhas - queries diretas
apps/web/components/test-supabase.tsx      # REMOVER
```

### Backend (Verificar Fluxos)
```
apps/api/src/routes/checkins.ts            # Verificar uso
apps/api/src/routes/notifications.ts       # Ativar createNotification()
apps/api/src/routes/bookings.ts            # Fluxo principal
apps/api/src/jobs/booking-scheduler.ts     # Verificar TODOs
```

### Segurança
```
apps/api/src/routes/auth.ts                # Validação de senha
apps/api/src/middleware/auth.ts            # JWT
```

---

## ✅ Checklist de Lançamento V1

### Pré-Deploy
- [ ] Migrar `franquia-store.ts` para usar API
- [ ] Migrar `franqueadora-store.ts` para usar API
- [ ] Criar políticas RLS restritivas
- [ ] Implementar validação de senha forte
- [ ] Verificar fluxo de check-in
- [ ] Verificar notificações persistindo
- [ ] Remover logs de debug

### Deploy
- [ ] Configurar variáveis de ambiente produção
- [ ] Deploy em homologação
- [ ] Validação manual em homologação
- [ ] Deploy em produção

### Pós-Deploy
- [ ] Monitorar logs de erro
- [ ] Coletar feedback inicial

---

## 🔗 Referências

- **Supabase Project:** `fstbhakmmznfdeluyexc`
- **Documentação:** `/docs/cliente/`, `/docs/DEPLOY_EASYPANEL.md`
- **Runbook Créditos:** `/docs/creditos-globais-runbook.md`

---

> **V1 = Estabilizar o que existe**  
> **V2 = Adicionar features novas**  
> 
> Última atualização: 29/11/2024
