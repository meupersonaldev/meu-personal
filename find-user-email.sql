-- Script para buscar o email contato@zairagoncalves.com em todas as tabelas relevantes

-- 1. Buscar na tabela users (tabela principal de usuários)
SELECT 'users' as tabela, id, email, name, role, is_active, created_at
FROM users
WHERE LOWER(email) = LOWER('contato@zairagoncalves.com');

-- 2. Buscar na tabela teacher_students (alunos cadastrados por professores)
SELECT 'teacher_students' as tabela, id, email, name, teacher_id, created_at
FROM teacher_students
WHERE LOWER(email) = LOWER('contato@zairagoncalves.com');

-- 3. Buscar na tabela academies (academias)
SELECT 'academies' as tabela, id, email, name, franqueadora_id, is_active, created_at
FROM academies
WHERE LOWER(email) = LOWER('contato@zairagoncalves.com');

-- 4. Buscar na tabela franqueadora (franqueadora)
SELECT 'franqueadora' as tabela, id, email, name, is_active, created_at
FROM franqueadora
WHERE LOWER(email) = LOWER('contato@zairagoncalves.com');

-- 5. Buscar na tabela units (unidades)
SELECT 'units' as tabela, id, email, name, franchise_id, is_active, created_at
FROM units
WHERE LOWER(email) = LOWER('contato@zairagoncalves.com');

-- 6. Buscar na tabela franchises (franquias)
SELECT 'franchises' as tabela, id, email, name, is_active, created_at
FROM franchises
WHERE LOWER(email) = LOWER('contato@zairagoncalves.com');

-- 7. Buscar na tabela franqueadora_contacts (contatos da franqueadora - via user_id)
SELECT 'franqueadora_contacts' as tabela, fc.id, fc.user_id, fc.role, fc.status, u.email, u.name
FROM franqueadora_contacts fc
LEFT JOIN users u ON u.id = fc.user_id
WHERE LOWER(u.email) = LOWER('contato@zairagoncalves.com');
