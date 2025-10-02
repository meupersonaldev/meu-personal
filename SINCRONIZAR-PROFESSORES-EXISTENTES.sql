-- Script para sincronizar professores existentes com academy_teachers
-- Execute este script UMA VEZ para criar os vínculos dos professores que já selecionaram academias

-- Criar vínculos para todos os professores que têm academias em teacher_preferences
-- mas não têm vínculo em academy_teachers

DO $$
DECLARE
  pref RECORD;
  academy_id_item UUID;
BEGIN
  -- Para cada professor com preferências
  FOR pref IN 
    SELECT teacher_id, academy_ids 
    FROM teacher_preferences 
    WHERE academy_ids IS NOT NULL AND array_length(academy_ids, 1) > 0
  LOOP
    -- Para cada academia selecionada
    FOREACH academy_id_item IN ARRAY pref.academy_ids
    LOOP
      -- Verificar se já existe vínculo
      IF NOT EXISTS (
        SELECT 1 FROM academy_teachers 
        WHERE teacher_id = pref.teacher_id 
        AND academy_id = academy_id_item
      ) THEN
        -- Criar vínculo
        INSERT INTO academy_teachers (
          teacher_id,
          academy_id,
          status,
          commission_rate,
          created_at,
          updated_at
        ) VALUES (
          pref.teacher_id,
          academy_id_item,
          'active',
          70.00,
          NOW(),
          NOW()
        );
        
        RAISE NOTICE 'Vínculo criado: professor % → academia %', pref.teacher_id, academy_id_item;
      ELSE
        -- Reativar se estiver inativo
        UPDATE academy_teachers
        SET status = 'active', updated_at = NOW()
        WHERE teacher_id = pref.teacher_id 
        AND academy_id = academy_id_item
        AND status != 'active';
        
        RAISE NOTICE 'Vínculo reativado: professor % → academia %', pref.teacher_id, academy_id_item;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Verificar resultado
SELECT 
  at.id,
  u.name as professor,
  u.email,
  a.name as academia,
  at.status,
  at.commission_rate,
  at.created_at
FROM academy_teachers at
LEFT JOIN users u ON at.teacher_id = u.id
LEFT JOIN academies a ON at.academy_id = a.id
WHERE at.academy_id = '51716624-427f-42e9-8e85-12f9a3af8822'
ORDER BY at.created_at DESC;
