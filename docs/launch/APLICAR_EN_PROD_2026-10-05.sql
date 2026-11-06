-- ═══════════════════════════════════════════════════════════════════════════
-- APLICAR EN PRODUCCIÓN (bizbbtiyftfjufxinwsu) — 2026-10-05
-- ═══════════════════════════════════════════════════════════════════════════
-- Pegar COMPLETO en Supabase → SQL Editor → Run. El editor lo corre como una sola
-- transacción: si cualquier sentencia falla, NO se aplica nada.
-- Todo es aditivo e idempotente (se puede correr dos veces sin daño).
--
-- Por qué cada bloque (evidencia del 2026-10-05, sondeando prod):
--   · fix_outbox: POST mentor_messages?on_conflict=user_id,client_id → 400 en cada
--     mensaje — los chats con Norman no se guardan en el servidor.
--   · auraos (parcial): faltan b2b_organizations / org_members (delete-account los
--     borra) y user_profiles.total_wellness_minutes.
--   · access_code_rpcs: falta access_code_uses.redeemed_at → migración sin aplicar.
--   · hero_umbral: falta user_profiles.role (el rol del onboarding se pierde).
--   · wellness outbox: falta wellness_sessions.client_id.
--   · body_zones / body_points: faltan en daily_checkins → el mapa corporal del
--     check-in no se guarda.
--   · circuit breaker: faltan provider_user_id / consecutive_failures → sync-wearables
--     no puede marcar conexiones caducadas ni deregistrar Polar.
--   · email backfill: pendiente según MASTER_CONTEXT.
-- ═══════════════════════════════════════════════════════════════════════════


-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20261005000000_fix_outbox_unique_indexes.sql
-- └─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Outbox: índices únicos NO parciales para que ON CONFLICT funcione
-- ═══════════════════════════════════════════════════════════════════════════
--
-- BUG (visto en prod 2026-10-05): cada POST
--   /rest/v1/mentor_messages?on_conflict=user_id,client_id  → 400
-- 20260618100000_client_id_outbox.sql creó índices únicos PARCIALES
-- (WHERE client_id IS NOT NULL). Postgres solo infiere un índice parcial para
-- ON CONFLICT si la sentencia repite el predicado, y PostgREST no puede
-- (on_conflict=user_id,client_id no lleva WHERE) → 42P10 "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification".
-- persistMentorMessages (hooks/use-lifeflow.tsx) no lo reconoce como "columna
-- faltante", así que encola en el outbox, que reintenta el mismo upsert y vuelve
-- a fallar para siempre: los mensajes con Norman NO se guardan en el servidor.
--
-- FIX: índice único completo. Es equivalente para los datos — en un índice
-- único los NULL nunca chocan entre sí, así que las filas históricas con
-- client_id NULL siguen permitidas igual que con el parcial. Mismo patrón que
-- 20260803000000_wellness_sessions_client_id_outbox.sql, que ya lo hacía bien.
--
-- Seguro de crear: el índice parcial ya garantizaba unicidad en todas las
-- filas con client_id no nulo, y las NULL no cuentan → no hay duplicados que
-- hagan fallar el CREATE.
--
-- Idempotente. Se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.mentor_messages     add column if not exists client_id text;
alter table public.mentorship_sessions add column if not exists client_id text;

drop index if exists public.mentor_messages_user_client_id;
create unique index mentor_messages_user_client_id
  on public.mentor_messages (user_id, client_id);

drop index if exists public.mentorship_sessions_user_client_id;
create unique index mentorship_sessions_user_client_id
  on public.mentorship_sessions (user_id, client_id);

-- ── Verificación ───────────────────────────────────────────────────────────
--   select indexname, indexdef from pg_indexes
--    where indexname in ('mentor_messages_user_client_id','mentorship_sessions_user_client_id');
--   -- 2 filas, ninguna con "WHERE".

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260501000000_auraos_extensions.sql — SOLO las piezas que faltan (el archivo completo re-impondría un CHECK de tipos de bienestar más estrecho que el actual)
-- └─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_wellness_minutes integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS b2b_organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  admin_user_id uuid REFERENCES auth.users(id),
  plan          text DEFAULT 'enterprise',
  seats         integer DEFAULT 10,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id  uuid NOT NULL REFERENCES b2b_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text DEFAULT 'member',
  UNIQUE(org_id, user_id)
);

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260509100000_access_code_rpcs.sql (versión vigente de redeem_access_code / admin_create_access_code)
-- └─────────────────────────────────────────────────────────────────────────
-- ============================================================
-- Migration: access_code_rpcs
-- Date: 2026-05-09
-- Description:
--   1. Ensure access_codes.uses_count column exists
--   2. Create redeem_access_code() RPC (atomic validation + increment)
--   3. Create admin_create_access_code() RPC (admin-only insert)
--   4. Ensure admin_audit_log table exists
--   5. Ensure access_code_uses.redeemed_at column name is consistent
-- ============================================================

-- 1. Add uses_count if missing (idempotent)
ALTER TABLE public.access_codes
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0;

-- 2. redeem_access_code RPC
-- Returns: 'ok' | 'invalid' | 'exhausted' | 'expired' | 'inactive'
-- Atomic: uses UPDATE with equality guard to prevent concurrent double-spend
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.access_codes%ROWTYPE;
  v_updated integer;
BEGIN
  -- Fetch code
  SELECT * INTO v_row
  FROM public.access_codes
  WHERE code = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN 'invalid';
  END IF;

  -- Validate state
  IF NOT v_row.is_active THEN
    RETURN 'inactive';
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN 'expired';
  END IF;

  IF v_row.uses_count >= v_row.max_uses THEN
    RETURN 'exhausted';
  END IF;

  -- Atomic increment with concurrency guard
  UPDATE public.access_codes
  SET    uses_count = uses_count + 1
  WHERE  id         = v_row.id
    AND  uses_count = v_row.uses_count;   -- prevents double-spend

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN 'exhausted';  -- lost the race
  END IF;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO anon, authenticated;

-- 3. admin_create_access_code RPC
CREATE OR REPLACE FUNCTION public.admin_create_access_code(
  p_admin_id   uuid,
  p_code       text,
  p_type       text,
  p_max_uses   integer DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes      text DEFAULT NULL,
  p_label      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_new_id   uuid;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_admin_id;

  IF NOT FOUND OR NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Access denied: caller is not an admin';
  END IF;

  INSERT INTO public.access_codes (
    code, type, max_uses, uses_count, is_active,
    expires_at, notes, label, created_by
  ) VALUES (
    upper(trim(p_code)), p_type, p_max_uses, 0, true,
    p_expires_at, p_notes, p_label, p_admin_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_access_code(uuid, text, text, integer, timestamptz, text, text) TO authenticated;

-- 4. admin_audit_log table (idempotent)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_audit" ON public.admin_audit_log;
CREATE POLICY "admin_all_audit"
  ON public.admin_audit_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 5. Normalize access_code_uses timestamp column (support both names)
ALTER TABLE public.access_code_uses
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz NOT NULL DEFAULT now();

-- Back-fill used_at → redeemed_at if old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_code_uses' AND column_name = 'used_at'
  ) THEN
    UPDATE public.access_code_uses
    SET redeemed_at = used_at
    WHERE redeemed_at = now() AND used_at IS NOT NULL;
  END IF;
END $$;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_access_code_uses_code_id ON public.access_code_uses(code_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260801000000_hero_umbral.sql
-- └─────────────────────────────────────────────────────────────────────────
-- ─── El Umbral — el camino del héroe empieza donde empieza la persona ────────
--
-- Dos arreglos de captura del punto de partida:
--
-- (1) `user_profiles.role` — el onboarding SIEMPRE preguntó el rol y SIEMPRE
--     lo descartó: `completeOnboarding` no lo incluía en el upsert y
--     `mapFromSupabase` lo rellenaba con el default ('Empresario' hasta hoy),
--     así que lo tecleado se perdía en el primer refresh. Con la columna, el
--     dato del usuario por fin sobrevive.
--
-- (2) La historia de origen se siembra desde el cliente en tablas que YA
--     existen (`user_memory_profile.transformation_goal` — columna presente
--     desde 20260615000000 y sin ningún escritor hasta ahora — y
--     `memory_summaries` con source_type 'manual', presente en el CHECK y
--     también sin escritor). No requieren cambios de esquema: esta migración
--     solo documenta que dejan de ser columnas fantasma.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

alter table public.user_profiles
  add column if not exists role text;

comment on column public.user_profiles.role is
  'Rol declarado en el onboarding (ej. "Fundador", "CEO"). Capturado desde 2026-08 — antes se preguntaba y se descartaba.';

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260803000000_wellness_sessions_client_id_outbox.sql
-- └─────────────────────────────────────────────────────────────────────────
-- Outbox idempotente para wellness_sessions — mismo patrón que mentor_messages
-- (20260618100000 + el fix de 20260702000100).
--
-- `saveWellnessSession` (hooks/use-lifeflow.tsx) hace un `insert` NO idempotente
-- envuelto en try/catch silencioso: si falla (sin red, token expirado), la
-- práctica completada en la UI nunca llega al servidor y no hay reintento — el
-- mismo bug que ya se cerró para los mensajes de Norman, sin cerrar aquí.
--
-- Índice FULL, no parcial: la migración original de mentor_messages usaba
-- `WHERE client_id IS NOT NULL` y PostgREST no la aceptaba como árbitro de
-- `ON CONFLICT` (ver 20260702000100). Postgres ya trata cada NULL como distinto
-- en un índice único normal, así que un índice completo cubre ambos casos
-- (filas históricas sin client_id + outbox nuevo) sin repetir ese error.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

alter table public.wellness_sessions
  add column if not exists client_id text;

create unique index if not exists wellness_sessions_user_client_id
  on public.wellness_sessions (user_id, client_id);

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260804000000_checkin_body_zones.sql
-- └─────────────────────────────────────────────────────────────────────────
-- daily_checkins.zones — dónde lo siente, no solo cuánto.
--
-- Los cuatro deslizadores del check-in (energía, claridad, tensión, sueño) dan
-- la MAGNITUD y ocultan el LUGAR. "Tensión 8" no distingue una mandíbula
-- apretada de un estómago cerrado, y se regulan distinto.
--
-- Hasta esta migración el mapa corporal capturaba las zonas en la pantalla y
-- las tiraba: no llegaban a Supabase, así que Norman no podía verlas
-- (`lib/mentor.ts` solo mira stress/energy/sleep), el coach no las veía en el
-- dossier, y se perdían al reinstalar. Un gesto sin consecuencia es una demo.
--
-- Con la columna, el patrón se vuelve confrontable con dato — que es la
-- mecánica central que declara PRODUCT.md: "cuarta vez esta semana en la
-- mandíbula" en vez de "tu tensión sigue alta".
--
-- `text[]` y no una tabla aparte: son como mucho 7 valores de un enum cerrado
-- (`BODY_ZONES` en lib/bodyMapLogic.ts), siempre se leen junto al check-in y
-- nunca se consultan por sí solos. Una tabla hija sería un join sin ninguna
-- pregunta que lo justifique.
--
-- Nullable a propósito: señalar es opcional, y NULL ("no quiso decir") es
-- información distinta de '{}' ("miró y no marcó nada").
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

alter table public.daily_checkins
  add column if not exists zones text[];

comment on column public.daily_checkins.zones is
  'Zonas del cuerpo donde el usuario ubicó la sensación (BODY_ZONES en lib/bodyMapLogic.ts). NULL = no señaló; array vacío = miró y no marcó.';

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260810000000_checkin_body_points.sql
-- └─────────────────────────────────────────────────────────────────────────
-- Coordenadas precisas sobre el cuerpo frontal del check-in.
--
-- `zones` conserva el resumen semántico para recomendaciones y patrones.
-- `body_points` guarda hasta seis toques normalizados (0..1), con región y
-- lado, para rehidratar exactamente los marcadores en cualquier pantalla.
-- No es diagnóstico ni historia clínica: es la ubicación declarada por la
-- persona dentro del mismo registro voluntario del check-in.

alter table public.daily_checkins
  add column if not exists body_points jsonb;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_body_points_array;

alter table public.daily_checkins
  add constraint daily_checkins_body_points_array
  check (
    body_points is null
    or (jsonb_typeof(body_points) = 'array' and jsonb_array_length(body_points) <= 6)
  );

comment on column public.daily_checkins.body_points is
  'Hasta 6 puntos normalizados sobre el escaneo frontal: x, y, region, side y zone. NULL = no señaló un punto exacto.';

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260831000000_wearable_circuit_breaker.sql
-- └─────────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Circuit breaker de wearables + provider_user_id (desconexión real)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA 1 (bucle infinito de reintentos): un token revocado upstream se
--   reintentaba cada 2h por el cron para siempre — cada fallo era solo un
--   console.error. La conexión nunca se marcaba muerta ni el usuario se
--   enteraba. Nuevas columnas:
--     · consecutive_failures — contador; a las 5 la conexión se desactiva.
--     · last_error           — el motivo, visible en la UI ("CONEXIÓN
--                              CADUCADA — vuelve a conectar").
--   Un refresh con invalid_grant/400/401 mata la conexión de inmediato
--   (token revocado = no hay reintento que lo arregle).
--
-- PROBLEMA 2 (Polar no se podía deregistrar): el DELETE de AccessLink exige
--   el id NUMÉRICO de Polar (x_user_id del token exchange), que no se
--   guardaba. provider_user_id lo almacena en el connect para que la
--   desconexión pueda deregistrar upstream.
--
-- GRANTS: P1-7 (20260729000000) revocó el privilegio de tabla y re-otorgó
--   columna a columna, así que las columnas NUEVAS nacen sin grant para
--   `authenticated`. Solo last_error se expone al cliente (la UI lo lee);
--   provider_user_id y consecutive_failures quedan server-side como los
--   tokens.
--
-- Idempotente. Se puede correr varias veces.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.wearable_connections
  add column if not exists provider_user_id     text,
  add column if not exists last_error           text,
  add column if not exists consecutive_failures integer not null default 0;

-- Solo lectura de last_error para el cliente (patrón P1-7: grant por columna).
grant select (last_error) on public.wearable_connections to authenticated;

-- ── Verificación ───────────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'wearable_connections'
--      and column_name in ('provider_user_id','last_error','consecutive_failures');
--   -- debe devolver 3 filas.

-- ┌─────────────────────────────────────────────────────────────────────────
-- │ 20260907000000_user_profiles_email_backfill.sql
-- └─────────────────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════════════
-- Backfill de user_profiles.email
--
-- La columna existe desde el esquema inicial, pero solo la escribían dos
-- caminos: la edge function `create-user` (alta por admin) y
-- `clickup-onboarding` (alta automática al firmar). Quien se registraba solo
-- desde la app dejaba la columna NULL.
--
-- Consecuencias que esto cierra:
--   · el panel de admin mostraba email vacío para esos clientes,
--   · su búsqueda por email nunca podía encontrarlos,
--   · el admin no podía dispararles un enlace de recuperación de contraseña.
--
-- De aquí en adelante el email se escribe al completar el onboarding
-- (hooks/use-lifeflow.tsx, completeOnboarding). Esta migración solo cubre a
-- los usuarios que ya existían.
--
-- Idempotente: solo toca filas sin email. Se puede correr varias veces.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.user_profiles up
SET    email = au.email
FROM   auth.users au
WHERE  au.id = up.user_id
  AND  au.email IS NOT NULL
  AND  (up.email IS NULL OR btrim(up.email) = '');

-- Verificación: debe devolver 0 filas pendientes con email en auth.
-- SELECT count(*) FROM public.user_profiles up
--   JOIN auth.users au ON au.id = up.user_id
--   WHERE au.email IS NOT NULL AND (up.email IS NULL OR btrim(up.email) = '');
