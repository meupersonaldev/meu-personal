# 🌐 Professor Area – Pending Tasks Before Release

This checklist consolidates the remaining work required to safely ship the latest professor-area changes to production.

## Backend
- ✅ Deploy the new migration `apps/api/migrations/20251011_teacher_hours_support.sql` (creates the `add_teacher_hours` RPC).
- ⚠️ Populate `teacher_plans.hours_included` (or `metadata_json.hours_included`) for every active plan; the purchase flow now rejects plans without this value.
- ?? Execute the enum script described in `docs/db/booking-status-enum.md` to add `AVAILABLE` to `booking_status_enum`.
- 🔍 Audit other services (CRONs, mobile apps, etc.) that call the professor APIs—most endpoints now require `Authorization` and role checks.
- 🧪 Regression-test the following flows with authenticated requests:
  - Agenda block creation/removal (`/api/teachers/:id/blocks/*`)
  - Student CRUD (`/api/teachers/:id/students`)
  - Preferences update (`/api/teachers/:id/preferences`)
  - Check-in listings/stats (`/api/checkins` & `/api/checkins/stats`)
  - Teacher stats and availability (`/api/teachers/:id/stats|availability|academies|hours`)

## Frontend
- 🔐 Update the remaining professor pages to send the bearer token with every API call:
  - `apps/web/app/professor/agenda/reservar-espaco/page.tsx`
  - `apps/web/app/professor/checkin/page.tsx`
  - `apps/web/app/professor/checkins/page.tsx`
- 🧭 After the updates above, verify each page against the locked-down APIs (expect 403s until headers are added).
- 📱 Cross-check any other clients (mobile, partner portals) that might still call the open endpoints.

## Deployment / QA
- 🔁 Run the full test suite (or manual smoke tests) covering professor onboarding, schedule management, wallet, and header notifications.
- 📦 Prepare a release plan that includes database migration order, environment variable updates, and any data backfills for plan metadata.
