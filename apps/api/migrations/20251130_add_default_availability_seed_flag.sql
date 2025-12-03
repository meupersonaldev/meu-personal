ALTER TABLE public.academy_teachers
ADD COLUMN IF NOT EXISTS default_availability_seeded_at TIMESTAMPTZ;
