/**
 * Uso real de la app por persona (tabla user_events): sesiones, pantallas con
 * su tiempo y toques. Puro y testeado; la UI solo pinta.
 */
export type UsageEvent = {
  user_id?: string;
  event_type: string;
  screen: string | null;
  metadata: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
};

export type UsageStep = { at: string; kind: 'pantalla' | 'toque'; label: string; dwellMs?: number };
export type UsageSession = {
  id: string;
  start: string;
  end: string;
  durationMs: number;
  screens: number;
  taps: number;
  steps: UsageStep[]; // en orden
};
export type UsageSummary = {
  lastSeen: string | null;
  sessions7d: number;
  minutes7d: number;
  taps7d: number;
  topScreens: { label: string; minutes: number; visits: number }[];
  sessions: UsageSession[]; // más reciente primero
};

const NOMBRES: [RegExp, string][] = [
  [/^\/(comando)?$/, 'Hoy'],
  [/^\/checkin/, 'Check-in'],
  [/^\/mentor$/, 'Norman'],
  [/^\/progreso/, 'Progreso'],
  [/^\/yo/, 'Yo'],
  [/^\/norte/, 'Norte'],
  [/^\/programas/, 'Programa'],
  [/^\/module\//, 'Módulo'],
  [/^\/lesson\//, 'Lección'],
  [/^\/mentoria/, 'Mentoría'],
  [/^\/bienestar\/([a-z]+)/, 'Bienestar · $1'],
  [/^\/bienestar$/, 'Bienestar'],
  [/^\/comunidad/, 'Comunidad'],
  [/^\/perfil/, 'Perfil'],
  [/^\/pricing|^\/paywall/, 'Planes'],
  [/^\/admin/, 'Panel admin'],
];

export function screenLabel(path: string | null): string {
  if (!path) return 'Pantalla';
  // Eventos viejos guardaban solo el nombre de la pestaña («comando»).
  if (!path.startsWith('/')) path = `/${path}`;
  for (const [re, name] of NOMBRES) {
    const m = path.match(re);
    if (m) return name.replace('$1', m[1] ?? '');
  }
  return path;
}

const GAP_MS = 30 * 60_000; // sin session_id: 30 min sin eventos = sesión nueva

export function buildUsage(events: UsageEvent[], now: Date): UsageSummary {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const sessions: UsageSession[] = [];
  let cur: UsageSession | null = null;
  let lastAt = 0;
  for (const e of sorted) {
    const t = new Date(e.created_at).getTime();
    const id = e.session_id ?? `t${t}`;
    if (!cur || (e.session_id ? cur.id !== id : t - lastAt > GAP_MS)) {
      cur = { id, start: e.created_at, end: e.created_at, durationMs: 0, screens: 0, taps: 0, steps: [] };
      sessions.push(cur);
    }
    cur.end = e.created_at;
    cur.durationMs = t - new Date(cur.start).getTime();
    lastAt = t;
    if (e.event_type === 'screen_view') {
      cur.screens++;
      cur.steps.push({ at: e.created_at, kind: 'pantalla', label: screenLabel(e.screen) });
    } else if (e.event_type === 'screen_leave') {
      const dwell = Number(e.metadata?.dwell_ms ?? 0);
      const label = screenLabel(e.screen);
      const open = [...cur.steps].reverse().find((s) => s.kind === 'pantalla' && s.label === label && s.dwellMs == null);
      if (open) open.dwellMs = dwell;
    } else if (e.event_type === 'button_tap') {
      cur.taps++;
      cur.steps.push({ at: e.created_at, kind: 'toque', label: String(e.metadata?.label ?? e.metadata?.button_id ?? 'Toque') });
    }
  }

  // Una apertura sin pantallas ni toques (recarga, pestaña en segundo plano) no es uso.
  const real = sessions.filter((s) => s.screens > 0 || s.taps > 0);
  const since = now.getTime() - 7 * 86_400_000;
  const recent = real.filter((s) => new Date(s.end).getTime() >= since);
  const byScreen = new Map<string, { ms: number; visits: number }>();
  for (const s of recent) for (const st of s.steps) {
    if (st.kind !== 'pantalla') continue;
    const v = byScreen.get(st.label) ?? { ms: 0, visits: 0 };
    v.ms += st.dwellMs ?? 0; v.visits++;
    byScreen.set(st.label, v);
  }

  return {
    lastSeen: sorted.length ? sorted[sorted.length - 1]!.created_at : null,
    sessions7d: recent.length,
    minutes7d: Math.round(recent.reduce((a, s) => a + s.durationMs, 0) / 60_000),
    taps7d: recent.reduce((a, s) => a + s.taps, 0),
    topScreens: [...byScreen].map(([label, v]) => ({ label, minutes: Math.round(v.ms / 60_000), visits: v.visits }))
      .sort((a, b) => b.minutes - a.minutes || b.visits - a.visits).slice(0, 5),
    sessions: real.reverse(),
  };
}
