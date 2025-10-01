-- Adicionar colunas de configuração na tabela academies

-- Horários de funcionamento
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '06:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00';

-- Tolerância de check-in (em minutos)
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS checkin_tolerance INTEGER DEFAULT 30;

-- Comentários para documentação
COMMENT ON COLUMN academies.opening_time IS 'Horário de abertura da academia (formato HH:MM:SS)';
COMMENT ON COLUMN academies.closing_time IS 'Horário de fechamento da academia (formato HH:MM:SS)';
COMMENT ON COLUMN academies.checkin_tolerance IS 'Tolerância de check-in em minutos (antes/depois do horário agendado)';

-- Índice para queries de horário
CREATE INDEX IF NOT EXISTS idx_academies_opening_hours 
ON academies (opening_time, closing_time);
