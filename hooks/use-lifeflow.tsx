import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ACTIVE_MODULE } from '@/data/modules';
import { readLocal, removeLocal, writeLocal } from '@/storage/local';
import type { CheckIn, LifeFlowState, MentorMessage, NorthStar, UserProfile } from '@/types/lifeflow';

const STATE_KEY = 'state';

const defaultNorth: NorthStar = {
  purpose: 'Construir una vida soberana, rentable y fisicamente impecable.',
  identity: 'Soy un empresario que decide con calma, ejecuta con precision y protege su energia.',
  nonNegotiables: ['Entrenar o recuperar el cuerpo', 'Un bloque profundo antes de mensajeria', 'Cerrar una decision importante'],
  dailyReminder: 'No negocio con el ruido. Hoy mando desde criterio, no desde urgencia.',
};

const defaultState: LifeFlowState = {
  onboardingCompleted: false,
  protocolStartDate: new Date().toISOString(),
  activeProgramId: 'protocolo-soberano',
  activeModuleId: ACTIVE_MODULE.id,
  profile: {
    name: 'Juan Carlos',
    role: 'Empresario',
  },
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

type LifeFlowContextValue = {
  state: LifeFlowState;
  isLoaded: boolean;
  protocolDay: number;
  latestCheckIn: CheckIn | null;
  todayCheckIn: CheckIn | null;
  averages: { energy: number; clarity: number; stress: number; sleep: number };
  completeOnboarding: (payload: { profile: UserProfile; northStar: NorthStar; activeProgramId: string }) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateNorthStar: (northStar: NorthStar) => Promise<void>;
  saveCheckIn: (checkIn: Omit<CheckIn, 'id' | 'date'>) => Promise<void>;
  sendMentorMessage: (text: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  clearData: () => Promise<void>;
};

const LifeFlowContext = createContext<LifeFlowContextValue | null>(null);

function diffDays(fromIso: string) {
  const from = new Date(fromIso);
  const now = new Date();
  const ms = now.getTime() - from.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

function average(items: number[]) {
  if (!items.length) {
    return 0;
  }
  return Math.round(items.reduce((sum, item) => sum + item, 0) / items.length);
}

function isSameDay(a: string, b: Date) {
  const date = new Date(a);
  return date.toDateString() === b.toDateString();
}

function mentorReply(text: string, state: LifeFlowState, latest: CheckIn | null) {
  const lower = text.toLowerCase();
  const energy = latest?.energy ?? 6;
  const clarity = latest?.clarity ?? 6;
  const stress = latest?.stress ?? 5;

  if (lower.includes('norte')) {
    return `Tu norte hoy: ${state.northStar.purpose} Traduccion operativa: una accion visible, una conversacion pendiente y cero fuga de atencion.`;
  }

  if (lower.includes('practica')) {
    return stress >= 7
      ? 'Practica: 6 minutos de respiracion nasal, luego escribe la decision que estas evitando. No busques motivacion; busca cierre.'
      : 'Practica: bloque de 45 minutos con una sola salida medible. Al terminar registra friccion, energia y siguiente movimiento.';
  }

  if (lower.includes('ordena') || lower.includes('dia')) {
    return `Orden del dia: 1) Check-in completo. 2) Leccion activa del modulo ${ACTIVE_MODULE.number}. 3) Bloque mercader profundo. 4) Cierre con evidencia.`;
  }

  if (energy <= 5) {
    return 'Tu sistema esta bajo de energia. Reduce amplitud, no ambicion: una prioridad, recuperacion activa y una decision cerrada antes de abrir nuevos frentes.';
  }

  if (clarity <= 5) {
    return 'La claridad esta baja. Escribe tres opciones, elimina dos y ejecuta la que tenga mayor retorno con menor friccion. Hoy no necesitas mas variables.';
  }

  return 'Estado util para ejecucion. Mantente en modo mercader: protege atencion, convierte tiempo en avance visible y cierra el dia con evidencia.';
}

export function LifeFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LifeFlowState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    readLocal<LifeFlowState>(STATE_KEY)
      .then((saved) => {
        if (saved) {
          setState(saved);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const persist = useCallback(async (next: LifeFlowState) => {
    setState(next);
    await writeLocal(STATE_KEY, next);
  }, []);

  const latestCheckIn = useMemo(() => state.checkIns[0] ?? null, [state.checkIns]);
  const todayCheckIn = useMemo(() => state.checkIns.find((item) => isSameDay(item.date, new Date())) ?? null, [state.checkIns]);
  const protocolDay = useMemo(() => diffDays(state.protocolStartDate), [state.protocolStartDate]);
  const averages = useMemo(
    () => ({
      energy: average(state.checkIns.map((item) => item.energy)),
      clarity: average(state.checkIns.map((item) => item.clarity)),
      stress: average(state.checkIns.map((item) => item.stress)),
      sleep: average(state.checkIns.map((item) => item.sleep)),
    }),
    [state.checkIns]
  );

  const completeOnboarding = useCallback(
    async (payload: { profile: UserProfile; northStar: NorthStar; activeProgramId: string }) => {
      await persist({
        ...state,
        onboardingCompleted: true,
        protocolStartDate: new Date().toISOString(),
        profile: payload.profile,
        northStar: payload.northStar,
        activeProgramId: payload.activeProgramId,
      });
    },
    [persist, state]
  );

  const updateProfile = useCallback(async (profile: UserProfile) => persist({ ...state, profile }), [persist, state]);
  const updateNorthStar = useCallback(async (northStar: NorthStar) => persist({ ...state, northStar }), [persist, state]);

  const saveCheckIn = useCallback(
    async (checkIn: Omit<CheckIn, 'id' | 'date'>) => {
      const nextCheckIn: CheckIn = {
        ...checkIn,
        id: `${Date.now()}`,
        date: new Date().toISOString(),
      };
      const next = { ...state, checkIns: [nextCheckIn, ...state.checkIns.filter((item) => !isSameDay(item.date, new Date()))] };
      await persist(next);
    },
    [persist, state]
  );

  const sendMentorMessage = useCallback(
    async (text: string) => {
      const userMessage: MentorMessage = { id: `u-${Date.now()}`, role: 'user', text, createdAt: new Date().toISOString() };
      const response: MentorMessage = {
        id: `m-${Date.now()}`,
        role: 'mentor',
        text: mentorReply(text, state, latestCheckIn),
        createdAt: new Date().toISOString(),
      };
      await persist({ ...state, mentorMessages: [...state.mentorMessages, userMessage, response] });
    },
    [latestCheckIn, persist, state]
  );

  const resetOnboarding = useCallback(async () => persist({ ...state, onboardingCompleted: false }), [persist, state]);
  const clearData = useCallback(async () => {
    await removeLocal(STATE_KEY);
    setState(defaultState);
  }, []);

  return (
    <LifeFlowContext.Provider
      value={{
        state,
        isLoaded,
        protocolDay,
        latestCheckIn,
        todayCheckIn,
        averages,
        completeOnboarding,
        updateProfile,
        updateNorthStar,
        saveCheckIn,
        sendMentorMessage,
        resetOnboarding,
        clearData,
      }}>
      {children}
    </LifeFlowContext.Provider>
  );
}

export function useLifeFlow() {
  const context = useContext(LifeFlowContext);
  if (!context) {
    throw new Error('useLifeFlow must be used inside LifeFlowProvider');
  }
  return context;
}
