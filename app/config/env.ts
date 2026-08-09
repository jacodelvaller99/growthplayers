// ─── Environment Configuration ───────────────────────────────────────────────
// Variables con prefijo EXPO_PUBLIC_ son inlineadas en build time.
// Nunca uses estas claves directamente en código servidor.

export const ENV = {
  /** true en desarrollo (Metro / Expo Go), false en build de producción */
  isDev: __DEV__ as boolean,

  // Aquí vivían `nvidiaApiKey` / `groqApiKey` / `openaiApiKey`, leídas de
  // EXPO_PUBLIC_*. Eliminadas: todo lo que lleva ese prefijo se INLINEA en el
  // bundle, así que la clave viajaba en texto plano al navegador de cada
  // usuario — abrir devtools bastaba para copiarla y facturar contra la cuenta
  // del dueño. Las claves de IA son ahora secrets de la edge function
  // `ai-proxy`; el único interruptor client-side es `aiProxyUrl`.

  /** RevenueCat SDK key (iOS o Android según plataforma) */
  revenueCatApiKey: (process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '') as string,

  /**
   * URL del ai-proxy (Edge Function). Es el ÚNICO camino a la IA: el chat del
   * mentor, el internista, el copiloto admin y la transcripción Whisper pasan
   * por el servidor, donde viven las claves. Sin esta variable no hay ningún
   * proveedor disponible — deliberado, no un fallback roto.
   * Ej: https://<ref>.supabase.co/functions/v1/ai-proxy
   */
  aiProxyUrl: (process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '') as string,

  /**
   * Feature flag — Confrontation OS (motor "DIJO vs HIZO").
   *
   * Default TRUE desde 2026-07-30 (antes false, para rollout por cohorte). El
   * interruptor que de verdad protege al cliente nunca fue este flag global,
   * sino los cuatro gates POR USUARIO que `buildConfrontations` aplica y que
   * no se pueden saltar desde aquí:
   *   · `ml_consent` activo
   *   · `consents.confrontation_with_data` firmado en onboarding
   *   · `pause_state` inactivo
   *   · sin bloqueadores de crisis/duelo en el perfil
   * Un usuario que no marcó la casilla de confrontación no recibe nada aunque
   * el flag esté encendido, así que dejarlo apagado solo servía para que la
   * función no existiera para NADIE — incluidos los que sí la pidieron.
   *
   * Se conserva como interruptor de emergencia: `=false` lo apaga entero sin
   * desplegar código.
   */
  confrontationOsEnabled: ((process.env.EXPO_PUBLIC_CONFRONTATION_OS_ENABLED ?? 'true').toLowerCase() === 'true') as boolean,

  /**
   * Feature flag — El Círculo (red social interna: espacios, eventos con RSVP,
   * conexiones, comentarios y reacciones). Default TRUE: verificado en vivo
   * contra Supabase producción (curl a /rest/v1/community_spaces,
   * community_events, space_members, event_rsvps, user_connections,
   * post_comments, community_reactions — las 7 responden 200, la migración
   * `20260621000000` ya está aplicada). Antes de esto el default era `false`
   * justo porque no se podía confirmar eso sin acceso al dashboard; ya no es
   * el caso. La capa IO en lib/circle.ts sigue verificando este flag antes de
   * cualquier query. El feed general y los DMs existentes NO dependen de él.
   * Interruptor de emergencia: `EXPO_PUBLIC_SOCIAL_SPACES_ENABLED=false` lo
   * apaga entero sin desplegar código.
   */
  socialSpacesEnabled: ((process.env.EXPO_PUBLIC_SOCIAL_SPACES_ENABLED ?? 'true').toLowerCase() === 'true') as boolean,

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

  /**
   * Feature flag — tarjeta del agregador universal de wearables. Default FALSE.
   *
   * El código del agregador está completo, pero enrutar datos requiere
   * infraestructura externa (secrets de Terra, o una instancia self-host de Open
   * Wearables). Mientras eso no exista, la tarjeta se ofrecía como CTA principal
   * "RECOMENDADO" y siempre terminaba en "Integración en activación" — el usuario
   * pulsaba la opción más prominente de la pantalla y no pasaba nada.
   *
   * Con el flag en false, las vías que SÍ funcionan pasan a primer plano:
   * OAuth (Oura · WHOOP · Polar) y, en la app nativa, Apple Salud / Health
   * Connect — que cubren Garmin, Coros, Samsung y Fitbit sin sus APIs cerradas.
   *
   * Ponlo en true SOLO cuando el webhook del agregador esté provisionado y
   * verificado de punta a punta.
   */
  aggregatorEnabled: ((process.env.EXPO_PUBLIC_AGGREGATOR_ENABLED ?? '').toLowerCase() === 'true') as boolean,
} as const;
