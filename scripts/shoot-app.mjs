/**
 * Fotografía la app entera, pantalla por pantalla, móvil y escritorio.
 *
 * El sistema vivo tiene que mostrar la aplicación REAL, no una teoría sobre
 * ella. Esto la recorre con la sesión ya iniciada y deja un WebP por ruta y
 * tamaño en `C:/tmp/polaris-shots/`.
 *
 *   node scripts/shoot-app.mjs            # todas las rutas
 *   node scripts/shoot-app.mjs comando    # solo unas
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.env.AUDIT_BASE || 'http://localhost:8081';
const SESION = 'C:/tmp/polaris-session.json';
const SALIDA = 'C:/tmp/polaris-shots';
const ALTO_MAX = 1800;          // una captura más larga que esto ya no se mira

/** Las rutas salen del árbol de archivos: una pantalla nueva entra sola. */
function todasLasRutas() {
  const salida = execSync(
    `find app -name "*.tsx" ! -name "_layout.tsx" ! -name "+*.tsx" ! -path "*oauth*"`,
    { encoding: 'utf8', shell: 'C:/Program Files/Git/bin/bash.exe' },
  );
  return [...new Set(salida.split('\n').filter(Boolean)
    .map((f) => f.replace(/^app\//, '').replace(/\.tsx$/, '').replace(/\/index$/, ''))
    .filter((r) => !r.includes('[') && r !== 'index' && !r.startsWith('(auth)')
                && !r.startsWith('(onboarding)') && r !== 'body-context')
    .map((r) => r.replace(/^\(tabs\)\//, '')))].sort();
}

const rutas = process.argv.slice(2).length ? process.argv.slice(2) : todasLasRutas();
if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true });

const TAMANOS = [
  { id: 'movil', width: 390, height: 844 },
  { id: 'pc',    width: 1280, height: 860 },
];

const nav = await chromium.launch();
const inventario = [];

/**
 * Antes de fotografiar nada: comprobar que la sesión SIGUE VIVA.
 *
 * El token de acceso caduca en una hora. Sin esta comprobación, un fichero de
 * sesión caducado produce sesenta capturas idénticas de la pantalla de
 * bienvenida y la galería se publica con aspecto de estar completa. Pasó.
 * Fallar aquí, ruidosamente, cuesta un minuto; publicar la mentira cuesta la
 * confianza en todo lo demás.
 */
{
  const ctx = await nav.newContext(existsSync(SESION) ? { storageState: SESION } : {});
  const pag = await ctx.newPage();
  await pag.goto(`${BASE}/comando`, { waitUntil: 'networkidle', timeout: 45000 });
  await pag.waitForTimeout(2500);
  const url = pag.url();
  await ctx.close();
  if (/\/welcome|\/login|\/\(auth\)/.test(url)) {
    await nav.close();
    console.error(`SESION CADUCADA -- /comando acabó en ${url}`);
    console.error('Vuelve a guardar la sesión y repite. Sin esto solo saldría la bienvenida.');
    process.exit(2);
  }
}

for (const t of TAMANOS) {
  const ctx = await nav.newContext({
    viewport: { width: t.width, height: t.height },
    deviceScaleFactor: 1,
    ...(existsSync(SESION) ? { storageState: SESION } : {}),
  });
  const pag = await ctx.newPage();

  for (const ruta of rutas) {
    const nombre = `${ruta.replace(/\//g, '_')}.${t.id}.jpg`;
    try {
      await pag.goto(`${BASE}/${ruta}`, { waitUntil: 'networkidle', timeout: 45000 });
      await pag.waitForTimeout(1100);

      // Una ruta que no cargó no se fotografía: una imagen de "no encontrado"
      // en la galería es peor que una ausencia declarada.
      const texto = (await pag.evaluate(() => document.body.innerText || '')).trim();
      if (!texto || /could not be found|Unmatched Route/i.test(texto)) {
        inventario.push({ ruta, tamano: t.id, error: 'no renderiza' });
        continue;
      }

      const alto = Math.min(
        await pag.evaluate(() => document.documentElement.scrollHeight), ALTO_MAX,
      );
      await pag.setViewportSize({ width: t.width, height: Math.max(alto, t.height) });
      await pag.waitForTimeout(350);
      // Playwright solo exporta png o jpeg. El png de una pantalla llena
      // pesa megas; jpeg con calidad media es lo que hace que la galería
      // entera quepa en una sola página.
      const buf = await pag.screenshot({ type: 'jpeg', quality: t.id === 'pc' ? 46 : 58 });
      writeFileSync(`${SALIDA}/${nombre}`, buf);
      await pag.setViewportSize({ width: t.width, height: t.height });

      inventario.push({ ruta, tamano: t.id, archivo: nombre, kb: Math.round(buf.length / 1024) });
      console.log(`  ${t.id.padEnd(5)} ${String(Math.round(buf.length / 1024)).padStart(4)}kb  ${ruta}`);
    } catch (e) {
      inventario.push({ ruta, tamano: t.id, error: String(e.message).split('\n')[0].slice(0, 70) });
      console.log(`  ${t.id.padEnd(5)}   --   ${ruta}  (${String(e.message).split('\n')[0].slice(0, 50)})`);
    }
  }
  await ctx.close();
}

await nav.close();
writeFileSync(`${SALIDA}/inventario.json`, JSON.stringify(inventario, null, 2));
const ok = inventario.filter((i) => i.archivo);
console.log(`\n${ok.length} capturas · ${Math.round(ok.reduce((a, i) => a + i.kb, 0) / 1024)}MB · ${inventario.length - ok.length} fallos`);
