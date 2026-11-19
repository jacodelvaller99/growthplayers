/**
 * readDay en iOS: react-native-health exporta con module.exports (sin .default).
 * Si se vuelve a leer `.default`, todas las lecturas salen vacías sin error.
 */
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: jest.fn(), getSession: jest.fn() }, from: jest.fn() } }));

const reply = (res: unknown) => (_opts: unknown, cb: (e: null, r: unknown) => void) => cb(null, res);

jest.mock('react-native-health', () => ({
  getSleepSamples: reply([]),
  getHeartRateVariabilitySamples: reply([{ value: 40 }, { value: 60 }]),
  getRestingHeartRateSamples: reply([{ value: 55 }]),
  getDailyStepCountSamples: reply([{ value: 3000 }, { value: 2000 }]),
  getActiveEnergyBurned: reply([{ value: 300 }]),
  getOxygenSaturationSamples: reply([]),
  getRespiratoryRateSamples: reply([]),
}));

import { Platform } from 'react-native';
import { readDay } from '@/lib/wearablesNative';

describe('wearablesNative · readDay (HealthKit, export CommonJS)', () => {
  it('lee los valores de Apple Salud', async () => {
    Platform.OS = 'ios';
    const day = await readDay(new Date(2026, 10, 19));
    expect(day.provider).toBe('apple_health');
    expect(day.hrv_ms).toBe(50);
    expect(day.resting_hr).toBe(55);
    expect(day.steps).toBe(5000);
    expect(day.calories_active).toBe(300);
  });
});
