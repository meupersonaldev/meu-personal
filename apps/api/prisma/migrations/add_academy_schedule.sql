-- Adicionar coluna schedule (JSON) para horários por dia da semana
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb;

-- Comentário
COMMENT ON COLUMN academies.schedule IS 'Horários de funcionamento por dia da semana (array de objetos JSON)';

-- Índice GIN para queries em JSON
CREATE INDEX IF NOT EXISTS idx_academies_schedule 
ON academies USING GIN (schedule);
