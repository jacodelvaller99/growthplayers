import { GOLD, SILVER, goldIntensity, heightGradientColor } from '@/lib/particleBodyGradient';

describe('goldIntensity', () => {
  it('peaks at the chest height', () => {
    const chest = goldIntensity(0.72);
    expect(chest).toBeCloseTo(1, 5);
  });

  it('fades toward feet and head', () => {
    expect(goldIntensity(0)).toBeLessThan(0.01);
    // La cabeza tiene que quedar PLATA FRÍA como en la referencia — con
    // sigma 0.14 salía a 0.32 de tinte dorado y se veía dorada en el render.
    expect(goldIntensity(1)).toBeLessThan(0.1);
  });

  it('is stable across the [0,1] domain (never negative, never >1)', () => {
    for (let y = -0.5; y <= 1.5; y += 0.1) {
      const v = goldIntensity(y);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('heightGradientColor', () => {
  it('returns pure silver away from the chest', () => {
    const [r, g, b] = heightGradientColor(0);
    expect(r).toBeCloseTo(SILVER[0], 2);
    expect(g).toBeCloseTo(SILVER[1], 2);
    expect(b).toBeCloseTo(SILVER[2], 2);
  });

  it('returns pure gold at the chest', () => {
    const [r, g, b] = heightGradientColor(0.72);
    expect(r).toBeCloseTo(GOLD[0], 2);
    expect(g).toBeCloseTo(GOLD[1], 2);
    expect(b).toBeCloseTo(GOLD[2], 2);
  });
});
