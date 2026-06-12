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

Streaming chat with a **3-level fallback chain**:
1. **NVIDIA NIM** (`deepseek-ai/deepseek-v4-pro`) — primary (native; web only via ai-proxy)
2. **Groq** (`llama-3.3-70b-versatile`) — secondary
3. **OpenAI** (`gpt-4o-mini`) — final fallback

**ai-proxy (server-side keys):** `supabase/functions/ai-proxy` (deployed) proxies chat (SSE passthrough) + Whisper with JWT auth and server-held provider keys. The client opts in via `EXPO_PUBLIC_AI_PROXY_URL`; without it, the direct client-key path runs unchanged (transitional). Activation requires the `NVIDIA_API_KEY`/`GROQ_API_KEY`/`OPENAI_API_KEY` secrets in the Supabase dashboard + the env var in Vercel, then rotate the old client keys.

`MentorContext` passed to each call includes the user's northStar, recent check-ins, completed lessons, biometric data, and ML scores (engagement, churn risk, next action) from Supabase's `user_intelligence` table.

Each provider has its own module — `lib/nvidia.ts`, `lib/groq.ts`, `lib/openai.ts` — orchestrated by the fallback chain in `lib/mentor.ts`. Mentor memory (embedding retrieval) is read via `hooks/useMentorMemory.ts`.

**Voice transcription — `lib/transcription.ts`:** records a mentorship session (audio) and POSTs it to OpenAI Whisper (`whisper-1`); the transcript is then fed back through `streamMentorResponse` so Norman drafts structured session notes + a 3–5 item action plan, persisted to `mentorship_sessions` (see Mentorship below). Uses `EXPO_PUBLIC_OPENAI_API_KEY` client-side today — moving it server-side is on the roadmap.

> **AI disclosure & safety:** Norman discloses it is AI and routes crisis/self-harm topics to professional help — keep these guardrails when editing the mentor prompt.

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
- **GDPR account deletion** via the `delete-account` edge function.
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
