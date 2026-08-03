/**
 * breathVoice — cue correcto por fase, y el conteo respeta los clips que
 * de verdad existen (2 a 8, nunca "1" ni fuera de rango).
 *
 * POR QUÉ: BOX usa la misma etiqueta `RETÉN` dos veces por ciclo (tras
 * inhalar, pulmones llenos; tras exhalar, vacíos) — sin distinguirlas por la
 * fase anterior, sonarían indistintas dos veces seguidas. Y las fases de
 * 1.5s (Wim Hof/Tummo) no tienen hueco para un número: solo debe sonar la
 * palabra, nunca un conteo a medias.
 */
import { cueForCount, cueForPhaseLabel } from '@/lib/breathVoice';

describe('cueForPhaseLabel', () => {
  it('INHALA y EXHALA no dependen de la fase anterior', () => {
    expect(cueForPhaseLabel('INHALA', 'EXHALA')).toBe('inhala');
    expect(cueForPhaseLabel('EXHALA', 'INHALA')).toBe('exhala');
  });

  it('RETÉN tras EXHALA (pulmones vacíos) dice "sosten"', () => {
    expect(cueForPhaseLabel('RETÉN', 'EXHALA')).toBe('sosten');
  });

  it('RETÉN tras INHALA (pulmones llenos) dice "reten"', () => {
    expect(cueForPhaseLabel('RETÉN', 'INHALA')).toBe('reten');
  });

  it('RETÉN sin fase anterior (arranca el ciclo) por defecto dice "reten"', () => {
    expect(cueForPhaseLabel('RETÉN', undefined)).toBe('reten');
  });
});

describe('cueForCount', () => {
  it('devuelve el número para 2..8', () => {
    expect(cueForCount(2)).toBe('2');
    expect(cueForCount(8)).toBe('8');
  });

  it('no hay clip para "1" — el paso a la siguiente fase es la señal', () => {
    expect(cueForCount(1)).toBeNull();
  });

  it('no hay clip fuera de 2..8', () => {
    expect(cueForCount(0)).toBeNull();
    expect(cueForCount(9)).toBeNull();
  });

  it('no hay clip para valores fraccionarios (fases de 1.5s) — solo la palabra suena', () => {
    expect(cueForCount(0.5)).toBeNull();
    expect(cueForCount(1.5)).toBeNull();
  });
});
