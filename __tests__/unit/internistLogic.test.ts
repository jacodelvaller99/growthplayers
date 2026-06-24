/**
 * internistLogic — clasificación de marcadores, red-flags, sanitización.
 *
 * Los tests sirven dos propósitos:
 *  1. Verificar que la lógica clasifica correctamente (band + nota educativa).
 *  2. ENFORCAR LAS LÍNEAS ROJAS DEL PRODUCTO:
 *     - el internista nunca puede inventar marcadores
 *     - red-flags de salud mental, dolor torácico, ictus, embarazo no pueden
 *       perderse por una keyword distinta
 *     - el sanitizador detecta lenguaje diagnóstico/prescriptivo
 */
import {
  classifyLabValue,
  detectRedFlags,
  hasUrgentRedFlag,
  assembleEducationalContext,
  isAbnormal,
  isCritical,
  detectForbiddenLanguage,
} from '../../lib/internistLogic';
import { findLabMarker } from '../../data/internistKnowledge';

describe('classifyLabValue — bandas y educación', () => {
  it('clasifica glucosa 85 mg/dL como normal y cita ADA', () => {
    const c = classifyLabValue('glucosa', 85);
    expect(c).not.toBeNull();
    expect(c!.band).toBe('normal');
    expect(c!.citation).toMatch(/American Diabetes Association/);
    expect(c!.educationalNote).toMatch(/dentro del rango/i);
  });

  it('clasifica glucosa 130 mg/dL como high (sobre 99, bajo crítico)', () => {
    const c = classifyLabValue('glucosa', 130);
    expect(c!.band).toBe('high');
    expect(isAbnormal(c!.band)).toBe(true);
    expect(isCritical(c!.band)).toBe(false);
  });

  it('clasifica glucosa 320 mg/dL como critical_high con derivación', () => {
    const c = classifyLabValue('glucosa', 320);
    expect(c!.band).toBe('critical_high');
    expect(isCritical(c!.band)).toBe(true);
    expect(c!.educationalNote).toMatch(/atención médica pronta/i);
  });

  it('clasifica HbA1c por encima del rango normal como high', () => {
    const c = classifyLabValue('hba1c', 6.1);
    expect(c!.band).toBe('high');
    expect(c!.educationalNote).toMatch(/prediabetes|diabetes/i);
  });

  it('clasifica vitamina D 18 ng/mL como low y cita Endocrine Society', () => {
    const c = classifyLabValue('vitamina d', 18);
    expect(c!.band).toBe('low');
    expect(c!.citation).toMatch(/Endocrine Society/);
  });

  it('clasifica TSH 6.5 mIU/L como high (entre 4.0 y umbral crítico 10)', () => {
    const c = classifyLabValue('TSH', 6.5);
    expect(c!.band).toBe('high');
    expect(c!.educationalNote).toMatch(/hipotiroidismo/i);
  });

  it('clasifica TSH 12 mIU/L como critical_high', () => {
    const c = classifyLabValue('TSH', 12);
    expect(c!.band).toBe('critical_high');
  });

  it('clasifica LDL 220 mg/dL como critical_high', () => {
    const c = classifyLabValue('ldl', 220);
    expect(c!.band).toBe('critical_high');
  });

  it('clasifica ferritina 10 ng/mL como critical_low', () => {
    const c = classifyLabValue('ferritina', 10);
    expect(c!.band).toBe('critical_low');
  });

  it('responde con band="unknown" si el valor es NaN', () => {
    const c = classifyLabValue('glucosa', NaN);
    expect(c!.band).toBe('unknown');
    expect(c!.educationalNote).toMatch(/no reconozco/i);
  });

  it('devuelve null si el marcador no existe', () => {
    expect(classifyLabValue('marcador-inventado', 100)).toBeNull();
  });

  it('busca por alias (pcr ultrasensible → hs_crp)', () => {
    const c = classifyLabValue('pcr ultrasensible', 2.5);
    expect(c!.marker.key).toBe('hs_crp');
    expect(c!.band).toBe('high');
  });

  it('findLabMarker es case-insensitive y tolera contains', () => {
    expect(findLabMarker('TESTOSTERONA')!.key).toBe('testosterone_total');
    expect(findLabMarker('hemoglob')!.key).toBe('hemoglobin');
  });
});

describe('marcadores avanzados (performance/longevidad/hormonal)', () => {
  it('apoB 140 mg/dL → high', () => {
    expect(classifyLabValue('apob', 140)!.band).toBe('high');
  });
  it('Lp(a) 60 mg/dL → critical_high (umbral 50)', () => {
    expect(classifyLabValue('lp(a)', 60)!.band).toBe('critical_high');
  });
  it('magnesio 1.0 mg/dL → critical_low (umbral 1.2)', () => {
    expect(classifyLabValue('magnesio', 1.0)!.band).toBe('critical_low');
  });
  it('AST 50 → high; 1200 → critical_high', () => {
    expect(classifyLabValue('ast', 50)!.band).toBe('high');
    expect(classifyLabValue('ast', 1200)!.band).toBe('critical_high');
  });
  it('homocisteína 25 µmol/L → high', () => {
    expect(classifyLabValue('homocisteina', 25)!.band).toBe('high');
  });
  it('resuelve los nuevos alias sin colisionar con los existentes', () => {
    expect(findLabMarker('shbg')!.key).toBe('shbg');
    expect(findLabMarker('hcy')!.key).toBe('homocysteine');
    expect(findLabMarker('apo b')!.key).toBe('apob');
    expect(findLabMarker('lp(a)')!.key).toBe('lipoprotein_a');
    // No rompe los marcadores previos:
    expect(findLabMarker('TESTOSTERONA')!.key).toBe('testosterone_total');
    expect(findLabMarker('hemoglob')!.key).toBe('hemoglobin');
  });
});

describe('detectRedFlags — señales de derivación', () => {
  it('detecta ideación suicida (urgent)', () => {
    const f = detectRedFlags('últimamente tengo pensamientos suicidas');
    expect(f.length).toBeGreaterThan(0);
    expect(f[0]!.severity).toBe('urgent');
    expect(hasUrgentRedFlag(f)).toBe(true);
  });

  it('detecta dolor torácico irradiado (urgent)', () => {
    const f = detectRedFlags('tengo un dolor que me irradia al brazo y me aprieta el pecho');
    expect(f.some((x) => x.rule.severity === 'urgent')).toBe(true);
  });

  it('detecta ictus en presente, no en pasado lejano', () => {
    expect(detectRedFlags('hace 10 años tuve un ictus, ya me recuperé').length).toBe(0);
    const f = detectRedFlags('de repente no puedo mover medio cuerpo');
    expect(f.length).toBeGreaterThan(0);
  });

  it('detecta señales de TCA (urgent)', () => {
    const f = detectRedFlags('llevo semanas con atracon seguido de purga');
    expect(f.length).toBeGreaterThan(0);
    expect(f[0]!.severity).toBe('urgent');
  });

  it('detecta embarazo con consulta de suplementos (soon)', () => {
    const f = detectRedFlags('estoy embarazada, puedo seguir tomando creatina?');
    expect(f.some((x) => x.severity === 'soon')).toBe(true);
  });

  it('no dispara embarazo si el usuario lo descarta explícitamente', () => {
    const f = detectRedFlags('no estoy embarazada y quiero saber sobre creatina');
    expect(f.some((x) => x.rule.trigger.match(/embarazo/i))).toBe(false);
  });

  it('texto vacío no devuelve flags', () => {
    expect(detectRedFlags('')).toEqual([]);
    expect(detectRedFlags('   ')).toEqual([]);
  });

  it('match es case-insensitive y tolera acentos', () => {
    const f1 = detectRedFlags('DOLOR EN EL PECHO INTENSO');
    const f2 = detectRedFlags('opresión en el pecho');
    expect(f1.length).toBeGreaterThan(0);
    expect(f2.length).toBeGreaterThan(0);
  });

  it('dedupea: la misma regla no se cuenta dos veces', () => {
    const f = detectRedFlags('dolor en el pecho, me aprieta el pecho, no puedo respirar');
    const triggers = new Set(f.map((x) => x.rule.trigger));
    expect(triggers.size).toBe(f.length);
  });

  it('detecta crisis hipertensiva por cifra explícita', () => {
    const f = detectRedFlags('me tomé la presión y salió 190/120');
    expect(f.some((x) => x.severity === 'urgent')).toBe(true);
  });
});

describe('assembleEducationalContext — empaqueta el bloque inyectable', () => {
  it('devuelve placeholders cuando no hay nada', () => {
    const b = assembleEducationalContext({});
    expect(b.labsBlock).toMatch(/no ha compartido/);
    expect(b.lifestyleBlock).toMatch(/no se pidió/);
    expect(b.redFlagsBlock).toMatch(/no se detectaron/);
    expect(b.redFlags).toEqual([]);
  });

  it('inyecta cada lab con su cita', () => {
    const labs = [classifyLabValue('glucosa', 130)!, classifyLabValue('hdl', 35)!];
    const b = assembleEducationalContext({ labs });
    expect(b.labsBlock).toMatch(/American Diabetes Association/);
    expect(b.labsBlock).toMatch(/AHA\/ACC/);
    expect(b.labsBlock.split('\n').length).toBe(2);
  });

  it('filtra lifestyle facts por tópico', () => {
    const b = assembleEducationalContext({ lifestyleTopics: ['sueño'] });
    expect(b.lifestyleBlock).toMatch(/sueño/i);
  });

  it('incluye red-flags detectados en el texto del turno', () => {
    const b = assembleEducationalContext({ userTurnText: 'pensamientos suicidas' });
    expect(b.redFlags.length).toBeGreaterThan(0);
    expect(b.redFlagsBlock).toMatch(/URGENT/);
  });
});

describe('detectForbiddenLanguage — sanitización del output', () => {
  it('marca lenguaje diagnóstico directo', () => {
    expect(detectForbiddenLanguage('claramente tienes diabetes')).toContain('tienes diabetes');
  });

  it('marca prescripciones', () => {
    expect(detectForbiddenLanguage('te receto 500 mg de metformina')).toContain('te receto');
  });

  it('no marca lenguaje educativo correcto', () => {
    const ok = 'tu HbA1c está en el rango que la ADA etiqueta como prediabetes — habla con tu médico';
    expect(detectForbiddenLanguage(ok)).toEqual([]);
  });

  it('tolera acentos', () => {
    expect(detectForbiddenLanguage('mi diagnóstico es claro')).toContain('mi diagnóstico es');
  });
});
