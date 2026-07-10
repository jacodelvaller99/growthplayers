/**
 * use-mentorship.tsx — Estado de la mentoría: sesiones, notas y plan de acción IA.
 *
 * El Navegador toma notas (o graba) cada sesión semanal; Norman (la IA) construye
 * desde esas sesiones un plan de acción accionable para la siguiente semana.
 *
 * Persistencia: tabla Supabase `mentorship_sessions` como fuente de verdad, con
 * cache local (namespace lifeflow:v2) como fallback offline. La tabla y sus
 * columnas NO están en los tipos generados de Supabase → se accede SOLO vía el
 * cliente sin tipar (`intel`/`db2` / `(supabase as any)`); nunca por `db.*`.
 *
 * Pipeline de grabación → IA:
 *   grabar (expo-av) → subir a Storage `mentorship-audio/{userId}/{sessionId}.m4a`
 *   → transcribir (Whisper, lib/transcription) → Norman redacta notas + plan
 *   → el usuario edita → confirmar → persistir en `mentorship_sessions`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { readLocal, writeLocal } from '@/storage/local';
import { streamMentorResponse, type MentorContext } from '@/lib/mentor';
import { transcribeAudio } from '@/lib/transcription';
import { insertSummary } from '@/lib/memory';
import { makeMinimalContext, updateProfileFromSummary } from '@/lib/memorySummarizer';
import { createTasksFromActionPlan } from '@/lib/mentorExecution';
import { requestNotificationPermissions, scheduleAccountabilityFollowup } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { currentWeekNumber } from '@/data/mentorship';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface SessionNote {
  id: string;          // = id de la fila en mentorship_sessions (o uid local)
  week: number;
  date: string;        // ISO (session_date a medianoche, o createdAt)
  notes: string;       // notas de la sesión (editables)
  audioUrl?: string;   // grabación subida a Storage
  transcript?: string; // transcripción Whisper (si hubo grabación)
}

export interface ActionItem {
  id: string;
  week: number;
  text: string;
  done: boolean;
  source: 'ia' | 'manual';
}

/** Fases del pipeline de grabación → IA (para feedback en UI). */
export type RecordingPhase =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'error';

/** Borrador producido por el pipeline; el usuario lo edita antes de confirmar. */
export interface SessionDraft {
  sessionId: string;
  week: number;
  audioUrl?: string;
  transcript: string;
  notes: string;
  actions: string[];
  /** La transcripción falló tras reintentos → el usuario escribe las notas a mano. */
  transcriptionFailed?: boolean;
}

// ─── Cache local (fallback offline) ────────────────────────────────────────────

const NOTES_KEY = 'mentorship_notes';
const PLAN_KEY  = 'mentorship_plan';

let _seq = 0;
function uid(prefix: string): string {
  _seq += 1;
  return `${prefix}-${Date.now()}-${_seq}`;
}

/** Cliente sin tipar para tablas/Storage nuevos (no están en types/supabase). */
const anyClient = supabase as any;
const sessionsTable = () => anyClient.from('mentorship_sessions');
const audioBucket = () => anyClient.storage.from('mentorship-audio');

// ─── expo-av: carga perezosa y tipada (la dep puede no estar instalada) ─────────
// Importar estáticamente `expo-av` rompería `tsc` si la dependencia no está
// presente. La cargamos vía require dentro de un try → si falta, la grabación se
// deshabilita con elegancia (audioAvailable = false) en vez de romper la app.

interface ExpoRecording {
  stopAndUnloadAsync(): Promise<void>;
  getURI(): string | null;
}
interface ExpoAudioModule {
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  setAudioModeAsync(mode: Record<string, unknown>): Promise<void>;
  Recording: {
    createAsync(options?: unknown): Promise<{ recording: ExpoRecording }>;
  };
  RecordingOptionsPresets?: { HIGH_QUALITY?: unknown };
}

function loadAudio(): ExpoAudioModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-av') as { Audio?: ExpoAudioModule };
    return mod?.Audio ?? null;
  } catch {
    return null;
  }
}

// ─── Mapeo fila ↔ modelo ───────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  user_id?: string;
  week: number | null;
  session_date: string | null;
  audio_url: string | null;
  transcript: string | null;
  notes: string | null;
  action_plan: unknown;
  created_at?: string;
}

function rowToNote(r: SessionRow): SessionNote {
  return {
    id: r.id,
    week: r.week ?? 1,
    date: r.session_date
      ? new Date(r.session_date).toISOString()
      : r.created_at ?? new Date().toISOString(),
    notes: r.notes ?? '',
    audioUrl: r.audio_url ?? undefined,
    transcript: r.transcript ?? undefined,
  };
}

/** Aplana los action_plan de todas las filas en una lista de ActionItem (IA). */
function rowsToPlan(rows: SessionRow[]): ActionItem[] {
  const items: ActionItem[] = [];
  for (const r of rows) {
    const ap = Array.isArray(r.action_plan) ? r.action_plan : [];
    for (const raw of ap) {
      const item = normalizePlanItem(raw, r.week ?? 1);
      if (item) items.push(item);
    }
  }
  return items;
}

function normalizePlanItem(raw: unknown, week: number): ActionItem | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return null;
    return { id: uid('ia'), week, text, done: false, source: 'ia' };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as { id?: unknown; week?: unknown; text?: unknown; done?: unknown; source?: unknown };
    if (typeof o.text === 'string') {
      const text = o.text.trim();
      if (!text) return null;
      return {
        id: typeof o.id === 'string' ? o.id : uid('ia'),
        week: typeof o.week === 'number' ? o.week : week,
        text,
        done: Boolean(o.done),
        source: o.source === 'manual' ? 'manual' : 'ia',
      };
    }
  }
  return null;
}

export function parseAIList(out: string): string[] {
  return out
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((l) => l.length > 3)
    .slice(0, 5);
}

/** Construye un MentorContext mínimo y válido a partir del estado global. */
function buildContext(
  state: ReturnType<typeof useLifeFlow>['state'],
  protocolDay: number,
): MentorContext {
  const latest = state.checkIns[state.checkIns.length - 1] ?? null;
  return {
    userName: state.profile.name ?? 'Operador',
    role: state.profile.role ?? 'Empresario',
    totalDays: protocolDay,
    streak: Math.max(state.checkIns.length, protocolDay),
    sovereignScore: 0,
    tier: state.subscriptionTier,
    activeModuleTitle: '',
    activeModuleProgress: 0,
    northStar: state.northStar,
    todayCheckIn: latest,
    recentCheckIns: state.checkIns.slice(-14).reverse(),
    messageCount: state.mentorMessages.length,
  };
}

// ─── Prompts IA ────────────────────────────────────────────────────────────────

export const PLAN_PROMPT_TAIL =
  'Devuelve entre 3 y 5 acciones concretas, medibles y en imperativo, una por línea, ' +
  'sin numerar ni explicar. Alinéalas con mi Norte y el método Polaris.';

const SESSION_NOTES_INSTRUCTION =
  'A partir de la TRANSCRIPCIÓN de mi sesión de mentoría, produce DOS bloques separados ' +
  'EXACTAMENTE por una línea con el separador `===PLAN===`.\n' +
  'BLOQUE 1 (antes del separador): NOTAS DE SESIÓN estructuradas y breves — qué se trabajó, ' +
  'insights clave, obstáculos y compromisos. Usa viñetas con `- `.\n' +
  'BLOQUE 2 (después del separador): el PLAN DE ACCIÓN para la próxima semana. ' +
  PLAN_PROMPT_TAIL;

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useMentorship() {
  const { state, protocolDay, userId } = useLifeFlow();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [plan, setPlan] = useState<ActionItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Pipeline de grabación
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>('idle');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const recordingRef = useRef<ExpoRecording | null>(null);

  const audioAvailable = Platform.OS !== 'web' && loadAudio() !== null;

  // ── Hidratar: cache local primero (rápido), luego Supabase (fuente de verdad) ──
  useEffect(() => {
    let alive = true;
    (async () => {
      const [n, p] = await Promise.all([
        readLocal<SessionNote[]>(NOTES_KEY),
        readLocal<ActionItem[]>(PLAN_KEY),
      ]);
      if (!alive) return;
      if (n) setNotes(n);
      if (p) setPlan(p);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  // ── Sincronizar desde Supabase cuando hay sesión autenticada ──────────────────
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      setSyncing(true);
      try {
        const { data, error } = await sessionsTable()
          .select('id,user_id,week,session_date,audio_url,transcript,notes,action_plan,created_at')
          .eq('user_id', userId)
          .order('session_date', { ascending: false })
          .order('created_at', { ascending: false });
        if (!alive || error || !Array.isArray(data)) return;
        const rows = data as SessionRow[];
        const remoteNotes = rows.map(rowToNote);
        const remotePlan = rowsToPlan(rows);
        setNotes(remoteNotes);
        writeLocal(NOTES_KEY, remoteNotes).catch(() => {});
        // Conserva acciones manuales locales (no viven en filas IA) y reemplaza las IA.
        setPlan((prev) => {
          const manual = prev.filter((it) => it.source === 'manual');
          const next = [...remotePlan, ...manual];
          writeLocal(PLAN_KEY, next).catch(() => {});
          return next;
        });
      } catch {
        /* offline → nos quedamos con la cache local */
      } finally {
        if (alive) setSyncing(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const persistNotes = useCallback((next: SessionNote[]) => {
    setNotes(next);
    writeLocal(NOTES_KEY, next).catch(() => {});
  }, []);
  const persistPlan = useCallback((next: ActionItem[]) => {
    setPlan(next);
    writeLocal(PLAN_KEY, next).catch(() => {});
  }, []);

  // ── Notas de sesión (texto manual) ────────────────────────────────────────────
  const addNote = useCallback(async (week: number, text: string, audioUrl?: string) => {
    if (!text.trim()) return;
    const sessionDate = new Date().toISOString();
    const localId = uid('note');
    const note: SessionNote = {
      id: localId,
      week,
      date: sessionDate,
      notes: text.trim(),
      audioUrl: audioUrl?.trim() || undefined,
    };
    // Optimista en local
    persistNotes([note, ...notes]);

    if (!userId) return;
    try {
      const { data } = await sessionsTable()
        .insert({
          user_id: userId,
          week,
          session_date: sessionDate.split('T')[0],
          audio_url: note.audioUrl ?? null,
          notes: note.notes,
          action_plan: [],
        })
        .select('id')
        .single();
      const newId = (data as { id?: string } | null)?.id;
      if (newId) {
        // Reemplaza el id local por el de Supabase (sin tocar el resto).
        setNotes((prev) => {
          const next = prev.map((n) => (n.id === localId ? { ...n, id: newId } : n));
          writeLocal(NOTES_KEY, next).catch(() => {});
          return next;
        });
      }
    } catch {
      /* queda persistida localmente; se reconciliará en el próximo sync */
    }
  }, [notes, persistNotes, userId]);

  const removeNote = useCallback(async (id: string) => {
    persistNotes(notes.filter((n) => n.id !== id));
    if (!userId) return;
    try {
      await sessionsTable().delete().eq('id', id).eq('user_id', userId);
    } catch { /* ignore */ }
  }, [notes, persistNotes, userId]);

  // ── Plan de acción ────────────────────────────────────────────────────────────
  const toggleItem = useCallback((id: string) => {
    persistPlan(plan.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }, [plan, persistPlan]);

  const addManualItem = useCallback((text: string) => {
    if (!text.trim()) return;
    const item: ActionItem = {
      id: uid('man'),
      week: currentWeekNumber(protocolDay),
      text: text.trim(),
      done: false,
      source: 'manual',
    };
    persistPlan([item, ...plan]);
  }, [plan, protocolDay, persistPlan]);

  const removeItem = useCallback((id: string) => {
    persistPlan(plan.filter((it) => it.id !== id));
  }, [plan, persistPlan]);

  /**
   * Norman lee las sesiones persistidas (notas + transcripciones) y construye el
   * plan de acción de la semana. Persiste el plan en la fila de sesión más
   * reciente de la semana actual.
   */
  const generatePlan = useCallback(async () => {
    if (generating) return;
    if (notes.length === 0) return;
    setGenerating(true);
    try {
      const sourceText = notes
        .slice(0, 12)
        .map((n) => {
          const body = n.transcript?.trim()
            ? `${n.notes}\n(transcripción) ${n.transcript}`
            : n.notes;
          return `Semana ${n.week}: ${body}`;
        })
        .join('\n');

      const ctx = buildContext(state, protocolDay);
      const prompt =
        'A partir de estas notas/transcripciones de mis sesiones de mentoría, ' +
        'construye mi PLAN DE ACCIÓN para la próxima semana. ' +
        PLAN_PROMPT_TAIL +
        '\n\nSESIONES:\n' + sourceText;

      let out = '';
      await streamMentorResponse(ctx, prompt, [], (delta) => { out += delta; });

      const wk = currentWeekNumber(protocolDay);
      const items: ActionItem[] = parseAIList(out).map((text) => ({
        id: uid('ia'),
        week: wk,
        text,
        done: false,
        source: 'ia' as const,
      }));

      if (items.length) {
        // Reemplaza el plan IA previo de la semana actual, conserva lo manual.
        const keep = plan.filter((it) => !(it.source === 'ia' && it.week === wk));
        persistPlan([...items, ...keep]);
        // Persiste el plan en la fila de sesión más reciente de esta semana (si existe).
        if (userId) {
          const target = notes.find((n) => n.week === wk);
          if (target) {
            const payload = items.map((it) => ({ text: it.text, week: it.week, source: 'ia' as const }));
            try {
              await sessionsTable()
                .update({ action_plan: payload })
                .eq('id', target.id)
                .eq('user_id', userId);
            } catch { /* ignore */ }
          }
        }
      }
    } finally {
      setGenerating(false);
    }
  }, [generating, notes, plan, state, protocolDay, userId, persistPlan]);

  // ── Pipeline de grabación → IA ────────────────────────────────────────────────

  /** Arranca la grabación (asume consentimiento ya otorgado en la UI). */
  const startRecording = useCallback(async (): Promise<boolean> => {
    setRecordingError(null);
    const Audio = loadAudio();
    if (!Audio) {
      setRecordingError('La grabación no está disponible en este dispositivo.');
      setRecordingPhase('error');
      return false;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setRecordingError('Permiso de micrófono denegado.');
        setRecordingPhase('error');
        return false;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const preset = Audio.RecordingOptionsPresets?.HIGH_QUALITY;
      const { recording } = await Audio.Recording.createAsync(preset);
      recordingRef.current = recording;
      setRecordingPhase('recording');
      return true;
    } catch (e) {
      setRecordingError((e as Error)?.message ?? 'No se pudo iniciar la grabación.');
      setRecordingPhase('error');
      return false;
    }
  }, []);

  /**
   * Detiene la grabación y corre el pipeline: subir → transcribir → Norman.
   * Deja el resultado en `draft` para que el usuario lo edite antes de confirmar.
   */
  const stopRecordingAndProcess = useCallback(async (week: number): Promise<void> => {
    const rec = recordingRef.current;
    if (!rec) return;
    const sessionId = uid('sess').replace(/[^a-zA-Z0-9-]/g, '');
    try {
      await rec.stopAndUnloadAsync();
      const localUri = rec.getURI();
      recordingRef.current = null;
      if (!localUri) throw new Error('No se obtuvo el audio grabado.');

      // 1) Subir a Storage: mentorship-audio/{userId}/{sessionId}.m4a
      setRecordingPhase('uploading');
      let audioUrl: string | undefined;
      if (userId) {
        try {
          const path = `${userId}/${sessionId}.m4a`;
          const fileBlob = await fetch(localUri).then((r) => r.blob());
          const { error: upErr } = await audioBucket().upload(path, fileBlob, {
            contentType: 'audio/m4a',
            upsert: true,
          });
          if (!upErr) audioUrl = path;
        } catch {
          /* la subida puede fallar (bucket no creado aún); seguimos con el local */
        }
      }

      // 2) Transcribir (Whisper) — con retry interno (3 intentos). Si falla
      //    definitivamente, NO perdemos la sesión: abrimos el editor de notas
      //    manuales con el audio ya guardado.
      setRecordingPhase('transcribing');
      let transcript: string;
      try {
        transcript = await transcribeAudio(localUri, { language: 'es' });
      } catch (txErr) {
        console.warn('[Mentoría] transcripción falló tras reintentos → notas manuales:', txErr);
        setDraft({
          sessionId, week, audioUrl,
          transcript: '',
          notes: '',
          actions: [],
          transcriptionFailed: true,
        });
        setRecordingPhase('idle');
        return;
      }

      // 3) Norman redacta notas + plan. Si la IA falla, degradamos a la
      //    transcripción cruda como notas (la sesión nunca se pierde).
      setRecordingPhase('summarizing');
      let draftNotes = transcript.slice(0, 800);
      let actions: string[] = [];
      try {
        const ctx = buildContext(state, protocolDay);
        let out = '';
        await streamMentorResponse(
          ctx,
          `${SESSION_NOTES_INSTRUCTION}\n\nTRANSCRIPCIÓN:\n${transcript}`,
          [],
          (delta) => { out += delta; },
        );
        const [notesPart, planPart = ''] = out.split('===PLAN===');
        draftNotes = notesPart.trim() || transcript.slice(0, 800);
        actions = parseAIList(planPart);
      } catch (aiErr) {
        console.warn('[Mentoría] Norman falló al redactar notas → transcripción cruda:', aiErr);
      }

      setDraft({ sessionId, week, audioUrl, transcript, notes: draftNotes, actions });
      setRecordingPhase('idle');
    } catch (e) {
      try { await recordingRef.current?.stopAndUnloadAsync(); } catch { /* ignore */ }
      recordingRef.current = null;
      setRecordingError((e as Error)?.message ?? 'Falló el procesamiento del audio.');
      setRecordingPhase('error');
    }
  }, [state, protocolDay, userId]);

  /** Cancela la grabación en curso sin procesar. */
  const cancelRecording = useCallback(async () => {
    try { await recordingRef.current?.stopAndUnloadAsync(); } catch { /* ignore */ }
    recordingRef.current = null;
    setRecordingPhase('idle');
    setRecordingError(null);
  }, []);

  /** Edita el borrador (notas/acciones) antes de confirmar. */
  const updateDraft = useCallback((patch: Partial<Pick<SessionDraft, 'notes' | 'actions'>>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const discardDraft = useCallback(() => setDraft(null), []);

  /**
   * Confirma el borrador: persiste la sesión (transcript + notes + action_plan)
   * en `mentorship_sessions` y vuelca las acciones al plan de la semana.
   */
  const confirmDraft = useCallback(async (): Promise<void> => {
    const d = draft;
    if (!d) return;
    const sessionDate = new Date().toISOString();
    const actionPayload = d.actions
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ text, week: d.week, source: 'ia' as const }));

    // Persistir en Supabase (fuente de verdad) y capturar el id real.
    let rowId = d.sessionId;
    if (userId) {
      try {
        const { data } = await sessionsTable()
          .insert({
            user_id: userId,
            week: d.week,
            session_date: sessionDate.split('T')[0],
            audio_url: d.audioUrl ?? null,
            transcript: d.transcript,
            notes: d.notes,
            action_plan: actionPayload,
          })
          .select('id')
          .single();
        const newId = (data as { id?: string } | null)?.id;
        if (newId) rowId = newId;
      } catch {
        /* offline → se guarda solo local; reconciliará en el próximo sync */
      }
    }

    const note: SessionNote = {
      id: rowId,
      week: d.week,
      date: sessionDate,
      notes: d.notes,
      audioUrl: d.audioUrl,
      transcript: d.transcript,
    };
    persistNotes([note, ...notes]);

    const items: ActionItem[] = actionPayload.map((a) => ({
      id: uid('ia'),
      week: a.week,
      text: a.text,
      done: false,
      source: 'ia' as const,
    }));
    if (items.length) {
      const keep = plan.filter((it) => !(it.source === 'ia' && it.week === d.week));
      persistPlan([...items, ...keep]);
    }

    // ── Memory OS: la sesión alimenta el resumen unificado + el perfil vivo ──────
    // Las notas YA son el resumen estructurado de Norman → no re-resumimos; sí
    // sintetizamos el perfil (un solo paso IA, fire-and-forget).
    if (userId) {
      const parsed = {
        summary: d.notes,
        key_topics: [] as string[],
        commitments: d.actions.map((a) => a.trim()).filter(Boolean),
        unresolved_questions: [] as string[],
        emotional_tone: '',
        suggested_next_focus: '',
      };
      void insertSummary({ user_id: userId, source_type: 'mentorship', source_id: rowId, ...parsed });
      void updateProfileFromSummary(userId, makeMinimalContext(), parsed);
      // Automatización: el plan de acción se materializa como tareas operativas.
      void createTasksFromActionPlan(userId, parsed.commitments, d.week);

      // ── Loop de accountability 24h: tras comprometerse, mañana Polaris pregunta ─
      // si lo ejecutó. Native-only (web = no-op); fire-and-forget, no bloquea el flujo.
      if (parsed.commitments.length > 0 && Platform.OS !== 'web') {
        void (async () => {
          try {
            const granted = await requestNotificationPermissions();
            if (!granted) return;
            await scheduleAccountabilityFollowup({
              title: 'ACCOUNTABILITY',
              body:  'Ayer te comprometiste. ¿Lo ejecutaste hoy?',
              route: '/perfil/cliente',
            });
          } catch { /* no crítico — el prompt in-app cubre la entrega */ }
        })();
      }
    }

    setDraft(null);
  }, [draft, notes, plan, userId, persistNotes, persistPlan]);

  return {
    loaded,
    syncing,
    notes,
    plan,
    generating,
    addNote,
    removeNote,
    toggleItem,
    addManualItem,
    removeItem,
    generatePlan,

    // Grabación → IA
    audioAvailable,
    recordingPhase,
    recordingError,
    draft,
    startRecording,
    stopRecordingAndProcess,
    cancelRecording,
    updateDraft,
    discardDraft,
    confirmDraft,
  };
}
