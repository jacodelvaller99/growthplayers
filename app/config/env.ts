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

  /**
   * URL del ai-proxy (Edge Function) — si está seteada, el chat del mentor y la
   * transcripción Whisper van por el servidor (las claves de IA dejan de usarse
   * en el cliente). Ej: https://<ref>.supabase.co/functions/v1/ai-proxy
   */
  aiProxyUrl: (process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '') as string,

  /**
   * Feature flag — Confrontation OS (motor "DIJO vs HIZO"). Default false:
   * cohorte gradual primero. Cuando se active, Norman puede abrir confrontando
   * con dato (severity high+) si el cliente firmó el consent específico
   * `confrontation_with_data` en onboarding. La capa IO en lib/confrontation.ts
   * verifica este flag antes de hacer cualquier query.
   */
  confrontationOsEnabled: ((process.env.EXPO_PUBLIC_CONFRONTATION_OS_ENABLED ?? '').toLowerCase() === 'true') as boolean,

  /**
   * Vendor del agregador universal de wearables: 'terra' (default, comercial,
   * widget multi-marca hosteado) o 'open_wearables' (OSS self-host). En modo
   * open_wearables la conexión es OAuth POR MARCA, así que la UI ofrece un
   * selector de proveedor. Las claves del vendor (API key / signing secret) son
   * secrets server-side de la edge function `wearable-aggregator` — NUNCA aquí.
   */
  aggregatorVendor: ((process.env.EXPO_PUBLIC_AGGREGATOR_VENDOR ?? 'terra').toLowerCase()) as
    | 'terra'
    | 'open_wearables',
} as const;
