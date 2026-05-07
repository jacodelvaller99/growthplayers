# AI Mentor — Norman (CMI LifeFlow)

## Overview

Norman is the AI mentor of the Polaris Growth Institute. He is not a chatbot — he is a strategic mentor, guide, and accountability partner trained in the Polaris Method. Every message is personalized to the user's current state, progress, and sovereign score.

---

## Architecture

### Core Function

```typescript
// lib/mentor.ts
streamMentorResponse(
  ctx: MentorContext,
  userMessage: string,
  history: { role: 'mentor' | 'user'; text: string }[],
  onChunk: (delta: string) => void
): Promise<string>
```

### Provider Chain (waterfall fallback)

1. **Dev simulation** — when `ENV.isDev`, returns streaming mock response
2. **NVIDIA NIM** — `meta/llama-3.1-70b-instruct` — skipped on web (CORS)
3. **Groq** — `llama-3.1-70b-versatile` — primary web provider
4. **OpenAI** — `gpt-4o-mini` — fallback if Groq fails
5. **Dev simulation** — final fallback if all providers fail

---

## MentorContext

The full context passed to `buildSystemPrompt()`:

```typescript
interface MentorContext {
  userName: string              // "Nicolás"
  role: string                  // "Emprendedor"
  totalDays: number             // days since onboarding
  streak: number                // consecutive check-in days
  sovereignScore: number        // 0–1000, composite biometric score
  tier: string                  // "Explorador" | "Mercader" | "Soberano" | "Maestro"
  activeModuleTitle: string     // e.g. "El Mercader del Tiempo"
  activeModuleProgress: number  // 0–100
  northStar: {
    purpose: string             // user's defined "why"
    identity: string            // identity statement
    nonNegotiables: string[]    // daily non-negotiables list
    dailyReminder: string       // motivational anchor
  }
  todayCheckIn: CheckIn | null  // today's biometric check-in (energy/clarity/stress/sleep)
  messageCount: number          // total messages in current session
  completedTasks?: Array<{
    lessonId: string
    lessonTitle: string
    keyResponse?: string        // first response field (insight preview for mentor)
  }>
}
```

---

## System Prompt Design

`buildSystemPrompt(ctx)` returns a ~400-line prompt covering:

### 1. Identity & Persona
- Norman is Norman Capuozzo's digital mentor counterpart
- Tone: direct, warm, challenging — never generic or therapeutic
- Voice: mentor who has walked the path, not a coach reading from a script

### 2. Polaris Method Knowledge (9 Modules)

| Module | Title | Core Focus |
|---|---|---|
| 1 | Guerrero de la Mentalidad | Identity, sovereignty, non-negotiables |
| 2 | Maduración del Guerrero | Emotional regulation, masculine maturity |
| 3 | Emociones y Autoconocimiento | Shadow work, emotional intelligence |
| 4 | El Pontífice en Flow | Purpose alignment, spiritual clarity |
| 5 | Las Llaves de la Prosperidad | Money mindset, abundance principles |
| 6 | El Mercader del Tiempo | Time architecture, weekly system |
| 7 | El Mercader de las Relaciones | Relationships, network, influence |
| 8 | Las Llaves de la No-Negociación | Boundaries, identity defense |
| 9 | Logrología | Goal science, achievement systems |

### 3. 6 Voice Rules
1. Never give generic motivational speeches
2. Always reference the user's specific data (score, streak, module, check-in)
3. Ask one powerful question at the end of substantive responses
4. Use "tú" (informal Spanish), never "usted"
5. Keep responses under 200 words unless the user explicitly asks for depth
6. If the user is in crisis (score < 200, energy < 3), shift to grounding mode

---

## Integration Points

### Where it's called
`app/(tabs)/mentor.tsx` — line ~282:
```typescript
await streamMentorResponse(ctx, clean, history, (delta) => {
  fullText += delta;
  setStreamingText(fullText);
});
```

### Context assembly (mentor.tsx)
```typescript
const ctx: MentorContext = {
  userName: state.profile.name,
  role: state.profile.role,
  totalDays: protocolDay,
  streak: computeStreak(state.checkIns),
  sovereignScore: Math.round(...),
  tier: sovereignScore >= 750 ? 'Maestro' : ...,
  activeModuleTitle: ACTIVE_MODULE.title,
  activeModuleProgress: ACTIVE_MODULE.progress,
  northStar: state.northStar,
  todayCheckIn,
  messageCount: userMsgCount,
  completedTasks: Object.values(state.completedTasks).map(...),
};
```

### Persistence
- `addMentorMessages(userMsg, mentorMsg)` → `state.messages` (local)
- `intel.conversations().insert([...])` → Supabase `conversations` table (fire & forget)

---

## Adding New Providers

To add a new AI provider:

1. Create `lib/yourprovider.ts` — implement `streamChat(messages, onChunk): Promise<string>`
2. Add to the provider chain in `lib/mentor.ts` after the existing providers
3. Set the API key in `.env.local` as `EXPO_PUBLIC_YOURPROVIDER_API_KEY`
4. Guard with `try/catch` — always fall through to the next provider on error

---

## Testing

```bash
# Unit tests for buildSystemPrompt
npx jest --testPathPattern mentor

# Manual: open app, send message, verify streaming renders
# Manual: disconnect network, verify dev sim fallback fires
```
