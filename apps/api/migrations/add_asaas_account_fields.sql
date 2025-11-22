-- Migration: Adicionar campos Asaas para subcontas e split de pagamento
-- Descrição: Adiciona campos para armazenar walletId e accountId do Asaas nas tabelas academies e franqueadora

BEGIN;

-- Adicionar campos na tabela academies (franquias)
ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS asaas_account_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;

-- Adicionar campo na tabela franqueadora (apenas walletId, não accountId)
ALTER TABLE public.franqueadora
  ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.academies.asaas_account_id IS 'ID da subconta criada no Asaas para esta franquia';
COMMENT ON COLUMN public.academies.asaas_wallet_id IS 'Wallet ID do Asaas necessário para split de pagamento (90% para franquia)';
COMMENT ON COLUMN public.franqueadora.asaas_wallet_id IS 'Wallet ID do Asaas necessário para split de pagamento (10% para franqueadora)';

-- Índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_academies_asaas_wallet_id ON public.academies(asaas_wallet_id) WHERE asaas_wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_franqueadora_asaas_wallet_id ON public.franqueadora(asaas_wallet_id) WHERE asaas_wallet_id IS NOT NULL;

COMMIT;

