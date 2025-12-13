-- Migration: Create email_logs table for tracking sent emails
-- Supports both SMTP and Resend providers with webhook status updates

BEGIN;

-- Create enum for email status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE email_status AS ENUM (
      'pending',      -- Queued for sending
      'sent',         -- Accepted by mail server (SMTP) or API (Resend)
      'delivered',    -- Confirmed delivered to inbox (Resend only)
      'opened',       -- Recipient opened the email (Resend only)
      'clicked',      -- Recipient clicked a link (Resend only)
      'bounced',      -- Email bounced (invalid address, etc.)
      'complained',   -- Marked as spam
      'failed'        -- Failed to send
    );
  END IF;
END $$;

-- Create enum for email provider
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_provider') THEN
    CREATE TYPE email_provider AS ENUM ('smtp', 'resend');
  END IF;
END $$;

-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient info
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_id UUID,  -- Reference to users table if applicable
  
  -- Email content
  subject VARCHAR(500) NOT NULL,
  template_slug VARCHAR(100),  -- Which template was used
  
  -- Provider info
  provider email_provider NOT NULL DEFAULT 'smtp',
  provider_message_id VARCHAR(255),  -- Message ID from provider (for tracking)
  
  -- Status tracking
  status email_status NOT NULL DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Resend webhook data (stored for debugging)
  webhook_events JSONB DEFAULT '[]',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',  -- Extra data like variables used, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Context
  franchise_id UUID,
  franqueadora_id UUID,
  triggered_by UUID  -- User who triggered the email (if manual)
);

-- Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_recipient_id_fk'
  ) THEN
    ALTER TABLE public.email_logs
      ADD CONSTRAINT email_logs_recipient_id_fk
      FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_triggered_by_fk'
  ) THEN
    ALTER TABLE public.email_logs
      ADD CONSTRAINT email_logs_triggered_by_fk
      FOREIGN KEY (triggered_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_slug ON public.email_logs(template_slug);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_message_id ON public.email_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_franchise_id ON public.email_logs(franchise_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_franqueadora_id ON public.email_logs(franqueadora_id);

-- Add comments
COMMENT ON TABLE public.email_logs IS 'Tracks all emails sent by the system with delivery status';
COMMENT ON COLUMN public.email_logs.provider_message_id IS 'Message ID from email provider for webhook correlation';
COMMENT ON COLUMN public.email_logs.webhook_events IS 'Array of webhook events received for this email';
COMMENT ON COLUMN public.email_logs.metadata IS 'Additional data like template variables, user agent, etc.';

COMMIT;
