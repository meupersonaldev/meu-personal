-- Habilitar RLS com políticas transitórias permissivas somente onde não houver políticas existentes
-- Objetivo: ligar RLS sem quebrar o app; políticas específicas serão endurecidas em migrações seguintes
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p') -- r: table, p: partitioned table
  LOOP
    -- Ligar RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);

    -- Criar políticas de transição apenas se não existir nenhuma política
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = r.relname
    ) THEN
      EXECUTE format('CREATE POLICY p_select_all ON public.%I FOR SELECT USING (true)', r.relname);
      EXECUTE format('CREATE POLICY p_insert_all ON public.%I FOR INSERT WITH CHECK (true)', r.relname);
      EXECUTE format('CREATE POLICY p_update_all ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', r.relname);
      EXECUTE format('CREATE POLICY p_delete_all ON public.%I FOR DELETE USING (true)', r.relname);
    END IF;
  END LOOP;
END $$ LANGUAGE plpgsql;

