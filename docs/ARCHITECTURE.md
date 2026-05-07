# Architecture — CMI LifeFlow

## Stack Overview

| Layer | Technology |
|---|---|
| Framework | Expo SDK 52 (React Native + React Native Web) |
| Router | Expo Router v4 (file-based, RSC-ready) |
| State | React Context + `use-lifeflow.tsx` hook |
| Persistence (local) | `storage/local.ts` → `AsyncStorage` (native) / `localStorage` (web) |
| Backend | Supabase (PostgreSQL 15, Auth, Storage, Edge Functions) |
| Deployment | Vercel (static export via `npx expo export --platform web`) |
| AI | Multi-provider streaming: NVIDIA NIM → Groq → OpenAI → dev sim |
| Styling | React Native `StyleSheet` + `constants/theme.ts` design tokens |

---

## Directory Structure

```
lifeflow/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx             # Root layout — font loading, auth guard, nav structure
│   ├── +html.tsx               # Web-only HTML shell (Google Fonts CDN links)
│   ├── (onboarding)/           # Pre-auth screens (index.tsx — profile + access code)
│   ├── (tabs)/                 # Main bottom-tab navigation
│   │   ├── comando.tsx         # Dashboard — check-in, metrics, quick actions
│   │   ├── mentor.tsx          # AI Mentor chat (Norman)
│   │   ├── programas.tsx       # Course catalogue
│   │   └── progreso.tsx        # Progress & analytics
│   ├── bienestar/              # Wellness section (meditation, breathing, sleep, journal)
│   ├── module/[id].tsx         # Module detail — lesson list + progress
│   └── lesson/[id].tsx         # Lesson screen — video placeholder + task form
├── components/
│   ├── polaris/                # Design system exports (PremiumCard, GoldDivider, etc.)
│   └── WellnessMiniPlayer.tsx  # Persistent floating player above tab bar
├── constants/
│   └── theme.ts                # palette, typography, spacing, radii, Fonts
├── data/
│   ├── modules.ts              # Static Polaris curriculum (9 modules, lesson structure)
│   └── tasks.ts                # Per-lesson task definitions (LESSON_TASKS map)
├── docs/                       # This documentation directory
├── hooks/
│   ├── use-lifeflow.tsx        # Primary app state + Supabase sync
│   ├── useUserIntelligence.ts  # ML intelligence engine (biometrics, patterns)
│   ├── useBinauralEngine.ts    # Web Audio API binaural beat generator
│   └── useWellnessStore.ts     # Zustand store for active wellness session
├── lib/
│   ├── mentor.ts               # streamMentorResponse() + buildSystemPrompt()
│   ├── supabase.ts             # Supabase client + intel query builders
│   ├── groq.ts / openai.ts / nvidia.ts  # AI provider adapters
│   └── admin/
│       ├── actions.ts          # Admin mutations (membership, access codes, ML)
│       ├── queries.ts          # Admin read queries
│       └── types.ts            # Admin type definitions
├── storage/
│   └── local.ts                # readLocal / writeLocal abstractions
├── supabase/
│   └── migrations/             # SQL migration files (timestamped)
└── types/
    └── lifeflow.ts             # Core app types (LifeFlowState, CheckIn, etc.)
```

---

## Data Flow

### Authentication
```
Supabase Auth (email/password)
    ↓
use-lifeflow.tsx: supabase.auth.onAuthStateChange()
    ↓
uidRef.current = user.id  →  userId in context
    ↓
Profile loaded: intel.profiles().select().eq('id', uid).single()
    ↓
State hydrated from local storage + Supabase
```

### Check-In Loop (Core UX)
```
User taps check-in on Comando tab
    ↓
CheckInModal (overlay)
    ↓
addCheckIn(data) in use-lifeflow.tsx
    ↓
writeLocal(STATE_KEY, nextState)          ← immediate local persist
    ↓
supabase.from('check_ins').insert(data)   ← background Supabase sync
    ↓
useUserIntelligence recalculates metrics  ← energy/clarity/stress averages
    ↓
supabase.functions.invoke('calculate-intelligence')  ← ML recalc (background)
```

### AI Mentor Chat
```
User message in mentor.tsx
    ↓
buildMentorContext(state, checkIns, ...)  ← assembles MentorContext
    ↓
streamMentorResponse(ctx, msg, history, onChunk)
    ↓
buildSystemPrompt(ctx)                    ← 400-line Norman persona prompt
    ↓
Provider chain: NVIDIA (native) → Groq → OpenAI → dev sim
    ↓
onChunk(delta) → setStreamingText()       ← live streaming UI update
    ↓
addMentorMessages(userMsg, fullReply)     ← state + Supabase persist
```

---

## State Shape (`LifeFlowState`)

```typescript
{
  profile: { name, role, photo, onboardingComplete }
  northStar: { purpose, identity, nonNegotiables, dailyReminder }
  checkIns: CheckIn[]                    // all historical check-ins
  messages: MentorMessage[]             // chat history (last 50)
  completedLessons: string[]            // lesson IDs completed
  completedTasks: Record<string, LessonTask>  // keyed by lessonId
  wellnessSessions: WellnessSession[]   // binaural/meditation/breathing
}
```

---

## Supabase Tables

See `docs/DATABASE.md` for full table list and RLS policies.

Key tables:
- `profiles` — auth-linked user profiles (`id = auth.uid()`)
- `user_profiles` — extended app data (`user_id = auth.uid()`)
- `check_ins` — daily biometric check-ins
- `conversations` — AI mentor chat history
- `lesson_tasks` — completed lesson task responses
- `wellness_sessions` — binaural/meditation/breathing sessions
- `user_memberships` — subscription records
- `access_codes` + `access_code_uses` — one-time redemption codes

---

## Environment Variables

```bash
# .env.local (never committed)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GROQ_API_KEY=gsk_...
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_NVIDIA_API_KEY=nvapi-...
```

---

## Deployment

```bash
# Production build
npx expo export --platform web

# The `out/` directory is deployed to Vercel
# vercel.json rewrites all routes to index.html (SPA mode)
```

Vercel project: `growthplayers.vercel.app`
Branch: `main` → auto-deploy on push
