/**
 * Cuenta los MARCOS que realmente se pintan en una pantalla.
 *
 * Contar `<PremiumCard` en el fuente miente: una pantalla con rama móvil y
 * rama escritorio cuenta el doble, y una recompuesta sigue pareciendo densa.
 * Lo que importa es cuántas cajas con borde ve el usuario a la vez.
 *
 * Un marco es una caja con borde visible y radio. La regla de composición del
 * mockup —agrupar con rótulo y aire, enmarcar solo lo que de verdad es un
 * límite— se traduce en un número: pocos marcos, y ninguno dentro de otro.
 *
 *   node scripts/_marcos.mjs perfil/cliente paywall mentoria
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.env.AUDIT_BASE || 'http://localhost:8081';
const SESION = 'C:/tmp/polaris-session.json';
const rutas = process.argv.slice(2);
if (!rutas.length) { console.error('uso: node scripts/_marcos.mjs <ruta> [ruta...]'); process.exit(1); }

const nav = await chromium.launch();
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 },
  ...(existsSync(SESION) ? { storageState: SESION } : {}),
});
const pag = await ctx.newPage();

for (const ruta of rutas) {
  try {
    await pag.goto(`${BASE}/${ruta}`, { waitUntil: 'networkidle', timeout: 45000 });
    await pag.waitForTimeout(1200);
    const r = await pag.evaluate(() => {
      const esMarco = (el) => {
        const s = getComputedStyle(el);
        const b = parseFloat(s.borderTopWidth) || 0;
        const radio = parseFloat(s.borderTopLeftRadius) || 0;
        if (b < 1 || radio < 6) return false;
        // Borde transparente no es marco: no se ve.
        if (/rgba\(.*,\s*0\)/.test(s.borderTopColor)) return false;
        const c = el.getBoundingClientRect();
        return c.width > 120 && c.height > 44;   // descarta chips y botones
      };
      const todos = [...document.querySelectorAll('div')].filter(esMarco);
      // Sin esto, una pantalla que no cargó (redirección a login, error) sale
      // "0 marcos" y se lee como limpia. El primer texto delata cuál es.
      const vivo = (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 46);
      const anidados = todos.filter((el) => todos.some((o) => o !== el && o.contains(el)));
      const ficha = (el) =>
        (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 52) || '(sin texto)';
      return { vivo, marcos: todos.length, anidados: anidados.length,
               detalle: anidados.map((el) => {
                 const padre = todos.find((o) => o !== el && o.contains(el));
                 const c = padre.getBoundingClientRect();
                 return `"${ficha(el)}"  dentro de  "${ficha(padre)}" (${Math.round(c.width)}x${Math.round(c.height)})`;
               }) };
    });
    console.log(`${String(r.marcos).padStart(3)} marcos  ${String(r.anidados).padStart(2)} anidados  ${ruta}   << ${r.vivo}`);
    for (const d of r.detalle || []) console.log(`        ${d}`);
  } catch (e) {
    console.log(`  ??  ${ruta}  (${String(e.message).split('\n')[0].slice(0, 60)})`);
  }
}

await nav.close();
