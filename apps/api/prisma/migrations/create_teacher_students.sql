-- CreateTable
CREATE TABLE IF NOT EXISTS "teacher_students" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_students_teacher_id_idx" ON "teacher_students"("teacher_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_students_email_idx" ON "teacher_students"("email");

-- AddForeignKey (opcional - se quiser relacionar com a tabela de teachers)
-- ALTER TABLE "teacher_students" ADD CONSTRAINT "teacher_students_teacher_id_fkey" 
-- FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
