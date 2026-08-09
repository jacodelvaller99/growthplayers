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
import { deriveJornada, type JornadaLog } from '@/lib/jornadaLogic';

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

  it('un día normal NUNCA manda a hacer el check-in que ya está hecho', () => {
    // ESTE TEST CERTIFICABA EL DEFECTO. Afirmaba `source === 'fallback'` y se
    // ponía verde mientras el usuario leía «Empieza por la lectura de hoy» con
    // la lectura hecha, un botón que decía «REVISAR CHECK-IN» a tres líneas y
    // un check verde de «SISTEMA EN LÍNEA» dos tarjetas abajo. Verificaba la
    // rama, no lo que se lee — el mismo hueco que dejó pasar `compact`.
    const t = selectTurno({ ...base, todayCheckIn: SANO, daysSinceLastCheckIn: 0 });
    expect(t.route).not.toBe('/checkin');
    expect(t.headline).not.toMatch(/lectura de hoy/i);
    expect(t.verb).not.toMatch(/CHECK-IN/i);
  });

  it('y lo reconoce con el dato, no con una frase amable', () => {
    // El día normal es el estado MÁS frecuente que existe: usuario sano que ya
    // se leyó. Ni corregir ni celebrar — avanzar, citando su coherencia real.
    const t = selectTurno({ ...base, todayCheckIn: SANO, daysSinceLastCheckIn: 0 });
    expect(t.source).toBe('checkin');
    expect(t.delta).toMatch(/Coherencia \d+\/10/);
  });

  it('sin lectura de hoy SÍ la pide, aunque la de ayer fuera hace horas', () => {
    // El borde que descarta arreglarlo en `fallback(dias === 0)`: comando.tsx
    // pasa 0 también cuando la última lectura fue hace menos de 24h pero NO es
    // de hoy (lectura a las 23:00, app abierta a las 06:00). Ahí «ya te leíste»
    // sería mentira. La bifurcación cuelga de `todayCheckIn`, no de los días.
    const t = selectTurno({ ...base, todayCheckIn: null, daysSinceLastCheckIn: 0 });
    expect(t.route).toBe('/checkin');
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

describe('NINGUN peldaño manda a hacer la lectura que ya esta hecha', () => {
  // POR QUE ESTE BLOQUE Y NO OTRO TEST DE RAMA: la ronda anterior arreglo el
  // peldaño 2 y escribio un test del peldaño 2. El peldaño 1 —el que manda en
  // cuanto el ML esta vivo, o sea el camino POR DEFECTO— seguia mandando al
  // check-in a quien ya lo hizo, y la suite estaba verde. Peor: el `it.each` de
  // arriba afirma reconnect -> /checkin SIN pasar `todayCheckIn`, asi que el
  // caso roto no se tocaba ni de refilon. Un test por rama deja pasar
  // exactamente esto; aqui se fija la PROPIEDAD de toda la funcion.
  const KINDS: TurnoKind[] = [
    'confront', 'support', 'celebrate', 'investigate', 'rest_signal', 'reconnect',
  ];

  it('con lectura de hoy, ningun kind del ML enruta a /checkin', () => {
    for (const kind of KINDS) {
      const t = selectTurno({
        narrative: { headline: 'Llevas un tiempo fuera del sistema.', why: 'x' },
        kind,
        todayCheckIn: SANO,
        daysSinceLastCheckIn: 0,
      });
      expect(t.route).not.toBe('/checkin');
      expect(t.verb).not.toMatch(/CHECK-IN/i);
    }
  });

  it('sin lectura de hoy, `reconnect` SI puede pedirla', () => {
    // El guard no rompe el caso legitimo: quien de verdad se fue y no se ha
    // leido hoy debe volver por la lectura.
    const t = selectTurno({
      narrative: { headline: 'Llevas un tiempo fuera del sistema.', why: 'x' },
      kind: 'reconnect',
      todayCheckIn: null,
      daysSinceLastCheckIn: 9,
    });
    expect(t.route).toBe('/checkin');
  });
});

describe('la jornada — el dia sano avanza de paso en paso', () => {
  // El estado congelado a matar: tras el check-in, el turno decia "ABRIR EL
  // PROTOCOLO" el resto del dia aunque el usuario ya hubiera ejecutado,
  // regulado y escrito. Con `jornada`, las DOS ramas del dia sano (ventana
  // alta y banda operativa) avanzan al paso actual. Alarmas y narrativa
  // siguen mandando — mandan a regulacion, que ES un paso.
  const HOY = '2026-08-06';
  const jornadaDe = (opts: {
    log?: JornadaLog | null; checkIn?: boolean; wellness?: boolean;
  }) => deriveJornada({
    today: HOY,
    log: opts.log ?? null,
    hasCheckInToday: opts.checkIn ?? true,
    wellnessToday: opts.wellness ?? false,
  });

  it('sin jornada, el output es EXACTAMENTE el de siempre — cero regresion', () => {
    const sin = selectTurno({ ...base, todayCheckIn: SANO });
    const conUndefined = selectTurno({ ...base, todayCheckIn: SANO, jornada: undefined });
    const conNull = selectTurno({ ...base, todayCheckIn: SANO, jornada: null });
    expect(conUndefined).toEqual(sin);
    expect(conNull).toEqual(sin);
    expect(sin.route).toBe('/(tabs)/programas');
  });

  it('banda operativa + paso actual EJECUTA → a la leccion, con deep link si lo hay', () => {
    const j = jornadaDe({ checkIn: true });
    expect(j.current).toBe('ejecuta');
    const t = selectTurno({ ...base, todayCheckIn: SANO, jornada: j, nextLessonRoute: '/lesson/l1' });
    expect(t.route).toBe('/lesson/l1');
    expect(t.verb).toBe('EJECUTAR LA LECCIÓN');
    expect(t.delta).toContain('Paso 2 de 4');
  });

  it('sin deep link, EJECUTA cae al catalogo — nunca a una ruta rota', () => {
    const t = selectTurno({ ...base, todayCheckIn: SANO, jornada: jornadaDe({}) });
    expect(t.route).toBe('/(tabs)/programas');
  });

  it('leccion hecha → REGULA; regulado → CIERRA', () => {
    const conLeccion = jornadaDe({ log: { date: HOY, done: ['ejecuta'] } });
    expect(selectTurno({ ...base, todayCheckIn: SANO, jornada: conLeccion }).route)
      .toBe('/bienestar/respiracion');

    const regulado = jornadaDe({ log: { date: HOY, done: ['ejecuta'] }, wellness: true });
    const t = selectTurno({ ...base, todayCheckIn: SANO, jornada: regulado });
    expect(t.route).toBe('/bienestar/diario');
    expect(t.verb).toBe('CERRAR LA JORNADA');
    expect(t.delta).toContain('Paso 4 de 4');
  });

  it('jornada completa → progreso, sin pedir nada mas', () => {
    const completa = jornadaDe({
      log: { date: HOY, done: ['ejecuta', 'cierra'] }, wellness: true,
    });
    expect(completa.complete).toBe(true);
    const t = selectTurno({ ...base, todayCheckIn: SANO, jornada: completa });
    expect(t.route).toBe('/(tabs)/progreso');
    expect(t.headline).toBe('Jornada completa.');
  });

  it('la ALARMA gana a la jornada: tension 8 manda a respirar aunque toque ejecutar', () => {
    const t = selectTurno({
      ...base,
      todayCheckIn: { energy: 7, clarity: 7, stress: 8, sleep: 7 },
      jornada: jornadaDe({}),
      nextLessonRoute: '/lesson/l1',
    });
    expect(t.route).toBe('/bienestar/respiracion');
    expect(t.delta).toContain('8/10'); // el dato de la alarma, no el paso
  });

  it('la NARRATIVA gana a la jornada: el ML afina por encima de la mision', () => {
    const t = selectTurno({
      ...base,
      narrative: NARRATIVA, kind: 'confront',
      todayCheckIn: SANO,
      jornada: jornadaDe({}),
    });
    expect(t.source).toBe('narrative');
    expect(t.route).toBe('/(tabs)/mentor');
  });

  it('la ventana alta tambien avanza por la jornada en vez de repetir el catalogo', () => {
    const t = selectTurno({
      ...base,
      todayCheckIn: { energy: 9, clarity: 9, stress: 1, sleep: 9 },
      jornada: jornadaDe({ log: { date: HOY, done: ['ejecuta'] } }),
    });
    expect(t.route).toBe('/bienestar/respiracion');
  });
});
