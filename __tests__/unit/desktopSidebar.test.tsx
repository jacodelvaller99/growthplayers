/**
 * Render smoke test del DesktopSidebar (Ola 3: navegación en 4 dominios).
 * Monta el sidebar y verifica que renderiza sin throw — la nav es lo más
 * delicado, así que va al gate.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  usePathname: () => '/comando',
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: { checkIns: [], profile: { name: 'Juan' }, subscriptionTier: 'premium_plus' },
    protocolDay: 49,
  }),
}));
jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({ mode: 'dark', setMode: jest.fn(), canToggle: true }),
}));
jest.mock('@/components/PolarisLogo', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLib = require('react');
  return { PolarisLogo: () => ReactLib.createElement(RN.View) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DesktopSidebar } = require('@/components/DesktopSidebar');

describe('DesktopSidebar — render smoke (4 dominios)', () => {
  it('renderiza sin throw', () => {
    expect(() => render(<DesktopSidebar />)).not.toThrow();
  });
});
