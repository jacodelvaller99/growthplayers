-- ─── Tabla de códigos de acceso ────────────────────────────────────────────────
-- Controla quién puede registrarse en la app.
-- Cada código puede ser de un solo uso (max_uses = 1) o multi-uso (max_uses > 1).

CREATE TABLE IF NOT EXISTS public.access_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  label       text,                          -- descripción interna, ej: "Cliente Juan Pérez"
  max_uses    int  NOT NULL DEFAULT 1,        -- 1 = un solo uso, -1 = ilimitado
  uses_count  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz                    -- null = sin vencimiento
);

-- Índice para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes (code);

-- RLS: solo el admin puede leer/escribir directamente
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- La validación se hace vía función de servidor (sin exponer la tabla al cliente)
CREATE POLICY "No direct client access"
  ON public.access_codes FOR ALL USING (false);

-- ─── Función de validación y consumo ──────────────────────────────────────────
-- Verifica el código y lo marca como usado en una sola transacción atómica.
-- Retorna: 'ok' | 'invalid' | 'exhausted' | 'expired' | 'inactive'
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.access_codes%ROWTYPE;
BEGIN
  -- Buscar código (case-insensitive)
  SELECT * INTO v_row
  FROM public.access_codes
  WHERE upper(code) = upper(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  IF NOT v_row.is_active THEN
    RETURN 'inactive';
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN 'expired';
  END IF;

  IF v_row.max_uses <> -1 AND v_row.uses_count >= v_row.max_uses THEN
    RETURN 'exhausted';
  END IF;

  -- Consumir el código
  UPDATE public.access_codes
  SET uses_count = uses_count + 1
  WHERE id = v_row.id;

  RETURN 'ok';
END;
$$;

-- ─── Códigos iniciales ─────────────────────────────────────────────────────────
-- Tus primeros 10 códigos de acceso (uso único cada uno)
INSERT INTO public.access_codes (code, label, max_uses) VALUES
  ('POLARIS-ADMIN',   'Acceso admin — Jaco',        -1),  -- ilimitado (tu cuenta)
  ('POLARIS-2026-A1', 'Cliente piloto 1',             1),
  ('POLARIS-2026-A2', 'Cliente piloto 2',             1),
  ('POLARIS-2026-A3', 'Cliente piloto 3',             1),
  ('POLARIS-2026-A4', 'Cliente piloto 4',             1),
  ('POLARIS-2026-A5', 'Cliente piloto 5',             1),
  ('POLARIS-2026-B1', 'Cliente batch 2 — slot 1',     1),
  ('POLARIS-2026-B2', 'Cliente batch 2 — slot 2',     1),
  ('POLARIS-2026-B3', 'Cliente batch 2 — slot 3',     1),
  ('POLARIS-2026-B4', 'Cliente batch 2 — slot 4',     1)
ON CONFLICT (code) DO NOTHING;
