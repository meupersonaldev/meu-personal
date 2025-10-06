# Plano de Ação do MVP – Meu Personal

Prioridade definida: concluir “Franquia” e “Dashboard do Professor” 100% primeiro. Em seguida, finalizar “Dashboard do Aluno”.

Decisões e parâmetros atuais
- **Créditos por aula (MVP):** 1 crédito por aula de 60 min (parametrizaremos depois via env `DEFAULT_CREDITS_PER_CLASS`).
- **Domínio de homologação:** ainda não definido. Usaremos placeholders `FRONTEND_URL` e `NEXT_PUBLIC_API_URL` no `.env` para configurar depois.
- **Supabase no backend:** usar cliente único de `apps/api/src/config/supabase.ts` em todas as rotas.
- **Política de cancelamento (MVP):** reembolso de créditos apenas se cancelar com antecedência >= 4h e somente quando `payment_source = student_credits`.

---

## Fase 0 – Infra e Config (Fundação)
Objetivo: preparar ambiente, configs e qualidade mínimas para acelerar as fases seguintes.

- **Env/Config**
  - Adicionar/confirmar placeholders no `.env.example` (não alterar `.env` sem aprovação):
    - `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY` (sandbox), `JWT_SECRET`, `DEFAULT_CREDITS_PER_CLASS`.
  - CORS em `apps/api/src/server.ts`: deixar baseado em `FRONTEND_URL`.
- **Supabase client unificado**
  - Garantir import de `../config/supabase` em todas as rotas (substituir `../lib/supabase` e instâncias locais):
    - `apps/api/src/routes/{checkins,time-slots,bookings,calendar,financial,...}.ts`.
- **Logs & métricas**
  - Padronizar logs de rotas críticas (`bookings`, `time-slots`, `checkins`).
  - Endpoint `/health` já disponível.
- **Seeds mínimas (opcional)**
  - Criar seeds para: 1 franquia, 1 academia, 1 professor, 1 aluno, slots básicos.

Entregáveis
- `.env.example` atualizado e documentado
- Rotas usando supabase unificado
- CORS/Health-check revisados

---

## Fase 1 – Franquias (Backoffice/Recepção)
Objetivo: operação da unidade/franquia com controle de disponibilidade, agendamentos e check-ins.

Backend
- **Academias**
  - Revisar/ajustar `GET /api/academies` e `GET /api/academies/:id/available-slots?date=YYYY-MM-DD[&teacher_id=...]`.
  - Finalizar/validar `apps/api/src/routes/time-slots.ts` (unificar supabase, checar timezone, conflitos, bloqueios).
- **Agendamentos / Disponibilidades**
  - Confirmar regras em `apps/api/src/routes/bookings.ts` para disponibilidades do professor (sem `student_id`).
  - Endpoint de “smart-booking” manterá criação para recepção quando necessário.
- **Check-in (Recepção)**
  - Adicionar `POST /api/checkins/scan` (payload: `booking_id`, `academy_id`) para confirmar entrada via recepção.
  - Manter `POST /api/bookings/checkin/validate` para QR do professor.

Frontend (Franquia)
- `apps/web/app/franquia/dashboard/`
  - Módulo de check-ins (lista do dia, busca por professor, validação manual por recepção).
  - Agenda diária por professor/unidade (slots, ocupação, conflitos visuais).
  - Relatórios básicos (capacidade, no-shows, ocupação por horário).

Entregáveis
- Check-in recepção estável
- Agenda/slots na visão da franquia
- Fluxo de criação e remoção de disponibilidades do professor (via recepção)

---

## Fase 2 – Dashboard do Professor
Objetivo: professor gerencia sua agenda, perfil e créditos.

Backend
- **Rotas necessárias**
  - `GET /api/bookings?teacher_id=...` (listar) – já existe em `bookings.ts`.
  - `POST /api/bookings` (criar disponibilidade sem `student_id`) – já contemplado.
  - `DELETE /api/bookings/:id` (remover disponibilidade sem aluno) – já contemplado.
  - Notificações (`apps/api/src/routes/notifications.ts`) – revisar e ativar eventos principais.

Frontend (Professor)
- `apps/web/app/professor/{dashboard,agenda,perfil,creditos,aulas}/`
  - **Agenda:** criar/editar/remover disponibilidades; mostrar reservas confirmadas.
  - **Perfil:** dados públicos, especialidades, foto/avatar.
  - **Créditos:** saldo, histórico de consumo/ganhos (mínimo: exibir saldo; detalhamento em fase posterior).
  - **Aulas:** lista de próximas e passadas; QR para check-in na recepção.

Entregáveis
- Professor consegue abrir slots, ver reservas e seu saldo
- Notificações básicas funcionando (ex.: nova reserva)

---

## Fase 3 – Dashboard do Aluno (Finalizar por último)
Objetivo: experiência de busca, reserva e cancelamento com política.

Backend
- **Agendamento pelo aluno**
  - `POST /api/bookings/student` (implementado em `student-bookings.ts`): cria CONFIRMED e debita `users.credits`.
  - `POST /api/bookings/:id/cancel` (implementado): reembolsa se >= 4h e `payment_source = student_credits`.

Frontend (Aluno)
- `apps/web/app/aluno/inicio/page.tsx`
  - Modal de agendamento:
    1. Seleciona unidade (`GET /api/academies`).
    2. Escolhe data.
    3. Lista professores da unidade com slots livres no dia (`GET /api/teachers?academy_id=...` + `GET /api/academies/:id/available-slots`).
    4. Lista horários `is_free` e confirma (`POST /api/bookings/student`).
  - Cancelamento via `POST /api/bookings/:id/cancel` com feedback da política.
- **Reset de senha**
  - Páginas `/esqueci-senha` e `/redefinir-senha` usando rotas `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`.

Entregáveis
- Aluno agenda e cancela conforme política
- Fluxo de reset funcional

---

## Fase 4 – QA, Hardening e Deploy
Objetivo: garantir estabilidade e colocar no ar.

- **QA/Smoke Tests**
  - Login → listar professores → criar disponibilidade (professor) → agendar (aluno) → cancelar → check-in recepção.
- **Hardening**
  - Revisar timezone/cálculo de janelas, tratamento de erros padronizado, rate-limits mínimos.
  - Lint/format em CI.
- **Deploy**
  - Backend em VPS (EasyPanel) somente `apps/api` com envs; domínio e HTTPS.
  - Frontend na Vercel; apontar `NEXT_PUBLIC_API_URL` para backend.
  - Rotacionar chaves Supabase/Asaas após deploy.

Entregáveis
- Ambiente de produção/homologação operando
- Documentação de envs e endpoints

---

## Checklist de Aceite (MVP)
- [ ] Franquia: agenda do dia e check-ins funcionando
- [ ] Professor: criação de slots, visualização de reservas e saldo
- [ ] Aluno: agendamento e cancelamento com política (>= 4h)
- [ ] Reset de senha por e-mail
- [ ] Deploy backend e frontend com domínios configuráveis via env

---

## Observações Finais
- O custo em créditos por aula está em 1 no MVP. Tornaremos configurável via `DEFAULT_CREDITS_PER_CLASS` (e/ou por plano) em passo posterior.
- Não alteramos `.env` automaticamente. Ajustes de URLs/domínios serão feitos quando você tiver o domínio de homologação.
