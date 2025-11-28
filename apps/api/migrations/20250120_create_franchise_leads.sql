-- Criação da tabela franchise_leads para captura de leads de franquias
-- Esta tabela armazena informações de interessados em se tornar franqueados

BEGIN;

-- Criar tabela franchise_leads se não existir
CREATE TABLE IF NOT EXISTS public.franchise_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueadora_id uuid REFERENCES public.franqueadora(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  investment_capacity text,
  message text,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLOSED_WON', 'CLOSED_LOST')),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_franchise_leads_franqueadora ON public.franchise_leads(franqueadora_id);
CREATE INDEX IF NOT EXISTS idx_franchise_leads_status ON public.franchise_leads(status);
CREATE INDEX IF NOT EXISTS idx_franchise_leads_created_at ON public.franchise_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_franchise_leads_email ON public.franchise_leads(email);
CREATE INDEX IF NOT EXISTS idx_franchise_leads_franqueadora_status ON public.franchise_leads(franqueadora_id, status);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER trg_franchise_leads_updated_at
  BEFORE UPDATE ON public.franchise_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

