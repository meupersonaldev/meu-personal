-- Tabela de auditoria para check-ins via QR Code
-- Esta tabela é OPCIONAL e serve para rastreabilidade e BI
-- O sistema funciona sem ela (erros de insert são ignorados no código)

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  booking_id UUID,
  status TEXT NOT NULL CHECK (status IN ('GRANTED', 'DENIED')),
  reason TEXT,
  method TEXT NOT NULL DEFAULT 'QRCODE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance em queries de auditoria
CREATE INDEX IF NOT EXISTS idx_checkins_academy_created 
  ON checkins (academy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_teacher_created 
  ON checkins (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_booking 
  ON checkins (booking_id) 
  WHERE booking_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE checkins IS 'Registro de tentativas de check-in via QR Code para auditoria';
COMMENT ON COLUMN checkins.status IS 'GRANTED = acesso liberado, DENIED = acesso negado';
COMMENT ON COLUMN checkins.reason IS 'Motivo da negação (ex: NO_VALID_BOOKING_IN_WINDOW)';
COMMENT ON COLUMN checkins.method IS 'Método de check-in (QRCODE, MANUAL, etc)';
