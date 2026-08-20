/**
 * notify-7-llaves — Supabase Edge Function
 *
 * Envía por correo (Resend) cada nueva respuesta del test público
 * "Las 7 Llaves de la Prosperidad" (las-7-llaves-polaris.vercel.app),
 * que se guarda en la tabla `siete_llaves_responses` de este mismo proyecto.
 * Dos correos por respuesta nueva:
 *   1. Al CLIENTE que hizo el test — su resultado personalizado (diseño
 *      "Polaris - Email Resultados 7 Llaves.html", importado del proyecto
 *      claude.ai/design 623e961e-8d3e-436a-88ad-16a3fb481ff5).
 *   2. Al dueño (NOTIFY_TO) — notificación interna con los mismos tokens de
 *      marca.
 *
 * Paleta y tipografía: Manual de Marca POLARIS (Orgánico Studio, 2024) —
 * NO el diseño importado de claude.ai/design tal cual (ese usaba Space Mono
 * y grises inventados que no están en el manual real). Del manual:
 *   - Tipografía secundaria: Michroma (no Space Mono). Escala de reemplazo
 *     del manual: Grandis Extended → Michroma → Myriad Pro → Arial.
 *   - Paleta: Smoky Black #0F0F0F · Dark Silver #6D6D6D · grises claros
 *     #C9C9C9 / #E6E6E6 · dorado #FFC804 · dorado profundo #EDBA01.
 *   - Logomark real (estrella de 8 puntas, brand/Polaris Star - Gold.svg del
 *     proyecto de diseño) embebido como data URI — no el glifo ★ genérico.
 *
 * Trigger: Database Webhook de Supabase (INSERT en siete_llaves_responses)
 *   → POST { type:'INSERT', record: {...} }
 * También soporta un modo digest bajo demanda: POST { digest:true }
 *   → un solo correo interno con TODAS las filas (backfill/reenvío sin abrir
 *   el dashboard). El digest NUNCA le escribe a clientes — es solo interno.
 *
 * `to` en el body: override manual, solo para pruebas (curl). Si viene, TANTO
 * el correo admin como el de cliente se mandan ahí — así una prueba manual
 * nunca le escribe a un cliente real por accidente.
 *
 * SEGURIDAD: no verifica JWT (se despliega con --no-verify-jwt porque el
 * webhook de Supabase no firma uno) — el gate es el header `x-webhook-secret`
 * contra el secret SEVEN_KEYS_WEBHOOK_SECRET. Fail closed: sin secret o con
 * secret incorrecto, 401 y no se llama a Resend ni se toca la tabla.
 *
 * ponytail: autocontenida (no importa ../_shared/supabase.ts como las demás
 * funciones) para poder desplegarla desde el editor del dashboard de Supabase
 * sin depender de que resuelva imports relativos fuera de esta carpeta — no
 * hay CLI/service-role local en este repo (ver CLAUDE.md). Si más adelante se
 * despliega por CLI, se puede volver a compartir _shared/supabase.ts.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('SEVEN_KEYS_WEBHOOK_SECRET') ?? '';
const NOTIFY_TO = Deno.env.get('SEVEN_KEYS_NOTIFY_TO') ?? 'ncapuozzo@polarisgrowthinstitute.com';
const FROM = 'Las 7 Llaves <onboarding@resend.dev>'; // hasta verificar dominio propio en Resend

// ── Design tokens — Manual de Marca POLARIS (Orgánico Studio, 2024) ──────────
const C = {
  bg: '#0F0F0F',        // Smoky Black — fondo único (página y card, sin panel inventado)
  textPrimary: '#E6E6E6', // gris claro del manual — titulares
  textSecondary: '#C9C9C9', // gris claro del manual — cuerpo de texto
  textMuted: '#6D6D6D',  // Dark Silver — divisores y texto de mínimo énfasis
  gold: '#FFC804',       // dorado primario del manual
  ink: '#0F0F0F',        // texto sobre superficie dorada (botón)
};
// Escala de reemplazo tipográfica del manual: Grandis Extended → Michroma → Myriad Pro → Arial.
const FONT_DISPLAY = "'Grandis Extended',Arial,Helvetica,sans-serif";
const FONT_MONO = "'Michroma',Arial,Helvetica,sans-serif"; // reemplaza Space Mono (no es la tipografía de marca)
// brand/Polaris Star - Gold.svg (proyecto de diseño) rasterizada a PNG — Gmail NO
// renderiza SVG en <img> (ni enlazado ni como data URI), así que el logomark real
// va como PNG data URI (120x120, paleta de 8 colores, ~670 bytes) en vez de SVG.
const LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4BAMAAADLSivhAAAAGFBMVEX+xwP/yAL/2AD+xwP/vwAAAAD+xwP/yABnFok1AAAACHRSTlOfXgzRBAD+MNJ+m0wAAAIsSURBVHja7dmxSsNAGAfw7xqTTUlB1MluLlK4yefI4h4R3H2S7oLaxVHIG7h06pS2T1CcFMGgW8MRh6Qxseld8v2pEWmXdOiP5P733eXuKs6J/+nQFv8LrEIA2x6AF0OkzRGAEyQwSyK4D+DQBnC0aKvCogTA0oJwyMaKyGPjhGjYTtqJYWRosUUk28EhkWJjzzCitXiIpB0hd04zY2IfwCpLnIXtLHEWXpgS75hm7aiNUWVlibPwLI+cgb08cgYe5pEzcGR6UW4sbWkaGRqsUhyysF3IvDFeGKcTc2ARCydI2lYh88Z4ll76LOyVQq98ttPqPj5+3HGz787D2/tR5a9Exe5G9e5Pyi1Vdwd7sgZWvcFZVUbq9nDFl/E6ucYXsHp6vzJ27U13X65g9fRxWXMgjudLL86JaPpaWy79xXPez0nTaSAqPfb05bP2Y0+un1cC+xjXePjx/HK+pqsMjc+aqimSdR1W6iRdeQ5++pvDWuW5WmpVhanFRKRG6ZiMR7LhkCSiTjcdk6LLmQx208uEN+nna8jffleJ9OKysJOv5Bg4Ti8Bb9IPv9+VzQMLkQUNtDJwC5k3xn4h88Y4KGT+qwsabMkMpS0Mpa3FDrJkjg2lbV6sS2A7qJAdHR+7+tI2bgf5u9gAubNEdrFKvw/dIBb60t7gCY0w9JbpkCUADhCVRDBwEudC59sCwL4D4CAGcH/W1rG8gNJ2Aez4AI6Dto7lt/8a/SH8BVhvlbIyeyYTAAAAAElFTkSuQmCC';

// Mismo orden/ids que KEYS en las-7-llaves-test/app.js — si esas 7 llaves cambian, actualizar aquí también.
const KEY_ORDER = ['intencion', 'pasado', 'presente', 'futuro', 'camino', 'servicio', 'administracion'];

const KEY_NAMES: Record<string, string> = {
  intencion: 'La Llave de la Intención',
  pasado: 'La Llave del Pasado',
  presente: 'La Llave del Presente',
  futuro: 'La Llave del Futuro',
  camino: 'La Llave del Camino',
  servicio: 'La Llave del Servicio',
  administracion: 'La Llave de la Administración',
  valor: 'La Llave de la Intención', // id legado pre-rename (mismo score/posición) — solo para mostrar filas viejas
};

// Texto de cada llave — copiado de las-7-llaves-test/app.js (KEYS[].note).
const NOTES: Record<string, string> = {
  intencion: 'Las tres intenciones que cierran esta puerta: buscar dinero para demostrar tu valía, para quitarte el miedo, o para resolverle el camino a otro que puede resolverlo solo. Cualquiera de las tres bloquea el flujo — vale la pena ver cuál se activó en tus respuestas.',
  pasado: 'Como el elefante de circo: la cuerda que te ató de niño puede llevar años rota sin que lo hayas notado. No se trata de cambiar lo que pasó, sino de sacar el aprendizaje y soltar la emoción que quedó atada a ese recuerdo.',
  presente: 'Rico es quien sabe vivir con lo que tiene. Si el agradecimiento diario y la responsabilidad del 100% (ni el dólar, ni el gobierno, ni nadie más) todavía no son un hábito, la vida entiende que aún no estás listo para recibir más.',
  futuro: 'La oración real no es pedir, es agradecer asumiendo que el deseo ya fue otorgado. Sin un avatar claro y una acción coherente cada día, soñar en grande se queda en el pensamiento y nunca baja a la vida real.',
  camino: 'La vida siempre juega a tu favor cuando estás dispuesto a fluir con lo que se abre, sin condicionarlo. Ponerle condiciones al camino —solo querer trabajar en tu "recreo"— es una de las formas más comunes de bloquear la prosperidad.',
  servicio: 'Trabajar por la plata bloquea el dinero; trabajar para servir lo multiplica. Tu capacidad de recibir crece en la misma proporción que tu capacidad de servir al mundo — no al revés.',
  administracion: 'El orden importa más que el monto: costo de vida, deudas, pagarte a ti mismo, ahorro, ayuda y compensación, inversión, y solo al final, los gustos. Sin ese orden, ganar más no resuelve nada — solo mueve el mismo caos a una cifra más alta.',
};

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

interface RankedKey { id: string; label: string; score: number; note: string }

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Ranking por posición en key_scores (no por row.top_key) — así las filas viejas con
// el id legado 'valor' igual rankean bien: la nota/nombre sale del ORDEN, no del string guardado.
function rankKeys(row: ResponseRow): RankedKey[] {
  return KEY_ORDER
    .map((id, i) => ({ id, label: KEY_NAMES[id], score: row.key_scores[i] ?? 0, note: NOTES[id] }))
    .sort((a, b) => b.score - a.score);
}

// ── Shell visual compartido (header + footer de marca) — mismo look en el correo
// de cliente y en el interno, solo cambia el bodyHtml y el pie. ──────────────────
function emailShell(opts: { preheader: string; bodyHtml: string; footerHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<link href="https://fonts.googleapis.com/css2?family=Michroma&display=swap" rel="stylesheet">
<style>
@media (max-width:620px){ .wrap{width:100%!important;} .px{padding-left:24px!important;padding-right:24px!important;} h1{font-size:30px!important;} }
a{color:${C.gold};} a:hover{color:${C.gold};}
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
<span style="display:none;font-size:1px;color:${C.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.bg};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px;max-width:600px;background-color:${C.bg};">

<tr><td class="px" style="padding:36px 44px 0 44px;" align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td align="center" style="padding-bottom:10px;">
      <img src="${LOGO_DATA_URI}" width="26" height="26" alt="Polaris" style="display:block;margin:0 auto;">
    </td></tr>
    <tr><td align="center" style="font-family:${FONT_MONO};font-size:11px;letter-spacing:4px;color:${C.gold};text-transform:uppercase;padding-bottom:6px;">Polaris Growth Institute</td></tr>
    <tr><td align="center" style="font-family:${FONT_MONO};font-size:10px;letter-spacing:3px;color:${C.textMuted};text-transform:uppercase;padding-bottom:26px;">Las 7 Llaves de la Prosperidad</td></tr>
    <tr><td style="border-bottom:1px solid ${C.textMuted};font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
</td></tr>

${opts.bodyHtml}

<tr><td class="px" style="padding:30px 44px 36px 44px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="border-top:1px solid ${C.textMuted};padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.7;color:${C.textSecondary};" align="center">
      ${opts.footerHtml}
    </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Correo al CLIENTE — resultado personalizado ──────────────────────────────
// Implementa "Polaris - Email Resultados 7 Llaves.html" (claude.ai/design,
// proyecto 623e961e-8d3e-436a-88ad-16a3fb481ff5) con los datos reales de la fila,
// recalibrado a la paleta/tipografía del Manual de Marca POLARIS.
function renderClientResultsEmail(row: ResponseRow): { subject: string; html: string } {
  const ranked = rankKeys(row);
  const top = ranked[0];
  const firstName = row.name.trim().split(/\s+/)[0] || row.name;

  const rankingHtml = ranked.map((r, i) => {
    const pct = Math.max(0, Math.min(100, Math.round((r.score / 20) * 100)));
    const isLast = i === ranked.length - 1;
    return `
    <tr><td style="padding:14px 0 5px 0;border-top:1px solid ${C.textMuted};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-family:${FONT_DISPLAY};font-size:15px;font-weight:700;color:${C.textPrimary};">${i + 1}. ${escapeHtml(r.label)}</td>
        <td align="right" style="font-family:${FONT_MONO};font-size:12px;color:${C.gold};">${r.score}/20</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding-bottom:14px;${isLast ? `border-bottom:1px solid ${C.textMuted};` : ''}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="${pct}%" height="4" style="background-color:${C.gold};font-size:0;line-height:0;">&nbsp;</td>
        <td width="${100 - pct}%" height="4" style="background-color:${C.textMuted};font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr>`;
  }).join('');

  const bodyHtml = `
<tr><td class="px" style="padding:34px 44px 0 44px;">
  <h1 style="margin:0 0 16px 0;font-family:${FONT_DISPLAY};font-weight:700;font-size:34px;line-height:1.12;color:${C.textPrimary};letter-spacing:-0.5px;">${escapeHtml(firstName)}, este es tu<br>mapa de <em style="font-style:italic;color:${C.gold};">creencias</em>.</h1>
  <p style="margin:0 0 12px 0;font-family:${FONT_DISPLAY};font-size:15px;line-height:1.65;color:${C.textSecondary};">Respondiste 28 afirmaciones con honestidad. Este es el patrón que hoy sostiene — o limita — tu relación con la prosperidad, ordenado de mayor a menor peso limitante.</p>
</td></tr>

<tr><td class="px" style="padding:26px 44px 0 44px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.bg};border:1px solid ${C.gold};">
    <tr><td style="padding:24px 26px;">
      <p style="margin:0 0 6px 0;font-family:${FONT_MONO};font-size:10px;letter-spacing:3px;color:${C.gold};text-transform:uppercase;">Tu llave dominante</p>
      <p style="margin:0 0 10px 0;font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;line-height:1.2;color:${C.textPrimary};">${escapeHtml(top.label)} <span style="font-family:${FONT_MONO};font-size:13px;color:${C.gold};">&nbsp;${top.score}/20</span></p>
      <p style="margin:0;font-family:${FONT_DISPLAY};font-size:14px;line-height:1.65;color:${C.textSecondary};">${escapeHtml(top.note)}</p>
    </td></tr>
  </table>
</td></tr>

<tr><td class="px" style="padding:32px 44px 0 44px;">
  <p style="margin:0 0 14px 0;font-family:${FONT_MONO};font-size:10px;letter-spacing:3px;color:${C.textMuted};text-transform:uppercase;">Tus 7 llaves, de mayor a menor</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rankingHtml}</table>
</td></tr>

<tr><td class="px" style="padding:30px 44px 36px 44px;">
  <p style="margin:0;font-family:${FONT_DISPLAY};font-size:15px;line-height:1.7;color:${C.textSecondary};">Un puntaje alto no es una condena — es un mapa. Nombra dónde está el trabajo. Y el trabajo de soltarlo es el que ya conoces: presencia, orden y acción sostenida.</p>
</td></tr>`;

  const footerHtml = `
    Recibes este correo porque completaste el test «Las 7 Llaves de la Prosperidad».<br>
    Polaris Growth Institute · Basado en las 7 Llaves de Alfredo Besosa<br>
    <a href="https://polarisgrowthinstitute.com/" style="color:${C.textSecondary};text-decoration:underline;">Darme de baja</a>
  `;

  const html = emailShell({
    preheader: `Tu mapa de creencias está listo: ${top.label} es la llave que hoy más está frenando tu dinero.`,
    bodyHtml,
    footerHtml,
  });

  return { subject: `${firstName}, tu mapa de creencias — Las 7 Llaves`, html };
}

// ── Bloque interno (contacto + ranking + 28 respuestas) para el correo del dueño ──
function renderAdminSummary(row: ResponseRow): string {
  const ranked = rankKeys(row);
  const top = ranked[0];

  const scoresRows = ranked.map((r) => `
    <tr>
      <td style="padding:4px 12px 4px 0;font-family:${FONT_DISPLAY};font-size:14px;color:${C.textPrimary};">${escapeHtml(r.label)}</td>
      <td style="font-family:${FONT_MONO};font-size:12px;color:${C.gold};">${r.score}/20</td>
    </tr>`).join('');

  const answersRows = STATEMENTS.map((text, i) => {
    const val = row.raw_answers[i] ?? '';
    return `<tr><td style="padding:3px 12px 3px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.textMuted};">${escapeHtml(text)}</td><td style="text-align:center;font-family:${FONT_MONO};font-size:11px;color:${C.textPrimary};">${val}</td></tr>`;
  }).join('');

  return `
<tr><td class="px" style="padding:30px 44px 0 44px;">
  <h2 style="margin:0 0 4px 0;font-family:${FONT_DISPLAY};font-weight:700;font-size:22px;color:${C.textPrimary};">${escapeHtml(row.name)}${row.occupation ? ` — ${escapeHtml(row.occupation)}` : ''}</h2>
  <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${C.textSecondary};">
    ${escapeHtml(row.email)}${row.phone ? ` · ${escapeHtml(row.phone)}` : ''}<br>
    ${escapeHtml(new Date(row.created_at).toLocaleString('es-CO'))}
  </p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.bg};border:1px solid ${C.gold};margin-bottom:18px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 4px 0;font-family:${FONT_MONO};font-size:9px;letter-spacing:2px;color:${C.gold};text-transform:uppercase;">Llave dominante</p>
      <p style="margin:0;font-family:${FONT_DISPLAY};font-weight:700;font-size:16px;color:${C.textPrimary};">${escapeHtml(top.label)} <span style="font-family:${FONT_MONO};font-size:11px;color:${C.gold};">&nbsp;${top.score}/20</span></p>
    </td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:14px;">${scoresRows}</table>
  <details>
    <summary style="cursor:pointer;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.textSecondary};">Ver las 28 respuestas</summary>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-top:10px;">${answersRows}</table>
  </details>
</td></tr>`;
}

async function sendEmail(subject: string, html: string, to: string = NOTIFY_TO): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'Falta RESEND_API_KEY' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
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

  // body.to: override manual, solo para pruebas puntuales (curl) — el webhook real
  // nunca lo envía. Si viene, redirige AMBOS correos (admin y cliente) ahí.
  let body: { type?: string; record?: ResponseRow; digest?: boolean; to?: string };
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
      const divider = `<tr><td class="px" style="padding:0 44px;"><div style="border-top:1px solid ${C.textMuted};margin:6px 0 0 0;"></div></td></tr>`;
      const bodyHtml = `
<tr><td class="px" style="padding:30px 44px 0 44px;">
  <h1 style="margin:0;font-family:${FONT_DISPLAY};font-weight:700;font-size:28px;color:${C.textPrimary};">Digest — ${rows.length} respuestas</h1>
</td></tr>` + rows.map(renderAdminSummary).join(divider);
      const html = emailShell({
        preheader: `Las 7 Llaves — digest interno de ${rows.length} respuestas`,
        bodyHtml,
        footerHtml: 'Notificación interna · Polaris Growth Institute',
      });
      const sent = await sendEmail(`Las 7 Llaves — Digest (${rows.length} respuestas)`, html, body.to || NOTIFY_TO);
      if (!sent.ok) return json({ error: sent.error }, 502);
      return json({ ok: true, count: rows.length });
    }

    if (!body.record) return json({ error: 'record es requerido' }, 400);
    const row = body.record;
    const top = rankKeys(row)[0];

    // 1) Notificación interna — siempre al dueño (o al override de prueba).
    const adminHtml = emailShell({
      preheader: `Nueva respuesta de ${row.name} — llave dominante: ${top.label}`,
      bodyHtml: renderAdminSummary(row),
      footerHtml: 'Notificación interna · Polaris Growth Institute',
    });
    const adminSent = await sendEmail(`Nueva respuesta 7 Llaves — ${row.name} (${top.label})`, adminHtml, body.to || NOTIFY_TO);

    // 2) Resultado personalizado al cliente — a su propio correo, salvo que
    // sea una prueba manual (`to` en el body), donde va al mismo destino que
    // el admin para no escribirle nunca a un cliente real por accidente.
    const clientTo = body.to || row.email;
    let clientSent: { ok: boolean; error?: string };
    if (validEmail(clientTo)) {
      const { subject, html } = renderClientResultsEmail(row);
      clientSent = await sendEmail(subject, html, clientTo);
    } else {
      clientSent = { ok: false, error: `email de cliente inválido: ${row.email}` };
    }

    if (!adminSent.ok) return json({ error: adminSent.error, client: clientSent }, 502);
    return json({ ok: true, client: clientSent });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[notify-7-llaves]', msg);
    return json({ error: msg }, 500);
  }
});
