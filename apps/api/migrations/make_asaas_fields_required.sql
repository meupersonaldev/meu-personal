-- Migration: Tornar campos asaas_account_id, asaas_wallet_id (academies) e asaas_wallet_id (franqueadora) obrigatórios
-- Data: 2025-01-21
-- ATENÇÃO: Esta migration assume que todas as academies e franqueadora existentes já têm esses campos preenchidos
-- Se houver registros sem esses campos, será necessário atualizá-los antes de executar esta migration

-- Para academies: atualizar registros sem asaas_account_id ou asaas_wallet_id
-- (Isso deve ser feito via sincronização antes de executar esta migration)
UPDATE academies
SET asaas_account_id = 'PENDING_' || id::text
WHERE asaas_account_id IS NULL;

UPDATE academies
SET asaas_wallet_id = 'PENDING_' || id::text
WHERE asaas_wallet_id IS NULL;

-- Para franqueadora: atualizar registros sem asaas_wallet_id
UPDATE franqueadora
SET asaas_wallet_id = 'PENDING_' || id::text
WHERE asaas_wallet_id IS NULL;

-- Tornar campos obrigatórios em academies
ALTER TABLE academies
ALTER COLUMN asaas_account_id SET NOT NULL,
ALTER COLUMN asaas_wallet_id SET NOT NULL;

-- Tornar campo obrigatório em franqueadora
ALTER TABLE franqueadora
ALTER COLUMN asaas_wallet_id SET NOT NULL;

COMMENT ON COLUMN academies.asaas_account_id IS 'ID da conta Asaas da franquia - OBRIGATÓRIO';
COMMENT ON COLUMN academies.asaas_wallet_id IS 'ID da wallet Asaas da franquia - OBRIGATÓRIO';
COMMENT ON COLUMN franqueadora.asaas_wallet_id IS 'ID da wallet Asaas da franqueadora (conta principal) - OBRIGATÓRIO';

