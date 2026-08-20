/**
 * La palabra de estado es una afirmación sobre el cuerpo de alguien.
 *
 * Estos tests fijan dos cosas que no pueden derivar con el tiempo:
 *   1. Que la traducción CUBRE todos los estados clínicos — un estado sin
 *      entrada saldría como "SIN DATO" y le diría al usuario que no hay lectura
 *      cuando sí la hay, que es el peor fallo posible aquí.
 *   2. Que el vocabulario es de acompañamiento, no clínico.
 */
import {
  coherenceTile, composeDayTiles, fatigueTile, loadTile, normalizeSeries, recoveryTile, sleepTile, stressTile,
} from '@/lib/metricTileLogic';

describe('traducción de estado a ficha', () => {
  it('cubre los 5 estados de sueño', () => {
    for (const s of ['excellent', 'good', 'fragile', 'poor', 'critical'] as const) {
      expect(sleepTile(s).label).not.toBe('SIN DATO');
    }
  });

  it('cubre los 5 de recuperación, 4 de coherencia y 4 de fatiga', () => {
    for (const s of ['strong', 'adequate', 'compromised', 'weak', 'high_risk'] as const) {
      expect(recoveryTile(s).label).not.toBe('SIN DATO');
    }
    for (const s of ['stable', 'slightly_disturbed', 'unstable', 'highly_unstable'] as const) {
      expect(coherenceTile(s).label).not.toBe('SIN DATO');
    }
    for (const s of ['low', 'moderate', 'elevated', 'high'] as const) {
      expect(fatigueTile(s).label).not.toBe('SIN DATO');
    }
  });

  it('sin lectura dice SIN DATO y no pinta color', () => {
    for (const f of [sleepTile, recoveryTile, coherenceTile, fatigueTile]) {
      expect(f(null as never)).toEqual({ label: 'SIN DATO', tone: 'none' });
    }
  });

  it('el vocabulario no es clínico', () => {
    // La app no diagnostica; su lenguaje tampoco puede sonar a diagnóstico.
    const PROHIBIDAS = /patol|defici|anormal|enferm|riesgo cl|diagn/i;
    const todas = [
      ...(['excellent', 'good', 'fragile', 'poor', 'critical'] as const).map((s) => sleepTile(s).label),
      ...(['strong', 'adequate', 'compromised', 'weak', 'high_risk'] as const).map((s) => recoveryTile(s).label),
      ...(['stable', 'slightly_disturbed', 'unstable', 'highly_unstable'] as const).map((s) => coherenceTile(s).label),
      ...(['low', 'moderate', 'elevated', 'high'] as const).map((s) => fatigueTile(s).label),
    ];
    expect(todas.filter((l) => PROHIBIDAS.test(l))).toEqual([]);
  });
});

describe('normalizeSeries', () => {
  it('escala al rango PROPIO, no a un máximo teórico', () => {
    // Siete noches entre 6h y 7h: sobre 12h serían siete barras iguales y la
    // variación —lo único que se quiere ver— desaparecería.
    expect(normalizeSeries([360, 390, 420])).toEqual([0, 0.5, 1]);
  });

  it('serie plana devuelve media altura, no cero', () => {
    expect(normalizeSeries([7, 7, 7])).toEqual([0.5, 0.5, 0.5]);
  });

  it('descarta huecos sin romperse', () => {
    expect(normalizeSeries([1, null, 3, undefined, NaN])).toEqual([0, 1]);
  });

  it('sin datos devuelve serie vacía — la ficha no dibuja barras', () => {
    expect(normalizeSeries([null, undefined])).toEqual([]);
  });
});

describe('stressTile', () => {
  it('sin dato → SIN DATO', () => {
    expect(stressTile(null).label).toBe('SIN DATO');
    expect(stressTile(undefined).label).toBe('SIN DATO');
  });
  it('bajo/medio/elevado según umbral', () => {
    expect(stressTile(20)).toEqual({ label: 'BAJO', tone: 'good' });
    expect(stressTile(50)).toEqual({ label: 'MEDIO', tone: 'mid' });
    expect(stressTile(80)).toEqual({ label: 'ELEVADO', tone: 'bad' });
  });
});

describe('loadTile', () => {
  it('sin dato → SIN DATO', () => {
    expect(loadTile(null).label).toBe('SIN DATO');
  });
  it('baja/media/alta según umbral', () => {
    expect(loadTile(30)).toEqual({ label: 'BAJA', tone: 'good' });
    expect(loadTile(55)).toEqual({ label: 'MEDIA', tone: 'mid' });
    expect(loadTile(90)).toEqual({ label: 'ALTA', tone: 'bad' });
  });
});

describe('composeDayTiles', () => {
  it('con wearable: 4 fichas HRV/Sueño/Carga/Estrés, source=wearable', () => {
    const latest = { hrv_ms: 68, sleep_duration_min: 462, strain_score: 12, stress_score: 61 };
    const { tiles, source } = composeDayTiles(latest, [latest], {}, null);
    expect(source).toBe('wearable');
    expect(tiles.map((t) => t.label)).toEqual(['HRV', 'SUEÑO', 'CARGA', 'ESTRÉS']);
    expect(tiles[0].value).toBe('68');
    expect(tiles[1].value).toBe('7h42');
    expect(tiles.every((t) => t.stateLabel !== 'SIN DATO')).toBe(true);
  });

  it('sin wearable pero con check-ins: source=checkin', () => {
    const { tiles, source } = composeDayTiles(null, [], {}, { energy: 8, clarity: 6, stress: 3, sleep: 7 });
    expect(source).toBe('checkin');
    expect(tiles).toHaveLength(4);
    expect(tiles.every((t) => t.stateLabel !== 'SIN DATO')).toBe(true);
  });

  it('sin nada: SIN DATO explícito, no ceros inventados', () => {
    const { tiles, source } = composeDayTiles(null, [], {}, null);
    expect(source).toBe('none');
    expect(tiles.every((t) => t.stateLabel === 'SIN DATO' && t.value === '—')).toBe(true);
  });
});
