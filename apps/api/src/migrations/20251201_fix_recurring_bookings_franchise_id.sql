-- Migration: Corrigir franchise_id em bookings de séries recorrentes
-- Data: 01/12/2025
-- Descrição: Corrige bookings criados sem franchise_id, buscando o academy_id da série correspondente

-- ============================================
-- 1. Atualizar bookings que têm series_id mas não têm franchise_id
-- ============================================
-- Buscar o academy_id da série e atualizar o franchise_id do booking
UPDATE bookings b
SET 
  franchise_id = bs.academy_id,
  updated_at = NOW()
FROM booking_series bs
WHERE 
  b.series_id = bs.id
  AND b.franchise_id IS NULL
  AND bs.academy_id IS NOT NULL;

-- ============================================
-- 2. Atualizar campo date para bookings que têm series_id mas não têm date
-- ============================================
-- Usar start_at como fallback para o campo date
UPDATE bookings
SET 
  date = COALESCE(date, start_at),
  updated_at = NOW()
WHERE 
  series_id IS NOT NULL
  AND (date IS NULL OR date != start_at);

-- ============================================
-- 3. Log de correções aplicadas
-- ============================================
-- Contar quantos bookings foram corrigidos
DO $$
DECLARE
  corrected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO corrected_count
  FROM bookings b
  INNER JOIN booking_series bs ON b.series_id = bs.id
  WHERE b.franchise_id = bs.academy_id
    AND b.series_id IS NOT NULL;
  
  RAISE NOTICE 'Migração concluída: % bookings de séries recorrentes agora têm franchise_id correto', corrected_count;
END $$;





