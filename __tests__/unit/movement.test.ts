/**
 * Invariantes del catálogo de movimiento (`data/movement.ts`).
 *
 * POR QUÉ EXISTE: el catálogo se escribió con dos promesas falsas al usuario —
 * "Flow de 6 minutos" que duraba 60 segundos, y "Dos minutos para volver al
 * cuerpo" que duraba 50. El descuadre no rompe nada técnicamente, así que
 * ningún typecheck ni render lo detecta: solo lo nota el usuario cuando la
 * práctica termina cinco minutos antes de lo prometido.
 *
 * Es el mismo fallo que ya apareció en las meditaciones (11 sesiones con
 * `durationMinutes` que no cuadraba con la suma de fases). Un test es más
 * barato que volver a auditarlo a mano cada vez que se añade una práctica.
 */
import {
  MOVEMENT_PRACTICES,
  MOVEMENT_CATEGORY_META,
  type MovementPractice,
} from '@/data/movement';

/** Segundos reales de una práctica = suma de sus fases. La única verdad. */
function realSeconds(p: MovementPractice): number {
  return p.phases.reduce((acc, f) => acc + f.duration, 0);
}

/**
 * Números escritos con letra que aparecen de verdad en copy en español.
 * No se pretende cubrir todo el idioma: si alguien escribe "cuarenta y dos
 * minutos" el test no lo atrapa, y es un coste aceptable.
 */
const WORD_NUMBERS: Record<string, number> = {
  un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30,
};

const DURATION_CLAIM =
  /(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta)\s+(minutos?|segundos?)/gi;

/**
 * Extrae toda promesa de duración de un texto, en segundos.
 * Solo se aplica a `title` y `description` — el texto de las FASES dice cosas
 * como "inhala 4 segundos", que son instrucciones de respiración, no la
 * duración de la práctica. Meterlas aquí daría falsos positivos constantes.
 */
function claimedSeconds(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(DURATION_CLAIM)) {
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
    if (n == null) continue;
    out.push(m[2].toLowerCase().startsWith('minuto') ? n * 60 : n);
  }
  return out;
}

/** Margen: las fases se redondean, y "1 minuto" para 50s es honesto. */
const TOLERANCE_SECONDS = 20;

describe('MOVEMENT_PRACTICES — invariantes del catálogo', () => {
  it('no está vacío y cada práctica tiene fases reales', () => {
    expect(MOVEMENT_PRACTICES.length).toBeGreaterThan(0);
    for (const p of MOVEMENT_PRACTICES) {
      expect(p.phases.length).toBeGreaterThan(0);
      for (const f of p.phases) {
        expect(f.duration).toBeGreaterThan(0);
        expect(f.text.trim()).not.toBe('');
      }
    }
  });

  it('los ids son únicos (el progreso del usuario se guarda por practiceId)', () => {
    const ids = MOVEMENT_PRACTICES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada categoría declarada existe en MOVEMENT_CATEGORY_META', () => {
    for (const p of MOVEMENT_PRACTICES) {
      expect(MOVEMENT_CATEGORY_META[p.category]).toBeDefined();
    }
  });

  it('`durationMinutes` cuadra con la suma real de fases', () => {
    for (const p of MOVEMENT_PRACTICES) {
      const real = realSeconds(p);
      expect(Math.abs(real - p.durationMinutes * 60)).toBeLessThanOrEqual(
        TOLERANCE_SECONDS,
      );
    }
  });

  // El test que importa: atrapa el "Flow de 6 minutos" que duraba uno.
  it('ningún título ni descripción promete una duración que la práctica no cumple', () => {
    const lies: string[] = [];
    for (const p of MOVEMENT_PRACTICES) {
      const real = realSeconds(p);
      for (const field of [p.title, p.description]) {
        for (const claimed of claimedSeconds(field)) {
          if (Math.abs(claimed - real) > TOLERANCE_SECONDS) {
            lies.push(`${p.id}: promete ${claimed}s ("${field}") pero dura ${real}s`);
          }
        }
      }
    }
    expect(lies).toEqual([]);
  });
});
