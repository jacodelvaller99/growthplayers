/**
 * turnoLogic — la única opinión de la app sobre qué toca ahora.
 *
 * EL INVARIANTE QUE MANDA: siempre hay turno. La escalera degrada de más
 * informado a siempre-disponible, y el último peldaño no depende de nada. Si
 * algún día una rama devuelve null o undefined, la home se queda sin superficie
 * y volvemos al problema original — por eso hay un test que barre el espacio de
 * entradas en vez de fiarse de casos sueltos.
 */
import { selectTurno, type TurnoCheckIn, type TurnoKind } from '@/lib/turnoLogic';

const NARRATIVA = { headline: 'Esta semana vas hacia arriba.', why: 'Lo que haces funciona.' };
const SANO: TurnoCheckIn = { energy: 7, clarity: 7, stress: 3, sleep: 7 };

const base = {
  narrative: null, kind: null, todayCheckIn: null, daysSinceLastCheckIn: null,
} as const;

describe('peldaño 1 — narrativa de coaching', () => {
  it('manda sobre el check-in cuando hay narrativa con kind enrutable', () => {
    const t = selectTurno({
      ...base, narrative: NARRATIVA, kind: 'confront',
      todayCheckIn: { energy: 2, clarity: 2, stress: 9, sleep: 2 }, // gritaría en peldaño 2
    });
    expect(t.source).toBe('narrative');
    expect(t.route).toBe('/(tabs)/mentor');
    expect(t.headline).toBe(NARRATIVA.headline);
  });

  it.each<[TurnoKind, string]>([
    ['confront',    '/(tabs)/mentor'],
    ['reconnect',   '/checkin'],
    ['rest_signal', '/bienestar/respiracion'],
    ['support',     '/(tabs)/norte'],
    ['celebrate',   '/bienestar/diario'],
  ])('kind %s enruta a %s', (kind, route) => {
    const t = selectTurno({ ...base, narrative: NARRATIVA, kind });
    expect(t.route).toBe(route);
    expect(t.verb.length).toBeGreaterThan(0);
  });

  it('investigate NO enruta: cae al peldaño siguiente en vez de inventar destino', () => {
    const t = selectTurno({ ...base, narrative: NARRATIVA, kind: 'investigate', todayCheckIn: SANO });
    expect(t.source).not.toBe('narrative');
  });

  it('narrativa sin kind no basta — no se enruta a ciegas', () => {
    const t = selectTurno({ ...base, narrative: NARRATIVA, kind: null });
    expect(t.source).toBe('fallback');
  });
});

describe('peldaño 2 — reglas deterministas del check-in', () => {
  it('prioriza tensión alta por encima de todo lo demás', () => {
    const t = selectTurno({
      ...base, todayCheckIn: { energy: 2, clarity: 2, stress: 8, sleep: 2 },
    });
    expect(t.source).toBe('checkin');
    expect(t.route).toBe('/bienestar/respiracion');
    expect(t.delta).toContain('8/10'); // cita el dato real, no una vibra
  });

  it('sueño bajo manda cuando la tensión no está alta', () => {
    const t = selectTurno({ ...base, todayCheckIn: { energy: 8, clarity: 8, stress: 3, sleep: 3 } });
    expect(t.route).toBe('/bienestar/meditacion');
    expect(t.delta).toContain('3/10');
  });

  it('energía baja manda cuando sueño y tensión están bien', () => {
    const t = selectTurno({ ...base, todayCheckIn: { energy: 3, clarity: 8, stress: 3, sleep: 8 } });
    expect(t.route).toBe('/bienestar/binaurales');
  });

  it('coherencia alta empuja al protocolo, no al descanso', () => {
    const t = selectTurno({ ...base, todayCheckIn: { energy: 9, clarity: 9, stress: 1, sleep: 9 } });
    expect(t.route).toBe('/(tabs)/programas');
    expect(t.delta).toContain('Coherencia');
  });

  it('un día normal sin señal fuerte cae al fallback, no fuerza una recomendación', () => {
    const t = selectTurno({ ...base, todayCheckIn: SANO });
    expect(t.source).toBe('fallback');
  });
});

describe('peldaño 3 — fallback', () => {
  it('sin nada, manda al check-in y explica QUÉ SE GANA, no cuánto cuesta', () => {
    const t = selectTurno(base);
    expect(t.source).toBe('fallback');
    expect(t.route).toBe('/checkin');
    expect(t.why).toContain('ciegas');
    expect(t.why).not.toMatch(/solo (te )?toma/i); // nada de minimizar el esfuerzo
  });

  it('cita los días reales sin lectura', () => {
    expect(selectTurno({ ...base, daysSinceLastCheckIn: 3 }).delta).toContain('3 días');
    expect(selectTurno({ ...base, daysSinceLastCheckIn: 1 }).delta).toContain('ayer');
  });

  it('con lectura de hoy (0 días) no inventa un delta acusador', () => {
    expect(selectTurno({ ...base, daysSinceLastCheckIn: 0 }).delta).toBeNull();
  });

  it('usuario nuevo (nunca hizo lectura) no recibe delta', () => {
    expect(selectTurno({ ...base, daysSinceLastCheckIn: null }).delta).toBeNull();
  });
});

describe('invariantes que no se pueden romper', () => {
  const KINDS: (TurnoKind | null)[] =
    ['confront', 'support', 'celebrate', 'investigate', 'rest_signal', 'reconnect', null];
  const CHECKINS: (TurnoCheckIn | null)[] = [
    null, SANO,
    { energy: 1, clarity: 1, stress: 10, sleep: 1 },
    { energy: 10, clarity: 10, stress: 1, sleep: 10 },
  ];

  it('SIEMPRE hay turno, con verbo y ruta, en todo el espacio de entradas', () => {
    for (const narrative of [null, NARRATIVA]) {
      for (const kind of KINDS) {
        for (const todayCheckIn of CHECKINS) {
          for (const daysSinceLastCheckIn of [null, 0, 1, 9]) {
            const t = selectTurno({ narrative, kind, todayCheckIn, daysSinceLastCheckIn });
            expect(t).toBeTruthy();
            expect(t.headline.trim().length).toBeGreaterThan(0);
            expect(t.why.trim().length).toBeGreaterThan(0);
            expect(t.verb.trim().length).toBeGreaterThan(0);
            expect(t.route.startsWith('/')).toBe(true);
          }
        }
      }
    }
  });

  it('ningún copy amenaza con pérdida ni cuenta rachas (anti-gamificación de marca)', () => {
    const prohibido = /racha|no rompas|pierdes|perder|no dejes que|¡/i;
    for (const kind of KINDS) {
      for (const todayCheckIn of CHECKINS) {
        const t = selectTurno({ narrative: null, kind, todayCheckIn, daysSinceLastCheckIn: 5 });
        expect(`${t.headline} ${t.why} ${t.verb} ${t.delta ?? ''}`).not.toMatch(prohibido);
      }
    }
  });
});
