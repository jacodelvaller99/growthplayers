# POLARIS — VEREDICTO EJECUTIVO DE LANZAMIENTO

> ⚠️ **ADDENDUM — ESTADO AL 2026-06-12 (leer primero).** Este documento retrata el estado
> al **2026-06-02**, ANTES de las olas de remediación. Desde entonces:
>
> | # Blocker (top-10 original) | Estado 2026-06-12 | Evidencia |
> |---|---|---|
> | 1 Escalación a admin | ✅ CERRADO | Trigger BEFORE-UPDATE, migración `20260602000000_security_hardening_p0.sql` **aplicada en prod** (dashboard) |
> | 2 generate-embeddings sin auth | ✅ CERRADO **y desplegado** | JWT + `user_id=auth.uid()`; deploy vía dashboard 2026-06-12; curl sin auth → 401 |
> | 3 Auto-grant membresía/tier | ✅ CERRADO | Políticas dropped + trigger (misma migración, aplicada) |
> | 4 access_codes abierto | ✅ CERRADO | Políticas dropped; solo RPC `redeem_access_code()`; residuo dropped en `20260604000000` |
> | 5 UGC sin moderación | ✅ CERRADO | Reportar/bloquear/EULA/filtro + cola admin (`2e403f0`) |
> | 6 Sin links legales | ✅ CERRADO | `app/legal/*` + links en paywall/onboarding |
> | 7 Norman sin disclosure/crisis | ✅ CERRADO | REGLA DE HONESTIDAD + bloque SEGURIDAD (`lib/mentor.ts:310-325`), protegido por test |
> | 8 Borrado de cuenta incompleto | ✅ CERRADO | 48 operaciones de delete + CASCADE; **deploy = handoff CLI** (`supabase functions deploy delete-account`) |
> | 9 Chat colgado / writes silenciosos | ✅ CERRADO | Abort+timeout 45s + cancelar; cola offline + toast honesto 'queued' |
> | 10 ErrorBoundary / projectId / userId | 🟡 PARCIAL | ErrorBoundary ✅ + captura global (`lib/crash.ts`) ✅ · userId ✅ · **eas projectId sigue placeholder (handoff)** |
>
> Además (2026-06-12): guards `Stack.Protected` en 42 rutas privadas (verificado manualmente en prod;
> NO hay E2E automatizados), suite Jest real (204 tests, 14 suites) + CI, **ai-proxy** en código (claves
> server-side, opt-in — activación de secrets = handoff),
> `smart-notifications`/`sync-wearables` redesplegados con auth. Pendientes: `eas init`,
> secrets del ai-proxy + rotación de claves, registro de redirect URIs Oura/WHOOP, cron
> service-role config. Detalle: `docs/investor/00_EXECUTIVE_READINESS_VERDICT.md` y `EXECUTION_LOG.md`.

> War room de 6 equipos (Seguridad, QA, App Store/Compliance, Privacidad/Legal, Copy, Release Ops).
> Fecha: 2026-06-02. Rama `main` · commit `d68c122` · prod live en Vercel.
> Evidencia con `archivo:línea`. Severidades verificadas — los P0 de seguridad/admin fueron
> confirmados manualmente contra el código, no solo reportados.

---

## 1. VEREDICTO EJECUTIVO

### Estado: 🔴 **RED**

### ¿Puede lanzarse esta semana? **NO.**

No pasa review de App Store ni de Google Play hoy, y tiene fallos S0 de robustez en sus features
más importantes (chat IA, durabilidad de escritura, sesión de usuario). **Web es lanzable antes que
nativo** (rollback instantáneo de Vercel hace el riesgo tolerable), pero solo tras cerrar los P0 de
compliance, legal y robustez. **Nativo está bloqueado** hasta `eas init` (projectId es placeholder).

Lectura honesta: **se ve premium y la arquitectura está bien formada, pero está operativamente
inmadura y legalmente descubierta.** La calidad visual adelanta a la madurez operativa. Eso es
exactamente lo que un review hostil y un primer lote de usuarios reales castigan.

> ⚠️ **CORRECCIÓN DE RÉCORD (integridad):** en el reporte interino concluí que la autorización
> admin era "server-side, resuelta". **Era falso.** Verifiqué la *lectura* (`is_admin` en las
> políticas SELECT) pero no la *escritura*: la política UPDATE de `profiles` no restringe columnas,
> así que **cualquier usuario puede setear su propio `is_admin=true`** y desbloquear todas las lecturas
> admin. Team 1 (auditoría profunda) lo cazó y lo re-verifiqué. La confidencialidad de TODA la
> PII/salud está comprometida hoy (ver SEC-P0-1).

**Lo que SÍ está bien (verificado):**
- Sin secretos hardcodeados en el cliente; solo `.env.example` en git.
- RLS habilitado y la base por-usuario (`auth.uid()=user_id`) en tablas núcleo es correcta **para lectura**.
- `calculate-intelligence`, `delete-account`, `ml-dashboard` tienen auth correcta; el service-role es server-only.
- Borrado de cuenta in-app real (Apple 5.1.1(v)) — purga PII + embeddings, aunque con cobertura incompleta (ver P0-5).
- No requiere Sign in with Apple; no usa HealthKit nativo; GDPR export + toggle de consentimiento ML;
  fallback de IA graceful (NVIDIA→Groq→OpenAI→canned).

---

## 2. TOP 10 BLOCKERS

> Encabezan las catástrofes de seguridad: comprometen la confidencialidad de TODA la PII/salud
> y el muro de pago, explotables desde el código SQL commiteado.

| # | Blocker | Sev | Evidencia | Equipo |
|---|---------|-----|-----------|--------|
| 1 | **Escalación a admin en una query** — `profiles_update_own` UPDATE sin restricción de columnas → `update profiles {is_admin:true}` → lee la PII/salud de TODOS | **P0** | `supabase/schema.sql:127-128`, `…20260509120000…:170-175` | Seguridad |
| 2 | **Exfiltración cross-user sin auth** — `generate-embeddings` sin verificación de auth, `user_id` del body, service-role → memorias privadas del mentor de cualquier usuario con la anon key | **P0** | `supabase/functions/generate-embeddings/index.ts:679-746` | Seguridad |
| 3 | **Auto-otorgarse premium / membresía** — `user_insert_own_memberships` + self-set `subscription_tier` (misma política de #1) | **P0** | `…20260509120000…:124-128,170-175` | Seguridad |
| 4 | **`access_codes` R/W abierto a cualquier autenticado** (`USING(true) WITH CHECK(true)`) → leer/reset/resucitar cualquier código incl. `POLARIS-ADMIN` ilimitado | **P0** | `…20260509120000…:56-68` | Seguridad |
| 5 | **Comunidad UGC sin moderación** (sin reportar/bloquear/filtro/EULA) — rechazo casi seguro Apple 1.2 | P0 | `app/bienestar/comunidad.tsx:140` | App Store |
| 6 | **Sin links/URLs públicas de Privacy/Terms/Support** | P0 | `app/paywall.tsx:226`, `app.json:61` | App Store / Legal |
| 7 | **Norman: sin disclosure de IA, se presenta como humano real, sin ruteo de crisis, sección "DISEÑO DE OBSESIÓN"** (Apple 1.4.1) | P0 | `lib/mentor.ts:310,360` | App Store / Copy |
| 8 | **Borrado de cuenta incompleto** (~13 tablas personales/salud, GDPR) | P0 | `supabase/functions/delete-account/index.ts` | Privacidad |
| 9 | **Chat IA se cuelga para siempre** (sin timeout/abort) + **escrituras del core-loop fallan en silencio** (sin cola offline) | P0 | `lib/{groq,openai}.ts`; `use-lifeflow.tsx:595-611` | QA |
| 10 | **Sin ErrorBoundary + sin crash monitoring** · **`eas.projectId` placeholder** (build nativo roto) · **`userId` ref stale** (admin lockout) | P0 | (ausencia); `app.json:63`; `use-lifeflow.tsx:962` | Ops / QA |

> **Nota:** el #1 (escalación a admin) hace que la **autorización admin client-side** y todas las
> políticas "admin lee todo" sean ineficaces — un atacante se auto-promueve y luego lee legítimamente.
> Es la raíz que amplifica el resto. Es lo primero que se cierra.

---

## 3. HALLAZGOS POR EQUIPO

### 🛡️ Seguridad (Team 1 — `SECURITY_LAUNCH_AUDIT.md` · **P0=5 · P1=10 · P2=6 · P3=5**)
**Veredicto del equipo: NO LANZAR — la confidencialidad de toda la PII/salud está comprometida y el muro de pago es trivialmente evadible.** (Re-verifiqué SEC-P0-1 y P0-2 a mano.)
- 🔴 **SEC-P0-1 Escalación a admin** — UPDATE de `profiles` sin restricción de columnas, `is_admin` en esa tabla, sin trigger/GRANT guard (`schema.sql:127`, `…fix.sql:170`). **Fix:** `REVOKE UPDATE(is_admin,role,subscription_tier)` de `authenticated` o trigger BEFORE-UPDATE.
- 🔴 **SEC-P0-2 Exfiltración sin auth** — `generate-embeddings` 0 checks de auth, `user_id` del body (`index.ts:679-746`). **Fix:** verificar JWT, forzar `user_id=auth.uid()`, REVOKE EXECUTE de `search_mentor_memories` a public.
- 🔴 **SEC-P0-3/4 Auto-grant membresía + tier** (`…fix.sql:124-128,170-175`). **Fix:** quitar políticas; membresía solo vía RPC/webhook.
- 🔴 **SEC-P0-5 `access_codes` R/W abierto** (`…fix.sql:56-68`) incl. `POLARIS-ADMIN`. **Fix:** usar la RPC atómica `redeem_access_code()`.
- 🟠 **P1:** claves IA client-exposed (`env.ts:10-16`); `smart-notifications` y `sync-wearables` (batch) sin auth; admin RPCs confían en `p_admin_id` del cliente (`…cmi_corrective…:139`); **vistas `wearable_baseline`/`user_progress` sin `security_invoker`** → cualquiera lee HRV/FC de todos; `b2b_organizations`/`org_members` con **RLS deshabilitado**; tokens OAuth en texto plano; **sin CSP/headers en `vercel.json`** + JWT en `localStorage` → XSS=account takeover; redención de código TOCTOU.
- 🟡 **P2:** dev-bypass anónimo en URL placeholder (no activo en prod; gate a `__DEV__`).
- ⚠️ **Verificación live pendiente:** `verify_jwt` por función (no hay `config.toml` en repo) — si alguna se desplegó con `verify_jwt=false` es aún peor; qué migraciones están aplicadas en prod; EXECUTE grants en `search_mentor_memories`; proveedor Anonymous on/off; si el bundle web desplegado lleva claves reales.

### 🧪 QA (`QA_MASTER_TEST_PLAN.md`, `RELEASE_BLOCKER_MATRIX.md`, `KNOWN_ISSUES_REGISTER.md`)
- ~70 flujos mapeados; **No-Go**. S0: chat sin timeout, escrituras silenciosas, userId stale, dev-bypass anónimo.
- 🟠 Web sin reset de password real (`supabase.ts:49` `detectSessionInUrl:false`, sin pantalla update-password) y **web no puede suscribirse** (`paywall.tsx:55-61`) con gate de mentor al mensaje 3 = dead end.
- 🟠 Admin Mission Control spinner infinito (sin `.catch` en `Promise.all`, `admin/index.tsx:127`).
- 🟡 `isSubscribed` vs `subscriptionTier` split-brain + sin chequeo de expiración.

### 🏪 App Store / Compliance (`REJECTION_RISK_REPORT.md`, `APP_STORE_SUBMISSION_CHECKLIST.md`)
- **"Esto hoy no pasa review."** Hard blockers: UGC sin moderación, sin links legales, projectId placeholder, IA sin disclosure/crisis.
- 🟠 Herramientas de salud sin disclaimers de seguridad: `respiracion.tsx` (breathwork holotrópico — sin "no conducir/embarazo/cardíaco"), `grito.tsx`, `tapping.tsx`, `consciencia.tsx` ("sana"). Modelos correctos ya existen en `ayuno.tsx:199` y `suplementacion.tsx:94`.
- 🟠 Suscripción: falta texto auto-renovación + promesa de reembolso "sin preguntas" no honrable (`paywall.tsx:156`). Restore Purchases SÍ presente.
- 🟡 Mismatch de scheme: `app.json` declara `polaris` pero `wearables.tsx:434` abre `growthplayers://oauth` → callback OAuth falla en device.
- 🟡 Falta plugin `expo-notifications` en `app.json` pese a programar notificaciones locales.

### 🔐 Privacidad / Legal (`legal/` — 5 borradores)
- Mapa de datos completo: cuenta, contenido (norte, check-ins, journal, notas, chats), biométricos/salud (HRV, FC reposo, SpO₂, sueño), analytics, **inferencias IA** (churn, DNA conductual, embeddings de memoria), suscripciones. 3rd parties: Supabase, NVIDIA/Groq/OpenAI, Oura/WHOOP, RevenueCat, Vercel, Expo.
- 🔴 **P0: right-to-erasure incompleto** (P0-5). 🟠 ML consent **opt-out** (`ml_consent DEFAULT true`). 🟠 Comunidad world-readable y no se borra al eliminar cuenta. 🟠 No existe ruta `/privacy` ni `/terms` en la app.
- Borradores listos (ES, con placeholders `[RAZÓN SOCIAL]`/`[JURISDICCIÓN]` y marcadores ⚠ BRECHA).

### ✍️ Copy / Producto (`COPY_RISK_AUDIT.md`, `TRUST_COPY_REWRITE.md`)
- Voz **elite pero inconsistente** — el riesgo vive en la inconsistencia. P0: impersonación humana de Norman, garantía "sin preguntas". P1: claims terapéuticos ("reduce ansiedad en minutos" `wellness.ts:677`), label "HEALING"/pseudociencia (`binaurales.tsx:136`), "precisión clínica" (`wearables.tsx:87`), stats inventadas ("80% siente esto" `mentor.ts:378`), inferencia cuasi-diagnóstica ("inflamación" `mentor.ts:245`).
- Patrones correctos YA existen (check-in "Eso es información, no debilidad"; onboarding "no es para todos") — son el template.

### 🚀 Release Ops (`RELEASE_RUNBOOK.md`, `ENV_AND_SECRET_MATRIX.md`)
- **"Premium pero operativamente inmaduro."** P0: ErrorBoundary + crash capture. Gaps: sin CI/CD (`.github/` ausente), sin staging (un solo proyecto Supabase), sin tags/versionado, sin down-migrations, errores de Edge solo en `console.error`.
- Wearables (Oura/WHOOP) **pendientes** (6 credenciales vacías) → recomendado **descopar la conexión de wearables para v1.0.0**.

---

## 4. BACKLOG DE CIERRE

> `Bloquea = sí` no se puede shippear sin cerrarlo. Owner sugerido. ETA en días-persona.

| Sev | Área | Evidencia | Fix exacto | Owner | ETA | Bloquea |
|-----|------|-----------|-----------|-------|-----|---------|
| P0 | **Sec — escalación admin** | `schema.sql:127`, `…fix.sql:170` | `REVOKE UPDATE(is_admin,role,subscription_tier)` de `authenticated` + trigger BEFORE-UPDATE que bloquee cambios a esas columnas | Backend | 1d | sí |
| P0 | **Sec — embeddings sin auth** | `generate-embeddings/index.ts:679` | Verificar JWT entrante; forzar `user_id=auth.uid()`; REVOKE EXECUTE de `search_mentor_memories` a public; confirmar `verify_jwt=true` | Backend | 1d | sí |
| P0 | **Sec — auto-grant membresía/tier** | `…fix.sql:124,170` | Quitar `user_insert_own_memberships`; tier/membresía solo vía RPC `SECURITY DEFINER`/webhook RevenueCat | Backend | 1d | sí |
| P0 | **Sec — access_codes abierto** | `…fix.sql:56-68` | DROP de ambas políticas; redención solo vía `redeem_access_code()` | Backend | 0.5d | sí |
| P0 | UGC | `comunidad.tsx:140` | Reportar + bloquear usuario + filtro de contenido + EULA antes de postear (o descopar comunidad para v1) | Mobile | 3-5d | sí |
| P0 | Legal links | `paywall.tsx:226`, settings | Publicar Privacy/Terms/Support en URL pública + enlaces tappables in-app + ruta `/privacy` `/terms` | Legal+Mobile | 2-3d | sí |
| P0 | Build | `app.json:63` | `eas init` → projectId real; configurar credenciales iOS/Android | Release | 0.5d | sí (nativo) |
| P0 | IA honestidad | `mentor.ts:310,360` | Reescribir prompt: identidad IA explícita, hablar "en nombre del método", quitar sección "DISEÑO DE OBSESIÓN", ruteo a recursos de crisis ante señales de autolesión | Producto+IA | 2-3d | sí |
| P0 | Borrado datos | `delete-account/index.ts` | Cubrir las ~13 tablas faltantes; manejar fallos (no `allSettled` silencioso); arreglar org huérfana | Backend | 2d | sí |
| P0 | Resiliencia | (ausencia) | ErrorBoundary raíz + crash capture (Sentry o handler global→tabla Supabase) | Mobile+Ops | 1-2d | sí |
| P0 | Chat IA | `lib/{groq,openai}.ts`, `mentor.tsx` | `AbortController` + timeout (~30s) + botón cancelar + liberar input; no descartar el mensaje del usuario en error | Mobile | 2d | sí |
| P0 | Durabilidad | `use-lifeflow.tsx:595-611` | Cola offline / retry para check-ins, tareas, lecciones; feedback honesto de "no se guardó" | Mobile | 3d | sí |
| P0 | Sesión | `use-lifeflow.tsx:962` | `userId` como state reactivo (no ref) → arregla admin lockout, notifs, weekly-session | Mobile | 1d | sí |
| P1 | Claves IA | `env.ts:10-16` | Proxy de IA vía Edge Function; rotar claves; sacar `EXPO_PUBLIC_*` de keys de costo | Backend | 3-4d | recomendado pre-escala |
| P1 | Salud/disclaimers | `respiracion/grito/tapping/consciencia.tsx` | Replicar el patrón de `ayuno.tsx:199`: warning de seguridad no-dismissable contextual | Producto | 2d | sí (review) |
| P1 | Suscripción | `paywall.tsx:156` | Texto auto-renovación estándar; quitar "sin preguntas"; "reembolsos según políticas de la tienda" | Producto | 0.5d | sí (review) |
| P1 | access_codes | `migrations/…fix.sql:66`, `(auth)/index.tsx:111` | Función `SECURITY DEFINER` para redención atómica; quitar UPDATE abierto | Backend | 1d | sí |
| P1 | Tokens wearable | schema biometrics | Cifrar tokens (Vault/pgcrypto) o no afirmar cifrado en la política | Backend | 1-2d | sí (si se ofrecen wearables) |
| P1 | OAuth CSRF | `lib/wearables.ts` | Validar `state`; corregir mismatch de scheme | Mobile+Backend | 1d | sí (si se ofrecen wearables) |
| P1 | Copy riesgoso | `wellness.ts:677`, `binaurales.tsx:136`, `mentor.ts:245,378`, `wearables.tsx:87` | Aplicar reescrituras de `TRUST_COPY_REWRITE.md` | Producto | 1d | sí (review) |
| P1 | Web auth/pago | `supabase.ts:49`, `paywall.tsx:55` | Pantalla update-password en web; decidir pago web (Stripe) o ocultar paywall en web | Mobile | 2-3d | decisión de producto |
| P1 | Consent | `ml_consent DEFAULT true`, onboarding wearable | Consentimiento biométrico explícito (opt-in) antes del OAuth; first-run AI disclosure; registro auditable de consentimiento | Producto+Legal | 2d | sí (review) |
| P2 | Dev bypass | `use-lifeflow.tsx:362` | Gate a `__DEV__`, fail-closed en prod | Mobile | 0.5d | no |
| P2 | Data model | `profiles` vs `user_profiles`, `check_ins` vs `daily_checkins` | Consolidar esquemas duplicados | Backend | 2-3d | no |

**Esfuerzo aproximado de cierre P0:** ~20-26 días-persona (incluye los 4 P0 de seguridad, que son
baratos individualmente —0.5-1d— pero son los de mayor impacto: cierran la fuga total de datos).
P1 crítico de review + seguridad (vistas `security_invoker`, CSP, RPCs admin, proxy IA): ~10-12 más.
**Orden recomendado:** primero los P0 de seguridad (días, no semanas, y detienen la exfiltración),
luego compliance/legal, luego robustez (chat/writes/sesión), por último build nativo.

---

## 5. ARTEFACTOS GENERADOS (`docs/launch/`)

| Categoría | Archivos |
|-----------|----------|
| **Veredicto** | `00_EXECUTIVE_LAUNCH_VERDICT.md` (este) |
| **Seguridad** | `SECURITY_LAUNCH_AUDIT.md`, `P0_P1_SECURITY_FIXLIST.md`, `DATA_FLOW_AND_SECRET_MAP.md`, `APP_STORE_PRIVACY_EVIDENCE.md` *(Team 1 finalizando)* |
| **QA** | `QA_MASTER_TEST_PLAN.md`, `RELEASE_BLOCKER_MATRIX.md`, `PRELAUNCH_SMOKE_TEST.md`, `KNOWN_ISSUES_REGISTER.md` |
| **App Store** | `APP_STORE_SUBMISSION_CHECKLIST.md`, `PRIVACY_NUTRITION_DRAFT.md`, `STORE_METADATA_REVIEW.md`, `REJECTION_RISK_REPORT.md` |
| **Legal** (`legal/`) | `PRIVACY_POLICY_DRAFT.md`, `TERMS_OF_SERVICE_DRAFT.md`, `WEARABLE_CONSENT_DRAFT.md`, `HEALTH_DISCLAIMER_DRAFT.md`, `ACCOUNT_DELETION_POLICY.md` |
| **Copy** | `COPY_RISK_AUDIT.md`, `TRUST_COPY_REWRITE.md`, `STORE_DESCRIPTION_DRAFT.md`, `CONSENT_SCREEN_COPY.md` |
| **Release Ops** | `RELEASE_RUNBOOK.md`, `ENV_AND_SECRET_MATRIX.md`, `LAUNCH_DAY_COMMAND_CENTER.md`, `POST_LAUNCH_MONITORING.md` |

---

## 6. DEFINICIÓN DE SHIP-READY (checklist firmable)

No se declara "listo" hasta marcar TODAS:

- [ ] **0 P0 abiertos** (los 9 del top-10 + #5 borrado de datos)
- [ ] Ningún texto legal placeholder; Privacy/Terms/Support/Account-Deletion **con URL pública** y enlaces in-app
- [ ] Pantalla(s) de consentimiento coherentes con la realidad técnica (biométrico opt-in, AI disclosure, health disclaimer)
- [ ] Todo flujo crítico con **smoke test pasado** (`PRELAUNCH_SMOKE_TEST.md`) en iOS/Android/Web según aplique
- [ ] Todo permiso con purpose string honesto; `expo-notifications` registrado; scheme OAuth correcto
- [ ] Ningún secreto inseguro (claves de IA proxied o aceptadas con mitigación documentada)
- [ ] Ningún reviewer risk severo sin mitigación (UGC moderada o descopada; sin claims médicos; suscripción conforme)
- [ ] Crash monitoring + ErrorBoundary activos; rollback verificado
- [ ] RLS reconfirmado en prod (no solo en migraciones) para tablas PII/salud
- [ ] Decisión explícita sobre wearables (descopar v1) y pago web

**Firma de release (Go/No-Go):** Producto ___ · Ingeniería ___ · Legal ___ · Fecha ___

---

> **Verdad brutal final:** Polaris tiene un producto genuinamente premium y una base técnica seria,
> pero hoy **no está listo para usuarios reales ni para review**. Los bloqueos no son cosméticos:
> exposición legal (datos de salud + UGC sin moderar + borrado incompleto), una IA que se hace pasar
> por humano sin red de seguridad de crisis, y features núcleo (chat, guardado, sesión) que fallan en
> silencio bajo estrés. La buena noticia: casi todo es tractable y los patrones correctos ya existen
> en el propio código. Cierra los 9 P0, aplica los P1 de review, descopa wearables, y Polaris se vuelve
> defendible y shippeable — primero web, luego nativo.
