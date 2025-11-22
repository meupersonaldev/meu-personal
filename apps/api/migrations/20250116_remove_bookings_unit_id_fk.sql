-- Migration: Remove foreign key constraint bookings_unit_id_fk
-- Date: 2025-01-16
-- Description: Remove a constraint de foreign key bookings_unit_id_fk da tabela bookings
--              para permitir que unit_id possa ser NULL ou referenciar valores que não existem em units

BEGIN;

-- Remover a constraint de foreign key bookings_unit_id_fk
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_unit_id_fk;

COMMIT;

