/**
 * Auditoría de UI sobre la app REAL: recorre todas las rutas a ancho de móvil y
 * MIDE en el navegador lo que no se puede ver leyendo código.
 *
 * Qué detecta:
 *   - desborde horizontal de la página (el cuerpo nunca debe hacer scroll lateral)
 *   - elementos cuyo contenido no cabe en su caja
 *   - titulares que PARTEN una palabra (el fallo que destapó cargar la fuente real:
 *     GrandisExtended mide ~21% más que el sustituto con el que se dimensionaron)
 *   - objetivos táctiles por debajo de 44px
 *   - que la tipografía de marca esté realmente aplicada, no en sustitución
 *
 * Sesión: las rutas privadas están tras un guard de cliente. Se siembra una
 * sesión LOCAL en localStorage para que rendericen en ESTADO VACÍO — no hay
 * datos reales ni se toca ningún servidor; sirve para auditar diseño y estados
 * vacíos, no para validar contenido.
 *
 *   node scripts/audit-ui.mjs [urlBase] [carpetaSalida] [--shots]
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:8081';
const OUT = process.argv.find((a, i) => i > 2 && !a.startsWith('--')) ?? 'C:/tmp/polaris-audit';
const SHOTS = process.argv.includes('--shots');

const SUPABASE_REF = 'bizbbtiyftfjufxinwsu';

const ROUTES = [
  '/(auth)/welcome', '/(auth)', '/pricing', '/legal/salud', '/legal/terminos', '/legal/privacidad',
  '/(tabs)/comando', '/(tabs)/norte', '/(tabs)/programas', '/(tabs)/mentor', '/(tabs)/progreso',
  '/checkin', '/paywall', '/perfil', '/perfil/apariencia', '/perfil/wearables', '/perfil/cliente',
  '/bienestar', '/bienestar/habitos', '/bienestar/ayuno', '/bienestar/cuerpo', '/bienestar/nutricion',
  '/bienestar/suplementacion', '/bienestar/biometrics', '/bienestar/respiracion', '/bienestar/meditacion',
  '/bienestar/binaurales', '/bienestar/sueno', '/bienestar/diario', '/bienestar/biblioteca',
  '/bienestar/grito', '/bienestar/tapping', '/bienestar/consciencia', '/bienestar/comunidad',
  '/bienestar/internista', '/bienestar/examenes', '/bienestar/movimiento', '/bienestar/escaneo',
  '/mentoria', '/comunidad', '/comunidad/mensajes', '/comunidad/conexiones',
  '/comunidad/espacios', '/comunidad/eventos', '/ritual',
  '/admin', '/admin/usuarios', '/admin/biometria', '/admin/memoria', '/admin/ranking', '/admin/plaud',
];

/** Se ejecuta DENTRO de la página. Devuelve los hallazgos de una ruta. */
const PROBE = () => {
  const out = { pageOverflow: 0, overflowing: [], wordBreaks: [], smallTargets: [], brandFont: false, textoVisible: 0 };

  out.pageOverflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

  const label = (el) => {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44);
    return `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}${t ? ` "${t}"` : ''}`;
  };

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.overflow === 'auto' || cs.overflow === 'scroll') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    // Contenido que no cabe en su caja (y la caja no scrollea).
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
      out.overflowing.push(`${label(el)} (${el.scrollWidth} > ${el.clientWidth})`);
    }

    // Titular que parte palabra: texto grande, varias líneas, y una palabra
    // suficientemente larga como para no caber sola en el ancho de línea.
    const size = parseFloat(cs.fontSize);
    const text = el.children.length === 0 ? (el.textContent || '').trim() : '';
    if (text && size >= 28) {
      const lineas = Math.round(r.height / (parseFloat(cs.lineHeight) || size * 1.2));
      const palabraMasLarga = Math.max(...text.split(/\s+/).map((w) => w.length), 0);
      // 0.74 em/carácter medido en GrandisExtended mayúsculas.
      if (lineas > 1 && palabraMasLarga * size * 0.74 > r.width + 2) {
        out.wordBreaks.push(`${label(el)} @${Math.round(size)}px en ${Math.round(r.width)}px`);
      }
    }

    // Objetivos táctiles.
    const clickable = el.getAttribute('role') === 'button' || el.tagName === 'BUTTON' || el.tagName === 'A' ||
      el.getAttribute('tabindex') === '0';
    if (clickable && el.children.length <= 2 && (r.height < 44 || r.width < 24)) {
      out.smallTargets.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }

    if (text.length > 1) out.textoVisible += text.length;
  }

  // ¿La fuente de marca está de verdad?
  const probe = document.createElement('div');
  probe.style.cssText = "font-family:'GrandisExtended';font-weight:700;font-size:64px;position:absolute;visibility:hidden;white-space:nowrap";
  probe.textContent = 'SISTEMA INTERNO';
  document.body.appendChild(probe);
  const w1 = probe.getBoundingClientRect().width;
  probe.style.fontFamily = 'Arial';
  const w2 = probe.getBoundingClientRect().width;
  probe.remove();
  out.brandFont = w1 > w2 * 1.1;

  const dedup = (a) => [...new Set(a)].slice(0, 12);
  out.overflowing = dedup(out.overflowing);
  out.wordBreaks = dedup(out.wordBreaks);
  out.smallTargets = dedup(out.smallTargets);
  return out;
};

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});

const [, , theme = 'dark', signal = 'semaforo'] =
  [null, null, process.env.AUDIT_THEME, process.env.AUDIT_SIGNAL];

await ctx.addInitScript(
  ([ref, t, s]) => {
    localStorage.setItem('polaris:theme', t);
    localStorage.setItem('polaris:signal', s);
    // Sesión LOCAL para pasar el guard de cliente y renderizar en estado vacío.
    // No autentica contra nada: las llamadas de red devolverán 401 y las
    // pantallas mostrarán sus estados vacíos, que es lo que se audita.
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '00000000-0000-4000-8000-000000000000', role: 'authenticated', exp })}.qa`;
    localStorage.setItem(
      `sb-${ref}-auth-token`,
      JSON.stringify({
        access_token: jwt, refresh_token: 'qa', expires_at: exp, expires_in: 86400, token_type: 'bearer',
        user: { id: '00000000-0000-4000-8000-000000000000', aud: 'authenticated', role: 'authenticated', email: 'qa@local' },
      }),
    );
  },
  [SUPABASE_REF, theme, signal],
);

const page = await ctx.newPage();
page.on('pageerror', (e) => errores.push(String(e).slice(0, 160)));
let errores = [];

const informe = [];
for (const route of ROUTES) {
  errores = [];
  const slug = route.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'root';
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(PROBE);
    r.route = route;
    r.url = page.url().replace(BASE, '');
    r.crash = errores.slice(0, 2);
    informe.push(r);
    if (SHOTS) await page.screenshot({ path: join(OUT, `${slug}.png`) });
    const problemas = r.pageOverflow + r.overflowing.length + r.wordBreaks.length + r.smallTargets.length;
    console.log(`${problemas === 0 ? 'OK  ' : 'MAL '} ${route.padEnd(32)} chars=${r.textoVisible} ${problemas ? `overflow=${r.pageOverflow} caja=${r.overflowing.length} corte=${r.wordBreaks.length} tap=${r.smallTargets.length}` : ''}`);
  } catch (e) {
    informe.push({ route, error: String(e).slice(0, 140) });
    console.log(`ERR  ${route} — ${String(e).slice(0, 90)}`);
  }
}

writeFileSync(join(OUT, 'informe.json'), JSON.stringify(informe, null, 2));
await browser.close();
console.log(`\ninforme -> ${join(OUT, 'informe.json')}`);
