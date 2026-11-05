/**
 * Seguimiento del cliente para el mentor (estilo Traineeks): indicadores del
 * mes + un calendario con lo que el cliente HIZO cada día. Puro y testeado.
 * Los check-ins se guardan ×2 (1–10); aquí se muestran en la escala que el
 * cliente usó (1–5).
 */
export type CheckinRow = { date: string; energy: number | null; clarity: number | null; stress: number | null; sleep: number | null };
export type EventRow = { at: string | null };
export type PracticeRow = { at: string | null; seconds: number | null };

export type TrackingInput = {
  year: number;
  month: number; // 0–11
  today: Date;
  checkins: CheckinRow[];
  lessons: EventRow[];
  practices: PracticeRow[];
  norman: EventRow[];
  sessions: EventRow[]; // sesiones de mentoría
  videos?: EventRow[];  // videos de lección vistos (≥90 %)
};

export type TrackingDay = {
  key: string;
  day: number;
  inMonth: boolean;
  past: boolean;      // antes de hoy
  isToday: boolean;
  energy: number | null; // 1–5
  stress: number | null; // 1–5
  lessons: number;
  practices: number;
  norman: number;
  session: boolean;
  videos: number;
  trophy: boolean;    // racha de 7 días de check-in que se completa este día
};

export type TrackingKpis = {
  energy: number | null;   // media 1–5
  stress: number | null;   // media 1–5
  daysTracked: number;     // días con check-in en el mes
  practiceMin: number | null; // minutos medios por práctica
  trackingPct: number | null; // días con check-in ÷ días transcurridos
};

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const keyOf = (iso: string | null) => {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? dayKey(d) : null;
};
const half = (v: number | null) => (v == null ? null : v / 2);
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export function buildTracking(i: TrackingInput): { days: TrackingDay[]; kpis: TrackingKpis } {
  const todayKey = dayKey(i.today);
  const ck = new Map(i.checkins.map((c) => [c.date.slice(0, 10), c]));
  const count = (rows: EventRow[]) => {
    const m = new Map<string, number>();
    for (const r of rows) { const k = keyOf(r.at); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
  };
  const lessons = count(i.lessons), practices = count(i.practices), norman = count(i.norman), sessions = count(i.sessions), videos = count(i.videos ?? []);

  // Racha: el día N lleva trofeo si es el 7.º, 14.º… día seguido con check-in.
  const streakAt = (k: string) => {
    let n = 0;
    const d = new Date(`${k}T12:00:00`);
    while (ck.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  const first = new Date(i.year, i.month, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // lunes de la primera semana
  const lastOfMonth = new Date(i.year, i.month + 1, 0);
  const cells = Math.ceil(((first.getDay() + 6) % 7 + lastOfMonth.getDate()) / 7) * 7;

  const days: TrackingDay[] = Array.from({ length: cells }, (_, n) => {
    const d = new Date(start); d.setDate(start.getDate() + n);
    const k = dayKey(d);
    const c = ck.get(k);
    const s = c ? streakAt(k) : 0;
    return {
      key: k,
      day: d.getDate(),
      inMonth: d.getMonth() === i.month,
      past: k < todayKey,
      isToday: k === todayKey,
      energy: half(c?.energy ?? null),
      stress: half(c?.stress ?? null),
      lessons: lessons.get(k) ?? 0,
      practices: practices.get(k) ?? 0,
      norman: norman.get(k) ?? 0,
      session: (sessions.get(k) ?? 0) > 0,
      videos: videos.get(k) ?? 0,
      trophy: s > 0 && s % 7 === 0,
    };
  });

  const month = days.filter((d) => d.inMonth);
  const tracked = month.filter((d) => d.energy != null || d.stress != null);
  const elapsed = month.filter((d) => d.past || d.isToday).length;
  const monthKeys = new Set(month.map((d) => d.key));
  const mins = i.practices
    .filter((p) => monthKeys.has(keyOf(p.at) ?? '') && p.seconds)
    .map((p) => p.seconds! / 60);

  return {
    days,
    kpis: {
      energy: avg(tracked.map((d) => d.energy!).filter((v) => v != null)),
      stress: avg(tracked.map((d) => d.stress!).filter((v) => v != null)),
      daysTracked: tracked.length,
      practiceMin: mins.length ? Math.round(avg(mins)!) : null,
      trackingPct: elapsed ? Math.round((tracked.length / elapsed) * 1000) / 10 : null,
    },
  };
}
