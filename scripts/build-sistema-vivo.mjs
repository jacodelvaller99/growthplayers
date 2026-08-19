/**
 * Construye el Sistema Vivo: la app REAL, pantalla por pantalla.
 *
 * No es un catálogo de paletas ni una teoría del diseño — son las capturas que
 * `shoot-app.mjs` acaba de tomar del build que corre ahora mismo, móvil y
 * escritorio, embebidas en una sola página que se abre sin servidor.
 *
 *   node scripts/shoot-app.mjs && node scripts/build-sistema-vivo.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SHOTS = 'C:/tmp/polaris-shots';
const DESTINO = 'C:/tmp/sistema-vivo.html';

if (!existsSync(`${SHOTS}/inventario.json`)) {
  console.error('Faltan capturas. Corre primero: node scripts/shoot-app.mjs');
  process.exit(1);
}
const inventario = JSON.parse(readFileSync(`${SHOTS}/inventario.json`, 'utf8'));

/** Las secciones son las del producto, no las del árbol de archivos. */
const SECCIONES = [
  { id: 'nucleo', titulo: 'El núcleo',
    nota: 'El bucle diario: mirar, decidir, ejecutar, revisar.',
    test: (r) => ['comando', 'checkin', 'norte', 'progreso', 'mentor', 'mentoria', 'ritual', 'explore'].includes(r) },
  { id: 'bienestar', titulo: 'Bienestar',
    nota: 'El cuerpo como primer sistema. Prácticas, protocolo y lectura biométrica.',
    test: (r) => r.startsWith('bienestar') },
  { id: 'circulo', titulo: 'El Círculo',
    nota: 'La hermandad: espacios, eventos, conexiones y mensajes.',
    test: (r) => r.startsWith('comunidad') },
  { id: 'cuenta', titulo: 'Cuenta y acceso',
    nota: 'Perfil, dispositivos, apariencia, planes y textos legales.',
    test: (r) => r.startsWith('perfil') || r.startsWith('legal') || ['paywall', 'pricing', 'programas'].includes(r) },
  { id: 'admin', titulo: 'Panel del mentor',
    nota: 'Lo que ve quien acompaña. Nunca visible para el cliente.',
    test: (r) => r.startsWith('admin') },
];

const b64 = (archivo) => readFileSync(`${SHOTS}/${archivo}`).toString('base64');

const rutas = [...new Set(inventario.map((i) => i.ruta))].sort();
const porRuta = Object.fromEntries(rutas.map((r) => [r, {
  movil: inventario.find((i) => i.ruta === r && i.tamano === 'movil' && i.archivo),
  pc: inventario.find((i) => i.ruta === r && i.tamano === 'pc' && i.archivo),
}]));

const capturadas = rutas.filter((r) => porRuta[r].movil || porRuta[r].pc);
const sinCaptura = rutas.filter((r) => !porRuta[r].movil && !porRuta[r].pc);

const nombreBonito = (r) => (r === 'comando' ? 'Centro de comando'
  : r.split('/').pop().replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()));

function ficha(r) {
  const { movil, pc } = porRuta[r];
  const img = (e, clase, alt) => (e
    ? `<img loading="lazy" alt="${alt}" src="data:image/jpeg;base64,${b64(e.archivo)}">`
    : `<p class="falta">sin captura</p>`);
  return `<article class="ficha" id="p-${r.replace(/\//g, '-')}">
  <header><h3>${nombreBonito(r)}</h3><code>/${r}</code></header>
  <div class="par">
    <figure class="movil">${img(movil, 'movil', `${r} en móvil`)}<figcaption>390 px</figcaption></figure>
    <figure class="pc">${img(pc, 'pc', `${r} en escritorio`)}<figcaption>1280 px</figcaption></figure>
  </div>
</article>`;
}

const usadas = new Set();
const secciones = SECCIONES.map((s) => {
  const suyas = capturadas.filter((r) => !usadas.has(r) && s.test(r));
  suyas.forEach((r) => usadas.add(r));
  if (!suyas.length) return '';
  return `<section id="${s.id}">
  <div class="cab"><h2>${s.titulo}</h2><p>${s.nota}</p><span class="cuenta">${suyas.length} pantallas</span></div>
  ${suyas.map(ficha).join('\n')}
</section>`;
}).filter(Boolean).join('\n');

const sueltas = capturadas.filter((r) => !usadas.has(r));
const restantes = sueltas.length ? `<section id="otras">
  <div class="cab"><h2>Otras</h2><p>Pantallas que aún no entran en ninguna sección del producto.</p><span class="cuenta">${sueltas.length} pantallas</span></div>
  ${sueltas.map(ficha).join('\n')}
</section>` : '';

const fecha = process.env.SV_FECHA || '—';

const html = `<title>Polaris en vivo</title>
<style>
  :root{
    --tinta:#141312; --tinta-2:#4a4744; --papel:#f2efe9;
    --linea:#d3cdc1; --oro:#8a6500; --marco:#1a1917;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --tinta:#efece6; --tinta-2:#a09a90; --papel:#111110;
      --linea:#2c2a27; --oro:#ffc804; --marco:#000;
    }
  }
  :root[data-theme="dark"]{
    --tinta:#efece6; --tinta-2:#a09a90; --papel:#111110;
    --linea:#2c2a27; --oro:#ffc804; --marco:#000;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--papel);color:var(--tinta);
    font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .envoltura{max-width:1180px;margin:0 auto;padding:0 24px 96px}
  header.principal{padding:72px 0 40px;border-bottom:1px solid var(--linea)}
  h1{font-size:clamp(30px,5vw,52px);line-height:1.05;margin:0 0 12px;
    letter-spacing:-.02em;text-wrap:balance}
  .sub{color:var(--tinta-2);max-width:62ch;margin:0 0 28px;text-wrap:pretty}
  .resumen{display:flex;flex-wrap:wrap;gap:32px;font-variant-numeric:tabular-nums}
  .resumen div{display:flex;flex-direction:column}
  .resumen b{font-size:28px;line-height:1;color:var(--oro)}
  .resumen span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--tinta-2);margin-top:6px}
  nav.indice{position:sticky;top:0;z-index:10;background:var(--papel);
    border-bottom:1px solid var(--linea);padding:14px 0;display:flex;gap:20px;flex-wrap:wrap}
  nav.indice a{color:var(--tinta-2);text-decoration:none;font-size:12px;
    letter-spacing:.12em;text-transform:uppercase}
  nav.indice a:hover,nav.indice a:focus-visible{color:var(--oro)}
  section{padding-top:64px}
  .cab{margin-bottom:24px}
  .cab h2{font-size:26px;margin:0 0 6px;letter-spacing:-.01em}
  .cab p{margin:0;color:var(--tinta-2);max-width:60ch}
  .cuenta{display:inline-block;margin-top:10px;font-size:11px;letter-spacing:.14em;
    text-transform:uppercase;color:var(--oro)}
  .ficha{padding:28px 0;border-top:1px solid var(--linea)}
  .ficha header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .ficha h3{margin:0;font-size:17px;letter-spacing:-.01em}
  .ficha code{font-size:12px;color:var(--tinta-2)}
  .par{display:grid;grid-template-columns:minmax(0,210px) minmax(0,1fr);gap:24px;align-items:start}
  @media (max-width:720px){.par{grid-template-columns:1fr}}
  figure{margin:0}
  figcaption{margin-top:8px;font-size:10px;letter-spacing:.14em;
    text-transform:uppercase;color:var(--tinta-2)}
  img{display:block;width:100%;height:auto;max-height:660px;object-fit:cover;
    object-position:top;border:1px solid var(--linea);border-radius:10px;background:var(--marco)}
  .falta{margin:0;padding:28px;border:1px dashed var(--linea);border-radius:10px;
    color:var(--tinta-2);font-size:13px;text-align:center}
  footer{margin-top:72px;padding-top:24px;border-top:1px solid var(--linea);
    color:var(--tinta-2);font-size:13px}
</style>
<div class="envoltura">
<header class="principal">
  <h1>Polaris en vivo</h1>
  <p class="sub">Todas las pantallas de la aplicación tal como se ven ahora mismo, en móvil y en
     escritorio. No son maquetas ni bocetos: son capturas del build que está corriendo.</p>
  <div class="resumen">
    <div><b>${capturadas.length}</b><span>pantallas</span></div>
    <div><b>${inventario.filter((i) => i.archivo).length}</b><span>capturas</span></div>
    <div><b>${fecha}</b><span>actualizado</span></div>
  </div>
</header>

<nav class="indice">
  ${SECCIONES.map((s) => `<a href="#${s.id}">${s.titulo}</a>`).join('\n  ')}
  ${sueltas.length ? '<a href="#otras">Otras</a>' : ''}
</nav>

${secciones}
${restantes}

<footer>
  <p>Generado con <code>scripts/shoot-app.mjs</code> y <code>scripts/build-sistema-vivo.mjs</code>
     contra el servidor de desarrollo, con la sesión iniciada.</p>
  ${sinCaptura.length ? `<p>Sin captura en esta pasada: ${sinCaptura.map((r) => `<code>/${r}</code>`).join(' · ')}</p>` : ''}
</footer>
</div>`;

writeFileSync(DESTINO, html);
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
console.log(`${DESTINO} · ${capturadas.length} pantallas · ${mb} MB`);
if (Number(mb) > 15) console.log('AVISO: por encima de 15 MB — baja la calidad en shoot-app.mjs');
