// ─── data/moderation.ts — filtro UGC (App Store 1.2) ──────────────────────────

import {
  containsBannedContent,
  COMMUNITY_EULA,
  REPORT_REASONS,
} from '@/data/moderation';

describe('containsBannedContent', () => {
  it('detecta términos con y sin tilde', () => {
    expect(containsBannedContent('eres un imbécil')).toBe(true);
    expect(containsBannedContent('eres un imbecil')).toBe(true);
  });

  it('es case-insensitive', () => {
    expect(containsBannedContent('IDIOTA total')).toBe(true);
  });

  it('detecta frases prohibidas dentro de una oración', () => {
    expect(containsBannedContent('just kill yourself already')).toBe(true);
  });

  it('NO da falsos positivos por subcadenas (límite de palabra)', () => {
    // "computadora" contiene "puto"; "disputa" contiene "puta"
    expect(containsBannedContent('mi computadora nueva')).toBe(false);
    expect(containsBannedContent('hubo una disputa comercial')).toBe(false);
  });

  it('texto limpio pasa', () => {
    expect(
      containsBannedContent('Hoy cerré mi semana con foco y disciplina. Gracias tribu.'),
    ).toBe(false);
  });
});

describe('catálogos de moderación', () => {
  it('el EULA declara tolerancia cero y trae reglas', () => {
    expect(COMMUNITY_EULA.rules.length).toBeGreaterThanOrEqual(3);
    expect(COMMUNITY_EULA.intro.toLowerCase()).toContain('tolerancia cero');
  });

  it('las razones de reporte cubren abuso y contenido objetable', () => {
    const values = REPORT_REASONS.map((r) => r.value);
    expect(values).toEqual(expect.arrayContaining(['abuse', 'other']));
  });
});
