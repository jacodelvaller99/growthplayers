import {
  arcForDay,
  journeyOf,
  coherenceOf,
  deltaSince,
  milestoneCrossed,
  RECENT_DAYS,
  RETURN_LINE,
  type CheckInReading,
} from '@/lib/narrativeLogic';

const reading = (o: Partial<CheckInReading> = {}): CheckInReading => ({
  energy: 7,
  clarity: 7,
  stress: 4,
  sleep: 7,
  ...o,
});

describe('arcForDay', () => {
  it('cubre los 6 escalones en sus fronteras exactas', () => {
    // Las fronteras son lo único que puede romperse al editar el guion:
    // un `<=` que se vuelve `<` mueve un día entero al acto equivocado.
    expect(arcForDay(1).act).toBe('inicio');
    expect(arcForDay(3).act).toBe('inicio');
    expect(arcForDay(4).act).toBe('filtro');
    expect(arcForDay(7).act).toBe('filtro');
    expect(arcForDay(8).act).toBe('grabado');
    expect(arcForDay(14).act).toBe('grabado');
    expect(arcForDay(15).act).toBe('automatico');
    expect(arcForDay(30).act).toBe('automatico');
    expect(arcForDay(31).act).toBe('profundidad');
    expect(arcForDay(60).act).toBe('profundidad');
    expect(arcForDay(61).act).toBe('identidad');
    expect(arcForDay(90).act).toBe('identidad');
    expect(arcForDay(200).act).toBe('identidad');
  });

  it('agrupa los 6 escalones en 3 actos monótonos', () => {
    // El número de acto nunca puede retroceder al avanzar el día: sería un
    // usuario "desprogresando" de acto, que es lo contrario de un arco.
    let last = 0;
    for (let d = 1; d <= 120; d++) {
      const n = arcForDay(d).actNumber;
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(last).toBe(3);
  });

  it('concuerda singular/plural en el primer día', () => {
    // El invariante es la CONCORDANCIA, no el espacio que venía detrás: la
    // rama ahora dice "Llevas 1 día aquí." (acompañamiento, sin amenaza).
    expect(arcForDay(1).line).toContain('1 día aquí');
    expect(arcForDay(1).line).not.toContain('1 días');
    expect(arcForDay(2).line).toContain('2 días');
  });

  it('clampa días inválidos al acto de arranque en vez de romper la frase', () => {
    // protocolDay llega de un perfil sin fecha de inicio; 0/NaN/negativo son reales.
    for (const bad of [0, -5, NaN]) {
      expect(arcForDay(bad).act).toBe('inicio');
      expect(arcForDay(bad).line).not.toContain('NaN');
      expect(arcForDay(bad).line).not.toContain('-');
    }
  });

  it('siempre entrega una etiqueta y una línea no vacías', () => {
    for (let d = 1; d <= 95; d++) {
      const a = arcForDay(d);
      expect(a.actLabel.length).toBeGreaterThan(0);
      expect(a.line.length).toBeGreaterThan(0);
    }
  });
});

describe('coherenceOf', () => {
  it('replica exactamente la fórmula viva de app/checkin.tsx:284', () => {
    // Este test es un contrato anti-divergencia: si alguien cambia una de las
    // dos fórmulas sin la otra, el usuario ve dos coherencias distintas para
    // el mismo check-in en la misma pantalla.
    const formulaDeLaPantalla = (r: CheckInReading) =>
      Math.round((r.energy + r.clarity + r.sleep + (11 - r.stress)) / 4);

    for (let e = 1; e <= 10; e += 3)
      for (let c = 1; c <= 10; c += 3)
        for (let s = 1; s <= 10; s += 3)
          for (let sl = 1; sl <= 10; sl += 3) {
            const r = { energy: e, clarity: c, stress: s, sleep: sl };
            expect(coherenceOf(r)).toBe(formulaDeLaPantalla(r));
          }
  });

  it('trata la carga como inversa', () => {
    const calmo = coherenceOf(reading({ stress: 1 }));
    const cargado = coherenceOf(reading({ stress: 10 }));
    expect(calmo).toBeGreaterThan(cargado);
  });
});

describe('deltaSince', () => {
  it('devuelve null sin registro previo — no inventa comparación', () => {
    expect(deltaSince(reading(), null)).toBeNull();
  });

  it('nombra la subida', () => {
    const msg = deltaSince(reading({ energy: 10, clarity: 10 }), reading());
    expect(msg).toContain('subió');
  });

  it('nombra la bajada sin culpabilizar', () => {
    const msg = deltaSince(reading({ energy: 1, clarity: 1 }), reading());
    expect(msg).toContain('bajó');
    // El tono importa: es un empresario midiendo su capacidad, no un alumno
    // suspendiendo. Si alguien mete "fracaso" como juicio, esto lo caza.
    expect(msg).toContain('no fracaso');
  });

  it('reconoce la estabilidad en vez de callarse', () => {
    expect(deltaSince(reading(), reading())).toContain('igual');
  });

  it('concuerda el singular de "punto"', () => {
    // energía +4 sobre la base sube exactamente 1 punto de coherencia
    const msg = deltaSince(reading({ energy: 11 }), reading());
    expect(msg).toContain('1 punto ');
    expect(msg).not.toContain('1 puntos');
  });
});

describe('milestoneCrossed', () => {
  it('no dispara sin estado previo — evita celebrar en el primer render', () => {
    expect(milestoneCrossed(null, { streak: 30, protocolDay: 45 })).toBeNull();
  });

  it('dispara solo en el cruce, no mientras se sostiene', () => {
    const prev = { streak: 6, protocolDay: 10 };
    expect(milestoneCrossed(prev, { streak: 7, protocolDay: 10 })?.id).toBe('streak-7');
    // Ya cruzado: al día siguiente NO debe volver a felicitar.
    expect(milestoneCrossed({ streak: 7, protocolDay: 10 }, { streak: 8, protocolDay: 10 })).toBeNull();
  });

  it('reconoce el día 30 y el día 90 del protocolo', () => {
    expect(milestoneCrossed({ streak: 1, protocolDay: 29 }, { streak: 1, protocolDay: 30 })?.id).toBe('day-30');
    expect(milestoneCrossed({ streak: 1, protocolDay: 89 }, { streak: 1, protocolDay: 90 })?.id).toBe('day-90');
  });

  it('no dispara en un día cualquiera', () => {
    expect(milestoneCrossed({ streak: 3, protocolDay: 12 }, { streak: 4, protocolDay: 13 })).toBeNull();
  });

  it('cita al usuario cuando escribió algo, y NO inventa cuando no', () => {
    // El Umbral le lee sus frases el día 0; sin esto la app no volvía a citarlo
    // nunca más y contaba los otros 89 días en genérico.
    const suyas = { painPoint: 'No logro parar de trabajar.', purpose: 'Construir sin quemarme' };
    const siete = milestoneCrossed({ streak: 6, protocolDay: 10 }, { streak: 7, protocolDay: 10 }, suyas);
    expect(siete?.line).toContain('No logro parar de trabajar');
    // Sin punto duplicado: el usuario escribe con puntuación y la frase que lo
    // envuelve ya cierra con la suya.
    expect(siete?.line).not.toContain('.».');

    const treinta = milestoneCrossed({ streak: 1, protocolDay: 29 }, { streak: 1, protocolDay: 30 }, suyas);
    expect(treinta?.line).toContain('Construir sin quemarme');

    // Los tres campos son opcionales: sin palabras, el hito se dice igual y no
    // aparece ninguna comilla vacía.
    const sinNada = milestoneCrossed({ streak: 6, protocolDay: 10 }, { streak: 7, protocolDay: 10 }, {});
    expect(sinNada?.line).not.toContain('«');
    expect(sinNada?.line).toContain('Siete días seguidos');
  });

  it('el hito de calendario no elogia sin lectura hoy (racha 0)', () => {
    const d30 = milestoneCrossed({ streak: 0, protocolDay: 29 }, { streak: 0, protocolDay: 30 }, { purpose: 'X' });
    expect(d30?.id).toBe('day-30');
    expect(d30?.line).not.toMatch(/Completaste|camino hecho/);
    const d90 = milestoneCrossed({ streak: 0, protocolDay: 89 }, { streak: 0, protocolDay: 90 });
    expect(d90?.line).not.toContain('Terminaste');
  });

  it('ningún hito amenaza con «la mayoría abandona»', () => {
    const casos = [
      milestoneCrossed({ streak: 6, protocolDay: 10 }, { streak: 7, protocolDay: 10 }),
      milestoneCrossed({ streak: 1, protocolDay: 29 }, { streak: 1, protocolDay: 30 }),
    ];
    for (const m of casos) expect(m?.line).not.toMatch(/mayoría abandona/);
  });
});

describe('arcForDay — el elogio exige actividad reciente', () => {
  it('días 1-3 acompañan sin amenazar', () => {
    for (const d of [1, 2, 3]) expect(arcForDay(d).line).not.toMatch(/abandona|mayoría/);
  });

  it('sin lectura reciente no dice «Superaste…» ni «Apareces»: dice el regreso', () => {
    for (const dias of [null, 4, 57]) {
      for (const dia of [12, 20, 45, 75]) {
        const a = arcForDay(dia, {}, dias);
        expect(a.line).toBe(RETURN_LINE);
        expect(a.line).not.toMatch(/Superaste|Apareces|disciplina/);
        expect(a.dayLabel).toBe(`DÍA ${dia} · 90`);
      }
    }
  });

  it('con lectura reciente conserva la voz de siempre', () => {
    expect(arcForDay(12, {}, 0).line).toContain('Superaste');
    expect(arcForDay(12, {}, RECENT_DAYS).line).toContain('Superaste');
  });

  it('omitir el dato (undefined) no cambia nada — compatibilidad', () => {
    expect(arcForDay(12, {}).line).toContain('Superaste');
  });

  it('la semana 1 no depende de la actividad', () => {
    expect(arcForDay(5, {}, 57).line).toBe(arcForDay(5, {}).line);
  });
});

describe('arcForDay cita al usuario — la voz diaria de los 90 dias', () => {
  // POR QUE: estas seis ramas se escribieron para que el arco dejara de hablarle
  // a cualquiera, y NADA las verificaba. El equivalente para `milestoneCrossed`
  // si existia. Ese hueco dejo pasar una ronda entera en la que la frase no se
  // pintaba en ninguna pantalla: verde en CI, invisible en producto.
  const suyas = {
    painPoint: 'No logro parar de trabajar.',
    purpose: 'Construir sin quemarme',
    identity: 'Alguien que sostiene',
  };

  it('el dia 3 le recuerda su obstaculo', () => {
    const a = arcForDay(3, suyas);
    expect(a.line).toContain('No logro parar de trabajar');
    expect(a.quoted).toBe(true);
  });

  it('el dia 5 le recuerda quien decide ser', () => {
    const a = arcForDay(5, suyas);
    expect(a.line).toContain('Alguien que sostiene');
    expect(a.quoted).toBe(true);
  });

  it('el dia 12 vuelve al obstaculo, dos semanas despues', () => {
    expect(arcForDay(12, suyas).line).toContain('No logro parar de trabajar');
  });

  it('los dias 20 y 45 citan el norte', () => {
    expect(arcForDay(20, suyas).line).toContain('Construir sin quemarme');
    expect(arcForDay(45, suyas).line).toContain('Construir sin quemarme');
  });

  it('el dia 75 le devuelve su identidad como hecho, no como decision', () => {
    const a = arcForDay(75, suyas);
    expect(a.line).toContain('Alguien que sostiene');
    expect(a.line).toContain('lo eres');
  });

  it('sin palabras suyas NO inventa una cita, y lo marca', () => {
    for (const dia of [1, 5, 12, 20, 45, 75]) {
      const a = arcForDay(dia, {});
      expect(a.quoted).toBe(false);
      expect(a.line).not.toContain('«');
      expect(a.line.length).toBeGreaterThan(0);
    }
  });

  it('la posicion en los 90 dias vive en el eyebrow, no dentro de la frase', () => {
    // Se mudo ahi porque el movil perdia el dato entero cuando la frase se
    // ocultaba: donde estas no puede depender de si la narrativa cabe.
    expect(arcForDay(12, suyas).dayLabel).toBe('DÍA 12 · 90');
    expect(arcForDay(12, {}).dayLabel).toBe('DÍA 12 · 90');
  });

  it('ninguna rama pasa de DOS oraciones — el parrafo era lo que la hacia impintable', () => {
    // Tres oraciones centradas encima del Mando fue la razon real de que
    // alguien la escondiera. Si vuelve a crecer, vuelve el incentivo.
    //
    // Se cuenta FUERA de la cita: `cita()` recorta el final pero no limpia por
    // dentro, asi que un punto en la frase del usuario inflaba la cuenta y
    // obligaba a assertar `<= 2` bajo un titulo que decia «UNA sola frase».
    // El test afirmaba mas de lo que medía — el patron de esta ronda entera.
    for (const dia of [1, 5, 12, 20, 45, 75]) {
      const nuestro = arcForDay(dia, suyas).line.replace(/«[^»]*»/g, '');
      const puntos = (nuestro.match(/[.!?]/g) ?? []).length;
      expect(puntos).toBeLessThanOrEqual(2);
      expect(nuestro.length).toBeLessThan(120);
    }
  });
});

// ─── buildHistoria — la historia completa, capítulo a capítulo ────────────────
import { buildHistoria } from '@/lib/narrativeLogic';

const historiaBase = {
  protocolDay: 30,
  completedLessonCount: 0,
  taskCount: 0,
  checkInsCount: 0,
  avgEnergy: 0,
  archetypesEarned: [] as string[],
};

describe('buildHistoria', () => {
  it('usuario nuevo sin datos: solo EL ARCO — la historia corta es verdad, no defecto', () => {
    const h = buildHistoria({ ...historiaBase, protocolDay: 2 });
    expect(h.map((c) => c.label)).toEqual(['EL ARCO']);
  });

  it('el umbral cita las palabras del usuario con «»', () => {
    const h = buildHistoria({ ...historiaBase, painPoint: 'No logro sostener el foco' });
    expect(h[0].label).toBe('EL UMBRAL');
    expect(h[0].text).toContain('«No logro sostener el foco»');
  });

  it('la declaración exige día >= 7 — antes de la semana 1 no hay identidad que citar', () => {
    const conIdentidad = { ...historiaBase, identity: 'Soy alguien que decide con calma' };
    expect(buildHistoria({ ...conIdentidad, protocolDay: 3 }).some((c) => c.label === 'LA DECLARACIÓN')).toBe(false);
    expect(buildHistoria({ ...conIdentidad, protocolDay: 10 }).some((c) => c.label === 'LA DECLARACIÓN')).toBe(true);
  });

  it('la evidencia junta lecciones, tareas, lecturas y arquetipos en una sola línea', () => {
    const h = buildHistoria({
      ...historiaBase,
      completedLessonCount: 5,
      taskCount: 2,
      checkInsCount: 14,
      archetypesEarned: ['GUERRERO'],
    });
    const ev = h.find((c) => c.label === 'LA EVIDENCIA');
    expect(ev).toBeDefined();
    expect(ev!.text).toContain('5 lecciones');
    expect(ev!.text).toContain('2 tareas');
    expect(ev!.text).toContain('14 lecturas');
    expect(ev!.text).toContain('GUERRERO');
  });

  it('HOY solo aparece con energía >= 7 y >= 5 lecturas — no celebra sin datos', () => {
    expect(buildHistoria({ ...historiaBase, avgEnergy: 8, checkInsCount: 3 }).some((c) => c.label === 'HOY')).toBe(false);
    expect(buildHistoria({ ...historiaBase, avgEnergy: 8, checkInsCount: 6 }).some((c) => c.label === 'HOY')).toBe(true);
    // «El sistema está funcionando» tras 57 días sin lectura sería mentira.
    expect(buildHistoria({ ...historiaBase, avgEnergy: 8, checkInsCount: 6, daysSinceLastCheckIn: 57 }).some((c) => c.label === 'HOY')).toBe(false);
  });

  it('el arquetipo lleva su artículo: «del GUERRERO», «de la COMPRENSIÓN»', () => {
    const ev = buildHistoria({ ...historiaBase, archetypesEarned: ['GUERRERO', 'COMPRENSIÓN'] })
      .find((c) => c.label === 'LA EVIDENCIA')!.text;
    expect(ev).toContain('del GUERRERO');
    expect(ev).toContain('de la COMPRENSIÓN');
    expect(ev).not.toContain('del COMPRENSIÓN');
  });

  it('vocabulario: sin lenguaje clínico ni bélico en ningún capítulo', () => {
    const h = buildHistoria({
      ...historiaBase,
      painPoint: 'x', identity: 'y', protocolDay: 45,
      completedLessonCount: 3, taskCount: 1, checkInsCount: 10, avgEnergy: 8,
      archetypesEarned: ['GUERRERO'],
    });
    const all = h.map((c) => c.text).join(' ').toLowerCase();
    for (const prohibida of ['patológic', 'deficiente', 'anormal', 'guerra', 'batalla', 'arma', 'enemigo']) {
      expect(all).not.toContain(prohibida);
    }
  });
});

describe('journeyOf — estás aquí en los 90 días', () => {
  it('tres actos de 30 días, con fronteras exactas', () => {
    expect(journeyOf(1).actNumber).toBe(1);
    expect(journeyOf(30).actNumber).toBe(1);
    expect(journeyOf(31).actNumber).toBe(2);
    expect(journeyOf(60).actNumber).toBe(2);
    expect(journeyOf(61).actNumber).toBe(3);
    expect(arcForDay(30).actNumber).toBe(1);
    expect(arcForDay(31).actNumber).toBe(2);
  });

  it('llena lo recorrido y deja vacío lo futuro', () => {
    const j = journeyOf(45);
    expect(j.fill[0]).toBe(1);
    expect(j.fill[1]).toBeCloseTo(0.5);
    expect(j.fill[2]).toBe(0);
    expect(j.week).toBe(7);
    expect(j.daysToNextAct).toBe(16);
  });

  it('clampa y cierra en el III sin próximo acto', () => {
    expect(journeyOf(0).day).toBe(1);
    expect(journeyOf(200)).toMatchObject({ day: 90, week: 13, actNumber: 3, daysToNextAct: null });
  });
});