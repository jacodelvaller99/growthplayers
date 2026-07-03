-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: cola de moderación de comunidad (App Store 1.2) — dos huecos de RLS que
-- hacían que la cola de moderación fuera de solo lectura en la práctica.
--
-- Descubierto probando El Círculo en vivo: al marcar un reporte "REVISADO" la
-- UI lo quitaba de la lista (optimista) pero el UPDATE nunca llegaba a la BD
-- (verificado con SELECT directo tras recargar — el status seguía 'open').
-- Causa: community_reports solo tenía policies de SELECT (admin) e INSERT
-- (reporter propio) desde la migración original de moderación (2026-06-04);
-- nunca se agregó UPDATE. Efecto: ADMIN NO PUEDE MARCAR REVISADO/DESCARTADO/
-- ACCIONADO — la cola de moderación completa (reportes viejos incluidos, no
-- solo los de El Círculo) es de solo lectura.
--
-- Segundo hueco relacionado: community_posts solo tiene "own_community_posts"
-- (FOR ALL, dueño) + "community_read_all" (SELECT). Sin policy de DELETE para
-- admin, el botón "ELIMINAR POST" de moderación falla en silencio para
-- cualquier post que no sea del propio admin (el caso normal: moderar UGC
-- ajeno). comment/event/space YA tenían su policy admin correspondiente
-- (verificado en 20260702000000_el_circulo.sql) — solo faltaban estas dos.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS reports_admin_update ON public.community_reports;
CREATE POLICY reports_admin_update ON public.community_reports
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS posts_admin_delete ON public.community_posts;
CREATE POLICY posts_admin_delete ON public.community_posts
  FOR DELETE
  USING (public.is_current_user_admin());
