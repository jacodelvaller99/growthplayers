-- ─── Direct-message reactions ────────────────────────────────────────────────
-- Lightweight emoji reaction on a 1-to-1 message. One reaction per user per
-- message (toggling/replacing). Visible only to the two participants of the
-- thread (RLS joins direct_messages). Cascades on message OR user deletion, so
-- GDPR delete is covered; delete-account also purges it as defense-in-depth.

CREATE TABLE IF NOT EXISTS public.direct_message_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dmr_message ON public.direct_message_reactions(message_id);

ALTER TABLE public.direct_message_reactions ENABLE ROW LEVEL SECURITY;

-- A participant of the message's thread can READ reactions on it.
DROP POLICY IF EXISTS dmr_select ON public.direct_message_reactions;
CREATE POLICY dmr_select ON public.direct_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id
        AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
    )
  );

-- A user can only WRITE their own reaction, and only on a thread they belong to.
DROP POLICY IF EXISTS dmr_insert ON public.direct_message_reactions;
CREATE POLICY dmr_insert ON public.direct_message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id
        AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS dmr_update ON public.direct_message_reactions;
CREATE POLICY dmr_update ON public.direct_message_reactions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS dmr_delete ON public.direct_message_reactions;
CREATE POLICY dmr_delete ON public.direct_message_reactions
  FOR DELETE USING (user_id = auth.uid());
