import { bodyPointAt } from '@/lib/bodyPointLogic';
import {
  energyFocusForBodyPoint,
  needsChestSafety,
  parseEnergyFocusId,
  pickEnergyFocus,
} from '@/lib/energyFocusLogic';

describe('energyFocusLogic — reflexión simbólica, no diagnóstico', () => {
  it.each([
    [0.5, 0.08, 'frente'],
    [0.5, 0.3, 'pecho'],
    [0.5, 0.39, 'plexo'],
    [0.5, 0.43, 'abdomen'],
    [0.4, 0.735, 'arraigo'],
  ] as const)('mapea el punto (%s,%s) al foco %s', (x, y, focusId) => {
    expect(energyFocusForBodyPoint(bodyPointAt(x, y)!).id).toBe(focusId);
  });

  it('solo activa la alerta torácica para un toque real en el pecho', () => {
    expect(needsChestSafety(bodyPointAt(0.5, 0.3)!)).toBe(true);
    expect(needsChestSafety(bodyPointAt(0.5, 0.43)!)).toBe(false);
  });

  it('elige el foco proyectado más cercano y rechaza el vacío', () => {
    const candidates = [
      { id: 'frente' as const, x: 20, y: 20 },
      { id: 'pecho' as const, x: 20, y: 80 },
    ];
    expect(pickEnergyFocus(candidates, 22, 77, 8)).toBe('pecho');
    expect(pickEnergyFocus(candidates, 80, 80, 8)).toBeNull();
  });

  it('valida el foco que viaja a la pantalla de meditación', () => {
    expect(parseEnergyFocusId('abdomen')).toBe('abdomen');
    expect(parseEnergyFocusId(['frente'])).toBe('frente');
    expect(parseEnergyFocusId('diagnostico')).toBeNull();
    expect(parseEnergyFocusId(undefined)).toBeNull();
  });

  it('los textos no prometen curar ni asignan una causa física', () => {
    const focus = energyFocusForBodyPoint(bodyPointAt(0.5, 0.3)!);
    expect(`${focus.reflection} ${focus.cue}`).not.toMatch(/cura|sanar|causa|diagnóstico|enfermedad/i);
  });
});
