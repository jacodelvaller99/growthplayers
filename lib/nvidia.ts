const NVIDIA_INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = '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';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // ms

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
 * Stream chat response from NVIDIA Qwen 3.5 (122B) with thinking mode
 * Qwen tiene razonamiento más profundo que GPT-4o
 * enable_thinking=True permite cadena de pensamiento
 */
export async function streamNvidia(
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
  // DEMO MODE si no hay conexión
  if (!NVIDIA_API_KEY || NVIDIA_API_KEY.length < 10) {
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

  // Llamada real a NVIDIA Qwen 3.5 con thinking mode
  try {
    const response = await withRetry(() =>
      fetch(NVIDIA_INVOKE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.5-122b-a10b',
          messages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.60,
          top_p: 0.95,
          chat_template_kwargs: {
            enable_thinking: true, // ← CLAVE: Razonamiento profundo
          },
        }),
      })
    );

    if (!response.ok) {
      throw new Error(`NVIDIA error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      onDone();
      return;
    }

    let thinkingMode = false;
    let thinkingContent = '';
    let responseContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') {
          // Si hay thinking, muéstralo primero
          if (thinkingContent) {
            onChunk('\n\n💭 **Razonamiento:** ');
            onChunk(thinkingContent);
            onChunk('\n\n');
          }
          onChunk(responseContent);
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.thinking) {
            thinkingMode = true;
            thinkingContent += delta.thinking;
          }

          if (delta?.content) {
            thinkingMode = false;
            responseContent += delta.content;
            // No mostrar thinking en tiempo real, acumular
            if (!thinkingMode) {
              onChunk(delta.content);
            }
          }
        } catch {
          /* skip malformed chunks */
        }
      }
    }

    onDone();
  } catch (error) {
    console.error('NVIDIA Qwen error:', error);
    onChunk('Error de conexión con Qwen. Intenta de nuevo.');
    onDone();
  }
}
