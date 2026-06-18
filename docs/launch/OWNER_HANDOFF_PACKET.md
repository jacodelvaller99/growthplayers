# OWNER HANDOFF PACKET — de PRODUCTION CANDIDATE a SHIPPED

> 2026-06-16. Todo el código está listo y validado (`tsc 0 · lint 0 · 134 tests · export web OK`).
> Lo que falta para salir **no es código** — son 5 handoffs que dependen de tus datos/cuentas.
> Cada uno trae el dato/comando/URI **exacto** + cómo verificar que quedó cerrado.

---

## 1) LEGAL — único bloqueante de WEB SHIP
Los placeholders se renderizan **visibles en producción hoy** (verificado en `/legal/privacidad` y
`/legal/salud`). Apple/Google rechazan con entidad legal o recursos de crisis en placeholder.

**Datos a entregar (formato exacto):**
```
Razón social legal:
NIT / tax ID:
Email legal (privacidad + legal):
Email de soporte:
Dirección legal completa:
Ciudad:
País:
Jurisdicción aplicable (ley + tribunales):
Fecha efectiva de Términos / "Última actualización":
Periodo de retención de datos (p. ej. "hasta 30 días tras baja"):
¿Usan arbitraje? (sí/no; si sí: institución arbitral + sede + idioma):
Recursos de crisis aprobados (texto literal, p. ej. línea local de salud mental + emergencias):
Nombre comercial visible en la app:
```
**Dónde van (lo relleno yo en cuanto los pases):**
- `app/legal/privacidad.tsx` — `[RAZÓN SOCIAL]`, `[EMAIL LEGAL]`, `[DIRECCIÓN]`/`[DIRECCIÓN FISCAL]`,
  `[FECHA]`, `[PAÍS / JURISDICCIÓN del usuario]`, `[DEFINIR, p. ej. hasta 30 días]`.
- `app/legal/terminos.tsx` — `[RAZÓN SOCIAL]` (×5), `[EMAIL LEGAL]`, `[DIRECCIÓN]`/`[DIRECCIÓN FISCAL]`,
  `[JURISDICCIÓN / PAÍS]`, `[CIUDAD, PAÍS]`, `[INSTITUCIÓN ARBITRAL]`, `[SEDE]`, `[FECHA]`.
- `app/legal/salud.tsx` — `[RAZÓN SOCIAL]`, `[EMAIL LEGAL]`, `[FECHA]`, **`[COMPLETAR recursos de crisis]`**
  (Apple 1.4.1 — bloqueante duro).
**Verificación de cierre:** `grep -rn "\[" app/legal/*.tsx` → 0 placeholders; smoke en `/legal/*` sin corchetes.

---

## 2) NATIVE RELEASE — EAS
`app.json` está correcto salvo `extra.eas.projectId` = `00000000-…` (placeholder). El resto verificado:
bundleId `com.polarisgrowthinstitute.lifeflow`, buildNumber `1`, versionCode `1`, permiso de micrófono
(iOS infoPlist + Android RECORD_AUDIO), runtimeVersion `appVersion`.

**Comando exacto (requiere tu login Expo — el CLI está instalado pero NO logueado):**
```
eas login                       # con la cuenta Expo del proyecto
eas init --id <o sin id para crear>   # escribe el projectId real en app.json
eas build --profile preview --platform ios       # smoke build
eas build --profile production --platform all     # build de tienda
```
**Datos a entregar:** `Cuenta Expo/EAS correcta:` · `Project ID de Expo (si ya existe):`
**Verificación:** `app.json` con UUID real (no ceros) + `eas build` arranca sin error de credenciales.

---

## 3) AI-PROXY / SECRETS — sacar claves IA del bundle
La función `ai-proxy` está desplegada pero **inactiva**: el cliente sigue usando claves `EXPO_PUBLIC_*`
en el bundle web (extraíbles). Activación (orden importa para no tumbar a Norman):
```
# a) Supabase dashboard → Edge Functions → Secrets:
ANTHROPIC_API_KEY=...   NVIDIA_API_KEY=...   GROQ_API_KEY=...   OPENAI_API_KEY=...
# b) Vercel → env:
EXPO_PUBLIC_AI_PROXY_URL=https://bizbbtiyftfjufxinwsu.supabase.co/functions/v1/ai-proxy
# c) Redeploy Vercel → verificar que el chat de Norman responde vía proxy
# d) SOLO entonces: rotar las claves viejas y quitar EXPO_PUBLIC_*_API_KEY del build
```
**Datos a entregar:** `Secrets disponibles para ai-proxy:` (cuáles claves tienes).
**Verificación:** chat de Norman funciona con `EXPO_PUBLIC_AI_PROXY_URL` puesto y las `*_API_KEY` quitadas.

---

## 4) GDPR / DELETE-ACCOUNT — deploy
El código cubre **todas** las tablas PII (Memory/Execution/Biometric/mentoría/DM/bloqueos). **No hay
exposición viva** ahora mismo: las tablas tienen `ON DELETE CASCADE` y la función desplegada ya ejecuta
`auth.admin.deleteUser`. El redeploy hace explícita la robustez:
```
# (CLI de Supabase no está instalado en el entorno del agente)
supabase login
supabase link --project-ref bizbbtiyftfjufxinwsu
supabase functions deploy delete-account
```
**Verificación:** borrar una cuenta de prueba → `select count(*) from biometric_insights where user_id='<id>'`
→ 0 (y en mentor_tasks, memory_summaries, etc.).

---

## 5) WEARABLE OAUTH — registrar URIs (las rutas de callback YA existen en la app)
`app/oauth/oura/callback.tsx` y `app/oauth/whoop/callback.tsx` existen. Falta registrar los redirect URIs
en cada consola de desarrollador. **URIs exactos a registrar:**
- **Oura** (cloud.ouraring.com → tu app):
  - `https://growthplayers.vercel.app/oauth/oura/callback`  (web)
  - `polaris://oauth/oura/callback`  (nativo)
- **WHOOP** (developer.whoop.com → tu app):
  - `https://growthplayers.vercel.app/oauth/whoop/callback`  (web)
  - `polaris://oauth/whoop/callback`  (nativo)
**Datos a entregar:** `EXPO_PUBLIC_OURA_CLIENT_ID` / `EXPO_PUBLIC_WHOOP_CLIENT_ID` (van a Vercel/EAS env).
**Verificación:** conectar Oura/WHOOP desde `Perfil → Wearables` completa el OAuth sin "redirect_uri mismatch".

---

## Resumen de estado
| Área | Código | Bloqueo | Dueño |
|---|---|---|---|
| Legal | ✅ listo (estructura) | datos de entidad + crisis | **tú** → yo relleno |
| EAS native | ✅ config ok salvo projectId | `eas login` + `eas init` | **tú** |
| ai-proxy | ✅ desplegado | secrets + env + rotación | **tú** |
| delete-account | ✅ código completo | `supabase functions deploy` | **tú** (cascada ya protege) |
| Wearable OAuth | ✅ rutas existen | registrar URIs + client IDs | **tú** |
| Wearables nativos (HealthKit + Health Connect) | ✅ código + permisos + tests | `eas init` + aplicar migración `20260618000000_wearables_native_providers.sql` + `eas build --profile preview --platform all` + justificar HealthKit en App Store review (coaching, NO clinical) | **tú** |

**Camino a SHIPPED:** entrega los datos legales → relleno `app/legal/*` → push → **WEB SHIPPED**.
En paralelo: `eas login`+`init` → **NATIVE READY FOR SUBMISSION** (tras assets de tienda + cuentas dev).
