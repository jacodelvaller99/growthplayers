-- ─────────────────────────────────────────────────────────────────────────────
-- Rango de mentor restringido — staff no-admin, scoped a sus propios clientes.
--
-- Hasta ahora "mentor" en el Focus Desk (20260821000000_mentor_assignments.sql)
-- era puramente organizativo: mentores = admins existentes, sin aislamiento de
-- datos (cualquier admin ve/edita cualquier cliente). Esto añade un rango DE
-- VERDAD — profiles.is_mentor, asignable solo por un admin, con RLS propia
-- restringida a los clientes que mentor_assignments le asigne.
--
-- Alcance deliberadamente contenido: SOLO las 8 tablas que tocan el Escritorio
-- (app/admin/index.tsx) y el Espacio del Mentor (app/admin/mentor/[id].tsx) —
-- mentor_tasks, mentor_client_scores, mentor_intervention_queue,
-- mentorship_sessions, mentorship_tasks, admin_briefings, memory_summaries,
-- user_memory_profile — más 3 policies additivas de solo-lectura/auditoría.
-- El dossier completo (check-ins, journal, wearables, biometría, etc.) NO se
-- toca: un mentor restringido no tiene acceso a esas pantallas, así que su RLS
-- no necesita saber nada de mentor_assignments.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (no hay service-role
-- local — ver CLAUDE.md).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Columna de rol ──────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mentor boolean NOT NULL DEFAULT false;

-- ── 2. Trigger anti-escalación: is_mentor se suma a las columnas protegidas ──
-- (20260602000000_security_hardening_p0.sql solo protegía is_admin y
-- subscription_tier — sin esto, cualquier usuario autenticado se auto-asigna
-- mentor con un UPDATE directo a su propia fila. CREATE OR REPLACE sobre la
-- función existente; el trigger que ya apunta a ella no necesita recrearse.)
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
      RAISE EXCEPTION 'No autorizado: is_admin no puede modificarse desde el cliente';
    END IF;
    IF (NEW.is_mentor IS DISTINCT FROM OLD.is_mentor) THEN
      RAISE EXCEPTION 'No autorizado: is_mentor no puede modificarse desde el cliente';
    END IF;
    IF (to_jsonb(NEW) ? 'subscription_tier')
       AND (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier) THEN
      RAISE EXCEPTION 'No autorizado: subscription_tier no puede modificarse desde el cliente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. admin_set_user_role: 5to rol 'mentor' (gate = caller_admin, como premium/inicial) ──
-- Normaliza is_mentor EXPLÍCITO en las 5 ramas — elegir cualquier rol
-- determina el resultado completo, sin flags colgantes de una promoción
-- anterior (20260624000000_user_roles_panel.sql es la versión base).
CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_super boolean;
  caller_admin boolean;
BEGIN
  SELECT COALESCE(is_superadmin, false), COALESCE(is_admin, false)
    INTO caller_super, caller_admin
    FROM public.profiles WHERE id = caller;

  IF target_user = caller THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol';
  END IF;

  IF new_role IN ('admin', 'superadmin') THEN
    IF NOT COALESCE(caller_super, false) THEN
      RAISE EXCEPTION 'Solo un SuperAdmin puede asignar roles de administrador';
    END IF;
  ELSIF new_role IN ('mentor', 'premium', 'inicial') THEN
    IF NOT COALESCE(caller_admin, false) THEN
      RAISE EXCEPTION 'Requiere acceso de administrador';
    END IF;
  ELSE
    RAISE EXCEPTION 'Rol inválido: %', new_role;
  END IF;

  IF new_role = 'superadmin' THEN
    UPDATE public.profiles SET is_admin = true, is_superadmin = true, is_mentor = false WHERE id = target_user;
  ELSIF new_role = 'admin' THEN
    UPDATE public.profiles SET is_admin = true, is_superadmin = false, is_mentor = false WHERE id = target_user;
  ELSIF new_role = 'mentor' THEN
    UPDATE public.profiles SET is_admin = false, is_superadmin = false, is_mentor = true WHERE id = target_user;
  ELSIF new_role = 'premium' THEN
    UPDATE public.profiles SET is_admin = false, is_superadmin = false, is_mentor = false, subscription_tier = 'premium', updated_at = now() WHERE id = target_user;
    UPDATE public.user_profiles SET subscription_tier = 'premium', updated_at = now() WHERE user_id = target_user;
    UPDATE public.user_memberships SET status = 'superseded' WHERE user_id = target_user AND status = 'active';
    INSERT INTO public.user_memberships (user_id, product, status, activated_by, activated_at, created_by)
      VALUES (target_user, 'premium', 'active', 'role_panel', now(), caller);
  ELSIF new_role = 'inicial' THEN
    UPDATE public.profiles SET is_admin = false, is_superadmin = false, is_mentor = false, subscription_tier = 'free', updated_at = now() WHERE id = target_user;
    UPDATE public.user_profiles SET subscription_tier = 'free', updated_at = now() WHERE user_id = target_user;
    UPDATE public.user_memberships SET status = 'cancelled' WHERE user_id = target_user AND status = 'active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- ── 4. Helper RLS — ¿soy mentor asignado de este cliente? (mismo patrón que is_current_user_admin) ──
CREATE OR REPLACE FUNCTION public.is_mentor_of(target_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE user_id = target_user AND mentor_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_mentor_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mentor_of(uuid) TO authenticated;

-- ── 5. Extender las 8 policies FOR ALL — sumar OR is_mentor_of(user_id) ──────
-- mentor_tasks (20260616000000_mentor_execution.sql)
DROP POLICY IF EXISTS "mtask_own_or_admin" ON public.mentor_tasks;
CREATE POLICY "mtask_own_or_admin" ON public.mentor_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

-- mentor_client_scores (20260616000000_mentor_execution.sql)
DROP POLICY IF EXISTS "mscores_admin_only" ON public.mentor_client_scores;
CREATE POLICY "mscores_admin_only" ON public.mentor_client_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

-- mentor_intervention_queue (20260616000000_mentor_execution.sql)
DROP POLICY IF EXISTS "miq_admin_only" ON public.mentor_intervention_queue;
CREATE POLICY "miq_admin_only" ON public.mentor_intervention_queue FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

-- mentorship_sessions (versión vigente: 20260710000000_admin_mentorship_write.sql)
DROP POLICY IF EXISTS "ms_own" ON public.mentorship_sessions;
CREATE POLICY "ms_own" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR public.is_mentor_of(user_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR public.is_mentor_of(user_id)
  );

-- mentorship_tasks (versión vigente: 20260710000000_admin_mentorship_write.sql)
DROP POLICY IF EXISTS "mt_own" ON public.mentorship_tasks;
CREATE POLICY "mt_own" ON public.mentorship_tasks FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR public.is_mentor_of(user_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR public.is_mentor_of(user_id)
  );

-- admin_briefings (20260615000000_memory_system.sql)
DROP POLICY IF EXISTS "abrief_admin_only" ON public.admin_briefings;
CREATE POLICY "abrief_admin_only" ON public.admin_briefings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

-- memory_summaries (20260615000000_memory_system.sql)
DROP POLICY IF EXISTS "msum_own_or_admin" ON public.memory_summaries;
CREATE POLICY "msum_own_or_admin" ON public.memory_summaries FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

-- user_memory_profile (20260615000000_memory_system.sql)
DROP POLICY IF EXISTS "ump_own_or_admin" ON public.user_memory_profile;
CREATE POLICY "ump_own_or_admin" ON public.user_memory_profile FOR ALL TO authenticated
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id))
  WITH CHECK (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR public.is_mentor_of(user_id));

-- ── 6. Policies additivas SELECT-only (mentor LEE, nunca escribe estas dos) ──
DROP POLICY IF EXISTS "massign_mentor_read_own" ON public.mentor_assignments;
CREATE POLICY "massign_mentor_read_own" ON public.mentor_assignments FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());

-- Necesaria porque user_progress es una VIEW security_invoker=true sobre
-- user_profiles: sin esto, fetchUserDetail/fetchExecutionDashboard no pueden
-- resolver nombre/protocol_start_date de los clientes de un mentor.
DROP POLICY IF EXISTS "mentor_read_own_clients_user_profiles" ON public.user_profiles;
CREATE POLICY "mentor_read_own_clients_user_profiles" ON public.user_profiles FOR SELECT TO authenticated
  USING (public.is_mentor_of(user_id));

-- ── 7. admin_audit_log: las escrituras de un mentor también dejan rastro ────
-- (adminUpsertSessionNote/adminUpdateActionPlan llaman auditLog() sin
-- destructurar {error} — sin esto, la nota se guarda bien pero la entrada de
-- auditoría se pierde en silencio para un mentor no-admin.)
DROP POLICY IF EXISTS "audit_mentor_self_insert" ON public.admin_audit_log;
CREATE POLICY "audit_mentor_self_insert" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid()
    AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_mentor = true)));
