/**
 * notify-7-llaves — Supabase Edge Function
 *
 * Envía por correo (Resend) cada nueva respuesta del test público
 * "Las 7 Llaves de la Prosperidad" (las-7-llaves-polaris.vercel.app),
 * que se guarda en la tabla `siete_llaves_responses` de este mismo proyecto.
 *
 * Trigger: Database Webhook de Supabase (INSERT en siete_llaves_responses)
 *   → POST { type:'INSERT', record: {...} }
 * También soporta un modo digest bajo demanda: POST { digest:true }
 *   → un solo correo con TODAS las filas (backfill/reenvío sin abrir el dashboard).
 *
 * SEGURIDAD: no verifica JWT (se despliega con --no-verify-jwt porque el
 * webhook de Supabase no firma uno) — el gate es el header `x-webhook-secret`
 * contra el secret SEVEN_KEYS_WEBHOOK_SECRET. Fail closed: sin secret o con
 * secret incorrecto, 401 y no se llama a Resend ni se toca la tabla.
 */
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('SEVEN_KEYS_WEBHOOK_SECRET') ?? '';
const NOTIFY_TO = Deno.env.get('SEVEN_KEYS_NOTIFY_TO') ?? 'ncapuozzo@polarisgrowthinstitute.com';
const FROM = 'Las 7 Llaves <onboarding@resend.dev>'; // hasta verificar dominio propio en Resend

// Mismo orden/ids que KEYS en las-7-llaves-test/app.js — si esas 7 llaves cambian, actualizar aquí también.
const KEY_LABELS: Record<string, string> = {
  intencion: 'Intención', pasado: 'Pasado', presente: 'Presente', futuro: 'Futuro',
  camino: 'Camino', servicio: 'Servicio', administracion: 'Administración',
  valor: 'Intención', // id legado de respuestas anteriores al rename (mismo orden/score)
};
const KEY_ORDER = ['intencion', 'pasado', 'presente', 'futuro', 'camino', 'servicio', 'administracion'];
const STATEMENTS = [
  'Siento que mi valor como persona sube o baja según mis resultados económicos del momento.',
  'Quiero tener dinero, sobre todo, para dejar de sentir miedo o inseguridad.',
  'Suelo resolverle la vida a otros (dándoles dinero, consejos o soluciones) en vez de dejar que encuentren su propio camino.',
  'No tengo del todo claro para qué quiero el dinero, más allá de "tener más".',
  'Sigo cargando frases sobre el dinero que escuché de niño en casa (que "no alcanza", que "es sucio", etc.) sin haberlas cuestionado nunca.',
  'Cuando pienso en mi peor momento financiero, todavía siento la emoción como si estuviera ahí, no como un aprendizaje ya cerrado.',
  'Actúo hoy con miedo a perder o a fracasar económicamente, aunque mi situación actual no lo justifique.',
  'Siento que hay una "estaca" invisible que me detiene, aunque hoy tenga de sobra la fuerza para romperla.',
  'Me cuesta sentirme "rico" hoy — siento que primero necesito llegar a cierta cifra para disfrutar y agradecer lo que ya tengo.',
  'Descuido mi energía (sueño, cuerpo, presencia) y después lo noto en cómo tomo mis decisiones de negocio.',
  'Cuando algo financiero sale mal, tiendo a explicarlo por factores externos (el mercado, el gobierno, otra persona) antes que asumir mi 100% de responsabilidad.',
  'Vivo más enfocado en la cifra que quiero alcanzar que en valorar lo que ya construí hasta hoy.',
  'Me cuesta soñar en grande sin sentir que estoy siendo poco realista o arrogante.',
  'Tengo metas financieras, pero no un plan de acción concreto ni un "avatar" claro de en quién me tengo que convertir para lograrlas.',
  'Declaro lo que quiero desde la carencia ("cuando tenga...") más que desde la certeza de que ya está en camino.',
  'Postergo actuar hoy como la persona que quiero llegar a ser, esperando primero tener los resultados.',
  'Le pongo condiciones a los caminos que la vida me abre — solo acepto oportunidades que encajan exactamente con lo que "quiero hacer".',
  'Cuando una idea o una oportunidad no fluye con facilidad, la fuerzo en vez de soltarla y observar.',
  'Evalúo mis decisiones de negocio más por si me gustan que por si de verdad mejoran mis 5 resultados de vida (paz, economía, relaciones, salud, disfrute).',
  'Vivo mi función —mi trabajo— como una obligación más que como una expresión de lo que soy.',
  'Trabajo, ante todo, por necesidad de dinero — más que por el deseo genuino de servir a través de lo que hago.',
  'Me cuesta confiar plenamente en mi propio criterio y capacidad para liderar mis proyectos.',
  'Siento que aumentar mis ingresos requeriría trabajar más horas, en vez de aumentar mi capacidad real de servicio o construir sistemas que funcionen sin mí.',
  'Evito comprometerme del todo con algo (un acuerdo, un proyecto, una relación) porque lo vivo como una obligación y no como una decisión libre.',
  'Genero ingresos importantes, pero no tengo un orden claro de prioridades (gastos, deudas, reinversión, ahorro) para administrarlos.',
  'Me doy gustos o hago compras grandes antes de haber ordenado mis finanzas básicas.',
  'He prestado o dado dinero a alguien sin evaluar si eso interrumpe su propio proceso de aprendizaje.',
  'No tengo un porcentaje definido de reinversión en mí mismo o en mis empresas — "pagarte a ti mismo" antes de gastar.',
];

interface ResponseRow {
  id: string;
  created_at: string;
  name: string;
  occupation: string | null;
  email: string;
  phone: string | null;
  raw_answers: number[];
  key_scores: number[];
  top_key: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderRow(row: ResponseRow): string {
  const ranked = KEY_ORDER
    .map((id, i) => ({ id, label: KEY_LABELS[id], score: row.key_scores[i] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const scoresHtml = ranked
    .map((r) => `<tr><td style="padding:2px 12px 2px 0">${escapeHtml(r.label)}</td><td>${r.score}/20</td></tr>`)
    .join('');

  const answersHtml = STATEMENTS
    .map((text, i) => {
      const val = row.raw_answers[i] ?? '';
      return `<tr><td style="padding:2px 12px 2px 0;color:#555">${escapeHtml(text)}</td><td style="text-align:center">${val}</td></tr>`;
    })
    .join('');

  const topLabel = KEY_LABELS[row.top_key] ?? row.top_key;

  return `
    <h2 style="margin-bottom:4px">${escapeHtml(row.name)} ${row.occupation ? `— ${escapeHtml(row.occupation)}` : ''}</h2>
    <p style="margin:2px 0;color:#555">
      ${escapeHtml(row.email)}${row.phone ? ` · ${escapeHtml(row.phone)}` : ''}<br>
      ${new Date(row.created_at).toLocaleString('es-CO')}
    </p>
    <p><strong>Llave dominante: ${escapeHtml(topLabel)}</strong></p>
    <table style="border-collapse:collapse;margin-bottom:12px">${scoresHtml}</table>
    <details>
      <summary style="cursor:pointer;color:#555">Ver las 28 respuestas</summary>
      <table style="border-collapse:collapse;margin-top:8px;font-size:13px">${answersHtml}</table>
    </details>
  `;
}

async function sendEmail(subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'Falta RESEND_API_KEY' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [NOTIFY_TO], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  // ── Gate: header secret, fail closed ────────────────────────────────────────
  const secret = req.headers.get('x-webhook-secret') ?? '';
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: { type?: string; record?: ResponseRow; digest?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  try {
    if (body.digest) {
      const { data, error } = await adminSupabase
        .from('siete_llaves_responses')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const rows = (data ?? []) as ResponseRow[];
      const html = `<h1>Las 7 Llaves — Digest (${rows.length} respuestas)</h1>${rows.map(renderRow).join('<hr>')}`;
      const sent = await sendEmail(`Las 7 Llaves — Digest (${rows.length} respuestas)`, html);
      if (!sent.ok) return json({ error: sent.error }, 502);
      return json({ ok: true, count: rows.length });
    }

    if (!body.record) return json({ error: 'record es requerido' }, 400);
    const row = body.record;
    const topLabel = KEY_LABELS[row.top_key] ?? row.top_key;
    const sent = await sendEmail(
      `Nueva respuesta 7 Llaves — ${row.name} (${topLabel})`,
      renderRow(row),
    );
    if (!sent.ok) return json({ error: sent.error }, 502);
    return json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[notify-7-llaves]', msg);
    return json({ error: msg }, 500);
  }
});
