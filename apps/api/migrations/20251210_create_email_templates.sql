-- Migration: Create email_templates table for customizable email templates
-- Requirements: 2.4, 5.1 - Persist updated templates to database, default values fallback

BEGIN;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  button_text VARCHAR(100),
  button_url VARCHAR(500),
  variables JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint on slug
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_templates_slug_unique'
  ) THEN
    ALTER TABLE public.email_templates
      ADD CONSTRAINT email_templates_slug_unique UNIQUE (slug);
  END IF;
END $;

-- Add foreign key to users table for updated_by
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_templates_updated_by_fk'
  ) THEN
    ALTER TABLE public.email_templates
      ADD CONSTRAINT email_templates_updated_by_fk
      FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $;

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_at ON public.email_templates(updated_at DESC);

-- Add comment to table
COMMENT ON TABLE public.email_templates IS 'Stores customized email templates that override system defaults';
COMMENT ON COLUMN public.email_templates.slug IS 'Unique identifier for the template type (e.g., welcome-student, password-reset)';
COMMENT ON COLUMN public.email_templates.title IS 'Email subject/title';
COMMENT ON COLUMN public.email_templates.content IS 'Email body content with variable placeholders';
COMMENT ON COLUMN public.email_templates.button_text IS 'Optional call-to-action button text';
COMMENT ON COLUMN public.email_templates.button_url IS 'Optional call-to-action button URL';
COMMENT ON COLUMN public.email_templates.variables IS 'JSON array of available variables for this template';
COMMENT ON COLUMN public.email_templates.updated_by IS 'User who last modified this template';

COMMIT;
