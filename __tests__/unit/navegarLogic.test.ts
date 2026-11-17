import { carpetaGuia, filtrarGuias, leerCatalogo } from '@/lib/navegarLogic';

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
