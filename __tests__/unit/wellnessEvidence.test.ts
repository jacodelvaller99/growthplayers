/**
 * Evidencia de bienestar — invariantes de honestidad.
 *
 * Poner un sello científico en una app de bienestar sube el listón de todo lo
 * demás: en cuanto una pantalla dice "JAMA 2023", cualquier descuido en otra se
 * lee como afirmación falsa. Estos tests fijan las reglas que hacen que el
 * sello signifique algo:
 *
 *   · toda clave referenciada existe (nada de sellos que apunten a nada)
 *   · toda cita nombra autores/revista/año (nada de "estudios demuestran")
 *   · el sello NO se reparte a todo el catálogo — si algún día casi todas las
 *     sesiones lo llevan, es señal de que se está citando de más
 */
import {
  EVIDENCE,
  EVIDENCE_GRADE_LABEL,
  type EvidenceKey,
} from '@/data/wellnessEvidence';
import { MEDITATION_SESSIONS } from '@/data/wellness';

describe('catálogo de evidencia', () => {
  it('cada referencia trae cita, grado y hallazgo — los tres', () => {
    for (const [key, ref] of Object.entries(EVIDENCE)) {
      expect(ref.citation.trim().length).toBeGreaterThan(0);
      expect(ref.finding.trim().length).toBeGreaterThan(0);
      expect(EVIDENCE_GRADE_LABEL[ref.grade]).toBeDefined();
      // El grado tiene que ser uno de los tres del internista, no inventado.
      expect(['established', 'probable', 'uncertain']).toContain(ref.grade);
      expect(key).toBe(key.toUpperCase());
    }
  });

  it('ninguna cita es vaga — todas nombran fuente y año', () => {
    // "Estudios demuestran" es exactamente lo que este sistema existe para
    // evitar. Una cita sin año no es una cita.
    for (const ref of Object.values(EVIDENCE)) {
      expect(ref.citation).toMatch(/\b(19|20)\d{2}\b/);
    }
  });
});

describe('sesiones ↔ evidencia', () => {
  const cited = MEDITATION_SESSIONS.filter((s) => s.evidence);

  it('toda sesión que declara evidencia apunta a una clave que existe', () => {
    const broken = cited
      .filter((s) => !EVIDENCE[s.evidence as EvidenceKey])
      .map((s) => `${s.id} → ${s.evidence}`);
    expect(broken).toEqual([]);
  });

  it('el sello NO está en todo el catálogo', () => {
    // El valor está en el contraste: si más de la mitad llevara sello, o
    // estamos citando de más o la señal dejó de informar. Este test es el
    // que avisa antes de que pase.
    const ratio = cited.length / MEDITATION_SESSIONS.length;
    expect(ratio).toBeLessThan(0.5);
    expect(cited.length).toBeGreaterThan(0);
  });

  it('las prácticas mejor evidenciadas están citadas', () => {
    // Al revés del anterior: si se borrara la evidencia de estas, el sistema
    // dejaría de aportar justo donde más respaldo hay.
    const byId = new Map(MEDITATION_SESSIONS.map((s) => [s.id, s]));
    expect(byId.get('suspiro-fisiologico')?.evidence).toBe('CYCLIC_SIGHING');
    expect(byId.get('body-scan-diurno')?.evidence).toBe('MBSR_ANXIETY');
    expect(byId.get('calma-corporal-total')?.evidence).toBe('PMR_ANXIETY');
  });
});

describe('categoría compasión — el hueco que se cerró', () => {
  it('existen sesiones de compasión', () => {
    // De 41 sesiones no había ninguna. Es la familia con efecto medido que
    // faltaba entera.
    const compasion = MEDITATION_SESSIONS.filter((s) => s.category === 'compasión');
    expect(compasion.length).toBeGreaterThanOrEqual(2);
  });

  it('sus sesiones citan la evidencia de loving-kindness', () => {
    const compasion = MEDITATION_SESSIONS.filter((s) => s.category === 'compasión');
    for (const s of compasion) {
      expect(s.evidence).toBe('LKM_POSITIVE_AFFECT');
    }
  });

  it('la evidencia de compasión se gradúa `probable`, no `established`', () => {
    // El efecto sobre satisfacción vital desaparece frente a control activo
    // (g=0.106, ns). Graduarla 'established' sería exagerar lo que dice.
    expect(EVIDENCE.LKM_POSITIVE_AFFECT.grade).toBe('probable');
  });
});
