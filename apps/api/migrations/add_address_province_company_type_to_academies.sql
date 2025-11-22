-- Migration: Adicionar campos address_number, province e company_type na tabela academies
-- Data: 2025-01-21

ALTER TABLE academies
ADD COLUMN IF NOT EXISTS address_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS company_type VARCHAR(20);

COMMENT ON COLUMN academies.address_number IS 'Número do endereço da franquia';
COMMENT ON COLUMN academies.province IS 'Bairro da franquia';
COMMENT ON COLUMN academies.company_type IS 'Tipo de empresa: MEI, LIMITED, INDIVIDUAL, ASSOCIATION';

