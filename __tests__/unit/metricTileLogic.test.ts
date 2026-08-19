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
  coherenceTile, fatigueTile, normalizeSeries, recoveryTile, sleepTile,
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
