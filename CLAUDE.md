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

# Tests
npm test                              # Jest — all tests
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report
npx jest path/to/__tests__/file.test.ts  # Single test file

# Web build & deploy
npx expo export --platform web        # Outputs to dist/
# Deployed to Vercel automatically on push to main
# vercel.json: buildCommand = "npx expo export --platform web"

# Native builds (EAS)
eas build --profile preview --platform ios
eas build --profile production --platform all

# Supabase edge functions
supabase functions deploy calculate-intelligence
supabase functions deploy generate-embeddings
```

## Environment Variables (`.env.local`)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_NVIDIA_API_KEY=        # Primary AI (NVIDIA NIM)
EXPO_PUBLIC_GROQ_API_KEY=          # Secondary AI (Groq)
EXPO_PUBLIC_OPENAI_API_KEY=        # Fallback AI
EXPO_PUBLIC_REVENUECAT_KEY=        # Subscriptions
```

All are `EXPO_PUBLIC_*` (inlined at build time, client-side only). Defined in `app/config/env.ts`.

## Architecture

### Routing — Expo Router (file-based)

```
app/
  _layout.tsx          # Root: font loading, auth guard, ThemeProvider, DesktopSidebar
  (auth)/              # Login / register / welcome — redirected to when unauthenticated
  (onboarding)/        # Profile setup wizard — redirected to when !onboardingCompleted
  (tabs)/              # Main app: comando, norte, programas, mentor, progreso
  bienestar/           # Wellness tools: binaurales, meditacion, respiracion, grito, tapping, consciencia, diario, etc.
  admin/               # Internal admin panel (usuarios, membresías, inteligencia, etc.)
  lesson/[id].tsx      # Individual lesson player
  module/[id].tsx      # Module overview
  checkin.tsx          # Daily check-in modal
  paywall.tsx          # Subscription upsell modal
```

Auth guard in `app/_layout.tsx`: not authenticated → `/(auth)`, onboarding not completed → `/(onboarding)`.

Desktop (web ≥1200px): `DesktopSidebar` is rendered as a flex row sibling to the main stack. Bottom tab bar is hidden (`display: 'none'`). Controlled by `useBreakpoint()`.

### Global State — `useLifeFlow` hook

The **single source of truth** is a React Context in `hooks/use-lifeflow.tsx`. It holds:
- `state: LifeFlowState` — profile, northStar, checkIns, mentorMessages, completedLessons, subscriptionTier
- Supabase auth + real-time sync
- Local persistence via `storage/local.ts` (SecureStore on native, localStorage on web) under namespace `lifeflow:v2`

Access anywhere: `const { state, updateProfile, addCheckIn, ... } = useLifeFlow()`.

Wellness-player state (mini-player across tabs) lives separately in `store/wellnessStore.ts` (Zustand).

### AI Mentor — `lib/mentor.ts`

Streaming chat with a **3-level fallback chain**:
1. **NVIDIA NIM** (`meta/llama-3.3-70b-instruct`) — primary
2. **Groq** (`llama-3.3-70b-versatile`) — secondary
3. **OpenAI** (`gpt-4o-mini`) — final fallback

`MentorContext` passed to each call includes the user's northStar, recent check-ins, completed lessons, biometric data, and ML scores (engagement, churn risk, next action) from Supabase's `user_intelligence` table.

### Design System — `constants/theme.ts`

**Brand font:** GrandisExtended (Manual de Marca Polaris — Orgánico Studio 2024)
- Native: loaded via `useFonts` from `expo-font` using local TTF files in `assets/fonts/`
- Web: `@font-face` declarations in `app/+html.tsx`
- Font token names: `Fonts.display` (Bold), `Fonts.displayMedium`, `Fonts.displayRegular`, `Fonts.displayLight`, `Fonts.displayBlack`

**Color tokens:** use `palette.*` for raw colors, `Colors.dark.*` for semantic tokens. Primary accent: `palette.gold = '#FFC804'`. Never use raw hex in components — always reference tokens.

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

### Analytics

`lib/analytics.ts` — singleton that batches behavioral events and flushes to `supabase.user_events`. Respects `ml_consent` flag. Zero-latency: all writes are fire-and-forget.

## Key Patterns

**Web/native platform splits:** Use `Platform.select()` or `.web.ts` file extensions. The breakpoint hook (`useBreakpoint`) returns `isMobile/isTablet/isDesktop` — desktop is ≥1200px.

**Font loading:** On web, fonts come from CSS `@font-face` in `+html.tsx` (no useFonts needed). On native, `useFonts` from `expo-font` loads the local TTF files. The `isWeb` flag in `_layout.tsx` skips `useFonts` entirely on web to avoid broken binary asset paths in static exports.

**Typography hierarchy:** Always use `Fonts.display` (not string literals) for headings. All display text must have `fontWeight: '700'` or higher (GrandisExtended supports 300–900). Minimum 11pt for any visible label.

**Supabase queries:** Use the typed `db` helper from `lib/supabase.ts` for the intelligence/admin schema. Raw `supabase` client for the main app tables.

**Subscription gating:** Check `isSubscribed` from `useLifeFlow()` or `useSubscription()` hook. Free tier gets limited mentor messages and locked modules. RevenueCat is the source of truth; Supabase `subscription_tier` is synced via webhook.

**Admin panel** (`app/admin/`): separate auth check — requires `role = 'admin'` in user profile. Never expose admin routes to regular users.
