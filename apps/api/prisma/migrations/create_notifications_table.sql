-- Create notifications table for academy notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'new_booking', 'booking_cancelled', 'checkin', 'new_student'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data (booking_id, student_id, etc)
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_academy_id ON notifications(academy_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_academy_unread ON notifications(academy_id, read, created_at DESC);

COMMENT ON TABLE notifications IS 'Notificações para academias (agendamentos, check-ins, novos alunos, etc)';
COMMENT ON COLUMN notifications.type IS 'Tipo: new_booking, booking_cancelled, checkin, new_student';
COMMENT ON COLUMN notifications.data IS 'JSON com dados adicionais (booking_id, student_id, teacher_id, etc)';
