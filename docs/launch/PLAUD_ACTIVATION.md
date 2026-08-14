# Activación de la importación automática de Plaud

> **Quién:** el dueño (Nicolás). **Tiempo:** ~15 min.
>
> El código está completo y testeado. Lo único que falta para que las
> grabaciones fluyan solas es un login de Plaud (una vez) y tres pasos de
> dashboard. Mientras tanto, el botón "Sincronizar ahora" en Admin → Plaud
> responde con error honesto de configuración, no con silencio.

## Qué hace (contexto de 30 segundos)

Grabas la mentoría con tu Plaud **nombrándola con el nombre del cliente tal
como está en Polaris** ("Juan Pérez — sesión semana 3"). Cada hora, la edge
function `plaud-sync` baja lo nuevo, lo matchea por nombre y corre el mismo
pipeline que una sesión manual: resumen IA + compromisos → `mentorship_sessions`
y `memory_summaries` (badge "LLAMADA" en la timeline del cliente Y del dossier
admin; Norman lo lee en su memoria). Lo que no matchea (nombre ambiguo o sin
cliente) cae a la **cola de revisión** en `Admin → Plaud` para asignarlo con un
clic. El transcript crudo queda **solo-admin** (`plaud_imports`); el cliente ve
resumen + plan de acción, nunca el crudo.

## Pasos exactos

### 1. Obtener el refresh token de Plaud (una vez)

En tu PC:

```bash
npm install -g @plaud-ai/cli
```

```bash
plaud login
```

(abre el navegador, inicia sesión con tu cuenta Plaud). Luego abre el archivo
`C:\Users\<tu-usuario>\.plaud\tokens.json` y copia el valor de
**`refresh_token`**.

### 2. Secret en Supabase

Dashboard → **Edge Functions → Secrets**:

```
PLAUD_REFRESH_TOKEN = <el refresh_token del paso 1>
```

Solo siembra la primera vez: Plaud puede rotar el token en cada uso, así que el
token vivo se guarda en la tabla `plaud_tokens` (solo service role puede leerla).

### 3. Migración + deploy

- SQL Editor → correr `supabase/migrations/20260812000000_plaud_sync.sql`.
  - La sección del cron requiere los secretos de Vault `project_url` y
    `service_role_key` ya creados (mismo prerequisito documentado en
    `20260731000000_cron_reconciliation.sql`). Si no existen, créalos primero.
- `supabase functions deploy plaud-sync`

### 4. Prerequisito de IA

El resumen corre vía `ai-proxy` con las claves del servidor. Si `ANTHROPIC_API_KEY`
(o Groq/OpenAI) aún no están como secrets, los imports quedarán en `error:
"IA no disponible"` — es el mismo handoff #22 que bloquea a Norman real.

## Verificar que quedó vivo

1. Graba (o renombra) una grabación de prueba en Plaud con el nombre exacto de
   un cliente de prueba.
2. `Admin → Plaud → SINCRONIZAR AHORA`. Debe reportar "1 importada" (o "1 en
   cola" si el nombre no matcheó — asígnala ahí mismo).
3. Revisa: dossier del cliente → timeline con badge **LLAMADA**; y
   `perfil/cliente` del usuario → el resumen y los compromisos aparecen.
4. Idempotencia: pulsa "Sincronizar ahora" otra vez → "0 importadas" (el
   `plaud_file_id` único y el índice de dedupe de `memory_summaries` lo
   garantizan).

## Convención de nombres (lo único que cambia tu hábito)

- ✅ "Juan Pérez — sesión semana 3" · "Mentoría María José Núñez"
- ⚠️ "Juan — sesión" (solo primer nombre) → cola de revisión (a propósito: con
  dos Juanes sería adivinar).
- Acentos/mayúsculas no importan ("juan perez" matchea "Juan Pérez").
