-- App Store 1.2 — reportar miembros y bloqueo real en mensajes directos.
--
-- 1. community_reports acepta target_type = 'user' (reportar a un miembro desde el chat o su perfil).
-- 2. is_blocked_between(a, b): true si cualquiera de los dos bloqueó al otro. SECURITY DEFINER porque
--    la RLS de user_blocks solo deja ver los bloqueos propios, y aquí hay que mirar también el inverso.
-- 3. dm_send: no se puede escribir a quien te bloqueó ni a quien bloqueaste (antes solo lo frenaba la app).
-- Idempotente: se puede correr dos veces en el SQL Editor.

ALTER TABLE public.community_reports DROP CONSTRAINT IF EXISTS community_reports_target_type_check;
ALTER TABLE public.community_reports ADD CONSTRAINT community_reports_target_type_check
  CHECK (target_type IN ('post', 'comment', 'event', 'space', 'user'));

CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "dm_send" ON public.direct_messages;
CREATE POLICY "dm_send" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND NOT public.is_blocked_between(sender_id, recipient_id));
