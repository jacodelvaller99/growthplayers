import { EMPTY_PROGRESS, nextProgress } from '@/lib/videoProgress';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/observability', () => ({ logSilentError: jest.fn() }));

test('suma lo reproducido, ignora saltos y marca completado al 90 %', () => {
  let p = EMPTY_PROGRESS;
  for (let s = 0.25; s <= 10; s += 0.25) p = nextProgress(p, { seconds: s, percent: s / 100, duration: 100 });
  expect(Math.round(p.watched)).toBe(10);
  p = nextProgress(p, { seconds: 80, percent: 0.8, duration: 100 }); // salto: no cuenta como visto
  expect(Math.round(p.watched)).toBe(10);
  expect(p.maxPercent).toBe(0.8);
  expect(p.completed).toBe(false);
  p = nextProgress(p, { seconds: 90, percent: 0.9, duration: 100 });
  expect(p.completed).toBe(true);
  p = nextProgress(p, { seconds: 5, percent: 0.05, duration: 100 }); // volver atrás no baja el máximo
  expect(p.maxPercent).toBe(0.9);
});
