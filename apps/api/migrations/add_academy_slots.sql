-- Migration: Sistema de Slots de Agendamento para Academias
-- Descrição: Adiciona tabelas para gerenciar slots de horários nas academias

-- Enum para status do slot
CREATE TYPE slot_status AS ENUM ('available', 'booked', 'blocked');

-- Tabela de Academias (se não existir)
CREATE TABLE IF NOT EXISTS academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Slots de Academia
CREATE TABLE academy_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status slot_status DEFAULT 'available',
  max_capacity INT DEFAULT 1, -- Quantos agendamentos simultâneos são permitidos
  current_bookings INT DEFAULT 0, -- Quantos agendamentos já foram feitos
  blocked_reason TEXT, -- Motivo do bloqueio (se aplicável)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_capacity CHECK (max_capacity > 0),
  CONSTRAINT valid_bookings CHECK (current_bookings >= 0 AND current_bookings <= max_capacity),
  
  -- Índices para performance
  UNIQUE(academy_id, date, start_time)
);

-- Adicionar campo academy_id e slot_id na tabela de bookings (se não existir)
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id),
  ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES academy_slots(id);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_academy_slots_academy_date ON academy_slots(academy_id, date);
CREATE INDEX IF NOT EXISTS idx_academy_slots_status ON academy_slots(status);
CREATE INDEX IF NOT EXISTS idx_academy_slots_date_status ON academy_slots(date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_academy ON bookings(academy_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para academy_slots
CREATE TRIGGER update_academy_slots_updated_at
  BEFORE UPDATE ON academy_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para academies
CREATE TRIGGER update_academies_updated_at
  BEFORE UPDATE ON academies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar disponibilidade de slots
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_academy_id UUID,
  p_date DATE,
  p_start_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_slot_available BOOLEAN;
BEGIN
  SELECT 
    CASE 
      WHEN status = 'available' AND current_bookings < max_capacity THEN true
      ELSE false
    END INTO v_slot_available
  FROM academy_slots
  WHERE academy_id = p_academy_id
    AND date = p_date
    AND start_time = p_start_time;
  
  RETURN COALESCE(v_slot_available, false);
END;
$$ LANGUAGE plpgsql;

-- Função para reservar um slot (bloquear quando agendamento é feito)
CREATE OR REPLACE FUNCTION book_academy_slot(
  p_slot_id UUID,
  p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  -- Atualiza o slot incrementando current_bookings
  UPDATE academy_slots
  SET 
    current_bookings = current_bookings + 1,
    status = CASE 
      WHEN current_bookings + 1 >= max_capacity THEN 'booked'::slot_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_slot_id
    AND status IN ('available', 'booked')
    AND current_bookings < max_capacity
  RETURNING true INTO v_success;
  
  -- Atualiza o booking com o slot_id
  IF v_success THEN
    UPDATE bookings
    SET slot_id = p_slot_id
    WHERE id = p_booking_id;
  END IF;
  
  RETURN COALESCE(v_success, false);
END;
$$ LANGUAGE plpgsql;

-- Função para liberar um slot (quando agendamento é cancelado)
CREATE OR REPLACE FUNCTION release_academy_slot(
  p_slot_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE academy_slots
  SET 
    current_bookings = GREATEST(current_bookings - 1, 0),
    status = CASE 
      WHEN current_bookings - 1 < max_capacity THEN 'available'::slot_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_slot_id
    AND current_bookings > 0
  RETURNING true INTO v_success;
  
  RETURN COALESCE(v_success, false);
END;
$$ LANGUAGE plpgsql;

-- Função para obter slots disponíveis de uma academia em uma data
CREATE OR REPLACE FUNCTION get_available_slots(
  p_academy_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  start_time TIME,
  end_time TIME,
  available_capacity INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.start_time,
    s.end_time,
    (s.max_capacity - s.current_bookings) as available_capacity
  FROM academy_slots s
  WHERE s.academy_id = p_academy_id
    AND s.date = p_date
    AND s.status IN ('available', 'booked')
    AND s.current_bookings < s.max_capacity
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se todas as academias têm slots disponíveis
CREATE OR REPLACE FUNCTION check_all_academies_have_slots(
  p_date DATE
)
RETURNS TABLE (
  academy_id UUID,
  academy_name VARCHAR,
  has_available_slots BOOLEAN,
  total_slots INT,
  available_slots INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as academy_id,
    a.name as academy_name,
    CASE WHEN COUNT(s.id) FILTER (WHERE s.status IN ('available', 'booked') AND s.current_bookings < s.max_capacity) > 0 
      THEN true 
      ELSE false 
    END as has_available_slots,
    COUNT(s.id)::INT as total_slots,
    COUNT(s.id) FILTER (WHERE s.status IN ('available', 'booked') AND s.current_bookings < s.max_capacity)::INT as available_slots
  FROM academies a
  LEFT JOIN academy_slots s ON a.id = s.academy_id AND s.date = p_date
  WHERE a.is_active = true
  GROUP BY a.id, a.name
  ORDER BY a.name;
END;
$$ LANGUAGE plpgsql;

-- Trigger para liberar slot automaticamente quando booking é cancelado
CREATE OR REPLACE FUNCTION auto_release_slot_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' AND NEW.slot_id IS NOT NULL THEN
    PERFORM release_academy_slot(NEW.slot_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_cancel_release_slot
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'CANCELLED')
  EXECUTE FUNCTION auto_release_slot_on_cancel();

-- Inserir slots padrão para exemplo (horários das 6h às 22h, intervalos de 1 hora)
-- Você pode ajustar conforme necessário
CREATE OR REPLACE FUNCTION generate_default_slots_for_academy(
  p_academy_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INT AS $$
DECLARE
  v_current_date DATE;
  v_hour INT;
  v_inserted_count INT := 0;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    FOR v_hour IN 6..21 LOOP
      INSERT INTO academy_slots (
        academy_id,
        date,
        start_time,
        end_time,
        status,
        max_capacity,
        current_bookings
      ) VALUES (
        p_academy_id,
        v_current_date,
        (v_hour || ':00:00')::TIME,
        ((v_hour + 1) || ':00:00')::TIME,
        'available',
        5, -- 5 agendamentos simultâneos por padrão
        0
      )
      ON CONFLICT (academy_id, date, start_time) DO NOTHING;
      
      v_inserted_count := v_inserted_count + 1;
    END LOOP;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE academy_slots IS 'Gerencia os slots de horários disponíveis em cada academia';
COMMENT ON COLUMN academy_slots.max_capacity IS 'Número máximo de agendamentos simultâneos permitidos neste slot';
COMMENT ON COLUMN academy_slots.current_bookings IS 'Número atual de agendamentos feitos neste slot';
COMMENT ON FUNCTION book_academy_slot IS 'Reserva um slot para um agendamento, bloqueando-o se atingir capacidade máxima';
COMMENT ON FUNCTION release_academy_slot IS 'Libera um slot quando um agendamento é cancelado';
COMMENT ON FUNCTION check_all_academies_have_slots IS 'Verifica se todas as academias têm slots disponíveis em uma data específica';
