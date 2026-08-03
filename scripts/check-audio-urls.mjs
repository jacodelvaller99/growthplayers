/**
 * Comprueba que TODO el audio que la app va a pedir existe de verdad en Storage.
 *
 *   node --experimental-strip-types scripts/check-audio-urls.mjs
 *   node --experimental-strip-types scripts/check-audio-urls.mjs --verbose
 *
 * POR QUÉ EXISTE: las URLs de voz no se escriben a mano, se DERIVAN del id de
 * la sesión (`normanVoiceUrl`). Eso es lo correcto — 575 URLs a mano se
 * desincronizan el primer día — pero mueve el fallo de "no compila" a "el
 * usuario le da al play y Norman no habla". Ya pasó una vez: las URLs
 * apuntaban a un bucket que no era donde estaban los mp3, y nada en el repo
 * lo detectaba porque el código era correcto; el asset no estaba.
 *
 * LEE EL CATÁLOGO REAL y usa LAS MISMAS FUNCIONES que la app (`normanVoiceUrl`,
 * `MEDITATION_CATEGORY_MUSIC`, …). Una segunda derivación de URLs aquí
 * comprobaría que el script está de acuerdo consigo mismo, no que la app
 * funciona.
 *
 * No se importa `data/sleep.ts` (su barrel importa valores de './wellness' sin
 * extensión y el borrado de tipos de node no resuelve eso) — se importan los
 * sub-archivos y se llama a `normanVoiceUrl` igual que hace `sleepSegmentsToPhases`.
 *
 * Peticiones con `Range: bytes=0-0`: confirma que el objeto existe y qué
 * content-type tiene sin descargar 575 mp3.
 */
import {
  BINAURAL_BAND_MUSIC,
  MEDITATION_CATEGORY_MUSIC,
  MEDITATION_SESSIONS,
  SLEEP_MUSIC,
  normanVoiceUrl,
} from '../data/wellness.ts';
import { BINAURAL_GUIDES } from '../data/binauralGuides.ts';
import { SOS_SESSIONS } from '../data/sleep/sos.ts';
import { STORY_SESSIONS } from '../data/sleep/stories.ts';
import { NIDRA_SESSIONS } from '../data/sleep/nidra.ts';
import { RELAX_SESSIONS } from '../data/sleep/relax.ts';

const VERBOSE = process.argv.includes('--verbose');
const CONCURRENCY = 16;

/** Todo lo que la app puede pedir, agrupado por categoría del informe. */
function allTargets() {
  const t = [];
  const push = (group, url) => t.push({ group, url });

  for (const s of MEDITATION_SESSIONS) {
    s.phases.forEach((p, i) => push('voz · meditación', normanVoiceUrl(s.id, p, i)));
  }
  for (const s of [...SOS_SESSIONS, ...STORY_SESSIONS, ...NIDRA_SESSIONS, ...RELAX_SESSIONS]) {
    s.segments.forEach((_, i) => push('voz · sueño', normanVoiceUrl(s.id, {}, i)));
  }
  for (const g of BINAURAL_GUIDES) {
    g.segments.forEach((_, i) => push('voz · guías binaurales', normanVoiceUrl(`binaural-${g.id}`, {}, i)));
  }

  for (const url of Object.values(MEDITATION_CATEGORY_MUSIC)) push('cama · meditación', url);
  for (const url of Object.values(BINAURAL_BAND_MUSIC)) push('cama · binaural', url);
  for (const url of Object.values(SLEEP_MUSIC)) push('cama · sueño', url);

  return t;
}

/**
 * Categorías que alguna sesión USA pero que no tienen cama declarada. No es un
 * 404 (no hay URL que pedir), así que el bucle de HTTP no lo vería nunca: la
 * sesión simplemente arranca sin música y nadie se entera hasta escucharla.
 */
function categoriesWithoutBed() {
  const missing = new Set();
  for (const s of MEDITATION_SESSIONS) {
    if (!MEDITATION_CATEGORY_MUSIC[s.category] && !s.binaural) missing.add(s.category);
  }
  return [...missing];
}

async function head(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    return { ok: res.ok, status: res.status, type: res.headers.get('content-type') ?? '?' };
  } catch (err) {
    return { ok: false, status: 0, type: `error de red: ${err.message}` };
  }
}

/** Pool simple: 575 fetch a la vez tumban el socket pool de node. */
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const targets = allTargets();
  console.log(`Comprobando ${targets.length} objetos de audio…\n`);

  const results = await mapPool(targets, CONCURRENCY, async (t) => ({ ...t, ...(await head(t.url)) }));

  const groups = new Map();
  for (const r of results) {
    const g = groups.get(r.group) ?? { ok: 0, bad: [] };
    if (r.ok) g.ok += 1;
    else g.bad.push(r);
    groups.set(r.group, g);
  }

  for (const [group, g] of groups) {
    const total = g.ok + g.bad.length;
    console.log(`  ${group.padEnd(24)} ${String(g.ok).padStart(3)}/${total}`);
    if (VERBOSE && g.bad.length === 0) console.log(`    (todas responden)`);
  }

  const bad = results.filter((r) => !r.ok);
  const noBed = categoriesWithoutBed();

  if (bad.length) {
    console.error(`\n${bad.length} objeto(s) NO responden:\n`);
    for (const r of bad) console.error(`  ✗ ${r.status}  ${r.url}\n     ${r.type}`);
    console.error('\nO el mp3 no se subió, o el id de la sesión cambió sin regenerar la voz.');
  }

  if (noBed.length) {
    console.error(`\nCategorías SIN cama musical ni binaural: ${noBed.join(', ')}`);
    console.error('Esas sesiones suenan a voz seca. Declara la cama en MEDITATION_CATEGORY_MUSIC.');
  }

  if (!bad.length && !noBed.length) console.log('\nTodo el audio responde.');
  process.exitCode = bad.length || noBed.length ? 1 : 0;
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
