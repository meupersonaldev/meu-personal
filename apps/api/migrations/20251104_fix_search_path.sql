-- Ajustar search_path de todas as funções do schema public (transição segura)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema,
           p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public', r.schema, r.name, r.args);
  END LOOP;
END $$;
