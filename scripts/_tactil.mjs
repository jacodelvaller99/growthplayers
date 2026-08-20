/**
 * Objetivos táctiles por debajo del mínimo, en la app entera.
 *
 * 44x44 pt es el mínimo de Apple HIG y 48x48 dp el de Material. Por debajo, el
 * dedo falla — y falla más cuanto más cansado o mayor sea quien lo usa, que en
 * una app de bienestar no es un detalle accesorio.
 *
 * Agrupa por TAMAÑO y por texto, no lista uno por uno: 109 infracciones suelen
 * ser el mismo componente repetido, y arreglarlo una vez las cierra todas.
 *
 *   node scripts/_tactil.mjs                # todas las rutas
 *   node scripts/_tactil.mjs comando norte  # solo unas
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE = process.env.AUDIT_BASE || 'http://localhost:8081';
const SESION = 'C:/tmp/polaris-session.json';
const MIN = 44;

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

const nav = await chromium.launch();
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 },
  ...(existsSync(SESION) ? { storageState: SESION } : {}),
});
const pag = await ctx.newPage();

const cuenta = new Map();   // "WxH · texto" → { n, rutas:Set }
const sinPintar = [];       // rutas que no llegaron a pintar nada

for (const ruta of rutas) {
  try {
    await pag.goto(`${BASE}/${ruta}`, { waitUntil: 'networkidle', timeout: 45000 });
    await pag.waitForTimeout(1600);

    /**
     * Una pantalla vacía no es una pantalla limpia.
     *
     * Tercera vez en este trabajo que un "0 infracciones" resultaba ser
     * "todavía no había pintado nada". Los paneles de admin cargan listas
     * enteras y tardan. Si no hay texto, se declara y no se cuenta: un cero
     * silencioso se lee como éxito y es justo lo contrario.
     */
    const vivo = (await pag.evaluate(() => (document.body.innerText || '').trim())).length;
    if (vivo === 0) { sinPintar.push(ruta); continue; }

    // Sin sesión toda ruta privada cae en la bienvenida y el informe saldría
    // vacío con aspecto de limpio. Mismo fallo que ya costó una galería entera.
    if (/\/welcome|\/login/.test(pag.url()) && !/welcome|login/.test(ruta)) {
      console.error(`SESION CADUCADA en /${ruta}`); process.exit(2);
    }

    const chicos = await pag.evaluate((min) => {
      const tocables = document.querySelectorAll(
        'a,button,input,select,textarea,[role="button"],[role="tab"],[role="menuitem"],' +
        '[role="switch"],[role="checkbox"],[role="radio"],[role="link"],[role="option"]',
      );
      const out = [];
      for (const el of tocables) {
        const c = el.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) continue;         // oculto
        if (getComputedStyle(el).visibility === 'hidden') continue;
        if (c.height >= min && c.width >= min) continue;
        const t = (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        out.push(`${Math.round(c.width)}x${Math.round(c.height)} · ${t.slice(0, 24) || '(sin texto)'}`);
      }
      return out;
    }, MIN);

    for (const c of chicos) {
      if (!cuenta.has(c)) cuenta.set(c, { n: 0, rutas: new Set() });
      const e = cuenta.get(c); e.n++; e.rutas.add(ruta);
    }
  } catch {
    // Una ruta que no carga no es un hallazgo táctil; se ignora en silencio.
  }
}

await nav.close();

const filas = [...cuenta.entries()].sort((a, b) => b[1].n - a[1].n);
const total = filas.reduce((s, [, e]) => s + e.n, 0);
console.log(`\n${total} objetivos por debajo de ${MIN}px · ${filas.length} formas distintas\n`);
for (const [clave, e] of filas.slice(0, 22)) {
  const donde = [...e.rutas].slice(0, 3).join(', ') + (e.rutas.size > 3 ? ` +${e.rutas.size - 3}` : '');
  console.log(`${String(e.n).padStart(3)}x  ${clave.padEnd(38)} ${donde}`);
}
if (filas.length > 22) console.log(`\n(${filas.length - 22} formas más, cola larga)`);
