// ─── Environment Configuration ───────────────────────────────────────────────
// Variables con prefijo EXPO_PUBLIC_ son inlineadas en build time.
// Nunca uses estas claves directamente en código servidor.

export const ENV = {
  /** true en desarrollo (Metro / Expo Go), false en build de producción */
  isDev: __DEV__ as boolean,

  /** NVIDIA NIM API key – usada para meta/llama-3.3-70b-instruct */
  nvidiaApiKey: (process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? '') as string,

  /** Groq API key – qwen/qwen3-32b con reasoning (segundo en la cadena) */
  groqApiKey: (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '') as string,

  /** OpenAI API key – fallback final si NVIDIA y Groq fallan */
  openaiApiKey: (process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '') as string,

  /** RevenueCat SDK key (iOS o Android según plataforma) */
  revenueCatApiKey: (process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '') as string,
} as const;
