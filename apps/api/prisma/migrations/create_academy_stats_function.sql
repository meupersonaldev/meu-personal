-- Criar função otimizada para estatísticas da academia
-- Esta função substitui múltiplas consultas por uma única operação agregada

CREATE OR REPLACE FUNCTION get_academy_stats(
  academy_id_param UUID,
  include_revenue BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  academy_record RECORD;
  stats_result JSON;
  total_teachers INTEGER;
  total_students INTEGER;
  active_students INTEGER;
  total_bookings INTEGER;
  completed_bookings INTEGER;
  cancelled_bookings INTEGER;
  completion_rate DECIMAL;
BEGIN
  -- Verificar se a academia existe e obter dados básicos
  SELECT id, name, monthly_revenue, franqueadora_id
  INTO academy_record
  FROM academies
  WHERE id = academy_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academia não encontrada';
  END IF;
  
  -- Contagem de professores
  SELECT COUNT(*)
  INTO total_teachers
  FROM academy_teachers
  WHERE academy_id = academy_id_param;
  
  -- Contagem de alunos
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
  INTO total_students, active_students
  FROM academy_students
  WHERE academy_id = academy_id_param;
  
  -- Estatísticas de agendamentos
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
  INTO total_bookings, completed_bookings, cancelled_bookings
  FROM bookings
  WHERE franchise_id = academy_id_param;
  
  -- Calcular taxa de conclusão
  IF total_bookings > 0 THEN
    completion_rate := (completed_bookings::DECIMAL / total_bookings::DECIMAL) * 100;
  ELSE
    completion_rate := 0;
  END IF;
  
  -- Construir JSON de resultado
  stats_result := json_build_object(
    'totalStudents', COALESCE(total_students, 0),
    'activeStudents', COALESCE(active_students, 0),
    'totalTeachers', COALESCE(total_teachers, 0),
    'activeTeachers', COALESCE(total_teachers, 0),
    'totalBookings', COALESCE(total_bookings, 0),
    'completedBookings', COALESCE(completed_bookings, 0),
    'cancelledBookings', COALESCE(cancelled_bookings, 0),
    'completionRate', ROUND(completion_rate, 2),
    'averageRating', 0, -- TODO: Implementar quando tiver sistema de avaliações
    'totalReviews', 0,   -- TODO: Implementar quando tiver sistema de avaliações
    'creditsBalance', 0, -- TODO: Implementar quando tiver sistema de créditos
    'plansActive', 0     -- TODO: Implementar quando tiver sistema de planos
  );
  
  RETURN stats_result;
END;
$$;

-- Grant permissão para executar a função
GRANT EXECUTE ON FUNCTION get_academy_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_academy_stats TO service_role;

-- Criar índices para otimizar as consultas da função
CREATE INDEX IF NOT EXISTS idx_academy_teachers_academy_id ON academy_teachers(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_students_academy_id ON academy_students(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_students_status ON academy_students(status);
CREATE INDEX IF NOT EXISTS idx_bookings_franchise_id ON bookings(franchise_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Comentar sobre a função
COMMENT ON FUNCTION get_academy_stats IS 'Função otimizada para obter estatísticas completas de uma academia em uma única consulta';