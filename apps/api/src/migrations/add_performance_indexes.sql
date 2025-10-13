-- Índices para otimizar performance das consultas mais frequentes

-- Bookings por academia e status (para stats)
CREATE INDEX IF NOT EXISTS idx_bookings_academy_status 
ON bookings(academy_id, status_canonical) 
WHERE academy_id IS NOT NULL;

-- Bookings por usuário (professor/aluno) para estatísticas
CREATE INDEX IF NOT EXISTS idx_bookings_professor_status 
ON bookings(professor_id, status_canonical) 
WHERE professor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_student_status 
ON bookings(student_id, status_canonical) 
WHERE student_id IS NOT NULL;

-- Student class balance por aluno
CREATE INDEX IF NOT EXISTS idx_student_class_balance_student 
ON student_class_balance(student_id);

-- Professor hour balance por professor  
CREATE INDEX IF NOT EXISTS idx_prof_hour_balance_professor 
ON prof_hour_balance(professor_id);

-- Student units por aluno
CREATE INDEX IF NOT EXISTS idx_student_units_student 
ON student_units(student_id);

-- Professor units por professor
CREATE INDEX IF NOT EXISTS idx_professor_units_professor 
ON professor_units(professor_id);

-- Payment intents por usuário e status
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_status 
ON payment_intents(actor_user_id, status);

-- Academy teachers/students por academia
CREATE INDEX IF NOT EXISTS idx_academy_teachers_academy 
ON academy_teachers(academy_id);

CREATE INDEX IF NOT EXISTS idx_academy_students_academy_status 
ON academy_students(academy_id, status);

-- Franqueadora contacts por franqueadora e status
CREATE INDEX IF NOT EXISTS idx_franqueadora_contacts_franqueadora_status 
ON franqueadora_contacts(franqueadora_id, status);

-- Users por role para listagens
CREATE INDEX IF NOT EXISTS idx_users_role_active 
ON users(role, active) 
WHERE role IN ('STUDENT', 'TEACHER', 'ALUNO', 'PROFESSOR');

-- Packages por franqueadora e status
CREATE INDEX IF NOT EXISTS idx_student_packages_franqueadora_status 
ON student_packages(franqueadora_id, status);

CREATE INDEX IF NOT EXISTS idx_hour_packages_franqueadora_status 
ON hour_packages(franqueadora_id, status);

-- Franchise packages por franqueadora
CREATE INDEX IF NOT EXISTS idx_franchise_packages_franqueadora_active 
ON franchise_packages(franqueadora_id, is_active);

-- Franchise leads por franqueadora e status
CREATE INDEX IF NOT EXISTS idx_franchise_leads_franqueadora_status 
ON franchise_leads(franqueadora_id, status);

COMMENT ON INDEX idx_bookings_academy_status IS 'Otimiza consultas de stats por academia';
COMMENT ON INDEX idx_bookings_professor_status IS 'Otimiza consultas de bookings por professor';
COMMENT ON INDEX idx_bookings_student_status IS 'Otimiza consultas de bookings por aluno';
COMMENT ON INDEX idx_users_role_active IS 'Otimiza listagem de usuários por role';
