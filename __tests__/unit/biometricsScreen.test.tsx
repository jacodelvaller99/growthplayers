/**
 * Render smoke test de "Tu reloj" (bienestar/biometrics), gramática del rediseño.
 * Cubre las 3 ramas honestas: sin reloj, conectado sin datos, con datos.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/PolarisLogo', () => ({ PolarisLogo: () => null }));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u1' }) }));

let mockConns: { connections: unknown[]; loading: boolean } = { connections: [], loading: false };
let mockDaily: { data: unknown[]; today: unknown; averages: unknown; loading: boolean } = {
  data: [], today: null, averages: null, loading: false,
};
jest.mock('@/lib/wearables', () => ({
  useWearableConnections: () => mockConns,
  useWearableDaily: () => mockDaily,
  triggerWearableSync: jest.fn(async () => ({ success: true })),
  recoveryLabel: () => 'Óptimo',
  hrvToNormanLanguage: () => 'tu cuerpo está listo hoy',
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BiometricsScreen = require('@/app/bienestar/biometrics').default;

describe('BiometricsScreen — estados honestos', () => {
  it('sin reloj → invita a conectar', () => {
    mockConns = { connections: [], loading: false };
    mockDaily = { data: [], today: null, averages: null, loading: false };
    const { getByText } = render(<BiometricsScreen />);
    expect(getByText('Conectar mi reloj')).toBeTruthy();
  });

  it('conectado sin datos → lo dice y ofrece sincronizar', () => {
    mockConns = { connections: [{ provider: 'oura', last_synced_at: '2026-01-01T00:00:00Z' }], loading: false };
    mockDaily = { data: [], today: null, averages: null, loading: false };
    const { getByText } = render(<BiometricsScreen />);
    expect(getByText('Tu Oura no ha enviado datos.')).toBeTruthy();
    expect(getByText('Sincronizar ahora')).toBeTruthy();
  });

  it('con datos → filas sin throw', () => {
    mockConns = { connections: [{ provider: 'oura', last_synced_at: null }], loading: false };
    const day = {
      id: 'd1', date: '2026-06-30', recovery_score: 62, sleep_score: 74,
      activity_score: 55, hrv_ms: 48, resting_hr: 56, sleep_duration_min: 445,
      steps: 8200, body_temp_delta: 0.2, spo2_avg: 97.4,
    };
    mockDaily = { data: [day], today: day, averages: { hrv: 45 }, loading: false };
    const { getByText } = render(<BiometricsScreen />);
    expect(getByText('RECUPERACIÓN')).toBeTruthy();
  });
});
