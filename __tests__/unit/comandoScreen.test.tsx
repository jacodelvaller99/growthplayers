/**
 * Render smoke test del Dashboard/Comando (loop de pulido, iteración 4).
 * Monta mobile + desktop y verifica render sin throw. Es la home: mucho
 * hook + animaciones + SVG → todo mockeado a stubs. La red de seguridad
 * que faltaba cuando un re-render en vivo tumbó el chat.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  // use-jornada relee el log local al enfocar; en el smoke basta el no-op.
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return { __esModule: true, default: RN.View, Svg: RN.View, Circle: RN.View };
});
jest.mock('@/components/AnimatedNumber', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { AnimatedNumber: ({ value }: { value: number }) => R.createElement(RN.Text, null, String(value)) };
});
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children }: { children?: React.ReactNode }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AppHeader: Wrap,
    EditorialPanel: Wrap,
    GoldAccentCard: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      R.createElement(RN.View, { onPress }, children),
    GoldDivider: () => R.createElement(RN.View),
    HoverCard: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      R.createElement(RN.View, { onPress }, children),
    MetricCard: Wrap,
    PremiumCard: Wrap,
    PrimaryButton: Btn,
    ProgressCard: Wrap,
    SovereignDeltaTag: () => R.createElement(RN.View),
    StateMeter: () => R.createElement(RN.View),
    StatusPill: () => R.createElement(RN.View),
    screen: { sectionTitle: {} },
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    protocolDay: 12,
    todayCheckIn: null,
    latestCheckIn: null,
    userId: 'u-test',
    state: {
      // Con `painPoint`/`purpose`/`identity` VACIOS la rama que cita al usuario
      // no se ejecutaba nunca: se podia volver a esconder la frase y la suite
      // seguia verde. Ese fue exactamente el defecto de la ronda 8.
      profile: { name: 'Juan Jacobo', painPoint: 'No logro parar de trabajar' },
      northStar: { purpose: 'Construir sin quemarme', identity: 'Alguien que sostiene', dailyReminder: '' },
      checkIns: [],
      wellnessSessions: [],
      completedLessons: [],
      completedTasks: {},
      mentorMessages: [],
    },
  }),
}));
jest.mock('@/hooks/useUserIntelligence', () => ({
  useUserIntelligence: () => ({
    engagementTier: 'good',
    intelligence: {
      anomaly_detected: false,
      anomaly_type: null,
      churn_risk_label: 'low',
      next_action: null,
      next_action_urgency: 'low',
      next_action_reason: null,
      engagement_score: 0,
    },
  }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: () => ({ user: { totalWellnessMinutes: 0, weeklyActivity: [] } }),
}));
jest.mock('@/lib/wearables', () => ({
  useWearableConnections: () => ({ isConnected: () => false }),
}));
jest.mock('@/lib/weekly-session-generator', () => ({
  generateWeeklySessionIfNeeded: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/supabase', () => ({
  db2: { communityPosts: () => ({ select: () => ({ order: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) },
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          then: (r: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(r),
        }),
        in: () => Promise.resolve({ data: [] }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DashboardScreen = require('@/app/(tabs)/comando').default;

describe('DashboardScreen — render smoke', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<DashboardScreen />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<DashboardScreen />)).not.toThrow();
  });
});

describe('Comando pinta las palabras del usuario, no solo las guarda', () => {
  // POR QUE ESTE BLOQUE: la frase del arco que cita al usuario vivio una ronda
  // entera sin pintarse en ninguna pantalla — los cuatro consumidores pasaban
  // `compact`, que es justo lo que la oculta. El test que se escribio despues
  // prueba el COMPONENTE `ArcHeader`; el defecto era un PROP de esta pantalla.
  // Sin esto, volver a poner `compact` aqui deja los tests verdes.
  it('en escritorio', () => {
    mockIsDesktop = true;
    const { getByText } = render(<DashboardScreen />);
    getByText(/No logro parar de trabajar/);
  });

  it('en movil', () => {
    mockIsDesktop = false;
    const { getByText } = render(<DashboardScreen />);
    getByText(/No logro parar de trabajar/);
  });
});
