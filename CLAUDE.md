# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Polaris Growth Institute** — a React Native / Expo app (iOS, Android, Web PWA) for personal high-performance coaching. Users follow a 90-day "Protocolo Soberano", interact with an AI mentor named Norman, and track biometrics + wellness.

## Commands

```bash
# Development
npm run start           # Expo dev server (choose platform interactively)
npm run web             # Web only (localhost:8081)
npm run ios             # iOS simulator
npm run android         # Android emulator

# Quality
npm run lint            # ESLint via expo lint
npx tsc --noEmit        # TypeScript check (no build output)

# Quality gates
npm run typecheck       # tsc --noEmit — debe salir 0

# Tests — suite real en __tests__/unit/ (53 tests, 6 suites):
#   utils (protocolDay/sovereignScore) · mentorship (weekDateRange/semanas)
#   themeColors (paridad dark/light + cv) · moderation (filtro UGC)
#   mentor (cadena de fallback + contrato honestidad/crisis) · sse (parseSSEStream)
npm test                              # Jest — all tests
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report
npx jest __tests__/unit/mentor.test.ts   # Single test file
# CI (.github/workflows/ci.yml): lint + typecheck + test + export web en cada push/PR

# Web build & deploy
npx expo export --platform web        # Outputs to dist/
# Deployed to Vercel automatically on push to main
# vercel.json: buildCommand = "npx expo export --platform web"

# Native builds (EAS)
# ⚠ BLOQUEADO: app.json extra.eas.projectId es placeholder (00000000-…) —
#   correr `eas init` con la cuenta del proyecto antes de cualquier build nativo.
eas build --profile preview --platform ios
eas build --profile production --platform all

# Supabase edge functions
supabase functions deploy calculate-intelligence
supabase functions deploy generate-embeddings
supabase functions deploy smart-notifications
supabase functions deploy sync-wearables
supabase functions deploy delete-account        # GDPR account deletion
supabase functions deploy create-user           # admin crea usuario real (service-role, gate is_admin)
supabase functions deploy ml-dashboard
```

## Environment Variables (`.env.local`)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_NVIDIA_API_KEY=        # Primary AI (NVIDIA NIM)
EXPO_PUBLIC_GROQ_API_KEY=          # Secondary AI (Groq)
EXPO_PUBLIC_OPENAI_API_KEY=        # Fallback AI + Whisper (transcripción de sesiones de mentoría)
EXPO_PUBLIC_REVENUECAT_KEY=        # Subscriptions
```

All are `EXPO_PUBLIC_*` (inlined at build time, client-side only). Defined in `app/config/env.ts`.

> **Install note:** always use `npm install --legacy-peer-deps` (required by peer dep conflicts in react-native-purchases + expo 54).

## Architecture

### Routing — Expo Router (file-based)

```
app/
  _layout.tsx          # Root: fonts, auth guard, ThemeProvider, ErrorBoundary, DesktopSidebar
  (auth)/              # Login / register / welcome — redirected to when unauthenticated
  (onboarding)/        # Profile wizard + CONSENT GATE (términos/privacidad/salud) — redirected to when !onboardingCompleted
  (tabs)/              # Main app: comando, norte, programas, mentor, progreso
  bienestar/           # Wellness hub (see "Wellness integral system" below):
                       #   prácticas:           binaurales, meditacion, respiracion, sueno, diario, biblioteca
                       #   sistema integral:    habitos, ayuno, nutricion, cuerpo, suplementacion, biometrics
                       #   liberación emocional: grito, tapping, consciencia · comunidad (feed)
  mentoria/            # Weekly mentorship journey + voice session recording → AI notes/plan
  comunidad/           # Internal DM: mensajes (inbox), chat/[id] (1-a-1)
  legal/               # privacidad, terminos, salud (health disclaimer)
  perfil/              # wearables (WHOOP / Oura connect)
  oauth/               # whoop/callback, oura/callback
  admin/               # Admin panel: usuarios, membresías, cursos, codigos, inteligencia, contenido, auditoria, comunidad
  lesson/[id].tsx      # Individual lesson player
  module/[id].tsx      # Module overview
  checkin.tsx          # Daily check-in modal
  paywall.tsx          # Subscription upsell modal · pricing.tsx — plans
```

**Auth guards (3 capas):** `app/index.tsx` redirige al entrar (no auth → `/(auth)`, sin onboarding → `/(onboarding)`); `app/(tabs)/_layout.tsx:143` repite el check para el grupo de tabs; y `MainStack` en `app/_layout.tsx` envuelve TODAS las rutas privadas en `<Stack.Protected guard={…}>` — un deep link sin sesión nunca renderiza contenido privado (verificado E2E en prod). Públicas: `index`, `(auth)`, `(onboarding)`, `legal/*`, `pricing`, `oauth/*/callback`.

Desktop (web ≥1200px): `DesktopSidebar` is rendered as a flex row sibling to the main stack. Bottom tab bar is hidden (`display: 'none'`). Controlled by `useBreakpoint()`.

### Global State — `useLifeFlow` hook

The **single source of truth** is a React Context in `hooks/use-lifeflow.tsx`. It holds:
- `state: LifeFlowState` — profile, northStar, checkIns, mentorMessages, completedLessons, subscriptionTier
- Supabase auth + real-time sync
- Local persistence via `storage/local.ts` (SecureStore on native, localStorage on web) under namespace `lifeflow:v2`

Access anywhere: `const { state, updateProfile, addCheckIn, ... } = useLifeFlow()`.

Wellness-player state (mini-player across tabs) lives separately in `store/wellnessStore.ts` (Zustand).

Other domain state lives in dedicated hooks: `hooks/use-mentorship.tsx` (mentorship sessions + AI action plan), `hooks/use-app-theme.tsx` (light/dark toggle + persistence), `hooks/useSubscription.ts`, `hooks/useUserIntelligence.ts`. `state.profile.consents` records accepted términos/privacidad/salud (onboarding consent gate).

### AI Mentor — `lib/mentor.ts`

Streaming chat with a **4-level fallback chain**:
1. **Claude Sonnet 4.6** (`claude-sonnet-4-6`) — PRIMARY. Solo vía ai-proxy (la clave
   `ANTHROPIC_API_KEY` es secret del servidor; NO existe camino client-side — deliberado).
   Sin `EXPO_PUBLIC_AI_PROXY_URL`, este eslabón se salta.
2. **NVIDIA NIM** (`deepseek-ai/deepseek-v4-pro`) — native; web only via ai-proxy
3. **Groq** (`llama-3.3-70b-versatile`)
4. **OpenAI** (`gpt-4o-mini`) — final fallback

**ai-proxy (server-side keys):** `supabase/functions/ai-proxy` (deployed) proxies chat (SSE passthrough) + Whisper with JWT auth and server-held provider keys. The client opts in via `EXPO_PUBLIC_AI_PROXY_URL`; without it, the direct client-key path runs unchanged (transitional). Activation requires the `NVIDIA_API_KEY`/`GROQ_API_KEY`/`OPENAI_API_KEY` secrets in the Supabase dashboard + the env var in Vercel, then rotate the old client keys.

`MentorContext` passed to each call includes the user's northStar, recent check-ins, completed lessons, biometric data, and ML scores (engagement, churn risk, next action) from Supabase's `user_intelligence` table.

Each provider has its own module — `lib/nvidia.ts`, `lib/groq.ts`, `lib/openai.ts` — orchestrated by the fallback chain in `lib/mentor.ts`. Mentor memory (embedding retrieval) is read via `hooks/useMentorMemory.ts`.

**Explicit modes:** `MentorContext.mode?: MentorMode` (`'diagnosis' | 'decision' | 'accountability' | 'reflection'`) lets the operator choose how Norman accompanies. `modePromptBlock(mode)` (pure, tested) injects a focus block into `buildSystemPrompt` (default = adaptive). Mode never overrides the SEGURIDAD/crisis routing. UI: chip selector above the input in `app/(tabs)/mentor.tsx`.

**Voice transcription — `lib/transcription.ts`:** records a mentorship session (audio) and POSTs it to OpenAI Whisper (`whisper-1`); the transcript is then fed back through `streamMentorResponse` so Norman drafts structured session notes + a 3–5 item action plan, persisted to `mentorship_sessions` (see Mentorship below). Uses `EXPO_PUBLIC_OPENAI_API_KEY` client-side today — moving it server-side is on the roadmap.

> **AI disclosure & safety:** Norman discloses it is AI and routes crisis/self-harm topics to professional help — keep these guardrails when editing the mentor prompt.

### Memory OS — `lib/memory.ts`, `lib/memoryLogic.ts`, `lib/memorySummarizer.ts`

Per-user memory that lets Norman remember across sessions + gives admins a coaching dossier. **Reuses** existing infra (`mentor_memories` + pgvector + `search_mentor_memories`, `mentor_conversations`, `mentor_threads`) and adds **4 new tables** (migration `20260615000000_memory_system.sql`): `user_memory_profile` (living synthesized profile — owner+admin RLS), `memory_summaries` (unified chat/mentorship/plaud summaries — owner+admin), `admin_briefings` + `admin_notes` (**admin-only** RLS).

- **Pure logic** (`lib/memoryLogic.ts`, unit-tested): `mergeMemoryProfile` (synthesizes, doesn't bloat — dedup + per-field caps + open→completed commitments), `parseSummaryBlocks`/`extractSection`/`splitList` (tolerant parsing of Norman's `===LABEL===` blocks), `assembleMentorMemory`, `clientSafeProfile`.
- **IO** (`lib/memory.ts`): all reads degrade to empty if tables absent. `buildMentorMemoryContext()` feeds the "MEMORIA DEL CLIENTE" block in `buildSystemPrompt` (`lib/mentor.ts`) — Norman confronts only from stored `commitments_open`.
- **IA generation** (`lib/memorySummarizer.ts`, client-side via `streamMentorResponse`): `summarizeConversation`, `updateProfileFromSummary`, `generateAdminBriefing`. Triggered on chat blur (`app/(tabs)/mentor.tsx`, throttled ≥4 new turns) and on `confirmDraft` (`hooks/use-mentorship.tsx`).
- **UI:** admin section in `app/admin/usuarios/[id].tsx` + cross-client dashboard `app/admin/memoria.tsx`; client view `app/perfil/cliente.tsx`; transcript import `components/PlaudImport.tsx`; cards in `components/memory.tsx`.
- **Privacy:** admin briefings/notes never enter Norman's context or the client view (RLS + `clientSafeProfile`).

### Mentor Execution OS — `lib/mentorExecution.ts`, `lib/mentorExecutionLogic.ts`

Operational coaching layer: turns client tasks into evaluable objects + gives mentors scoring, review, intervention queue and pre-session prep. **Reuses** existing task sources (mentorship action plans, `mentorship_tasks`, Memory OS `commitments_open`) by **normalizing** them into a unified `mentor_tasks` object — does not duplicate. Migration `20260616000000_mentor_execution.sql` adds 4 tables: `mentor_tasks` (owner+admin RLS), `mentor_task_reviews` / `mentor_client_scores` / `mentor_intervention_queue` (**admin-only** RLS).

- **Pure logic** (`lib/mentorExecutionLogic.ts`, 29 unit tests): `deriveStatus` (overdue is time-derived, not stored), 6 explainable scores (`scoreAdherence`/`scoreExecutionQuality`/`scoreFollowThrough`/`scoreFriction`/`scoreMentorAttention`/`momentumState` → `computeClientScores` with `drivers`), `buildInterventions`, `assembleMentorPrep`, `tierDepth`, `clientSafeTasks`/`clientProgress`. Friction/attention: **higher = worse/more urgent**.
- **IO + automation** (`lib/mentorExecution.ts`): `normalizeSources` (mentorship_tasks + Norman commitments → `mentor_tasks`, insert-if-missing), `createTasksFromActionPlan` (on `confirmDraft`), `suggestTasksFromCommitments` (chat blur → `ai_suggested`), `computeAndPersistScores` (+ regenerates intervention queue), `generateMentorPrep`, `fetchUserExecution` (admin bundle), `fetchExecutionDashboard` (live cross-client). AI **proposes** tasks; **mentor approves** (`mentor_task_reviews` is authoritative, admin-only).
- **UI:** review rubric + score/intervention/prep cards in `components/mentor-execution.tsx`; "EJECUCIÓN" section in `app/admin/usuarios/[id].tsx`; cross-client dashboard `app/admin/mentores/ejecucion.tsx`; client-safe tasks in `app/perfil/cliente.tsx` (gated by `isSubscribed`/`tierDepth`).
- **Tier differential:** free → light; premium → full; premium_plus/polaris/growthplayers → deep. Client never sees raw scores/reviews.

### Biometric Intelligence Layer — `lib/biometric.ts`, `lib/biometricLogic.ts`, `lib/biometricSimulator.ts`

Turns raw wearable signal into an **interpretable read of the body** — coaching intelligence, NOT clinical diagnosis. **Reuses** the existing `wearable_daily`/`wearable_timeseries`/`wearable_connections` + `journal_entries` (no duplication); migration `20260617000000_biometric_intelligence.sql` extends them (adds `respiratory_rate`/`signal_confidence`, provider `'synthetic'`, richer sync status, reflection columns, `memory_summaries` source_type `'wellness'`) and adds **one** new table `biometric_insights` (owner+admin RLS).

- **Pure logic** (`lib/biometricLogic.ts`, 31 unit tests): `sleepState`/`recoveryState`/`coherenceState` (HRV+RHR vs baseline)/`fatigueRisk`/`trendState` (7d window)/`interventionLevel` → `computeInsight` (with explicit `drivers` + `coach_safe_summary` + `client_safe_summary`), `reflectionMismatch` (subjective energy vs objective recovery), `computeBaseline`. Coherence/fatigue/intervention: **higher disturbance = more urgent**.
- **Deterministic simulator** (`lib/biometricSimulator.ts`): seeded PRNG (mulberry32, **no `Math.random`/`Date`**) → 7 narrative scenarios (`good_week`/`burnout_week`/`recovery_week`/`unstable_sleep`/`post_travel`/`high_strain`/`low_recovery`). Same seed → same series (testable). For demo/sales/QA without a physical wearable.
- **IO** (`lib/biometric.ts`, degrades to empty): `fetchDailySeries`/`fetchInsights`, `computeAndPersistInsight` (`interpretSeries` = last day + rolling baseline), `saveReflection`→`ingestReflectionToMemory` (wellness reflection → `memory_summaries` source_type `'wellness'`, read by Norman), `seedSyntheticData`/`clearSyntheticData`, `fetchBiometricSnapshot` (per-user), `fetchBiometricDashboard` (cross-client, sorted by intervention severity, names from `user_progress`).
- **UI:** cards in `components/biometric.tsx` (`BiometricInsightCard` variant admin/client, `BiometricSparkline`, `ConnectionStatusCard`, `SeedSyntheticControls` admin demo, `ReflectionComposer`); "K. BIOMÉTRICOS" section in `app/admin/usuarios/[id].tsx`; cross-client dashboard `app/admin/biometria.tsx`; "Tu cuerpo hoy" + reflection capture in `app/perfil/cliente.tsx`.
- **Audience differential:** mentor sees technical states + drivers + `coach_safe_summary`; client sees only the supportive `client_safe_summary` (no jargon/alarm). `biometric_insights` owner+admin by RLS; client UI never renders `coach_safe_summary`. Insight generation from **real** wearable data runs client-side on-read today (cron in `sync-wearables` = handoff, like execution scoring).

### Design System — `constants/theme.ts`

**Brand font:** GrandisExtended (Manual de Marca Polaris — Orgánico Studio 2024)
- Native: loaded via `useFonts` from `expo-font` using local TTF files in `assets/fonts/`
- Web: `@font-face` declarations in `app/+html.tsx`
- Font token names: `Fonts.display` (Bold), `Fonts.displayMedium`, `Fonts.displayRegular`, `Fonts.displayLight`, `Fonts.displayBlack`

**Color tokens:** use `palette.*` for raw colors, `Colors.dark.*` for semantic tokens. Never use raw hex in components — always reference tokens.

**Theming (light/dark) — `constants/themeColors.ts`:** neutral/text/border tokens are theme-aware via the `cv(varName, nativeHex)` helper.
- On **web**, `cv()` returns `var(--c-*)`; `themeColors.ts` injects a `<style>` (`injectThemeVars()`) holding the dark + light values of ~17 `--c-*` variables, and the active theme is selected by the `data-theme` attribute on `<html>`. Every screen re-themes instantly — no per-screen refactor.
- On **native**, `cv()` returns the real dark hex (static StyleSheet). The light/dark toggle is a **web/desktop feature**; native stays dark. Toggle + persistence live in `hooks/use-app-theme.tsx`.

**Color rules (critical — prevents the "black background in light mode" bug):**
- `palette.gold` + its opacity variants are **CONSTANT** (brand accent). Use for **fills** (`backgroundColor` / `borderColor`).
- `palette.goldText` (`--c-gold-text`: dark `#FFC804` / light `#8A6500` deep amber) is **theme-aware** — use for gold **text/icons** (`color:`), NOT fills.
- `palette.ink` = **CONSTANT `#0A0A0A`**, only for text/icons sitting **on gold or light surfaces** (e.g. button labels on gold). Never use it as a background — use `palette.black` / `Colors.dark.background`, which adapt to the theme.

**Button system** (5 unified variants — enforced across all screens):
- `btn-primary`: gold fill, 52px height, r:10px, GrandisExtended Bold, uppercase
- `btn-secondary`: gold outline, 44px, r:10px
- `btn-ghost`: small header button, 36px, r:8px
- `btn-chip`: pill selector (999px), 36px, active=gold fill / inactive=tinted
- `btn-icon`: circular 44×44px, primary=gold / secondary=surface

**Layout:** 8pt spacing grid (`spacing.xs=4 … spacing.xxxl=48`). Border radius: `radii.sm=8, radii.md=12, radii.lg=16`. Touch targets minimum 44×44pt everywhere.

**Reusable UI:** `components/polaris.tsx` — exports `PolarisMark`, `AppHeader`, `PremiumCard`, `GoldAccentCard`, `PrimaryButton`, `EditorialPanel`, `MetricCard`, `SovereignScore`, etc.

**Logo:** `components/PolarisLogo.tsx` — uses official SVG from `assets/images/logo-responsive.svg` (8-pointed compass star). Use `<PolarisLogo size={32} color={palette.gold} />` everywhere instead of the old CSS-based `PolarisMark`.

### Intelligence Engine (Supabase)

ML pipeline runs server-side in Supabase Edge Functions:
- `calculate-intelligence` — engagement score, churn risk (0–1), behavioral DNA, cohort clustering
- `generate-embeddings` — pgvector embeddings for mentor memory retrieval
- `smart-notifications` — personalized push notification content
- `sync-wearables` — WHOOP + Oura Ring biometric sync

Results are read client-side via `hooks/useUserIntelligence.ts` (Supabase Realtime subscription to `user_intelligence` table).

### Data

Static content lives in `data/`:
- `modules.ts` — program modules and lessons (ACTIVE_MODULE drives the current 90-day program)
- `tasks.ts` — lesson completion tasks
- `wellness.ts` — binaural / meditation session catalog
- `mentorship.ts` — weekly mentorship journey + per-week date ranges
- `habits.ts` — morning / evening habit routines (points, guides, sequence order)
- `moderation.ts` — community content filters + zero-tolerance EULA copy
- `sleep.ts` — sleep practice catalog · `live-sessions.ts` — scheduled live sessions

### Analytics

`lib/analytics.ts` — singleton that batches behavioral events and flushes to `supabase.user_events`. Respects `ml_consent` flag. Zero-latency: all writes are fire-and-forget.

### Mentorship — `app/mentoria/`, `hooks/use-mentorship.tsx`

90-day journey split into weeks with real date ranges (`weekDateRange` in `data/mentorship.ts`). Each session supports an optional **voice recording → Whisper → Norman notes + action plan** (see `lib/transcription.ts`), persisted to the `mentorship_sessions` table (local cache via the offline queue as fallback). Admin sees per-user progress — notes, action plan, completed `mentorship_tasks` — in `app/admin/usuarios/[id].tsx`. Native recording depends on `expo-av` (pending install — handoff; web shows a "grabación disponible en la app móvil" notice).

### Community & Moderation — `app/comunidad/`, `app/bienestar/comunidad.tsx`

Feed with UGC moderation (App Store requirement 1.2): report posts (`community_reports`), block users (`user_blocks` → filters the feed), zero-tolerance EULA acceptance, basic content filter (`data/moderation.ts`). Admin moderation queue in `app/admin/comunidad`. Internal 1-a-1 **direct messages** via the `direct_messages` table (`comunidad/mensajes` inbox + `comunidad/chat/[id]`), respecting blocks — distinct from the Norman AI chat. Reactivation gated by the `COMMUNITY_ENABLED` flag.

### Wellness integral system — `app/bienestar/`

Beyond the audio practices: **habits** (morning/evening routines with check + points + guide, deep-linked from notifications), **fasting** timer with 24/48/72h presets + prep/break-fast guide (`ayuno`), **nutrition** plan upload to Storage (`nutricion`), **body** measurements (`cuerpo`), a structured **supplement** stack with dose/timing (`suplementacion`), and the **Hawkins consciousness scale** weekly calibration (`consciencia`). Emotional release: `grito`, `tapping` (EFT). Practice screens keep their `SafetyWarning` guards.

### Compliance & Robustness

- **Consent gate** in onboarding (términos/privacidad/salud) → `state.profile.consents`; legal screens in `app/legal/`.
- **GDPR account deletion** via the `delete-account` edge function — explicitly purges **all** PII tables (core loop, wellness, wearables, Memory OS, Mentor Execution OS, Biometric, mentorship, community/DM/blocks) as defense-in-depth on top of `ON DELETE CASCADE`. When adding a new user-scoped table, add its delete here too.
- **`components/ErrorBoundary.tsx`** — root render-crash fallback (brand screen + retry), independent of any context/theme.
- **Offline write queue** — `lib/offlineQueue.ts` enqueues non-critical writes and retries on reconnect.

### Wearables — `lib/wearables.ts`, `app/perfil/wearables`

WHOOP + Oura via OAuth (`app/oauth/whoop/callback`, `app/oauth/oura/callback`), synced server-side by the `sync-wearables` edge function into the agnostic `WearableDaily` layer. Apple Watch (HealthKit) + Garmin are on the roadmap (require a native dev build — not Expo Go / web).

## Key Patterns

**Web/native platform splits:** Use `Platform.select()` or `.web.ts` file extensions. The breakpoint hook (`useBreakpoint`) returns `isMobile/isTablet/isDesktop` — desktop is ≥1200px.

**Font loading:** On web, fonts come from CSS `@font-face` in `+html.tsx` (no useFonts needed). On native, `useFonts` from `expo-font` loads the local TTF files. The `isWeb` flag in `_layout.tsx` skips `useFonts` entirely on web to avoid broken binary asset paths in static exports.

**Typography hierarchy:** Always use `Fonts.display` (not string literals) for headings. All display text must have `fontWeight: '700'` or higher (GrandisExtended supports 300–900). Minimum 11pt for any visible label.

**Supabase clients:** `lib/supabase.ts` exports two clients — `supabase` (main app tables: profiles, check_ins, mentor_messages, etc.) and `intel` (intelligence/admin schema: user_intelligence, user_events, ml_dashboard). Always use `intel` for the ML pipeline tables and `db` (typed helper) for strongly-typed queries.

**Local storage namespace:** `storage/local.ts` uses the key prefix `lifeflow:v2`. If you change the shape of `LifeFlowState`, increment the version suffix to bust cached state on existing installs.

**Subscription gating:** Check `isSubscribed` from `useLifeFlow()` or `useSubscription()` hook. Free tier gets limited mentor messages and locked modules. RevenueCat is the source of truth; Supabase `subscription_tier` is synced via webhook.

**Admin panel** (`app/admin/`): separate auth check — requires `is_admin` in user profile (checked in `app/admin/_layout.tsx`, with a hardcoded `OWNER_IDS` fallback ~line 134 kept as migration safety net — candidate for removal now that the migration is applied in prod). Never expose admin routes to regular users. Server-side enforcement is the BEFORE-UPDATE anti-escalation trigger + RLS (migration `20260602000000_security_hardening_p0.sql`).

**Admin crea/edita perfiles** (`app/admin/usuarios/`): el admin puede **crear** un usuario real con login (botón "Crear perfil" en `usuarios/index.tsx` → `createUserProfile` en `lib/admin/actions.ts` → edge function `create-user`, que verifica `is_admin` del caller y usa `adminSupabase.auth.admin.createUser`; el tier inicial reusa `activateMembership`) y **editar** nombre/etiqueta-rol (`updateUserProfile` → `user_profiles`, en `usuarios/[id].tsx`). El tier de suscripción se cambia en la sección Membresías. Crear el auth user necesita service-role → vive en edge function (deploy = handoff CLI).

**Historia completa del cliente en admin** (`app/admin/usuarios/[id].tsx`): el dossier muestra todo lo que el cliente HACE, no solo lo que dice. Además de identidad/membresías/check-ins/conversaciones/mentoría/ejecución/memoria/biométricos, las secciones **L. CUERPO & PROTOCOLO** (hábitos + logs + ayuno + cuerpo + nutrición + suplementos + prácticas de wellness) y **N. REFLEXIONES & COMUNIDAD** (journal + posts + engagement + DM metadata) leen vía `fetchUserActivityBundle` (`lib/admin/queries.ts`) en paralelo con el resto. Tarjetas en `components/admin-activity.tsx`. **Privacidad de DMs:** solo metadata (conteo + última actividad), nunca contenido — el coach ve señal de actividad, no surveillance de pares.

### Confrontation OS — `lib/confrontationLogic.ts`, `lib/confrontation.ts`

Motor "DIJO vs HIZO": cuando el cliente declara explícitamente algo (commitment, focus, checkin) y la conducta registrada lo contradice, el sistema produce un `ConfrontationItem` con evidencia citable (said + did + gap), severidad TaskPriority, y un prompt sugerido en voz de Norman. Norman puede abrir la sesión confrontando con el dato si severity ≥ high; el coach humano ve las fricciones rankeadas en admin. Migración `20260618000000_confrontation_os.sql` añade `profiles.consents`/`pause_state`, `admin_briefings.frictions`, tabla `confrontation_dismissals` (admin silencia 7d).

- **Detectores puros** (`lib/confrontationLogic.ts`, 46 tests): 6 detectores + 2 adapters que reusan `buildInterventions` existente (false_compliance, high_attention→program_drift). Dimensiones: STATE (sleep_self_report_vs_wearable, energy_vs_recovery_streak — **capeados a severity 'medium' hasta revisión clínica**), ENGAGEMENT (silent_withdrawal_5d, mentor_contact_gap_vs_focus, program_drift), BEHAVIOR (habit_streak_abandoned), COMMITMENTS (commitments_drift, false_compliance). `buildConfrontations` aplica guards globales (ml_consent + confrontation_with_data + pause_state + recurring_blockers crisis/duelo), dedup, sort por severity con tiebreak por dimensión state>commitments>behavior>engagement, y filtra dismissals activos.
- **IO degradable** (`lib/confrontation.ts`): `assembleConfrontationBundle` paraleliza 13 fuentes existentes (sin duplicar queries). `fetchConfrontationItems` (admin), `getTopConfrontationsForMentor` (severity high+, k=2, para inyección a Norman), `dismissConfrontation`. Feature flag `ENV.confrontationOsEnabled` (default false) gate antes de cualquier query.
- **Norman integration** (`lib/mentor.ts`): `MentorContext.topConfrontations`, `confrontationsBlock` inyectado tras `clientMemoryBlock` (skip si `mode === 'reflection'`), nueva **REGLA DE CONFRONTACIÓN CON DATO** subordinada a SEGURIDAD. Norman cita el dato literal — no re-infiere.
- **UI admin:** sección "FRICCIONES DETECTADAS" antes de "MEMORIA & BRIEFING" en `app/admin/usuarios/[id].tsx`; `FriccionesCard` en `components/admin-activity.tsx` con evidence visible + sugerido Norman + botón "NO APLICA · 7d". `AdminBriefing.frictions` se renderiza en `AdminBriefingCard` como "Confrontar esta semana — dato por dato".
- **Briefing extension:** `generateAdminBriefing` recibe pre-rankeadas y las pasa al prompt — Norman cita, no re-infiere. Persiste en `admin_briefings.frictions`.
- **Consent gate:** 4to checkbox en onboarding ("Norman puede confrontarme con datos…"); persiste `profiles.consents.confrontation_with_data`. Sección "10.bis Modo confrontación con dato" en `app/legal/privacidad.tsx` (DMs y posts NUNCA se usan como evidencia).
- **Privacidad por diseño:** se cortaron 10 detectores en el adversarial review por riesgo TCA/legal (body_metric_drift_vs_goal), psicoanálisis amateur (mood_journal_vs_body), surveillance encubierta (community_avoidance, coherence_words_vs_actions usando posts), redundancia (commitment_completed_no_evidence → adapter), o ruido. Solo sobreviven detectores con commitment EXPLÍCITO (`strength='explicit'` o regex de obligación fuerte).
- **Decisiones de release:** STATE capeado a 'medium' (no entran a inyección Norman, solo admin) hasta revisión clínica. Tono uniforme suave (sin diferencial por tier) hasta validar zero-FP. Feature flag default false + rollout por cohorte (interna → premium_plus+ → resto).

**Wearables OAuth (handoff abierto):** native redirect is `polaris://oauth/<provider>/callback` (`lib/wearables.ts`) matching `scheme: "polaris"` — these URIs must still be **registered in the Oura/WHOOP developer consoles** before the native flow works end-to-end. Web redirect stays `https://growthplayers.vercel.app/oauth/*`.

**Theming:** never hard-code dark hex values as a background (it breaks light mode) — use `palette.*` tokens. `goldText` for gold text/icons, `gold` for fills, `ink` only on gold/light surfaces. See "Color rules" under Design System.

**Supabase migrations:** no service-role key is available locally → migrations are applied via the dashboard SQL Editor (Chrome MCP), not the CLI. Files live in `supabase/migrations/` (latest: `…_security_hardening_p0.sql`, `…_meeting_features.sql`).

**Offline writes:** non-critical inserts go through `lib/offlineQueue.ts` (enqueue + retry on reconnect). A full client-id outbox for non-idempotent inserts (messages, wellness) is still pending.

## Strategic Roadmap — Consejo Asesor (2026-06-12)

> **Advisory, not technical.** Synthesis of a board-of-directors review (CEO / CPO / CTO / CMO / CFO / Chief Design Officer / Legal / Wellness) run via Perplexity on 2026-06-12. Strategic direction for taking Polaris to world-class — not a spec.

**Core thesis:** the priority is **not more features — it's sharpening the core**: reduce perceived complexity, protect the premium positioning, and turn Norman + the Protocolo Soberano into a *measurable change mechanism*, not just an elegant interface.

**Priorities (in order):**
1. **Refocus on one outcome** — the founder's operating capacity in 90 days; a crisp loop: check-in → diagnosis → action → review → progress.
2. **Norman as a decision & accountability system** (explicit modes: diagnosis / decision / accountability / reflection; memory that confronts: "you said X, did Y, today's risk is Z") — not a generic chat.
3. **Simplify the functional architecture** into a few domains (Comando · Protocolo · Norman · Recuperación); lower the visible complexity of the wellness hub.
4. **Harden AI governance + data** — move AI keys to a server-side proxy (debt, not roadmap), budgets per interaction, traceability, risk-tiered recommendation policy.
5. **Redesign onboarding + Week 1** for strong activation (health/fitness D30 retention is ~3%; the first two weeks decide habit survival).
6. **Curate wellness by evidence** — an epistemic hierarchy; lower the prominence of the more debatable practices to protect premium credibility.
7. **Defer supplement e-commerce** until retention is proven and the advice/sales separation is ethically clean.

**Top 3 risks:** (1) lack of product focus; (2) reputational/regulatory exposure from AI + biometrics + sensitive wellness (crisis, fasting, supplementation, implicit health claims); (3) fragile unit economics (Norman / voice / memory / audio / premium support can outrun a price-worthy retention).

**Maps to the existing technical backlog:** priority 4 ↔ #22 (server-side AI-key proxy); robustness ↔ #21 (full offline outbox); #19 (deploy edge functions + `eas init`) remains an open handoff.

## Launch readiness docs

Launch-prep documentation (security audit, legal drafts, QA plan, store metadata, runbooks) lives in `docs/launch/` — start with `docs/launch/00_EXECUTIVE_LAUNCH_VERDICT.md` and `docs/launch/KNOWN_ISSUES_REGISTER.md`.
