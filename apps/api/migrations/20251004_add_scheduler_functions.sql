-- Funções SQL para suporte do scheduler T-4h

-- Função para incrementar total_consumed (aluno) ou available_hours (professor)
CREATE OR REPLACE FUNCTION increment_consumed()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Para UPDATE de student_class_balance
    IF TG_TABLE_NAME = 'student_class_balance' THEN
      NEW.total_consumed = OLD.total_consumed + 1;
      NEW.locked_qty = OLD.locked_qty - 1;
    -- Para UPDATE de prof_hour_balance
    ELSIF TG_TABLE_NAME = 'prof_hour_balance' THEN
      NEW.available_hours = OLD.available_hours + 1;
      NEW.locked_hours = OLD.locked_hours - 1;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar locked_qty (aluno) ou locked_hours (professor)
CREATE OR REPLACE FUNCTION increment_locked()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Para UPDATE de student_class_balance
    IF TG_TABLE_NAME = 'student_class_balance' THEN
      NEW.locked_qty = OLD.locked_qty + 1;
    -- Para UPDATE de prof_hour_balance
    ELSIF TG_TABLE_NAME = 'prof_hour_balance' THEN
      NEW.locked_hours = OLD.locked_hours + 1;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Índices para otimizar as queries do scheduler
CREATE INDEX IF NOT EXISTS idx_student_class_tx_type_unlock_at ON student_class_tx(type, unlock_at);
CREATE INDEX IF NOT EXISTS idx_hour_tx_type_unlock_at ON hour_tx(type, unlock_at);
CREATE INDEX IF NOT EXISTS idx_student_class_tx_booking_id_null ON student_class_tx(booking_id) WHERE booking_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_hour_tx_booking_id_null ON hour_tx(booking_id) WHERE booking_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status_updated_at ON bookings(status_canonical, updated_at);

-- View para locks expirados de alunos
CREATE OR REPLACE VIEW expired_student_locks AS
SELECT
  s.*,
  u.name as student_name,
  u.email as student_email,
  unit.name as unit_name,
  b.status_canonical as booking_status
FROM student_class_tx s
JOIN users u ON s.student_id = u.id
JOIN units unit ON s.unit_id = unit.id
LEFT JOIN bookings b ON s.booking_id = b.id
WHERE s.type = 'LOCK'
  AND s.unlock_at <= NOW()
  AND s.booking_id IS NULL;

-- View para BONUS_LOCKs expirados de professores
CREATE OR REPLACE VIEW expired_professor_bonus_locks AS
SELECT
  h.*,
  u.name as professor_name,
  u.email as professor_email,
  unit.name as unit_name,
  b.status_canonical as booking_status
FROM hour_tx h
JOIN users u ON h.professor_id = u.id
JOIN units unit ON h.unit_id = unit.id
LEFT JOIN bookings b ON h.booking_id = b.id
WHERE h.type = 'BONUS_LOCK'
  AND h.unlock_at <= NOW()
  AND h.booking_id IS NULL;

-- Função para limpar transações órfãs
CREATE OR REPLACE FUNCTION cleanup_orphaned_transactions()
RETURNS TABLE(processed_locks integer, processed_bonus_locks integer) AS $$
DECLARE
  locks_count integer;
  bonus_locks_count integer;
BEGIN
  -- Processar LOCKs de alunos expirados
  UPDATE student_class_tx
  SET
    type = 'CONSUME',
    source = 'SYSTEM',
    meta_json = jsonb_set(
      meta_json,
      '{processed_by, processed_at, reason}',
      '{"scheduler", NOW(), "LOCK expirado T-4h - crédito consumido"}'
    )
  WHERE type = 'LOCK'
    AND unlock_at <= NOW()
    AND booking_id IS NULL
    AND id NOT IN (
      SELECT id FROM student_class_tx WHERE type = 'CONSUME' AND source = 'SYSTEM'
    );

  GET DIAGNOSTICS locks_count = ROW_COUNT;

  -- Processar BONUS_LOCKs de professores expirados
  UPDATE hour_tx
  SET
    type = 'BONUS_UNLOCK',
    source = 'SYSTEM',
    meta_json = jsonb_set(
      meta_json,
      '{processed_by, processed_at, reason}',
      '{"scheduler", NOW(), "BONUS_LOCK expirado T-4h - hora bônus creditada"}'
    )
  WHERE type = 'BONUS_LOCK'
    AND unlock_at <= NOW()
    AND booking_id IS NULL
    AND id NOT IN (
      SELECT id FROM hour_tx WHERE type = 'BONUS_UNLOCK' AND source = 'SYSTEM'
    );

  GET DIAGNOSTICS bonus_locks_count = ROW_COUNT;

  processed_locks := locks_count;
  processed_bonus_locks := bonus_locks_count;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Função para criar resumo diário do scheduler
CREATE OR REPLACE FUNCTION get_scheduler_daily_summary(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  date_target date,
  expired_locks bigint,
  expired_bonus_locks bigint,
  processed_locks bigint,
  processed_bonus_locks bigint,
  active_locks bigint,
  active_bonus_locks bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    target_date,
    COUNT(CASE WHEN s.type = 'LOCK' AND s.unlock_at <= target_date THEN 1 END) as expired_locks,
    COUNT(CASE WHEN h.type = 'BONUS_LOCK' AND h.unlock_at <= target_date THEN 1 END) as expired_bonus_locks,
    COUNT(CASE WHEN s.type = 'CONSUME' AND DATE(s.created_at) = target_date AND s.source = 'SYSTEM' THEN 1 END) as processed_locks,
    COUNT(CASE WHEN h.type = 'BONUS_UNLOCK' AND DATE(h.created_at) = target_date AND h.source = 'SYSTEM' THEN 1 END) as processed_bonus_locks,
    COUNT(CASE WHEN s.type = 'LOCK' AND s.unlock_at > target_date THEN 1 END) as active_locks,
    COUNT(CASE WHEN h.type = 'BONUS_LOCK' AND h.unlock_at > target_date THEN 1 END) as active_bonus_locks
  FROM student_class_tx s
  FULL OUTER JOIN hour_tx h ON 1=1
  WHERE
    (s.type IN ('LOCK', 'CONSUME') OR h.type IN ('BONUS_LOCK', 'BONUS_UNLOCK'))
    AND DATE(s.created_at) <= target_date OR DATE(h.created_at) <= target_date OR s.unlock_at <= target_date OR h.unlock_at <= target_date;
END;
$$ LANGUAGE plpgsql;