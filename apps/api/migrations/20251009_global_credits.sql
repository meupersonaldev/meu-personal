-- Globalização da lógica de créditos: adiciona franqueadora_id como chave de escopo
BEGIN;

-- Helper: pega franqueadora default para fallback
WITH default_franqueadora AS (
  SELECT id
  FROM public.franqueadora
  ORDER BY created_at
  LIMIT 1
)
SELECT 1;

-- student_packages ---------------------------------------------------------
ALTER TABLE public.student_packages
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.student_packages sp
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE sp.unit_id = u.id
  AND sp.franqueadora_id IS NULL;

UPDATE public.student_packages
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.student_packages
  ALTER COLUMN franqueadora_id SET NOT NULL;

ALTER TABLE public.student_packages
  ALTER COLUMN unit_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_packages_franqueadora_fk'
  ) THEN
    ALTER TABLE public.student_packages
      ADD CONSTRAINT student_packages_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_packages_franqueadora_status
  ON public.student_packages (franqueadora_id, status);

-- hour_packages ------------------------------------------------------------
ALTER TABLE public.hour_packages
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.hour_packages hp
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE hp.unit_id = u.id
  AND hp.franqueadora_id IS NULL;

UPDATE public.hour_packages
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.hour_packages
  ALTER COLUMN franqueadora_id SET NOT NULL;

ALTER TABLE public.hour_packages
  ALTER COLUMN unit_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hour_packages_franqueadora_fk'
  ) THEN
    ALTER TABLE public.hour_packages
      ADD CONSTRAINT hour_packages_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hour_packages_franqueadora_status
  ON public.hour_packages (franqueadora_id, status);

-- payment_intents ----------------------------------------------------------
ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.payment_intents pi
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE pi.unit_id = u.id
  AND pi.franqueadora_id IS NULL;

UPDATE public.payment_intents
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.payment_intents
  ALTER COLUMN franqueadora_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_intents_franqueadora_fk'
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_intents_franqueadora_status
  ON public.payment_intents (franqueadora_id, status, created_at DESC);

-- student_class_balance ----------------------------------------------------
ALTER TABLE public.student_class_balance
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.student_class_balance scb
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE scb.unit_id = u.id
  AND scb.franqueadora_id IS NULL;

UPDATE public.student_class_balance
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.student_class_balance
  ALTER COLUMN franqueadora_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_class_balance_student_unit'
  ) THEN
    ALTER TABLE public.student_class_balance
      DROP CONSTRAINT student_class_balance_student_unit;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_class_balance_student_franqueadora'
  ) THEN
    ALTER TABLE public.student_class_balance
      ADD CONSTRAINT student_class_balance_student_franqueadora
      UNIQUE (student_id, franqueadora_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_class_balance_franqueadora_fk'
  ) THEN
    ALTER TABLE public.student_class_balance
      ADD CONSTRAINT student_class_balance_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_class_balance_franqueadora
  ON public.student_class_balance (franqueadora_id, student_id);

-- student_class_tx ---------------------------------------------------------
ALTER TABLE public.student_class_tx
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.student_class_tx sct
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE sct.unit_id = u.id
  AND sct.franqueadora_id IS NULL;

UPDATE public.student_class_tx
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.student_class_tx
  ALTER COLUMN franqueadora_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_class_tx_franqueadora_fk'
  ) THEN
    ALTER TABLE public.student_class_tx
      ADD CONSTRAINT student_class_tx_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_class_tx_franqueadora_created
  ON public.student_class_tx (franqueadora_id, student_id, created_at DESC);

-- prof_hour_balance --------------------------------------------------------
ALTER TABLE public.prof_hour_balance
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.prof_hour_balance phb
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE phb.unit_id = u.id
  AND phb.franqueadora_id IS NULL;

UPDATE public.prof_hour_balance
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.prof_hour_balance
  ALTER COLUMN franqueadora_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prof_hour_balance_professor_unit'
  ) THEN
    ALTER TABLE public.prof_hour_balance
      DROP CONSTRAINT prof_hour_balance_professor_unit;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prof_hour_balance_professor_franqueadora'
  ) THEN
    ALTER TABLE public.prof_hour_balance
      ADD CONSTRAINT prof_hour_balance_professor_franqueadora
      UNIQUE (professor_id, franqueadora_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prof_hour_balance_franqueadora_fk'
  ) THEN
    ALTER TABLE public.prof_hour_balance
      ADD CONSTRAINT prof_hour_balance_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prof_hour_balance_franqueadora
  ON public.prof_hour_balance (franqueadora_id, professor_id);

-- hour_tx ------------------------------------------------------------------
ALTER TABLE public.hour_tx
  ADD COLUMN IF NOT EXISTS franqueadora_id uuid;

UPDATE public.hour_tx htx
SET franqueadora_id = COALESCE(
  a.franqueadora_id,
  df.id
)
FROM public.units u
LEFT JOIN public.academies a ON a.id = u.academy_legacy_id
LEFT JOIN (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df ON TRUE
WHERE htx.unit_id = u.id
  AND htx.franqueadora_id IS NULL;

UPDATE public.hour_tx
SET franqueadora_id = df.id
FROM (SELECT id FROM public.franqueadora ORDER BY created_at LIMIT 1) df
WHERE franqueadora_id IS NULL;

ALTER TABLE public.hour_tx
  ALTER COLUMN franqueadora_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hour_tx_franqueadora_fk'
  ) THEN
    ALTER TABLE public.hour_tx
      ADD CONSTRAINT hour_tx_franqueadora_fk
      FOREIGN KEY (franqueadora_id) REFERENCES public.franqueadora(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hour_tx_franqueadora_created
  ON public.hour_tx (franqueadora_id, professor_id, created_at DESC);

COMMIT;
