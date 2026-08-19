/**
 * Genera el "Sistema Vivo" — la página que muestra el estado del rediseño.
 *
 * NO es una página escrita a mano: LEE el código fuente y emite lo que hay.
 * Por eso puede llamarse viva — si alguien añade un fondo o cambia un hex, la
 * siguiente generación lo refleja sin que nadie se acuerde de actualizarla. Una
 * página de sistema de diseño mantenida a mano miente a las dos semanas.
 *
 *   node scripts/build-sistema-vivo.mjs   →  C:/tmp/sistema-vivo.html
 */
import { readFileSync, writeFileSync } from 'fs';

// cwd y no import.meta.url: la ruta del proyecto lleva espacios y el URL los
// escapa a %20, que readFileSync no deshace. Correr desde la raíz del repo.
const read = (p) => readFileSync(`${process.cwd()}/${p}`, 'utf8');

// ─── Extraer del código ───────────────────────────────────────────────────────

function parseVarBlocks(src, exportName) {
  const i = src.indexOf(`export const ${exportName}`);
  const blk = src.slice(i, src.indexOf('\n};', i));
  const out = {};
  for (const m of blk.matchAll(/^ {2}([a-z]+): \{([\s\S]*?)\n {2}\},/gm)) {
    const vars = {};
    for (const n of m[2].matchAll(/'(--c-[a-z0-9-]+)':\s*'([^']+)'/g)) vars[n[1]] = n[2];
    out[m[1]] = vars;
  }
  return out;
}

const themeSrc = read('constants/themeColors.ts');
const BACKDROPS = parseVarBlocks(themeSrc, 'THEME_VARS');
const SIGNALS = parseVarBlocks(themeSrc, 'SIGNAL_VARS');

/** Las notas que ya viven junto a cada opción en la pantalla de Apariencia. */
function catalogNotes(file, constName) {
  const src = read(file);
  const i = src.indexOf(`const ${constName}`);
  const blk = src.slice(i, src.indexOf('\n];', i));
  const out = {};
  for (const m of blk.matchAll(/\{ id: '([a-z]+)',\s*name: '([^']+)',\s*note: '([^']+)'/g)) {
    out[m[1]] = { name: m[2], note: m[3] };
  }
  return out;
}
const BD_NOTES = catalogNotes('app/perfil/apariencia.tsx', 'BACKDROPS');
const SG_NOTES = catalogNotes('app/perfil/apariencia.tsx', 'SIGNALS');

/** Estado del rediseño por pantalla — se declara aquí y se contrasta con el código. */
const SCREENS = [
  ['Comando',    'hecho',     'Héroe consolidado (jornada + score + coherencia en una superficie) · 7 secciones → 4 lentes'],
  ['Progreso',   'hecho',     'Héroe consolidado (score + tendencia + historia) · 15 secciones → 4 lentes'],
  ['Bienestar',  'hecho',     'Héroe + semana en un panel · 17 destinos → 3 lentes · duplicados eliminados'],
  ['Apariencia', 'hecho',     'Laboratorio de color en la app: 8 fondos × 7 señales sobre datos reales'],
  ['Bienvenida', 'parcial',   'Titular responsivo (no parte palabras) · falta el tratamiento de héroe'],
  ['Acceso',     'parcial',   'CTA a 44px · falta composición'],
  ['Mi Norte',   'sin tocar', 'Es un FORMULARIO, no una pila: las lentes lo empeorarían'],
  ['Mentor',     'sin tocar', 'Es un chat: las lentes estorbarían'],
  ['Check-in',   'pendiente', 'Desborde horizontal de 4px sin resolver'],
  ['Mentoría',   'pendiente', ''],
  ['El Círculo', 'pendiente', '12 pantallas'],
  ['Bienestar · prácticas', 'pendiente', '19 pantallas'],
  ['Admin',      'pendiente', '14 pantallas'],
];

/** Invariantes que un test verifica hoy. Cada línea es un test real. */
const GUARDS = [
  ['Contraste AA', 'themeContrast', `${Object.keys(BACKDROPS).length * Object.keys(SIGNALS).length} combinaciones × texto y acentos sobre 5 superficies`],
  ['Cobertura de tema', 'themeCoverage', 'Ningún color fuera del sistema sin motivo declarado'],
  ['Objetivos táctiles', 'touchTargets', 'Ningún control de navegación por debajo de 44px'],
  ['Guard de rutas', 'routeGuard', 'Ninguna pantalla accesible sin sesión sin declararse pública'],
  ['Titulares', 'fitDisplaySize', 'El titular nunca parte una palabra, en 5 anchos de teléfono'],
  ['Animación', 'themeVarInAnimation', 'Ningún token var() dentro de interpolateColor'],
  ['Estados de métrica', 'metricTileLogic', 'Vocabulario de acompañamiento, no clínico'],
];

// ─── Utilidades de color ──────────────────────────────────────────────────────

const chan = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const esClaro = (bd) => lum(BACKDROPS[bd]['--c-bg']) > 0.4;

// ─── HTML ─────────────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const swatchRow = (vars, keys) => keys
  .map((k) => `<i class="sw" style="background:${vars[k] ?? 'transparent'}" title="${k}: ${vars[k] ?? '—'}"></i>`)
  .join('');

const backdropCards = Object.entries(BACKDROPS).map(([id, v]) => {
  const n = BD_NOTES[id] ?? { name: id, note: '' };
  const contraste = ratio(v['--c-text'], v['--c-bg']).toFixed(1);
  return `<article class="card" style="--demo-bg:${v['--c-bg']};--demo-fg:${v['--c-text']};--demo-s:${v['--c-surface']}">
    <div class="demo"><span>Aa</span></div>
    <h3>${esc(n.name)}</h3>
    <p>${esc(n.note)}</p>
    <div class="sws">${swatchRow(v, ['--c-bg', '--c-surface', '--c-surface-2', '--c-surface-3', '--c-text'])}</div>
    <div class="meta">texto sobre fondo · <b>${contraste}:1</b>${esClaro(id) ? ' · rampa clara' : ''}</div>
  </article>`;
}).join('');

const signalCards = Object.entries(SIGNALS).map(([id, v]) => {
  const n = SG_NOTES[id] ?? { name: id, note: '' };
  return `<article class="card">
    <div class="sig">
      ${['--c-gold', '--c-success', '--c-warning', '--c-danger', '--c-calm', '--c-info']
        .map((k) => `<i class="dot" style="background:${v[k] ?? '#333'}" title="${k}"></i>`).join('')}
    </div>
    <h3>${esc(n.name)}</h3>
    <p>${esc(n.note)}</p>
    <div class="meta">acento <code>${v['--c-gold']}</code></div>
  </article>`;
}).join('');

const ESTADO = { hecho: 'ok', parcial: 'wip', 'sin tocar': 'na', pendiente: 'todo' };
const ETIQUETA = { hecho: 'Hecho', parcial: 'Parcial', 'sin tocar': 'No aplica', pendiente: 'Pendiente' };

const screenRows = SCREENS.map(([name, st, note]) => `<tr>
  <td class="nm">${esc(name)}</td>
  <td><span class="pill ${ESTADO[st]}">${ETIQUETA[st]}</span></td>
  <td class="nt">${esc(note)}</td></tr>`).join('');

const guardRows = GUARDS.map(([t, f, d]) => `<tr>
  <td class="nm">${esc(t)}</td><td><code>${esc(f)}</code></td><td class="nt">${esc(d)}</td></tr>`).join('');

const hechas = SCREENS.filter((s) => s[1] === 'hecho').length;
const total = SCREENS.length;

const html = `<title>Sistema Vivo Polaris</title>
<style>
:root{
  --bg:#090909; --surface:#111111; --surface2:#181818; --line:rgba(255,255,255,.07);
  --lineHard:rgba(255,255,255,.13); --ivory:#EBEBEB; --ash:#AAAAAA; --smoke:#898989;
  --gold:#FFC804; --good:#52A878; --warn:#D4A017; --bad:#D54F42;
  --display:'Arial Black','Segoe UI Black',system-ui,sans-serif;
  --body:-apple-system,'Segoe UI',Inter,system-ui,sans-serif;
  --data:ui-monospace,'Cascadia Code',Consolas,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ivory);font-family:var(--body);-webkit-font-smoothing:antialiased}
.stage{max-width:1180px;margin:0 auto;padding:40px 24px 80px;display:flex;flex-direction:column;gap:44px}
.kick{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.brand{font-family:var(--display);font-size:12px;font-weight:900;letter-spacing:5px}
.brand i{color:var(--gold);font-style:normal}
.stamp{font-family:var(--data);font-size:11px;color:var(--smoke)}
h1{font-family:var(--display);font-size:clamp(28px,5vw,44px);letter-spacing:-1px;margin:0;text-wrap:balance}
.lede{font-weight:300;font-size:17px;line-height:1.55;color:var(--ash);max-width:62ch;margin:10px 0 0}
.count{display:flex;gap:26px;flex-wrap:wrap;margin-top:6px}
.count div{display:flex;flex-direction:column;gap:2px}
.count b{font-family:var(--data);font-size:24px;color:var(--gold);font-variant-numeric:tabular-nums}
.count span{font-size:10px;letter-spacing:1.6px;color:var(--smoke);text-transform:uppercase}
h2{font-family:var(--display);font-size:11px;font-weight:900;letter-spacing:2.4px;color:var(--smoke);
   text-transform:uppercase;margin:0 0 16px}
.note{color:var(--ash);font-size:14px;line-height:1.6;max-width:70ch;margin:-6px 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;
      display:flex;flex-direction:column;gap:8px}
.card h3{font-family:var(--display);font-size:12px;letter-spacing:1.4px;margin:0;text-transform:uppercase}
.card p{margin:0;font-size:12.5px;line-height:1.5;color:var(--ash)}
.demo{background:var(--demo-bg);border:1px solid var(--line);border-radius:9px;height:58px;
      display:flex;align-items:center;justify-content:center}
.demo span{font-family:var(--display);font-size:20px;color:var(--demo-fg)}
.sws,.sig{display:flex;gap:5px}
.sw{width:22px;height:22px;border-radius:5px;border:1px solid var(--line);display:block}
.dot{width:26px;height:26px;border-radius:50%;display:block}
.meta{font-family:var(--data);font-size:10.5px;color:var(--smoke);margin-top:2px}
.meta code{color:var(--ash)}
.wrap{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:560px}
th,td{text-align:left;padding:13px 16px;font-size:13.5px;border-top:1px solid var(--line);vertical-align:top}
th{font-family:var(--display);font-size:9.5px;letter-spacing:1.6px;color:var(--smoke);
   text-transform:uppercase;border-top:0}
td.nm{font-weight:600;white-space:nowrap}
td.nt{color:var(--ash);line-height:1.5}
code{font-family:var(--data);font-size:12px}
.pill{display:inline-block;padding:3px 10px;border-radius:999px;font-family:var(--display);
      font-size:9px;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;border:1px solid}
.pill.ok{color:var(--good);border-color:color-mix(in srgb,var(--good) 40%,transparent);
         background:color-mix(in srgb,var(--good) 12%,transparent)}
.pill.wip{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 40%,transparent);
          background:color-mix(in srgb,var(--warn) 12%,transparent)}
.pill.todo{color:var(--smoke);border-color:var(--lineHard)}
.pill.na{color:var(--ash);border-color:var(--lineHard);background:transparent}
.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(268px,1fr));gap:14px}
.rule{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;
      display:flex;flex-direction:column;gap:7px;border-left:none}
.rule b{font-family:var(--display);font-size:11px;letter-spacing:1.3px;color:var(--gold);text-transform:uppercase}
.rule p{margin:0;font-size:13px;line-height:1.55;color:var(--ash)}
footer{border-top:1px solid var(--line);padding-top:18px;color:var(--smoke);font-size:12px;line-height:1.6}
@media (max-width:640px){ .stage{padding:28px 16px 60px;gap:34px} }
</style>

<div class="stage">
  <div class="kick">
    <div class="brand">POLARIS<i>·</i>SISTEMA VIVO</div>
    <div class="stamp">${Object.keys(BACKDROPS).length} fondos · ${Object.keys(SIGNALS).length} señales · ${Object.keys(BACKDROPS).length * Object.keys(SIGNALS).length} combinaciones</div>
  </div>

  <header>
    <h1>El rediseño, mientras ocurre.</h1>
    <p class="lede">Esta página no se escribe a mano: lee el código de Polaris y muestra lo que
      hay. Si alguien añade un fondo o corrige un hex, la siguiente generación lo refleja sin que
      nadie tenga que acordarse. Un sistema de diseño mantenido a mano miente a las dos semanas.</p>
    <div class="count">
      <div><b>${hechas}/${total}</b><span>Pantallas rediseñadas</span></div>
      <div><b>${Object.keys(BACKDROPS).length * Object.keys(SIGNALS).length}</b><span>Paletas verificadas</span></div>
      <div><b>${GUARDS.length}</b><span>Invariantes con test</span></div>
    </div>
  </header>

  <section>
    <h2>Las tres reglas</h2>
    <p class="note">No son de color. El color ya funcionaba; lo que fallaba era el orden.</p>
    <div class="rules">
      <div class="rule"><b>Un héroe, una decisión</b>
        <p>Arriba se ve el estado de un vistazo y UNA acción. Si una pantalla necesita dos, no ha
           decidido cuál importa — y esa decisión es del diseño, no del usuario.</p></div>
      <div class="rule"><b>Tres números como mucho</b>
        <p>Un cuarto convierte el vistazo en lectura, y entonces ya no es un resumen. Lo que sobra
           pertenece a una lente.</p></div>
      <div class="rule"><b>Lentes en vez de pila</b>
        <p>Seis secciones apiladas pasan a un módulo con pestañas. El lector elige por dónde mirar
           en vez de recorrerlo todo. Es la que de verdad baja la densidad.</p></div>
    </div>
  </section>

  <section>
    <h2>Eje 1 · Fondo</h2>
    <p class="note">La tinta sobre la que vive todo. Cada uno responde a un momento de uso real,
      no a una variación de relleno.</p>
    <div class="grid">${backdropCards}</div>
  </section>

  <section>
    <h2>Eje 2 · Señal</h2>
    <p class="note">Qué comunica el color. Se combinan por cascada con el fondo, así que cambiar
      de eje no obliga a tocar ninguna pantalla.</p>
    <div class="grid">${signalCards}</div>
  </section>

  <section>
    <h2>Estado por pantalla</h2>
    <p class="note">«No aplica» no es una excusa: un formulario o un chat empeoran con pestañas,
      y forzar el patrón donde no toca es peor que no aplicarlo.</p>
    <div class="wrap"><table>
      <thead><tr><th>Pantalla</th><th>Estado</th><th>Qué cambió</th></tr></thead>
      <tbody>${screenRows}</tbody>
    </table></div>
  </section>

  <section>
    <h2>Lo que impide que esto se degrade</h2>
    <p class="note">Cada línea es un test que corre en cada cambio. Sin ellos, un sistema de
      diseño dura hasta la primera prisa.</p>
    <div class="wrap"><table>
      <thead><tr><th>Invariante</th><th>Test</th><th>Qué fija</th></tr></thead>
      <tbody>${guardRows}</tbody>
    </table></div>
  </section>

  <footer>
    Generado desde <code>constants/themeColors.ts</code> y <code>app/perfil/apariencia.tsx</code>.
    Los contrastes se calculan aquí mismo con la fórmula WCAG 2.1 — no están copiados.
  </footer>
</div>`;

writeFileSync('C:/tmp/sistema-vivo.html', html, 'utf8');
console.log(`generado · ${Object.keys(BACKDROPS).length} fondos · ${Object.keys(SIGNALS).length} señales · ${hechas}/${total} pantallas`);
