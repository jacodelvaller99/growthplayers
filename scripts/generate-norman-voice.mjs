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

const OUT_DIR = path.resolve('.voice-out');
const FORCE = process.argv.includes('--force');

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

  for (const session of INMERSION_SESSIONS) {
    const dir = path.join(OUT_DIR, session.id);
    fs.mkdirSync(dir, { recursive: true });

    for (const [i, phase] of session.phases.entries()) {
      const id = phase.id ?? `${session.id}-${i}`;
      const file = path.join(dir, `${id}.mp3`);

      if (fs.existsSync(file) && !FORCE) {
        skipped += 1;
      } else {
        process.stdout.write(`  ${session.id}/${id} … `);
        const audio = await synthesize(apiKey, voiceId, phase.text);
        fs.writeFileSync(file, audio);
        generated += 1;
        console.log(`${(audio.length / 1024).toFixed(0)} KB`);
      }

      const real = mp3Seconds(file);
      // El hueco útil es la duración de la fase menos el silencio previsto:
      // ahí es donde la voz tiene que caber.
      const budget = phase.duration - (phase.pauseAfter ?? 0);
      rows.push({ id, real, budget, fits: real === null || real <= budget });
    }
  }

  console.log(`\nGenerados ${generated} · reusados ${skipped}\n`);

  const measured = rows.filter((r) => r.real !== null);
  if (measured.length === 0) {
    console.log('Sin ffprobe instalado: no se pudo verificar que la voz quepa en su hueco.');
  } else {
    const tight = measured.filter((r) => !r.fits);
    for (const r of measured) {
      const mark = r.fits ? ' ' : '!';
      console.log(`${mark} ${r.id.padEnd(20)} voz ${r.real.toFixed(1)}s / hueco ${r.budget}s`);
    }
    if (tight.length) {
      console.log(
        `\n${tight.length} fase(s) con la voz MÁS LARGA que su hueco. La siguiente ` +
        'frase las pisaría: acorta el texto o sube su `duration` en data/inmersion.ts ' +
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
