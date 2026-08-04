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

describe('geometria de la silueta — ninguna zona pisa a otra', () => {
  // POR QUE: `espalda` llegaba al 37% y `pecho` empezaba en el 34%. Tres puntos
  // de solape, y como `espalda` se renderiza despues ganaba el hit-test: tocabas
  // el borde de tu pecho, la app encendia tu espalda y te mandaba a otra
  // practica. Un solape de rectangulos es aritmetica, no opinion — asi que se
  // fija aqui y no en una revision visual.
  //
  // Se lee el fichero del componente en vez de importarlo: `ZONE_BOX` es
  // privado a proposito (nadie mas debe posicionar zonas) y este test no
  // justifica exportarlo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '../../components/body-map.tsx'), 'utf8');
  const bloque = src.slice(src.indexOf('const ZONE_BOX'), src.indexOf('};', src.indexOf('const ZONE_BOX')));
  const cajas = [...bloque.matchAll(
    /(\w+):\s*\{ top: '(\d+)%',\s*left: '(\d+)%',\s*width: '(\d+)%',\s*height: '(\d+)%'/g,
  )].map((m) => ({
    zona: m[1], y0: +m[2], y1: +m[2] + +m[5], x0: +m[3], x1: +m[3] + +m[4],
  }));

  it('las 7 zonas estan declaradas y se pueden leer', () => {
    expect(cajas).toHaveLength(7);
  });

  it('ningun par de zonas se solapa', () => {
    const solapes: string[] = [];
    for (let i = 0; i < cajas.length; i++) {
      for (let j = i + 1; j < cajas.length; j++) {
        const a = cajas[i]; const b = cajas[j];
        const cruzaY = !(a.y1 <= b.y0 || b.y1 <= a.y0);
        const cruzaX = !(a.x1 <= b.x0 || b.x1 <= a.x0);
        if (cruzaY && cruzaX) solapes.push(`${a.zona}/${b.zona}`);
      }
    }
    expect(solapes).toEqual([]);
  });

  it('ninguna zona baja del minimo tactil: react-native-web ignora hitSlop', () => {
    // En la PWA el area real es la caja cruda. Con el canvas a 303pt de ancho y
    // aspectRatio 0.72 (=421pt de alto), un 10% de alto son 42pt. El piso es 44.
    // 44, el piso real. Estaba en 28 bajo un comentario que decia 44: el test
    // afirmaba un minimo que no comprobaba, y dejaba pasar zonas de 29pt.
    const ALTO_CANVAS = 421;
    const PISO_TACTIL = 44;
    const flacas = cajas.filter((c) => ((c.y1 - c.y0) / 100) * ALTO_CANVAS < PISO_TACTIL);
    expect(flacas.map((c) => c.zona)).toEqual([]);
  });
});
