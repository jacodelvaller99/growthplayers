/**
 * Sueño narrado — invariantes del cableado voz ↔ catálogo.
 *
 * POR QUÉ EXISTE: los 208 segmentos de `data/sleep/` estuvieron escritos y con
 * CERO consumidores hasta que se cableó `sueno.tsx`. El enganche es por id
 * (`getSleepScript(item.id)`), y ese enganche falla en SILENCIO: si alguien
 * renombra una tarjeta de la pantalla, `getSleepScript` devuelve `undefined`,
 * `narration` queda `undefined`, y la sesión simplemente suena sin voz. No
 * hay error, no hay crash — solo Norman que dejó de hablar.
 *
 * El test lee la pantalla como TEXTO en vez de importarla: importar un .tsx
 * arrastra todo React Native al runner sin aportar nada, y lo que se quiere
 * verificar es puramente que dos listas de ids coincidan.
 */
import fs from 'node:fs';
import path from 'node:path';

import { SLEEP_SESSIONS, getSleepScript, estimateVoiceSeconds, sleepSegmentsToPhases, sleepScriptSeconds } from '@/data/sleep';
import type { SleepSession } from '@/data/sleep';

/** Ids de las tarjetas declaradas en la pantalla de Sueño. */
function screenItemIds(): string[] {
  const file = path.resolve(__dirname, '../../app/bienestar/sueno.tsx');
  const src = fs.readFileSync(file, 'utf8');
  const matches = src.match(/id: '(sos|story|nidra|relax)-\d+'/g) ?? [];
  return matches.map((m) => m.replace(/id: '|'/g, '')).sort();
}

describe('Sueño — el guión llega a la pantalla', () => {
  it('cada tarjeta de la pantalla tiene un guión narrado que la respalda', () => {
    const missing = screenItemIds().filter((id) => !getSleepScript(id));
    // Si esto falla: una tarjeta de sueno.tsx quedó sin guión y esa sesión
    // sonaría sin voz, sin avisar a nadie.
    expect(missing).toEqual([]);
  });

  it('no hay guiones huérfanos — todo guión escrito se reproduce en alguna tarjeta', () => {
    const onScreen = new Set(screenItemIds());
    const orphans = SLEEP_SESSIONS.map((s) => s.id).filter((id) => !onScreen.has(id));
    // Si esto falla: se escribió un guión que ningún usuario puede oír, que es
    // exactamente el estado del que venimos.
    expect(orphans).toEqual([]);
  });

  it('los ids de sesión son únicos', () => {
    const ids = SLEEP_SESSIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ninguna sesión tiene segmentos vacíos', () => {
    for (const s of SLEEP_SESSIONS) {
      expect(s.segments.length).toBeGreaterThan(0);
    }
  });
});

describe('estimateVoiceSeconds', () => {
  it('escala con la longitud del texto', () => {
    const corto = estimateVoiceSeconds('Cierra los ojos.');
    const largo = estimateVoiceSeconds('Cierra los ojos.'.repeat(10));
    expect(largo).toBeGreaterThan(corto);
  });

  it('nunca devuelve menos que el piso, ni con texto vacío', () => {
    // Sin piso, una frase de dos palabras tendría un timer de ~1s y cortaría
    // a Norman antes de terminar de decirla.
    expect(estimateVoiceSeconds('')).toBeGreaterThanOrEqual(3);
    expect(estimateVoiceSeconds('Ya.')).toBeGreaterThanOrEqual(3);
  });
});

describe('sleepSegmentsToPhases', () => {
  const session = SLEEP_SESSIONS[0];
  const phases = sleepSegmentsToPhases(session);

  it('produce una fase por segmento', () => {
    expect(phases).toHaveLength(session.segments.length);
  });

  it('la duración SIEMPRE deja espacio para la voz además de la pausa', () => {
    // Este es el invariante que evita que el temporizador de respaldo venza
    // mientras Norman todavía está hablando y le corte la frase.
    phases.forEach((p, i) => {
      expect(p.duration).toBeGreaterThan(session.segments[i].pauseAfter);
    });
  });

  it('la URL apunta al prefijo de voz con el id posicional, no al de música', () => {
    expect(phases[0].url).toContain(`/wellness-audio/${session.id}/${session.id}-0.mp3`);
    expect(phases[0].url).not.toContain('/wellness-audio/meditation/');
  });
});

describe('sleepScriptSeconds', () => {
  // POR QUÉ: sueno.tsx usaba la etiqueta de marketing de la tarjeta ("20 min")
  // como duración del timer del engine, sin relación con el guión real. Si el
  // guión narrado dura más que esa etiqueta, el timer paraba la sesión — y con
  // ella la voz de Norman — a mitad de frase.
  it('es la suma de duration + pauseAfter de cada fase generada', () => {
    const session = SLEEP_SESSIONS[0];
    const manual = sleepSegmentsToPhases(session)
      .reduce((total, p) => total + p.duration + p.pauseAfter, 0);

    expect(sleepScriptSeconds(session)).toBe(manual);
  });

  it('crece si el guión tiene más segmentos', () => {
    const base = SLEEP_SESSIONS[0];
    const doble: SleepSession = { ...base, segments: [...base.segments, ...base.segments] };

    expect(sleepScriptSeconds(doble)).toBeGreaterThan(sleepScriptSeconds(base));
  });
});
