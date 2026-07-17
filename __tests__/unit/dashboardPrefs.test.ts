jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/observability', () => ({ logSilentError: jest.fn() }));

import { nextSelection, DASHBOARD_DEFAULTS, DASHBOARD_MAX } from '@/hooks/use-dashboard-prefs';

describe('nextSelection — lógica del tablero personalizable', () => {
  const base = [...DASHBOARD_DEFAULTS]; // ['racha','checkins','modulo','capacidad']

  it('agrega una métrica cuando hay espacio', () => {
    expect(nextSelection(['racha', 'checkins'], 'score')).toEqual(['racha', 'checkins', 'score']);
  });

  it('con el tablero lleno, desplaza la más antigua (FIFO) y añade al final', () => {
    expect(base.length).toBe(DASHBOARD_MAX);
    expect(nextSelection(base, 'score')).toEqual(['checkins', 'modulo', 'capacidad', 'score']);
  });

  it('quita una métrica seleccionada', () => {
    expect(nextSelection(base, 'modulo')).toEqual(['racha', 'checkins', 'capacidad']);
  });

  it('nunca baja de 2 métricas (retorna el mismo array)', () => {
    const two = ['racha', 'checkins'];
    expect(nextSelection(two, 'racha')).toBe(two);
  });

  it('el orden de selección es el orden de render', () => {
    let sel = ['racha', 'checkins'];
    sel = nextSelection(sel, 'sueno');
    sel = nextSelection(sel, 'energia');
    expect(sel).toEqual(['racha', 'checkins', 'sueno', 'energia']);
  });
});
