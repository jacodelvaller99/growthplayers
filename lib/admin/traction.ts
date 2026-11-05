/**
 * Tracción de la app — lo que el dueño mira para saber si Polaris engancha.
 * IO lee las tablas reales (admin RLS); `buildTraction` es puro y testeado.
 * Ventana: últimos 30 días, por día local.
 */
import { supabase } from '@/lib/supabase';

type Row = { user_id: string; at: string | null };

export type TractionInput = {
  now: Date;
  totalUsers: number;
  signups: Row[];      // profiles.created_at
  checkins: Row[];     // daily_checkins.date
  normanMsgs: Row[];   // mentor_messages (role=user).created_at
  lessons: Row[];      // completed_lessons.completed_at
  practices: Row[];    // wellness_sessions.completed_at
  tiers: string[];     // profiles.subscription_tier
};

export type TractionDay = { day: string; active: number };

export type Traction = {
  totalUsers: number;
  dau: number;            // activos hoy
  wau: number;            // activos últimos 7 días
  mau: number;            // activos últimos 30 días
  stickiness: number | null; // DAU/MAU %
  signups30: number;
  activation: number | null; // % de altas de 30 días con ≥1 check-in
  checkins30: number;
  normanMsgs30: number;
  lessons30: number;
  practices30: number;
  daily: TractionDay[];   // 30 días, del más viejo al de hoy
  paying: number;
  tiers: { tier: string; count: number }[];
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const keyOf = (iso: string | null) => {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; // ya es fecha (daily_checkins.date)
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? dayKey(d) : null;
};

export function buildTraction(i: TractionInput): Traction {
  const today = new Date(i.now); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, k) => {
    const d = new Date(today); d.setDate(today.getDate() - (29 - k)); return dayKey(d);
  });
  const first = days[0]!, d7 = days[23]!, last = days[29]!;
  const inWin = (k: string | null, from = first): k is string => !!k && k >= from && k <= last;

  // Activo = hizo algo con intención: check-in, escribirle a Norman, lección o práctica.
  const activity = [...i.checkins, ...i.normanMsgs, ...i.lessons, ...i.practices];
  const byDay = new Map<string, Set<string>>();
  for (const r of activity) {
    const k = keyOf(r.at);
    if (!inWin(k)) continue;
    (byDay.get(k) ?? byDay.set(k, new Set()).get(k)!).add(r.user_id);
  }
  const uniq = (from: string) => {
    const s = new Set<string>();
    for (const [k, us] of byDay) if (k >= from) us.forEach((u) => s.add(u));
    return s.size;
  };
  const dau = byDay.get(last)?.size ?? 0;
  const mau = uniq(first);

  const recentSignups = i.signups.filter((r) => inWin(keyOf(r.at)));
  const checkers = new Set(i.checkins.map((r) => r.user_id));
  const activated = recentSignups.filter((r) => checkers.has(r.user_id)).length;

  const count = (rows: Row[]) => rows.filter((r) => inWin(keyOf(r.at))).length;
  const tierCount = new Map<string, number>();
  for (const t of i.tiers) tierCount.set(t || 'free', (tierCount.get(t || 'free') ?? 0) + 1);

  return {
    totalUsers: i.totalUsers,
    dau,
    wau: uniq(d7),
    mau,
    stickiness: mau ? Math.round((dau / mau) * 100) : null,
    signups30: recentSignups.length,
    activation: recentSignups.length ? Math.round((activated / recentSignups.length) * 100) : null,
    checkins30: count(i.checkins),
    normanMsgs30: count(i.normanMsgs),
    lessons30: count(i.lessons),
    practices30: count(i.practices),
    daily: days.map((day) => ({ day, active: byDay.get(day)?.size ?? 0 })),
    paying: i.tiers.filter((t) => t && t !== 'free').length,
    tiers: [...tierCount].map(([tier, n]) => ({ tier, count: n })).sort((a, b) => b.count - a.count),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as any;

async function rows(table: string, col: string, since: string, extra?: (q: any) => any): Promise<Row[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    let q = supa.from(table).select(`user_id, ${col}`).gte(col, since).limit(20000);
    if (extra) q = extra(q);
    const { data } = await q;
    return ((data ?? []) as Record<string, string>[]).map((r) => ({ user_id: r.user_id, at: r[col] ?? null }));
  } catch {
    return [];
  }
}

export async function fetchTraction(now = new Date()): Promise<Traction> {
  const since = new Date(now.getTime() - 31 * 86_400_000);
  const sinceIso = since.toISOString();
  const sinceDay = dayKey(since);
  const [profiles, checkins, normanMsgs, lessons, practices] = await Promise.all([
    supa.from('profiles').select('id, created_at, subscription_tier').limit(20000)
      .then((r: { data: { id: string; created_at: string | null; subscription_tier: string | null }[] | null }) => r.data ?? [])
      .catch(() => []),
    rows('daily_checkins', 'date', sinceDay),
    rows('mentor_messages', 'created_at', sinceIso, (q) => q.eq('role', 'user')),
    rows('completed_lessons', 'completed_at', sinceIso),
    rows('wellness_sessions', 'completed_at', sinceIso),
  ]);
  const ps = profiles as { id: string; created_at: string | null; subscription_tier: string | null }[];
  return buildTraction({
    now,
    totalUsers: ps.length,
    signups: ps.map((p) => ({ user_id: p.id, at: p.created_at })),
    checkins, normanMsgs, lessons, practices,
    tiers: ps.map((p) => p.subscription_tier ?? 'free'),
  });
}
