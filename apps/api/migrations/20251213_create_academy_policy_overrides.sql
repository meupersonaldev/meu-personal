-- Tabela para armazenar overrides de políticas por academia
-- Permite que cada unidade tenha valores diferentes da política padrão da franqueadora

CREATE TABLE IF NOT EXISTS public.academy_policy_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT academy_policy_overrides_academy_unique UNIQUE (academy_id)
);

-- Índice para busca por academia
CREATE INDEX IF NOT EXISTS idx_academy_policy_overrides_academy ON public.academy_policy_overrides(academy_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER trg_academy_policy_overrides_updated_at
  BEFORE UPDATE ON public.academy_policy_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.academy_policy_overrides IS 'Overrides de políticas por academia - permite valores diferentes da política padrão da franqueadora';
COMMENT ON COLUMN public.academy_policy_overrides.overrides IS 'JSON com campos sobrescritos (ex: {"credits_per_class": 2, "class_duration_minutes": 45})';
