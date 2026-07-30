/**
 * Arma un mp3 único de La Inmersión (voz + binaural) para escuchar ANTES de
 * subir nada a Supabase — mismo contenido que sonará en la app, en un solo
 * archivo de escritorio.
 *
 *   node --experimental-strip-types scripts/build-inmersion-preview.mjs
 *
 * Requiere ffmpeg/ffprobe en PATH y los 23 mp3 de voz ya generados en
 * .voice-out/inmersion-s1/ (scripts/generate-norman-voice.mjs).
 *
 * QUÉ HACE, fase por fase (leyendo `INMERSION_SESSIONS` real, no una copia):
 *  1. Rellena cada voz con silencio hasta la duración exacta de su fase —
 *     así la pista de voz completa dura igual que la suma real del guion.
 *  2. Concatena las 23 fases rellenadas en una sola pista de voz.
 *  3. Cama de Suno (pad placentero) en loop, constante, TODA la grabación —
 *     igual que `musicGain` en `createBinauralAudio` (lib/binaural.ts), que
 *     nunca se ducha, solo el binaural.
 *  4. Binaural real (200 Hz izq / 207 Hz der = 7 Hz de beat) por encima,
 *     bajo (se siente, no se oye como un pitido) y ducheado con sidechain
 *     mientras habla Norman — mismo comportamiento que `duck()` en
 *     `lib/narrationPlayer.ts`.
 *
 * SIN LA CAMA DE SUNO el binaural es solo dos tonos puros — eso es lo que
 * sonaba "horrible" en la primera versión. Y es el MISMO hueco que existe hoy
 * en producción: `MEDITATION_CATEGORY_MUSIC['inmersión']` apunta a un mp3 que
 * aún no está subido al bucket, así que la app real sonaría igual de seca
 * hasta que ese pad exista ahí.
 *
 * Uso: node --experimental-strip-types scripts/build-inmersion-preview.mjs [ruta/al/pad.mp3]
 * Sin argumento, usa el pad de Suno local por defecto (ajustar SUNO_PAD abajo).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { INMERSION_SESSIONS } from '../data/inmersion.ts';

const VOICE_DIR = path.resolve('.voice-out/inmersion-s1');
const OUT_DIR = path.resolve('.voice-out/preview');
const SR = 44100;

// Pad de Suno local — cambiar aquí si el archivo se movió.
const SUNO_PAD = process.argv[2] || String.raw`E:\QUATRO\ECOSISTEMA QUATRO\PROGRAMADOR DEL VALLE\Mi compa Capuozzo\D Minor Drift.mp3`;

function ff(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

function ffprobeSeconds(file) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ], { encoding: 'utf8' });
  return Number.parseFloat(out.trim());
}

function main() {
  const session = INMERSION_SESSIONS[0];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Armando ${session.id} — ${session.phases.length} fases, ${session.durationMinutes} min declarados\n`);

  // ── 1-2. Voz: cada fase rellena a su duración exacta, luego concatenada ──
  const listFile = path.join(OUT_DIR, 'concat.txt');
  const listLines = [];
  let totalDeclared = 0;

  for (const [i, phase] of session.phases.entries()) {
    const voiceFile = path.join(VOICE_DIR, `${phase.id}.mp3`);
    const segFile = path.join(OUT_DIR, `seg-${String(i).padStart(2, '0')}-${phase.id}.wav`);
    totalDeclared += phase.duration;

    if (fs.existsSync(voiceFile)) {
      const real = ffprobeSeconds(voiceFile);
      const pad = Math.max(0, phase.duration - real);
      // apad rellena con silencio al final hasta completar el hueco de la fase.
      ff(['-i', voiceFile, '-af', `apad=pad_dur=${pad.toFixed(3)}`, '-ar', String(SR), '-ac', '1', '-t', String(phase.duration), segFile]);
    } else {
      // Sin voz para esta fase: silencio puro por su duración declarada.
      ff(['-f', 'lavfi', '-i', `anullsrc=sample_rate=${SR}:channel_layout=mono`, '-t', String(phase.duration), segFile]);
    }
    listLines.push(`file '${segFile.replace(/'/g, "'\\''")}'`);
    console.log(`  ${String(i + 1).padStart(2, '0')}/23  ${phase.id.padEnd(20)} ${phase.duration}s`);
  }

  fs.writeFileSync(listFile, listLines.join('\n'));
  const voiceMono = path.join(OUT_DIR, 'voice-mono.wav');
  ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', voiceMono]);

  const voiceReal = ffprobeSeconds(voiceMono);
  console.log(`\nPista de voz: ${voiceReal.toFixed(1)}s (declarado: ${totalDeclared}s)`);

  // Estéreo (centrado) para poder mezclarla con la cama binaural.
  const voiceStereo = path.join(OUT_DIR, 'voice-stereo.wav');
  ff(['-i', voiceMono, '-ac', '2', voiceStereo]);

  // ── 3a. Pad de Suno — placentero, constante, TODA la grabación ────────────
  // Nunca se ducha (igual que `musicGain` en createBinauralAudio): es el
  // fondo agradable sobre el que el binaural aporta precisión, no volumen.
  const hasPad = fs.existsSync(SUNO_PAD);
  const padWav = path.join(OUT_DIR, 'pad.wav');
  if (hasPad) {
    ff(['-stream_loop', '-1', '-i', SUNO_PAD, '-t', String(totalDeclared), '-af', 'volume=0.9', '-ar', String(SR), '-ac', '2', padWav]);
    console.log(`Pad de Suno: ${SUNO_PAD}`);
  } else {
    console.log(`Sin pad de Suno en "${SUNO_PAD}" — sigue solo con binaural (más seco).`);
  }

  // ── 3b. Binaural: L=carrier, R=carrier+beat — bajo, se siente no se oye ───
  if (!session.binaural) throw new Error('La sesión no tiene `binaural` configurado.');
  const { carrierHz, beatHz } = session.binaural;
  const binauralWav = path.join(OUT_DIR, 'binaural.wav');
  ff([
    '-f', 'lavfi', '-i', `sine=frequency=${carrierHz}:sample_rate=${SR}:duration=${totalDeclared}`,
    '-f', 'lavfi', '-i', `sine=frequency=${carrierHz + beatHz}:sample_rate=${SR}:duration=${totalDeclared}`,
    '-filter_complex', '[0:a]volume=0.28[l];[1:a]volume=0.28[r];[l][r]join=inputs=2:channel_layout=stereo[a]',
    '-map', '[a]', binauralWav,
  ]);
  console.log(`Binaural: carrier ${carrierHz} Hz / beat ${beatHz} Hz`);

  // ── 4. Ducking real (sidechain SOLO sobre el binaural) + mezcla final ─────
  const finalFile = path.join(OUT_DIR, 'la-inmersion-s1-PREVIEW.mp3');
  const bedInputs = hasPad ? ['-i', padWav] : [];
  const bedLabel = hasPad ? '[2:a]' : '';
  ff([
    '-i', binauralWav, '-i', voiceStereo, ...bedInputs,
    '-filter_complex',
    // normalize=0: sin esto `amix` divide el volumen entre el número de
    // entradas automáticamente — es la razón por la que todo sonaba bajo
    // antes. Con normalize=0 se respetan los volúmenes de arriba, y el
    // `alimiter` al final evita que sumados se corten (clipping).
    '[1:a]asplit=2[sc][voiceout];' +
    '[voiceout]volume=2.2[voiceloud];' +
    '[0:a][sc]sidechaincompress=threshold=0.015:ratio=10:attack=150:release=900[ducked];' +
    (hasPad
      ? `[ducked]${bedLabel}amix=inputs=2:duration=first:dropout_transition=0:normalize=0:weights=1 1[bed];[bed][voiceloud]amix=inputs=2:duration=first:dropout_transition=0:normalize=0:weights=1 1[mixed]`
      : '[ducked][voiceloud]amix=inputs=2:duration=first:dropout_transition=0:normalize=0:weights=1 1[mixed]') +
    ';[mixed]alimiter=limit=0.97,afade=t=in:st=0:d=2.5,afade=t=out:st=' + (totalDeclared - 3) + ':d=3[out]',
    '-map', '[out]', '-t', String(totalDeclared), '-b:a', '192k', finalFile,
  ]);

  const finalSeconds = ffprobeSeconds(finalFile);
  console.log(`\nListo: ${finalFile}`);
  console.log(`Duración final: ${finalSeconds.toFixed(1)}s (esperado ${totalDeclared}s)`);
}

main();
