-- Query para debugar professores vinculados

-- 1. Ver TODOS os registros de academy_teachers (independente do status)
SELECT 
  at.id,
  at.teacher_id,
  at.academy_id,
  at.status,
  at.commission_rate,
  at.created_at,
  u.name as teacher_name,
  u.email as teacher_email,
  a.name as academy_name
FROM academy_teachers at
LEFT JOIN users u ON at.teacher_id = u.id
LEFT JOIN academies a ON at.academy_id = a.id
WHERE at.academy_id = '51716624-427f-42e9-8e85-12f9a3af8822'
ORDER BY at.created_at DESC;

-- 2. Ver se o professor existe na tabela users
SELECT 
  id,
  name,
  email,
  role,
  is_active,
  created_at
FROM users
WHERE role = 'TEACHER'
ORDER BY created_at DESC;

-- 3. Ver se existe teacher_profiles
SELECT 
  tp.id,
  tp.user_id,
  tp.bio,
  tp.specialties,
  u.name,
  u.email
FROM teacher_profiles tp
LEFT JOIN users u ON tp.user_id = u.id
ORDER BY tp.created_at DESC;

-- 4. Ver teacher_preferences (academias selecionadas)
SELECT 
  tp.teacher_id,
  tp.academy_ids,
  u.name,
  u.email
FROM teacher_preferences tp
LEFT JOIN users u ON tp.teacher_id = u.id;
