import { aVtt, carpetaGuia, cueEn, filtrarGuias, leerCatalogo, leerSubtitulos } from '@/lib/navegarLogic';

const CAT = [
  { id: 'TPC01', n: '01', titulo: 'Hacer tu check-in', meta: '48 segundos', pasos: ['Toca Guardar.'], tips: ['¿Y si me equivoqué?'] },
  { id: 'TPC00', n: '00', titulo: 'Aprende a usar Polaris', meta: '85 segundos', pasos: ['Abre Hoy.'], tips: [] },
  { id: '../x', n: '02', titulo: 'Ruta rara', pasos: [] },
  { n: '03', titulo: 'Sin id' },
  null,
];

describe('navegarLogic', () => {
  it('lee el catálogo, ordena por número y descarta filas inválidas', () => {
    const l = leerCatalogo(CAT, 'cliente');
    expect(l.map((g) => g.id)).toEqual(['TPC00', 'TPC01']);
    expect(l[1]).toMatchObject({ rol: 'cliente', meta: '48 segundos', pasos: ['Toca Guardar.'] });
  });

  it('devuelve vacío si el catálogo no es una lista', () => {
    expect(leerCatalogo({ guias: [] }, 'admin')).toEqual([]);
  });

  it('busca sin tildes ni mayúsculas y exige todas las palabras', () => {
    const l = leerCatalogo(CAT, 'cliente');
    expect(filtrarGuias(l, 'CHECK equivoque').map((g) => g.id)).toEqual(['TPC01']);
    expect(filtrarGuias(l, 'polaris norte')).toEqual([]);
    expect(filtrarGuias(l, '  ')).toHaveLength(2);
  });

  it('arma la carpeta y rechaza rutas inválidas', () => {
    expect(carpetaGuia({ rol: 'admin', id: 'TPA01' })).toBe('admin/TPA01');
    expect(() => carpetaGuia({ rol: 'admin', id: '../TPA01' })).toThrow();
    expect(() => carpetaGuia({ rol: 'otro' as never, id: 'TPA01' })).toThrow();
  });
});

describe('subtítulos', () => {
  const cues = leerSubtitulos([{ d: 3, h: 5, t: 'La Jornada de abajo.' }, { d: 1.5, h: 3, t: 'Hola.' }, { d: 6, h: 6, t: 'vacía' }, { t: 'sin tiempos' }, null]);

  it('descarta filas rotas y ordena por inicio', () => {
    expect(cues.map((c) => c.t)).toEqual(['Hola.', 'La Jornada de abajo.']);
  });

  it('devuelve el texto del segundo actual o null entre frases', () => {
    expect(cueEn(cues, 4)).toBe('La Jornada de abajo.');
    expect(cueEn(cues, 5.5)).toBeNull();
  });

  it('genera WebVTT válido', () => {
    expect(aVtt(cues)).toBe('WEBVTT\n\n00:00:01.500 --> 00:00:03.000\nHola.\n\n00:00:03.000 --> 00:00:05.000\nLa Jornada de abajo.\n');
    expect(leerSubtitulos('x')).toEqual([]);
  });
});