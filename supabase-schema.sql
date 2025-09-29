-- Schema otimizado para MVP Meu Personal
-- Foco: Professor e Aluno apenas

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE transaction_type AS ENUM ('CREDIT_PURCHASE', 'BOOKING_PAYMENT', 'BOOKING_REFUND');

-- Users table (core)
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

-- Teacher profiles
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

-- Bookings (agendamentos)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60, -- em minutos
    status booking_status DEFAULT 'PENDING',
    notes TEXT,
    credits_cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (histórico de créditos)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL, -- em créditos
    description TEXT NOT NULL,
    reference_id TEXT, -- ID externo (pagamento, etc)
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

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX idx_teacher_profiles_available ON teacher_profiles(is_available);
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_teacher_id ON bookings(teacher_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_reviews_teacher_id ON reviews(teacher_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: podem ver próprio perfil e perfis de professores
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view teacher profiles" ON users
    FOR SELECT USING (role = 'TEACHER' AND is_active = true);

-- Teacher profiles: público para leitura, apenas o próprio professor pode editar
CREATE POLICY "Teacher profiles are viewable by everyone" ON teacher_profiles
    FOR SELECT USING (true);

CREATE POLICY "Teachers can update own profile" ON teacher_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Teachers can insert own profile" ON teacher_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings: estudantes veem suas reservas, professores veem reservas para eles
CREATE POLICY "Students can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their bookings" ON bookings
    FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can update their bookings" ON bookings
    FOR UPDATE USING (auth.uid() = teacher_id);

-- Transactions: apenas próprio usuário
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Reviews: público para leitura, apenas estudante da reserva pode criar
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (is_visible = true);

CREATE POLICY "Students can create reviews for their bookings" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Insert sample data
INSERT INTO users (id, email, name, phone, role, credits, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'joao@email.com', 'João Silva', '(11) 99999-9999', 'STUDENT', 15, true),
    ('22222222-2222-2222-2222-222222222222', 'maria@email.com', 'Maria Santos', '(11) 88888-8888', 'TEACHER', 0, true),
    ('33333333-3333-3333-3333-333333333333', 'carlos@email.com', 'Carlos Personal', '(11) 77777-7777', 'TEACHER', 0, true),
    ('44444444-4444-4444-4444-444444444444', 'ana@email.com', 'Ana Aluna', '(11) 66666-6666', 'STUDENT', 8, true);

INSERT INTO teacher_profiles (user_id, bio, specialties, hourly_rate, rating, total_reviews, is_available) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Personal trainer especializada em emagrecimento e condicionamento físico.', ARRAY['Emagrecimento', 'Funcional', 'Cardio'], 80.00, 4.8, 25, true),
    ('33333333-3333-3333-3333-333333333333', 'Especialista em musculação e hipertrofia com 8 anos de experiência.', ARRAY['Musculação', 'Hipertrofia', 'Força'], 100.00, 4.9, 42, true);
