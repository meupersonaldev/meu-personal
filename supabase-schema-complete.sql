-- ============================================
-- SCHEMA COMPLETO - MEU PERSONAL
-- Sistema de Franqueadora + Franquias + Professores + Alunos
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'FRANCHISE_ADMIN', 'SUPER_ADMIN');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE transaction_type AS ENUM ('CREDIT_PURCHASE', 'BOOKING_PAYMENT', 'BOOKING_REFUND', 'PLAN_PURCHASE');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE approval_type AS ENUM ('teacher_registration', 'student_registration');
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLOSED_WON', 'CLOSED_LOST');
CREATE TYPE notification_type AS ENUM ('new_teacher', 'new_student', 'payment_received', 'plan_purchased', 'teacher_approval_needed', 'student_approval_needed', 'booking_created', 'booking_cancelled');
CREATE TYPE franchise_admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ANALYST');
CREATE TYPE academy_teacher_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE academy_student_status AS ENUM ('active', 'inactive');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (todos os usuários do sistema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'STUDENT',
    credits INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher profiles (perfis de professores)
CREATE TABLE teacher_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    specialties TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    availability JSONB DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- FRANQUEADORA (Holding/Marca Principal)
-- ============================================

-- Tabela da franqueadora (pode haver apenas uma ou múltiplas)
CREATE TABLE franqueadora (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins da franqueadora (super admins)
CREATE TABLE franqueadora_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franqueadora_id UUID REFERENCES franqueadora(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role franchise_admin_role DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(franqueadora_id, user_id)
);

-- ============================================
-- ACADEMIAS (Franquias)
-- ============================================

-- Tabela de academias/franquias
CREATE TABLE academies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franqueadora_id UUID REFERENCES franqueadora(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    franchise_fee DECIMAL(10,2) DEFAULT 0,
    royalty_percentage DECIMAL(5,2) DEFAULT 0,
    monthly_revenue DECIMAL(10,2) DEFAULT 0,
    contract_start_date DATE,
    contract_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins das franquias
CREATE TABLE franchise_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academy_id, user_id)
);

-- Professores vinculados a academias
CREATE TABLE academy_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status academy_teacher_status DEFAULT 'pending',
    commission_rate DECIMAL(5,2) DEFAULT 70.00, -- Porcentagem que o professor recebe
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academy_id, teacher_id)
);

-- Alunos vinculados a academias
CREATE TABLE academy_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status academy_student_status DEFAULT 'active',
    plan_id UUID, -- FK será adicionada depois
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academy_id, student_id)
);

-- ============================================
-- PLANOS E PACOTES
-- ============================================

-- Pacotes de franquia (para venda de franquias)
CREATE TABLE franchise_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franqueadora_id UUID REFERENCES franqueadora(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    investment_amount DECIMAL(10,2) NOT NULL,
    franchise_fee DECIMAL(10,2) NOT NULL,
    royalty_percentage DECIMAL(5,2) NOT NULL,
    territory_size VARCHAR(100),
    max_population INTEGER,
    included_features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planos de academias (para alunos)
CREATE TABLE academy_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    credits_included INTEGER NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    asaas_plan_id VARCHAR(255), -- ID do plano no Asaas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planos de professores (para professores comprarem horas)
CREATE TABLE teacher_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    hours_included INTEGER NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    asaas_plan_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar FK de plan_id em academy_students
ALTER TABLE academy_students
ADD CONSTRAINT fk_academy_students_plan
FOREIGN KEY (plan_id) REFERENCES academy_plans(id) ON DELETE SET NULL;

-- ============================================
-- HORÁRIOS E AGENDAMENTOS
-- ============================================

-- Horários disponíveis das academias
CREATE TABLE academy_time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=domingo, 6=sábado
    time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    max_capacity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academy_id, day_of_week, time)
);

-- Bookings (agendamentos)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60, -- em minutos
    status booking_status DEFAULT 'PENDING',
    notes TEXT,
    credits_cost INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRANSAÇÕES E PAGAMENTOS
-- ============================================

-- Transactions (histórico de créditos)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL, -- em créditos
    description TEXT NOT NULL,
    reference_id TEXT, -- ID externo (pagamento Asaas, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LEADS E APROVAÇÕES
-- ============================================

-- Leads de franquia
CREATE TABLE franchise_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franqueadora_id UUID REFERENCES franqueadora(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    city VARCHAR(100),
    investment_capacity VARCHAR(100),
    message TEXT,
    status lead_status DEFAULT 'NEW',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Requisições de aprovação (professores/alunos)
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type approval_type NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id) ON DELETE SET NULL,
    status approval_status DEFAULT 'pending',
    requested_data JSONB, -- Dados adicionais da requisição
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICAÇÕES E REVIEWS
-- ============================================

-- Notificações das franquias
CREATE TABLE franchise_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Dados extras da notificação
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews (avaliações)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_visible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Teachers
CREATE INDEX idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX idx_teacher_profiles_available ON teacher_profiles(is_available);

-- Academies
CREATE INDEX idx_academies_franqueadora ON academies(franqueadora_id);
CREATE INDEX idx_academies_active ON academies(is_active);
CREATE INDEX idx_academy_teachers_academy ON academy_teachers(academy_id);
CREATE INDEX idx_academy_teachers_teacher ON academy_teachers(teacher_id);
CREATE INDEX idx_academy_students_academy ON academy_students(academy_id);
CREATE INDEX idx_academy_students_student ON academy_students(student_id);

-- Bookings
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_teacher_id ON bookings(teacher_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Reviews
CREATE INDEX idx_reviews_teacher_id ON reviews(teacher_id);
CREATE INDEX idx_reviews_visible ON reviews(is_visible);

-- Notifications
CREATE INDEX idx_notifications_admin ON franchise_notifications(franchise_admin_id);
CREATE INDEX idx_notifications_read ON franchise_notifications(is_read);

-- Approvals
CREATE INDEX idx_approvals_status ON approval_requests(status);
CREATE INDEX idx_approvals_academy ON approval_requests(academy_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franqueadora_updated_at BEFORE UPDATE ON franqueadora
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academies_updated_at BEFORE UPDATE ON academies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_teachers_updated_at BEFORE UPDATE ON academy_teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_students_updated_at BEFORE UPDATE ON academy_students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_plans_updated_at BEFORE UPDATE ON academy_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_plans_updated_at BEFORE UPDATE ON teacher_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchise_packages_updated_at BEFORE UPDATE ON franchise_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchise_leads_updated_at BEFORE UPDATE ON franchise_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE franqueadora ENABLE ROW LEVEL SECURITY;
ALTER TABLE franqueadora_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies básicas (podem ser refinadas conforme necessidade)

-- Users: podem ver próprio perfil e perfis públicos
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Teacher profiles: público para leitura
CREATE POLICY "Teacher profiles are viewable by everyone" ON teacher_profiles
    FOR SELECT USING (true);

CREATE POLICY "Teachers can update own profile" ON teacher_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Academies: admins podem ver suas academias
CREATE POLICY "Franchise admins can view their academies" ON academies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM franchise_admins
            WHERE franchise_admins.academy_id = academies.id
            AND franchise_admins.user_id = auth.uid()
        )
    );

-- Bookings: estudantes e professores veem suas reservas
CREATE POLICY "Students can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their bookings" ON bookings
    FOR SELECT USING (auth.uid() = teacher_id);

-- Reviews: público para leitura
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (is_visible = true);

-- ============================================
-- DADOS DE TESTE
-- ============================================

-- Inserir franqueadora
INSERT INTO franqueadora (id, name, cnpj, email, phone, city, state, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Meu Personal Brasil', '12.345.678/0001-90', 'contato@meupersonal.com.br', '(11) 3000-0000', 'São Paulo', 'SP', true);

-- Inserir super admin da franqueadora
INSERT INTO users (id, email, name, phone, role, is_active) VALUES
    ('10000000-0000-0000-0000-000000000010', 'admin@meupersonal.com', 'Admin Franqueadora', '(11) 99000-0000', 'SUPER_ADMIN', true);

INSERT INTO franqueadora_admins (franqueadora_id, user_id, role) VALUES
    ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010', 'SUPER_ADMIN');

-- Inserir academias (franquias)
INSERT INTO academies (id, franqueadora_id, name, email, phone, city, state, franchise_fee, royalty_percentage, monthly_revenue, is_active) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Meu Personal - Unidade Paulista', 'paulista@meupersonal.com', '(11) 3100-0000', 'São Paulo', 'SP', 50000.00, 8.00, 25000.00, true),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Meu Personal - Unidade Vila Mariana', 'vilamariana@meupersonal.com', '(11) 3200-0000', 'São Paulo', 'SP', 50000.00, 8.00, 18000.00, true);

-- Inserir admin da franquia
INSERT INTO users (id, email, name, phone, role, is_active) VALUES
    ('20000000-0000-0000-0000-000000000010', 'admin@paulista.meupersonal.com', 'Admin Paulista', '(11) 99100-0000', 'FRANCHISE_ADMIN', true);

INSERT INTO franchise_admins (academy_id, user_id) VALUES
    ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010');

-- Inserir professores
INSERT INTO users (id, email, name, phone, role, credits, is_active) VALUES
    ('30000000-0000-0000-0000-000000000001', 'maria@email.com', 'Maria Santos', '(11) 98765-4321', 'TEACHER', 0, true),
    ('30000000-0000-0000-0000-000000000002', 'carlos@email.com', 'Carlos Silva', '(11) 98765-4322', 'TEACHER', 0, true);

INSERT INTO teacher_profiles (user_id, bio, specialties, hourly_rate, rating, total_reviews, is_available) VALUES
    ('30000000-0000-0000-0000-000000000001', 'Personal trainer especializada em emagrecimento e funcional', ARRAY['Emagrecimento', 'Funcional', 'Cardio'], 80.00, 4.9, 25, true),
    ('30000000-0000-0000-0000-000000000002', 'Especialista em musculação e hipertrofia', ARRAY['Musculação', 'Hipertrofia', 'Força'], 100.00, 4.7, 18, true);

-- Vincular professores à academia
INSERT INTO academy_teachers (academy_id, teacher_id, status, commission_rate) VALUES
    ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'active', 70.00),
    ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'active', 70.00);

-- Inserir alunos
INSERT INTO users (id, email, name, phone, role, credits, is_active) VALUES
    ('40000000-0000-0000-0000-000000000001', 'joao@email.com', 'João Silva', '(11) 99999-9999', 'STUDENT', 10, true),
    ('40000000-0000-0000-0000-000000000002', 'paula@email.com', 'Paula Santos', '(11) 99999-8888', 'STUDENT', 15, true);

-- Criar planos da academia
INSERT INTO academy_plans (id, academy_id, name, description, price, credits_included, duration_days, features, is_active) VALUES
    ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Pacote Básico', 'Ideal para começar', 200.00, 4, 30, ARRAY['4 aulas', 'Suporte básico'], true),
    ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Pacote Premium', 'Treino ilimitado', 500.00, 12, 30, ARRAY['12 aulas', 'Suporte premium', 'Prioridade'], true);

-- Vincular alunos à academia
INSERT INTO academy_students (academy_id, student_id, status, plan_id) VALUES
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'active', '50000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'active', '50000000-0000-0000-0000-000000000002');

-- Inserir horários da academia (segunda a sexta, 6h às 22h)
INSERT INTO academy_time_slots (academy_id, day_of_week, time, is_available, max_capacity)
SELECT
    '20000000-0000-0000-0000-000000000001',
    d.day,
    t.hour::time,
    true,
    4
FROM
    generate_series(1, 5) d(day),
    generate_series(6, 22) t(hour);

-- Inserir alguns agendamentos de exemplo
INSERT INTO bookings (student_id, teacher_id, date, duration, status, credits_cost) VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', NOW() + INTERVAL '1 day', 60, 'CONFIRMED', 1),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days', 60, 'PENDING', 1);

-- Inserir pacotes de franquia
INSERT INTO franchise_packages (franqueadora_id, name, description, investment_amount, franchise_fee, royalty_percentage, territory_size, included_features, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Pacote Starter', 'Ideal para começar seu negócio', 80000.00, 40000.00, 6.00, 'Até 50.000 habitantes', ARRAY['Treinamento inicial', 'Marketing básico', 'Sistema completo'], true),
    ('10000000-0000-0000-0000-000000000001', 'Pacote Premium', 'Para mercados maiores', 150000.00, 80000.00, 8.00, 'Até 200.000 habitantes', ARRAY['Treinamento completo', 'Marketing avançado', 'Suporte premium', 'Território exclusivo'], true);

-- Inserir alguns leads
INSERT INTO franchise_leads (franqueadora_id, name, email, phone, city, investment_capacity, message, status) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Roberto Lima', 'roberto@email.com', '(11) 98888-8888', 'Campinas', 'R$ 100.000', 'Interessado em abrir franquia', 'QUALIFIED'),
    ('10000000-0000-0000-0000-000000000001', 'Ana Costa', 'ana@email.com', '(11) 97777-7777', 'Santos', 'R$ 80.000', 'Gostaria de mais informações', 'NEW');