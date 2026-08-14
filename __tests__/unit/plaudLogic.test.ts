import {
  matchRecordingToUser,
  normalizeName,
  segmentsToTranscript,
} from '@/lib/plaudLogic';

describe('normalizeName', () => {
  it('quita acentos, baja a minúsculas y colapsa espacios', () => {
    expect(normalizeName('  Juan  PÉREZ  ')).toBe('juan perez');
    expect(normalizeName('María-José Núñez')).toBe('maria jose nunez');
  });

  it('quita puntuación sin pegar palabras', () => {
    expect(normalizeName('Juan Pérez — sesión 3 (semana 2)')).toBe('juan perez sesion 3 semana 2');
  });
});

describe('matchRecordingToUser', () => {
  const users = [
    { userId: 'u1', fullName: 'Juan Pérez' },
    { userId: 'u2', fullName: 'María José Núñez' },
    { userId: 'u3', fullName: 'Ana' },
    { userId: 'u4', fullName: 'Juan Pablo Ríos' },
  ];

  it('matchea nombre completo con acentos y guiones distintos', () => {
    expect(matchRecordingToUser('juan perez — mentoria semana 3', users)).toEqual({
      kind: 'match',
      userId: 'u1',
    });
    expect(matchRecordingToUser('Sesión con MARÍA JOSÉ NÚÑEZ', users)).toEqual({
      kind: 'match',
      userId: 'u2',
    });
  });

  it('nombre de una palabra matchea solo como palabra exacta, no substring', () => {
    expect(matchRecordingToUser('Sesión de Ana — cierre', users)).toEqual({
      kind: 'match',
      userId: 'u3',
    });
    // "Mariana" contiene "ana" como substring pero NO como palabra.
    expect(matchRecordingToUser('Sesión de Mariana', users)).toEqual({ kind: 'none' });
  });

  it('"Juan" solo no matchea a nadie (se exige nombre completo)', () => {
    expect(matchRecordingToUser('Juan — sesión', users)).toEqual({ kind: 'none' });
  });

  it('un título que contiene DOS clientes cae a ambiguo, no adivina', () => {
    const r = matchRecordingToUser('Juan Pérez y María José Núñez — sesión conjunta', users);
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') expect(r.userIds.sort()).toEqual(['u1', 'u2']);
  });

  it('secuencia contigua: "Juan Pablo Ríos" no matchea a "Juan Pérez"', () => {
    expect(matchRecordingToUser('Juan Pablo Ríos — semana 1', users)).toEqual({
      kind: 'match',
      userId: 'u4',
    });
  });

  it('sin candidatos o título vacío → none', () => {
    expect(matchRecordingToUser('', users)).toEqual({ kind: 'none' });
    expect(matchRecordingToUser('Juan Pérez', [])).toEqual({ kind: 'none' });
  });
});

describe('segmentsToTranscript', () => {
  it('convierte segmentos a "Speaker: texto" por línea', () => {
    const out = segmentsToTranscript([
      { speaker: 'Mentor', content: 'Hola, ¿cómo vas?' },
      { speaker: 'Cliente', content: 'Bien, cumplí el compromiso.' },
    ]);
    expect(out).toBe('Mentor: Hola, ¿cómo vas?\nCliente: Bien, cumplí el compromiso.');
  });

  it('tolera segmentos sin speaker, usa topic como fallback y salta vacíos', () => {
    const out = segmentsToTranscript([
      { content: 'Intro sin speaker' },
      { speaker: 'X', content: '   ' },
      { speaker: 'Y', topic: 'Cierre' },
    ]);
    expect(out).toBe('Intro sin speaker\nY: Cierre');
  });
});
