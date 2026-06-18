/**
 * wearablesNative — pruebas puras de los helpers de agregación de sueño + util.
 *
 * No tocan IO (Supabase / HealthKit / Health Connect): solo verifican que las
 * funciones puras mapean correctamente samples → campos canónicos.
 */
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: jest.fn(), getSession: jest.fn() }, from: jest.fn() } }));

import { __test } from '@/lib/wearablesNative';

const { aggregateSleepStages, aggregateHCSleep, avgValue, isoDate } = __test;

describe('wearablesNative · isoDate', () => {
  it('formatea una Date como YYYY-MM-DD local', () => {
    const d = new Date(2026, 5, 17, 10, 30); // junio 17, 2026 local
    expect(isoDate(d)).toBe('2026-06-17');
  });
});

describe('wearablesNative · avgValue', () => {
  it('devuelve null si no hay samples', () => {
    expect(avgValue([])).toBeNull();
  });
  it('promedia los valores numéricos', () => {
    expect(avgValue([{ value: 30 }, { value: 50 }, { value: 70 }])).toBe(50);
  });
  it('ignora samples sin value numérico', () => {
    // @ts-expect-error — probando entrada hostil
    expect(avgValue([{ value: 40 }, { value: null }, { value: 60 }])).toBe(50);
  });
});

describe('wearablesNative · aggregateSleepStages (HealthKit)', () => {
  it('devuelve vacío para input vacío', () => {
    const agg = aggregateSleepStages([]);
    expect(agg).toEqual({ totalMin: 0, remMin: null, deepMin: null, lightMin: null, awakeMin: null, efficiency: null });
  });

  it('clasifica fases REM/DEEP/CORE/AWAKE y suma duraciones', () => {
    const samples = [
      { startDate: '2026-06-17T00:00:00Z', endDate: '2026-06-17T00:30:00Z', value: 'REM' },     // 30 min REM
      { startDate: '2026-06-17T00:30:00Z', endDate: '2026-06-17T02:00:00Z', value: 'DEEP' },    // 90 min DEEP
      { startDate: '2026-06-17T02:00:00Z', endDate: '2026-06-17T05:00:00Z', value: 'CORE' },    // 180 min LIGHT
      { startDate: '2026-06-17T05:00:00Z', endDate: '2026-06-17T05:15:00Z', value: 'AWAKE' },   // 15 min awake
      { startDate: '2026-06-17T00:00:00Z', endDate: '2026-06-17T05:15:00Z', value: 'INBED' },   // 315 min in-bed
    ];
    const agg = aggregateSleepStages(samples);
    expect(agg.remMin).toBe(30);
    expect(agg.deepMin).toBe(90);
    expect(agg.lightMin).toBe(180);
    expect(agg.awakeMin).toBe(15);
    expect(agg.totalMin).toBe(300); // rem+deep+light = 300
    // efficiency = 300 / 315 = 95.2%
    expect(agg.efficiency).toBeCloseTo(95.2, 1);
  });

  it('ignora samples con duración inválida', () => {
    const samples = [
      { startDate: '2026-06-17T00:00:00Z', endDate: '2026-06-17T00:30:00Z', value: 'REM' },
      { startDate: '2026-06-17T05:00:00Z', endDate: '2026-06-17T04:00:00Z', value: 'DEEP' }, // negativo
    ];
    const agg = aggregateSleepStages(samples);
    expect(agg.remMin).toBe(30);
    expect(agg.deepMin).toBeNull();
  });
});

describe('wearablesNative · aggregateHCSleep (Health Connect)', () => {
  it('devuelve vacío para input vacío', () => {
    const agg = aggregateHCSleep([]);
    expect(agg.totalMin).toBe(0);
  });

  it('clasifica stages numéricos de HC y calcula eficiencia', () => {
    const records = [{
      startTime: '2026-06-17T00:00:00Z',
      endTime:   '2026-06-17T05:00:00Z', // 300 min in-bed
      stages: [
        { stage: 5, startTime: '2026-06-17T00:00:00Z', endTime: '2026-06-17T00:30:00Z' }, // REM 30
        { stage: 4, startTime: '2026-06-17T00:30:00Z', endTime: '2026-06-17T01:30:00Z' }, // DEEP 60
        { stage: 3, startTime: '2026-06-17T01:30:00Z', endTime: '2026-06-17T04:30:00Z' }, // LIGHT 180
        { stage: 1, startTime: '2026-06-17T04:30:00Z', endTime: '2026-06-17T05:00:00Z' }, // AWAKE 30
      ],
    }];
    const agg = aggregateHCSleep(records);
    expect(agg.remMin).toBe(30);
    expect(agg.deepMin).toBe(60);
    expect(agg.lightMin).toBe(180);
    expect(agg.awakeMin).toBe(30);
    expect(agg.totalMin).toBe(270); // rem+deep+light
    expect(agg.efficiency).toBe(90); // 270 / 300
  });

  it('acepta stages con label string (REM/DEEP/LIGHT/AWAKE)', () => {
    const records = [{
      startTime: '2026-06-17T00:00:00Z',
      endTime:   '2026-06-17T01:00:00Z',
      stages: [
        { stage: 'REM',  startTime: '2026-06-17T00:00:00Z', endTime: '2026-06-17T00:20:00Z' },
        { stage: 'DEEP', startTime: '2026-06-17T00:20:00Z', endTime: '2026-06-17T01:00:00Z' },
      ],
    }];
    const agg = aggregateHCSleep(records);
    expect(agg.remMin).toBe(20);
    expect(agg.deepMin).toBe(40);
  });
});
