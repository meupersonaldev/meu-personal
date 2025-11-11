-- Script para diagnosticar e corrigir vínculos de franqueadora
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se existe uma franqueadora
SELECT 
  id,
  name,
  email,
  created_at
FROM franqueadoras
ORDER BY created_at
LIMIT 5;

-- 2. Ver academias sem franqueadora_id
SELECT 
  id,
  name,
  city,
  state,
  franqueadora_id,
  is_active
FROM academies
WHERE is_active = true
ORDER BY name;

-- 3. Contar academias com e sem franqueadora
SELECT 
  CASE 
    WHEN franqueadora_id IS NULL THEN 'Sem Franqueadora'
    ELSE 'Com Franqueadora'
  END as status,
  COUNT(*) as total
FROM academies
WHERE is_active = true
GROUP BY status;

-- 4. CORREÇÃO: Atualizar todas as academias ativas para usar a franqueadora principal
-- ⚠️ IMPORTANTE: Substitua 'ID_DA_FRANQUEADORA_AQUI' pelo ID real da sua franqueadora
-- Você pode pegar o ID da query #1 acima

-- Exemplo:
-- UPDATE academies
-- SET franqueadora_id = '10000000-0000-0000-0000-000000000001'
-- WHERE is_active = true AND franqueadora_id IS NULL;

-- 5. Verificar resultado após a correção
-- SELECT 
--   id,
--   name,
--   franqueadora_id
-- FROM academies
-- WHERE is_active = true
-- ORDER BY name;
