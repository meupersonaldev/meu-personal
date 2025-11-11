-- Script automático para vincular todas as academias à franqueadora principal
-- Execute este script no Supabase SQL Editor

-- Passo 1: Criar a franqueadora principal se não existir
INSERT INTO franqueadoras (
  id,
  name,
  email,
  phone,
  cnpj,
  is_active
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Meu Personal - Franqueadora Principal',
  'contato@meupersonal.com.br',
  '11999999999',
  '00000000000000',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Passo 2: Atualizar TODAS as academias ativas para usar esta franqueadora
UPDATE academies
SET franqueadora_id = '10000000-0000-0000-0000-000000000001'
WHERE is_active = true;

-- Passo 3: Verificar resultado
SELECT 
  'Total de academias vinculadas' as info,
  COUNT(*) as total
FROM academies
WHERE is_active = true AND franqueadora_id IS NOT NULL;

-- Passo 4: Listar academias atualizadas
SELECT 
  id,
  name,
  city,
  state,
  franqueadora_id
FROM academies
WHERE is_active = true
ORDER BY name;
