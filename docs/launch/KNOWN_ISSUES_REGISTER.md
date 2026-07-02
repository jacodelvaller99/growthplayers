# KNOWN ISSUES REGISTER — Polaris / LifeFlow

Concrete issues and risks found by reading the code, with `file:line` evidence and severity. This is evidence-based: each item points at the exact code that produces the risk. Severity: **S0** blocker · **S1** critical · **S2** major · **S3** minor.

All paths are relative to the worktree root `.../sweet-diffie/lifeflow/`.

> ⚠️ **ESTADO AL 2026-06-12** — snapshot original 2026-06-02; estados actuales verificados en código y prod:
>
> | # | Issue | Estado |
> |---|---|---|
> | 1 | userId ref stale | ✅ CERRADO — `userId` es estado reactivo (`use-lifeflow.tsx:337`); `uidRef` queda solo para lecturas síncronas en callbacks |
> | 2 | Chat sin timeout/abort | ✅ CERRADO — AbortController + timeout 45s + cancelar + toast de timeout (`mentor.tsx:351-360, 470-480`) |
> | 3 | Claves IA en el bundle | 🟡 MITIGACIÓN LISTA — `ai-proxy` desplegado (JWT, claves server-side); activar con secrets + `EXPO_PUBLIC_AI_PROXY_URL` y rotar claves. Hasta entonces sigue el camino directo |
> | 4 | OAuth scheme mismatch | 🟡 CÓDIGO CERRADO — nativo usa `polaris://oauth` (`lib/wearables.ts:23`, `wearables.tsx:434`); falta **registrar las URIs en consolas Oura/WHOOP** (handoff) |
> | 5 | Writes silenciosos | 🟡 PARCIAL — check-ins/lecciones/tareas con cola offline + retry; `saveCheckIn` retorna estado + toast honesto. Outbox client-id para inserts no-idempotentes (mensajes/wellness) sigue pendiente |
>
> Cambios adicionales 2026-06-12: guards `Stack.Protected` (37 rutas, E2E prod), 53 tests + CI,
> 4 Edge Functions redesplegadas con auth (curl sin token → 401), captura global de crashes.
> Ver `EXECUTION_LOG.md` + `docs/investor/02_REPO_GAP_REGISTER.md` para el registro vivo.

---

### #0 (2026-07-02) — `mentor_messages` rechaza todos los INSERTs en prod: el chat con Norman no persiste — **S0 · fix SQL listo**
- **Evidencia (sesión real, local contra prod):** `daily_checkins` acepta el insert del día (2026-07-02, energy 7) → red y sesión OK; `mentor_messages` devuelve `[]` para el owner y los 4 mensajes del chat quedaron atascados en `lifeflow:v2:offline_queue_v1` con `onConflict: user_id,client_id`. La columna `client_id` existe (probe SELECT → 200).
- **Causa más probable:** política RLS de INSERT owner ausente/rota en prod (deny-by-default). La policy correcta existe en `supabase/migrations/20260619000000_db_hardening_p1.sql:111` pero el estado aplicado de esa migración en prod no está confirmado.
- **Impacto:** TODOS los clientes pierden el historial literal del chat al recargar (la memoria sintetizada de Norman sobrevive vía `mentor_conversations` — por eso nadie lo notó). El dossier admin "F. CONVERSACIONES" lee `mentor_conversations`, no `mentor_messages`, y enmascaraba el hueco.
- **Fix:** bloque **FIX-0** en `docs/launch/SQL_PENDIENTES_COMBINADAS.sql` (idempotente: policies SELECT/INSERT/UPDATE owner + columna/índice client_id). Al aplicarlo, los outbox de cada dispositivo drenan solos. Verificación: mensaje a Norman + recarga → el hilo sobrevive.
- **Fix cliente relacionado (ya en branch):** la carga inicial pedía los 50 mensajes **más viejos** (`ascending: true` + `limit(50)`) — corregido a los 50 más recientes + reverse (`hooks/use-lifeflow.tsx:239`).

---

### #1 — `userId` exposed as a ref read; consumers see stale `null` — **S0**
- **Where:** `hooks/use-lifeflow.tsx:962` → `userId: uidRef.current` placed in the context value; `uidRef` is `useRef` (`use-lifeflow.tsx:332`), set in `init()` (`:368`) and `onAuthStateChange` (`:455`).
- **Problem:** Mutating a ref does not re-render, so the context value's `userId` only updates when the provider re-renders for some other reason. Effects keyed on `[userId]` can fire once with `null` and never re-run with the real id.
- **Impact:** Admin lockout (`app/admin/_layout.tsx:122-123`), delayed/never-started smart-notification polling (`hooks/use-smart-notifications.ts:13`), weekly-session generator never runs (`app/(tabs)/comando.tsx:61-67`), intelligence/memory hooks initialize with `null`.
- **Fix:** keep `userId` in `useState` and `setUserId(...)` wherever the ref is set.

---

### #2 — AI streaming has no timeout / no abort / no cancel → permanent hang — **S0**
- **Where:** no `AbortController`/`signal`/`setTimeout` in `lib/nvidia.ts`, `lib/groq.ts`, `lib/openai.ts`, `lib/mentor.ts` (verified by grep). `fetch` in `lib/groq.ts:29` has no `signal`. UI locks input while streaming: `app/(tabs)/mentor.tsx:694` (`editable={!isStreaming}`), `:705` (send `disabled`), with no cancel button.
- **Problem:** A stalled connection never resolves/rejects the stream; `isStreaming` stays `true`.
- **Impact:** Chat permanently frozen (no type/send/cancel); same freezes mentoría plan generation (`hooks/use-mentorship.tsx:150`).
- **Fix:** AbortController + hard timeout + idle-chunk watchdog per provider; add "Detener" that aborts and restores input; retry on timeout.

---

### #3 — AI provider keys inlined into the client/web bundle — **S0 (security)**
- **Where:** `app/config/env.ts:10-16` (`EXPO_PUBLIC_NVIDIA/GROQ/OPENAI_API_KEY`); used directly in `lib/groq.ts:33` (`Authorization: Bearer ${ENV.groqApiKey}`), same for nvidia/openai.
- **Problem:** `EXPO_PUBLIC_*` is inlined at build time and readable in the deployed JS bundle.
- **Impact:** Anyone can extract the keys from the Vercel web build and drain quota / incur cost.
- **Fix:** proxy AI through a Supabase Edge Function (server-side key), like `sync-wearables`/`delete-account`.

---

### #4 — Native wearable OAuth redirect scheme mismatch — **S1**
- **Where:** `lib/wearables.ts:23` `REDIRECT_BASE = ENV.isDev ? 'exp://localhost:8081' : 'https://growthplayers.vercel.app'`; OAuth URLs built with `${REDIRECT_BASE}/oauth/<p>/callback` (`:32,43`). Native close-scheme is `growthplayers://oauth` (`app/perfil/wearables.tsx:434`).
- **Problem:** The provider redirects to the web/exp URL, but `WebBrowser.openAuthSessionAsync` waits for `growthplayers://oauth`. The `result.type === 'success'` branch (`wearables.tsx:436`) may never fire on device.
- **Impact:** Wearable connect can silently fail on native; spinner ends with no connection.
- **Fix:** use a single consistent deep-link redirect (`growthplayers://oauth/<provider>/callback`) registered with both providers and matched in the close-scheme.

---

### #5 — Supabase writes fail silently across the core loop — **S1 (data integrity)**
- **Where:** optimistic local update + swallowed write in `hooks/use-lifeflow.tsx`: `saveCheckIn` (`:595-611`), `markLessonComplete` (`:729-741`), `saveLessonTask` (`:698-712`), `updateNorthStar` (`:559-569`), `updateProfile` (`:545-549`), `addMentorMessages` (`:667-674`), `saveWellnessSession` (`:775-786`). All `catch { console.warn(...) }`.
- **Problem:** No write queue, no retry, no UI signal when the server write fails (offline or expired token). The UI confirms success and navigates away.
- **Impact:** Offline/expired-token check-ins, lessons, and edits are lost on reinstall/second device; streaks silently break.
- **Fix:** queue + retry failed mutations; surface a "not synced" state; don't navigate away on a failed write.

---

### #6 — Admin Mission Control: unhandled `Promise.all` → infinite spinner — **S1**
- **Where:** `app/admin/index.tsx:127-140` `loadData` runs `Promise.all([...])` with no `.catch`; `setLoading(false)` is only inside the resolved path. Loader gate at `:164-171`.
- **Problem:** Any one rejected query (missing view/RLS/network) leaves `loading=true` forever and throws an unhandled rejection.
- **Impact:** A single backend gap bricks the whole admin dashboard at launch.
- **Fix:** try/catch with an error state and `loading` cleared in `finally`.

---

### #7 — Web password reset likely non-functional — **S1**
- **Where:** `lib/supabase.ts:49` `detectSessionInUrl: false`; `app/(auth)/index.tsx:162-183` only sends the reset email; no update-password route exists (grep).
- **Problem:** The recovery token in the returned URL is never consumed and there is no "set new password" screen.
- **Impact:** Web users who forget their password cannot recover → lockout + support load.
- **Fix:** `detectSessionInUrl: true` on web + a `PASSWORD_RECOVERY`-event screen, or a dedicated recovery route.

---

### #8 — Wearable queries not user-scoped (RLS-only defense) — **S1 → S0 if RLS absent**
- **Where:** `lib/wearables.ts:174-178` (`wearable_daily`, no `.eq('user_id')`), `:209-213` (`wearable_timeseries`), `:138-142` (`wearable_connections`, only `is_active`).
- **Problem:** Client requests all rows; only RLS prevents cross-user leakage of biometric/health data.
- **Impact:** If RLS is missing/misconfigured, users see each other's HRV/sleep/RHR — GDPR/health breach.
- **Fix:** add explicit `.eq('user_id', uid)` and verify RLS denies cross-user reads.

---

### #9 — Access-code redemption is non-atomic (race / over-redemption) — **S1**
- **Where:** `app/(auth)/index.tsx:111-149` — `select` code, check `uses_count`/`max_uses` in JS, then `update({ uses_count: row.uses_count + 1 })`. Same read-then-write shape via `redeemAccessCode` in onboarding (`app/(onboarding)/index.tsx:56`).
- **Problem:** Concurrent registrations read the same `uses_count` and both pass the cap, then both increment.
- **Impact:** Limited/single-use paid codes can be redeemed more times than allowed.
- **Fix:** atomic server-side redemption (RPC with `UPDATE ... WHERE uses_count < max_uses RETURNING`, or a DB constraint/transaction).

---

### #10 — OAuth `state` generated but never validated (no CSRF protection) — **S1**
- **Where:** `app/perfil/wearables.tsx:46` `generateState()`; passed into `OAUTH_URLS` (`:421`). Callbacks (`app/oauth/oura/callback.tsx`, `app/oauth/whoop/callback.tsx`) read `code`/`error` but never compare `state`.
- **Problem:** No CSRF defense on the authorization-code exchange.
- **Impact:** A crafted callback can attach an attacker's account/code to the victim's session.
- **Fix:** persist the generated `state` (e.g. sessionStorage/secure store) and reject the callback if it doesn't match.

---

### #11 — Subscription gating split-brain + no client-side expiry check — **S1**
- **Where:** mentor gate uses `isSubscribed` from RevenueCat (`app/(tabs)/mentor.tsx:296`; `hooks/use-lifeflow.tsx:347,411`), while tier comes from DB `subscription_tier`/`subscription_expires_at` (`use-lifeflow.tsx:259-267,922-944`). `subscriptionExpiresAt` is stored but never compared to `now` to revoke access.
- **Problem:** Two independent sources of truth and no expiry enforcement client-side.
- **Impact:** Paying users can be wrongly gated, or expired users keep premium until a webhook flips the tier.
- **Fix:** single gating helper that reconciles RC + DB and enforces `expiresAt > now`.

---

### #12 — On AI stream error the user's message is dropped, no retry — **S1**
- **Where:** `app/(tabs)/mentor.tsx:458-466` — catch logs + error haptic; `finally` clears `pendingUserMsg`, `streamingText`, `isStreaming`. The typed user message is never persisted and there is no retry affordance.
- **Problem:** A mid-stream failure discards what the user wrote.
- **Impact:** Confusing data loss in the primary feature; user must retype.
- **Fix:** keep the user message in the thread on error and offer "reintentar".

---

### #13 — Admin guard fallback hardcodes owner UUIDs in the client — **S1**
- **Where:** `app/admin/_layout.tsx:132-138` — on `42703`/`PGRST116`, grants admin to a hardcoded `OWNER_IDS` array.
- **Problem:** Privilege decision baked into the client bundle; brittle and leaks real user UUIDs.
- **Impact:** Anyone reading the bundle learns the owner account IDs; guard depends on a migration state.
- **Fix:** rely on server-enforced `is_admin` + RLS; remove the client allowlist.

---

### #14 — Mentoría notes & AI plan are local-only (lost on reinstall) — **S2**
- **Where:** `hooks/use-mentorship.tsx:85-92` persists to `lifeflow:v2:mentorship_notes` / `mentorship_plan` via `storage/local`; no Supabase write anywhere in the hook.
- **Problem:** Unlike check-ins/messages, mentorship data never syncs to the cloud.
- **Impact:** Reinstall or second device loses all session notes and generated plans.
- **Fix:** persist notes/plan to Supabase (a `weekly_sessions`/`mentorship_*` table) keyed by user.

---

### #15 — AI plan parsing is naive; prose answers yield junk/empty with no error — **S2**
- **Where:** `hooks/use-mentorship.tsx:152-164` — `out.split('\n').map(strip).filter(len>3).slice(0,5)`; no validation, no empty-result handling, no error surface.
- **Problem:** If the model returns a paragraph (it's instructed to return lines but not guaranteed), the result is 0-1 malformed items and the user sees nothing happen.
- **Impact:** "Generar con Norman" silently produces nothing on a non-conforming response.
- **Fix:** validate item count, show an error/retry when parsing yields < N items.

---

### #16 — Long chat history is not virtualized — **S2 (perf/memory)**
- **Where:** `app/(tabs)/mentor.tsx:486` ScrollView renders `displayMessages.map(...)` (`:625`); `loadMoreMentorMessages` prepends 50 at a time (`use-lifeflow.tsx:861`).
- **Problem:** All bubbles mount at once; no `FlatList`/windowing.
- **Impact:** Jank and memory growth for users with hundreds of messages.
- **Fix:** migrate to a virtualized list (inverted FlatList).

---

### #17 — Timezone/DST edge cases in same-day + streak logic — **S2**
- **Where:** `hooks/use-lifeflow.tsx:115-125` `isSameDay` slices stored ISO `YYYY-MM-DD` vs local `new Date()` parts; streak in `app/checkin.tsx:54-66` and `app/(tabs)/mentor.tsx:101-121` uses local `setHours(0,0,0,0)`.
- **Problem:** A check-in stored as UTC ISO compared against local date can fall on a different calendar day after travel/DST; streak can double-count or skip.
- **Impact:** Incorrect "today" detection and broken streaks for traveling users.
- **Fix:** standardize on a single timezone basis (store local date string, or normalize both sides to the user's tz).

---

### #18 — `loadUserData` caps check-ins at 30; messages at 50 — **S2**
- **Where:** `hooks/use-lifeflow.tsx:175` (`.limit(30)` checkins), `:178` (`.limit(50)` messages), `:179` (`.limit(100)` wellness).
- **Problem:** Averages and any "90-day" history view only ever see ≤30 check-ins after a reload.
- **Impact:** 90-day progress/analytics under-report for long-tenure users; mentor "recent" window is fine but historical views are truncated.
- **Fix:** paginate or raise limits for history/analytics screens.

---

### #19 — Disconnect wearable has no confirmation and doesn't revoke upstream — **S2**
- **Where:** `app/perfil/wearables.tsx:478-490` — sets `is_active=false` immediately on tap; no confirm dialog; provider token not revoked.
- **Impact:** Accidental disconnect with one tap; upstream OAuth grant remains active at Oura/WHOOP.
- **Fix:** confirm dialog + server-side token revocation.

---

### #20 — Onboarding/profile defaults to a fictional identity — **S2**
- **Where:** `hooks/use-lifeflow.tsx:47` default profile `{ name: 'Juan Carlos', role: 'Empresario' }`; onboarding finish falls back to the same (`app/(onboarding)/index.tsx:75`); seed mentor message (`use-lifeflow.tsx:50-56`).
- **Problem:** If a user skips/blank the name, the mentor and UI address a fictional "Juan Carlos".
- **Impact:** Broken first impression; mentor "I know you" personalization references the wrong identity.
- **Fix:** require a name (block finish) or derive from auth email.

---

### #21 — OAuth callback relies on a fixed 100 ms param-hydration delay — **S1/S2**
- **Where:** `app/oauth/oura/callback.tsx:32-35` and `app/oauth/whoop/callback.tsx:36-41` — `setTimeout(handleCallback, 100)`.
- **Problem:** If route params arrive later than 100 ms (slow web hydration), `code` reads as missing → false `no_code` error and redirect.
- **Impact:** Intermittent "No se recibió código" failures on slower clients.
- **Fix:** drive off the params being present (effect dependency / retry until present) instead of a fixed delay.

---

### #22 — Mentor messages written to two tables per turn — **S3**
- **Where:** `app/(tabs)/mentor.tsx:436` `addMentorMessages` (→ `mentor_messages`) AND `:439-448` `intel.conversations().insert(...)` (→ `mentor_conversations`), plus `addMemory` (`:452`).
- **Problem:** Same content persisted to multiple stores per message.
- **Impact:** Storage bloat / possible double-context; confirm intentional separation (history vs memory).
- **Fix:** confirm the separation is needed; dedupe if not.

---

### #23 — Web/native split-brain on `saveMentorMessage` (dev no-op) — **S3**
- **Where:** `hooks/use-lifeflow.tsx:810-812` returns early when `ENV.isDev`.
- **Problem:** In dev, this persistence path is skipped; behavior differs from prod and from the `mentor.tsx` insert path.
- **Impact:** Dev testing won't catch persistence regressions in this path; redundant with `addMentorMessages`.
- **Fix:** clarify ownership of message persistence (one path).

---

### #24 — OfflineBanner native ping to `1.1.1.1` may be blocked / cause false offline — **S3**
- **Where:** `components/OfflineBanner.tsx:19` `PING_URL='https://1.1.1.1/'`, HEAD every 10 s (`:55-57`).
- **Problem:** Some networks/captive portals/corporate firewalls block `1.1.1.1`; a blocked ping reads as offline even when Supabase is reachable.
- **Impact:** False "SIN CONEXIÓN" banner; user confusion.
- **Fix:** ping your own API origin (Supabase health) instead of a third-party IP.

---

### #25 — Breathing pause/resume re-animates phase from start; background timer drift — **S3**
- **Where:** `app/bienestar/respiracion.tsx:124-134` resume slides `startTimeRef` but re-runs `animatePhase(phaseIdx)` from 0; phase interval is JS `setInterval` (`:143-167`) that throttles in background.
- **Problem:** Resume restarts the current phase; background suspension desyncs the breathing circle from the timer.
- **Impact:** Minor UX inaccuracy in guided breathing after pause/background.
- **Fix:** persist phase elapsed and resume mid-phase; reconcile against wall-clock on foreground.

---

### #26 — `purchasePackage` success only handled when entitlements present; partial states unclear — **S3**
- **Where:** `app/paywall.tsx:67-74` — only shows success when `Object.keys(info.entitlements.active).length > 0`; otherwise nothing happens (no message).
- **Problem:** A purchase that completes but doesn't immediately reflect an active entitlement leaves the user with no feedback.
- **Impact:** Confusing "did it work?" state after pay.
- **Fix:** handle the no-entitlement-yet case explicitly (pending/verify message).

---

## Flows with NO error / empty / offline handling (operational immaturity)

Called out plainly, as requested:

- **AI mentor chat (`app/(tabs)/mentor.tsx`)** — has an empty state and a partial error haptic, but **no timeout, no cancel, and drops the user's message on error** (#2, #12). The single most important flow is the least resilient to a slow network.
- **Mentoría plan generation (`hooks/use-mentorship.tsx`)** — **no timeout, no parse-failure handling, no error UI, no cloud persistence** (#14, #15). Operationally immature: a non-conforming or slow AI response just does nothing.
- **All core-loop writes (check-in, lessons, north-star, wellness)** — optimistic local update with **silently swallowed** server errors and **no offline queue** (#5). The app cannot honestly tell a user their data didn't save.
- **Admin Mission Control (`app/admin/index.tsx`)** — **no catch on data load**; one failing query = infinite spinner (#6). No error state at all.
- **Web password reset** — **no completion path** exists (#7). Half a flow.
- **Wearable connect (native)** — redirect mismatch means the **success path may never run**, and there is no timeout on the auth session wait (#4).
- **Subscriptions on web** — **dead-end** (no purchase path) with a CTA that can't complete (`paywall.tsx:55-61`).

These are the areas to harden first; the rest of the app (onboarding, breathing, theme, navigation, GDPR export/delete UI) is comparatively complete, with visible loading/empty/error states.
