/**
 * Render smoke test del DOSSIER admin (app/admin/usuarios/[id].tsx) — iteración 59.
 * Era el único outlier sin red de render (1364 líneas, ~20 imports pesados);
 * es la pantalla central del Acto 2 de la demo → merece el arnés.
 *
 * Estrategia: los barrels de tarjetas se mockean con un Proxy (cualquier export
 * = componente dummy que renderiza children); el IO se mockea con formas mínimas
 * degradables (el dossier real degrada a vacío por diseño). El test monta el
 * dossier COMPLETO post-carga (sale del spinner) sin throw.
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// ── Barrels de componentes: cualquier export = dummy que renderiza children ──
// jest exige factory inline → cada mock repite el mismo Proxy (via helper global).
/* eslint-disable @typescript-eslint/no-require-imports */
const barrelProxy = () => {
  const RN = require('react-native');
  const R = require('react');
  return new Proxy({}, {
    get: (_t, prop) => {
      if (prop === '__esModule') return true;
      const C = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children ?? null);
      return C;
    },
  });
};
// @ts-expect-error — helper compartido para los factories inline (jest hoisting)
globalThis.__barrelProxy = barrelProxy;
jest.mock('@/components/admin-activity', () => (globalThis as never as { __barrelProxy: () => object }).__barrelProxy());
jest.mock('@/components/memory', () => (globalThis as never as { __barrelProxy: () => object }).__barrelProxy());
jest.mock('@/components/mentor-execution', () => (globalThis as never as { __barrelProxy: () => object }).__barrelProxy());
jest.mock('@/components/biometric', () => (globalThis as never as { __barrelProxy: () => object }).__barrelProxy());
jest.mock('@/components/coach-intelligence', () => (globalThis as never as { __barrelProxy: () => object }).__barrelProxy());
jest.mock('@/components/admin-decision', () => (globalThis as never as { __barrelProxy: () => object }).__barrelProxy());
/* eslint-enable @typescript-eslint/no-require-imports */
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children ?? null);
  return {
    GoldAccentCard: V, GoldDivider: () => R.createElement(RN.View), PremiumCard: V, StatusPill: () => R.createElement(RN.View),
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// ── Router / contexto ─────────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'u1' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'admin-1' }) }));

// ── IO: formas mínimas degradables ────────────────────────────────────────────
jest.mock('@/lib/admin/queries', () => ({
  fetchUserDetail: jest.fn().mockResolvedValue({
    id: 'u1', email: 'ana@x.com', name: 'Ana', role: 'Aprendiz', created_at: '2026-06-01',
    subscription_tier: 'premium', sovereign_score: 640, streak: 4,
    memberships: [], course_access: [],
  }),
  fetchUserEvents: jest.fn().mockResolvedValue([]),
  fetchMentorConversations: jest.fn().mockResolvedValue([]),
  fetchUserCheckIns: jest.fn().mockResolvedValue([]),
  fetchUserMentorship: jest.fn().mockResolvedValue({ sessions: [], tasks: [], notes: [] }),
  fetchUserAuditLog: jest.fn().mockResolvedValue([]),
  fetchUserMemory: jest.fn().mockResolvedValue({ profile: null, summaries: [], briefing: null, notes: [] }),
  fetchUserActivityBundle: jest.fn().mockResolvedValue({
    habits: [], habitLogs: [], fasting: [], body: [], nutrition: [], supplements: [],
    wellnessSessions: [], journal: [], posts: [], comments: [], dmMeta: null,
  }),
}));
jest.mock('@/lib/confrontation', () => ({
  fetchConfrontationItems: jest.fn().mockResolvedValue([]),
  dismissConfrontation: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/memory', () => ({ addAdminNote: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/mentorExecution', () => ({
  fetchUserExecution: jest.fn().mockResolvedValue({ tasks: [], reviews: [], scores: null, interventions: [], prep: null }),
  submitReview: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/biometric', () => ({
  fetchBiometricSnapshot: jest.fn().mockResolvedValue({ insight: null, series: [], connection: null, connections: [] }),
}));
jest.mock('@/lib/coachIntelligence', () => ({
  fetchCoachIntelligence: jest.fn().mockResolvedValue({ ci: null }),
}));
jest.mock('@/lib/weekly-session-generator', () => ({
  generateWeeklySessionIfNeeded: jest.fn().mockResolvedValue({ created: false }),
}));
jest.mock('@/lib/admin/actions', () => ({
  deactivateMembership: jest.fn().mockResolvedValue({ success: true }),
  recalculateUserMLAction: jest.fn().mockResolvedValue({ success: true }),
  sendMessageAsNorman: jest.fn().mockResolvedValue({ success: true }),
  setUserRole: jest.fn().mockResolvedValue({ success: true }),
  updateUserProfile: jest.fn().mockResolvedValue({ success: true }),
  APP_ROLE_LABEL: { member: 'Miembro', admin: 'Admin' },
}));
jest.mock('@/constants/subscriptions', () => ({
  getTierColor: (t: string) => (t === 'premium' ? '#FFC804' : '#888888'),
  getTierLabel: (t: string) => t,
}));
jest.mock('@/lib/supabase', () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'select', 'eq', 'in', 'order', 'limit', 'update', 'insert', 'maybeSingle', 'single', 'profiles']) c[m] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve);
    return c;
  };
  return { supabase: makeChain(), intel: makeChain(), db: makeChain() };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DossierScreen = require('@/app/admin/usuarios/[id]').default;

describe('Dossier admin usuarios/[id] — render smoke', () => {
  it('monta el dossier completo post-carga (11 fetches) sin throw', async () => {
    render(<DossierScreen />);
    // 'Ana' (nombre del detalle) solo aparece cuando salió del spinner y pintó el dossier.
    await waitFor(() => expect(screen.getAllByText(/Ana/).length).toBeGreaterThan(0), { timeout: 5000 });
  });
});
