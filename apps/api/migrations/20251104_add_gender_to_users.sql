-- Add gender column to users table with allowed values and sensible default
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT 'UNSPECIFIED';

-- Optional safety: constrain allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_gender_chk'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT users_gender_chk
      CHECK (gender IN (
        'MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY', 'UNSPECIFIED'
      ));
  END IF;
END $$;

