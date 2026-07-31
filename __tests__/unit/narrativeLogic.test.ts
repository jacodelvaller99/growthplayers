import {
  arcForDay,
  coherenceOf,
  deltaSince,
  milestoneCrossed,
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
    expect(arcForDay(1).line).toContain('1 día ');
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
});
