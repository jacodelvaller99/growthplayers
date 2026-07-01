/**
 * Render smoke test del Perfil Soberano hub (loop de pulido, iteración 33).
 * Score hero + tier + progreso + stats + arquetipos + nav rows + compartir.
 * Deja correr las utils puras de score. Monta sin throw. Platform=web.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

(Platform as { OS: string }).OS = 'web';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: {
      profile: { name: 'Ana Pérez', role: 'Fundadora' },
      northStar: { identity: 'Construir con calma y foco.' },
      checkIns: [],
      completedLessons: [],
      completedTasks: {},
      wellnessSessions: [],
    },
    protocolDay: 12,
    averages: { energy: 7, clarity: 6, stress: 4, sleep: 7 },
  }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: V,
    ProgressCard: () => R.createElement(RN.View),
    SovereignDeltaTag: () => R.createElement(RN.View),
    SovereignScore: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PerfilSoberanoScreen = require('@/app/perfil/index').default;

describe('PerfilSoberanoScreen — render smoke', () => {
  it('score hero + progreso + stats + nav + compartir renderiza sin throw', () => {
    expect(() => render(<PerfilSoberanoScreen />)).not.toThrow();
  });
});
