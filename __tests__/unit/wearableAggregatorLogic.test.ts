/**
 * wearableAggregatorLogic — normalización del agregador universal.
 *
 * Verifica que el adapter de Terra mapea correctamente sueño/daily/actividad a
 * nuestro modelo intermedio, que el merge por día no pierde campos entre payloads
 * separados, y que la fila final respeta el contrato de wearable_daily.
 */
import {
  terraToDaily,
  terraPayloadType,
  terraSourceDevice,
  toWearableDailyRow,
  mergeDailies,
  normalizeAggregatorPayload,
  isoToDate,
  type AggregatorDaily,
} from '../../lib/wearableAggregatorLogic';

// ── Fixtures con la forma real de los payloads normalizados de Terra ──────────
const SLEEP_PAYLOAD = {
  type: 'sleep',
  user: { user_id: 'terra-abc', provider: 'GARMIN', reference_id: 'polaris-user-1' },
  data: [
    {
      metadata: { start_time: '2026-06-20T23:30:00-05:00', end_time: '2026-06-21T07:00:00-05:00' },
      sleep_durations_data: {
        asleep: {
          duration_asleep_state_seconds: 25200, // 420 min
          duration_REM_sleep_state_seconds: 5400, // 90 min
          duration_deep_sleep_state_seconds: 4800, // 80 min
          duration_light_sleep_state_seconds: 15000, // 250 min
        },
        awake: { duration_awake_state_seconds: 1200 }, // 20 min
        sleep_efficiency: 0.9, // → 90
      },
      heart_rate_data: { summary: { resting_hr_bpm: 52, avg_hrv_rmssd: 68 } },
      respiration_data: {
        breaths_data: { avg_breaths_per_min: 14.2 },
        oxygen_saturation_data: { avg_saturation_percentage: 96 },
      },
      temperature_data: { delta: -0.2 },
      readiness_data: { readiness: 74 },
    },
  ],
};

const DAILY_PAYLOAD = {
  type: 'daily',
  user: { user_id: 'terra-abc', provider: 'GARMIN' },
  data: [
    {
      metadata: { start_time: '2026-06-21T00:00:00-05:00', end_time: '2026-06-21T23:59:00-05:00' },
      heart_rate_data: { summary: { resting_hr_bpm: 53, avg_hrv_rmssd: 65 } },
      oxygen_data: { avg_saturation_percentage: 97 },
      distance_data: { steps: 8450 },
      calories_data: { net_activity_calories: 540, total_burned_calories: 2400 },
      active_durations_data: { activity_seconds: 3600 }, // 60 min
      stress_data: { avg_stress_level: 38 },
      scores: { recovery: 71, activity: 80 },
    },
  ],
};

describe('terraPayloadType + terraSourceDevice', () => {
  it('reconoce los tipos soportados', () => {
    expect(terraPayloadType(SLEEP_PAYLOAD)).toBe('sleep');
    expect(terraPayloadType(DAILY_PAYLOAD)).toBe('daily');
    expect(terraPayloadType({ type: 'activity' })).toBe('activity');
    expect(terraPayloadType({ type: 'body' })).toBe('body');
    expect(terraPayloadType({ type: 'nutrition' })).toBe('other');
    expect(terraPayloadType({})).toBe('other');
  });

  it('extrae el reloj real en mayúsculas', () => {
    expect(terraSourceDevice(SLEEP_PAYLOAD)).toBe('GARMIN');
    expect(terraSourceDevice({ provider: 'coros' })).toBe('COROS');
    expect(terraSourceDevice({})).toBeNull();
  });
});

describe('isoToDate', () => {
  it('extrae YYYY-MM-DD de un ISO timestamp', () => {
    expect(isoToDate('2026-06-21T07:00:00-05:00')).toBe('2026-06-21');
    expect(isoToDate('2026-06-21')).toBe('2026-06-21');
  });
  it('devuelve null para basura', () => {
    expect(isoToDate('')).toBeNull();
    expect(isoToDate(undefined)).toBeNull();
    expect(isoToDate('no-fecha')).toBeNull();
  });
});

describe('terraToDaily — sleep', () => {
  const [d] = terraToDaily(SLEEP_PAYLOAD);

  it('usa la fecha del start_time', () => {
    expect(d!.date).toBe('2026-06-20');
    expect(d!.sourceDevice).toBe('GARMIN');
  });

  it('convierte segundos a minutos', () => {
    expect(d!.sleepDurationMin).toBe(420);
    expect(d!.remMin).toBe(90);
    expect(d!.deepMin).toBe(80);
    expect(d!.lightMin).toBe(250);
    expect(d!.awakeMin).toBe(20);
  });

  it('escala la eficiencia de fracción a porcentaje', () => {
    expect(d!.sleepEfficiency).toBe(90);
  });

  it('mapea HRV, FC reposo, respiración y SpO2', () => {
    expect(d!.hrvMs).toBe(68);
    expect(d!.restingHr).toBe(52);
    expect(d!.respiratoryRate).toBe(14.2);
    expect(d!.spo2Avg).toBe(96);
    expect(d!.recoveryScore).toBe(74);
  });
});

describe('terraToDaily — daily', () => {
  const [d] = terraToDaily(DAILY_PAYLOAD);
  it('mapea scores, pasos, calorías, actividad y estrés', () => {
    expect(d!.recoveryScore).toBe(71);
    expect(d!.activityScore).toBe(80);
    expect(d!.steps).toBe(8450);
    expect(d!.caloriesActive).toBe(540);
    expect(d!.activeMin).toBe(60);
    expect(d!.stressScore).toBe(38);
  });
});

describe('terraToDaily — robustez', () => {
  it('payload sin data devuelve []', () => {
    expect(terraToDaily({ type: 'sleep' })).toEqual([]);
    expect(terraToDaily({})).toEqual([]);
  });
  it('registro sin fecha se descarta', () => {
    expect(terraToDaily({ type: 'sleep', data: [{ metadata: {} }] })).toEqual([]);
  });
  it('campos ausentes quedan null, no rompe', () => {
    const [d] = terraToDaily({
      type: 'sleep',
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' } }],
    });
    expect(d!.date).toBe('2026-06-21');
    expect(d!.hrvMs ?? null).toBeNull();
  });
});

describe('mergeDailies — sueño + daily del mismo día no se pisan', () => {
  it('combina campos de payloads separados del mismo día', () => {
    const sleep: AggregatorDaily = { date: '2026-06-21', sourceDevice: 'GARMIN', sleepScore: 88, remMin: 90 };
    const daily: AggregatorDaily = { date: '2026-06-21', sourceDevice: 'GARMIN', steps: 8450, recoveryScore: 71 };
    const merged = mergeDailies([sleep, daily]);
    expect(merged.length).toBe(1);
    expect(merged[0]!.sleepScore).toBe(88);
    expect(merged[0]!.remMin).toBe(90);
    expect(merged[0]!.steps).toBe(8450);
    expect(merged[0]!.recoveryScore).toBe(71);
  });

  it('un null/undefined no borra un valor previo', () => {
    const a: AggregatorDaily = { date: '2026-06-21', sourceDevice: 'GARMIN', hrvMs: 68 };
    const b: AggregatorDaily = { date: '2026-06-21', sourceDevice: 'GARMIN', hrvMs: null };
    const merged = mergeDailies([a, b]);
    expect(merged[0]!.hrvMs).toBe(68);
  });

  it('separa días distintos', () => {
    const a: AggregatorDaily = { date: '2026-06-20', sourceDevice: 'GARMIN', steps: 100 };
    const b: AggregatorDaily = { date: '2026-06-21', sourceDevice: 'GARMIN', steps: 200 };
    expect(mergeDailies([a, b]).length).toBe(2);
  });
});

describe('toWearableDailyRow — contrato de wearable_daily', () => {
  it('produce provider=aggregator y respeta source_device', () => {
    const row = toWearableDailyRow({ date: '2026-06-21', sourceDevice: 'COROS', sleepScore: 88 }, 'user-1');
    expect(row.provider).toBe('aggregator');
    expect(row.source_device).toBe('COROS');
    expect(row.user_id).toBe('user-1');
    expect(row.sleep_score).toBe(88);
  });

  it('rellena con null los campos ausentes', () => {
    const row = toWearableDailyRow({ date: '2026-06-21', sourceDevice: null }, 'user-1');
    expect(row.hrv_ms).toBeNull();
    expect(row.steps).toBeNull();
    expect(row.recovery_score).toBeNull();
  });

  it('redondea valores decimales de score', () => {
    const row = toWearableDailyRow({ date: '2026-06-21', sourceDevice: null, recoveryScore: 70.6 }, 'u');
    expect(row.recovery_score).toBe(71);
  });
});

describe('normalizeAggregatorPayload — pipeline completo', () => {
  it('sleep payload → 1 fila lista para upsert', () => {
    const rows = normalizeAggregatorPayload(SLEEP_PAYLOAD, 'user-1');
    expect(rows.length).toBe(1);
    expect(rows[0]!.provider).toBe('aggregator');
    expect(rows[0]!.source_device).toBe('GARMIN');
    expect(rows[0]!.sleep_duration_min).toBe(420);
    expect(rows[0]!.user_id).toBe('user-1');
  });

  it('payload vacío → []', () => {
    expect(normalizeAggregatorPayload({}, 'user-1')).toEqual([]);
  });
});
