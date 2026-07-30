/**
 * Genera la voz de Norman para las sesiones narradas y avisa si el guión no
 * cabe en el hueco que tiene reservado.
 *
 *   node --experimental-strip-types scripts/generate-norman-voice.mjs
 *   node --experimental-strip-types scripts/generate-norman-voice.mjs --force
 *
 * LEE EL CATÁLOGO REAL (`data/inmersion.ts`), no una copia. Node 22+ borra los
 * tipos al vuelo, así que no hay build ni segunda lista de frases que se
 * desincronice con la que ve el usuario en pantalla.
 *
 * IDEMPOTENTE: salta lo ya generado. Cambias UNA frase, regeneras UN mp3 —
 * no los 23. Con `--force` rehace todo.
 *
 * LA COMPROBACIÓN QUE IMPORTA: tras generar mide la duración real del mp3 y la
 * compara con el `duration` declarado en la fase. Si la voz dura más que su
 * hueco, la siguiente frase pisa a la anterior y la sesión se descuadra — eso
 * no se ve en code review ni en un test, solo escuchando. Aquí sale en tabla.
 *
 * LA CLAVE NO SE TECLEA AQUÍ: sale de `.env.local`, y la variable NO lleva el
 * prefijo `EXPO_PUBLIC_` a propósito — con él acabaría horneada en el bundle
 * que se descarga cualquiera. Esto es una herramienta de escritorio, no
 * código de la app.
 *
 *   ELEVENLABS_API_KEY=...
 *   NORMAN_VOICE_ID=...
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { INMERSION_SESSIONS } from '../data/inmersion.ts';
// Los guiones de Sueño se importan de sus SUB-archivos, no de `data/sleep.ts`:
// ese barrel importa `normanVoiceUrl` de './wellness' sin extensión, y el
// borrado de tipos de node no resuelve rutas extensionless de valores. Los
// sub-archivos solo tienen `import type`, que sí se borra entero.
import { SOS_SESSIONS } from '../data/sleep/sos.ts';
import { STORY_SESSIONS } from '../data/sleep/stories.ts';
import { NIDRA_SESSIONS } from '../data/sleep/nidra.ts';
import { RELAX_SESSIONS } from '../data/sleep/relax.ts';
import { BINAURAL_GUIDES } from '../data/binauralGuides.ts';

const OUT_DIR = path.resolve('.voice-out');
const FORCE = process.argv.includes('--force');
/** `--only=<prefijo>` limita la generación (ej. `--only=nidra`). */
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

/**
 * Todo lo que Norman narra, en una sola forma: `{ id, phases[] }` donde cada
 * fase trae texto y el hueco de tiempo en que tiene que caber.
 *
 * Meditación declara `duration` explícito por fase. Sueño solo declara
 * `pauseAfter`, así que el hueco de voz se estima igual que en la app
 * (`estimateVoiceSeconds`, 14 caracteres/segundo) — misma constante en los dos
 * lados o el informe de "cabe / no cabe" mentiría.
 */
function allNarratedSessions() {
  const meditacion = INMERSION_SESSIONS.map((s) => ({
    id: s.id,
    phases: s.phases.map((p, i) => ({
      audioId: p.id ?? `${s.id}-${i}`,
      text: p.text,
      budget: p.duration - (p.pauseAfter ?? 0),
    })),
  }));

  const sueno = [...SOS_SESSIONS, ...STORY_SESSIONS, ...NIDRA_SESSIONS, ...RELAX_SESSIONS].map((s) => ({
    id: s.id,
    phases: s.segments.map((seg, i) => ({
      audioId: `${s.id}-${i}`,
      text: seg.text,
      budget: Math.max(3, Math.ceil(seg.text.length / 14)),
    })),
  }));

  // Guías de entrada de los contadores binaurales. El prefijo `binaural-` es
  // el que construye `binaurales.tsx` con `normanVoiceUrl` — si cambia aquí,
  // la app pide un mp3 que no existe y la guía suena en silencio.
  const binaural = BINAURAL_GUIDES.map((g) => ({
    id: `binaural-${g.id}`,
    phases: g.segments.map((seg, i) => ({
      audioId: `binaural-${g.id}-${i}`,
      text: seg.text,
      budget: seg.duration - seg.pauseAfter,
    })),
  }));

  const all = [...meditacion, ...sueno, ...binaural];
  return ONLY ? all.filter((s) => s.id.startsWith(ONLY)) : all;
}

// Los ajustes que el dueño validó escuchando muestras en el panel de
// ElevenLabs. No los toques sin volver a escuchar: 'speed' y 'stability'
// cambian por completo cómo suena una inducción.
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.95,
  style: 0.05,
  speed: 1.06,
  use_speaker_boost: true,
};
const MODEL_ID = 'eleven_multilingual_v2';

function readEnvLocal() {
  const file = path.resolve('.env.local');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Duración real en segundos, o `null` si no hay ffprobe instalado. */
function mp3Seconds(file) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file,
    ], { encoding: 'utf8' });
    const n = Number.parseFloat(out.trim());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function synthesize(apiKey, voiceId, text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const env = { ...readEnvLocal(), ...process.env };
  const apiKey = env.ELEVENLABS_API_KEY;
  const voiceId = env.NORMAN_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.error(
      'Faltan credenciales. En .env.local (sin prefijo EXPO_PUBLIC_):\n' +
      '  ELEVENLABS_API_KEY=...\n' +
      '  NORMAN_VOICE_ID=...',
    );
    process.exit(1);
  }

  const rows = [];
  let generated = 0;
  let skipped = 0;

  const sessions = allNarratedSessions();
  console.log(`${sessions.length} sesiones · ${sessions.reduce((n, s) => n + s.phases.length, 0)} segmentos\n`);

  for (const session of sessions) {
    const dir = path.join(OUT_DIR, session.id);
    fs.mkdirSync(dir, { recursive: true });

    for (const phase of session.phases) {
      const file = path.join(dir, `${phase.audioId}.mp3`);

      if (fs.existsSync(file) && !FORCE) {
        skipped += 1;
      } else {
        process.stdout.write(`  ${session.id}/${phase.audioId} … `);
        const audio = await synthesize(apiKey, voiceId, phase.text);
        fs.writeFileSync(file, audio);
        generated += 1;
        console.log(`${(audio.length / 1024).toFixed(0)} KB`);
      }

      const real = mp3Seconds(file);
      rows.push({
        id: `${session.id}/${phase.audioId}`,
        real,
        budget: phase.budget,
        fits: real === null || real <= phase.budget,
      });
    }
  }

  console.log(`\nGenerados ${generated} · reusados ${skipped}\n`);

  const measured = rows.filter((r) => r.real !== null);
  if (measured.length === 0) {
    console.log('Sin ffprobe instalado: no se pudo verificar que la voz quepa en su hueco.');
  } else {
    const tight = measured.filter((r) => !r.fits);
    // Solo se listan las que NO caben: con 200+ segmentos, imprimir cada OK
    // entierra justo la línea que hay que leer.
    console.log(`${measured.length - tight.length}/${measured.length} caben en su hueco.`);
    for (const r of tight) {
      console.log(`! ${r.id.padEnd(24)} voz ${r.real.toFixed(1)}s / hueco ${r.budget}s`);
    }
    if (tight.length) {
      console.log(
        `\n${tight.length} fase(s) con la voz MÁS LARGA que su hueco. La siguiente ` +
        'frase las pisaría: acorta el texto o sube su `duration`/`pauseAfter` en el catálogo ' +
        '(y ajusta otra fase para que la suma siga cuadrando con durationMinutes).',
      );
      process.exitCode = 1;
    }
  }

  console.log(`\nmp3 en ${OUT_DIR}`);
  console.log(`Súbelos al bucket público 'norman-voice' respetando <session_id>/<phase_id>.mp3`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
