/**
 * Render smoke test del Espacio del Mentor (modo simple, un cliente).
 * (1) Monta, carga y muestra la semana + el placeholder del editor sin throw.
 * (2) Teclear → avanzar el debounce (fake timers) → adminUpsertSessionNote se
 *     llama UNA vez con {week, text} → aparece GUARDADO ✓.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'u1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ userId: 'admin1', state: { profile: { name: 'Coach' } } }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return {
    PremiumCard: V,
    StatusPill: ({ label }: { label: string }) => R.createElement(RN.Text, null, label),
    useScreen: () => ({ root: {}, content: {}, isDesktop: false, isTablet: false }),
  };
});
// created_at = protocol_start_date; "ahora mismo" fuerza día 1 → SEMANA 1 sin
// importar en qué fecha real corra el test (deskWeek no usa fake timers aquí).
jest.mock('@/lib/admin/queries', () => ({
  fetchUserDetail: jest.fn().mockResolvedValue({ id: 'u1', name: 'Ana', email: '', created_at: new Date().toISOString() }),
  fetchUserMentorship: jest.fn().mockResolvedValue({ sessions: [], tasks: [] }),
  fetchUserMemory: jest.fn().mockResolvedValue({ profile: null, summaries: [], briefing: null, notes: [] }),
}));
jest.mock('@/lib/mentorExecution', () => ({
  fetchUserExecution: jest.fn().mockResolvedValue({ tasks: [], scores: null, reviews: [], prep: null }),
  updateTask: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/mentorExecutionLogic', () => ({
  deriveStatus: jest.fn().mockReturnValue('not_started'),
}));
jest.mock('@/components/memory', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = () => R.createElement(RN.View);
  return { AdminBriefingCard: V, ProfileSynopsisCard: V, ConversationTimeline: V };
});
jest.mock('@/lib/adminCopilot', () => ({
  streamClientDesk: jest.fn().mockResolvedValue(''),
}));
jest.mock('@/lib/admin/actions', () => ({
  adminUpdateActionPlan: jest.fn().mockResolvedValue({ success: true }),
  adminUpsertSessionNote: jest.fn().mockResolvedValue({ success: true, sessionId: 's1' }),
}));
// hooks/use-mentorship (parseAIList/PLAN_PROMPT_TAIL) arrastra en su import estático
// memorySummarizer → confrontation → supabase; sin mock, createClient() explota por
// falta de env vars en el proceso de test. Mismo mock-cadena que el dossier.
jest.mock('@/lib/supabase', () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'select', 'eq', 'in', 'order', 'limit', 'update', 'insert', 'maybeSingle', 'single', 'profiles']) c[m] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve);
    return c;
  };
  return { supabase: makeChain(), intel: makeChain(), db: makeChain(), mex: makeChain() };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { adminUpsertSessionNote } = require('@/lib/admin/actions');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MentorDeskScreen = require('@/app/admin/mentor/[id]').default;

describe('MentorDeskScreen (admin) — render smoke', () => {
  it('carga y muestra la semana + el editor sin throw', async () => {
    render(<MentorDeskScreen />);
    await waitFor(() => expect(screen.getByText('SEMANA 1')).toBeTruthy());
    expect(screen.getByPlaceholderText(/Escribe lo de la sesión/)).toBeTruthy();
  });

  it('teclear → debounce → autosave → GUARDADO ✓', async () => {
    jest.useFakeTimers();
    try {
      render(<MentorDeskScreen />);
      await waitFor(() => expect(screen.getByText('SEMANA 1')).toBeTruthy());

      const input = screen.getByPlaceholderText(/Escribe lo de la sesión/);
      fireEvent.changeText(input, 'Trabajamos el plan de la semana.');

      await jest.advanceTimersByTimeAsync(1600);

      expect(adminUpsertSessionNote).toHaveBeenCalledTimes(1);
      expect(adminUpsertSessionNote).toHaveBeenCalledWith(
        expect.objectContaining({ week: 1, text: 'Trabajamos el plan de la semana.' }),
      );
      await waitFor(() => expect(screen.getByText('GUARDADO ✓')).toBeTruthy());
    } finally {
      jest.useRealTimers();
    }
  });
});
