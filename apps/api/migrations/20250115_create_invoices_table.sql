-- Migration: Tabela de Notas Fiscais
-- Cria estrutura para armazenar notas fiscais emitidas para vendas

BEGIN;

-- Enum para status da nota fiscal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
    CREATE TYPE invoice_status_enum AS ENUM ('PENDING', 'ISSUED', 'CANCELED', 'ERROR');
  END IF;
END;$$;

-- Enum para tipo de nota fiscal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type_enum') THEN
    CREATE TYPE invoice_type_enum AS ENUM ('NFE', 'NFC_E');
  END IF;
END;$$;

-- Tabela invoices (notas fiscais)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid NOT NULL REFERENCES public.payment_intents(id) ON DELETE RESTRICT,
  type invoice_type_enum NOT NULL DEFAULT 'NFE',
  status invoice_status_enum NOT NULL DEFAULT 'PENDING',
  
  -- Dados do cliente (destinatário)
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_cpf_cnpj text NOT NULL,
  customer_phone text,
  customer_address jsonb,
  
  -- Dados da nota fiscal
  nfe_number text, -- Número da NFe emitida
  nfe_key text, -- Chave de acesso da NFe
  nfe_url text, -- URL para download da NFe
  nfe_xml text, -- XML da NFe (opcional, pode ser grande)
  
  -- Dados do serviço/produto
  service_description text NOT NULL,
  service_code text, -- Código de serviço (NBS)
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  
  -- Metadados
  provider text DEFAULT 'NFE_IO', -- Provedor usado para emissão (NFE_IO, BLING, etc)
  provider_invoice_id text, -- ID da nota no provedor externo
  provider_response jsonb DEFAULT '{}'::jsonb, -- Resposta completa do provedor
  
  -- Informações de erro (se houver)
  error_message text,
  error_details jsonb DEFAULT '{}'::jsonb,
  
  -- Auditoria
  issued_at timestamptz, -- Data/hora de emissão
  canceled_at timestamptz, -- Data/hora de cancelamento
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT invoices_payment_intent_unique UNIQUE (payment_intent_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_intent ON public.invoices(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_nfe_key ON public.invoices(nfe_key) WHERE nfe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON public.invoices(issued_at DESC) WHERE issued_at IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar coluna franqueadora_id na tabela payment_intents se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_intents' 
    AND column_name = 'franqueadora_id'
  ) THEN
    ALTER TABLE public.payment_intents
    ADD COLUMN franqueadora_id uuid REFERENCES public.franqueadora(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_payment_intents_franqueadora ON public.payment_intents(franqueadora_id);
  END IF;
END;$$;

COMMIT;


