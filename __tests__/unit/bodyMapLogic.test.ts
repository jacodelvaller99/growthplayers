/**
 * bodyMapLogic — dónde se siente, no solo cuánto.
 *
 * Los invariantes que importan: la primera zona señalada manda, el número solo
 * gradúa la intensidad (nunca la infiere de la zona), y NADA en la salida suena
 * a diagnóstico — Polaris es coaching, no clínica.
 */
import {
  BODY_ZONES,
  joinZones,
  readBody,
  ZONE_LABEL,
  type BodyZone,
} from '@/lib/bodyMapLogic';

describe('joinZones — lenguaje natural, sin comas colgando', () => {
  it('una zona', () => {
    expect(joinZones(['pecho'])).toBe('el pecho');
  });

  it('dos zonas se unen con "y", sin coma', () => {
    expect(joinZones(['pecho', 'garganta'])).toBe('el pecho y la garganta');
  });

  it('tres o más: comas y una sola "y" al final', () => {
    expect(joinZones(['pecho', 'garganta', 'manos'])).toBe('el pecho, la garganta y las manos');
  });

  it('sin zonas → cadena vacía, no "y" suelta', () => {
    expect(joinZones([])).toBe('');
  });

  it('descarta zonas inventadas en vez de renderizar undefined', () => {
    expect(joinZones(['pecho', 'aura' as BodyZone])).toBe('el pecho');
  });
});

describe('readBody — la primera zona manda', () => {
  it('sin señalar nada INVITA, no juzga — es el texto que se ve antes del primer toque', () => {
    // Dejo de ser copy muerto: ocupa el hueco reservado encima de la silueta,
    // asi que se lee ANTES de tocar. En pasado ("no señalaste") sonaba a
    // veredicto sobre algo que el usuario todavia no habia tenido ocasion de
    // hacer.
    const out = readBody({ zones: [], stress: 9 });
    expect(out.practice).toBeNull();
    expect(out.reading).toContain('Toca donde lo sientes');
    expect(out.reading).not.toMatch(/señalaste|deberías|falta/i);
  });

  it('la práctica sale de la PRIMERA zona, no de la última ni de un promedio', () => {
    const out = readBody({ zones: ['mandibula', 'estomago'], stress: 6 });
    expect(out.practice?.route).toBe('/bienestar/tapping');
  });

  it('invertir el orden cambia la práctica — el orden del tacto es información', () => {
    const a = readBody({ zones: ['mandibula', 'estomago'], stress: 6 });
    const b = readBody({ zones: ['estomago', 'mandibula'], stress: 6 });
    expect(a.practice?.route).not.toBe(b.practice?.route);
  });

  it('la lectura nombra TODAS las zonas señaladas, aunque la práctica sea de una', () => {
    const out = readBody({ zones: ['pecho', 'manos'], stress: 5 });
    expect(out.reading).toContain('el pecho y las manos');
  });

  it('la intensidad sale del número, no de la zona: misma zona, distinto texto', () => {
    const alto = readBody({ zones: ['pecho'], stress: 9 });
    const bajo = readBody({ zones: ['pecho'], stress: 2 });
    expect(alto.reading).not.toBe(bajo.reading);
    expect(alto.practice?.route).toBe(bajo.practice?.route); // la salida física no cambia
  });

  it('stress no numérico no rompe la lectura', () => {
    expect(() => readBody({ zones: ['pecho'], stress: NaN })).not.toThrow();
  });
});

describe('cobertura y línea roja clínica', () => {
  it('las 7 zonas tienen etiqueta y práctica con ruta real', () => {
    for (const z of BODY_ZONES) {
      expect(ZONE_LABEL[z]).toBeTruthy();
      const out = readBody({ zones: [z], stress: 5 });
      expect(out.practice?.route.startsWith('/bienestar/')).toBe(true);
      expect(out.practice?.why).toBeTruthy();
    }
  });

  it('NINGUNA salida usa lenguaje clínico o diagnóstico', () => {
    // Polaris no diagnostica (app/legal/salud.tsx). Si alguien mete "ansiedad",
    // "síntoma" o "trastorno" en un copy, este test lo para en CI.
    const prohibidas = /ansiedad|depresi|s[íi]ntoma|trastorno|patolog|diagn[óo]stic|enfermedad|estr[ée]s cr[óo]nico/i;
    for (const z of BODY_ZONES) {
      for (const stress of [0, 5, 9]) {
        const out = readBody({ zones: [z], stress });
        expect(out.reading).not.toMatch(prohibidas);
        expect(out.practice?.why ?? '').not.toMatch(prohibidas);
      }
    }
    expect(readBody({ zones: [], stress: 9 }).reading).not.toMatch(prohibidas);
  });
});
