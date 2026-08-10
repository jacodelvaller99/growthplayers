import {
  GOLD,
  SILVER,
  frontFacingBias,
  goldIntensity,
  heartClusterColor,
  heartClusterIntensity,
  heightGradientColor,
} from '@/lib/particleBodyGradient';

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

describe('frontFacingBias', () => {
  it('is full strength facing the camera (nz=1)', () => {
    expect(frontFacingBias(1)).toBe(1);
  });

  it('is zero on the sides (nz=0) and the back (nz negative)', () => {
    expect(frontFacingBias(0)).toBe(0);
    expect(frontFacingBias(-1)).toBe(0);
  });

  it('never returns negative or >1 across the domain', () => {
    for (let nz = -1; nz <= 1; nz += 0.1) {
      const v = frontFacingBias(nz);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('heartClusterIntensity', () => {
  it('peaks at the chest height on the front-facing surface', () => {
    expect(heartClusterIntensity(0.72, 1)).toBeCloseTo(1, 5);
  });

  it('is suppressed at chest height on the back (nz=-1) — no more full band', () => {
    // Antes (goldIntensity sola) esto habría dado ~1: una banda completa
    // alrededor del torso. El cúmulo frontal debe apagarlo en la espalda.
    expect(heartClusterIntensity(0.72, -1)).toBe(0);
  });

  it('is suppressed at chest height on the sides (nz=0)', () => {
    expect(heartClusterIntensity(0.72, 0)).toBe(0);
  });
});

describe('heartClusterColor', () => {
  it('matches heightGradientColor on the front-facing surface (nz=1)', () => {
    const front = heartClusterColor(0.72, 1);
    const height = heightGradientColor(0.72);
    expect(front[0]).toBeCloseTo(height[0], 5);
    expect(front[1]).toBeCloseTo(height[1], 5);
    expect(front[2]).toBeCloseTo(height[2], 5);
  });

  it('stays pure silver on the back even at chest height', () => {
    const [r, g, b] = heartClusterColor(0.72, -1);
    expect(r).toBeCloseTo(SILVER[0], 2);
    expect(g).toBeCloseTo(SILVER[1], 2);
    expect(b).toBeCloseTo(SILVER[2], 2);
  });
});
