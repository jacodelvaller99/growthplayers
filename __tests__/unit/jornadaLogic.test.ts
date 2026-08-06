/**
 * jornadaLogic — la misión diaria de 4 pasos que guía sin bloquear.
 */
import {
  deriveJornada,
  JORNADA_STEPS,
  localDateKey,
  markStep,
  nextStepAfter,
  type JornadaLog,
} from '@/lib/jornadaLogic';

const HOY = '2026-08-06';

const base = { today: HOY, log: null, hasCheckInToday: false, wellnessToday: false };

describe('deriveJornada — el estado del día', () => {
  it('día en cero: LÉETE es el paso actual y todo lo demás pendiente', () => {
    const j = deriveJornada(base);
    expect(j.current).toBe('leete');
    expect(j.complete).toBe(false);
    expect(j.doneCount).toBe(0);
    expect(j.steps.map((s) => s.state)).toEqual(['current', 'pending', 'pending', 'pending']);
  });

  it('con el check-in hecho, EJECUTA pasa a ser el actual', () => {
    const j = deriveJornada({ ...base, hasCheckInToday: true });
    expect(j.current).toBe('ejecuta');
    expect(j.steps[0].state).toBe('done');
    expect(j.doneCount).toBe(1);
  });

  it('un log de AYER se ignora por completo — el cambio de día resetea solo', () => {
    const logAyer: JornadaLog = { date: '2026-08-05', done: ['ejecuta', 'cierra'] };
    const j = deriveJornada({ ...base, log: logAyer });
    expect(j.current).toBe('leete');
    expect(j.doneCount).toBe(0);
  });

  it('orden libre: regular antes de leerse marca REGULA pero el actual sigue siendo LÉETE', () => {
    const j = deriveJornada({ ...base, wellnessToday: true });
    expect(j.current).toBe('leete');
    const regula = j.steps.find((s) => s.step === 'regula')!;
    expect(regula.state).toBe('done');
    expect(j.doneCount).toBe(1);
  });

  it('los cuatro hechos → jornada completa, current null', () => {
    const log: JornadaLog = { date: HOY, done: ['ejecuta', 'cierra'] };
    const j = deriveJornada({ ...base, log, hasCheckInToday: true, wellnessToday: true });
    expect(j.complete).toBe(true);
    expect(j.current).toBeNull();
    expect(j.doneCount).toBe(4);
    expect(j.steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('un paso desconocido en el log persistido no rompe ni cuenta', () => {
    // Un log viejo de una versión futura/corrupta no puede tumbar el tracker.
    const log = { date: HOY, done: ['ejecuta', 'volar'] } as unknown as JornadaLog;
    const j = deriveJornada({ ...base, log });
    expect(j.doneCount).toBe(1);
    expect(j.current).toBe('leete');
  });
});

describe('markStep — el log local', () => {
  it('marca sobre log null arrancando el día', () => {
    expect(markStep(null, HOY, 'ejecuta')).toEqual({ date: HOY, done: ['ejecuta'] });
  });

  it('es idempotente: marcar dos veces no duplica', () => {
    const uno = markStep(null, HOY, 'cierra');
    const dos = markStep(uno, HOY, 'cierra');
    expect(dos.done).toEqual(['cierra']);
  });

  it('un log de otro día se descarta al marcar — no arrastra pasos viejos', () => {
    const ayer: JornadaLog = { date: '2026-08-05', done: ['ejecuta'] };
    expect(markStep(ayer, HOY, 'cierra')).toEqual({ date: HOY, done: ['cierra'] });
  });
});

describe('nextStepAfter — qué ofrece la pantalla que acaba de completar', () => {
  it('tras regular con leete+ejecuta hechos, toca cerrar', () => {
    const j = deriveJornada({
      ...base,
      log: { date: HOY, done: ['ejecuta'] },
      hasCheckInToday: true,
    });
    expect(nextStepAfter(j, 'regula')).toBe('cierra');
  });

  it('tras el último paso no queda nada', () => {
    const j = deriveJornada({
      ...base,
      log: { date: HOY, done: ['ejecuta'] },
      hasCheckInToday: true,
      wellnessToday: true,
    });
    expect(nextStepAfter(j, 'cierra')).toBeNull();
  });

  it('fuera de orden: tras leerse sin nada más hecho, toca ejecutar', () => {
    const j = deriveJornada(base);
    expect(nextStepAfter(j, 'leete')).toBe('ejecuta');
  });
});

describe('localDateKey — la misma convención de día que isSameDay', () => {
  it('formatea año/mes/día LOCALES con ceros a la izquierda', () => {
    // Construida con constructor local (no ISO): esto ES la fecha local.
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('invariantes', () => {
  it('JORNADA_STEPS mantiene el orden canónico de la misión', () => {
    expect(JORNADA_STEPS).toEqual(['leete', 'ejecuta', 'regula', 'cierra']);
  });
});
