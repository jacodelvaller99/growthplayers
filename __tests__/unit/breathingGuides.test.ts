/**
 * Guías de entrada de las técnicas de Respiración — invariantes.
 *
 * Mismo enganche por id que binaurales/sueño (`getBreathingGuide(tech.id)`) y
 * misma clase de fallo silencioso: si un id no casa, la sesión arranca sin
 * voz y nadie se entera. La URL usa el prefijo `breathing-<id>` que construye
 * `respiracion.tsx` — si se desincroniza del generador, la app pide un mp3
 * que nunca existió.
 */
import { BREATHING_GUIDES, getBreathingGuide } from '@/data/breathingGuides';
import { BREATHING_TECHNIQUES, normanVoiceUrl } from '@/data/wellness';

describe('guías de respiración — cobertura de técnicas', () => {
  it('cada técnica del catálogo tiene su guía de entrada', () => {
    const missing = BREATHING_TECHNIQUES.filter((t) => !getBreathingGuide(t.id)).map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it('no hay guías huérfanas — toda guía escrita corresponde a una técnica real', () => {
    const techIds = new Set(BREATHING_TECHNIQUES.map((t) => t.id));
    const orphans = BREATHING_GUIDES.map((g) => g.id).filter((id) => !techIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('los ids de guía son únicos', () => {
    const ids = BREATHING_GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('guías de respiración — forma de los segmentos', () => {
  it('ninguna guía está vacía', () => {
    for (const g of BREATHING_GUIDES) {
      expect(g.segments.length).toBeGreaterThan(0);
    }
  });

  it('la pausa nunca se come el hueco entero de la voz', () => {
    for (const g of BREATHING_GUIDES) {
      for (const seg of g.segments) {
        expect(seg.pauseAfter).toBeLessThan(seg.duration);
      }
    }
  });

  it('son guías de ENTRADA que se callan antes del ciclo, no la práctica entera', () => {
    for (const g of BREATHING_GUIDES) {
      const total = g.segments.reduce((n, s) => n + s.duration, 0);
      expect(total).toBeLessThanOrEqual(180); // ≤ 3 min
    }
  });
});

describe('honestidad del catálogo — Wim Hof', () => {
  // POR QUÉ: la descripción decía "30 resp. rápidas · Retención · Recuperación"
  // — el protocolo real de Wim Hof. El timer (respiracion.tsx) solo alterna
  // INHALA/EXHALA `cycles` veces: no hay retención larga ni recuperación
  // guiada. Fija el invariante para que no vuelva a prometerse lo que el
  // timer no hace.
  it('la descripción no promete retención ni recuperación que el timer no tiene', () => {
    const wimHof = BREATHING_TECHNIQUES.find((t) => t.id === 'wim-hof');
    expect(wimHof).toBeDefined();
    // La vieja descripción prometía el protocolo real de Wim Hof como si el
    // timer lo ejecutara. La nueva dice honestamente "sin retención" — por
    // eso se busca la afirmación positiva ("Retención" como ítem de lista),
    // no la palabra a secas.
    expect(wimHof!.description).not.toContain('Retención');
    expect(wimHof!.description.toLowerCase()).not.toContain('recuperación');
    expect(wimHof!.description).not.toContain('30 resp');
  });

  it('sus fases son solo INHALA/EXHALA — ninguna fase de retención declarada', () => {
    const wimHof = BREATHING_TECHNIQUES.find((t) => t.id === 'wim-hof');
    expect(wimHof!.phases.every((p) => p.label !== 'RETÉN')).toBe(true);
  });
});

describe('direccionamiento del audio de las guías', () => {
  it('la URL usa el prefijo `breathing-<técnica>` que construye la pantalla', () => {
    const url = normanVoiceUrl('breathing-box', {}, 0);
    expect(url).toContain('/wellness-audio/breathing-box/breathing-box-0.mp3');
  });

  it('apunta al prefijo de voz, no al de camas musicales', () => {
    const url = normanVoiceUrl('breathing-wim-hof', {}, 2);
    expect(url).toContain('/wellness-audio/breathing-wim-hof/');
    expect(url).not.toContain('/wellness-audio/meditation/');
  });
});
