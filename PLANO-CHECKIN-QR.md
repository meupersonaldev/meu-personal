# Plano de Ação — Check-in por QR Code (Professor x Portaria)

## Objetivo
- **Validar automaticamente na portaria** se o professor que escaneou o QR Code da unidade (academia) está devidamente agendado dentro de uma janela de tolerância.
- **Resultado imediato na tela**: "Acesso Liberado" ou "Acesso Negado".

## Escopo
- **Por unidade (academia)**: cada unidade possui um QR Code fixo na entrada.
- **Fluxo web mobile-first** (Next.js): o professor escaneia e cai em uma página pública que exige login e valida o check-in.
- **Sem integração com hardware** (catraca/portão) neste MVP; exibição visual serve para a portaria.

## Não-escopo (MVP)
- Hardware de controle de acesso.
- Geração dinâmica de QR com expiração por sessão (o QR é fixo por unidade).
- Marcação automática de aula como "COMPLETED" no check-in (apenas CONFIRMAR presença, conclusão é outra etapa/fluxo).

---

## Visão Geral da Solução
- A **unidade** expõe um QR Code fixo contendo uma URL do frontend: `https://<FRONTEND>/checkin/a/{academyId}`.
- O **professor** escaneia o QR e acessa a página. Se não estiver logado, é redirecionado para login e retorna ao fluxo.
- A página chama o **endpoint de validação** no backend (`POST /api/bookings/checkin/validate`) enviando: `academy_id`, `teacher_id` (obtido via token /auth/me) e janelas de tolerância (default `30/30` min).
- Backend valida se há booking (com aluno) naquele horário (dentro da janela e naquela unidade) e retorna `allowed: true|false`.
- Backend registra tentativa de check-in em tabela de auditoria opcional (`checkins`).
- Frontend exibe UI verde/vermelha com detalhes e uma "tela para mostrar à portaria".

---

## Fluxos
- **Feliz (allowed)**
  1. Professor escaneia QR e acessa `/checkin/a/{academyId}`.
  2. Não logado → login → volta para a página.
  3. Página consulta `/api/auth/me` (ou usa token) para obter `teacher_id`.
  4. Chama `POST /api/bookings/checkin/validate` com `{ academy_id, teacher_id }`.
  5. API retorna `allowed: true` + dados do booking; UI verde "Acesso liberado".

- **Negado (not allowed)**
  - Sem booking válido na janela de tolerância.
  - Booking em outra unidade.
  - Booking cancelado.
  - Fora da janela de tolerância.
  - UI vermelha "Acesso negado" + motivo.

- **Repetição / idempotência**
  - Repetir check-in no mesmo período continua retornando allowed/denied conforme regra; auditoria registra múltiplas tentativas.

---

## Backend (Express) — `apps/api/`
- **Endpoint novo**: `POST /api/bookings/checkin/validate` (arquivo: `apps/api/src/routes/bookings.ts`).
  - Request body:
    ```json
    {
      "academy_id": "uuid",
      "teacher_id": "uuid",
      "tolerance_before_min": 30, // opcional, default 30
      "tolerance_after_min": 30   // opcional, default 30
    }
    ```
  - Regra:
    - Buscar bookings do professor para a unidade naquele intervalo "amplo".
    - Validar, em memória, se há booking com aluno cuja janela real (início − tolerância antes, fim + tolerância depois) contenha `now`.
    - Ignorar `CANCELLED`. `PENDING`, `CONFIRMED`, `COMPLETED` contam como presença agendada.
    - Caso `PENDING`, opcionalmente atualizar para `CONFIRMED` (apenas confirmação de presença; conclusão ocorrerá em outro fluxo).
  - Resposta:
    ```json
    {
      "allowed": true,
      "booking": { "id": "uuid", "start": "ISO", "duration": 60 },
      "message": "Acesso liberado" // se desejado
    }
    ```
    ou
    ```json
    { "allowed": false, "message": "Professor não possui agendamento válido neste horário nesta unidade." }
    ```
  - **Auditoria**: inserir registro em `checkins` com `status` `GRANTED`/`DENIED` e motivo.
  - Segurança: endpoint requer que o caller envie `teacher_id` coerente com o JWT (o gateway do frontend garantirá isso); também podemos validar token no backend (futuro).

---

## Banco de Dados (opcional para auditoria)
- **Tabela**: `checkins`
  - Colunas: `id (uuid, pk)`, `academy_id (uuid)`, `teacher_id (uuid)`, `booking_id (uuid, nullable)`, `status (text|enum: GRANTED|DENIED)`, `reason (text, nullable)`, `method (text, default 'QRCODE')`, `created_at (timestamp)`.
  - Índices: `(academy_id, created_at)`, `(teacher_id, created_at)`.
  - Observação: o sistema funciona sem esta tabela; recomendamos criar para rastreabilidade e BI.
  - Exemplo SQL (PostgreSQL/Supabase):
    ```sql
    create table if not exists checkins (
      id uuid primary key default gen_random_uuid(),
      academy_id uuid not null,
      teacher_id uuid not null,
      booking_id uuid,
      status text not null check (status in ('GRANTED','DENIED')),
      reason text,
      method text not null default 'QRCODE',
      created_at timestamptz not null default now()
    );
    create index if not exists idx_checkins_academy_created on checkins (academy_id, created_at desc);
    create index if not exists idx_checkins_teacher_created on checkins (teacher_id, created_at desc);
    ```

---

## Frontend (Next.js) — `apps/web/`
### Página pública de Check-in
- **Rota**: `apps/web/app/checkin/a/[academyId]/page.tsx` (Client Component).
- **Comportamento**:
  - Ao montar: verifica login.
    - Se não logado → redireciona para `/login?redirect=/checkin/a/{academyId}`.
  - Obtém `teacher_id` do store/autenticação (`/api/auth/me`).
  - Chama o endpoint `POST /api/bookings/checkin/validate` com `{ academy_id: params.academyId, teacher_id }`.
  - Renderiza estados:
    - `allowed: true` → tela verde "Acesso liberado" com nome do professor e horário.
    - `allowed: false` → tela vermelha com motivo.
  - Ações: **Recarregar**, **Voltar**.
- **UI/UX**: fonte grande, contraste alto, ícones (`lucide-react`), pronto para mostrar à portaria.

### QR Code na Franquia (geração do QR fixo da unidade)
- **Local**: `apps/web/app/franquia/dashboard/page.tsx` → aba `settings`.
- **Card novo**: "QR Code da Unidade" com:
  - Exibição do QR (`react-qr-code`) gerado a partir de `FRONTEND_URL/checkin/a/{academyId}`.
  - Botões: **Copiar Link**, **Baixar PNG**, **Imprimir**.
  - Dica: "Fixe este QR Code na portaria da unidade".

---

## Segurança
- **QR sem segredos**: contém apenas `academyId` (UUID). A validação requer login (JWT).
- **Autorização**: a validação usa `teacher_id` do usuário logado; impede uso malicioso do link por outros perfis.
- **Janela de tolerância**: reduz falsos negativos sem relaxar a regra de agenda.
- **Rate limiting** (futuro): limitar tentativas por IP/unidade.

---

## Observabilidade
- **Auditoria**: `checkins` registra `GRANTED`/`DENIED`, motivo e timestamp.
- **Logs**: adicionar logs no endpoint com nível `info` (allowed/denied) e `warn`/`error` para erros.
- **Métricas** (futuro): contadores de tentativas por unidade/horário.

---

## Testes
- **Backend**
  - Unidade: validação de janela (antes/depois), filtros por status, unidade incorreta, booking sem aluno.
  - Integração: resposta `allowed`/`denied` com combinações de inputs.
- **Frontend**
  - Redirecionamento de login.
  - Renderização dos estados (verde/vermelho).
  - Botões de cópia/baixa/print do QR.
- **E2E**
  - Professor com booking válido no horário → allowed.
  - Sem booking → denied.
  - Booking em outra unidade → denied.
  - Fora da tolerância → denied.
  - Booking PENDING → allowed e atualização para CONFIRMED (opcional).

---

## Dev & Configuração
- Reutilizar `NEXT_PUBLIC_API_URL` já usado no frontend; **não alterar `.env`** sem aprovação.
- Backend já utiliza `SUPABASE_SERVICE_ROLE_KEY` (server-side) — manter.
- Dependências já presentes: `react-qr-code`, `qrcode`.

---

## Cronograma (estimativas)
- **Backend** (endpoint + logs + testes): 4h
- **Frontend** página `/checkin/a/[academyId]`: 4h
- **Franquia** (card de QR na aba Configurações): 2h
- **Auditoria DB** (tabela + índices): 1h
- **E2E & QA**: 2h
- **Total**: ~13h

---

## Entregáveis
- Endpoint `POST /api/bookings/checkin/validate` em `apps/api/src/routes/bookings.ts`.
- Página `apps/web/app/checkin/a/[academyId]/page.tsx` com estados visualmente claros.
- Card de QR Code na aba Configurações da Franquia.
- (Opcional) Tabela `checkins` criada no banco.
- Testes unitários/integrados executados e documentados.

---

## Checklist de Implementação
- [ ] Backend: endpoint de validação
- [ ] Frontend: página pública de check-in
- [ ] Franquia: card com QR da unidade
- [ ] Auditoria: tabela `checkins`
- [ ] Testes unitários/integrados
- [ ] E2E (cenários allowed/denied)
- [ ] Documentação atualizada (README/PLANO)

---

## Critérios de Aceite
- **CA1**: Professor com agendamento válido dentro da tolerância emite "Acesso liberado".
- **CA2**: Professor sem agendamento válido emite "Acesso negado" com motivo.
- **CA3**: QR Code exibido e exportável na aba de Configurações da Franquia.
- **CA4**: Endpoint retorna resposta em <300ms em condições normais.
- **CA5**: Não há alteração de `.env` sem aprovação prévia.

---

## Riscos & Mitigações
- **Relógio do servidor/cliente defasado**: usar comparação no backend; tolerância ajuda a mitigar.
- **Link compartilhado**: autenticação por JWT + `teacher_id` do usuário logado mitiga abuso.
- **Latência do Supabase**: manter janela de busca moderada + índices nos campos de busca.

---

## Próximos Passos (após MVP)
- Integração com catraca/portão (webhook ou hardware SDK).
- QR dinâmico com validade curta (anti-replay avançado).
- Painel de métricas de check-ins por unidade/horário.
