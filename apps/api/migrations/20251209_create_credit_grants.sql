-- Migration: Create credit_grants table for manual credit release audit
-- Requirements: 1.5 - Auditoria completa de liberações manuais de créditos

BEGIN;

-- Create credit_grants table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('STUDENT_CLASS', 'PROFESSOR_HOUR')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  granted_by_id UUID NOT NULL,
  granted_by_email TEXT NOT NULL,
  franqueadora_id UUID NOT NULL,
  franchise_id UUID,
  transaction_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_grants_recipient_fk'
  ) THEN
    ALTER TABLE public.credit_grants
      ADD CONSTRAINT credit_grants_recipient_fk
      FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_grants_granted_by_fk'
  ) THEN
    ALTER TABLE public.credit_grants
      ADD CONSTRAINT credit_grants_granted_by_fk
      FOREIGN KEY (granted_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_grants_franqueadora_fk'
  ) THEN
    ALTER TABLE public.credit_grants
      ADD CONSTRAINT credit_grants_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_grants_franchise_fk'
  ) THEN
    ALTER TABLE public.credit_grants
      ADD CONSTRAINT credit_grants_franchise_fk
      FOREIGN KEY (franchise_id) REFERENCES public.academies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_credit_grants_recipient ON public.credit_grants(recipient_id);
CREATE INDEX IF NOT EXISTS idx_credit_grants_granted_by ON public.credit_grants(granted_by_id);
CREATE INDEX IF NOT EXISTS idx_credit_grants_franqueadora ON public.credit_grants(franqueadora_id);
CREATE INDEX IF NOT EXISTS idx_credit_grants_franchise ON public.credit_grants(franchise_id);
CREATE INDEX IF NOT EXISTS idx_credit_grants_created_at ON public.credit_grants(created_at DESC);

-- Composite index for history queries with filters
CREATE INDEX IF NOT EXISTS idx_credit_grants_history ON public.credit_grants(franqueadora_id, created_at DESC);

COMMIT;
