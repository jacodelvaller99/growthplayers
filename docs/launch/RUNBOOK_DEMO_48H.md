# RUNBOOK — Demo 48h (Operación WOW) · Pasos del dueño

> **Para: Capuozzo. Tiempo total: ~40 min. Estos 5 pasos son BLOQUEANTES para la demo — nadie más puede hacerlos (claves, SQL Editor y merge a main son tuyos por regla de seguridad).**
>
> Hazlos en orden. Cuando termines el paso 5, avísame y corro el diagnóstico completo de prod (Fase 0).

---

## Paso 1 — Claves de Norman en Supabase (~10 min)

La función `ai-proxy` ya está desplegada; solo le faltan las claves (secrets del servidor, jamás en el cliente).

1. Abre **supabase.com/dashboard** → proyecto `bizbbtiyftfjufxinwsu` → **Edge Functions** → **Manage secrets** (o Settings → Edge Functions → Secrets).
2. Añade:

| Secret | Valor | Obligatorio |
|---|---|---|
| `ANTHROPIC_API_KEY` | tu clave de console.anthropic.com | **SÍ — es el Norman primario (Claude)** |
| `OPENAI_API_KEY` | tu clave de OpenAI | Recomendado (fallback + Whisper para transcripción de mentorías) |
| `NVIDIA_API_KEY` | tu clave NVIDIA NIM | Opcional (fallback 2) |
| `GROQ_API_KEY` | tu clave Groq | Opcional (fallback 3) |

No hace falta redeploy de la función — los secrets se leen en runtime.

## Paso 2 — Env vars en Vercel (~5 min)

Vercel → proyecto **growthplayers** → **Settings → Environment Variables** (scope: Production; añade Preview si quieres probar antes del merge):

| Variable | Valor |
|---|---|
| `EXPO_PUBLIC_AI_PROXY_URL` | `https://bizbbtiyftfjufxinwsu.supabase.co/functions/v1/ai-proxy` |
| `EXPO_PUBLIC_CONFRONTATION_OS_ENABLED` | `true` |

⚠️ La segunda es el interruptor del momento WOW ("Norman te confronta con el dato del wearable"). Sin ella, Norman nunca confronta — el flag está default false en código.

⚠️ Estas variables se **inlinen en build** → no surten efecto hasta el redeploy del paso 4.

## Paso 3 — Migraciones SQL pendientes (~10 min)

Supabase → **SQL Editor** → pega y corre el contenido de estos archivos del repo (`supabase/migrations/`), **en este orden**:

1. `20260625000000_admin_update_user_profile.sql` ← sin esta, "guardar perfil" del admin falla en vivo
2. `20260625000000_wearable_daily_merge.sql`
3. `20260626000000_admin_sync_tier.sql` ← sin esta, el cambio de tier del admin no sincroniza
4. `20260626000000_web_leads.sql`
5. `20260701000000_dm_reactions.sql`

Si alguna ya la corriste antes, sáltala (si te da error de "already exists", es señal de que ya estaba — sigue con la siguiente).

## Paso 4 — Merge a main (~5 min)

`launch-hardening-p0` está **54 commits adelante** de `main` — prod HOY no tiene el pulido de las 52 iteraciones.

- GitHub → repo `growthplayers` → **New Pull Request**: base `main` ← compare `launch-hardening-p0` → **Merge**.
- Vercel redeploya prod automáticamente (~3 min). Este deploy también activa los env vars del paso 2.

## Paso 5 — Verificación conjunta (~10 min)

Cuando Vercel diga "Ready":

1. Abre `growthplayers.vercel.app` → login → **Mentor** → escribe "hola Norman".
   - ✅ Responde fluido en tono Norman → Claude está vivo.
   - ❌ Aparece un aviso de simulación/dev → el paso 1 o 2 falló; revisa el nombre exacto de la variable.
2. Admin → **Usuarios** → abre cualquier usuario → edita el nombre → **Guardar**.
   - ✅ Guarda sin error → migraciones OK.
3. Avísame ("listo el runbook") → arranco la Fase 0 (diagnóstico completo del golden path en prod) y la Fase 2 (cuenta demo + datos).

---

## Qué sigue después de esto (mío, no tuyo)

- Fase 0: diagnóstico de prod (golden path, ambos temas, móvil + desktop).
- Fase 2: cuenta demo "protagonista" con narrativa burnout→recuperación (te pediré 2 cosas puntuales: correr el onboarding de la cuenta demo marcando el 4to checkbox de consentimiento, y 2–3 chats con Norman con compromisos explícitos).
- Fase 3: pulido de `/admin/biometria` (la consola de seed) + fixes de lo que encuentre.
- Fase 4: te entrego el **guion de demo de 1 página** (2 actos, 10 min, momentos WOW marcados, plan B por pantalla).
- Fase 5: ensayo cronometrado juntos + congelamos pushes 3h antes.
