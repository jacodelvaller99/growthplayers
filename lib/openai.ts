const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // ms

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Valida si la API key es real (no test key o vacía)
 */
function isValidApiKey(key: string): boolean {
  return !!key && key.startsWith('sk-') && key.length > 20 && !key.includes('test');
}

/**
 * Exponential backoff retry strategy
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.code === 'ECONNREFUSED' || error.status >= 500)) {
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

/**
 * Stream chat response from OpenAI GPT-4o using native fetch
 * Falls back to demo mode if API key is invalid
 * Includes retry logic for network failures
 */
export async function streamOpenAI(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    { role: 'user', content: userMessage },
  ]
  let fullText = ''
  const wrappedChunk = (text: string) => { fullText += text; onChunk(text) }
  await chatWithMentor(messages, wrappedChunk, () => {})
  return fullText
}

export async function chatWithMentor(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';

  // MODO DEMO si no hay API key válida
  if (!isValidApiKey(apiKey)) {
    const demoResponses = [
      'Entiendo lo que describes. Lo que sientes tiene nombre: es la brecha entre saber y hacer. Tu arquetipo Constructor necesita sistemas, no motivación. ¿Cuál es tu tarea #1 de alto impacto para hoy?',
      'Exacto. Y ese patrón que describes — saber qué hacer pero no ejecutarlo — es exactamente el "gap de ejecución". La solución no es más información. Es arquitectura de hábitos. ¿Qué harías diferente esta semana si supieras que no puedes fallar?',
      'Perfecto. Hay algo que podría acelerar esto 10 veces. El Protocolo Soberano te da las herramientas exactas para este desafío. ¿Quieres verlo? {"show_upgrade":true}',
    ];
    const idx = Math.floor(messages.filter(m => m.role === 'user').length / 1) % demoResponses.length;
    const response = demoResponses[idx];
    const words = response.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise<void>(r => setTimeout(r, 55));
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
    }
    onDone();
    return;
  }

  // Llamada real con fetch nativo + retry logic
  try {
    const response = await withRetry(() =>
      fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          stream: true,
          max_tokens: 500,
          temperature: 0.85,
        }),
      })
    );

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onDone();
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) onChunk(delta);
        } catch {
          /* skip malformed chunks */
        }
      }
    }
    onDone();
  } catch (error) {
    console.error('OpenAI fetch error:', error);
    onChunk('Error de conexión. Intenta de nuevo.');
    onDone();
  }
}
