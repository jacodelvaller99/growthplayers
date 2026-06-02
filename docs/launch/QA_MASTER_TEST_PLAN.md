# QA MASTER TEST PLAN — Polaris / LifeFlow

**Audited build:** branch `main` (worktree `sweet-diffie`)
**Author:** Team 2 — Product QA (pre-launch adversarial audit)
**Method:** Code-driven. Flows enumerated by reading `app/`, `hooks/use-lifeflow.tsx`, `lib/mentor.ts`, `lib/wearables.ts`, `services/revenuecat.ts`, `app/(auth|onboarding|tabs)`, `app/bienestar`, `app/mentoria`, `app/admin`, `app/oauth`, `app/paywall.tsx`. Test matrix reflects what actually exists in the code, not generic assumptions.

**Platforms:** `iOS` (native), `AND` (Android native), `WEB` (Expo static export / Vercel PWA, SPA mode).

**Severity scale (if the flow breaks):**
- **S0 Blocker** — launch must not proceed. Data loss, security exposure, unrecoverable hang, payment failure, or core loop dead.
- **S1 Critical** — major flow broken for many users; ship only with a documented hotfix plan.
- **S2 Major** — degraded experience, workaround exists.
- **S3 Minor** — polish / edge case.

> Cross-references: release-blocking rows are expanded in `RELEASE_BLOCKER_MATRIX.md`; concrete code defects are in `KNOWN_ISSUES_REGISTER.md`; the go/no-go checklist is `PRELAUNCH_SMOKE_TEST.md`.

---

## 0. Architecture facts that shape every test

These were confirmed in code and drive most of the risks below:

- **State source of truth:** `hooks/use-lifeflow.tsx` (React Context + local cache `lifeflow:v2:state`). Two-phase init: instant render from `localStorage` (web) then `backgroundRefresh`.
- **`userId` is exposed as `uidRef.current`** (a ref read inside the context value object) — `use-lifeflow.tsx:962`. It does NOT independently trigger re-render; consumers in `useEffect([userId])` can observe a stale `null`. Affects admin guard, smart-notifications, intelligence, weekly-session, wearables. See KNOWN_ISSUES #1.
- **AI mentor has NO request timeout / AbortController** anywhere in `lib/nvidia.ts`, `lib/groq.ts`, `lib/openai.ts`, or `lib/mentor.ts`. A stalled stream hangs the chat indefinitely with input disabled and no cancel. See KNOWN_ISSUES #2.
- **AI provider keys are `EXPO_PUBLIC_*`** → inlined into the web JS bundle and readable by anyone. `app/config/env.ts`, `lib/groq.ts:33`. See KNOWN_ISSUES #3.
- **Most Supabase writes are silent `try/catch + console.warn`** — local state updates optimistically, the user never learns the server write failed (`saveCheckIn`, `markLessonComplete`, `addMentorMessages`, `updateNorthStar`, etc.). See KNOWN_ISSUES #5.
- **Web auth has no detectSessionInUrl** (`lib/supabase.ts:49`) — password-reset / magic-link callbacks that arrive as URL hash tokens are NOT auto-consumed. See KNOWN_ISSUES #7.
- **Native OAuth redirect mismatch:** `REDIRECT_BASE` in dev is `exp://localhost:8081` but the native in-app browser closes on `growthplayers://oauth` (`lib/wearables.ts:23`, `app/perfil/wearables.tsx:434`). See KNOWN_ISSUES #4.

---

## 1. Authentication & Session

| # | Flow | Platform | Steps | Expected | Sev if broken |
|---|------|----------|-------|----------|---------------|
| A1 | Register (valid access code) | iOS/AND/WEB | Welcome → Registrarse → email+pass(≥6)+code → CREAR CUENTA | Code validated against `access_codes`, account created, "revisa tu email" shown, `uses_count` incremented | S0 |
| A2 | Register — invalid / expired / exhausted / inactive code | iOS/AND/WEB | Enter bad code variants | Distinct error per case (`app/(auth)/index.tsx:117-134`); account NOT created | S1 |
| A3 | Register — code race (two users, `max_uses=1`) | all | Both submit same code simultaneously | **RISK:** non-atomic read-then-update (`index.tsx:111-149`) lets both succeed → over-redemption | S1 |
| A4 | Register — password < 6 chars | all | Enter short password | Inline validation, no network call | S2 |
| A5 | Login (valid) | all | Iniciar sesión → email+pass → ENTRAR | `onAuthStateChange SIGNED_IN` → `router.replace('/(tabs)/comando')` (`index.tsx:46-56`) | S0 |
| A6 | Login — wrong credentials | all | Bad password | "Email o contraseña incorrectos." | S1 |
| A7 | Login — unconfirmed email | all | Sign in before confirming | "Confirma tu email…" | S2 |
| A8 | Login — offline / no network | all | Kill network, submit | catch → "Error de conexión…" (`index.tsx:89`) | S1 |
| A9 | Forgot password — request | all | forgot → email → ENVIAR ENLACE | `resetPasswordForEmail`, success copy shown | S1 |
| A10 | Forgot password — **complete reset on web** | WEB | Click email link → returns to app | **RISK:** `detectSessionInUrl:false` → recovery token in URL not consumed; no in-app "set new password" screen exists. Reset likely dead on web. | S0 |
| A11 | Logout | all | Perfil → CERRAR SESIÓN → confirm | `signOut()` clears session + local state, `router.replace('/')` → welcome (`progreso.tsx:455-469`, `use-lifeflow.tsx:946`) | S1 |
| A12 | Session recovery — warm start (returning user) | all | Reopen app after prior login | Instant skeleton → `comando`; `getInitialState()` reads cache, `backgroundRefresh` syncs (`use-lifeflow.tsx:317,398`) | S0 |
| A13 | Session recovery — cold start (process killed) | iOS/AND | Force-kill, relaunch | `getSession()` from SecureStore restores session; if expired, auto-refresh | S0 |
| A14 | Token expired mid-session | all | Idle past token TTL, then act | `autoRefreshToken:true` should refresh; if refresh fails, writes silently fail (no forced re-login). **RISK** | S1 |
| A15 | Account deletion (GDPR) | iOS/AND/WEB | Perfil → ELIMINAR CUENTA → 2-step confirm | `delete-account` edge fn invoked, local cleared, `router.replace('/')` (`progreso.tsx:515-543`, `use-lifeflow.tsx:892`) | S0 |
| A16 | Account deletion — edge fn 500 / offline | all | Trigger with fn down | Throws → "No se pudo eliminar la cuenta: …" alert; user stays logged in. Verify no partial delete | S1 |
| A17 | Data export (GDPR) | iOS/AND/WEB | Perfil → exportar | JSON built from state + journal; web downloads blob, native share (`progreso.tsx:488-512`, `use-lifeflow.tsx:902`) | S2 |
| A18 | Anonymous dev-bypass leakage | all | Build with placeholder Supabase URL | `signInAnonymously()` only when `IS_PLACEHOLDER_URL` (`use-lifeflow.tsx:362`). Confirm prod URL is real so this never triggers in prod | S0 |
| A19 | Auth guard redirect loop | all | Unauth → deep link to `/(tabs)/mentor` | `_layout.tsx` + `(tabs)/_layout.tsx:143` redirect to `/(auth)`; no loop | S1 |
| A20 | Reinstall (fresh install, prior cloud data) | iOS/AND | Delete app, reinstall, login | No local cache → `loadUserData` rehydrates from Supabase; profile present → onboarding skipped | S1 |

---

## 2. Onboarding

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| O1 | Full 5-step wizard | all | Welcome→Identidad→Obstáculo→Código→Norte→INICIAR PROTOCOLO | `completeOnboarding` persists profile+north, `protocolStartDate=now`, redirect to comando (`(onboarding)/index.tsx:73-80`) | S0 |
| O2 | Apply access code in onboarding (no session) | all | Step 3 APLICAR with `userId==null` | "Sesión no encontrada…" (`(onboarding)/index.tsx:50-54`) | S2 |
| O3 | Apply code — invalid/exhausted/expired/inactive | all | Bad code via `redeemAccessCode` | Mapped error message (`index.tsx:62-70`) | S2 |
| O4 | Skip code / skip obstacle | all | "Continuar sin código →" / "Completar después →" | Proceeds; defaults used | S3 |
| O5 | Empty name/role on finish | all | Leave blank → INICIAR | Falls back to "Juan Carlos"/"Empresario" (`index.tsx:75`). **RISK:** generic seed identity ships to a real user; mentor greets wrong name | S2 |
| O6 | Keyboard overlap on multiline fields | iOS/AND | Focus Norte textareas | `KeyboardAvoidingView` present; verify last field not hidden behind keyboard | S2 |
| O7 | Onboarding guard | all | `onboardingCompleted=false` reach tabs | Redirect `/(onboarding)` (`(tabs)/_layout.tsx:147`) | S1 |
| O8 | Reset onboarding (debug/perfil) | all | `resetOnboarding()` | `protocol_start_date=null` in DB, re-enters wizard (`use-lifeflow.tsx:829`) | S3 |
| O9 | Back/forward step state retention | all | Navigate steps back and forth | Field values retained in local state | S3 |

---

## 3. Daily Check-in

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| C1 | First check-in of the day | all | comando → Check-in → set 4 sliders + need → GUARDAR | `saveCheckIn` upserts (`onConflict user_id,date`), sovereign_score computed, redirect comando (`checkin.tsx:95-106`, `use-lifeflow.tsx:574`) | S0 |
| C2 | Re-submit same day | all | Open check-in again | Pre-filled from `todayCheckIn`; upsert replaces (dedupe by `isSameDay`, `use-lifeflow.tsx:583`) | S1 |
| C3 | Check-in offline | all | No network, GUARDAR | Local state updates, redirect happens; Supabase write swallowed (`use-lifeflow.tsx:609`). **RISK:** user believes saved; on reinstall it's gone | S1 |
| C4 | Streak computation | all | Submit on consecutive days | `computeStreak` counts contiguous days from today (`checkin.tsx:54-66`, `mentor.tsx:101`) | S2 |
| C5 | Timezone change mid-streak | all | Travel across timezone, submit | `isSameDay` compares `YYYY-MM-DD` of local `new Date()` vs stored slice (`use-lifeflow.tsx:115`). **RISK:** DST/timezone shift can double-count or skip a day | S2 |
| C6 | Coherence/index live preview | all | Move sliders | Index recomputes `(e+c+sleep+(11-stress))/4` (`checkin.tsx:74`) | S3 |
| C7 | System-need empty | all | Submit with blank textarea | Defaults to "Orden, foco y ejecucion sin ruido." (`checkin.tsx:101`) | S3 |
| C8 | Notification deep-link into check-in | iOS/AND | Tap daily reminder | `router.push('/checkin')` (`_layout.tsx:191`) | S2 |
| C9 | 90-day history present | all | User with 90 check-ins | `loadUserData` limits to 30 (`use-lifeflow.tsx:175`); averages from ≤30. Confirm progreso charts handle the cap | S2 |

---

## 4. AI Mentor "Norman" (streaming chat)

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| M1 | Send message → stream | iOS/AND/WEB | Type → send | Fallback chain NVIDIA→Groq→OpenAI→dev sim (`lib/mentor.ts:638`); tokens render in TypingBubble; persisted via `addMentorMessages` | S0 |
| M2 | NVIDIA skipped on web (CORS) | WEB | Send on web | `isWeb` guard jumps to Groq (`mentor.ts:661`) | S1 |
| M3 | **All providers slow / network stalls** | all | Send, then stall connection | **RISK S0:** no timeout/abort → `isStreaming` stuck true forever, input `editable={!isStreaming}` locked, send disabled, no cancel button (`mentor.tsx:694,705`; no abort in any provider) | S0 |
| M4 | All providers fail (4xx/5xx) | all | Force every key invalid | Each throws, caught, falls to `streamDevSimulation` → user still gets a canned reply (`mentor.ts:688`) | S1 |
| M5 | Empty/malformed AI response | all | Provider returns empty stream | `fullText || '…'` → bubble shows "…" (`mentor.tsx:431`). Verify no crash, but UX is a lone ellipsis | S2 |
| M6 | Streaming error mid-stream | all | Drop connection after first tokens | catch logs, haptic error, partial text discarded, `pendingUserMsg` cleared — **user message vanishes**, no retry (`mentor.tsx:458-466`). **RISK** | S1 |
| M7 | Free-tier gate | all | 3rd user message unsubscribed | `isGated` → push `/paywall` (`mentor.tsx:296,325`) | S1 |
| M8 | Contextual memory injection | all | Send after check-ins/tasks exist | `buildSystemPrompt` includes patterns, intelligence, biometrics, top-K memories (`mentor.ts:206`) | S2 |
| M9 | Memory search failure | all | `mentor_memories` table missing | `searchMemories` returns [] gracefully; chat continues | S2 |
| M10 | Load older messages (pagination) | all | Scroll, "CARGAR MENSAJES ANTERIORES" | `loadMoreMentorMessages` pages 50 (`use-lifeflow.tsx:861`) | S2 |
| M11 | Quick-prompt chips | all | Tap chip | `submit(label)`; module-specific prompts (`mentor.tsx:559`) | S3 |
| M12 | Auto-send initialPrompt from home | all | Navigate with `?initialPrompt` | 800 ms delayed auto-submit (`mentor.tsx:471-478`) | S3 |
| M13 | Conversation persisted twice | all | Send a message | Saved to both `mentor_messages` and `mentor_conversations` (`mentor.tsx:439`). Confirm intentional, not double-billing context | S3 |
| M14 | Opening message — extreme states | all | 3+ high-stress / low-energy days | Pattern-aware opener (`mentor.tsx:60-64`) | S3 |
| M15 | New user, zero data | all | Day-1 first chat | Day-1 opener + commitment primer render (`mentor.tsx:68`) | S2 |
| M16 | Threads modal | all | CHATS button | Loads `mentor_threads` or "Sin conversaciones" empty state (`mentor.tsx:659`) | S3 |
| M17 | AI key exposed in web bundle | WEB | Inspect built JS | **RISK S0 security:** `EXPO_PUBLIC_GROQ/OPENAI` keys shipped client-side; quota theft | S0 |

---

## 5. Weekly Mentoría (`app/mentoria` — notes → AI plan)

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| MT1 | Add session note | all | Pick week chip → write → GUARDAR NOTA | Note persisted to `lifeflow:v2:mentorship_notes` (`use-mentorship.tsx:95`) | S2 |
| MT2 | Generate AI plan from notes | all | GENERAR CON NORMAN | Streams via `streamMentorResponse`, parses lines → 3-5 ActionItems (`use-mentorship.tsx:133-170`) | S1 |
| MT3 | Generate with no notes | all | Button with `notes.length==0` | Disabled (`mentoria/index.tsx:101`) | S3 |
| MT4 | Generate — AI returns prose, not list | all | Model ignores "one per line" | **RISK:** naive `split('\n')` + regex; a paragraph answer yields 0-1 junk items or none. No validation/retry/error surface (`use-mentorship.tsx:152-164`) | S2 |
| MT5 | Generate — AI hangs (no timeout) | all | Slow provider | **RISK:** `generating` stuck true, spinner forever (inherits M3 root cause) | S1 |
| MT6 | Plan not synced to cloud | iOS/AND | Generate plan, reinstall | **RISK:** mentorship notes+plan are local-only (`storage/local`), never written to Supabase → lost on reinstall/new device | S2 |
| MT7 | Toggle / remove action items | all | Check/uncheck/delete | Local persist (`use-mentorship.tsx:112,128`) | S3 |
| MT8 | Add manual action | all | Type → add | Manual item added; AI regen preserves manual items (`use-mentorship.tsx:166-168`) | S3 |
| MT9 | Week status vs protocolDay | all | Advance days | Timeline `weekStatus` reflects current week (`mentoria/index.tsx:167`) | S3 |

---

## 6. Programs / Modules / Lessons / Tasks

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| P1 | Open module overview | all | programas → module/[id] | Module renders; locked state for non-subs | S1 |
| P2 | Open lesson | all | module → lesson/[id] | Lesson player renders by id | S1 |
| P3 | Mark lesson complete | all | Complete lesson | `markLessonComplete` upsert; idempotent guard (`use-lifeflow.tsx:717-719`) | S2 |
| P4 | Save lesson task | all | Fill task responses → save | `saveLessonTask` upsert keyed `user_id,lesson_id` (`use-lifeflow.tsx:679`) | S2 |
| P5 | Task with unknown lessonId | all | Lesson not in `LESSON_TASKS` | Early return, no save (`use-lifeflow.tsx:682`) — verify UI doesn't claim success | S2 |
| P6 | Module progress % in mentor | all | Complete some lessons | `activeModProgress` computed from `completedLessons` (`mentor.tsx:364-371`) | S3 |
| P7 | Subscription gate on locked modules | all | Free user opens premium module | Paywall / lock; verify `isSubscribed` source | S1 |
| P8 | Offline lesson completion | all | Complete offline | Local marks complete; cloud write swallowed (`use-lifeflow.tsx:739`). **RISK** sync gap | S2 |

---

## 7. Wellness Library + Breathing / Audio

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| W1 | Open wellness hub + library | all | bienestar/index, biblioteca | Catalog renders | S2 |
| W2 | Breathing session run to completion | all | respiracion → técnica → INICIAR | Phase timers advance, cycles count, completion saves `wellnessSession` + bonus (`respiracion.tsx:143-167`; `use-lifeflow.tsx:746`) | S1 |
| W3 | Pause / resume breathing | all | PAUSAR then REANUDAR | Timers cleared/restored; `startTimeRef` slid by paused duration (`respiracion.tsx:113-134`) | S2 |
| W4 | Stop mid-session | all | DETENER | `storeStop()`, no session saved; verify mini-player clears (`respiracion.tsx:267`) | S2 |
| W5 | Background the app mid-breathing | iOS/AND | Home button during session | **RISK:** JS interval timers throttle/suspend in background; on resume elapsed jumps (uses wall-clock `Date.now()` so partial mitigation) — verify no crash, no NaN | S2 |
| W6 | Navigate away mid-session (memory leak) | all | Exit screen while running | **RISK:** `onComplete`/`storeStop` only fire on natural end or explicit stop; unmount during run — confirm intervals cleared by effect cleanup (`respiracion.tsx:169-183`) and store not left "playing" | S2 |
| W7 | Audio binaurales/meditación playback | iOS/AND/WEB | Play a binaural/meditation | Audio plays; verify lock-screen/background audio + no leak on unmount | S1 |
| W8 | Wellness mini-player across tabs | all | Start session, switch tab | `WellnessMiniPlayer` persists via Zustand store | S2 |
| W9 | Wellness bonus to sovereign score | all | Complete meditation | +5/+3/+2 by type, capped 1000 (`use-lifeflow.tsx:789-805`) | S3 |
| W10 | Other bienestar tools (diario, grito, tapping, ayuno, hábitos, etc.) | all | Open each | Each loads without crash; verify empty states | S2 |

---

## 8. Biometrics — Oura / WHOOP / OAuth

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| B1 | Connect Oura (web) | WEB | wearables → CONECTAR OURA | `window.location.href = OAUTH_URLS.oura` → consent → `/oauth/oura/callback?code` → edge fn → `?connected=oura` (`wearables.tsx:424`, `oauth/oura/callback.tsx`) | S1 |
| B2 | Connect WHOOP (web) | WEB | CONECTAR WHOOP | Same as B1 for whoop | S1 |
| B3 | Connect (native, in-app browser) | iOS/AND | CONECTAR | `WebBrowser.openAuthSessionAsync(url,'growthplayers://oauth')`; **RISK:** redirect_uri built from `REDIRECT_BASE` (web/exp URL) ≠ the `growthplayers://oauth` close-scheme → success branch may never fire (`wearables.tsx:23,434-436`) | S1 |
| B4 | OAuth denied by user | all | Click "Deny" on provider | callback `error` param → error UI → redirect `?error=denied` → banner (`oauth/*/callback.tsx:40-44`; `wearables.tsx:408-415`) | S2 |
| B5 | OAuth no `code` returned | all | Malformed callback | "No se recibió código…" → `?error=no_code` (`callback.tsx:47-51`) | S2 |
| B6 | Token exchange edge fn 500 | all | sync-wearables down | throw → "Error al intercambiar tokens" → `?error=exchange_failed` (`callback.tsx:63-68`) | S1 |
| B7 | OAuth `state` CSRF validation | all | Tamper `state` param | **RISK:** `state` generated (`wearables.tsx:46`) but NEVER verified in callback — no CSRF protection on token exchange | S1 |
| B8 | Manual sync | all | SINCRONIZAR AHORA | `triggerWearableSync(userId, provider)`; success/error banner (`wearables.tsx:462-475`) | S2 |
| B9 | Disconnect device | all | Desconectar | `wearable_connections.is_active=false`, reload, banner (`wearables.tsx:478-490`). **RISK:** no confirmation dialog; immediate; tokens not revoked upstream | S2 |
| B10 | Connected card with no daily data | all | Just connected, no sync yet | "Sin datos hoy — sincroniza" empty state (`wearables.tsx:214`) | S3 |
| B11 | Biometrics feed Norman | all | Chat after connecting | `biometricProvider/Readiness/Hrv/RestingHr` injected (`mentor.tsx:407-413`); HRV humanized, never raw | S2 |
| B12 | `useWearableDaily` not user-scoped | all | Query daily | **RISK:** queries `wearable_daily` with `.gte(date)` but NO `.eq(user_id)` (`wearables.ts:174-178`) — relies entirely on RLS; if RLS missing → cross-user data leak | S0 |

---

## 9. Subscriptions / Paywall

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| S1 | Open paywall, load offerings | iOS/AND | paywall mount | `getOfferings()`; annual pre-selected (`paywall.tsx:42-50`) | S1 |
| S2 | Offerings fail to load | iOS/AND | RC offline | `getOfferings` returns null → packages [] → CTA disabled, label "COMPROMETERSE…" but `disabled` (`paywall.tsx:50,208`). **RISK:** no error message, looks broken | S2 |
| S3 | Purchase success | iOS/AND | ME COMPROMETO → buy | `purchasePackage`, entitlement check, success alert, `router.back()` (`paywall.tsx:67-74`) | S0 |
| S4 | Purchase cancelled | iOS/AND | Cancel native sheet | `userCancelled` swallowed → no error, no state change (`revenuecat.ts:72`) | S2 |
| S5 | Purchase error | iOS/AND | Card declined etc. | "Error en la compra" alert (`paywall.tsx:76-82`) | S1 |
| S6 | Restore purchases | iOS/AND | Restaurar | Active→restored alert; none→"Sin suscripción activa" (`paywall.tsx:87-105`) | S1 |
| S7 | Paywall on web | WEB | Try to buy on web | "descarga la app en iOS o Android" alert (`paywall.tsx:56-61`). **RISK:** web users can never subscribe → web is permanently free/locked. Confirm intended | S1 |
| S8 | Tier realtime sync | all | Admin grants tier in DB | `postgres_changes` UPDATE on `profiles` → `subscriptionTier` updates live (`use-lifeflow.tsx:372-391`) | S2 |
| S9 | `isSubscribed` vs `subscriptionTier` divergence | all | RC says subbed, DB says free | Two sources: `checkSubscription()` (RC) sets `isSubscribed`; tier from DB. Mentor gate uses `isSubscribed` (`mentor.tsx:296`), modules may use tier. **RISK:** inconsistent gating | S1 |
| S10 | Plan change / downgrade | all | Cancel sub, tier expires | `subscriptionExpiresAt` stored but no client check that expiry < now to revoke. **RISK:** expired users keep access until webhook flips tier | S1 |

---

## 10. Admin Panel

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| AD1 | Admin guard (is_admin) | all | Non-admin opens /admin | `intel.profiles().is_admin` check; non-admin → redirect comando (`admin/_layout.tsx:121-144`) | S0 |
| AD2 | Admin guard — column missing fallback | all | `is_admin` not migrated | **RISK:** hardcoded `OWNER_IDS` allowlist grants access (`admin/_layout.tsx:132-138`); brittle, ships real UUIDs in bundle | S1 |
| AD3 | Admin guard — userId stale null | all | Cold open /admin deep link | **RISK:** if `userId` (ref) is null at first effect run, `setIsAdmin(false)` and no re-check when ref later populates → false lockout (`admin/_layout.tsx:122-123`; ties to KNOWN_ISSUES #1) | S1 |
| AD4 | Mission Control KPIs load | all | /admin | `fetchDashboardKPIs/LiveEvents/TierCounts` (`admin/index.tsx:127-138`); loading spinner | S2 |
| AD5 | KPI query failure | all | Tables/views missing | **RISK:** `Promise.all` with no catch in `loadData` → unhandled rejection, `loading` stuck true, infinite spinner (`admin/index.tsx:127-140,164`) | S1 |
| AD6 | Recalculate ML | all | RECALCULAR ML | `recalculateAllMLAction(userId)`; button disables (`admin/index.tsx:150-155`) | S2 |
| AD7 | Usuarios list + detail | all | usuarios, usuarios/[id] | List + per-user view | S2 |
| AD8 | Membresías / códigos / cursos / contenido / auditoría | all | Open each admin sub-route | Each loads; verify empty/error states | S2 |
| AD9 | Admin routes hidden from regular users | all | Regular user nav | No admin entry; direct URL blocked by AD1 | S0 |

---

## 11. Theme (light/dark web) & Cross-cutting UI

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| T1 | Toggle light/dark (web) | WEB | Switch theme | CSS variables swap (`AppThemeProvider`); persists across reload | S2 |
| T2 | Dark-mode contrast | all | Audit gold-on-dark, smoke text | Min AA contrast; `palette.smoke`/`ash` on dark bg often low — verify labels ≥ 4.5:1 | S2 |
| T3 | Light-mode contrast (recent feature) | WEB | Light theme on accent cards | Recent commits touched light-mode readability; verify gold text on light bg readable | S2 |
| T4 | Desktop sidebar vs tab bar | WEB | Resize ≥1200px | Sidebar shows, tab bar `display:none` (`(tabs)/_layout.tsx:85`); auth/onboarding hide sidebar (`_layout.tsx:110-113`) | S2 |
| T5 | Font load failure fallback | all | Block font assets | 4 s hard timeout renders anyway (`_layout.tsx:161-170`) | S1 |
| T6 | Accessibility labels | all | Screen reader pass | Many buttons have `accessibilityLabel`; audit sliders, chat bubbles, charts | S2 |
| T7 | Keyboard overlap (chat input, check-in, onboarding) | iOS/AND | Focus inputs | `KeyboardAvoidingView` used; verify send button + last field reachable | S2 |
| T8 | Scroll performance long chat | all | 200+ messages | ScrollView (not FlatList) renders all bubbles (`mentor.tsx:486,625`). **RISK:** no virtualization → jank/memory on long history | S2 |
| T9 | RTL / long-name layout | all | 40-char name | No clipping in headers/greeting | S3 |

---

## 12. Notifications & Deep Links

| # | Flow | Platform | Steps | Expected | Sev |
|---|------|----------|-------|----------|-----|
| N1 | Smart notification toast poll | all | App open with pending notif | `intel.notifications` polled every 60 s; marked sent first, then toast (`use-smart-notifications.ts:15-43`) | S2 |
| N2 | Notification permission request | iOS/AND | Enable reminders in perfil | `requestNotificationPermissions`; denied → alert (`progreso.tsx:433-438`) | S2 |
| N3 | Schedule daily check-in reminder | iOS/AND | Toggle on | `scheduleCheckinReminder(protocolDay)` | S2 |
| N4 | Tap notification → check-in | iOS/AND | Tap | `addNotificationResponseReceivedListener` → push `/checkin` (`_layout.tsx:187-196`) | S2 |
| N5 | Deep link / OAuth callback timing | all | Land on callback route directly | 100 ms delayed `handleCallback` for param hydration (`oauth/*/callback.tsx:32-35`). **RISK:** params arriving later than 100 ms on web → false "no_code" | S1 |
| N6 | Smart-notif userId stale | all | Cold start | Effect keyed on `userId` (ref) — may not start polling until a re-render bumps it (KNOWN_ISSUES #1) | S2 |

---

## 13. Stress / Resilience Matrix (apply to all critical flows)

| # | Condition | Where it bites | Expected | Sev |
|---|-----------|----------------|-----------|-----|
| R1 | Cold start | A12-A13, app boot | Skeleton then content; splash hidden ≤4 s (`_layout.tsx`) | S0 |
| R2 | Warm start | A12 | Instant cached render | S1 |
| R3 | App killed/restored | A13, breathing W5 | Session + state restored; timers safe | S0 |
| R4 | Token expired | A14 | Auto-refresh or clean re-login (currently silent fail) | S1 |
| R5 | Slow / flaky internet | M3, MT5, B6, S2 | Visible loading + timeout + retry. **Currently: AI has none** | S0 |
| R6 | No internet (offline) | C3, P8, all writes | OfflineBanner shows (`OfflineBanner.tsx`); writes queued or clearly failed. **Currently: silent swallow** | S1 |
| R7 | API/Edge fn timeout | B6, AD5, A16 | Error surfaced, not infinite spinner | S1 |
| R8 | Supabase down | boot, loadUserData | `loadUserData` returns null → falls back to local cache (`use-lifeflow.tsx:182,441-446`) | S1 |
| R9 | Edge Function 500 | B6, A16, MT2 | Caught + user-visible error | S1 |
| R10 | AI empty/malformed/slow | M3, M5, MT4 | Graceful fallback; no hang. **Slow = hang today** | S0 |
| R11 | User with no data | M15, comando, progreso | Empty states, no NaN/crash | S1 |
| R12 | User with extreme data | C5, M14 | Pattern logic stable | S2 |
| R13 | 90-day history | C9, M10, T8 | Capped queries, virtualized lists | S2 |
| R14 | Timezone / DST change | C5 | No double/skip day | S2 |
| R15 | Plan change / expiry | S8-S10 | Access revoked on expiry | S1 |
| R16 | Reinstall | A20, MT6 | Cloud rehydrate; local-only data (mentorship) is lost — document | S1 |
| R17 | Accessibility basics | T6 | Labels, focus order, contrast | S2 |
| R18 | Keyboard overlap | T7, O6 | Inputs reachable | S2 |
| R19 | Scroll perf / memory leak | T8, W6, W7 | No jank, intervals/audio released | S2 |
| R20 | Dark-mode contrast | T2-T3 | AA contrast | S2 |

---

## Test-execution notes

- **Device matrix (minimum):** 1 low-end Android (throttled CPU + slow 3G), 1 iPhone (notch + Dynamic Island safe-area), 1 desktop Chrome (≥1200px) + 1 mobile Safari (PWA).
- **Network simulation is mandatory** for M3/M5/R5/R10 — use Charles/devtools "Slow 3G" + offline toggles. The AI-hang blocker only surfaces under a stalled (not dropped) connection.
- **RLS verification is mandatory** for B12/AD1 — query `wearable_daily`, `daily_checkins`, `mentor_messages` as user A while authenticated as user B; expect zero rows. This cannot be inferred from client code.
- **Reinstall test** must cover mentoría notes/plan (local-only) and offline-only check-ins to quantify silent data loss.
