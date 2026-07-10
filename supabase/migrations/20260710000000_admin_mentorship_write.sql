-- ─────────────────────────────────────────────────────────────────────────────
-- Admin mentorship write — el mentor opera la mentoría POR el cliente.
--
-- Problema: las políticas ms_own / mt_own (20260604000000_meeting_features.sql)
-- incluyen al admin en el USING (SELECT/DELETE) pero el WITH CHECK es
-- `user_id = auth.uid()` sin cláusula admin → el admin NO puede INSERT/UPDATE
-- sesiones o tareas de mentoría de otro usuario (la fila resultante no pasa el
-- check). Mismo patrón ya resuelto en mentor_tasks (mtask_own_or_admin,
-- 20260616000000_mentor_execution.sql) — aquí se replica.
--
-- Aplicar en el SQL Editor del dashboard (no hay service-role local).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ms_own" ON public.mentorship_sessions;
CREATE POLICY "ms_own" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "mt_own" ON public.mentorship_tasks;
CREATE POLICY "mt_own" ON public.mentorship_tasks FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
