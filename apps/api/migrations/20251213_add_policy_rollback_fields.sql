-- Adiciona campos para suporte a rollback de políticas

ALTER TABLE franchisor_policies 
ADD COLUMN IF NOT EXISTS is_rollback boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rollback_from_version integer,
ADD COLUMN IF NOT EXISTS rollback_to_version integer,
ADD COLUMN IF NOT EXISTS rollback_comment text;

-- Índice para buscar rollbacks
CREATE INDEX IF NOT EXISTS idx_franchisor_policies_rollback ON franchisor_policies(franqueadora_id, is_rollback) WHERE is_rollback = true;

COMMENT ON COLUMN franchisor_policies.is_rollback IS 'Indica se esta versão foi criada por rollback';
COMMENT ON COLUMN franchisor_policies.rollback_from_version IS 'Versão da qual foi feito rollback';
COMMENT ON COLUMN franchisor_policies.rollback_to_version IS 'Versão para a qual foi revertido';
COMMENT ON COLUMN franchisor_policies.rollback_comment IS 'Comentário/motivo do rollback';
