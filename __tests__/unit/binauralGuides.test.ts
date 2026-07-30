/**
 * Guías de entrada de los contadores binaurales — invariantes.
 *
 * El enganche voz ↔ banda es por id (`getBinauralGuide(preset.id)`) y falla en
 * SILENCIO igual que el de Sueño: si un id no casa, la sesión arranca sin voz
 * y nadie se entera. Lo mismo con la ruta del mp3, que `binaurales.tsx`
 * construye como `binaural-<id>` — si ese prefijo se desincroniza del
 * generador, la app pide archivos que nunca se subieron.
 */
import { BINAURAL_GUIDES, getBinauralGuide } from '@/data/binauralGuides';
import { BINAURAL_PRESETS, normanVoiceUrl } from '@/data/wellness';

describe('guías binaurales — cobertura de bandas', () => {
  it('cada preset del mezclador tiene su guía de entrada', () => {
    const missing = BINAURAL_PRESETS.filter((p) => !getBinauralGuide(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it('no hay guías huérfanas — toda guía escrita corresponde a un preset real', () => {
    const presetIds = new Set(BINAURAL_PRESETS.map((p) => p.id));
    const orphans = BINAURAL_GUIDES.map((g) => g.id).filter((id) => !presetIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('los ids de guía son únicos', () => {
    const ids = BINAURAL_GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('guías binaurales — forma de los segmentos', () => {
  it('ninguna guía está vacía', () => {
    for (const g of BINAURAL_GUIDES) {
      expect(g.segments.length).toBeGreaterThan(0);
    }
  });

  it('la pausa nunca se come el hueco entero de la voz', () => {
    // Si `pauseAfter >= duration` el hueco de voz sería cero o negativo: el
    // temporizador de respaldo vencería antes de que Norman abra la boca.
    for (const g of BINAURAL_GUIDES) {
      for (const seg of g.segments) {
        expect(seg.pauseAfter).toBeLessThan(seg.duration);
      }
    }
  });

  it('son guías de ENTRADA, no sesiones completas', () => {
    // El trabajo lo hace el tono en silencio. Una guía que se alargara a la
    // duración entera de la sesión rompería justo eso.
    for (const g of BINAURAL_GUIDES) {
      const total = g.segments.reduce((n, s) => n + s.duration, 0);
      expect(total).toBeLessThanOrEqual(240); // ≤ 4 min
    }
  });
});

describe('direccionamiento del audio de las guías', () => {
  it('la URL usa el prefijo `binaural-<banda>` que construye la pantalla', () => {
    const url = normanVoiceUrl('binaural-delta', {}, 0);
    expect(url).toContain('/norman-voice/binaural-delta/binaural-delta-0.mp3');
  });

  it('apunta al bucket de voz, no al de camas musicales', () => {
    const url = normanVoiceUrl('binaural-theta', {}, 2);
    expect(url).toContain('/norman-voice/');
    expect(url).not.toContain('/wellness-audio/');
  });
});
