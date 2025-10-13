# Atualização do enum `booking_status_enum`

Para permitir que o professor crie horários livres, precisamos adicionar o valor `AVAILABLE` ao enum `booking_status_enum` no banco do Supabase/Postgres.

## Passos

1. Abra um shell conectado ao banco (Supabase SQL editor, psql ou Supabase CLI).
2. Execute a instrução abaixo **uma vez**:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'AVAILABLE'
      AND enumtypid = 'booking_status_enum'::regtype
  ) THEN
    ALTER TYPE booking_status_enum ADD VALUE 'AVAILABLE';
  END IF;
END
$$;
```

A instrução usa um bloco `DO` para evitar erro caso o valor já exista.

3. Verifique que o novo valor funciona executando, por exemplo:

```sql
SELECT unnest(enum_range(NULL::booking_status_enum));
```

Após essa alteração, o endpoint `POST /api/bookings` consegue gravar horários com `status_canonical = 'AVAILABLE'`.
