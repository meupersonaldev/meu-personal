-- Add source field to teacher_students table
-- MANUAL = professor cadastrou manualmente
-- PLATFORM = aluno agendou pela plataforma (vínculo automático)

ALTER TABLE "teacher_students" 
ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'MANUAL';

-- Add index for source filtering
CREATE INDEX IF NOT EXISTS "teacher_students_source_idx" ON "teacher_students"("source");

-- Comment: source values should be: 'MANUAL', 'PLATFORM'
