/**
 * tourLogic — el secuenciador puro del tour guiado.
 */
import { clampIndex, isLast, nextIndex, prevIndex, voiceUrlFor } from '@/lib/tourLogic';

describe('nextIndex / prevIndex', () => {
  it('avanza dentro de rango', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(prevIndex(2, 3)).toBe(1);
  });

  it('null en los extremos — no hay vuelta circular', () => {
    expect(nextIndex(2, 3)).toBeNull();
    expect(prevIndex(0, 3)).toBeNull();
  });
});

describe('isLast', () => {
  it('true solo en el último índice', () => {
    expect(isLast(2, 3)).toBe(true);
    expect(isLast(1, 3)).toBe(false);
  });
});

describe('clampIndex', () => {
  it('recorta a los límites válidos', () => {
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampIndex(2, 5)).toBe(2);
  });

  it('total 0 → siempre 0, no revienta', () => {
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe('voiceUrlFor', () => {
  it('apunta al bucket wellness-audio/tour/<id>.mp3', () => {
    expect(voiceUrlFor('comando')).toBe(
      'https://bizbbtiyftfjufxinwsu.supabase.co/storage/v1/object/public/wellness-audio/tour/comando.mp3',
    );
  });
});
