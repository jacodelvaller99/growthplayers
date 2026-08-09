/**
 * Las lecciones de un modulo abierto estan TODAS abiertas.
 *
 * POR QUE ESTE FICHERO: desbloquear los modulos sin tocar esto dejaria al
 * cliente entrando al Modulo 3 para encontrarse seis candados dentro. El gate
 * de leccion era el mismo defecto un nivel mas abajo: la N cerrada hasta
 * completar la N-1.
 *
 * Se lee `deriveLessonStatus` del fichero de pantalla porque es privada a
 * proposito (nadie mas debe decidir el estado de una leccion) y exportarla
 * solo para el test seria ensanchar la superficie publica. El mismo patron que
 * usa `bodyMapLogic.test.ts` con `ZONE_BOX`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '../../app/module/[id].tsx'), 'utf8');

describe('deriveLessonStatus — ninguna leccion queda cerrada', () => {
  it('ya no existe el estado `locked` en la firma', () => {
    // El tipo de retorno ES el contrato: si vuelve 'locked', vuelve el candado.
    const firma = src.match(/\): '(completed[^;]*)';/)?.[1] ?? '';
    expect(firma).not.toContain('locked');
    expect(firma).toContain('available');
  });

  it('las filas son todas navegables', () => {
    expect(src).toMatch(/const isNavigable = true;/);
  });

  it('solo UNA leccion sale destacada: la primera pendiente', () => {
    // Si todas salieran 'active' las siete filas irian con fondo dorado, que es
    // exactamente el «nada es primero» que el resto del producto evita.
    expect(src).toMatch(/primeraPendiente/);
    expect(src).toMatch(/lessonIndex === primeraPendiente \? 'active' : 'available'/);
  });
});
