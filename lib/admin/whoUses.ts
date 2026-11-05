/**
 * ¿Quién usa la app? Persona por persona, últimos 7 días, desde user_events.
 */
import { supabase } from '@/lib/supabase';
import { buildUsage, type UsageEvent } from '@/lib/admin/usageLogic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as any;

export type PersonUsage = { userId: string; name: string; lastSeen: string | null; sessions: number; minutes: number; taps: number };

export async function fetchWhoUses(now = new Date()): Promise<PersonUsage[]> {
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  try {
    const { data } = await supa.from('user_events')
      .select('user_id, event_type, screen, metadata, session_id, created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(20000);
    const rows = (data ?? []) as Required<UsageEvent>[];
    const byUser = new Map<string, UsageEvent[]>();
    for (const r of rows) (byUser.get(r.user_id) ?? byUser.set(r.user_id, []).get(r.user_id)!).push(r);
    const ids = [...byUser.keys()];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: ps } = await supa.from('user_profiles').select('user_id, name').in('user_id', ids);
      names = Object.fromEntries(((ps ?? []) as { user_id: string; name: string | null }[]).map((p) => [p.user_id, p.name || 'Sin nombre']));
    }
    return ids.map((id) => {
      const u = buildUsage(byUser.get(id)!, now);
      return { userId: id, name: names[id] ?? 'Sin nombre', lastSeen: u.lastSeen, sessions: u.sessions7d, minutes: u.minutes7d, taps: u.taps7d };
    }).sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
  } catch {
    return [];
  }
}
