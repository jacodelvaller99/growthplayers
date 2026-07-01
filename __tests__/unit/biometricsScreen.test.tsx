/**
 * Render smoke test de Biometrics / "Mi cuerpo hoy" (loop de pulido, iteración 26).
 * Dashboard biométrico: scores + vitals + sparkline FC + tendencia 7 días + Norman.
 * Cubre las 2 ramas (sin wearable / conectado). Ninguna debe throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/MedicalDisclaimer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { __esModule: true, default: () => R.createElement(RN.View) };
});
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

let mockConns: { connections: unknown[]; isConnected: boolean } = { connections: [], isConnected: false };
let mockDaily: { data: unknown[]; today: unknown; averages: unknown } = { data: [], today: null, averages: null };
jest.mock('@/lib/wearables', () => ({
  useWearableConnections: () => mockConns,
  useWearableDaily: () => mockDaily,
  useWearableTimeseries: () => ({ data: [] }),
  calculateBiometricReadiness: () => 70,
  recoveryLabel: () => 'Óptimo',
  hrvToNormanLanguage: () => 'tu cuerpo está listo hoy',
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BiometricsScreen = require('@/app/bienestar/biometrics').default;

describe('BiometricsScreen — render smoke', () => {
  it('sin wearable → estado honesto (conectar) sin throw', () => {
    mockConns = { connections: [], isConnected: false };
    mockDaily = { data: [], today: null, averages: null };
    expect(() => render(<BiometricsScreen />)).not.toThrow();
  });

  it('conectado → scores + vitals + tendencia sin throw', () => {
    mockConns = { connections: [{ provider: 'oura' }], isConnected: true };
    const day = {
      id: 'd1', date: '2026-06-30', recovery_score: 62, sleep_score: 74,
      activity_score: 55, hrv_ms: 48, resting_hr: 56, sleep_duration_min: 445,
      steps: 8200, body_temp_delta: 0.2, spo2_avg: 97.4,
    };
    mockDaily = { data: [day, { ...day, id: 'd2', date: '2026-06-29' }], today: day, averages: { hrv: 45 } };
    expect(() => render(<BiometricsScreen />)).not.toThrow();
  });
});
