-- Migration: Adicionar campo birth_date na tabela academies
-- Data: 2025-01-21
-- Descrição: Campo para armazenar data de nascimento (obrigatório para pessoa física - CPF)

ALTER TABLE academies
ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN academies.birth_date IS 'Data de nascimento (obrigatório para pessoa física - CPF)';

