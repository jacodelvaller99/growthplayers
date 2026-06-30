/**
 * Render smoke test del hub de Bienestar (Ola 1: "HOY" + "Ver todo").
 * El gate (tsc/jest/export) no renderiza pantallas → este test monta el hub en
 * ambos layouts (móvil + desktop) y verifica que renderiza sin throw. Cierra la
 * clase de bug que dejó pasar el crash del chat.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

// Variable mutable para alternar layout (jest permite vars con prefijo "mock").
let mockIsDesktop = false;

jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ state: { wellnessSessions: [] } }),
}));
jest.mock('@/lib/wearables', () => ({
  useWearableConnections: () => ({ connections: [] }),
  useWearableDaily: () => ({ today: null }),
  recoveryLabel: () => 'Sin datos',
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: jest.fn() }, from: () => ({ insert: jest.fn() }) },
}));
// polaris.tsx importa @shopify/react-native-skia (falla en jest). Stub de los
// componentes que usa el hub — mi lógica de HOY/Ver-todo se renderiza real.
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLib = require('react');
  return {
    GoldDivider: ({ label }: { label?: string }) => ReactLib.createElement(RN.Text, null, label),
    PremiumCard: ({ children }: { children?: React.ReactNode }) => ReactLib.createElement(RN.View, null, children),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BienestarHub = require('@/app/bienestar/index').default;

describe('BienestarHub — render smoke (HOY + Ver todo)', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<BienestarHub />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<BienestarHub />)).not.toThrow();
  });
});
