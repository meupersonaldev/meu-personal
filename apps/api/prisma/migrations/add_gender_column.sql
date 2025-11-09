-- Add gender column to users table
-- Migration: add_gender_column

-- Create enum type for gender
DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add gender column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender gender_enum;

-- Add comment
COMMENT ON COLUMN users.gender IS 'User gender identity';
