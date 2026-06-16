/**
 * biometric — capa de ACCESO A DATOS de la Biometric Intelligence Layer (IO).
 *
 * Toda lectura/escritura degrada a vacío (try/catch): si la migración aún no se
 * aplicó o no hay red, la app no rompe. La interpretación vive en `lib/biometricLogic.ts`
 * (pura) y la generación de datos demo en `lib/biometricSimulator.ts`.
 *
 * Reutiliza `wearable_daily`/`wearable_connections`/`journal_entries` existentes y
 * persiste interpretaciones en `biometric_insights`. Las reflexiones de bienestar se
 * canalizan al Memory OS como `memory_summaries` (source_type='wellness') — Norman las lee.
 */
import { bio } from '@/lib/supabase';
import { insertSummary } from '@/lib/memory';
import {
  computeBaseline,
  computeInsight,
  INTERVENTION_RANK,
  type BiometricInsight,
  type DailyMetrics,
  type InterventionLevel,
} from '@/lib/biometricLogic';
import {
  generateSeries,
  type Scenario,
} from '@/lib/biometricSimulator';

const DAILY_COLS =
  'date,provider,sleep_score,sleep_duration_min,sleep_efficiency,rem_min,deep_min,light_min,' +
  'awake_min,recovery_score,hrv_ms,resting_hr,respiratory_rate,spo2_avg,body_temp_delta,strain_score,signal_confidence';

const INSIGHT_COLS =
  'user_id,metric_date,sleep_state,recovery_state,coherence_state,fatigue_risk,trend_state,' +
  'intervention_level,summary,drivers,coach_safe_summary,client_safe_summary,created_at';

export interface InsightRow extends BiometricInsight {
  user_id?: string;
  created_at?: string;
}

export interface ConnectionStatus {
  provider: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  sync_mode?: string | null;
}

export interface BiometricSnapshot {
  series: DailyMetrics[];
  latestInsight: InsightRow | null;
  connections: ConnectionStatus[];
}

export interface ReflectionInput {
  content: string;
  entry_type?: string;              // wellness|recovery|sleep|post_session|reflection|freeform
  title?: string;
  mood_score?: number | null;       // 1-10
  energy_tag?: 'low' | 'medium' | 'high' | null;
  stress_tag?: string | null;
  linked_metric_date?: string | null;
  linked_session_id?: string | null;
}

// ─── Fechas (permitido en código de app; el simulador puro recibe las fechas ya hechas) ──
function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// ─── Lectura de series + insights ──────────────────────────────────────────────────
export async function fetchDailySeries(userId: string, days = 14): Promise<DailyMetrics[]> {
  if (!userId) return [];
  try {
    const { data, error } = await bio.daily()
      .select(DAILY_COLS)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(days);
    if (error || !data) return [];
    return (data as DailyMetrics[]).slice().reverse(); // cronológico asc
  } catch {
    return [];
  }
}

export async function fetchInsights(userId: string, n = 14): Promise<InsightRow[]> {
  if (!userId) return [];
  try {
    const { data, error } = await bio.insights()
      .select(INSIGHT_COLS)
      .eq('user_id', userId)
      .order('metric_date', { ascending: false })
      .limit(n);
    if (error || !data) return [];
    return data as InsightRow[];
  } catch {
    return [];
  }
}

export async function fetchLatestInsight(userId: string): Promise<InsightRow | null> {
  const rows = await fetchInsights(userId, 1);
  return rows[0] ?? null;
}

export async function fetchConnections(userId: string): Promise<ConnectionStatus[]> {
  if (!userId) return [];
  try {
    const { data, error } = await bio.connections()
      .select('provider,is_active,last_synced_at,last_success_at,last_error,sync_mode')
      .eq('user_id', userId);
    if (error || !data) return [];
    return data as ConnectionStatus[];
  } catch {
    return [];
  }
}

// ─── Persistencia de insight ────────────────────────────────────────────────────────
export async function upsertInsight(userId: string, insight: BiometricInsight): Promise<boolean> {
  if (!userId || !insight.metric_date) return false;
  try {
    const row = {
      user_id:             userId,
      metric_date:         insight.metric_date,
      sleep_state:         insight.sleep_state,
      recovery_state:      insight.recovery_state,
      coherence_state:     insight.coherence_state,
      fatigue_risk:        insight.fatigue_risk,
      trend_state:         insight.trend_state,
      intervention_level:  insight.intervention_level,
      summary:             insight.summary,
      drivers:             insight.drivers,
      coach_safe_summary:  insight.coach_safe_summary,
      client_safe_summary: insight.client_safe_summary,
    };
    const { error } = await bio.insights().upsert(row, { onConflict: 'user_id,metric_date' });
    return !error;
  } catch {
    return false;
  }
}

/** Interpreta una serie cronológica (último día = "hoy") y devuelve el insight. */
export function interpretSeries(series: DailyMetrics[]): BiometricInsight | null {
  if (series.length === 0) return null;
  const today = series[series.length - 1];
  const prior = series.slice(0, -1).slice(-7);         // baseline: hasta 7 días previos
  const recent = series.slice(-7);                     // tendencia: ventana reciente
  const baseline = computeBaseline(prior.length ? prior : series);
  return computeInsight(today, baseline, recent);
}

/** Lee la serie del usuario, interpreta el día más reciente y persiste el insight. */
export async function computeAndPersistInsight(userId: string): Promise<BiometricInsight | null> {
  const series = await fetchDailySeries(userId, 14);
  const insight = interpretSeries(series);
  if (insight) await upsertInsight(userId, insight);
  return insight;
}

// ─── Reflexiones de bienestar → journal + Memory OS ─────────────────────────────────
function moodTone(mood?: number | null): string {
  if (typeof mood !== 'number') return '';
  if (mood >= 7) return 'positivo';
  if (mood >= 4) return 'neutral';
  return 'bajo';
}

/** Canaliza una reflexión a memory_summaries (source_type='wellness') — la lee Norman. */
export async function ingestReflectionToMemory(
  userId: string,
  r: ReflectionInput,
  insight?: BiometricInsight | null,
): Promise<boolean> {
  if (!userId || !r.content.trim()) return false;
  const topics = [r.entry_type, r.energy_tag ? `energía:${r.energy_tag}` : null, r.stress_tag ? `estrés:${r.stress_tag}` : null]
    .filter(Boolean) as string[];
  return insertSummary({
    user_id:              userId,
    source_type:          'wellness',
    source_id:            r.linked_metric_date ?? null,
    summary:              `[Reflexión${r.title ? ` · ${r.title}` : ''}] ${r.content.trim()}`.slice(0, 800),
    key_topics:           topics,
    commitments:          [],
    unresolved_questions: [],
    emotional_tone:       moodTone(r.mood_score),
    suggested_next_focus: insight?.client_safe_summary ?? '',
  });
}

/** Guarda la reflexión en journal_entries y la ingiere al Memory OS. */
export async function saveReflection(
  userId: string,
  r: ReflectionInput,
  insight?: BiometricInsight | null,
): Promise<boolean> {
  if (!userId || !r.content.trim()) return false;
  try {
    const { error } = await bio.reflections().insert({
      user_id:            userId,
      entry_type:         r.entry_type ?? 'wellness',
      content:            r.content.trim(),
      title:              r.title ?? null,
      mood_score:         r.mood_score ?? null,
      energy_tag:         r.energy_tag ?? null,
      stress_tag:         r.stress_tag ?? null,
      linked_metric_date: r.linked_metric_date ?? null,
      linked_session_id:  r.linked_session_id ?? null,
    });
    // Ingesta a memoria aunque el journal falle parcialmente (no bloquea al usuario).
    await ingestReflectionToMemory(userId, r, insight);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchReflections(userId: string, n = 10): Promise<ReflectionInput[]> {
  if (!userId) return [];
  try {
    const { data, error } = await bio.reflections()
      .select('content,entry_type,title,mood_score,energy_tag,stress_tag,linked_metric_date,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(n);
    if (error || !data) return [];
    return data as ReflectionInput[];
  } catch {
    return [];
  }
}

// ─── Snapshot por usuario (admin / cliente) ─────────────────────────────────────────
export async function fetchBiometricSnapshot(userId: string): Promise<BiometricSnapshot> {
  if (!userId) return { series: [], latestInsight: null, connections: [] };
  const [series, insights, connections] = await Promise.all([
    fetchDailySeries(userId, 14),
    fetchInsights(userId, 1),
    fetchConnections(userId),
  ]);
  return { series, latestInsight: insights[0] ?? null, connections };
}

// ─── Dashboard cross-client (admin) — último insight por usuario, ordenado por severidad ──
export interface BiometricDashboardRow {
  user_id: string;
  name?: string;
  metric_date: string | null;
  intervention_level: InterventionLevel;
  recovery_state: string;
  fatigue_risk: string;
  trend_state: string;
  summary: string;
}

export async function fetchBiometricDashboard(limit = 400): Promise<BiometricDashboardRow[]> {
  try {
    const { data, error } = await bio.insights()
      .select('user_id,metric_date,intervention_level,recovery_state,fatigue_risk,trend_state,summary')
      .order('metric_date', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    // Quedarnos con el insight más reciente por usuario.
    const seen = new Set<string>();
    const latest: BiometricDashboardRow[] = [];
    for (const row of data as BiometricDashboardRow[]) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      latest.push(row);
    }
    // Enriquecer con nombres (mismo origen que el dashboard de ejecución).
    try {
      const ids = latest.map((r) => r.user_id);
      const { supabase } = await import('@/lib/supabase');
      const sb = supabase as unknown as {
        from: (t: string) => { select: (c: string) => { in: (col: string, v: string[]) => Promise<{ data: { user_id: string; name: string }[] | null }> } };
      };
      const { data: names } = await sb.from('user_progress').select('user_id,name').in('user_id', ids);
      const nameMap: Record<string, string> = {};
      for (const p of names ?? []) nameMap[p.user_id] = p.name;
      for (const r of latest) r.name = nameMap[r.user_id] ?? 'Usuario';
    } catch {
      /* nombres opcionales */
    }
    // Ordenar por severidad de intervención (urgente primero).
    return latest.sort(
      (a, b) => (INTERVENTION_RANK[b.intervention_level] ?? 0) - (INTERVENTION_RANK[a.intervention_level] ?? 0),
    );
  } catch {
    return [];
  }
}

// ─── Seed de datos sintéticos (demo / QA) ───────────────────────────────────────────
export interface SeedResult {
  days: number;
  insights: number;
}

/**
 * Genera `days` días sintéticos deterministas para un escenario, los persiste en
 * wearable_daily (provider='synthetic') y computa+persiste el insight de cada día con
 * baseline rodante. Marca la conexión como sync_mode='synthetic'. Idempotente por fecha.
 */
export async function seedSyntheticData(
  userId: string,
  scenario: Scenario,
  days = 14,
  seed = 1,
): Promise<SeedResult> {
  if (!userId) return { days: 0, insights: 0 };
  const dates = lastNDates(days);
  const series = generateSeries({ scenario, dates, seed, userId });
  let written = 0;
  let insightsWritten = 0;

  try {
    // Upsert de cada día (onConflict user_id,provider,date).
    const rows = series.map((d) => ({ ...d, user_id: userId, synced_at: new Date().toISOString() }));
    const { error } = await bio.daily().upsert(rows, { onConflict: 'user_id,provider,date' });
    if (!error) written = rows.length;
  } catch {
    /* degrada */
  }

  // Insight por día con ventana rodante.
  for (let i = 0; i < series.length; i++) {
    const window = series.slice(0, i + 1).slice(-8);
    const insight = interpretSeries(window);
    if (insight && (await upsertInsight(userId, insight))) insightsWritten++;
  }

  // Marcar conexión sintética (no crítico).
  try {
    await bio.connections().upsert(
      {
        user_id: userId,
        provider: 'synthetic',
        is_active: true,
        sync_mode: 'synthetic',
        last_synced_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );
  } catch {
    /* degrada */
  }

  return { days: written, insights: insightsWritten };
}

/** Elimina los datos sintéticos de un usuario (limpieza de demo). */
export async function clearSyntheticData(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    await bio.daily().delete().eq('user_id', userId).eq('provider', 'synthetic');
    await bio.connections().delete().eq('user_id', userId).eq('provider', 'synthetic');
    return true;
  } catch {
    return false;
  }
}
