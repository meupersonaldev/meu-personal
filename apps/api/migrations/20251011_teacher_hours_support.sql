-- Funções utilitárias para o banco de horas dos professores
BEGIN;

CREATE OR REPLACE FUNCTION public.add_teacher_hours(
  p_teacher_id uuid,
  p_hours_amount integer,
  p_franqueadora_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_franqueadora_id uuid;
BEGIN
  IF p_teacher_id IS NULL THEN
    RAISE EXCEPTION 'teacher_id é obrigatório';
  END IF;

  IF p_hours_amount IS NULL OR p_hours_amount <= 0 THEN
    RAISE EXCEPTION 'hours_amount deve ser maior que zero';
  END IF;

  v_franqueadora_id := p_franqueadora_id;

  IF v_franqueadora_id IS NULL THEN
    SELECT franqueadora_id
      INTO v_franqueadora_id
      FROM public.prof_hour_balance
     WHERE professor_id = p_teacher_id
     ORDER BY updated_at DESC
     LIMIT 1;
  END IF;

  IF v_franqueadora_id IS NULL THEN
    SELECT id
      INTO v_franqueadora_id
      FROM public.franqueadora
     WHERE is_active = true
     ORDER BY created_at
     LIMIT 1;
  END IF;

  IF v_franqueadora_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível determinar franqueadora padrão para o professor %', p_teacher_id;
  END IF;

  INSERT INTO public.prof_hour_balance (professor_id, franqueadora_id, unit_id, available_hours, locked_hours, updated_at)
  VALUES (p_teacher_id, v_franqueadora_id, NULL, p_hours_amount, 0, NOW())
  ON CONFLICT (professor_id, franqueadora_id) DO UPDATE
    SET available_hours = public.prof_hour_balance.available_hours + EXCLUDED.available_hours,
        updated_at = NOW();

  INSERT INTO public.hour_tx (professor_id, unit_id, type, source, hours, booking_id, meta_json)
  VALUES (
    p_teacher_id,
    NULL,
    'PURCHASE',
    'PROFESSOR',
    p_hours_amount,
    NULL,
    jsonb_build_object('franqueadora_id', v_franqueadora_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_teacher_hours(uuid, integer, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.add_teacher_hours(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_teacher_hours(uuid, integer, uuid) TO service_role;

COMMIT;
