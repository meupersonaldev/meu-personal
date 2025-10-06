# Plano de Ação — Meu Personal (VPS Única no EasyPanel)

Objetivo: colocar no ar hoje uma versão funcional com Franqueadora, Franquia e Professor 100%. O módulo do Aluno será finalizado depois.

## Visão Geral
- Arquitetura: Frontend (Next.js 15) e Backend (Express/TS) na mesma VPS, gerenciados pelo EasyPanel.
- Banco: Supabase (Postgres + Auth + Storage) externo.
- Pagamentos: Asaas (opcional no MVP — crédito interno cobre o fluxo inicial).
- Prioridade atual: Franqueadora → Franquia → Professor. Aluno fica para fase posterior.

## Infraestrutura e Deploy (VPS Única)
- Requisitos
  - Node.js 20+
  - EasyPanel com Reverse Proxy (HTTPS) apontando para as portas internas
- Apps no EasyPanel (2 apps)
  - API (apps/api)
    - Build Command: `cd apps/api && npm ci && npm run build`
    - Start Command: `cd apps/api && npm run start`
    - Porta interna: 3001
  - WEB (apps/web)
    - Build Command: `cd apps/web && npm ci && npm run build`
    - Start Command: `cd apps/web && npm run start`
    - Porta interna: 3000
- Domínios/Proxy
  - Backend: `api.seudominio.com` → porta 3001
  - Frontend: `app.seudominio.com` → porta 3000
  - Definir `FRONTEND_URL=https://app.seudominio.com` e `NEXT_PUBLIC_API_URL=https://api.seudominio.com`

## Variáveis de Ambiente
- Backend (`apps/api/.env`) — exemplo em `apps/api/.env.example`
  - `PORT=3001`
  - `FRONTEND_URL=https://app.seudominio.com`
  - `SUPABASE_URL=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...` (obrigatório no backend)
  - `JWT_SECRET=...`, `JWT_EXPIRES_IN=7d`
  - `DEFAULT_CREDITS_PER_CLASS=1`
  - (opcional) `ASAAS_BASE_URL`, `ASAAS_API_KEY`
- Frontend (`apps/web/.env.local`) — exemplo em `apps/web/.env.local.example`
  - `NEXT_PUBLIC_API_URL=https://api.seudominio.com`
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- Supabase Auth
  - Para MVP: desabilitar confirmação de email OU ativar “autoconfirm” (ver `CONFIGURACAO-SUPABASE.md`).

## Fase 0 — Fundações (hoje)
- [x] Backend usando cliente Supabase unificado (`apps/api/src/config/supabase.ts`)
- [x] Fallback de créditos por aula via `DEFAULT_CREDITS_PER_CLASS`
- [x] Health-check em `/health`
- [ ] Conferir CORS em `apps/api/src/server.ts` usando `FRONTEND_URL`
- [ ] Verificar timezone (usar ISO/UTC no backend, converter no front)

## Fase 1 — Franqueadora (Admin Master)
Backend
- [ ] Revisar/confirmar rotas de franquias (`/api/franchises`) e dados agregados de operação
- [ ] Financeiro/resumo por franquia: `GET /api/financial/summary` e `GET /api/financial/revenue-chart`
- [ ] Notificações principais (`/api/notifications`): criação e contagem de não lidas

Frontend (páginas)
- `apps/web/app/franqueadora/dashboard/page.tsx`
- `apps/web/app/franqueadora/dashboard/dados-franquias/page.tsx`
- `apps/web/app/franqueadora/dashboard/franquia/[id]/page.tsx`
- `apps/web/app/franqueadora/dashboard/add-franchise/page.tsx`
Tarefas
- [ ] Painel com KPIs (receita, alunos ativos por franquia, aulas concluídas)
- [ ] Lista/CRUD básico de franquias (criar, ativar/desativar)
- [ ] Notificações da rede (últimos eventos)
Critérios de Aceite
- [ ] Administrador visualiza franquias, métricas e consegue cadastrar nova franquia

## Fase 2 — Franquia (Operação da Unidade)
Backend
- [ ] Agenda do dia: `GET /api/calendar/events?academy_id=...`
- [ ] Disponibilidade/slots: `GET/POST/PUT/DELETE /api/time-slots`
- [ ] Check-in recepção: `POST /api/checkins/scan` e `GET /api/checkins`/`/stats`

Frontend (páginas)
- `apps/web/app/franquia/dashboard/page.tsx`
- `apps/web/app/franquia/dashboard/agenda/page.tsx`
- `apps/web/app/franquia/dashboard/historico-agendamentos/page.tsx`
- `apps/web/app/franquia/dashboard/historico-checkins/page.tsx`
- `apps/web/app/franquia/dashboard/notifications/page.tsx`
Tarefas
- [ ] Calendário (mensal/semana/dia) com eventos do dia (corrigir timezone no front — já há util `utcToLocal`)
- [ ] Gestão de slots por dia e capacidade (`academy_time_slots`)
- [ ] Tela de check-ins (lista do dia + scan/validação manual)
- [ ] Notificações relevantes (novas reservas, cancelamentos)
Critérios de Aceite
- [ ] Recepção enxerga agenda e consegue registrar check-in com retorno “GRANTED/DENIED”

## Fase 3 — Professor
Backend
- [ ] Abrir/remover disponibilidades (sem `student_id`) via `POST/DELETE /api/bookings`
- [ ] Listar seus agendamentos `GET /api/bookings?teacher_id=...`
- [ ] Perfil e preferências (`/api/teacher-preferences`, `/api/users`)

Frontend (páginas)
- `apps/web/app/professor/agenda/page.tsx`
- `apps/web/app/professor/aulas/page.tsx`
- `apps/web/app/professor/configuracoes/page.tsx`
- `apps/web/app/professor/carteira/page.tsx`
Tarefas
- [ ] Criar/remover slots (disponibilidades) pela agenda
- [ ] Ver próximas/pasadas aulas
- [ ] Editar perfil (bio, avatar, especialidades)
- [ ] Ver saldo de créditos (consumo/ganhos básico)
Critérios de Aceite
- [ ] Professor cria slots, vê reservas e atualiza perfil

## Fase 4 — Aluno (Pós-MVP)
- Agendamento: `POST /api/bookings/student` (confirmado e debitando créditos do aluno)
- Cancelamento com política: `POST /api/bookings/:id/cancel` (>=4h reembolsa créditos se `student_credits`)
- Telas: `apps/web/app/aluno/inicio`, compra de plano, histórico

## QA e Smoke Tests (antes e depois do deploy)
- [ ] Health-check backend (`GET /health`)
- [ ] Login com usuário de teste
- [ ] Professor: criar disponibilidade e ver na agenda
- [ ] Franquia: ver agenda do dia e registrar check-in da disponibilidade agendada
- [ ] Cancelar agendamento pela recepção/professor e verificar persistência
- [ ] Notificações aparecem para franquia e franqueadora

## Passos Operacionais no EasyPanel (Resumo)
1) Criar app “API”
- Build: `cd apps/api && npm ci && npm run build`
- Start: `cd apps/api && npm run start`
- Env: conforme seção “Variáveis de Ambiente (Backend)”
- Porta: 3001
2) Criar app “WEB”
- Build: `cd apps/web && npm ci && npm run build`
- Start: `cd apps/web && npm run start`
- Env: conforme seção “Variáveis de Ambiente (Frontend)”
- Porta: 3000
3) Domínios e HTTPS
- `api.seudominio.com` → API
- `app.seudominio.com` → WEB
- TLS/Certificates no EasyPanel
4) Testes finais (Smoke) e rotação de chaves

## Riscos e Mitigações
- Timezone/UTC: padronizar no backend e converter no front (já há util `timezone-utils.ts`)
- RLS no Supabase: backend usa Service Role; manter chaves seguras e rotacionar após go-live
- Build Next: se quiser footprint menor, configurar `output: 'standalone'` no `next.config.ts` (opcional)

## Próximos Passos Imediatos
- [ ] Definir domínios finais e preencher `.env` em produção
- [ ] Provisionar apps no EasyPanel e rodar build/start
- [ ] Executar smoke tests e validar 3 papéis (Franqueadora, Franquia, Professor)
- [ ] Coletar ajustes finais e publicar

