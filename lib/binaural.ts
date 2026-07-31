/**
 * Binaural Beat & Ambient Sound Generator
 * Uses Web Audio API (browser-only). Returns null on non-web platforms.
 *
 * HOW BINAURAL BEATS WORK:
 * If left ear hears 200 Hz and right ear hears 210 Hz,
 * the brain perceives a 10 Hz beat (Alpha range).
 * Requires headphones for the effect to work properly.
 */

import type { AmbienceType } from '@/data/wellness';
import { createNativeLoopPlayer } from '@/lib/nativeAudio';

type AudioCtxCtor = typeof AudioContext;

function getAudioCtx(): AudioCtxCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).AudioContext || (window as any).webkitAudioContext || null;
}

// ─── Brown / Pink / White noise buffers ──────────────────────────────────────

function fillBrownNoise(data: Float32Array) {
  let lastOut = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }
}

function fillPinkNoise(data: Float32Array) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
}

function fillWhiteNoise(data: Float32Array) {
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
}

function createNoiseSource(
  ctx: AudioContext,
  type: 'brown' | 'pink' | 'white',
): AudioBufferSourceNode {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (type === 'brown') fillBrownNoise(data);
  else if (type === 'pink') fillPinkNoise(data);
  else fillWhiteNoise(data);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createAmbienceSource(ctx: AudioContext, type: AmbienceType): AudioBufferSourceNode | null {
  if (type === 'none') return null;
  const noiseType = type === 'rain' ? 'white' : type === 'ocean' ? 'brown' : 'pink';
  return createNoiseSource(ctx, noiseType);
}

// ─── Cama musical (Suno) — cache por URL para no re-descargar/decodificar ────
// entre sesiones de la misma categoría.

const musicBufferCache = new Map<string, Promise<AudioBuffer>>();

function loadMusicBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  let pending = musicBufferCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`wellness-audio fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => ctx.decodeAudioData(buf));
    musicBufferCache.set(url, pending);
    pending.catch(() => musicBufferCache.delete(url)); // no cachear fallos
  }
  return pending;
}

// ─── Meditation ambient audio ─────────────────────────────────────────────────

export interface MeditationAudioHandle {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  /** Play a soft bell-like tone (start or end of session) */
  bell: () => void;
}

/**
 * Native (iOS/Android): sin Web Audio API no hay ruido procedural ni bell,
 * pero si hay cama musical Suno la reproducimos en loop con expo-av — deja de
 * ser una sesión muda. Sin musicUrl (o sin red/expo-av) → null, timer-only
 * como antes (sin regresión).
 */
function createNativeMeditationAudio(musicUrl?: string): MeditationAudioHandle | null {
  const player = createNativeLoopPlayer(musicUrl);
  if (!player) return null;
  return {
    start: player.start,
    stop: player.stop,
    setVolume: player.setVolume,
    bell: () => {}, // tono de campana es un efecto Web Audio puntual, no crítico en nativo
  };
}

/**
 * `musicUrl` opcional: cama musical instrumental (Suno) por categoría. Si se
 * pasa y carga bien, reemplaza el ruido procedural; si falta o falla el
 * fetch/decode, degrada silenciosamente al ruido de siempre — cero regresión.
 */
export function createMeditationAudio(
  noiseType: 'brown' | 'pink' | 'white' = 'brown',
  musicUrl?: string,
): MeditationAudioHandle | null {
  const AudioCtxCtor = getAudioCtx();
  if (!AudioCtxCtor) return createNativeMeditationAudio(musicUrl);
  const SafeAudioCtx = AudioCtxCtor;

  let ctx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let stopped = false;

  function playNoise(activeCtx: AudioContext, activeGain: GainNode) {
    noiseSource = createNoiseSource(activeCtx, noiseType);
    noiseSource.connect(activeGain);
    noiseSource.start();
  }

  function start() {
    ctx = new SafeAudioCtx();
    stopped = false;

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2); // fade in
    gainNode.connect(ctx.destination);

    if (musicUrl) {
      const activeCtx = ctx;
      const activeGain = gainNode;
      loadMusicBuffer(activeCtx, musicUrl)
        .then((buffer) => {
          if (stopped || ctx !== activeCtx) return; // stop() ya corrió
          const source = activeCtx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(activeGain);
          source.start();
          noiseSource = source;
        })
        .catch(() => {
          if (stopped || ctx !== activeCtx) return;
          playNoise(activeCtx, activeGain); // degrada a ruido procedural
        });
      return;
    }

    playNoise(ctx, gainNode);
  }

  function stop() {
    stopped = true;
    if (!ctx || !gainNode) return;
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5); // fade out
    setTimeout(() => {
      try {
        noiseSource?.stop();
        ctx?.close();
      } catch { /* already closed */ }
      ctx = null; gainNode = null; noiseSource = null;
    }, 1600);
  }

  function setVolume(v: number) {
    if (gainNode && ctx) {
      gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, v) * 0.3), ctx.currentTime, 0.1);
    }
  }

  function bell() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 432; // healing A

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);

    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 3);
  }

  return { start, stop, setVolume, bell };
}

// ─── Binaural beat audio ──────────────────────────────────────────────────────

export interface BinauralAudioHandle {
  start: () => void;
  stop: () => void;
  suspend: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (v: number) => void;
  setAmbienceVolume: (v: number) => void;
  setAmbience: (type: AmbienceType) => void;
}

/**
 * `musicUrl` opcional: cama musical instrumental (Suno) por banda, mezclada a
 * bajo volumen BAJO los osciladores (la precisión de Hz la siguen dando los
 * osciladores; la música es atmósfera). Si falta o falla, no pasa nada — los
 * osciladores suenan igual que siempre.
 */
/**
 * Native (iOS/Android): los osciladores de precisión Hz son Web Audio-only —
 * en nativo no hay forma de replicar el beat binaural exacto. Lo que sí
 * podemos dar es la cama musical Suno de la banda correspondiente en vez de
 * silencio total. Sin musicUrl → null, timer-only como antes.
 */
function createNativeBinauralAudio(musicUrl?: string): BinauralAudioHandle | null {
  const player = createNativeLoopPlayer(musicUrl);
  if (!player) return null;
  return {
    start: player.start,
    stop: player.stop,
    setVolume: player.setVolume,
    suspend: async () => {},
    resume: async () => {},
    setAmbienceVolume: () => {}, // el ambiente procedural es Web Audio-only
    setAmbience: () => {},
  };
}

export function createBinauralAudio(
  carrierHz: number,
  beatHz: number,
  musicUrl?: string,
): BinauralAudioHandle | null {
  const AudioCtxCtor = getAudioCtx();
  if (!AudioCtxCtor) return createNativeBinauralAudio(musicUrl);
  const SafeAudioCtx2 = AudioCtxCtor;

  let ctx: AudioContext | null = null;
  let binauralGain: GainNode | null = null;
  let ambienceGain: GainNode | null = null;
  let musicGain: GainNode | null = null;
  let leftOsc: OscillatorNode | null = null;
  let rightOsc: OscillatorNode | null = null;
  let ambienceSource: AudioBufferSourceNode | null = null;
  let musicSource: AudioBufferSourceNode | null = null;
  let currentAmbience: AmbienceType = 'none';

  function start() {
    ctx = new SafeAudioCtx2();

    // ── Binaural oscillators ──────────────────────────────────────────────────
    const merger = ctx.createChannelMerger(2);

    binauralGain = ctx.createGain();
    binauralGain.gain.setValueAtTime(0, ctx.currentTime);
    binauralGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1); // fade in
    merger.connect(binauralGain);
    binauralGain.connect(ctx.destination);

    // Left ear: carrier
    leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = carrierHz;
    const leftGain = ctx.createGain();
    leftGain.gain.value = 1;
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    // Right ear: carrier + beat
    rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = carrierHz + beatHz;
    const rightGain = ctx.createGain();
    rightGain.gain.value = 1;
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    leftOsc.start();
    rightOsc.start();

    // ── Ambience ──────────────────────────────────────────────────────────────
    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0.15;
    ambienceGain.connect(ctx.destination);

    // ── Cama musical (Suno) ───────────────────────────────────────────────────
    if (musicUrl) {
      const activeCtx = ctx;
      musicGain = activeCtx.createGain();
      musicGain.gain.setValueAtTime(0, activeCtx.currentTime);
      musicGain.gain.linearRampToValueAtTime(0.12, activeCtx.currentTime + 3);
      musicGain.connect(activeCtx.destination);
      const activeMusicGain = musicGain;
      loadMusicBuffer(activeCtx, musicUrl)
        .then((buffer) => {
          if (ctx !== activeCtx) return; // stop() ya corrió
          const source = activeCtx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.connect(activeMusicGain);
          source.start();
          musicSource = source;
        })
        .catch(() => { /* sin cama musical — los osciladores siguen solos */ });
    }
  }

  function stop() {
    if (!ctx) return;
    const fadeTime = 1.5;
    binauralGain?.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);
    ambienceGain?.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);
    musicGain?.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);
    setTimeout(() => {
      try {
        leftOsc?.stop(); rightOsc?.stop(); ambienceSource?.stop(); musicSource?.stop(); ctx?.close();
      } catch { /* already stopped */ }
      ctx = null; leftOsc = null; rightOsc = null; binauralGain = null;
      ambienceGain = null; ambienceSource = null; musicGain = null; musicSource = null;
    }, (fadeTime + 0.1) * 1000);
  }

  function setVolume(v: number) {
    if (binauralGain && ctx) {
      binauralGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v) * 0.35), ctx.currentTime, 0.1);
    }
  }

  function setAmbienceVolume(v: number) {
    if (ambienceGain && ctx) {
      ambienceGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v) * 0.3), ctx.currentTime, 0.1);
    }
  }

  function setAmbience(type: AmbienceType) {
    if (!ctx || !ambienceGain || type === currentAmbience) return;
    currentAmbience = type;

    // Stop old ambience
    try { ambienceSource?.stop(); } catch { /* ok */ }
    ambienceSource = null;

    if (type !== 'none') {
      ambienceSource = createAmbienceSource(ctx, type);
      if (ambienceSource) {
        ambienceSource.connect(ambienceGain);
        ambienceSource.start();
      }
    }
  }

  function suspend(): Promise<void> {
    if (ctx && ctx.state === 'running') return ctx.suspend();
    return Promise.resolve();
  }

  function resume(): Promise<void> {
    if (ctx && ctx.state === 'suspended') return ctx.resume();
    return Promise.resolve();
  }

  return { start, stop, suspend, resume, setVolume, setAmbienceVolume, setAmbience };
}
