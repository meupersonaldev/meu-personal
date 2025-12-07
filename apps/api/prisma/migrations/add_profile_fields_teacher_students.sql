-- Add additional profile fields to teacher_students table
-- These fields match the main system registration form

ALTER TABLE "teacher_students" 
ADD COLUMN IF NOT EXISTS "cpf" TEXT,
ADD COLUMN IF NOT EXISTS "gender" TEXT,
ADD COLUMN IF NOT EXISTS "birth_date" DATE;

-- Add index for CPF lookup
CREATE INDEX IF NOT EXISTS "teacher_students_cpf_idx" ON "teacher_students"("cpf");

-- Comment: gender values should be: 'MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'
