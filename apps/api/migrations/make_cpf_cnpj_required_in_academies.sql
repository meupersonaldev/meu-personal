-- Migration: Tornar campo cpf_cnpj obrigatório na tabela academies
-- Data: 2025-01-21
-- ATENÇÃO: Esta migration assume que todas as academies existentes já têm cpf_cnpj
-- Se houver academies sem cpf_cnpj, será necessário atualizá-las antes de executar esta migration

-- Primeiro, atualizar academies sem cpf_cnpj com um valor padrão (se houver)
-- IMPORTANTE: Ajuste o valor padrão conforme necessário para seu ambiente
UPDATE academies
SET cpf_cnpj = '00000000000191'
WHERE cpf_cnpj IS NULL OR cpf_cnpj = '';

-- Tornar o campo NOT NULL
ALTER TABLE academies
ALTER COLUMN cpf_cnpj SET NOT NULL;

-- Adicionar constraint de tamanho mínimo (11 dígitos para CPF)
ALTER TABLE academies
ADD CONSTRAINT check_cpf_cnpj_length 
CHECK (LENGTH(cpf_cnpj) >= 11 AND LENGTH(cpf_cnpj) <= 14);

COMMENT ON COLUMN academies.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) da franquia, sem formatação - OBRIGATÓRIO';

