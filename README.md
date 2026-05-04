# LifeFlow — Plataforma de Transformación Personal

> Método Polaris · Norman Capuozzo · Quiet Luxury Design System

[![Tests](https://img.shields.io/badge/tests-161%2F161-brightgreen)](.github/workflows/batman-qa.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)]()

---

## Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Expo 54 + React Native 0.81 + TypeScript (strict) |
| **Routing** | Expo Router v6 (file-based) |
| **UI** | Design system Polaris — Quiet Luxury, paleta dorada |
| **Backend** | Supabase (PostgreSQL 15 + pgvector + Edge Functions Deno) |
| **AI Mentor** | NVIDIA NIM (deepseek) → Groq (llama-3.3-70b) → OpenAI (gpt-4o-mini) |
| **Embeddings** | OpenAI text-embedding-3-small (1536d) via pgvector |
| **ML Engine** | Intelligence Engine v1 — engagement, churn, cohorts, NBA |
| **Push** | Expo Push Notifications + smart-notifications edge function |
| **Deploy** | Vercel (web) + Expo (mobile) |
| **Tests** | Jest 161/161 · Playwright E2E · k6 load tests · Maestro mobile |
| **CI/CD** | GitHub Actions (batman-qa.yml) |

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                        USUARIO                           │
│              (Expo App — iOS / Android / Web)            │
└────────────────────────┬─────────────────────────────────┘
                         │ Auth (JWT)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                     SUPABASE                             │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ PostgreSQL │  │ Edge Functions│  │   Realtime       │ │
│  │ + RLS      │  │  (Deno)      │  │   Subscriptions  │ │
│  │ + pgvector │  └──────┬───────┘  └──────────────────┘ │
│  └────────────┘         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌──────────┐ ┌────────────────────┐
│ calculate-      │ │ generate-│ │ smart-             │
│ intelligence    │ │ embeddings│ │ notifications      │
│ (ML scores)     │ │ (pgvector)│ │ (Expo Push)        │
└────────┬────────┘ └──────────┘ └────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                  user_intelligence                       │
│  engagement · churn_risk · cohort · NBA · affinities     │
└────────────────────────┬────────────────────────────────┘
                         │ Realtime
                         ▼
┌──────────────────────────────────────────────────────────┐
│         COMANDO (Home) + MENTOR Norman                   │
│  NBA card · Anomaly alert · Score soberano · Chat IA     │
└──────────────────────────────────────────────────────────┘
```

---

## Módulos implementados

### Pantallas de usuario
- **Onboarding** — registro, código de acceso, setup norte estrella
- **Comando** — home con métricas ML, NBA, anomaly alerts, check-in rápido
- **Programa** — currículum Polaris 9 módulos, progreso por lección
- **Lección** — video Skool/Vimeo, tarea interactiva, marcar completada
- **Mentor Norman** — chat IA con streaming, memoria vectorial, contexto soberano
- **Norte Estrella** — propósito, identidad, no-negociables, recordatorio diario
- **Bienestar Hub** — contenedor de módulos wellness
- **Binaurales** — generador Web Audio API, 20+ frecuencias
- **Meditación** — 15+ meditaciones guiadas, soundscapes, timer
- **Respiración** — 4-7-8, box breath, alternating nostril, animación visual
- **Sueño** — S.O.S, historias, yoga nidra, relajaciones (mini-player integrado)
- **Diario** — journal con escalas, guardado en Supabase
- **Progreso/Perfil** — score soberano, gráficas, métricas ML, config
- **Check-in diario** — energía/claridad/estrés/sueño + necesidad del sistema
- **Paywall** — planes premium via RevenueCat

### Admin CMI (`/admin` — requiere `is_admin = true`)
Dashboard · Usuarios · Membresías · Cursos · Códigos · Contenido · Inteligencia ML · Auditoría

### ML Engine (7 algoritmos)
| Algoritmo | Descripción |
|-----------|-------------|
| Engagement Score | Frecuencia, recencia y variedad de acciones (0–100) |
| Churn Risk | Predicción abandono: low / medium / high |
| Cohort Label | Segmento: explorer / active / power_user / at_risk / churned |
| NBA | Siguiente mejor acción contextual |
| Anomaly Detection | Detección de caídas bruscas en métricas |
| Affinity Scoring | Preferencia por tipo de contenido (binaural/meditación/respiración) |
| Mentor Adaptation | Tono del mentor ajustado por churn_risk y sovereign score |

---

## Variables de entorno requeridas

```bash
cp .env.example .env.local
```

Ver [`.env.example`](.env.example) para la lista completa con descripción de cada variable.

---

## Comandos

```bash
npm install                 # Instalar dependencias
npx expo start              # Desarrollo (Metro bundler)
npx expo start --web        # Web preview
npm test                    # Unit + integration (Jest 161/161)
npx tsc --noEmit            # Verificar tipos (0 errores)
npx eslint .                # Lint

# Deploy Edge Functions
SUPABASE_ACCESS_TOKEN=<pat> npx supabase functions deploy calculate-intelligence \
  --project-ref bizbbtiyftfjufxinwsu --no-verify-jwt
```

---

## Admin

Acceso: `/admin` — requiere `is_admin = true` en `profiles`.

```sql
UPDATE profiles SET is_admin = true WHERE id = '<user_uuid>';
```

---

## ML Engine — Cron Jobs

| Job | Schedule | Función |
|-----|----------|---------|
| `intelligence-engine-calculate` | `0 */6 * * *` | Recalcula scores ML |
| `smart-notifications-hourly` | `5 * * * *` | Push notifications personalizadas |
| `cleanup-old-user-events` | `0 3 * * 0` | Limpia eventos > 90 días |
| `cleanup-old-notifications` | `30 3 * * 0` | Limpia notificaciones > 30 días |

---

## Estructura del proyecto

```
lifeflow/
├── app/                    # Pantallas (Expo Router)
│   ├── (tabs)/            # 6 tabs principales
│   ├── (auth)/            # Login / registro
│   ├── (onboarding)/      # Flujo de bienvenida
│   ├── admin/             # CMI admin (9 pantallas)
│   ├── bienestar/         # 7 módulos wellness
│   ├── module/[id].tsx    # Detalle de módulo
│   ├── lesson/[id].tsx    # Lección con tarea
│   ├── checkin.tsx        # Check-in diario
│   └── paywall.tsx        # Upgrade a Premium
├── components/            # Design system Polaris
├── constants/             # theme.ts
├── data/                  # modules.ts · tasks.ts · wellness.ts
├── hooks/                 # use-lifeflow · useUserIntelligence · useMentorMemory…
├── lib/                   # supabase · mentor · analytics · binaural · admin/…
├── services/              # notifications.ts · revenuecat.ts
├── store/                 # wellnessStore.ts (Zustand)
├── storage/               # local.ts (SecureStore abstraction)
├── supabase/
│   ├── functions/         # 4 Edge Functions (Deno)
│   └── migrations/        # 9 migraciones SQL
├── types/                 # lifeflow.ts · supabase.ts
├── __tests__/             # 39 archivos de tests
└── .github/workflows/     # batman-qa.yml
```

---

*LifeFlow © 2026 — Polaris Growth Institute*
