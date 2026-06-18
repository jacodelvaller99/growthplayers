-- ─────────────────────────────────────────────────────────────────────────────
-- DB Hardening P1 — fixes verificados por auditoría técnica (loop iteración 1).
--
-- Cada fix tiene EVIDENCIA en el código + RAZÓN + IMPACTO. No se aplica nada
-- "por estilo": solo lo que mueve la aguja en seguridad real o en performance
-- medible. Idempotente; aplicar vía SQL Editor del dashboard.
--
-- Cubre:
--   1. P0 search_mentor_memories — bypass de RLS por SECURITY DEFINER sin
--      validar p_user_id == auth.uid().
--   2. P1 auth.uid() per-row — Supabase oficial recomienda envolver en
--      (SELECT auth.uid()) para cachear por query en tablas grandes.
--   3. P1 FK sin índice cubrente — CASCADE en delete-account ejecuta seq scan.
--   4. P1 user_events sin índice (user_id, created_at) — admin lee por usuario
--      y rango temporal en cada dossier.
--   5. P1 wearable_timeseries sin índice cubrente — el constraint UNIQUE no
--      acelera SELECT por (user_id, metric, recorded_at).
-- ─────────────────────────────────────────────────────────────────────────────

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1. P0 — search_mentor_memories: validar p_user_id == auth.uid()           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Evidencia: la función es SECURITY DEFINER (bypassea RLS) y solo filtra por
-- WHERE m.user_id = p_user_id. Cualquier authenticated user puede invocarla con
-- un UUID ajeno y leer memorias de otro. El hardening previo (P1) solo revocó
-- EXECUTE de anon, no de authenticated.
-- Fix: chequeo defensivo dentro del cuerpo + fallback a auth.uid() si NULL.

CREATE OR REPLACE FUNCTION public.search_mentor_memories(
  p_user_id    uuid,
  p_embedding  vector(1536),
  p_limit      integer DEFAULT 5
)
RETURNS TABLE (
  id           uuid,
  content      text,
  memory_type  text,
  importance   integer,
  created_at   timestamptz,
  similarity   float
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  effective_user_id uuid;
BEGIN
  -- Si el caller es service_role (edge function), confía en p_user_id.
  -- Si es authenticated, fuerza p_user_id == auth.uid() (no hay forma de
  -- consultar memorias de otro). Si no hay auth, niega.
  IF current_user = 'service_role' THEN
    effective_user_id := p_user_id;
  ELSIF current_user = 'authenticated' AND auth.uid() IS NOT NULL THEN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'No autorizado: search_mentor_memories solo permite consultar tus propias memorias'
        USING ERRCODE = '42501';
    END IF;
    effective_user_id := auth.uid();
  ELSE
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    m.created_at,
    1 - (m.embedding <=> p_embedding) AS similarity
  FROM mentor_memories m
  WHERE m.user_id = effective_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$;

-- Reaseguro: solo authenticated + service_role pueden ejecutar.
DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.search_mentor_memories(uuid, vector, integer) FROM PUBLIC, anon';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2. P1 — auth.uid() per-row → (SELECT auth.uid()) por query                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Patrón oficial Supabase (docs.supabase.com/guides/database/postgres/row-level-security#call-functions-with-select):
-- envolver `auth.uid()` en `(SELECT auth.uid())` permite a Postgres evaluar la
-- función una sola vez por query, no por fila. Crítico en tablas grandes:
-- daily_checkins, mentor_messages, user_events, wearable_daily, lesson_tasks.
-- Aplicamos DROP + CREATE en las policies más calientes.

-- 2.a daily_checkins
DROP POLICY IF EXISTS "Users read own checkins"   ON public.daily_checkins;
DROP POLICY IF EXISTS "Users insert own checkins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users update own checkins" ON public.daily_checkins;
CREATE POLICY "Users read own checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own checkins" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own checkins" ON public.daily_checkins
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
                              WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2.b mentor_messages
DROP POLICY IF EXISTS "Users read own messages"   ON public.mentor_messages;
DROP POLICY IF EXISTS "Users insert own messages" ON public.mentor_messages;
CREATE POLICY "Users read own messages" ON public.mentor_messages
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own messages" ON public.mentor_messages
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2.c user_intelligence (también P0-lite: agrego TO authenticated)
DROP POLICY IF EXISTS "own_intelligence_select" ON public.user_intelligence;
CREATE POLICY "own_intelligence_select" ON public.user_intelligence
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 2.d wearable_daily / wearable_connections — la policy admin tenía subquery
--     sin cachear y sin TO clause. Mantengo OR auth.uid() = user_id para owner.
DROP POLICY IF EXISTS "own_wearable_connections" ON public.wearable_connections;
DROP POLICY IF EXISTS "own_daily_data"           ON public.wearable_daily;
DROP POLICY IF EXISTS "own_timeseries"           ON public.wearable_timeseries;
DROP POLICY IF EXISTS "admin_wearable_daily"        ON public.wearable_daily;
DROP POLICY IF EXISTS "admin_wearable_connections"  ON public.wearable_connections;

CREATE POLICY "own_wearable_connections" ON public.wearable_connections
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id)
                           WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own_daily_data" ON public.wearable_daily
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id)
                           WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "own_timeseries" ON public.wearable_timeseries
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id)
                           WITH CHECK ((SELECT auth.uid()) = user_id);
-- Admin tiene una sub-policy aparte (SELECT only) con cache del flag is_admin.
CREATE POLICY "admin_wearable_daily" ON public.wearable_daily
  FOR SELECT TO authenticated USING (
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1)
  );
CREATE POLICY "admin_wearable_connections" ON public.wearable_connections
  FOR SELECT TO authenticated USING (
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1)
  );

-- 2.e user_events (admin dossier lee por user_id + rango temporal)
DROP POLICY IF EXISTS "admin_read_all_events" ON public.user_events;
CREATE POLICY "admin_read_all_events" ON public.user_events
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) = user_id OR
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1)
  );

-- 2.f admin_audit_log (mismo patrón cacheado)
DROP POLICY IF EXISTS "admin_only_audit" ON public.admin_audit_log;
CREATE POLICY "admin_only_audit" ON public.admin_audit_log
  FOR ALL TO authenticated USING (
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1)
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3. P1 — FK sin índice cubrente: DELETE ON CASCADE hace seq scan          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Evidencia: el delete-account de Polaris purga decenas de tablas en cascada.
-- Sin índice en la columna FK, cada CASCADE recorre la tabla entera. Con miles
-- de usuarios es la diferencia entre 1s y 60s.

-- habits: el índice existente es PARCIAL (WHERE is_active=true) → no cubre
-- CASCADE en filas inactivas.
CREATE INDEX IF NOT EXISTS idx_habits_user_fk ON public.habits(user_id);

-- community_posts: tenía índice por created_at, NO por user_id.
CREATE INDEX IF NOT EXISTS idx_community_posts_user_fk ON public.community_posts(user_id);

-- community_reactions: solo tenía UNIQUE (post_id, user_id). Para CASCADE delete
-- por user_id necesitamos índice cabezera user_id (también acelera "mis likes").
CREATE INDEX IF NOT EXISTS idx_community_reactions_user_fk ON public.community_reactions(user_id);

-- access_codes: redeem_access_code filtra por expires_at < now().
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at
  ON public.access_codes(expires_at) WHERE expires_at IS NOT NULL;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 4. P1 — user_events sin índice de admin (user_id + created_at)           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Evidencia: app/admin/usuarios/[id].tsx consulta últimos N events por usuario.
-- El índice (event_type, created_at) existente no ayuda a este query.
CREATE INDEX IF NOT EXISTS idx_events_user_created
  ON public.user_events(user_id, created_at DESC);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 5. P1 — wearable_timeseries sin índice cubrente                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Evidencia: useWearableTimeseries(metric, hours) filtra por metric +
-- recorded_at. La UNIQUE(user_id, provider, metric, recorded_at) cubre el
-- INSERT pero el SELECT por (user_id, metric, recorded_at) sin provider escala
-- mal al crecer. Índice dedicado de SELECT:
CREATE INDEX IF NOT EXISTS idx_wearable_ts_query
  ON public.wearable_timeseries(user_id, metric, recorded_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notas operativas:
-- · Estos cambios son no-disruptivos: DROP+CREATE de policy es atómico dentro
--   de la transacción del editor SQL. Las queries existentes siguen funcionando
--   sin cambios — solo mejora la performance y cierra el bypass de
--   search_mentor_memories.
-- · Tras aplicar, recomendable correr: VACUUM ANALYZE en las tablas tocadas
--   para que el planner use los nuevos índices.
-- · El handoff anterior (eas init / ai-proxy secrets) sigue abierto — esta
--   migración NO depende de él.
-- ─────────────────────────────────────────────────────────────────────────────
