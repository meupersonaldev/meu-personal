-- Migration: Agendamento Recorrente com Sistema de Reservas
-- Data: 29/11/2025
-- Descrição: Cria estrutura para séries de agendamentos recorrentes

-- ============================================
-- 1. Tabela booking_series
-- ============================================
CREATE TABLE IF NOT EXISTS booking_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
  
  -- Padrão de recorrência
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dom, 1=Seg, ..., 6=Sab
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Período
  recurrence_type VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('15_DAYS', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Controle
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_role VARCHAR(20) CHECK (created_by_role IN ('STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR')),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'COMPLETED')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_booking_series_student ON booking_series(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_teacher ON booking_series(teacher_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_academy ON booking_series(academy_id);
CREATE INDEX IF NOT EXISTS idx_booking_series_status ON booking_series(status);
CREATE INDEX IF NOT EXISTS idx_booking_series_dates ON booking_series(start_date, end_date);

-- ============================================
-- 2. Novos campos em bookings
-- ============================================
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES booking_series(id) ON DELETE SET NULL;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT FALSE;

-- Índice para buscar bookings de uma série
CREATE INDEX IF NOT EXISTS idx_bookings_series ON bookings(series_id);

-- Índice para buscar reservas pendentes (job de cobrança)
CREATE INDEX IF NOT EXISTS idx_bookings_reserved ON bookings(is_reserved, start_at) 
WHERE is_reserved = TRUE AND status_canonical = 'SCHEDULED';

-- ============================================
-- 3. Tabela booking_series_notifications
-- ============================================
CREATE TABLE IF NOT EXISTS booking_series_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES booking_series(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'SERIES_CREATED',
    'CREDIT_ATTEMPT',
    'CREDIT_SUCCESS', 
    'CREDIT_FAILED',
    'BOOKING_CANCELLED',
    'DATE_SKIPPED',
    'REMINDER_7_DAYS'
  )),
  message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_series_notifications_series ON booking_series_notifications(series_id);
CREATE INDEX IF NOT EXISTS idx_series_notifications_user ON booking_series_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_series_notifications_type ON booking_series_notifications(type);

-- ============================================
-- 4. Trigger para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_booking_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_series_updated_at ON booking_series;
CREATE TRIGGER trigger_booking_series_updated_at
  BEFORE UPDATE ON booking_series
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_series_updated_at();

-- ============================================
-- 5. Comentários para documentação
-- ============================================
COMMENT ON TABLE booking_series IS 'Séries de agendamentos recorrentes (semanal)';
COMMENT ON COLUMN booking_series.day_of_week IS '0=Domingo, 1=Segunda, ..., 6=Sábado';
COMMENT ON COLUMN booking_series.recurrence_type IS 'Período: 15_DAYS, MONTH, QUARTER, SEMESTER, YEAR';
COMMENT ON COLUMN booking_series.status IS 'ACTIVE=em andamento, CANCELLED=cancelada, COMPLETED=finalizada';

COMMENT ON COLUMN bookings.series_id IS 'Referência à série recorrente (NULL se agendamento avulso)';
COMMENT ON COLUMN bookings.is_reserved IS 'TRUE=reserva pendente de crédito, FALSE=confirmado';

COMMENT ON TABLE booking_series_notifications IS 'Histórico de notificações relacionadas a séries recorrentes';
