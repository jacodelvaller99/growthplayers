# Lifeflow - Quick Start Guide

## Project Status: ✅ READY FOR DEVELOPMENT

The Lifeflow app is fully built and ready to run. All TypeScript compilation passes, all dependencies are installed, and the Metro bundler is running.

---

## 🚀 Quick Start (2 minutes)

### 1. Start Development Server
```bash
cd lifeflow
npm start
```

Metro bundler will start on `http://localhost:8082`

### 2. Choose Your Platform

When prompted in the terminal, press:
- **`a`** - Run on Android emulator
- **`i`** - Run on iOS simulator  
- **`w`** - Run on Web browser
- **`r`** - Reload app
- **`m`** - Toggle Metro DevTools

### 3. Test the App

After selecting a platform:
1. **Login/Register** - Create an account with email
2. **Onboarding** - Set avatar name and sovereignty wheel assessment
3. **Explore Tabs** - Try all 5 main features
4. **Test Screens** - Navigate to secondary screens (breathing, avatar, plans)

---

## 📋 Setup Checklist

### Environment Variables
- [x] `.env` file created with placeholder values
- [x] `.env.example` shows all required variables
- [ ] Fill in real Supabase credentials
- [ ] Fill in real OpenAI API key
- [ ] Fill in real RevenueCat API key (optional)

### Project Files
- [x] 20 screens built
- [x] 7 UI components built
- [x] 5 Zustand stores configured
- [x] Design system implemented
- [x] TypeScript strict mode enabled
- [x] All dependencies installed (44 packages)

### Build System
- [x] Metro bundler working
- [x] TypeScript compilation passing
- [x] React Native Reanimated v4 ready
- [x] Expo Router configured
- [x] EAS build profiles ready

---

## 🔐 To Enable Real Features

### Supabase Setup
1. Create account at https://supabase.com
2. Create new project
3. Get credentials from Settings > API
4. Copy to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=<your-url>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-key>
   ```
5. Create tables using SQL migration (ask Claude to generate)

### OpenAI Setup
1. Create account at https://platform.openai.com
2. Generate API key at https://platform.openai.com/api-keys
3. Copy to `.env`:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-<your-key>
   ```

### RevenueCat Setup (for In-App Purchases)
1. Create account at https://revenuecat.com
2. Create iOS & Android projects
3. Copy API key to `.env`:
   ```
   REVENUE_CAT_API_KEY=<your-key>
   ```

---

## 📁 Project Structure at a Glance

```
lifeflow/
├── app/                          # Screens (Expo Router)
│   ├── (auth)/                   # Authentication flows
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── onboarding/           # 3-step onboarding
│   ├── (tabs)/                   # Main navigation
│   │   ├── bitacora.tsx          # Daily rituals
│   │   ├── mentor.tsx            # AI mentoring
│   │   ├── biometria.tsx         # Biometrics
│   │   ├── comunidad.tsx         # Community
│   │   └── roadmap.tsx           # Vision cascading
│   ├── respiracion.tsx           # Breathing protocol
│   ├── avatar.tsx                # Sovereignty wheel
│   ├── planes.tsx                # Subscription plans
│   ├── recursos.tsx              # Daily resources
│   ├── pilares.tsx               # 3-pillar architecture
│   ├── sector/[id].tsx           # Dynamic sector page
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable UI components
│   ├── ui/                       # Design system components
│   │   ├── TacticalGrid.tsx
│   │   ├── TacticalCard.tsx
│   │   ├── MintButton.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── StatusBadge.tsx
│   │   └── StreakDisplay.tsx
│   └── mentor/
│       └── UpgradeCTA.tsx
├── services/                     # External integrations
│   └── revenuecat.ts
├── hooks/                        # Custom React hooks
│   └── useSubscription.ts
├── store/                        # Zustand state management
│   └── index.ts
├── lib/                          # Utility libraries
│   └── supabase.ts
├── constants/                    # Design system constants
│   ├── Colors.ts
│   ├── Typography.ts
│   └── Layout.ts
├── .env                          # Environment variables
├── .env.example                  # Template
├── app.json                      # Expo configuration
├── eas.json                      # EAS build configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── PROJECT_BUILD_REPORT.md       # Full build documentation
```

---

## 🎨 Design System Overview

### Colors (Protocolo Soberano)
- **Primary:** Mint Green (#00ffa3) on Dark (#070a08)
- **Pillars:** 8 colors for life areas (Fe, Finanzas, Salud, Familia, Mente, Negocio, Impacto, Legado)
- **Status:** Green (success), Amber (warning), Red (error)

### Typography
- **Headlines:** Space Grotesk 700/600
- **Body:** Space Grotesk 400
- **Data:** Space Mono 400/700

### Layout
- **Base Unit:** 8px grid
- **Spacing:** xs(4) sm(8) md(12) lg(16) xl(24) 2xl(32) 3xl(40)
- **Radius:** 12px cards, 8px buttons
- **Shadows:** Custom mint-tinted shadows

---

## 🔌 Key Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **Supabase** | PostgreSQL + Auth | Ready (needs credentials) |
| **OpenAI** | AI Mentoring | Ready (needs API key) |
| **RevenueCat** | In-App Purchases | Mock (ready for real keys) |
| **Whoop** | Biometrics | OAuth ready |
| **Oura Ring** | Biometrics | OAuth ready |
| **Expo Router** | Navigation | Working ✅ |
| **React Native Reanimated** | Animations | Working ✅ |
| **Zustand** | State Management | Working ✅ |

---

## 🧪 Testing Each Feature

### 1. Authentication
```
Login or Register → Fill email/password → See onboarding
```

### 2. Onboarding (3 steps)
```
Step 1: Enter name & 90-day objective
Step 2: Adjust 8 pillar sliders (0-10 scale)
Step 3: See animated welcome screen → Auto-navigate to Bitácora
```

### 3. Daily Rituals (Bitácora Tab)
```
- Add 3 gratitudes → Click "Completar" → See success state
- Add victories and challenges dynamically
- Set daily intention
- See streak counter
```

### 4. AI Mentor (Mentor Tab)
```
- Send message → See mock response (real: needs OpenAI key)
- View UpgradeCTA card for premium features
```

### 5. Sovereignty Wheel (Avatar Screen)
```
Navigate from Bitácora or Recursos → See 8 pillar radar
Adjust sliders → Click "Guardar Evaluación"
```

### 6. Breathing Protocol
```
Navigate from Recursos → Select 3/5/10 minute duration
Press "INICIAR" → See animated circle scale to 4-phase rhythm
Completes: Marks breathing_done in today's journal entry
```

### 7. Biometrics
```
Connect Whoop or Oura (simulated) → See HRV, sleep, recovery charts
Add supplements to daily stack
```

### 8. Roadmap
```
Set 90-day vision → See cascade to monthly/weekly/daily
Add daily missions → Check off to complete
See progress bar update
```

### 9. Community
```
See 2-column grid of sectors
Tap sector → See dynamic [id] page with 3 tabs
(Intel = posts, Misiones = challenges, Agentes = mentors)
```

### 10. Subscription Plans
```
Navigate to Planes → See 3 tiers (free, $29, $497)
Tap "Seleccionar Plan" → Would trigger RevenueCat purchase
(mock implementation ready for real keys)
```

---

## 🐛 Troubleshooting

### Metro bundler won't start
```bash
# Kill old bundler on port 8081-8082
# Try different port:
EXPO_PORT=8090 npm start
```

### Fonts not loading
```bash
# Fonts are downloaded on first app load
# Wait 30 seconds for download to complete
# Clear cache if needed:
npm start -- --clear
```

### TypeScript errors
```bash
# Verify compilation:
npx tsc --noEmit
# Check for missing modules:
npm install
```

### Supabase connection fails
```bash
# Check .env variables
cat .env
# Verify credentials at https://supabase.com/dashboard
# Test connection: Check console logs in app
```

---

## 📚 Further Reading

- **Full Build Report:** See `PROJECT_BUILD_REPORT.md` (comprehensive)
- **Design System:** `constants/Colors.ts`, `Typography.ts`, `Layout.ts`
- **State Management:** `store/index.ts` (Zustand slices)
- **Supabase Setup:** `lib/supabase.ts` with table schema
- **Expo Router Docs:** https://docs.expo.dev/router/introduction
- **React Native Reanimated:** https://docs.swmansion.com/react-native-reanimated

---

## ✨ Next Steps

### For Development
1. Fill in `.env` with real API credentials
2. Run the app on emulator: `npm start` → `a` (Android) or `i` (iOS)
3. Test each feature (see Testing section above)
4. Customize colors/text in `constants/` if needed

### For Production
1. Set up Apple Developer account
2. Set up Google Play Developer account
3. Configure app icons and splash screens
4. Run `npm run build:ios` and `npm run build:android`
5. Submit to stores using `npm run submit:ios` and `npm run submit:android`

---

## 🎯 Feature Completion Status

✅ **Complete & Ready:**
- Authentication (email/password + OAuth skeleton)
- Onboarding flow (3 steps with animations)
- 5 main navigation tabs
- 6 secondary screens
- 7 reusable UI components
- Design system (colors, typography, layout)
- State management (Zustand)
- Supabase integration (schema ready)
- RevenueCat mock (ready for real keys)
- EAS build config (ready to build)

⏳ **Needs Credentials:**
- OpenAI mentoring (needs API key)
- Supabase backend (needs project credentials)
- RevenueCat purchases (needs real API key)
- Biometric OAuth (needs app registration)

---

**Built with:** Expo 54 | React Native 0.81 | TypeScript 5.9 | Zustand 5 | Supabase

**Status:** Ready for development & testing 🚀
