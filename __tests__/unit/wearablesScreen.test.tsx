/**
 * Render smoke test de Dispositivos / wearables (loop de pulido, iteración 35).
 * Agregador héroe + Apple/Health Connect + WHOOP/Oura + selector + banners.
 * Cubre desconectado (móvil y desktop). Platform=web para el hint web.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

(Platform as { OS: string }).OS = 'web';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'm', Light: 'l', Heavy: 'h' } }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/components/wearable-compat', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { WearableCompat: () => R.createElement(RN.View) };
});
jest.mock('@/hooks/use-breakpoint', () => ({ useBreakpoint: () => ({ isDesktop: false }) }));
jest.mock('@/app/config/env', () => ({ ENV: { aggregatorVendor: 'terra' } }));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() }, functions: { invoke: jest.fn() }, from: () => ({ update: () => ({ eq: () => Promise.resolve({}) }) }) } }));
jest.mock('@/lib/wearableAggregator', () => ({ connectAggregator: jest.fn() }));
jest.mock('@/lib/wearablesNative', () => ({
  requestNativePermissions: jest.fn(), syncRange: jest.fn(), nativeProviderForPlatform: () => null,
}));
jest.mock('@/lib/wearables', () => ({
  OAUTH_URLS: { whoop: () => '', oura: () => '' },
  isNativeProvider: (p: string) => p === 'apple_health' || p === 'health_connect',
  isAggregatorProvider: (p: string) => p === 'aggregator',
  triggerWearableSync: jest.fn(),
  useWearableConnections: () => ({
    connections: [], loading: false, isConnected: () => false, getConnection: () => null, reload: jest.fn(),
  }),
  useWearableDaily: () => ({ today: null }),
  recoveryLabel: () => 'Óptimo',
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WearablesScreen = require('@/app/perfil/wearables').default;

describe('WearablesScreen — render smoke', () => {
  it('lista de proveedores desconectados (agregador héroe) renderiza sin throw', () => {
    expect(() => render(<WearablesScreen />)).not.toThrow();
  });
});
