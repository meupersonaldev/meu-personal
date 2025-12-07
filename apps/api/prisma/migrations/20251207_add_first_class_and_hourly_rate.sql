-- Add first_class_used to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_class_used" BOOLEAN DEFAULT false;

-- Add hourly_rate to teacher_students table (for per-student pricing)
ALTER TABLE "teacher_students" ADD COLUMN IF NOT EXISTS "hourly_rate" DECIMAL(10, 2);

-- Add hide_free_class to teacher_students (professor can hide free class info)
ALTER TABLE "teacher_students" ADD COLUMN IF NOT EXISTS "hide_free_class" BOOLEAN DEFAULT false;

-- Add index for first_class field
CREATE INDEX IF NOT EXISTS "users_first_class_used_idx" ON "users"("first_class_used");
