/**
 * La Inmersión + invariantes del catálogo de meditación.
 *
 * El invariante de duración no es cosmético: `app/bienestar/meditacion.tsx:209`
 * rota las fases con `idx % phases.length`. Si las fases suman MÁS que
 * `durationMinutes`, el guión se reinicia a mitad de sesión — el usuario vuelve
 * a "cierra los ojos" cuando ya estaba en su centro. Y si suman MENOS, la
 * última frase se queda congelada en pantalla el tiempo sobrante.
 *
 * Ninguna de las dos cosas se ve en code review. Por eso vive aquí.
 */
import { INMERSION_SESSIONS } from '@/data/inmersion';
import {
  MEDITATION_SESSIONS,
  MEDITATION_CATEGORY_META,
  normanVoiceUrl,
  phaseAudioId,
} from '@/data/wellness';

describe('catálogo de meditación — invariantes', () => {
  it('cada sesión declara una categoría que existe en el META', () => {
    for (const s of MEDITATION_SESSIONS) {
      expect(MEDITATION_CATEGORY_META[s.category]).toBeDefined();
    }
  });

  it('los ids de sesión son únicos', () => {
    const ids = MEDITATION_SESSIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ninguna sesión tiene fases vacías', () => {
    for (const s of MEDITATION_SESSIONS) {
      expect(s.phases.length).toBeGreaterThan(0);
    }
  });
});

describe('La Inmersión — semana 1', () => {
  const s1 = INMERSION_SESSIONS[0];

  it('está registrada en el catálogo general', () => {
    expect(MEDITATION_SESSIONS.find((m) => m.id === 'inmersion-s1')).toBeDefined();
  });

  it('las fases suman EXACTAMENTE la duración declarada', () => {
    const suma = s1.phases.reduce((acc, p) => acc + p.duration, 0);
    expect(suma).toBe(s1.durationMinutes * 60);
  });

  it('toda fase declara un id explícito — el índice no sobrevive a reordenar', () => {
    for (const p of s1.phases) {
      expect(p.id).toBeTruthy();
    }
  });

  it('los ids de fase son únicos dentro de la sesión', () => {
    const ids = s1.phases.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la pausa nunca excede el tiempo en pantalla', () => {
    for (const p of s1.phases) {
      expect(p.pauseAfter ?? 0).toBeLessThan(p.duration);
    }
  });

  it('exactamente una fase muestra el Norte del usuario', () => {
    const conNorte = s1.phases.filter((p) => p.showsNorthStar);
    expect(conNorte).toHaveLength(1);
    expect(conNorte[0].id).toBe('declaracion');
  });
});

describe('direccionamiento del audio de voz', () => {
  it('usa el id explícito cuando existe', () => {
    const phase = { id: 'centro', text: 'x', duration: 10 };
    expect(phaseAudioId('inmersion-s1', phase, 3)).toBe('centro');
    expect(normanVoiceUrl('inmersion-s1', phase, 3)).toContain('/inmersion-s1/centro.mp3');
  });

  it('cae al índice cuando la fase no declara id (las ~40 sesiones viejas)', () => {
    const phase = { text: 'x', duration: 10 };
    expect(phaseAudioId('calma-profunda', phase, 2)).toBe('calma-profunda-2');
  });

  it('la URL apunta al prefijo de voz, no al de música', () => {
    const url = normanVoiceUrl('inmersion-s1', { id: 'a', text: 'x', duration: 1 }, 0);
    expect(url).toContain('/wellness-audio/inmersion-s1/');
    expect(url).not.toContain('/wellness-audio/meditation/');
  });
});
