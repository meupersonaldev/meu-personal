-- Migration: Corrigir formato do campo date em bookings
-- Data: 02/12/2025
-- Descrição: Converte campo date de timestamp para apenas data (YYYY-MM-DD) para bookings de séries

-- ============================================
-- 1. Corrigir campo date para bookings de séries
-- ============================================
-- Extrair apenas a data (sem hora) do campo date ou start_at
UPDATE bookings
SET 
  date = CASE
    -- Se date é um timestamp, extrair apenas a data
    WHEN date::text LIKE '%:%' THEN date::date::text
    -- Se date está NULL mas start_at existe, extrair data de start_at
    WHEN date IS NULL AND start_at IS NOT NULL THEN start_at::date::text
    -- Caso contrário, manter como está (já deve estar no formato correto)
    ELSE date::text
  END,
  updated_at = NOW()
WHERE 
  series_id IS NOT NULL
  AND (
    -- Corrigir se date é um timestamp (contém hora)
    date::text LIKE '%:%'
    -- Ou se date está NULL mas start_at existe
    OR (date IS NULL AND start_at IS NOT NULL)
  );

-- ============================================
-- 2. Log de correções aplicadas
-- ============================================
DO $$
DECLARE
  corrected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO corrected_count
  FROM bookings
  WHERE series_id IS NOT NULL
    AND date IS NOT NULL
    AND date::text NOT LIKE '%:%';
  
  RAISE NOTICE 'Migração concluída: % bookings de séries recorrentes agora têm campo date no formato correto (YYYY-MM-DD)', corrected_count;
END $$;

