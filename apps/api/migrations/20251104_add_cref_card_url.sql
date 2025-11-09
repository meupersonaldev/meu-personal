-- Add CREF card URL column for storing document image/PDF
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cref_card_url" TEXT;

