// Ensambla "Final": el Standalone v2 del dueño (diseño final, intacto) + las
// secciones adicionales. Embebe las fuentes que el bundler traía como assets
// (sus TTF de Grandis + Space Mono) para que el HTML sea autónomo.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = 'C:/Users/ASUS/OneDrive - Caja de Compensacion Familiar de Antioquia COMFAMA/Escritorio/JACO EL PROGRAMADOR/Growth Players-Polaris/.claude/worktrees/sweet-diffie/lifeflow';
const SRC = 'E:/QUATRO/ECOSISTEMA QUATRO/PROGRAMADOR DEL VALLE/POLARIS/Polaris - Landing Presentacion (Standalone).html';
const OUT = 'C:/Users/ASUS/AppData/Local/Temp/polaris-landing/index.html';
const DEST = 'E:/QUATRO/ECOSISTEMA QUATRO/PROGRAMADOR DEL VALLE/POLARIS/Polaris - Landing Presentacion (Final).html';
// Fuente de verdad servida en producción: Expo copia public/ tal cual al
// build (dist/); vercel.json reescribe la raíz "/" a este archivo.
const PUBLIC_DEST = join(repoRoot, 'public/landing.html');

const lines = readFileSync(SRC, 'utf8').split('\n');
const grab = (type) => {
  const i = lines.findIndex((l) => new RegExp(`^\\s*<script type="__bundler/${type}">`).test(l));
  if (i < 0) throw new Error('no ' + type);
  return JSON.parse(lines[i + 1].trim());
};
let html = grab('template');
const manifest = grab('manifest');

// 1) Fuentes: url("<uuid>") → data URI. Los TTF de Grandis vienen gzip
//    (compressed:true, magic 1f8b); el runtime del bundler los descomprime
//    con DecompressionStream('gzip') — aquí se hace en build y queda plano.
let fonts = 0;
html = html.replace(/url\("([0-9a-f-]{36})"\)/g, (m, id) => {
  const a = manifest[id];
  if (!a) throw new Error('asset faltante ' + id);
  let bytes = Buffer.from(a.data, 'base64');
  if (a.compressed) bytes = gunzipSync(bytes);
  fonts++;
  return `url(data:${a.mime};base64,${bytes.toString('base64')})`;
});

// 2) Desbloquear el scroll: el v2 fija html/body a 100vh en escritorio.
const lock = '@media (min-width:901px){html,body{height:100%;overflow:hidden}.page{height:100vh;height:100dvh;overflow:hidden}}';
if (!html.includes(lock)) throw new Error('regla de bloqueo no encontrada');
html = html.replace(lock, '');

// 3) Menú: apuntar a secciones que existen (mismo estilo de pills).
const navOld = html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/)[0];
const navNew = `<nav id="site-nav" aria-label="Primary">
<a class="appear appear--scale" href="#metodo" style="--d:.16s">El método</a>
<a class="appear appear--soft" href="#protocolo" style="--d:.28s">El protocolo</a>
<a class="appear appear--scale" href="#norman" style="--d:.4s">Norman IA</a>
<a class="appear appear--soft" href="#acceso" style="--d:.52s">Acceso</a>
</nav>`;
html = html.replace(navOld, navNew);

// 4) Pantalla 1 (header + hero + stats) envuelta en .screen; secciones después.
const openPage = '<div class="page">\n<div class="menu-backdrop"></div>';
if (!html.includes(openPage)) throw new Error('ancla .page');
html = html.replace(openPage, openPage + '\n<div class="screen">');
const endStats = '</footer>\n</div>\n<script>';
if (!html.includes(endStats)) throw new Error('ancla stats');
const extra = readFileSync(join(here, 'extra.html'), 'utf8');
html = html.replace(endStats, '</footer>\n</div>' + extra + '\n</div>\n<script>');

// 5) CSS de las secciones + JS de revelado.
html = html.replace('</style>', readFileSync(join(here, 'extra.css'), 'utf8') + '</style>');
const reveal = `<script>(function(){var rv=document.querySelectorAll('.reveal'),red=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&!red){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.12});rv.forEach(function(el){io.observe(el)})}
else{rv.forEach(function(el){el.classList.add('in')})}})();</script>\n</body>`;
html = html.replace('</body>', reveal);

// 6) Título coherente con el producto.
html = html.replace('<title>Polaris Growth Institute — Soberanía Empresarial</title>', '<title>Polaris Growth Institute — Protocolo Soberano</title>');

// 7) Estructura de marca Polaris (manual): brújula de 8 puntas + wordmark,
//    frase generadora como H1, badge del protocolo, sin claims no verificados.
const repo = 'C:/Users/ASUS/OneDrive - Caja de Compensacion Familiar de Antioquia COMFAMA/Escritorio/JACO EL PROGRAMADOR/Growth Players-Polaris/.claude/worktrees/sweet-diffie/lifeflow';
const logoPath = readFileSync(join(repo, 'assets/images/logo-responsive.svg'), 'utf8').match(/<path d="([^"]+)"/)[1];
const star4 = 'M12 1l1.8 9.2L23 12l-9.2 1.8L12 23l-1.8-9.2L1 12l9.2-1.8Z';
const must = (from, to) => { if (!html.includes(from)) throw new Error('ancla marca: ' + from.slice(0, 60)); html = html.replace(from, to); };
must(`<svg viewBox="0 0 24 24" fill="currentColor"><path d="${star4}"></path></svg><span>Polaris<span class="logo-suffix">&nbsp;Growth</span></span>`,
     `<svg viewBox="0 0 535.02 535.02" fill="currentColor" aria-hidden="true"><path d="${logoPath}"></path></svg><span class="wm"><b>Polaris</b><span>Growth Institute</span></span>`);
must('Soberanía Empresarial · Acceso 2026', 'Protocolo Soberano · 90 días');
must('Escala tu empresa <em>sin destruir</em></span><span class="headline-line appear appear--mask" style="--d:.62s">tu paz interior.</span>',
     'Busca el estado,</span><span class="headline-line appear appear--mask" style="--d:.62s"><em>no el resultado.</em></span>');
must('El Método Polaris integra estrategia, biología y conciencia para que tu negocio crezca mientras tú recuperas tiempo, energía y claridad.',
     'Polaris no es una app de hábitos. Es un protocolo de 90 días para reprogramar tu mente, regular tus emociones, elevar tu energía vital y construir un estado interno imperturbable.');
must(`<svg viewBox="0 0 24 24" fill="#FFC804"><path d="${star4}"></path></svg><span><b>+500</b> empresarios transformados</span>`,
     `<svg viewBox="0 0 535.02 535.02" fill="#FFC804" aria-hidden="true"><path d="${logoPath}"></path></svg><span><b>Norman IA</b> · mentor con memoria</span>`);
// 8) Botones 100% funcionales: 'Agenda tu sesión' abre correo real (no un ancla a un botón).
//    Los enlaces a /welcome y /legal/* son rutas relativas AL MISMO SITIO — el
//    landing ahora vive en la raíz del propio dominio (vercel.json), así que
//    navegan en la misma pestaña, no a un origen externo.
const MAIL = 'mailto:ncapuozzo@polarisgrowthinstitute.com?subject=Quiero%20agendar%20mi%20sesi%C3%B3n%20de%20claridad';
html = html.split('href="#agenda"').join(`href="${MAIL}"`);
html = html.replace('</head>', `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 535.02 535.02'><path fill='#FFC804' d='${logoPath}'/></svg>`)}"></head>`);
html = html.replace('</style>', readFileSync(join(here, 'brand.css'), 'utf8') + '</style>');

if (/url\("[0-9a-f-]{36}"\)/.test(html)) throw new Error('quedan assets sin embeber');
writeFileSync(OUT, html);
copyFileSync(OUT, DEST);
writeFileSync(PUBLIC_DEST, html);
console.log(`OK fuentes embebidas: ${fonts} · ${(html.length / 1024).toFixed(0)} KB\n→ ${OUT}\n→ ${DEST}\n→ ${PUBLIC_DEST}`);
