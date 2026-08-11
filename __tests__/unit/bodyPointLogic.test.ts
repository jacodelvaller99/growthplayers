import {
  bodyPointAt,
  bodyPointLabel,
  bodyRegionAt,
  joinBodyPointLabels,
  parseBodyPoints,
  toggleBodyPoint,
  zonesFromBodyPoints,
} from '@/lib/bodyPointLogic';

describe('bodyPointLogic — toque continuo sobre el escaneo frontal', () => {
  it.each([
    [0.5, 0.08, 'frente'],
    [0.45, 0.05, 'cabeza'],
    [0.5, 0.3, 'pecho'],
    [0.5, 0.39, 'abdomen'],
    [0.5, 0.43, 'abdomen'],
    [0.205, 0.54, 'mano'],
    [0.4, 0.735, 'rodilla'],
    [0.61, 0.95, 'pie'],
  ] as const)('ubica (%s, %s) en %s', (x, y, region) => {
    expect(bodyRegionAt(x, y)).toBe(region);
  });

  it('ignora el fondo negro y coordenadas inválidas', () => {
    expect(bodyPointAt(0.05, 0.05)).toBeNull();
    expect(bodyPointAt(Number.NaN, 0.5)).toBeNull();
    expect(bodyPointAt(1.2, 0.5)).toBeNull();
  });

  it('conserva coordenadas normalizadas, región, lado y zona semántica', () => {
    expect(bodyPointAt(0.4, 0.735)).toEqual({
      x: 0.4,
      y: 0.735,
      region: 'rodilla',
      side: 'izquierda',
      zone: 'piernas',
    });
  });

  it('nombra el punto exacto y su lado', () => {
    const point = bodyPointAt(0.795, 0.535)!;
    expect(bodyPointLabel(point)).toBe('mano derecha');
  });

  it('une varios puntos sin repetir etiquetas', () => {
    const left = bodyPointAt(0.4, 0.735)!;
    const right = bodyPointAt(0.6, 0.735)!;
    expect(joinBodyPointLabels([left, left, right])).toBe('rodilla izquierda y rodilla derecha');
  });

  it('tocar cerca elimina el marcador y limita el historial visible', () => {
    const chest = bodyPointAt(0.5, 0.3)!;
    expect(toggleBodyPoint([chest], bodyPointAt(0.51, 0.31)!)).toEqual([]);

    const many = Array.from({ length: 8 }, (_, index) => ({
      ...chest,
      x: 0.4 + index * 0.06,
      y: 0.25 + index * 0.07,
    }));
    expect(toggleBodyPoint(many.slice(0, 6), many[7])).toHaveLength(6);
  });

  it('deriva zonas únicas para patrones y recomendaciones', () => {
    const knee = bodyPointAt(0.4, 0.735)!;
    const foot = bodyPointAt(0.39, 0.95)!;
    expect(zonesFromBodyPoints([knee, knee, foot])).toEqual(['piernas', 'pies']);
  });

  it('filtra JSON inválido antes de rehidratar marcadores', () => {
    const valid = bodyPointAt(0.5, 0.3)!;
    expect(parseBodyPoints([valid, { ...valid, x: 9 }, { nope: true }])).toEqual([valid]);
    expect(parseBodyPoints('no es un arreglo')).toEqual([]);
  });
});
