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
  normalizeAggregatorPayloadFor,
  aggregatorToDaily,
  openWearablesToDaily,
  openWearablesEventType,
  openWearablesSourceDevice,
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

  // ── Robustez extra (B1): entradas degeneradas no deben romper ────────────────
  // DOC-BASED: payloads parciales y formas alternas observadas en la doc de Terra.
  // El dueño debe validar contra un payload REAL antes de prod (ver runbook).
  it('null/undefined/no-objeto como raw → [] sin lanzar', () => {
    expect(terraToDaily(null)).toEqual([]);
    expect(terraToDaily(undefined)).toEqual([]);
    expect(terraToDaily('basura')).toEqual([]);
    expect(terraToDaily(42)).toEqual([]);
  });
  it('data con elementos null/no-objeto se saltan, no rompen', () => {
    const rows = terraToDaily({
      type: 'sleep',
      data: [null, 'x', 7, { metadata: { start_time: '2026-06-21T00:00:00Z' }, heart_rate_data: { summary: { avg_hrv_rmssd: 60 } } }],
    });
    expect(rows.length).toBe(1);
    expect(rows[0]!.hrvMs).toBe(60);
  });
  it('eficiencia que ya viene en porcentaje (0–100) no se re-escala', () => {
    const [d] = terraToDaily({
      type: 'sleep',
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, sleep_durations_data: { sleep_efficiency: 88 } }],
    });
    expect(d!.sleepEfficiency).toBe(88);
  });
});

describe('terraToDaily — formas alternas de payload (B1)', () => {
  // HRV puede llegar como hrv_rmssd; FC reposo como resting_hr o hr_resting.
  it('sleep: HRV alterno (hrv_rmssd) y FC reposo alterno (resting_hr)', () => {
    const [d] = terraToDaily({
      type: 'sleep',
      user: { provider: 'POLAR' },
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, heart_rate_data: { summary: { hrv_rmssd: 71, resting_hr: 49 } } }],
    });
    expect(d!.hrvMs).toBe(71);
    expect(d!.restingHr).toBe(49);
  });
  it('daily: FC reposo como hr_resting y pasos en distance_data.summary.steps', () => {
    const [d] = terraToDaily({
      type: 'daily',
      data: [{
        metadata: { start_time: '2026-06-21T00:00:00Z' },
        heart_rate_data: { summary: { hr_resting: 55, avg_hrv_rmssd: 64 } },
        distance_data: { summary: { steps: 9100 } },
      }],
    });
    expect(d!.restingHr).toBe(55);
    expect(d!.steps).toBe(9100);
  });
  it('sleep: recoveryScore cae a scores.readiness si no hay readiness_data', () => {
    const [d] = terraToDaily({
      type: 'sleep',
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, scores: { readiness: 80 } }],
    });
    expect(d!.recoveryScore).toBe(80);
  });
  it('activity: strain en scores.strain como fallback', () => {
    const [d] = terraToDaily({
      type: 'activity',
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, scores: { strain: 14.2 } }],
    });
    expect(d!.strainScore).toBe(14.2);
  });
  it('body: HRV y FC reposo desde heart_rate_data.summary', () => {
    const [d] = terraToDaily({
      type: 'body',
      data: [{ metadata: { date: '2026-06-21' }, heart_rate_data: { summary: { avg_hrv_rmssd: 58, resting_hr_bpm: 51 } } }],
    });
    expect(d!.hrvMs).toBe(58);
    expect(d!.restingHr).toBe(51);
  });
});

describe('Terra — día completo desde payloads parciales separados (B1)', () => {
  // Terra manda sueño/daily/actividad como webhooks SEPARADOS del mismo día.
  // El merge (RPC en DB) los combina; aquí simulado con mergeDailies.
  it('solo-sueño: el resto queda null pero la fila es válida', () => {
    const rows = normalizeAggregatorPayload(
      { type: 'sleep', user: { provider: 'COROS' }, data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, sleep_durations_data: { asleep: { duration_asleep_state_seconds: 25200 } } }] },
      'user-1',
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.sleep_duration_min).toBe(420);
    expect(rows[0]!.steps).toBeNull();
    expect(rows[0]!.source_device).toBe('COROS');
  });
  it('solo-actividad: pasos/calorías presentes, sueño null', () => {
    const rows = normalizeAggregatorPayload(
      { type: 'activity', data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, distance_data: { steps: 7200 }, calories_data: { net_activity_calories: 480 } }] },
      'user-1',
    );
    expect(rows[0]!.steps).toBe(7200);
    expect(rows[0]!.calories_active).toBe(480);
    expect(rows[0]!.sleep_duration_min).toBeNull();
  });
  it('merge de sueño + daily del mismo día (Garmin) → una fila completa', () => {
    const sleep = terraToDaily({
      type: 'sleep',
      user: { provider: 'GARMIN' },
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, sleep_durations_data: { asleep: { duration_asleep_state_seconds: 26400 }, sleep_efficiency: 0.92 }, heart_rate_data: { summary: { avg_hrv_rmssd: 70 } } }],
    });
    const daily = terraToDaily({
      type: 'daily',
      user: { provider: 'GARMIN' },
      data: [{ metadata: { start_time: '2026-06-21T00:00:00Z' }, distance_data: { steps: 8000 }, scores: { recovery: 73 } }],
    });
    const merged = mergeDailies([...sleep, ...daily]);
    expect(merged.length).toBe(1);
    const row = toWearableDailyRow(merged[0]!, 'user-1');
    expect(row.sleep_duration_min).toBe(440);
    expect(row.sleep_efficiency).toBe(92);
    expect(row.hrv_ms).toBe(70);
    expect(row.steps).toBe(8000);
    expect(row.recovery_score).toBe(73);
    expect(row.source_device).toBe('GARMIN');
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

// ── Open Wearables (OSS self-host) ────────────────────────────────────────────
// Fixtures con la forma documentada del webhook de Open Wearables
// (openwearables.io/docs): envelope { type:'resource.action', data:{...} }.
const OW_SLEEP = {
  type: 'sleep.created',
  data: {
    provider: 'oura',
    start_time: '2026-06-21T23:30:00Z',
    sleep_total_duration_minutes: 420,
    sleep_efficiency_score: 90,
    sleep_deep_minutes: 80,
    sleep_rem_minutes: 90,
    sleep_light_minutes: 250,
    sleep_awake_minutes: 20,
    is_nap: false,
  },
};

const OW_HRV = {
  type: 'heart_rate_variability.created',
  data: { provider: 'oura', start_time: '2026-06-21T03:00:00Z', series_type: 'heart_rate_variability', samples: [{ value: 60 }, { value: 70 }, { value: 80 }] },
};

const OW_STEPS = {
  type: 'steps.created',
  data: { provider: 'garmin', start_time: '2026-06-21T00:00:00Z', series_type: 'steps', samples: [{ value: 4000 }, { value: 4450 }] },
};

const OW_ACTIVITY = {
  type: 'activity.created',
  data: { provider: 'whoop', start_time: '2026-06-21T00:00:00Z', steps_count: 8450, energy_burned: 540, moving_time_seconds: 3600 },
};

describe('openWearablesEventType + openWearablesSourceDevice', () => {
  it('lee el tipo de evento y el reloj real', () => {
    expect(openWearablesEventType(OW_SLEEP)).toBe('sleep.created');
    expect(openWearablesSourceDevice(OW_SLEEP)).toBe('OURA');
    expect(openWearablesSourceDevice(OW_STEPS)).toBe('GARMIN');
    expect(openWearablesSourceDevice({})).toBeNull();
  });
});

describe('openWearablesToDaily — sesión', () => {
  it('mapea sleep.created con fecha y stages', () => {
    const [d] = openWearablesToDaily(OW_SLEEP);
    expect(d!.date).toBe('2026-06-21');
    expect(d!.sourceDevice).toBe('OURA');
    expect(d!.sleepDurationMin).toBe(420);
    expect(d!.sleepEfficiency).toBe(90);
    expect(d!.deepMin).toBe(80);
    expect(d!.remMin).toBe(90);
    expect(d!.lightMin).toBe(250);
    expect(d!.awakeMin).toBe(20);
  });

  it('descarta siestas (is_nap) para no pisar la noche', () => {
    expect(openWearablesToDaily({ ...OW_SLEEP, data: { ...OW_SLEEP.data, is_nap: true } })).toEqual([]);
  });

  it('mapea activity.created (pasos, calorías, minutos activos)', () => {
    const [d] = openWearablesToDaily(OW_ACTIVITY);
    expect(d!.steps).toBe(8450);
    expect(d!.caloriesActive).toBe(540);
    expect(d!.activeMin).toBe(60);
  });
});

describe('openWearablesToDaily — timeseries', () => {
  it('promedia HRV de las muestras', () => {
    const [d] = openWearablesToDaily(OW_HRV);
    expect(d!.hrvMs).toBe(70); // (60+70+80)/3
  });
  it('suma los pasos del día', () => {
    const [d] = openWearablesToDaily(OW_STEPS);
    expect(d!.steps).toBe(8450); // 4000+4450
  });
});

describe('openWearablesToDaily — robustez', () => {
  it('evento sin fecha → []', () => {
    expect(openWearablesToDaily({ type: 'sleep.created', data: {} })).toEqual([]);
  });
  it('tipo desconocido → []', () => {
    expect(openWearablesToDaily({ type: 'nutrition.created', data: { start_time: '2026-06-21T00:00:00Z' } })).toEqual([]);
  });
  it('payload vacío → []', () => {
    expect(openWearablesToDaily({})).toEqual([]);
  });
});

describe('aggregatorToDaily + normalizeAggregatorPayloadFor — switch por vendor', () => {
  it('open_wearables usa el adapter de Open Wearables', () => {
    expect(aggregatorToDaily('open_wearables', OW_SLEEP).length).toBe(1);
    expect(aggregatorToDaily('open_wearables', SLEEP_PAYLOAD)).toEqual([]); // forma Terra no aplica
  });
  it('terra usa el adapter de Terra', () => {
    expect(aggregatorToDaily('terra', SLEEP_PAYLOAD).length).toBe(1);
  });
  it('pipeline OW → fila lista para upsert (provider=aggregator)', () => {
    const rows = normalizeAggregatorPayloadFor('open_wearables', OW_SLEEP, 'user-1');
    expect(rows.length).toBe(1);
    expect(rows[0]!.provider).toBe('aggregator');
    expect(rows[0]!.source_device).toBe('OURA');
    expect(rows[0]!.sleep_duration_min).toBe(420);
    expect(rows[0]!.user_id).toBe('user-1');
  });
});

describe('Open Wearables — CUALQUIER reloj: día completo desde webhooks separados', () => {
  // Un Garmin (o cualquier marca) conectado vía el agregador manda sueño, HRV y
  // pasos como webhooks SEPARADOS del mismo día. El merge (lo que hace la RPC
  // merge_wearable_daily en DB, simulado aquí con mergeDailies) los combina en una
  // sola fila de wearable_daily que consume el motor downstream (biometric/dashboards).
  it('combina sleep + hrv + steps de un Garmin en una sola fila correcta', () => {
    const events = [
      { type: 'sleep.created', data: { provider: 'garmin', start_time: '2026-06-21T23:00:00Z', sleep_total_duration_minutes: 430, sleep_efficiency_score: 91, sleep_deep_minutes: 85, sleep_rem_minutes: 95, sleep_light_minutes: 230, sleep_awake_minutes: 20, is_nap: false } },
      { type: 'heart_rate_variability.created', data: { provider: 'garmin', start_time: '2026-06-21T03:00:00Z', samples: [{ value: 55 }, { value: 65 }] } },
      { type: 'steps.created', data: { provider: 'garmin', start_time: '2026-06-21T00:00:00Z', samples: [{ value: 5000 }, { value: 4200 }] } },
    ];
    const dailies = mergeDailies(events.flatMap(openWearablesToDaily));
    expect(dailies.length).toBe(1);
    const row = toWearableDailyRow(dailies[0]!, 'user-1');
    expect(row.provider).toBe('aggregator');
    expect(row.source_device).toBe('GARMIN');
    expect(row.date).toBe('2026-06-21');
    expect(row.sleep_duration_min).toBe(430);
    expect(row.deep_min).toBe(85);
    expect(row.hrv_ms).toBe(60);   // (55+65)/2
    expect(row.steps).toBe(9200);  // 5000+4200
    expect(row.user_id).toBe('user-1');
  });
});
