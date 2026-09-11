// English twin of build.mjs. Mismo ensamblaje (fuentes, desbloqueo de scroll,
// estructura .screen, reveal), pero con extra-en.html y copy en inglés donde
// build.mjs pone copy en español. Se mantiene como archivo separado — no un
// parámetro de idioma en build.mjs — porque duplicar ~15 líneas mecánicas es
// más simple y más seguro que reescribir el pipeline ya probado y en vivo.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = 'C:/Users/ASUS/OneDrive - Caja de Compensacion Familiar de Antioquia COMFAMA/Escritorio/JACO EL PROGRAMADOR/Growth Players-Polaris/.claude/worktrees/sweet-diffie/lifeflow';
const SRC = 'E:/QUATRO/ECOSISTEMA QUATRO/PROGRAMADOR DEL VALLE/POLARIS/Polaris - Landing Presentacion (Standalone).html';
// Misma fuente de verdad que build.mjs: Expo copia public/ tal cual al build;
// vercel.json reescribe "/en" a este archivo.
const PUBLIC_DEST = join(repoRoot, 'public/landing-en.html');

const lines = readFileSync(SRC, 'utf8').split('\n');
const grab = (type) => {
  const i = lines.findIndex((l) => new RegExp(`^\\s*<script type="__bundler/${type}">`).test(l));
  if (i < 0) throw new Error('no ' + type);
  return JSON.parse(lines[i + 1].trim());
};
let html = grab('template');
const manifest = grab('manifest');

// 1) Fuentes embebidas (idéntico a build.mjs).
let fonts = 0;
html = html.replace(/url\("([0-9a-f-]{36})"\)/g, (m, id) => {
  const a = manifest[id];
  if (!a) throw new Error('asset faltante ' + id);
  let bytes = Buffer.from(a.data, 'base64');
  if (a.compressed) bytes = gunzipSync(bytes);
  fonts++;
  return `url(data:${a.mime};base64,${bytes.toString('base64')})`;
});

// 2) Desbloquear el scroll.
const lock = '@media (min-width:901px){html,body{height:100%;overflow:hidden}.page{height:100vh;height:100dvh;overflow:hidden}}';
if (!html.includes(lock)) throw new Error('regla de bloqueo no encontrada');
html = html.replace(lock, '');

// 3) Menú en inglés + switcher de idioma "ES" de vuelta a la raíz.
const navOld = html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/)[0];
const navNew = `<nav id="site-nav" aria-label="Primary">
<a class="appear appear--scale" href="#metodo" style="--d:.16s">The Method</a>
<a class="appear appear--soft" href="#protocolo" style="--d:.28s">The Protocol</a>
<a class="appear appear--scale" href="#norman" style="--d:.4s">Norman AI</a>
<a class="appear appear--soft" href="#acceso" style="--d:.52s">Access</a>
<a class="appear appear--scale nav-cta" href="/welcome" style="--d:.6s">Enter app</a>
<a class="appear appear--soft lang-switch" href="/" style="--d:.68s" hreflang="es" aria-label="Ver en español">ES</a>
</nav>`;
html = html.replace(navOld, navNew);

// 4) Pantalla 1 envuelta en .screen; secciones después (extra-en.html).
const openPage = '<div class="page">\n<div class="menu-backdrop"></div>';
if (!html.includes(openPage)) throw new Error('ancla .page');
html = html.replace(openPage, openPage + '\n<div class="screen">');
const endStats = '</footer>\n</div>\n<script>';
if (!html.includes(endStats)) throw new Error('ancla stats');
const extra = readFileSync(join(here, 'extra-en.html'), 'utf8');
html = html.replace(endStats, '</footer>\n</div>' + extra + '\n</div>\n<script>');

// 5) CSS de las secciones + JS de revelado (idéntico — sin texto).
html = html.replace('</style>', readFileSync(join(here, 'extra.css'), 'utf8') + '</style>');
const reveal = `<script>(function(){var rv=document.querySelectorAll('.reveal'),red=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&!red){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.12});rv.forEach(function(el){io.observe(el)})}
else{rv.forEach(function(el){el.classList.add('in')})}})();</script>\n</body>`;
html = html.replace('</body>', reveal);

// 6) Título, idioma y meta descripción en inglés.
html = html.replace('<html lang="es"', '<html lang="en"');
html = html.replace('<title>Polaris Growth Institute — Soberanía Empresarial</title>', '<title>Polaris Growth Institute — The Sovereign Protocol</title>');
html = html.replace('</head>', '<meta name="description" content="A 90-day protocol to reprogram your mind, regulate your emotions, elevate your energy, and build an unshakeable inner state — with Norman AI as your mentor.">\n</head>');

// 7) Estructura de marca Polaris en inglés (mismo patrón que build.mjs).
const logoPath = readFileSync(join(repoRoot, 'assets/images/logo-responsive.svg'), 'utf8').match(/<path d="([^"]+)"/)[1];
const star4 = 'M12 1l1.8 9.2L23 12l-9.2 1.8L12 23l-1.8-9.2L1 12l9.2-1.8Z';
const must = (from, to) => { if (!html.includes(from)) throw new Error('ancla marca: ' + from.slice(0, 60)); html = html.replace(from, to); };
must(`<svg viewBox="0 0 24 24" fill="currentColor"><path d="${star4}"></path></svg><span>Polaris<span class="logo-suffix">&nbsp;Growth</span></span>`,
     `<svg viewBox="0 0 535.02 535.02" fill="currentColor" aria-hidden="true"><path d="${logoPath}"></path></svg><span class="wm"><b>Polaris</b><span>Growth Institute</span></span>`);
must('Soberanía Empresarial · Acceso 2026', 'Sovereign Protocol · 90 days');
must('Escala tu empresa <em>sin destruir</em></span><span class="headline-line appear appear--mask" style="--d:.62s">tu paz interior.</span>',
     'Seek the state,</span><span class="headline-line appear appear--mask" style="--d:.62s"><em>not the outcome.</em></span>');
must('El Método Polaris integra estrategia, biología y conciencia para que tu negocio crezca mientras tú recuperas tiempo, energía y claridad.',
     "Polaris isn't a habit-tracking app. It's a 90-day protocol to reprogram your mind, regulate your emotions, elevate your vital energy, and build an unshakeable inner state.");
must(`<svg viewBox="0 0 24 24" fill="#FFC804"><path d="${star4}"></path></svg><span><b>+500</b> empresarios transformados</span>`,
     `<svg viewBox="0 0 535.02 535.02" fill="#FFC804" aria-hidden="true"><path d="${logoPath}"></path></svg><span><b>Norman AI</b> · mentor with memory</span>`);
must('<b>90 días</b> de protocolo guiado', '<b>90 days</b> of guided protocol');
must('<b>4 cuerpos</b> · un solo sistema', '<b>4 bodies</b> · one system');
must('Agenda tu sesión</a>', 'Book a session</a>');
must('Conoce el método</a>', 'See the method</a>');
must('Agenda tu sesión de claridad</a>', 'Book your clarity session</a>');

// 8) Botones: mismo mailto real, mismas rutas relativas al mismo sitio.
const MAIL = 'mailto:ncapuozzo@polarisgrowthinstitute.com?subject=Book%20my%20clarity%20session';
html = html.split('href="#agenda"').join(`href="${MAIL}"`);
html = html.replace('</head>', `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 535.02 535.02'><path fill='#FFC804' d='${logoPath}'/></svg>`)}"></head>`);
html = html.replace('</style>', readFileSync(join(here, 'brand.css'), 'utf8') + '</style>');

if (/url\("[0-9a-f-]{36}"\)/.test(html)) throw new Error('quedan assets sin embeber');
writeFileSync(PUBLIC_DEST, html);
console.log(`OK EN — fuentes embebidas: ${fonts} · ${(html.length / 1024).toFixed(0)} KB\n→ ${PUBLIC_DEST}`);
