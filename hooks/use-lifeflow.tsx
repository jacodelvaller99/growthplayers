import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ACTIVE_MODULE } from '@/data/modules';
import { supabase, type DbCheckIn, type DbMentorMessage, type DbNorthStar, type DbProfile } from '@/lib/supabase';
import { diffDays } from '@/lib/utils';
import { readLocal, removeLocal, writeLocal } from '@/storage/local';
import { initRevenueCat, checkSubscription } from '@/services/revenuecat';
import type { CheckIn, LifeFlowState, MentorMessage, NorthStar, UserProfile } from '@/types/lifeflow';

// ─── Local cache key ──────────────────────────────────────────────────────────
const STATE_KEY = 'state';

// ─── Default values ──────────────────────────────────────────────────────────
const defaultNorth: NorthStar = {
  purpose: 'Construir una vida soberana, rentable y fisicamente impecable.',
  identity: 'Soy un empresario que decide con calma, ejecuta con precision y protege su energia.',
  nonNegotiables: [
    'Entrenar o recuperar el cuerpo',
    'Un bloque profundo antes de mensajeria',
    'Cerrar una decision importante',
  ],
  dailyReminder: 'No negocio con el ruido. Hoy mando desde criterio, no desde urgencia.',
};

const defaultState: LifeFlowState = {
  onboardingCompleted: false,
  protocolStartDate: new Date().toISOString(),
  activeProgramId: 'protocolo-soberano',
  activeModuleId: ACTIVE_MODULE.id,
  profile: { name: 'Juan Carlos', role: 'Empresario' },
  northStar: defaultNorth,
  checkIns: [],
  mentorMessages: [
    {
      id: 'seed-mentor',
      role: 'mentor',
      text: 'Estoy leyendo tu protocolo. Haz check-in y te devuelvo una instruccion operativa para hoy.',
      createdAt: new Date().toISOString(),
    },
  ],
};

// ─── Context type ─────────────────────────────────────────────────────────────
type LifeFlowContextValue = {
  state: LifeFlowState;
  isLoaded: boolean;
  isSubscribed: boolean;
  protocolDay: number;
  latestCheckIn: CheckIn | null;
  todayCheckIn: CheckIn | null;
  averages: { energy: number; clarity: number; stress: number; sleep: number };
  completeOnboarding: (payload: {
    profile: UserProfile;
    northStar: NorthStar;
    activeProgramId: string;
  }) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateNorthStar: (northStar: NorthStar) => Promise<void>;
  saveCheckIn: (checkIn: Omit<CheckIn, 'id' | 'date'>) => Promise<void>;
  sendMentorMessage: (text: string) => Promise<void>;
  /** Persiste un par user+mentor ya generados (uso: streaming en mentor.tsx). */
  addMentorMessages: (userMsg: MentorMessage, mentorMsg: MentorMessage) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  clearData: () => Promise<void>;
};

const LifeFlowContext = createContext<LifeFlowContextValue | null>(null);

// ─── Pure helpers ─────────────────────────────────────────────────────────────
// diffDays is imported from @/lib/utils

function average(items: number[]) {
  if (!items.length) return 0;
  return Math.round(items.reduce((s, n) => s + n, 0) / items.length);
}

function isSameDay(a: string, b: Date) {
  return new Date(a).toDateString() === b.toDateString();
}

function todayDateStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// ─── Mentor IA (keyword-based, sin API externa aún) ──────────────────────────
function mentorReply(text: string, state: LifeFlowState, latest: CheckIn | null): string {
  const lower = text.toLowerCase();
  const energy  = latest?.energy  ?? 6;
  const clarity = latest?.clarity ?? 6;
  const stress  = latest?.stress  ?? 5;

  if (lower.includes('norte'))
    return `Tu norte hoy: ${state.northStar.purpose} — Traduccion operativa: una accion visible, una conversacion pendiente y cero fuga de atencion.`;

  if (lower.includes('practica'))
    return stress >= 7
      ? 'Practica: 6 minutos de respiracion nasal, luego escribe la decision que estas evitando. No busques motivacion; busca cierre.'
      : 'Practica: bloque de 45 minutos con una sola salida medible. Al terminar registra friccion, energia y siguiente movimiento.';

  if (lower.includes('ordena') || lower.includes('dia'))
    return `Orden del dia: 1) Check-in completo. 2) Leccion activa del modulo ${ACTIVE_MODULE.number}. 3) Bloque mercader profundo. 4) Cierre con evidencia.`;

  if (energy <= 5)
    return 'Tu sistema esta bajo de energia. Reduce amplitud, no ambicion: una prioridad, recuperacion activa y una decision cerrada antes de abrir nuevos frentes.';

  if (clarity <= 5)
    return 'La claridad esta baja. Escribe tres opciones, elimina dos y ejecuta la que tenga mayor retorno con menor friccion. Hoy no necesitas mas variables.';

  return 'Estado util para ejecucion. Mantente en modo mercader: protege atencion, convierte tiempo en avance visible y cierra el dia con evidencia.';
}

// ─── Supabase → LifeFlowState ─────────────────────────────────────────────────
function mapRemoteToState(
  profile: DbProfile,
  northStar: DbNorthStar | null,
  checkIns: DbCheckIn[],
  mentorMessages: DbMentorMessage[],
): LifeFlowState {
  return {
    onboardingCompleted: profile.onboarding_completed,
    protocolStartDate:   profile.protocol_start_date,
    activeProgramId:     profile.active_program_id,
    activeModuleId:      profile.active_module_id,
    profile: {
      name: profile.name,
      role: profile.role,
    },
    northStar: northStar
      ? {
          purpose:         northStar.purpose,
          identity:        northStar.identity,
          nonNegotiables:  northStar.non_negotiables ?? [],
          dailyReminder:   northStar.daily_reminder,
        }
      : defaultNorth,
    checkIns: checkIns.map((c) => ({
      id:         c.id,
      date:       c.date,
      energy:     c.energy,
      clarity:    c.clarity,
      stress:     c.stress,
      sleep:      c.sleep,
      systemNeed: c.system_need,
    })),
    mentorMessages:
      mentorMessages.length > 0
        ? mentorMessages.map((m) => ({
            id:        m.id,
            role:      m.role,
            text:      m.text,
            createdAt: m.created_at,
          }))
        : defaultState.mentorMessages,
  };
}

// ─── Load all user data from Supabase ────────────────────────────────────────
async function loadFromSupabase(uid: string): Promise<LifeFlowState | null> {
  const [
    { data: profile, error: profileError },
    { data: northStar },
    { data: checkIns },
    { data: mentorMessages },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single<DbProfile>(),
    supabase
      .from('north_stars')
      .select('*')
      .eq('user_id', uid)
      .single<DbNorthStar>(),
    supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .returns<DbCheckIn[]>(),
    supabase
      .from('mentor_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
      .returns<DbMentorMessage[]>(),
  ]);

  if (profileError || !profile) return null;

  return mapRemoteToState(
    profile,
    northStar ?? null,
    checkIns  ?? [],
    mentorMessages ?? [],
  );
}

// ─── Migrate local storage → Supabase (primer sync) ──────────────────────────
async function migrateLocalToSupabase(uid: string, s: LifeFlowState) {
  // Profile
  await supabase.from('profiles').upsert({
    id:                   uid,
    name:                 s.profile.name,
    role:                 s.profile.role,
    onboarding_completed: s.onboardingCompleted,
    protocol_start_date:  s.protocolStartDate,
    active_program_id:    s.activeProgramId,
    active_module_id:     s.activeModuleId,
  });

  // North star
  await supabase.from('north_stars').upsert({
    user_id:          uid,
    purpose:          s.northStar.purpose,
    identity:         s.northStar.identity,
    non_negotiables:  s.northStar.nonNegotiables,
    daily_reminder:   s.northStar.dailyReminder,
  });

  // Check-ins
  for (const c of s.checkIns) {
    await supabase.from('check_ins').upsert(
      {
        id:          c.id,
        user_id:     uid,
        date:        c.date.split('T')[0],
        energy:      c.energy,
        clarity:     c.clarity,
        stress:      c.stress,
        sleep:       c.sleep,
        system_need: c.systemNeed,
      },
      { onConflict: 'user_id,date' },
    );
  }

  // Mentor messages (skip seed)
  const realMessages = s.mentorMessages.filter((m) => m.id !== 'seed-mentor');
  if (realMessages.length > 0) {
    await supabase.from('mentor_messages').upsert(
      realMessages.map((m) => ({
        id:         m.id,
        user_id:    uid,
        role:       m.role,
        text:       m.text,
        created_at: m.createdAt,
      })),
    );
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LifeFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState]       = useState<LifeFlowState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const uidRef = useRef<string | null>(null);

  // ── Init: Auth + load ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Obtener sesión existente o crear sesión anónima
      const { data: { session } } = await supabase.auth.getSession();
      let uid = session?.user?.id ?? null;

      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.user) uid = data.user.id;
      }

      if (uid) {
        uidRef.current = uid;

        // 2. Inicializar RevenueCat y verificar suscripción
        try {
          await initRevenueCat();
          const subscribed = await checkSubscription();
          if (mounted) setIsSubscribed(subscribed);
        } catch {
          // ignore – default is false
        }

        // 3. Intentar cargar desde Supabase
        const remote = await loadFromSupabase(uid);

        if (remote) {
          if (mounted) {
            setState(remote);
            writeLocal(STATE_KEY, remote); // actualizar caché local
          }
          if (mounted) setIsLoaded(true);
          return;
        }

        // 4. No hay datos en Supabase → cargar local y migrar
        const local = await readLocal<LifeFlowState>(STATE_KEY);
        if (local) {
          if (mounted) setState(local);
          // Migrar en background sin bloquear la UI
          migrateLocalToSupabase(uid, local).catch(console.error);
        }
      } else {
        // 4. Sin auth → solo local
        const local = await readLocal<LifeFlowState>(STATE_KEY);
        if (local && mounted) setState(local);
      }

      if (mounted) setIsLoaded(true);
    }

    init().catch(async (err) => {
      console.error('[LifeFlow] init error:', err);
      const local = await readLocal<LifeFlowState>(STATE_KEY);
      if (local && mounted) setState(local);
      if (mounted) setIsLoaded(true);
    });

    return () => { mounted = false; };
  }, []);

  // ── persist: estado local + caché localStorage ───────────────────────────────
  const persist = useCallback(async (next: LifeFlowState) => {
    setState(next);
    await writeLocal(STATE_KEY, next);
  }, []);

  // ── Computed values ──────────────────────────────────────────────────────────
  const latestCheckIn = useMemo(() => state.checkIns[0] ?? null, [state.checkIns]);

  const todayCheckIn = useMemo(
    () => state.checkIns.find((c) => isSameDay(c.date, new Date())) ?? null,
    [state.checkIns],
  );

  const protocolDay = useMemo(
    () => diffDays(state.protocolStartDate),
    [state.protocolStartDate],
  );

  const averages = useMemo(
    () => ({
      energy:  average(state.checkIns.map((c) => c.energy)),
      clarity: average(state.checkIns.map((c) => c.clarity)),
      stress:  average(state.checkIns.map((c) => c.stress)),
      sleep:   average(state.checkIns.map((c) => c.sleep)),
    }),
    [state.checkIns],
  );

  // ── Actions ──────────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(
    async (payload: { profile: UserProfile; northStar: NorthStar; activeProgramId: string }) => {
      const now = new Date().toISOString();
      const next: LifeFlowState = {
        ...state,
        onboardingCompleted: true,
        protocolStartDate:   now,
        profile:             payload.profile,
        northStar:           payload.northStar,
        activeProgramId:     payload.activeProgramId,
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      // Upsert profile + north star en paralelo
      await Promise.all([
        supabase.from('profiles').upsert({
          id:                   uid,
          name:                 payload.profile.name,
          role:                 payload.profile.role,
          onboarding_completed: true,
          protocol_start_date:  now,
          active_program_id:    payload.activeProgramId,
          active_module_id:     state.activeModuleId,
        }),
        supabase.from('north_stars').upsert({
          user_id:         uid,
          purpose:         payload.northStar.purpose,
          identity:        payload.northStar.identity,
          non_negotiables: payload.northStar.nonNegotiables,
          daily_reminder:  payload.northStar.dailyReminder,
        }),
      ]);
    },
    [persist, state],
  );

  const updateProfile = useCallback(
    async (profile: UserProfile) => {
      await persist({ ...state, profile });
      const uid = uidRef.current;
      if (!uid) return;
      await supabase
        .from('profiles')
        .update({ name: profile.name, role: profile.role })
        .eq('id', uid);
    },
    [persist, state],
  );

  const updateNorthStar = useCallback(
    async (northStar: NorthStar) => {
      await persist({ ...state, northStar });
      const uid = uidRef.current;
      if (!uid) return;
      await supabase.from('north_stars').upsert({
        user_id:         uid,
        purpose:         northStar.purpose,
        identity:        northStar.identity,
        non_negotiables: northStar.nonNegotiables,
        daily_reminder:  northStar.dailyReminder,
      });
    },
    [persist, state],
  );

  const saveCheckIn = useCallback(
    async (checkIn: Omit<CheckIn, 'id' | 'date'>) => {
      const now     = new Date();
      const dateStr = todayDateStr();
      const id      = `ci-${dateStr}`;

      const nextCheckIn: CheckIn = {
        ...checkIn,
        id,
        date: now.toISOString(),
      };

      const next: LifeFlowState = {
        ...state,
        checkIns: [
          nextCheckIn,
          ...state.checkIns.filter((c) => !isSameDay(c.date, now)),
        ],
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      await supabase.from('check_ins').upsert(
        {
          id,
          user_id:     uid,
          date:        dateStr,
          energy:      checkIn.energy,
          clarity:     checkIn.clarity,
          stress:      checkIn.stress,
          sleep:       checkIn.sleep,
          system_need: checkIn.systemNeed,
        },
        { onConflict: 'user_id,date' },
      );
    },
    [persist, state],
  );

  const sendMentorMessage = useCallback(
    async (text: string) => {
      const now = new Date().toISOString();
      const userMsg: MentorMessage = {
        id:        `u-${Date.now()}`,
        role:      'user',
        text,
        createdAt: now,
      };
      const replyText = mentorReply(text, state, latestCheckIn);
      const mentorMsg: MentorMessage = {
        id:        `m-${Date.now()}`,
        role:      'mentor',
        text:      replyText,
        createdAt: now,
      };

      await persist({
        ...state,
        mentorMessages: [...state.mentorMessages, userMsg, mentorMsg],
      });

      const uid = uidRef.current;
      if (!uid) return;

      await supabase.from('mentor_messages').insert([
        {
          id:         userMsg.id,
          user_id:    uid,
          role:       'user',
          text,
          created_at: userMsg.createdAt,
        },
        {
          id:         mentorMsg.id,
          user_id:    uid,
          role:       'mentor',
          text:       replyText,
          created_at: mentorMsg.createdAt,
        },
      ]);
    },
    [latestCheckIn, persist, state],
  );

  const addMentorMessages = useCallback(
    async (userMsg: MentorMessage, mentorMsg: MentorMessage) => {
      // Mantener como máximo los últimos 20 mensajes en estado local
      const next: LifeFlowState = {
        ...state,
        mentorMessages: [...state.mentorMessages, userMsg, mentorMsg].slice(-20),
      };
      await persist(next);

      const uid = uidRef.current;
      if (!uid) return;

      await supabase.from('mentor_messages').insert([
        {
          id:         userMsg.id,
          user_id:    uid,
          role:       'user',
          text:       userMsg.text,
          created_at: userMsg.createdAt,
        },
        {
          id:         mentorMsg.id,
          user_id:    uid,
          role:       'mentor',
          text:       mentorMsg.text,
          created_at: mentorMsg.createdAt,
        },
      ]);
    },
    [persist, state],
  );

  const resetOnboarding = useCallback(async () => {
    await persist({ ...state, onboardingCompleted: false });
    const uid = uidRef.current;
    if (!uid) return;
    await supabase
      .from('profiles')
      .update({ onboarding_completed: false })
      .eq('id', uid);
  }, [persist, state]);

  const clearData = useCallback(async () => {
    const uid = uidRef.current;
    if (uid) {
      // Borrar todos los datos del usuario en Supabase
      await Promise.all([
        supabase.from('mentor_messages').delete().eq('user_id', uid),
        supabase.from('check_ins').delete().eq('user_id', uid),
        supabase.from('north_stars').delete().eq('user_id', uid),
        supabase.from('profiles').delete().eq('id', uid),
      ]);
      // Cerrar sesión y crear nueva sesión anónima
      await supabase.auth.signOut();
      const { data } = await supabase.auth.signInAnonymously();
      if (data.user) uidRef.current = data.user.id;
    }
    await removeLocal(STATE_KEY);
    setState(defaultState);
  }, []);

  // ── Provider ─────────────────────────────────────────────────────────────────
  return (
    <LifeFlowContext.Provider
      value={{
        state,
        isLoaded,
        isSubscribed,
        protocolDay,
        latestCheckIn,
        todayCheckIn,
        averages,
        completeOnboarding,
        updateProfile,
        updateNorthStar,
        saveCheckIn,
        sendMentorMessage,
        addMentorMessages,
        resetOnboarding,
        clearData,
      }}>
      {children}
    </LifeFlowContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLifeFlow() {
  const context = useContext(LifeFlowContext);
  if (!context) throw new Error('useLifeFlow must be used inside LifeFlowProvider');
  return context;
}
