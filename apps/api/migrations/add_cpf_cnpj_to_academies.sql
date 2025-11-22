-- Migration: Adicionar campo cpf_cnpj na tabela academies
-- Data: 2025-01-21

ALTER TABLE academies
ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(18);

COMMENT ON COLUMN academies.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) da franquia, sem formatação';

