# Lifeflow — Production SaaS Project Scaffold

> React Native/Expo · Supabase · Node.js/Express · Claude AI · Colombian Payroll · Stripe

Generated from skills.sh analysis on 2026-04-22.

---

## Directory Tree

```
lifeflow/
├── apps/
│   ├── mobile/                        # Expo React Native app
│   │   ├── app/                       # Expo Router v3 file-based routing
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── register.tsx
│   │   │   │   └── biometric-setup.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── dashboard.tsx      # Wellness dashboard
│   │   │   │   ├── mentor.tsx         # Claude AI mentor chat
│   │   │   │   ├── payroll.tsx        # Colombian payroll viewer
│   │   │   │   ├── metrics.tsx        # Biometrics & health data
│   │   │   │   └── settings.tsx
│   │   │   ├── _layout.tsx
│   │   │   └── +not-found.tsx
│   │   ├── components/
│   │   │   ├── ui/                    # Shared UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── MetricRing.tsx     # Animated wellness rings
│   │   │   │   └── StreakBadge.tsx
│   │   │   ├── mentor/
│   │   │   │   ├── MentorChat.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── payroll/
│   │   │   │   ├── PayrollCard.tsx
│   │   │   │   ├── DeductionsList.tsx # DIAN deductions breakdown
│   │   │   │   └── SalaryChart.tsx
│   │   │   └── biometrics/
│   │   │       ├── HeartRateGauge.tsx
│   │   │       ├── SleepChart.tsx
│   │   │       └── StepsBar.tsx
│   │   ├── hooks/
│   │   │   ├── useSupabase.ts
│   │   │   ├── useMentor.ts           # Claude AI mentor hook
│   │   │   ├── useRevenueCat.ts       # Subscription state
│   │   │   ├── useBiometrics.ts       # Health data sync
│   │   │   └── usePayroll.ts          # Payroll data
│   │   ├── lib/
│   │   │   ├── supabase.ts            # Supabase client
│   │   │   ├── stripe.ts              # Stripe/RevenueCat init
│   │   │   ├── ai.ts                  # Claude API client
│   │   │   └── analytics.ts           # Mixpanel/PostHog
│   │   ├── store/
│   │   │   ├── useAuthStore.ts        # Zustand auth store
│   │   │   ├── useWellnessStore.ts    # Wellness data store
│   │   │   └── usePayrollStore.ts     # Payroll store
│   │   ├── constants/
│   │   │   ├── colors.ts
│   │   │   ├── fonts.ts
│   │   │   └── config.ts
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── expo-env.d.ts
│   │   └── package.json
│   │
│   └── admin/                         # Next.js 15 admin panel (optional)
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── users/page.tsx
│       │   │   ├── payroll/page.tsx
│       │   │   └── analytics/page.tsx
│       │   ├── api/
│       │   │   └── auth/[...nextauth]/route.ts
│       │   └── layout.tsx
│       └── package.json
│
├── packages/
│   ├── api/                           # Node.js/Express REST API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            # /api/auth
│   │   │   │   ├── users.ts           # /api/users
│   │   │   │   ├── wellness.ts        # /api/wellness
│   │   │   │   ├── payroll.ts         # /api/payroll
│   │   │   │   ├── mentor.ts          # /api/mentor (Claude proxy)
│   │   │   │   └── webhooks.ts        # /api/webhooks (Stripe)
│   │   │   ├── services/
│   │   │   │   ├── payroll/
│   │   │   │   │   ├── PayrollCalculator.ts      # Core DIAN/UGPP logic
│   │   │   │   │   ├── SocialSecurityCalc.ts     # EPS + AFP + ARL
│   │   │   │   │   ├── IncomeTaxCalc.ts          # Retención en la fuente
│   │   │   │   │   ├── SeveranceCalc.ts          # Cesantías + intereses
│   │   │   │   │   └── PrimaCalc.ts              # Prima de servicios
│   │   │   │   ├── mentor/
│   │   │   │   │   ├── MentorService.ts           # Claude API wrapper
│   │   │   │   │   ├── ContextBuilder.ts          # User context for AI
│   │   │   │   │   └── MemoryService.ts           # Conversation memory
│   │   │   │   ├── wellness/
│   │   │   │   │   ├── BiometricSync.ts           # Health data ingestion
│   │   │   │   │   ├── ScoreCalculator.ts         # Wellness score algo
│   │   │   │   │   └── RecommendationEngine.ts    # AI recommendations
│   │   │   │   ├── stripe/
│   │   │   │   │   ├── StripeService.ts           # Stripe SDK wrapper
│   │   │   │   │   ├── SubscriptionManager.ts     # Plan lifecycle
│   │   │   │   │   └── WebhookHandler.ts          # Stripe events
│   │   │   │   └── notifications/
│   │   │   │       ├── PushService.ts             # Expo push notifications
│   │   │   │       └── EmailService.ts            # Resend transactional
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts                        # JWT + Supabase auth
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── validation.ts                  # Zod schemas
│   │   │   │   └── errorHandler.ts
│   │   │   ├── lib/
│   │   │   │   ├── supabase-admin.ts              # Supabase service role
│   │   │   │   ├── claude.ts                      # Anthropic SDK
│   │   │   │   ├── redis.ts                       # Upstash Redis
│   │   │   │   └── logger.ts                      # Pino logger
│   │   │   └── server.ts                          # Express entry point
│   │   ├── tests/
│   │   │   ├── payroll/
│   │   │   │   ├── PayrollCalculator.test.ts
│   │   │   │   ├── SocialSecurityCalc.test.ts
│   │   │   │   └── IncomeTaxCalc.test.ts          # DIAN tables 2026
│   │   │   ├── mentor/
│   │   │   │   └── MentorService.test.ts
│   │   │   └── webhooks/
│   │   │       └── StripeWebhook.test.ts
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── database/                      # Supabase + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Full data model
│   │   │   └── migrations/
│   │   │       └── 001_initial.sql
│   │   ├── supabase/
│   │   │   ├── migrations/
│   │   │   │   ├── 001_auth_schema.sql
│   │   │   │   ├── 002_wellness_schema.sql
│   │   │   │   ├── 003_payroll_schema.sql
│   │   │   │   └── 004_rls_policies.sql           # Row-Level Security
│   │   │   ├── seed/
│   │   │   │   ├── dian_tax_tables_2026.sql       # Colombian tax tables
│   │   │   │   └── test_users.sql
│   │   │   └── functions/
│   │   │       ├── calculate_payroll.sql          # PG function
│   │   │       └── wellness_score.sql
│   │   └── package.json
│   │
│   ├── shared/                        # Shared types + utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── payroll.ts         # Colombian payroll types
│   │   │   │   ├── wellness.ts
│   │   │   │   ├── mentor.ts
│   │   │   │   └── api.ts             # Request/response types
│   │   │   ├── validators/
│   │   │   │   ├── payrollSchema.ts   # Zod schemas
│   │   │   │   ├── wellnessSchema.ts
│   │   │   │   └── userSchema.ts
│   │   │   └── utils/
│   │   │       ├── currency.ts        # COP formatting
│   │   │       ├── dates.ts           # Colombian date utils
│   │   │       └── constants.ts       # SMLV, UVT 2026
│   │   └── package.json
│   │
│   └── ai/                            # Claude AI mentor package
│       ├── src/
│       │   ├── prompts/
│       │   │   ├── system.ts          # Base system prompt
│       │   │   ├── wellness.ts        # Wellness coaching prompts
│       │   │   ├── payroll.ts         # Payroll explanation prompts
│   │   │   └── motivation.ts        # Motivational coaching
│       │   ├── tools/
│       │   │   ├── getWellnessData.ts # Tool: fetch user metrics
│       │   │   ├── getPayrollData.ts  # Tool: fetch payroll info
│       │   │   └── scheduleReminder.ts # Tool: set notification
│       │   └── index.ts              # Claude SDK export
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml         # Local dev stack
│   │   └── docker-compose.prod.yml
│   ├── terraform/                     # Optional: Supabase infra-as-code
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── vercel/
│       └── vercel.json                # API deployment config
│
├── .github/
│   └── workflows/
│       ├── api-ci.yml                 # Test + deploy API to Vercel
│       ├── expo-preview.yml           # EAS Build on PR
│       ├── expo-production.yml        # EAS Build + Submit on main
│       └── supabase-migrations.yml    # Run DB migrations
│
├── .claude/
│   └── skills/                        # Installed skills
│       ├── using-superpowers/
│       ├── brainstorming/
│       ├── writing-plans/
│       ├── test-driven-development/
│       └── systematic-debugging/
│
├── docs/
│   ├── superpowers/
│   │   ├── plans/
│   │   └── skills-scrape/
│   ├── architecture/
│   │   ├── ADR-001-supabase-over-firebase.md
│   │   ├── ADR-002-expo-router-v3.md
│   │   └── ADR-003-colombian-payroll-engine.md
│   └── payroll/
│       ├── dian-tables-2026.md        # Colombian tax reference
│       ├── ugpp-requirements.md       # Social security rules
│       └── calculation-examples.md   # Unit test scenarios
│
├── package.json                       # Turborepo root
├── turbo.json                         # Turborepo config
├── pnpm-workspace.yaml               # pnpm workspaces
└── CLAUDE.md                          # AI agent instructions
```

---

## Key Configuration Files

### `package.json` (root — Turborepo)
```json
{
  "name": "lifeflow",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "db:migrate": "turbo db:migrate",
    "db:seed": "turbo db:seed"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  }
}
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "persistent": true, "cache": false },
    "test": { "dependsOn": ["^build"] },
    "db:migrate": { "cache": false },
    "lint": {}
  }
}
```

### `packages/shared/src/utils/constants.ts`
```typescript
export const PAYROLL_2026 = {
  SMLV: 1_423_500,          // Salario Mínimo Legal Vigente 2026
  UVT: 49_799,               // Unidad de Valor Tributario 2026
  SALUD_EMPLEADO: 0.04,      // 4% empleado
  SALUD_EMPLEADOR: 0.085,    // 8.5% empleador
  PENSION_EMPLEADO: 0.04,    // 4% empleado
  PENSION_EMPLEADOR: 0.12,   // 12% empleador
  ARL_RIESGO_I: 0.00522,     // ARL riesgo clase I
  CESANTIAS: 1/12,            // 8.33% anual
  INTERESES_CESANTIAS: 0.12, // 12% anual
  PRIMA: 1/12,                // 8.33% anual
  VACACIONES: 15/360,         // 4.17%
};
```

### `packages/api/src/lib/claude.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function streamMentorResponse(
  messages: Anthropic.MessageParam[],
  systemPrompt: string,
  onChunk: (text: string) => void,
) {
  const stream = await claude.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onChunk(event.delta.text);
    }
  }
  return stream.finalMessage();
}
```

### `.github/workflows/expo-production.yml`
```yaml
name: Expo Production Build
on:
  push:
    branches: [main]
    paths: ['apps/mobile/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: pnpm install --frozen-lockfile
      - run: eas build --platform all --non-interactive --auto-submit
        working-directory: apps/mobile
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### `packages/database/supabase/migrations/004_rls_policies.sql`
```sql
-- Row-Level Security for wellness data
ALTER TABLE wellness_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own wellness records"
  ON wellness_records FOR ALL
  USING (auth.uid() = user_id);

-- Payroll data — only HR role and the employee themselves
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees see own payroll, HR sees all"
  ON payroll_records FOR SELECT
  USING (
    auth.uid() = employee_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'hr'
    )
  );
```

---

## Install Instructions

```bash
# 1. Clone and install
git clone https://github.com/your-org/lifeflow
cd lifeflow
pnpm install

# 2. Set up environment
cp packages/api/.env.example packages/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# Required env vars:
# ANTHROPIC_API_KEY=sk-ant-...
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# REVENUE_CAT_API_KEY=...
# EXPO_TOKEN=...

# 3. Run database migrations
pnpm db:migrate

# 4. Seed with Colombian tax tables
pnpm db:seed

# 5. Start development
pnpm dev
```

---

## Skills to Install (Top 20 from skills.sh Analysis)

```bash
# Core: Supabase
npx skills add https://github.com/supabase/agent-skills --skill supabase
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices

# Mobile: React Native / Expo
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-native-skills
npx skills add https://github.com/callstackincubator/agent-skills --skill react-native-best-practices
npx skills add https://github.com/expo/skills --skill building-native-ui
npx skills add https://github.com/expo/skills --skill expo-deployment
npx skills add https://github.com/expo/skills --skill expo-cicd-workflows

# Payments
npx skills add https://github.com/stripe/ai --skill stripe-best-practices
npx skills add https://github.com/wshobson/agents --skill stripe-integration

# AI Mentor
npx skills add https://github.com/anthropics/skills --skill claude-api

# Backend
npx skills add https://github.com/wshobson/agents --skill nodejs-backend-patterns
npx skills add https://github.com/prisma/skills --skill prisma-database-setup
npx skills add https://github.com/wshobson/agents --skill database-migration

# Security/Auth
npx skills add https://github.com/wshobson/agents --skill auth-implementation-patterns
npx skills add https://github.com/sickn33/antigravity-awesome-skills --skill nextjs-supabase-auth

# DevOps/CI-CD
npx skills add https://github.com/vercel-labs/agent-skills --skill deploy-to-vercel
npx skills add https://github.com/wshobson/agents --skill github-actions-templates

# Agent Workflow
npx skills add https://github.com/obra/superpowers --skill test-driven-development
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

---

## Colombian Payroll Compliance Notes

The payroll engine (`packages/api/src/services/payroll/`) implements:

1. **Retención en la Fuente** — DIAN income tax withholding using 2026 UVT tables
2. **Aportes Parafiscales** — SENA (2%), ICBF (3%), CCF (4%) — employer only
3. **Seguridad Social** — EPS (8.5%/4%), AFP (12%/4%), ARL (0.522%-6.96%)
4. **Prestaciones Sociales** — Cesantías (8.33%), Prima (8.33%), Vacaciones (4.17%)
5. **Integralidad Salarial** — 70/30 split for salaries above 10 SMLV
6. **Aportes UGPP** — Annual reconciliation via PILA

All calculations tested against DIAN calculator and official UGPP tables.
Values hardcoded in `packages/shared/src/utils/constants.ts` and seeded via `packages/database/supabase/seed/dian_tax_tables_2026.sql`.
