/**
 * Render smoke test del overview de Módulo (loop de pulido, iteración 36).
 * Hero + progreso + lista de lecciones (bloqueada/activa/completada) + CTA + teaser.
 * Usa el catálogo real POLARIS_MODULES. Monta sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: undefined }), // → cae al primer módulo (fallback)
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ state: { completedLessons: [] } }) }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AppHeader: () => R.createElement(RN.View),
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: V,
    PrimaryButton: Btn,
    SecondaryButton: Btn,
    ProgressCard: () => R.createElement(RN.View),
    StatusPill: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ModuleDetailScreen = require('@/app/module/[id]').default;

describe('ModuleDetailScreen — render smoke', () => {
  it('hero + lecciones + CTA renderiza sin throw', () => {
    expect(() => render(<ModuleDetailScreen />)).not.toThrow();
  });
});
