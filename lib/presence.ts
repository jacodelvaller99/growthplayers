import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

// Lightweight "liveness" for community: who is online + who is typing.
// Built entirely on Supabase Realtime (presence + broadcast) — NO new tables,
// NO migration. Degrades to "nobody online / nobody typing" if Realtime is
// unavailable, so it never blocks the chat.

/** Realtime presence on a single community channel. Returns the set of user ids
 *  currently connected. Each client tracks itself under its own user id. */
// Un solo canal compartido: supabase.channel() devuelve el MISMO canal para el
// mismo topic, y añadirle .on() tras subscribe() lanza — con dos pantallas
// abiertas a la vez (Mensajes + Nuevo mensaje) la segunda rompía la app.
let shared: { channel: any; userId: string; online: Set<string>; subs: Set<(s: Set<string>) => void> } | null = null;

export function usePresence(userId?: string): Set<string> {
  const [online, setOnline] = useState<Set<string>>(() => shared?.online ?? new Set());

  useEffect(() => {
    if (!userId) return;
    if (shared && shared.userId !== userId) { supabase.removeChannel(shared.channel); shared = null; }
    if (!shared) {
      const channel = supabase.channel('presence:community', {
        config: { presence: { key: userId } },
      });
      const s = { channel, userId, online: new Set<string>(), subs: new Set<(s: Set<string>) => void>() };
      shared = s;
      channel
        .on('presence', { event: 'sync' }, () => {
          s.online = new Set(Object.keys(channel.presenceState()));
          s.subs.forEach((fn) => fn(s.online));
        })
        .subscribe((status: string) => {
          // online_at is informational; presence key (user id) is what matters.
          if (status === 'SUBSCRIBED') channel.track({ online_at: Date.now() }).catch(() => {});
        });
    }
    const s = shared;
    s.subs.add(setOnline);
    setOnline(s.online);
    return () => {
      s.subs.delete(setOnline);
      if (!s.subs.size && shared === s) { supabase.removeChannel(s.channel); shared = null; }
    };
  }, [userId]);

  return online;
}

/** Typing indicator for a 1-to-1 thread, over a broadcast channel keyed by the
 *  sorted user pair (so both ends share it). Returns whether the peer is typing
 *  and a setter to broadcast our own state. Peer "typing" auto-expires after a
 *  few seconds of silence so a dropped "stopped" event can't leave it stuck. */
export function useChatTyping(userId?: string, peerId?: string) {
  const [peerTyping, setPeerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !peerId) return;
    const key = [userId, peerId].sort().join('__');
    const channel = supabase.channel(`typing:${key}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'typing' }, (msg: { payload?: { from?: string; typing?: boolean } }) => {
        const p = msg?.payload;
        if (!p || p.from !== peerId) return;
        setPeerTyping(!!p.typing);
        if (p.typing) {
          if (expireTimer.current) clearTimeout(expireTimer.current);
          expireTimer.current = setTimeout(() => setPeerTyping(false), 4500);
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (expireTimer.current) clearTimeout(expireTimer.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, peerId]);

  const setTyping = useCallback(
    (typing: boolean) => {
      channelRef.current
        ?.send({ type: 'broadcast', event: 'typing', payload: { from: userId, typing } })
        .catch(() => {});
    },
    [userId],
  );

  return { peerTyping, setTyping };
}
