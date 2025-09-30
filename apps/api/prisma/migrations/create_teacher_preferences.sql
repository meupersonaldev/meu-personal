-- CreateTable teacher_preferences
CREATE TABLE IF NOT EXISTS "teacher_preferences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "teacher_id" TEXT NOT NULL,
    "academy_ids" TEXT[] DEFAULT '{}',
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "teacher_preferences_teacher_id_key" ON "teacher_preferences"("teacher_id");

-- AddColumn avatar_url to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- Create bucket for avatars in Supabase Storage
-- Execute no Supabase Dashboard:
-- 1. Vá em Storage
-- 2. Crie um bucket chamado "avatars"
-- 3. Marque como público
