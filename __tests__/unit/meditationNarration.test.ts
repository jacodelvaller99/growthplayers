/**
 * Meditaciones narradas — invariantes de tiempo.
 *
 * POR QUÉ ESTE TEST EXISTE: al activar la voz en las 40 meditaciones se
 * descubrió que 11 tenían la suma de sus fases descuadrada respecto a
 * `durationMinutes`. Eso ya estaba roto ANTES de la narración: el reproductor
 * rota las fases con `idx % phases.length`, así que
 *   · fases suman MÁS  → el usuario nunca llega a ver el cierre de la práctica
 *   · fases suman MENOS → el texto vuelve al principio y se repite
 * Ninguna de las dos cosas lanza error. Sin este test, vuelve a pasar en
 * cuanto alguien añada una fase.
 */
import { INMERSION_SESSIONS } from '@/data/inmersion';
import {
  MEDITATION_SESSIONS,
  estimateVoiceSeconds,
  meditationPhasesToNarration,
} from '@/data/wellness';

describe('meditaciones — cuadre de duración', () => {
  it('TODAS suman exactamente su durationMinutes', () => {
    const off = MEDITATION_SESSIONS
      .map((s) => ({
        id: s.id,
        sum: s.phases.reduce((n, p) => n + p.duration, 0),
        declared: s.durationMinutes * 60,
      }))
      .filter((r) => r.sum !== r.declared)
      .map((r) => `${r.id}: ${r.sum}s vs ${r.declared}s`);

    expect(off).toEqual([]);
  });

  it('todas están marcadas como narradas', () => {
    // Si una queda sin `narrated`, se reproduce como texto mudo sobre música
    // mientras sus vecinas hablan — inconsistencia que el usuario lee como bug.
    const mute = MEDITATION_SESSIONS.filter((s) => !s.narrated).map((s) => s.id);
    expect(mute).toEqual([]);
  });

  it('La Inmersión está incluida en el catálogo general', () => {
    const ids = new Set(MEDITATION_SESSIONS.map((s) => s.id));
    for (const s of INMERSION_SESSIONS) expect(ids.has(s.id)).toBe(true);
  });
});

describe('meditationPhasesToNarration', () => {
  const session = MEDITATION_SESSIONS[0];
  const phases = meditationPhasesToNarration(session);

  it('produce una fase por cada fase del guión', () => {
    expect(phases).toHaveLength(session.phases.length);
  });

  it('deriva una pausa que llena el resto de la fase tras la voz', () => {
    // Sin esta derivación el player avanzaba al acabar el mp3 y la práctica
    // corría al triple de velocidad.
    phases.forEach((p, i) => {
      const src = session.phases[i];
      const voice = estimateVoiceSeconds(src.text);
      expect(p.duration).toBe(src.duration);
      expect(p.pauseAfter).toBe(Math.max(0, src.duration - voice));
    });
  });

  it('la pausa nunca es negativa aunque el texto sea más largo que su fase', () => {
    for (const s of MEDITATION_SESSIONS) {
      for (const p of meditationPhasesToNarration(s)) {
        expect(p.pauseAfter).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Voz y camas musicales comparten el bucket `wellness-audio`; lo que las
  // separa es el prefijo. La música cuelga de `meditation/…` y la voz del id
  // de la sesión, así que el invariante real es que la voz NO caiga ahí.
  it('la URL apunta al prefijo de voz con el id de la sesión, no al de música', () => {
    expect(phases[0].url).toContain(`/wellness-audio/${session.id}/`);
    expect(phases[0].url).not.toContain('/wellness-audio/meditation/');
  });
});
