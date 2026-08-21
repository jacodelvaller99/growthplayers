/**
 * clickup-onboarding — Supabase Edge Function
 *
 * Crea el perfil del cliente automáticamente cuando ClickUp firma el acuerdo
 * de servicio. Disparador: una Automatización de ClickUp (lista "Polaris",
 * Servicio → CLIENTES POLARIS, list_id 901111940968) que, cuando el campo
 * custom "Status del contrato" pasa a "Firmado", hace POST a esta URL.
 *
 * SEGURIDAD: no verifica JWT (ClickUp no manda uno — se despliega con
 * --no-verify-jwt, mismo patrón que notify-7-llaves). El gate es un secret
 * compartido en el header `x-clickup-secret`, comparado en TIEMPO CONSTANTE
 * (clonado de wearable-aggregator/index.ts::timingSafeEqual). Fail-closed:
 * sin CLICKUP_WEBHOOK_SECRET configurado, o secret incorrecto, 401 y no se
 * toca ninguna tabla.
 *
 * Body esperado (nombres nuestros — el dueño arma este JSON en la
 * automatización de ClickUp con variables de sus propios custom fields):
 *   { task_id, name, email, phone?, start_date?, purchase_date? }
 *
 * Idempotencia (dos capas, no confundir):
 *   1. REENTREGA — ClickUp reintenta el MISMO webhook (timeout). Dedup por
 *      sha256(body) en clickup_webhook_events.event_id (UNIQUE). Mismo
 *      patrón que wearable_webhook_events.
 *   2. NEGOCIO — el mismo task_id vuelve a disparar "Firmado" en OTRO
 *      momento (alguien edita el campo por error y lo repone), con un body
 *      DISTINTO que (1) no atrapa. Dedup por profiles.clickup_task_id
 *      (UNIQUE) — chequeado ANTES de crear el auth user. Si ya existe,
 *      responde 200 {ok:true, alreadyProcessed:true} — no es un error.
 *
 * Probado en vivo contra producción (2026-08-21): auth.admin.createUser() SÍ
 * dispara un trigger que inserta la fila en profiles automáticamente — el
 * comentario de create-user/index.ts ("0 filas en pg_trigger") no reflejaba
 * el estado real. profiles se escribe con UPSERT (no INSERT plano) por eso.
 * user_profiles no tiene trigger — sigue siendo INSERT explícito ahí.
 *
 * Tier: siempre 'premium' fijo (decisión de negocio — el campo 🌟 Programa de
 * ClickUp no se mapea). Replica el branch 'premium' de la RPC
 * admin_set_user_role (20260624000000_user_roles_panel.sql) en vez de
 * llamarla: esa RPC valida al llamante vía auth.uid(), y una edge function
 * con service-role no tiene auth.uid() (sería NULL) → la RPC rechazaría con
 * "Requiere acceso de administrador". Se replican las mismas escrituras
 * (profiles.subscription_tier, user_profiles.subscription_tier,
 * user_memberships) directamente con adminSupabase — bypassa RLS y el
 * trigger anti-escalación (que solo bloquea current_user='authenticated'; el
 * service_role no lo es).
 */
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

const CLICKUP_WEBHOOK_SECRET = Deno.env.get('CLICKUP_WEBHOOK_SECRET') ?? '';

// ─── Comparación en tiempo constante (clonado de wearable-aggregator/index.ts) ─
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** ClickUp puede mandar fechas en formatos no confirmados (epoch ms como
 * string, ISO, etc.). Si no parsea, se ignora — son campos decorativos, no
 * deben romper la creación del usuario por un formato inesperado. */
function toDateOnly(v: string | null): string | null {
  if (!v) return null;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

interface Body {
  task_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  start_date?: string;
  purchase_date?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── 1. Secret compartido, fail-closed, tiempo constante ──────────────────────
  const provided = req.headers.get('x-clickup-secret') ?? '';
  if (!CLICKUP_WEBHOOK_SECRET || !timingSafeEqual(provided, CLICKUP_WEBHOOK_SECRET)) {
    console.error('[clickup-onboarding] secret ausente o inválido — rechazado.');
    return json({ error: 'Unauthorized' }, 401);
  }

  const rawBody = await req.text();
  let body: Body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('[clickup-onboarding] body no es JSON válido.');
    return json({ error: 'Bad request — body no es JSON válido' }, 400);
  }

  const taskId = String(body.task_id ?? '').trim();
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = String(body.phone ?? '').trim() || null;
  const startDate = toDateOnly(String(body.start_date ?? '').trim() || null);
  const purchaseDate = String(body.purchase_date ?? '').trim() || null;

  // ── Validación — falla honesta: nada se crea, 4xx explicable en los logs ─────
  if (!taskId) {
    console.error('[clickup-onboarding] falta task_id en el body — revisa la automatización de ClickUp.');
    return json({ error: 'task_id es requerido' }, 400);
  }
  if (!name) {
    console.error(`[clickup-onboarding] task ${taskId}: falta name.`);
    return json({ error: 'name es requerido' }, 400);
  }
  if (!email || !validEmail(email)) {
    // Caso esperado: el campo Email de ClickUp NO es obligatorio — tareas
    // viejas pueden no tenerlo. No es un bug del código, es un dato faltante.
    console.error(`[clickup-onboarding] task ${taskId} (${name}): email vacío o inválido ("${email}") — no se crea nada.`);
    return json({
      error: `email vacío o inválido para la tarea ${taskId} (${name}). Complétalo en ClickUp y vuelve a poner "Status del contrato" en Firmado.`,
    }, 400);
  }

  // ── Dedup de REENTREGA (mismo body, reintento por timeout) ────────────────────
  const eventId = await sha256Hex(rawBody);
  const { data: inserted } = await adminSupabase.from('clickup_webhook_events').upsert(
    { event_id: eventId, task_id: taskId, payload: body, processed: false },
    { onConflict: 'event_id', ignoreDuplicates: true },
  ).select('id');
  if (!inserted || inserted.length === 0) {
    console.log(`[clickup-onboarding] task ${taskId}: reentrega idéntica ya vista — no-op.`);
    return json({ ok: true, deduped: true });
  }

  try {
    // ── Dedup de NEGOCIO — ¿este task_id ya creó un usuario? ────────────────────
    const { data: already } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('clickup_task_id', taskId)
      .maybeSingle();
    if (already?.id) {
      console.log(`[clickup-onboarding] task ${taskId}: ya procesada → userId ${already.id} (no-op, 200).`);
      await adminSupabase.from('clickup_webhook_events')
        .update({ processed: true, user_id: already.id }).eq('event_id', eventId);
      return json({ ok: true, alreadyProcessed: true, userId: already.id });
    }

    // ── Crear el usuario auth (o engancharse a uno existente por email) ─────────
    let userId: string;
    let attached = false;
    const password = crypto.randomUUID(); // el cliente lo fija con "¿Olvidaste tu contraseña?"
    const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createErr || !created?.user) {
      const msg = (createErr?.message ?? '').toLowerCase();
      const emailTaken = msg.includes('already been registered') || msg.includes('already exists') || msg.includes('email_exists');
      if (!emailTaken) throw new Error(createErr?.message ?? 'No se pudo crear el usuario');

      // ponytail: el email ya tiene cuenta (la app o un admin la creó antes de
      // que ClickUp firmara) — enganchamos el task_id en vez de fallar. Se
      // resuelve por user_profiles.email (no hay "get user by email" directo
      // en el admin API); si el cliente usa un email distinto en la app que
      // en ClickUp esto no lo detecta y hay que revisarlo a mano en /admin/usuarios.
      const { data: existing } = await adminSupabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', email)
        .maybeSingle();
      if (!existing?.user_id) {
        throw new Error(`${createErr?.message ?? 'email ya registrado'} — y no se encontró user_profiles.email=${email} para enganchar el task_id. Revisar a mano.`);
      }
      userId = existing.user_id;
      attached = true;
      console.warn(`[clickup-onboarding] task ${taskId}: email ${email} ya existía (userId ${userId}) — enganchando en vez de crear.`);
    } else {
      userId = created.user.id;
    }

    // ── profiles + user_profiles ─────────────────────────────────────────────────
    if (!attached) {
      // Probado en vivo (task claude-test-001): auth.admin.createUser() SÍ
      // dispara un trigger que ya inserta la fila en profiles (contradice el
      // comentario original de create-user/index.ts, que decía "0 filas en
      // pg_trigger" — falso, al menos hoy). INSERT plano chocaba con
      // profiles_pkey. UPSERT es correcto en ambos mundos: si el trigger ya
      // corrió, sobreescribe sus defaults con los valores reales; si algún día
      // el trigger deja de existir, sigue insertando igual.
      const { error: profErr } = await adminSupabase.from('profiles').upsert({
        id: userId,
        name,
        role: 'member',
        onboarding_completed: false,
        active_module_id: 'guerrero-mentalidad',
        subscription_tier: 'premium',
        clickup_task_id: taskId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profErr) throw new Error(`profiles upsert: ${profErr.message}`);

      const { error: upErr } = await adminSupabase.from('user_profiles').insert({
        user_id: userId,
        name,
        email,
        phone,
        protocol_start_date: startDate,
        subscription_tier: 'premium',
      });
      if (upErr) throw new Error(`user_profiles insert: ${upErr.message}`);
    } else {
      // Cuenta preexistente: UPDATE primero (nunca toca created_at). Si no
      // matchea ninguna fila (create-user no la creó, o la sembró un flujo
      // sin fila en profiles), cae a INSERT.
      const { error: updErr, count } = await adminSupabase.from('profiles')
        .update({ subscription_tier: 'premium', clickup_task_id: taskId, updated_at: new Date().toISOString() }, { count: 'exact' })
        .eq('id', userId);
      if (updErr) throw new Error(`profiles update: ${updErr.message}`);
      if (!count) {
        const { error: insErr } = await adminSupabase.from('profiles').insert({
          id: userId, name, role: 'member', onboarding_completed: false, active_module_id: 'guerrero-mentalidad',
          subscription_tier: 'premium', clickup_task_id: taskId,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (insErr) throw new Error(`profiles insert (fallback): ${insErr.message}`);
      }

      // user_profiles: solo el tier — NO pisamos name/email/phone de una
      // cuenta que ya existía y puede tener esos campos editados por el
      // cliente en la app.
      const { error: upErr } = await adminSupabase.from('user_profiles')
        .update({ subscription_tier: 'premium', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (upErr) throw new Error(`user_profiles update: ${upErr.message}`);
    }

    // ── Activar membresía premium — replica el branch 'premium' de
    // admin_set_user_role (20260624000000_user_roles_panel.sql), ver header ────
    await adminSupabase.from('user_memberships')
      .update({ status: 'superseded' })
      .eq('user_id', userId).eq('status', 'active');
    const { error: memErr } = await adminSupabase.from('user_memberships').insert({
      user_id: userId,
      product: 'premium',
      status: 'active',
      activated_by: 'clickup_onboarding',
      activated_at: new Date().toISOString(),
      notes: `ClickUp task ${taskId}${purchaseDate ? ` · compra: ${purchaseDate}` : ''}`,
    });
    if (memErr) throw new Error(`user_memberships insert: ${memErr.message}`);

    await adminSupabase.from('clickup_webhook_events')
      .update({ processed: true, user_id: userId }).eq('event_id', eventId);

    console.log(`[clickup-onboarding] task ${taskId}: ${attached ? 'enganchado a' : 'creado'} userId ${userId} (${email}).`);
    return json({ ok: true, userId, attached });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[clickup-onboarding] task ${taskId}:`, msg);
    await adminSupabase.from('clickup_webhook_events')
      .update({ process_error: msg }).eq('event_id', eventId);
    return json({ error: msg }, 500);
  }
});
