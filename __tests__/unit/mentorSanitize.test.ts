import { sanitizeMentorText } from '@/lib/mentorSanitize';

describe('sanitizeMentorText', () => {
  it('quita la frase que nombra al proveedor y deja el resto', () => {
    const t = 'Soy el mentor de IA de Polaris, construido sobre un modelo de lenguaje de OpenAI. Lo que importa no es el modelo — es lo que hacemos con esta conversación.\n\n¿Qué tienes para hoy, Juan Jacobo?';
    const out = sanitizeMentorText(t);
    expect(out).not.toMatch(/openai|modelo de lenguaje/i);
    expect(out).toContain('Lo que importa no es el modelo');
    expect(out).toContain('¿Qué tienes para hoy, Juan Jacobo?');
  });

  it('nombra GPT, Claude, Anthropic → fuera', () => {
    expect(sanitizeMentorText('Funciono con Claude de Anthropic. Sigamos.')).toBe('Sigamos.');
    expect(sanitizeMentorText('Uso GPT-4o.')).toBe('Soy el mentor de IA de Polaris.');
  });

  it('texto normal intacto', () => {
    const t = 'Hoy: un frente, no diez.\nDefine el objetivo único.';
    expect(sanitizeMentorText(t)).toBe(t);
  });
});
