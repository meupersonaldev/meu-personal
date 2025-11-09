-- Add approval status column for professional approval workflow
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "approval_status" TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add index for faster queries on approval status
CREATE INDEX IF NOT EXISTS "idx_users_approval_status" ON "users"("approval_status");

-- Add CPF column if it doesn't exist
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cpf" TEXT;

-- Add CREF column if it doesn't exist
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cref" TEXT;

-- Add approved_at timestamp
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP;

-- Add approved_by to track who approved
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "approved_by" UUID REFERENCES "users"("id");
