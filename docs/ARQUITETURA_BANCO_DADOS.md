# Arquitetura do Banco de Dados – Meu Personal

Este documento descreve o estado atual do banco de dados do projeto **Meu Personal** no Supabase.

## Visão geral

- **Plataforma**: Supabase (PostgreSQL gerenciado)
- **Versão do Postgres**: 17.x (engine 17 – conforme projeto Supabase)
- **Projeto**: `meupersonaldev's Project`
- **Região**: `sa-east-1`
- **Schemas principais**:
  - **public** – dados de domínio da aplicação (usuários, academias, agendamentos, pagamentos etc.)
  - **auth** – tabelas internas de autenticação do Supabase
  - **storage** – metadados de arquivos (buckets, objetos S3-compatíveis)
  - **supabase_migrations** – histórico de migrações aplicadas
  - **vault** – segredos criptografados (Supabase Vault)

> Observação: o documento foca principalmente no **schema `public`**, que é o que você manipula no backend Express.

---

## Tabelas do schema `public`

A lista abaixo foi obtida diretamente de `information_schema.tables` no Supabase.

### Lista de tabelas

- **academies**
- **academy_plans**
- **academy_policy_overrides**
- **academy_students**
- **academy_teachers**
- **academy_time_slots**
- **approval_requests**
- **audit_logs**
- **booking_series**
- **booking_series_notifications**
- **bookings**
- **checkins**
- **franchise_admins**
- **franchise_leads**
- **franchise_notifications**
- **franchise_packages**
- **franchises**
- **franchisor_policies**
- **franqueadora**
- **franqueadora_admins**
- **franqueadora_contacts**
- **hour_packages**
- **hour_tx**
- **invoices**
- **notifications**
- **payment_intents**
- **payments**
- **prof_hour_balance**
- **professor_units**
- **reviews**
- **student_class_balance**
- **student_class_tx**
- **student_packages**
- **student_subscriptions**
- **student_units**
- **teacher_plans**
- **teacher_preferences**
- **teacher_profiles**
- **teacher_ratings**
- **teacher_students**
- **teacher_subscriptions**
- **transactions**
- **units**
- **users**

A seguir, um resumo das tabelas mais importantes para o fluxo da aplicação.

---

## Núcleo de Usuários e Perfis

### `public.users`

Tabela principal de usuários (alunos, professores, admins de franquia e franqueadora).

**Campos principais (extraídos do schema):**
- `id uuid` – PK, gerado via `extensions.uuid_generate_v4()`
- `email varchar` – e‑mail do usuário (único)
- `name varchar` – nome
- `phone varchar` – telefone (opcional)
- `role user_role` – enum com papéis `[STUDENT, TEACHER, FRANCHISE_ADMIN, SUPER_ADMIN]`
- `credits int` – créditos legados (mantido para compatibilidade; sistema atual usa saldo global em outras tabelas)
- `avatar_url text` – URL do avatar
- `is_active bool` – se o usuário está ativo
- `created_at timestamptz` / `updated_at timestamptz` – timestamps padrão `now()`
- `asaas_customer_id varchar` – id do cliente no Asaas
- `password text` / `password_hash text` – campos legados de senha (usados no backend Express)
- `franchisor_id uuid` – FK para `franqueadora.id`
- `cpf text` – CPF do usuário
- `last_login_at timestamptz`
- `active bool` – flag adicional de ativo
- `email_verified bool` / `phone_verified bool`
- `franchise_id uuid` – vínculo com unidade (para professores/admins de franquia, quando aplicável)
- `cref_card_url text`, `cref text` – informações de CREF para professores
- `approval_status text` – `pending | approved | rejected`
- `approved_at timestamp`, `approved_by uuid`
- `gender gender_enum` – enum `[MALE, FEMALE, NON_BINARY, OTHER, PREFER_NOT_TO_SAY]`

**Chave primária**
- `PRIMARY KEY (id)`

**Principais FKs para `users.id` (resumo baseado no schema):**
- `teacher_profiles.user_id`
- `bookings.teacher_id`, `bookings.student_id`
- `academy_teachers.teacher_id`
- `academy_students.student_id`
- `franchise_admins.user_id`, `franqueadora_admins.user_id`
- `franqueadora_contacts.user_id`
- `student_units.student_id`, `professor_units.professor_id`
- `student_class_balance.student_id`, `student_class_tx.student_id`
- `teacher_ratings.teacher_id`, `teacher_ratings.student_id`
- `hour_tx.professor_id`, `prof_hour_balance.professor_id`
- `payments.user_id`, `transactions.user_id`
- `booking_series.teacher_id`, `booking_series.student_id`
- e várias outras relacionadas a auditoria/assinaturas/relacionamentos.

### `public.teacher_profiles`

Perfil estendido de professor.

**Campos (principais):**
- `id uuid` – PK
- `user_id uuid` – FK para `users.id`
- `bio text` – biografia
- `specialization text[]` – lista de especializações
- `hourly_rate numeric` – valor/hora
- `rating numeric`, `rating_avg numeric`, `rating_count int` – métricas de avaliação
- `total_reviews int`, `total_sessions int`
- `availability jsonb` – estrutura de disponibilidade (hoje complementada pelos bookings e time slots)
- `is_available bool`
- `available_online bool`, `available_in_person bool`
- `graduation text`, `cref text`
- `created_at`, `updated_at`

**FKs**
- `teacher_profiles_user_id_fkey` → `users(id)`

### Tabelas auxiliares de relacionamento

- **`academy_teachers`** – ligação entre professores (`users`) e academias/unidades.
- **`academy_students`** – ligação entre alunos (`users`) e academias.
- **`teacher_students`** – relacionamento professor ↔ aluno (vínculo direto).
- **`professor_units` / `student_units`** – vinculação a unidades específicas, incluindo flags de unidade ativa por aluno.

---

## Academias, Unidades e Slots de Horário

### `public.academies` / `public.units`

- **`academies`** – academias/unidades onde as aulas acontecem (pode representar a unidade física principal).
- **`units`** – estrutura de unidades/franquias; relacionada a `franchises` e à franqueadora.

Campos típicos (a partir dos nomes e uso na aplicação):
- Identificadores (`id uuid`)
- `name`, `cnpj`, `email`, `phone`, endereço (endereço completo em colunas de texto)
- Configurações de política (duração de aula, créditos por aula) via relação com `franchisor_policies` e `academy_policy_overrides`.

### `public.academy_time_slots`

Tabela com a **configuração de horários fixos da unidade** (não a disponibilidade do professor):

- `id uuid`
- `academy_id uuid` – FK para `academies.id`
- `day_of_week int` – 0=Domingo ... 6=Sábado
- `time time` ou `character varying` conforme schema
- `is_available bool` – se a unidade está aberta naquele horário
- `max_capacity int` – capacidade máxima de alunos por slot

Essa tabela é usada pelo frontend da **disponibilidade do professor** para montar a grade de horários possíveis por dia da semana.

### `public.academy_policy_overrides` e `public.franchisor_policies`

- **`franchisor_policies`** – tabela de políticas globais definidas pela franqueadora (créditos por aula, duração de aula, janelas de check-in etc.).
- **`academy_policy_overrides`** – permite sobrescrever valores globais para uma academia específica via coluna `overrides jsonb`.

---

## Agendamentos, Séries e Check-ins

### `public.bookings`

Tabela central de **agendamentos / slots de disponibilidade**.

Campos relevantes (a partir do schema e migrações):
- `id uuid` – PK
- `student_id uuid` (FK → `users.id`) – aluno (pode ser null para disponibilidade vazia)
- `teacher_id uuid` (FK → `users.id`) – professor
- `franchise_id uuid` – unidade/franquia onde a aula ocorre
- `academy_id uuid` – (quando aplicável) academia/unidade específica
- `date date` – data da aula (ou do slot)
- `start_at timestamptz`, `end_at timestamptz` – início e fim da aula/slot
- `duration int` – duração em minutos (derivada da política de operação)
- `status` / `status_canonical` – inclui `AVAILABLE`, `BLOCKED` e outros estados de agendamento
- `notes text` – observações
- `credits_cost int` – custo em créditos
- `series_id uuid` – vínculo com `booking_series` (recorrência)
- `cancellable_until timestamptz` – limite de cancelamento
- timestamps de criação/atualização

### `public.booking_series` e `public.booking_series_notifications`

Modelam **séries de bookings recorrentes** (aulas semanais fixas):

- `booking_series`
  - `id uuid`
  - `student_id`, `teacher_id`, `academy_id`
  - `day_of_week int` – dia recorrente
  - `start_time`, `end_time` (time)
  - `recurrence_type varchar` – `15_DAYS | MONTH | QUARTER | SEMESTER | YEAR`
  - `start_date`, `end_date`
  - `status` – `ACTIVE | CANCELLED | COMPLETED`

- `booking_series_notifications`
  - Notificações associadas a séries (crédito, cancelamento, lembretes etc.).

### `public.checkins`

Registra **check-ins** em aulas/unidades, amarrando o comparecimento do aluno ao booking/unidade.

### `public.teacher_ratings` e `public.reviews`

- **`teacher_ratings`**: avaliações estruturadas (1–5 estrelas) com comentário, vinculadas a `teacher_id`, `student_id` e `booking_id`.
- **`reviews`**: tabela complementar de avaliações/comentários.

Essas tabelas alimentam os campos de métricas em `teacher_profiles` (rating médio, contagem etc.).

---

## Pacotes, Créditos e Assinaturas

### `public.hour_packages`, `public.hour_tx`, `public.prof_hour_balance`

Voltadas para **pacotes e saldo de horas de professores**:
- `hour_packages` – tipos de pacote de horas (oferta comercial).
- `hour_tx` – transações de horas para professor (crédito/débito).
- `prof_hour_balance` – saldos agregados por professor.

### `public.student_packages`, `public.student_class_balance`, `public.student_class_tx`

Modelam o sistema de **créditos por aula** para alunos:
- `student_packages` – pacotes adquiridos por aluno.
- `student_class_tx` – transações de crédito (entrada/saída).
- `student_class_balance` – saldo atual de créditos (visão consolidada por aluno).

### `public.student_subscriptions` e `public.teacher_subscriptions`

Controlam **assinaturas recorrentes** para alunos/professores.

---

## Pagamentos e Faturamento

### `public.payment_intents` e `public.payments`

- `payment_intents` – integrações com Asaas e lógica de checkout (estado do intent, valor, meios de pagamento, status, provider response etc.).
- `payments` – registros de pagamento efetivado por usuário, vinculando intents, pacotes e créditos.

### `public.transactions`

Tabela genérica de transações financeiras/contábeis relacionadas a usuários, pacotes, créditos etc.

### `public.invoices`

Modela **notas fiscais eletrônicas / documentos fiscais**:

- Campos principais (a partir do schema):
  - `id uuid` – PK
  - `payment_intent_id uuid` – FK para `payment_intents.id` (único)
  - `type invoice_type_enum` – `NFE | NFC_E`
  - `status invoice_status_enum` – `PENDING | ISSUED | CANCELED | ERROR`
  - `customer_*` – nome, e‑mail, CPF/CNPJ, telefone, endereço (jsonb)
  - Dados da nota (`nfe_number`, `nfe_key`, `nfe_url`, `nfe_xml`)
  - `service_description`, `service_code`
  - `amount_cents int`
  - `provider text` – ex: `NFE_IO`
  - `provider_invoice_id`, `provider_response jsonb`
  - `error_message`, `error_details jsonb`
  - `issued_at`, `canceled_at`, `created_at`, `updated_at`

---

## Franqueadora, Franquias e Contatos

### `public.franqueadora` e `public.franchises`

- **`franqueadora`** – dados da franqueadora central (CNPJ, nome, contato, configurações globais).
- **`franchises`** – instâncias de franquias/unidades sob a franqueadora.

### `public.franchise_admins`, `public.franqueadora_admins`

Vínculos entre usuários (`users`) e papéis administrativos:
- Admins de franquia (por unidade).
- Admins da franqueadora.

### `public.franchisor_policies`

Tabela de **políticas globais da franqueadora**, incluindo:
- Créditos por aula
- Duração de aula
- Janelas de check-in e cancelamento
- Demais regras operacionais que precisam ser propagadas para todas as unidades.

### `public.franqueadora_contacts` e `public.franchise_leads`

- **`franqueadora_contacts`** – contatos centralizados (usuários associados à franqueadora).
- **`franchise_leads`** – leads ligados a franquias (pessoas interessadas, funil comercial).

### `public.franchise_notifications`

Sistema de **notificações** destinadas a admins de franquia (novos leads, eventos importantes, etc.).

---

## Notificações, Auditoria e Logs

### `public.notifications`

Tabela genérica de notificações internas (app, e‑mail, push) relacionadas a eventos do sistema.

### `public.audit_logs`

Log de auditoria da aplicação própria:
- Registra ações importantes com `actor_user_id`, tipo de evento, dados antigos/novos etc.

Além disso, há logs internos no schema `auth` e pelo extension `pgaudit`.

---

## Check-ins e Unidades

### `public.checkins`

- Registra presença do aluno/professor em uma aula/unidade.
- Vinculado a bookings e unidades (`units`/`academies`).

### `public.professor_units` e `public.student_units`

- Relacionam professores e alunos às unidades disponíveis para uso.
- Incluem flags como `is_active_unit` para determinar a unidade de atuação principal.

---

## RLS (Row Level Security) e Políticas

Foi feita uma consulta em `pg_policies` para mapear todas as políticas atuais.

### Situação atual (resumo)

- A maioria das tabelas em `public` está com **RLS habilitado**, porém com políticas padrão do tipo:
  - `p_select_all`, `p_insert_all`, `p_update_all`, `p_delete_all`
  - Todas com **role `{public}`** e `qual = true`
- Isso significa que, do ponto de vista do banco, RLS está em modo **transicional**, com acesso aberto para a role `public` e controle de permissão feito principalmente no backend Express.
- Exceções relevantes:
  - Tabela `storage.objects` (bucket `avatars`) possui políticas específicas:
    - `Allow authenticated users to upload/update/delete their avatars`
    - `Allow public read access to avatars`

> Quando RLS for endurecido de verdade, será necessário alinhar o JWT emitido pelo backend com as policies e/ou migrar as consultas diretas do frontend para a API.

---

## Extensões instaladas

O projeto possui muitas extensões padrão do Supabase  (lista completa consultada via `SELECT * FROM pg_extension`). Algumas das mais relevantes:

- **Segurança / Criptografia**
  - `pgcrypto` – funções criptográficas
  - `pgjwt` – manipulação de JWT no banco
  - `pgsodium` – criptografia avançada
  - `supabase_vault` (schema `vault`) – armazenamento de segredos

- **Dev / Observabilidade**
  - `pg_stat_statements`, `pg_stat_monitor` – métricas de queries
  - `pg_cron` – agendamento de jobs
  - `pgtap` – testes unitários em SQL
  - `pg_audit`, `pg_repack`, `hypopg`, `pg_buffercache`, `pg_visibility` etc.

- **Full-text search e vetores**
  - `pg_trgm`, `fuzzystrmatch` – buscas aproximadas
  - `pgroonga`, `pgroonga_database` – full text search avançado
  - `vector` – tipo de dado vetorial + índices ivfflat/hnsw

- **Geo / PostGIS**
  - `postgis`, `postgis_topology`, `postgis_raster`
  - `pgrouting` – rotas em grafos sobre dados geográficos

- **Outras**
  - `uuid-ossp` – geração de UUIDs
  - `pg_graphql` (schema `graphql`) – camada GraphQL pronta
  - `wrappers` – foreign data wrappers padrão Supabase

---

## Migrações

O histórico de migrações em `supabase_migrations.schema_migrations` mostra a evolução do schema. Alguns marcos importantes (resumo):

- `20250928082642_create_initial_schema`
- `20250928082648_create_users_table`
- `20250928082655_create_teacher_profiles_table`
- `20250928082705_create_bookings_table`
- `20250928084052_create_franchise_tables`
- `20250928090139_create_franqueadora_tables`
- `20250930120554_bookings_and_slots`
- `20251001032633_add_available_status_to_booking_enum`
- `20251001071555_add_blocked_status_to_booking_enum`
- `20251003033935_add_class_duration_minutes_to_academies`
- `20251010115524_20251009_global_credits` (migração de créditos globais)
- `20251103205127_create_teacher_ratings`
- `20251104002342_add_rating_cache_to_teacher_profiles`
- `20251129141423_booking_series_recurrence` e migrações relacionadas (`bookings_series_fields`, `booking_series_notifications`, `booking_series_trigger`)
- `20251130182845_add_default_availability_seed_flag`

Esse histórico é útil para entender em que ponto cada parte da modelagem entrou no sistema (agendamentos, créditos globais, políticas de franqueadora, avaliações de professores etc.).

---

## Como usar este documento

- **Backend**: use esta visão para garantir que suas queries/joins em Express batem com a modelagem real.
- **Frontend**: a tela de disponibilidade do professor hoje trabalha em cima de `bookings` (slots disponíveis por data) e `academy_time_slots` (slots base da unidade).
- **Futuras migrações**: ao alterar tabelas (ex: políticas, créditos, agendamentos), adicione novas migrações e atualize este `.md` para manter o alinhamento entre código e banco.

Se precisar, posso gerar uma versão mais detalhada focada em um subconjunto (ex: apenas agendamentos/pagamentos) com diagramas de relacionamento (ERD) em texto ou formato para alguma ferramenta de desenho.
