/**
 * Testimonios — prueba de transformación para el paywall.
 *
 * ⚠️ HANDOFF DEL DUEÑO (obligatorio antes de tratar esto como prueba real):
 *   - NINGUNA entrada está verificada todavía (`verified: false` en todas).
 *   - El testimonio real (60→20h) viene del copy existente del paywall pero
 *     NO tiene nombre/foto confirmados ni autorización por escrito. El dueño
 *     debe confirmar identidad + consentimiento y poner `verified: true`.
 *   - Las 2 entradas "[Pendiente]" son PLACEHOLDERS honestos: describen el TIPO
 *     de resultado del programa SIN inventar métricas, nombres ni cifras.
 *     Reemplázalas con testimonios reales (con consentimiento) o elimínalas.
 *   - NO inventar métricas. Cualquier `metric.before/after` debe venir de un
 *     testimonio real y autorizado. Mientras `verified` sea false, la UI debe
 *     presentarlo como ilustrativo, no como dato probado.
 */

export interface Testimonial {
  id: string;
  /** Nombre del cliente. "[Pendiente]" hasta que el dueño lo confirme. */
  name: string;
  /** Rol/contexto opcional (ej. "Operador activo", "Fundador"). */
  role?: string;
  quote: string;
  /** Métrica antes→después. Solo presente en testimonios reales y autorizados. */
  metric?: {
    before: string;
    after: string;
    context?: string;
  };
  /** Tier al que pertenece la oferta que vivió el cliente. */
  tier: 'premium' | 'premium_plus' | 'polaris' | 'growthplayers';
  /** true SOLO cuando el dueño confirmó identidad + consentimiento + foto. */
  verified: boolean;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    // Testimonio real heredado del copy del paywall. Pendiente de confirmar
    // nombre/foto/consentimiento → verified:false hasta que el dueño lo valide.
    id: 'operador-60-20',
    name: '[Pendiente — confirmar nombre]',
    role: 'Operador activo',
    quote:
      'El método que usé para pasar de 60 a 20 horas de trabajo semanales sin perder ingresos.',
    metric: {
      before: '60 h/semana',
      after: '20 h/semana',
      context: 'sin perder ingresos',
    },
    tier: 'premium',
    verified: false,
  },
  {
    // PLACEHOLDER honesto — sin métricas inventadas. Reemplazar con testimonio real.
    id: 'placeholder-claridad',
    name: '[Pendiente]',
    role: 'Fundador',
    quote:
      'Dejé de reaccionar al día y empecé a operar con un plan. El check-in diario y Norman me dieron la estructura que me faltaba.',
    tier: 'premium',
    verified: false,
  },
  {
    // PLACEHOLDER honesto — sin métricas inventadas. Reemplazar con testimonio real.
    id: 'placeholder-acompanamiento',
    name: '[Pendiente]',
    role: 'Premium Plus',
    quote:
      'El acompañamiento 1:1 cambió el ritmo. Tener a alguien que revisa lo que hago, no solo lo que digo, sostiene el compromiso.',
    tier: 'premium_plus',
    verified: false,
  },
];
