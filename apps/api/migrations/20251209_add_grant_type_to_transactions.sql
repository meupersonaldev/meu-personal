-- Migration: Add GRANT type and ADMIN source to transaction tables
-- Requirements: 4.1, 4.2, 4.3 - Support for manual credit release transactions

BEGIN;

-- Update student_class_tx type constraint to include GRANT
ALTER TABLE public.student_class_tx 
DROP CONSTRAINT IF EXISTS student_class_tx_type_check;

ALTER TABLE public.student_class_tx 
ADD CONSTRAINT student_class_tx_type_check 
CHECK (type IN ('PURCHASE', 'CONSUME', 'LOCK', 'UNLOCK', 'REFUND', 'REVOKE', 'GRANT'));

-- Update hour_tx type constraint to include GRANT
ALTER TABLE public.hour_tx 
DROP CONSTRAINT IF EXISTS hour_tx_type_check;

ALTER TABLE public.hour_tx 
ADD CONSTRAINT hour_tx_type_check 
CHECK (type IN ('PURCHASE', 'CONSUME', 'BONUS_LOCK', 'BONUS_UNLOCK', 'REFUND', 'REVOKE', 'GRANT'));

-- Update student_class_tx source constraint to include ADMIN
ALTER TABLE public.student_class_tx 
DROP CONSTRAINT IF EXISTS student_class_tx_source_check;

ALTER TABLE public.student_class_tx 
ADD CONSTRAINT student_class_tx_source_check 
CHECK (source IN ('ALUNO', 'PROFESSOR', 'SYSTEM', 'ADMIN'));

-- Update hour_tx source constraint to include ADMIN
ALTER TABLE public.hour_tx 
DROP CONSTRAINT IF EXISTS hour_tx_source_check;

ALTER TABLE public.hour_tx 
ADD CONSTRAINT hour_tx_source_check 
CHECK (source IN ('ALUNO', 'PROFESSOR', 'SYSTEM', 'ADMIN'));

COMMIT;
