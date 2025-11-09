# Migração da Franquia (Frontend) para API Express

Objetivo: remover dependência de chamadas diretas ao Supabase no FE (`franquia-store.ts`) para permitir ativar RLS com segurança.

## Abordagem
- Fase 1 (Leitura): criar endpoints de leitura equivalentes e migrar `fetch*` do store.
- Fase 2 (Escrita): migrar `insert/update/delete` para a API, validando permissões no backend (Service Role).
- Fase 3: remover restos de uso do `supabase` no FE e feature flag do componente `test-supabase` para dev-only.

## Mapeamento inicial
- Professores
  - GET /api/franquia/teachers?academy_id=:id -> academy_teachers + users (join)
  - POST /api/franquia/teachers
  - PUT /api/franquia/teachers/:id
  - DELETE /api/franquia/teachers/:id
- Alunos
  - GET /api/franquia/students?academy_id=:id -> academy_students + users (join)
  - POST /api/franquia/students
  - PUT /api/franquia/students/:id
  - DELETE /api/franquia/students/:id
- Planos
  - GET /api/franquia/plans?academy_id=:id
  - POST /api/franquia/plans
  - PUT /api/franquia/plans/:id
  - DELETE /api/franquia/plans/:id (soft delete: is_active=false)
- Aulas (bookings)
  - GET /api/franquia/classes?academy_id=:id
  - PUT /api/franquia/classes/:id
  - DELETE /api/franquia/classes/:id
- Time Slots
  - GET /api/franquia/time-slots?academy_id=:id
  - PATCH /api/franquia/time-slots/:id/toggle
- Notificações
  - GET /api/franquia/notifications
  - POST /api/franquia/notifications/:id/read
  - POST /api/franquia/notifications/read-all
- Preferências do Professor
  - GET /api/teachers/:id/preferences
  - PUT /api/teachers/:id/preferences

## Considerações de Segurança
- Middleware `requireAuth` + `requireRole(['FRANCHISE_ADMIN', 'ADMIN', 'SUPER_ADMIN'])` quando aplicável.
- Operações de escrita passam pelo Service Role no backend; aplicar validação por academy_id.
- Logs e auditoria para mutações.

## Checklist
- [ ] Implementar endpoints de leitura (teachers, students, plans, classes, time-slots, notifications)
- [ ] Alterar `franquia-store.ts` para usar os endpoints de leitura
- [ ] Implementar endpoints de escrita (CRUD)
- [ ] Migrar mutações do store
- [ ] Gate do `components/test-supabase.tsx` para dev-only ou remover em prod
