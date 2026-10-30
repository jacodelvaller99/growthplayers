// ─── lib/memoryLogic.ts › parseSessionDigest — la sesión repartida ──────────

import { parseSessionDigest } from '@/lib/memoryLogic';

describe('parseSessionDigest', () => {
  it('reparte cada bloque en su lugar', () => {
    const out = [
      '===RESUMEN===',
      'Sesión sobre foco y descanso.',
      '===TEMAS===',
      '- Cómo organiza la mañana',
      '- Sueño irregular',
      '===MEJORAR===',
      '- Decir que no a reuniones sin agenda',
      '===COMPROMISOS===',
      '- Dormir antes de las 11 esta semana',
      '===PREGUNTAS===',
      '- ¿Delegar ventas?',
    ].join('\n');
    expect(parseSessionDigest(out)).toEqual({
      summary: 'Sesión sobre foco y descanso.',
      talked: ['Cómo organiza la mañana', 'Sueño irregular'],
      improve: ['Decir que no a reuniones sin agenda'],
      commitments: ['Dormir antes de las 11 esta semana'],
    });
  });

  it('sin marcadores no inventa listas: todo queda como resumen', () => {
    expect(parseSessionDigest('Hablamos un poco de todo.')).toEqual({
      summary: 'Hablamos un poco de todo.', talked: [], improve: [], commitments: [],
    });
  });
});
