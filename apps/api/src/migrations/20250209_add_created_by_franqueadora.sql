-- Add created_by_franqueadora field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_franqueadora BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_created_by_franqueadora ON users(created_by_franqueadora);
