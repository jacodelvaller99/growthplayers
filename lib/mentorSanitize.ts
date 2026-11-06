/**
 * Norman no nombra proveedores ni modelos de IA. La regla está en el prompt,
 * pero un prompt no garantiza nada y el historial viejo (de cuando la cadena
 * incluía OpenAI) ya trae frases así — y se le reenvía al modelo, que las imita.
 * Este filtro quita la FRASE entera que las nombra: en pantalla, en el historial
 * que se envía y en lo que se guarda. Puro y testeado.
 */
const PROVIDER = /\b(open\s?ai|anthropic|chat\s?gpt|gpt[-\s]?\d|gpt\b|claude|llama|deepseek|groq|nvidia|gemini|modelo(s)? de lenguaje|language model|llm)\b/i;

const FALLBACK = 'Soy el mentor de IA de Polaris.';

export function sanitizeMentorText(text: string): string {
  if (!text || !PROVIDER.test(text)) return text;
  const out = text
    .split('\n')
    .map((line) => (line.match(/[^.!?]+[.!?…]*\s*/g) ?? [line]).filter((s) => !PROVIDER.test(s)).join('').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out || FALLBACK;
}
