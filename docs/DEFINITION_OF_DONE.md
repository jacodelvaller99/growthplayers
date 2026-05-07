# Definition of Done — CMI LifeFlow

A feature or fix is **Done** when ALL of the following are true.

---

## Code Quality

- [ ] `npx tsc --noEmit` → **0 errors**
- [ ] `npx jest --verbose` → **all tests passing** (no regressions)
- [ ] ESLint: `npx eslint . --ext .ts,.tsx` → 0 new warnings introduced
- [ ] No hardcoded color hex strings (`#xxxxxx`) — use `palette.*` tokens from `constants/theme.ts`
- [ ] No `console.log` left in production paths (use `console.error`/`console.warn` only where intentional)
- [ ] No silent `catch {}` blocks — every catch must either log or surface a user-facing message

## UX / UI

- [ ] Feature works on **iOS Simulator** (iPhone 15 Pro) without crashes
- [ ] Feature works on **Web** (`npx expo export --platform web`) without blank screen or hydration error
- [ ] Loading states render correctly (skeleton / spinner)
- [ ] Error states render correctly (visible error message, retry option if applicable)
- [ ] All strings are in **Spanish** (app language)
- [ ] Touch targets ≥ 44×44 pt
- [ ] No layout overflow / clipping on smaller screens (iPhone SE 2)

## Data / Supabase

- [ ] New tables have a migration file in `supabase/migrations/` with timestamp prefix
- [ ] RLS enabled on every new table (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`)
- [ ] Users can only read/write their own rows (`user_id = auth.uid()`)
- [ ] Admin operations use `profiles.is_admin = true` policy (not hardcoded UUIDs)
- [ ] No raw SQL executed outside of migrations or `supabase.rpc()`
- [ ] Sensitive operations wrapped in try/catch with proper error propagation

## AI Mentor

- [ ] `streamMentorResponse()` called directly from `app/(tabs)/mentor.tsx` (never through `sendMentorMessage` stub)
- [ ] `MentorContext` populated with real data: `userName`, `streak`, `sovereignScore`, `todayCheckIn`, `northStar`
- [ ] System prompt includes active module + lesson task context when relevant
- [ ] Response rendered via streaming chunks (no full-response flash)
- [ ] Fallback to dev simulation mode when all providers fail

## Git / Deploy

- [ ] Branch name follows convention: `fix/` | `feat/` | `refactor/` | `docs/`
- [ ] Commit message format: `type(scope): short description` (e.g. `fix(mentor): reconnect streamMentorResponse`)
- [ ] PR includes: what changed, why, how to test
- [ ] `git push` → Vercel deployment succeeds (green in Vercel dashboard)
- [ ] Production URL (`growthplayers.vercel.app`) tested in **incognito** after deploy
- [ ] No regressions on: Onboarding → Home → Mentor → Check-in loop

## Security

- [ ] No user PII logged to console
- [ ] No API keys committed to repo (use `.env.local`, verified in `.gitignore`)
- [ ] Access codes validated server-side via `redeem_access_code` RPC
- [ ] `userId` always validated as non-empty before Supabase writes
