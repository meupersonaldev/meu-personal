-- Fase 1 — Migração do modelo canônico
-- Gera tabelas e colunas para franquias, unidades, pacotes, saldos, transações e intents
-- Além de ajustar bookings para o novo domínio

BEGIN;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função de atualização de timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tipos enumerados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_source_enum') THEN
    CREATE TYPE booking_source_enum AS ENUM ('ALUNO', 'PROFESSOR');
  END IF;
END;$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM ('RESERVED', 'PAID', 'CANCELED', 'DONE');
  END IF;
END;$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_class_tx_type') THEN
    CREATE TYPE student_class_tx_type AS ENUM ('PURCHASE', 'CONSUME', 'LOCK', 'UNLOCK', 'REFUND', 'REVOKE');
  END IF;
END;$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hour_tx_type') THEN
    CREATE TYPE hour_tx_type AS ENUM ('PURCHASE', 'CONSUME', 'BONUS_LOCK', 'BONUS_UNLOCK', 'REFUND', 'REVOKE');
  END IF;
END;$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_source_enum') THEN
    CREATE TYPE tx_source_enum AS ENUM ('ALUNO', 'PROFESSOR', 'SYSTEM');
  END IF;
END;$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_type_enum') THEN
    CREATE TYPE payment_intent_type_enum AS ENUM ('STUDENT_PACKAGE', 'PROF_HOURS');
  END IF;
END;$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_intent_status_enum') THEN
    CREATE TYPE payment_intent_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED');
  END IF;
END;$$;

-- Tabela franchises
CREATE TABLE IF NOT EXISTS public.franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  email text,
  phone text,
  cnpj text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franchises_active ON public.franchises(is_active);

CREATE TRIGGER trg_franchises_updated_at
  BEFORE UPDATE ON public.franchises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela units
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid REFERENCES public.franchises(id) ON DELETE RESTRICT,
  academy_legacy_id uuid,
  name text NOT NULL,
  slug text UNIQUE,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  capacity_per_slot integer NOT NULL DEFAULT 1 CHECK (capacity_per_slot > 0),
  opening_hours_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_units_franchise ON public.units(franchise_id);
CREATE INDEX IF NOT EXISTS idx_units_city_state ON public.units(city, state);
CREATE INDEX IF NOT EXISTS idx_units_active ON public.units(is_active);

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migração inicial de academies -> units
INSERT INTO public.units (id, academy_legacy_id, name, email, phone, address, city, state, zip_code, is_active, created_at, updated_at)
SELECT 
  a.id,
  a.id,
  a.name,
  a.email,
  a.phone,
  a.address,
  a.city,
  a.state,
  a.zip_code,
  COALESCE(a.is_active, true),
  COALESCE(a.created_at, NOW()),
  COALESCE(a.updated_at, NOW())
FROM public.academies a
ON CONFLICT (id) DO NOTHING;

-- Tabela student_packages
CREATE TABLE IF NOT EXISTS public.student_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  title text NOT NULL,
  classes_qty integer NOT NULL CHECK (classes_qty > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  status text NOT NULL DEFAULT 'active',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_packages_unit ON public.student_packages(unit_id);
CREATE INDEX IF NOT EXISTS idx_student_packages_status_unit ON public.student_packages(status, unit_id);

CREATE TRIGGER trg_student_packages_updated_at
  BEFORE UPDATE ON public.student_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela student_class_balance
CREATE TABLE IF NOT EXISTS public.student_class_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  total_purchased integer NOT NULL DEFAULT 0,
  total_consumed integer NOT NULL DEFAULT 0,
  locked_qty integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT student_class_balance_student_unit UNIQUE (student_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_student_class_balance_student ON public.student_class_balance(student_id);

-- Tabela student_class_tx
CREATE TABLE IF NOT EXISTS public.student_class_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  type student_class_tx_type NOT NULL,
  source tx_source_enum NOT NULL DEFAULT 'SYSTEM',
  qty integer NOT NULL CHECK (qty > 0),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  unlock_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_student_class_tx_student_created ON public.student_class_tx(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_class_tx_unlock_at ON public.student_class_tx(unlock_at);

-- Tabela hour_packages
CREATE TABLE IF NOT EXISTS public.hour_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  title text NOT NULL,
  hours_qty integer NOT NULL CHECK (hours_qty > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  status text NOT NULL DEFAULT 'active',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hour_packages_unit ON public.hour_packages(unit_id);
CREATE INDEX IF NOT EXISTS idx_hour_packages_status_unit ON public.hour_packages(status, unit_id);

CREATE TRIGGER trg_hour_packages_updated_at
  BEFORE UPDATE ON public.hour_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela prof_hour_balance
CREATE TABLE IF NOT EXISTS public.prof_hour_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  available_hours integer NOT NULL DEFAULT 0,
  locked_hours integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT prof_hour_balance_professor_unit UNIQUE (professor_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_hour_balance_professor ON public.prof_hour_balance(professor_id);

-- Tabela hour_tx
CREATE TABLE IF NOT EXISTS public.hour_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  type hour_tx_type NOT NULL,
  source tx_source_enum NOT NULL DEFAULT 'SYSTEM',
  hours integer NOT NULL CHECK (hours > 0),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  unlock_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_hour_tx_professor_created ON public.hour_tx(professor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hour_tx_unlock_at ON public.hour_tx(unlock_at);

-- Tabela payment_intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type payment_intent_type_enum NOT NULL,
  provider text NOT NULL DEFAULT 'ASAAS',
  provider_id text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status payment_intent_status_enum NOT NULL DEFAULT 'PENDING',
  checkout_url text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_intents_provider_unique UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status_created ON public.payment_intents(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_intents_actor_created ON public.payment_intents(actor_user_id, created_at DESC);

CREATE TRIGGER trg_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  diff_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs(actor_user_id, created_at DESC);

-- Ajustes em reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS visible_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_reviews_visible_at ON public.reviews(visible_at);

-- Ajustes em bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source booking_source_enum DEFAULT 'ALUNO';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS start_at timestamptz;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellable_until timestamptz;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS status_canonical booking_status_enum DEFAULT 'RESERVED';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS unit_id uuid;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS student_notes text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS professor_notes text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_intent_id uuid;

-- Atualização de dados existentes
UPDATE public.bookings
SET start_at = COALESCE(start_at, date)
WHERE date IS NOT NULL AND start_at IS NULL;

UPDATE public.bookings
SET end_at = COALESCE(end_at, start_at + ((COALESCE(duration, 60))::text || ' minutes')::interval)
WHERE start_at IS NOT NULL AND end_at IS NULL;

UPDATE public.bookings
SET cancellable_until = COALESCE(cancellable_until, start_at - INTERVAL '4 hours')
WHERE start_at IS NOT NULL;

UPDATE public.bookings
SET unit_id = COALESCE(unit_id, academy_id)
WHERE unit_id IS NULL AND academy_id IS NOT NULL;

UPDATE public.bookings
SET status_canonical = CASE
  WHEN status IN ('PENDING', 'AVAILABLE', 'BLOCKED') THEN 'RESERVED'::booking_status_enum
  WHEN status IN ('CONFIRMED') THEN 'PAID'::booking_status_enum
  WHEN status IN ('COMPLETED') THEN 'DONE'::booking_status_enum
  WHEN status IN ('CANCELLED') THEN 'CANCELED'::booking_status_enum
  ELSE 'RESERVED'::booking_status_enum
END
WHERE status_canonical IS NULL;

-- FKs e índices de bookings
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_unit_id_fk
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_intent_fk
  FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_unit_start_at ON public.bookings(unit_id, start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_student_start_at ON public.bookings(student_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_professor_start_at ON public.bookings(teacher_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_cancellable_until ON public.bookings(cancellable_until);

-- Manter compatibilidade temporária: academies -> units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_name = 'academies_legacy'
  ) THEN
    CREATE VIEW public.academies_legacy AS
      SELECT * FROM public.academies;
  END IF;
END;$$;

COMMIT;
