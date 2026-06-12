# EXECUTION_LOG — Hardening pass 2026-06-12

Registro operacional del pase de auditoría crítica + ejecución (repo como fuente de verdad,
CLAUDE.md auditado con escepticismo). Cada batch validado antes de avanzar.

## B0 — Línea base (honesta)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm test` | ❌ **"No tests found", exit 1** — la suite documentada en CLAUDE.md no existía en la rama |
| `npm run lint` | ❌ **14 errores** (6 × `react-hooks/rules-of-hooks` en `components/polaris.tsx` + 8 × comillas sin escapar) + 90 warnings |

Auditoría previa (2 Explore agents + verificación manual): 9/10 P0 del veredicto 2026-06-02
estaban FIXED en repo pero los docs decían RED; un 3er agente auditó un directorio equivocado
y fue **descartado** (sus hallazgos contradecían el árbol real verificado).

## B1 — Tests reales + typecheck + CI + lint errors

- `__tests__/unit/` creado: **53 tests, 6 suites** — utils (protocolDay/sovereignScore),
  mentorship (weekDateRange/currentWeekNumber/weekStatus), themeColors (paridad dark/light +
  `cv()`), moderation (filtro UGC + negativos de word-boundary), mentor (cadena de fallback
  NVIDIA→Groq→OpenAI, corte por abort, contrato REGLA DE HONESTIDAD + SEGURIDAD), sse
  (parseSSEStream real: chunks partidos, malformados, abort parcial).
- `package.json`: script `typecheck`. `.github/workflows/ci.yml`: lint + typecheck + test + export web.
- `WeeklySparkline` partido en dispatcher + `SparklineWebBars`/`SparklineNativeSkia` (hooks
  incondicionales — eran 6 violaciones reales de rules-of-hooks). 8 comillas → tipográficas.
- **Validación: lint 0 errores · tsc 0 · 53/53 tests.**

## B2 — Route guards (`Stack.Protected`)

- `app/_layout.tsx` MainStack: ~37 rutas privadas dentro de `<Stack.Protected guard={!isLoaded
  || (isAuthenticated && onboardingCompleted)}>`; públicas: index, (auth), (onboarding),
  legal/*, pricing, oauth callbacks. `perfil/index` registrado (antes auto-registrado fuera
  del guard). NO se crearon _layouts por grupo (rompían los registros planos).
- **Validación: tsc 0 · export web OK · E2E prod: deep link `/bienestar/sueno` sin sesión →
  `/welcome`; con sesión → renderiza; sin loops** (sesión del usuario restaurada tras la prueba).

## B3 — OAuth + crash capture + honestidad UX

- `lib/wearables.ts:23`: REDIRECT_BASE por plataforma — nativo `polaris://oauth` (matchea
  `wearables.tsx:434` ya corregido). ⚠ Handoff: registrar URIs en consolas Oura/WHOOP.
- `lib/crash.ts` nuevo: captura global (web `error`/`unhandledrejection`; nativo `ErrorUtils`)
  → `analytics.track('app_crash')`, idempotente; init en RootLayout.
- `saveCheckIn` → `'synced' | 'queued' | 'local'`; `checkin.tsx` muestra toast honesto si quedó
  encolado offline. `useUserIntelligence`: try/catch + `hasError`, `isLoading` nunca colgado.
  `mentor.tsx`: timeout (45s) distinguido de cancelación → toast visible. `comando.tsx`: lane
  "EMPIEZA AQUÍ · Tu primera lección" para usuarios day-zero.
- **Validación: tsc 0 · lint 0 errores · 53/53.**

## B4 — ai-proxy (gobernanza IA, transicional)

- `supabase/functions/ai-proxy/index.ts`: JWT obligatorio; `/chat` passthrough SSE (mapa de
  modelos idéntico al cliente: deepseek-v4-pro / llama-3.3-70b-versatile / gpt-4o-mini; límite
  64KB) y `/transcribe` (Whisper). Claves desde secrets del servidor.
- Cliente: `EXPO_PUBLIC_AI_PROXY_URL` (env.ts + .env.example), `lib/aiProxy.ts`, branch proxy
  con fallback al camino directo en `nvidia/groq/openai/transcription`, gates de `mentor.ts`
  ampliados (NVIDIA disponible en web vía proxy). Sin la var: comportamiento idéntico al actual.
- **Validación: tsc 0 · lint 0 errores · 53/53 · export web OK.**

## B5 — Deploys a producción

- **Git:** `f8a0b01` (docs CLAUDE.md) + `e198e6b` (hardening) → push a `main` → Vercel **Ready**
  (bundle nuevo verificado por marcador "EMPIEZA AQUÍ" en el JS de prod; headers CSP/HSTS vivos).
- **Edge Functions vía editor del dashboard** (no requiere CLI): el editor resultó multi-archivo
  (resuelve `../_shared/supabase.ts`) — se pegó el código del repo **verbatim** con verificación
  byte-exacta del modelo Monaco antes de cada deploy:
  - `generate-embeddings` (6480 chars) — "a month ago" → "a few seconds ago"
  - `smart-notifications` (14200) · `sync-wearables` (21511) · `delete-account` (4754, purga 33 tablas)
  - `ai-proxy` **creada** (bundle single-file con `_shared` inlined, 7458 chars; consts renombradas para evitar colisión)
- **Verificación:** `curl POST` sin auth a generate-embeddings / ai-proxy/chat / delete-account
  → **401** los tres. Prod app: carga, sesión, guard E2E ambos caminos.
- Hallazgo clave: las 6 funciones en prod databan de "a month ago" — **ninguno de los fixes de
  seguridad del 2026-06-02 había llegado a prod** hasta este deploy.

## B6 — Documentación de verdad

- Addenda fechados (2026-06-12) en `docs/launch/00_EXECUTIVE_LAUNCH_VERDICT.md` y
  `KNOWN_ISSUES_REGISTER.md` (sin reescribir la historia).
- CLAUDE.md corregido: auth guards reales (3 capas), sección de tests real, modelo NVIDIA real
  (deepseek-v4-pro — el doc decía llama-3.3-70b), bloqueo de eas projectId, OWNER_IDS fallback,
  handoff OAuth, estado del ai-proxy.
- `docs/investor/00-07` + `INVESTOR_READY_CHANGELOG.md` creados.

## Handoffs abiertos (requieren credenciales/acciones del dueño)

1. **Activar ai-proxy:** Dashboard → Edge Functions → Secrets: `NVIDIA_API_KEY`, `GROQ_API_KEY`,
   `OPENAI_API_KEY` (por política, el agente no introduce claves). Luego en Vercel:
   `EXPO_PUBLIC_AI_PROXY_URL=https://<ref>.supabase.co/functions/v1/ai-proxy` → redeploy →
   **rotar** las claves antiguas y retirar `EXPO_PUBLIC_*_API_KEY` del build.
2. **`eas init`** → projectId real (app.json) + credenciales iOS/Android. Bloquea builds nativos.
3. **Oura/WHOOP consoles:** registrar `polaris://oauth/<provider>/callback` (nativo).
4. **Cron service-role:** configurar `app.service_role_key` (Vault/db config) para los cron jobs.
5. **`npm i expo-av --legacy-peer-deps`** para grabación nativa de mentoría + buckets Storage
   `mentorship-audio` / `nutrition-plans`.
6. **Outbox client-id** para inserts no-idempotentes (mensajes/wellness) — diseño en backlog #21.
7. Confirmar el primer run de CI en GitHub (gh CLI sin auth local).

## Supuestos documentados

- El editor del dashboard empaqueta `index.ts` + el `_shared` ya presente en las funciones
  existentes; para `ai-proxy` (nueva) se usó bundle autocontenido — la fuente de verdad sigue
  siendo `supabase/functions/ai-proxy/index.ts` del repo (re-deploys por CLI usarán esa).
- Tras la prueba E2E del guard se restauró la sesión del navegador del usuario (token guardado
  y devuelto en localStorage del mismo origen; nunca salió del dispositivo).
