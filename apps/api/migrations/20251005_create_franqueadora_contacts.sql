CREATE EXTENSION IF NOT EXISTS pgcrypto;\r\n\r\nCREATE TABLE IF NOT EXISTS franqueadora_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueadora_id UUID REFERENCES franqueadora(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
  status TEXT NOT NULL DEFAULT 'UNASSIGNED' CHECK (status IN ('UNASSIGNED', 'ASSIGNED', 'INACTIVE')),
  origin TEXT NOT NULL DEFAULT 'SELF_REGISTRATION',
  assigned_academy_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  last_assignment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS franqueadora_contacts_franqueadora_idx
  ON franqueadora_contacts (franqueadora_id, role);

CREATE INDEX IF NOT EXISTS franqueadora_contacts_status_idx
  ON franqueadora_contacts (status);

CREATE INDEX IF NOT EXISTS franqueadora_contacts_user_idx
  ON franqueadora_contacts (user_id);


