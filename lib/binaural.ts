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

// ─── Meditation ambient audio ─────────────────────────────────────────────────

export interface MeditationAudioHandle {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  /** Play a soft bell-like tone (start or end of session) */
  bell: () => void;
}

export function createMeditationAudio(
  noiseType: 'brown' | 'pink' | 'white' = 'brown',
): MeditationAudioHandle | null {
  const AudioCtxCtor = getAudioCtx();
  if (!AudioCtxCtor) return null;
  const SafeAudioCtx = AudioCtxCtor;

  let ctx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;

  function start() {
    ctx = new SafeAudioCtx();

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2); // fade in
    gainNode.connect(ctx.destination);

    noiseSource = createNoiseSource(ctx, noiseType);
    noiseSource.connect(gainNode);
    noiseSource.start();
  }

  function stop() {
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
  setVolume: (v: number) => void;
  setAmbienceVolume: (v: number) => void;
  setAmbience: (type: AmbienceType) => void;
}

export function createBinauralAudio(
  carrierHz: number,
  beatHz: number,
): BinauralAudioHandle | null {
  const AudioCtxCtor = getAudioCtx();
  if (!AudioCtxCtor) return null;
  const SafeAudioCtx2 = AudioCtxCtor;

  let ctx: AudioContext | null = null;
  let binauralGain: GainNode | null = null;
  let ambienceGain: GainNode | null = null;
  let leftOsc: OscillatorNode | null = null;
  let rightOsc: OscillatorNode | null = null;
  let ambienceSource: AudioBufferSourceNode | null = null;
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
  }

  function stop() {
    if (!ctx) return;
    const fadeTime = 1.5;
    binauralGain?.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);
    ambienceGain?.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeTime);
    setTimeout(() => {
      try {
        leftOsc?.stop(); rightOsc?.stop(); ambienceSource?.stop(); ctx?.close();
      } catch { /* already stopped */ }
      ctx = null; leftOsc = null; rightOsc = null; binauralGain = null;
      ambienceGain = null; ambienceSource = null;
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

  return { start, stop, setVolume, setAmbienceVolume, setAmbience };
}
