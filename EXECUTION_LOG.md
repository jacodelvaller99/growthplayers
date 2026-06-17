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

## Memory OS — 2026-06-15 (5 fases internas)

- **F1 — fundación:** migración `20260615000000_memory_system.sql` (4 tablas + ALTER mentor_memories);
  helpers `mem` en `lib/supabase.ts`; `lib/memoryLogic.ts` (pura, 17 tests) + `lib/memory.ts` (IO
  degradable). tsc 0 · 17 tests.
- **F2 — integración:** `lib/memorySummarizer.ts` (resumen/perfil/briefing vía streamMentorResponse);
  bloque "MEMORIA DEL CLIENTE" en `buildSystemPrompt`; trigger al cerrar chat (`mentor.tsx`, throttle
  ≥4 turnos) + en `confirmDraft` (`use-mentorship.tsx`). Fix 2 errores de tipo. tsc 0 · 74 tests.
- **F3 — UI admin:** `components/memory.tsx` (6 cards); sección Memoria en `admin/usuarios/[id]`;
  dashboard cross-client `admin/memoria.tsx` + NAV + ruta; `fetchUserMemory`/`fetchMemoryDashboard`
  en `lib/admin/queries.ts`. tsc 0.
- **F4 — cliente + import:** `app/perfil/cliente.tsx` (vista de apoyo, `clientSafeProfile`) + ruta +
  enlace en `perfil/index`; `components/PlaudImport.tsx` (pegar transcripción → resumen+perfil) en
  `mentoria/index`. tsc 0 · lint 0 · 74 tests · export web OK.
- **F5 — docs/deploy:** coverage en package.json; `docs/investor/10_MEMORY_SYSTEM.md`; CLAUDE.md
  (subsección Memory OS); este log + changelog. Migración aplicada vía dashboard (Chrome MCP).
- **Decisiones de diseño:** reusar tablas existentes (no duplicar memory_items/conversation_*);
  summarización client-side (sin deploy); `admin_briefings`/`admin_notes` admin-only por RLS (notas
  privadas fuera del perfil para evitar RLS por-columna); `generateAdminBriefing` solo desde contexto
  admin (no en confirmDraft del cliente) para cuadrar con RLS admin-only.

## Mentor Execution OS — 2026-06-16 (5 fases internas)

- **F1:** migración `20260616…` (mentor_tasks + reviews/scores/queue) · helpers `mex` · lógica pura
  `lib/mentorExecutionLogic.ts` (6 scores, deriveStatus, intervención, mentor-prep, tierDepth) + 29 tests.
- **F2:** `lib/mentorExecution.ts` (IO degradable; normalización de fuentes insert-if-missing; compute
  +persist scores + regenera cola; mentor-prep; dashboard live) · automatización en confirmDraft
  (action plan → tareas) y en chat blur (compromisos → ai_suggested).
- **F3:** `components/mentor-execution.tsx` (score/task/intervención/review-drawer/failure/prep) ·
  sección Ejecución en admin/usuarios/[id] · dashboard admin/mentores/ejecucion + NAV + ruta.
- **F4:** vista cliente en perfil/cliente (Lo siguiente + tareas activas, `clientSafeTasks`, gate por
  `isSubscribed`/tierDepth, tono de apoyo).
- **F5:** coverage + docs (investor 11/12 + CLAUDE.md + este log + changelog) · validación · migración
  vía dashboard · push.
- **Decisiones:** `mentor_tasks` = objeto unificado nuevo (mentorship_tasks/action_plan/commitments =
  fuentes normalizadas, no se borran); reviews/scores/queue admin-only por RLS; scores computados
  client-side on-read (cron = handoff); IA propone, mentor aprueba; `overdue` derivado del tiempo.
  Surfacing en comando diferido (el cliente ya ve "Lo siguiente" en perfil/cliente).

## Biometric Intelligence Layer — 2026-06-16 (5 fases internas)

- **F1:** migración `20260617000000_biometric_intelligence.sql` (ALTER wearable_daily/connections +
  journal_entries + memory_summaries source_type 'wellness' + proveedor 'synthetic'; tabla nueva
  `biometric_insights` owner+admin) · `lib/biometricLogic.ts` (6 estados + computeInsight con drivers +
  coach/client summaries + reflectionMismatch) + `lib/biometricSimulator.ts` (PRNG mulberry32 sembrado,
  7 escenarios narrativos, sin Math.random/Date) + 31 tests · helpers `bio` en `lib/supabase.ts`.
- **F2:** `lib/biometric.ts` (IO degradable): series/insights, `interpretSeries` (último día + baseline
  rodante) + `computeAndPersistInsight`, `saveReflection`→`ingestReflectionToMemory` (reflexión →
  memory_summaries 'wellness', la lee Norman), `seedSyntheticData`/`clearSyntheticData`, snapshot por
  usuario + dashboard cross-client (severidad; nombres vía user_progress). Fix tipo source_type 'wellness'.
- **F3:** `components/biometric.tsx` (insight admin/cliente + sparkline + conexiones + seed demo +
  composer de reflexión) · sección "K. BIOMÉTRICOS" enriquecida en admin/usuarios/[id] · dashboard
  `admin/biometria.tsx` + NAV (`monitor-heart`) + ruta en MainStack.
- **F4:** vista cliente en `perfil/cliente` ("Tu cuerpo hoy" con `client_safe_summary` + captura de
  reflexión → Memory OS). Ungated (la reflexión es para todos; el insight muestra empty sin wearable).
- **F5:** docs (investor 13 + CLAUDE.md subsección + este log + changelog) · validación (tsc 0 · lint 0
  errores · 134 tests · export web OK) · migración vía dashboard · push.
- **Decisiones:** coaching intelligence, NO diagnóstico clínico; reusar wearable_daily/connections/
  journal_entries + 1 tabla nueva (biometric_insights); diferencial de audiencia coach_safe/client_safe
  (la UI cliente nunca renderiza coach_safe); insights desde datos reales client-side on-read (cron =
  handoff, igual que ejecución); simulador determinista para demo/ventas sin wearable físico.

## Apple-grade Final Audit — 2026-06-16 (gate auditoría → ejecución)

Pase de auditoría rigurosa (4 frentes en paralelo + **verificación manual** de cada hallazgo crítico —
los del agente que no resistieron evidencia se descartaron, no se propagaron). Docs: `docs/investor/16-19`.

- **Verdad de modo claro:** el reporte automático marcó "38 sitios rotos" → **falso**. `palette.black`/etc.
  son theme-aware (`cv`); prueba en vivo sobre prod (`/bienestar`, `/bienestar/meditacion`, `data-theme=light`):
  `--c-bg`=`#F5F3EE`, **0 fondos oscuros opacos**. Único hex crudo real = `SkoolVideo` (y su `#000` es
  letterbox de video intencional). Se tokenizó solo el skeleton (`#111`→`palette.graphite`).
- **Verdad de degradación silenciosa:** los 5 "CRÍTICOS" del agente eran MEDIOS — la app es local-first
  (`persist()` antes del write), el dato visible no se pierde; solo el sync a la nube falla callado (= #21).
- **GDPR / Apple 5.1.1 — `delete-account` completo:** +14 deletes (user_memory_profile, memory_summaries,
  admin_briefings/notes, mentor_tasks/reviews/scores/queue, biometric_insights, mentorship_sessions/tasks,
  community_reports, user_blocks ×2, direct_messages ×2). Redeploy vía dashboard.
- **tier-sync (`lib/admin/actions.ts`):** `syncTier` inspecciona `allSettled` (rechazos + error de Supabase
  en cumplidos), registra y devuelve estado — ya no traga fallos parciales de tier.
- **Polish selectivo:** `welcome` fuentes 9→11 / 9.5→10; `norte` back button `hitSlop={8}`. SIN refactor del
  design system (mandato: no rewrite impulsivo; `comando.tsx` densa = deuda de pulido post-launch).
- **Librerías externas:** evaluadas 8, **instaladas 0** (rechazo de 2º design system; usar Reanimated ya
  presente). Doc 18.
- **Validación:** `tsc 0` · `lint 0 errores` · `134 tests` · `export web OK`.
- **Veredicto:** PRODUCTION CANDIDATE. Web lanzable tras datos legales; native tras `eas init` + cuentas.
  Bloqueantes restantes = handoffs del dueño (no-código). Doc 19.

## Owner Handoffs Closure — 2026-06-16 (verificación, sin features)

Pase de cierre de handoffs (NO se construyó nada nuevo). Verificación de realidad + documentación exacta:
- **CLIs:** `eas` instalado pero **no logueado** (`eas whoami` → Not logged in) → `eas init` = handoff.
  `supabase` CLI no instalado → `functions deploy delete-account` = handoff (cascada ya protege el GDPR).
- **Legal:** inventario completo de placeholders en `app/legal/*` (incl. crisis Apple 1.4.1). 100% owner-gated
  (no se inventan datos de entidad ni líneas de crisis). Smoke en prod confirma que se ven en `/legal/*`.
- **Native:** `app.json` verificado correcto salvo `eas.projectId`. Rutas OAuth callback existen.
- **Entregable:** `docs/launch/OWNER_HANDOFF_PACKET.md` — los 5 handoffs con dato/comando/URI exacto +
  criterio de verificación. Doc 19 actualizado con el smoke test.
- **Gate:** `tsc 0 · lint 0 errores · 134 tests · export web OK`. Estado **sin cambio**: PRODUCTION CANDIDATE
  (no pasa a shipped porque depende de datos/credenciales del dueño — declarado honestamente, no fingido).

## Admin: crear/editar perfiles — 2026-06-17

El admin solo gestionaba usuarios existentes (verificado: no había `createUser`, identidad solo-lectura).
Añadido sin reconstruir nada:
- **Edge function `create-user`** (`supabase/functions/create-user/index.ts`): gate `is_admin` del JWT del
  caller (crítico — no como delete-account que solo afecta al dueño) → `adminSupabase.auth.admin.createUser`
  (email_confirm + user_metadata.name) → refuerza name en user_profiles. Deploy = handoff CLI.
- **Acciones** (`lib/admin/actions.ts`): `createUserProfile` (invoke create-user + `activateMembership`
  para tier inicial + audit) · `updateUserProfile` (name + etiqueta/rol a user_profiles + audit).
- **UI:** botón "Crear perfil" + modal (email/nombre/contraseña temporal/tier, espeja el modal de
  membresías) en `usuarios/index.tsx`; botón "Editar" + modal de identidad en `usuarios/[id].tsx`.
  El tier de suscripción ya era editable (sección Membresías).
- **Decisión:** usuario real con login (no ficha CRM); contraseña temporal que el admin comparte; reusa
  `activateMembership` para el entitlement. Habilita la Parte C (perfiles Norman/Juan Jacobo = usar esto).
- **Gate:** `tsc 0 · lint 0 errores · 138 tests · export web OK`. **Bloqueado-en-ti:** `supabase functions
  deploy create-user` (CLI no está en el entorno del agente).

## Admin: cierre del gap "historia completa" — 2026-06-17

Auditoría mostró que el dossier del coach veía solo lo que el cliente DICE (check-ins, conversaciones,
compromisos), no lo que HACE (hábitos diarios, ayunos, cuerpo, nutrición, suplementos, prácticas, journal,
comunidad). Score honesto antes: 4/10. Cierre completo:

- **`lib/admin/queries.ts`**: `fetchUserActivityBundle(userId)` paraleliza 12 lecturas (habits, habit_logs,
  fasting, body, nutrition, supplements, journal, wellness_sessions, posts, count de reactions, count de
  DMs enviados, última actividad DM) con helper `safeSelect` que degrada a vacío.
- **`components/admin-activity.tsx`** (NUEVO): HabitsCard (rachas + completados últimos 14d) ·
  WellnessSessionsCard (totales + breakdown por tipo) · FastingCard · BodyCard (peso actual + delta) ·
  NutritionCard · SupplementsCard · JournalCard (últimas 8 entradas con tipo + ánimo) · CommunityCard
  (posts + likes dados + DMs enviados + días desde último DM).
- **`app/admin/usuarios/[id].tsx`**: 2 secciones nuevas — **L. CUERPO & PROTOCOLO** y **N. REFLEXIONES &
  COMUNIDAD** — antes de H. AUDITORÍA. `load()` ahora hace 10 fetches en paralelo.
- **Privacidad de DMs:** solo metadata (conteo + última actividad), nunca contenido — el coach ve señal
  de actividad, no surveillance.
- **Hallazgo corregido:** la auditoría reportó "wellness_sessions sin escritura" → falso, ya se escribe
  en `hooks/use-lifeflow.tsx:793` (saveWellnessSession). Estaba sin LEERSE en admin, no sin escribirse.
- **Gate:** `tsc 0 · lint 0 errores · 138 tests · export web OK`. Sin tablas nuevas, sin migración.
