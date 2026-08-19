/**
 * Toda ruta nueva entra por el guard o se declara pública a mano.
 *
 * POR QUE: `<Stack.Protected>` protege lo que está DECLARADO dentro. Una
 * pantalla nueva que nadie registra no da error ni aviso — simplemente queda
 * fuera, accesible sin sesión, y nada lo delata. Pasó dos veces:
 * `perfil/apariencia` y `bienestar/body-context`.
 *
 * Ninguna filtraba datos de usuario, pero la regla no es "no filtró": es que el
 * fallo por defecto de este patrón es ABRIR, no cerrar, y eso no puede depender
 * de que alguien se acuerde.
 *
 * Este test obliga a tomar la decisión: o va dentro del guard, o se añade
 * explícitamente abajo con su motivo.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { sync as glob } from 'glob';

const ROOT = join(__dirname, '../..');

/** Rutas que DEBEN ser accesibles sin sesión, con su porqué. */
const PUBLICAS: Record<string, string> = {
  'index': 'reparte a login/onboarding/app según estado',
  '(auth)': 'el propio acceso',
  '(onboarding)': 'alta: aún no hay perfil',
  'legal/privacidad': 'exigible por tienda sin estar registrado',
  'legal/terminos': 'exigible por tienda sin estar registrado',
  'legal/salud': 'exigible por tienda sin estar registrado',
  'pricing': 'página de venta',
  'oauth/whoop/callback': 'vuelta del proveedor OAuth',
  'oauth/oura/callback': 'vuelta del proveedor OAuth',
  'oauth/polar/callback': 'vuelta del proveedor OAuth',
  'oauth/strava/callback': 'vuelta del proveedor OAuth',
  '+not-found': 'pantalla de error',
};

function nombresDeclarados(bloque: string): Set<string> {
  return new Set([...bloque.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map((m) => m[1]));
}

describe('guard de rutas', () => {
  const layout = readFileSync(join(ROOT, 'app/_layout.tsx'), 'utf8');
  const ini = layout.indexOf('<Stack.Protected');
  const fin = layout.indexOf('</Stack.Protected>');

  it('el bloque protegido existe y no está vacío', () => {
    expect(ini).toBeGreaterThan(-1);
    expect(fin).toBeGreaterThan(ini);
    expect(nombresDeclarados(layout.slice(ini, fin)).size).toBeGreaterThan(30);
  });

  it('ninguna pantalla queda fuera del guard sin declararse pública', () => {
    const protegidas = nombresDeclarados(layout.slice(ini, fin));
    const publicasDeclaradas = nombresDeclarados(layout.slice(0, ini));

    const cubierta = (ruta: string) => {
      const grupo = ruta.split('/')[0];
      const padre = ruta.endsWith('/index') ? ruta.slice(0, -6) : null;
      return [ruta, grupo, padre].some(
        (k) => k != null && (protegidas.has(k) || publicasDeclaradas.has(k) || k in PUBLICAS),
      );
    };

    const huerfanas = glob('app/**/*.tsx', { cwd: ROOT, posix: true })
      .map((f) => f.replace(/^app\//, '').replace(/\.tsx$/, ''))
      .filter((r) => !r.includes('_layout') && !r.startsWith('+'))
      .filter((r) => !cubierta(r));

    expect(huerfanas).toEqual([]);
  });
});
