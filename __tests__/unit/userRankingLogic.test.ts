import {
  computeWeightedScore,
  rankUsers,
  sortByDimension,
  DEFAULT_WEIGHTS,
  type RankableUser,
} from '@/lib/userRankingLogic';

describe('computeWeightedScore', () => {
  it('todo en 100 (churn 0) → score 100', () => {
    const u: RankableUser = {
      id: '1', name: 'A',
      sovereign: 100, engagement: 100, wellbeing: 100,
      churnRisk: 0, executionMomentum: 100, relationalDepth: 100,
    };
    expect(computeWeightedScore(u).score).toBe(100);
  });

  it('churn alto baja el score (se invierte)', () => {
    const low = computeWeightedScore({ id: '1', name: 'A', churnRisk: 0.9 }).score;
    const high = computeWeightedScore({ id: '1', name: 'A', churnRisk: 0.1 }).score;
    expect(high).toBeGreaterThan(low);
  });

  it('re-normaliza sobre dimensiones disponibles (no penaliza faltantes a 0)', () => {
    // solo sovereign 80 → score ≈ 80 (no diluido por las dimensiones ausentes)
    const { score } = computeWeightedScore({ id: '1', name: 'A', sovereign: 80 });
    expect(score).toBe(80);
  });

  it('sin ninguna dimensión → 0', () => {
    expect(computeWeightedScore({ id: '1', name: 'A' }).score).toBe(0);
  });

  it('contributions suma ≈ score', () => {
    const { score, contributions } = computeWeightedScore({
      id: '1', name: 'A', sovereign: 60, engagement: 80, churnRisk: 0.2,
    });
    const sum = Object.values(contributions).reduce((a, b) => a + (b ?? 0), 0);
    expect(Math.abs(sum - score)).toBeLessThanOrEqual(2); // redondeos
  });

  it('pesos por defecto suman 1', () => {
    const total = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-9);
  });
});

describe('rankUsers', () => {
  const users: RankableUser[] = [
    { id: 'a', name: 'Ana',   sovereign: 90, engagement: 85, churnRisk: 0.1, wellbeing: 80 },
    { id: 'b', name: 'Beto',  sovereign: 40, engagement: 30, churnRisk: 0.8, wellbeing: 35 },
    { id: 'c', name: 'Caro',  sovereign: 65, engagement: 60, churnRisk: 0.4, wellbeing: 60 },
  ];

  it('ordena por score descendente con rank 1-based', () => {
    const r = rankUsers(users);
    expect(r[0].name).toBe('Ana');
    expect(r[0].rank).toBe(1);
    expect(r[2].name).toBe('Beto');
    expect(r[2].rank).toBe(3);
  });

  it('percentil: el mejor 100, el peor 0', () => {
    const r = rankUsers(users);
    expect(r[0].percentile).toBe(100);
    expect(r[r.length - 1].percentile).toBe(0);
  });

  it('topDriver señala la dimensión que más aportó', () => {
    const r = rankUsers([{ id: 'x', name: 'X', sovereign: 95, engagement: 10, churnRisk: 0.9 }]);
    expect(r[0].topDriver?.dimension).toBe('sovereign');
  });

  it('un solo usuario → percentil 100', () => {
    const r = rankUsers([{ id: 'x', name: 'X', sovereign: 50 }]);
    expect(r[0].percentile).toBe(100);
    expect(r[0].rank).toBe(1);
  });

  it('empates: desempata por nombre asc (estable)', () => {
    const r = rankUsers([
      { id: '2', name: 'Zoe', sovereign: 50 },
      { id: '1', name: 'Abe', sovereign: 50 },
    ]);
    expect(r[0].name).toBe('Abe');
  });
});

describe('sortByDimension', () => {
  it('reordena por aporte de una dimensión', () => {
    const ranked = rankUsers([
      { id: 'a', name: 'Ana',  sovereign: 30, engagement: 95 },
      { id: 'b', name: 'Beto', sovereign: 95, engagement: 30 },
    ]);
    const byEngagement = sortByDimension(ranked, 'engagement');
    expect(byEngagement[0].name).toBe('Ana');
    const bySovereign = sortByDimension(ranked, 'sovereign');
    expect(bySovereign[0].name).toBe('Beto');
  });
});
