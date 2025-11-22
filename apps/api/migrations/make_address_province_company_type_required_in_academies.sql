-- Migration: Tornar campos address_number, province e company_type obrigatórios na tabela academies
-- Data: 2025-01-21
-- ATENÇÃO: Esta migration assume que todas as academies existentes já têm esses campos preenchidos
-- Se houver academies sem esses campos, será necessário atualizá-las antes de executar esta migration

-- Primeiro, atualizar academies sem address_number com um valor padrão (se houver)
UPDATE academies
SET address_number = 'S/N'
WHERE address_number IS NULL OR address_number = '';

-- Primeiro, atualizar academies sem province com um valor padrão (se houver)
UPDATE academies
SET province = 'Centro'
WHERE province IS NULL OR province = '';

-- Primeiro, atualizar academies sem company_type com um valor padrão (se houver)
UPDATE academies
SET company_type = 'LIMITED'
WHERE company_type IS NULL OR company_type = '';

-- Tornar os campos NOT NULL
ALTER TABLE academies
ALTER COLUMN address_number SET NOT NULL,
ALTER COLUMN province SET NOT NULL,
ALTER COLUMN company_type SET NOT NULL;

-- Adicionar constraint para company_type
ALTER TABLE academies
ADD CONSTRAINT check_company_type 
CHECK (company_type IN ('MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'));

COMMENT ON COLUMN academies.address_number IS 'Número do endereço da franquia - OBRIGATÓRIO';
COMMENT ON COLUMN academies.province IS 'Bairro da franquia - OBRIGATÓRIO';
COMMENT ON COLUMN academies.company_type IS 'Tipo de empresa: MEI, LIMITED, INDIVIDUAL, ASSOCIATION - OBRIGATÓRIO';

