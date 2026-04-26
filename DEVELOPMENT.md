# 🚀 Guía de Desarrollo - Lifeflow

## Estado Actual (2026-04-20)

✅ **Completado:**
- ✓ Bloque 0: Sistema de evaluación y personalización completo
- ✓ 5 tab bar screens implementados (bitácora, avatar, mentor, comunidad, roadmap)
- ✓ TypeScript compilation: 0 errors
- ✓ Splash screen visual con animaciones Reanimated
- ✓ app.json configurado para dark mode (#01191D)
- ✓ AsyncStorage persistence en todos los screens
- ✓ OpenAI streaming integration con free tier limits
- ✓ SVG radar chart visualization en avatar screen

---

## 📱 Para Ver en Expo Go

### Paso 1: Limpiar y Preparar

```bash
cd lifeflow/
rm -rf .expo/ node_modules/.cache
npx expo start --clear
```

### Paso 2: En tu Smartphone

1. **Descarga Expo Go** (iOS App Store / Google Play Store)
2. **Abre Expo Go**
3. **Escanea el QR** que aparece en tu terminal o navegador
4. O escribe manualmente: `exp://[tu-ip]:8081`

### Paso 3: Navegar en la App

La app te llevará a través de este flujo:

```
splash (5 segundos) 
    ↓
┌─ ¿Completó onboarding?
│  NO → onboarding/step1-avatar (evaluar rueda de vida)
│  YES ↓
├─ ¿Hizo check-in hoy?
│  NO → /checkin (energía, foco, sueño)
│  YES ↓
└─ /(tabs)/bitacora (pantalla principal)
```

### Paso 4: Tab Bar (5 Screens)

| # | Tab | Descripción |
|---|-----|------------|
| 1 | 📖 Bitácora | Ritual diario con vers, gratitud, victorias |
| 2 | 🎯 Avatar | Rueda de vida radar chart + archetype |
| 3 | 💬 Mentor | IA streaming chat con free tier (5 msgs) |
| 4 | 👥 Comunidad | 6 sectores con feed de posts |
| 5 | 🗺️ Roadmap | 90 días: visión, hitos, acciones, plan mañana |

---

## 🎨 Design System

### Color Palette
- **Background**: #01191D (Rich Black)
- **Surface**: #0D2B30 (Dark Teal)
- **Primary**: #AEFEF0 (Mint)
- **Border**: rgba(174, 254, 240, 0.15)
- **Text Primary**: #AEFEF0
- **Text Muted**: rgba(174, 254, 240, 0.5)

### Typography
- Font Family: **Outfit** (SemiBold/Regular)
- Body: 12px, Regular, #AEFEF0
- Labels: 10px, SemiBold, #AEFEF0
- Headers: 12px, SemiBold, uppercase, 3px letter-spacing

---

## 📂 Estructura de Archivos

```
lifeflow/
├── app/
│   ├── index.tsx                    ← Splash screen (5 segundos)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                      ← 5 Tab Bar Screens
│   │   ├── _layout.tsx              ← Tab navigator
│   │   ├── bitacora.tsx             (560 líneas, ritual diario)
│   │   ├── avatar.tsx               (526 líneas, wheel of life)
│   │   ├── mentor.tsx               (560 líneas, IA chat)
│   │   ├── comunidad.tsx            (513 líneas, community feed)
│   │   └── roadmap.tsx              (704 líneas, 90-day planning)
│   ├── checkin.tsx                  ← 3 preguntas diarias
│   └── onboarding/
│       ├── step1-avatar.tsx
│       ├── step2-motivacion.tsx
│       ├── step3-wheel.tsx
│       └── step4-polaris.tsx
├── store/
│   └── index.ts                     ← Zustand stores + types
├── lib/
│   ├── openai.ts                    ← OpenAI client
│   ├── motivacionEngine.ts          ← Area calculations
│   └── versiculoEngine.ts           ← 1171 biblical verses
├── components/ui/
│   └── ConfettiExplosion.tsx        ← Celebration animation
├── app.json                         ← Dark mode config
├── package.json                     ← Dependencies
└── .env                             ← API keys (test values)
```

---

## 🔌 Data Persistence

### AsyncStorage Keys

**Daily (fecha-based):**
- `checkin_YYYY-MM-DD` - Daily check-in (energia, foco, sueño)
- `journal_YYYY-MM-DD` - Journal entry (gratitud, victorias, retos, intención)
- `ritual_YYYY-MM-DD` - Ritual completion timestamp
- `manana_plan_YYYY-MM-DD` - Tomorrow's plan (tarea, hora, interrupciones)
- `streak` - Consecutive ritual days

**Persistent:**
- `onboarding_completo` - true/false
- `onboarding_data` - WheelOfLife + MotivacionProfile JSON
- `vision_90_dias` - 3 vision items (lanzado/tendré/seré)
- `hitos_mensuales` - Monthly milestone checklist
- `acciones_semanales` - Weekly action items with urgency

---

## ✨ Key Features by Screen

### 🎯 Avatar (Rueda de la Vida)
- SVG radar chart con 8 áreas interactivas
- Gap analysis: importancia - satisfacción
- Critical zone badges (≥4) / Balanced (≤1)
- Metrics: Dominant area, anchor area, blind spot
- Sovereignty Index (promedio satisfacción)
- Archetype card con motivador personal

### 💬 Mentor (IA Streaming)
- OpenAI GPT-4o streaming chat
- Free tier: 5 messages/session
- Inline upgrade card (JSON detection)
- Full context: wheel, motivacion, checkin, streak, tier
- Time-based welcome messages
- Haptic feedback on send

### 👥 Comunidad (Sectores)
- 6 mock sectors (Entrenamiento, Running, Café & Negocios, etc)
- 3 sample posts con likes
- Add new post + toggle like
- Bottom input with send button
- Horizontal sector selector

### 🗺️ Roadmap (90 Días)
- Countdown card (90 days remaining)
- Horizon 1: Vision items (Habré lanzado, Tendré, Seré)
- Horizon 2: Hitos con checkbox + add/delete
- Horizon 3: Acciones con urgency tags (HOY/ESTA_SEMANA)
- Tomorrow's plan: 3 inputs + save button

### 📖 Bitácora (Ritual Diario)
- Versiculo del día (1171 verses, deterministic daily rotation)
- Gratitud x3
- Victorias (dynamic add/remove)
- Retos (dynamic add/remove)
- Intención (150 char limit)
- Confetti explosion on completion
- Streak tracking (🔥 counter)
- Low energy protocol banner if energía <= 2

---

## 🚨 Common Issues & Fixes

### "Unable to resolve module"
→ Check imports in avatar.tsx, comunidad.tsx, roadmap.tsx
→ Verify store/index.ts exports

### "VirtualizedList nested in ScrollView"
→ All 3 new screens use map() instead of FlatList ✓

### Port 8081 in use
```bash
kill -9 $(lsof -t -i:8081)  # macOS/Linux
netstat -ano | findstr :8081  # Windows, then taskkill /PID [pid]
```

### "Non-serializable values in navigation"
→ Don't pass functions via params
→ Use Zustand stores for shared state ✓

---

## 🔧 Development Tips

### TypeScript Check (0 errors)
```bash
./node_modules/.bin/tsc --noEmit
```

### Watch for Changes
Expo automatically reloads on file save. Just edit and watch!

### Debug Console
Press `d` in the terminal running `expo start` to open debug menu in app.

### Android Emulator
```bash
npx expo start --android
```

### iOS Simulator
```bash
npx expo start --ios
```

---

## 📊 Files Summary

| File | Type | Size | Lines | Purpose |
|------|------|------|-------|---------|
| avatar.tsx | Screen | 16 KB | 526 | Wheel visualization + metrics |
| comunidad.tsx | Screen | 15 KB | 513 | Community sectors + feed |
| roadmap.tsx | Screen | 22 KB | 704 | 90-day planning tool |
| bitacora.tsx | Screen | ~15 KB | 560 | Daily journal + ritual |
| mentor.tsx | Screen | ~18 KB | 560 | AI streaming chat |
| _layout.tsx | Router | ~1 KB | 40 | 5-tab navigator |
| store/index.ts | State | ~15 KB | ~300+ | Zustand stores + types |
| app.json | Config | 700 B | 35 | Dark mode, app metadata |

---

## 🎯 Next Steps (Optional)

1. **Customize verses** → Replace Proverbios.txt with custom bible verses
2. **Add real biometrics** → Integrate Whoop/Oura APIs
3. **Push notifications** → Setup expo-notifications
4. **Database sync** → Move from AsyncStorage to Supabase
5. **Build for App Store** → Run EAS build commands

---

## 📞 Quick Commands

```bash
# Start development server
npx expo start --clear

# Check TypeScript (should be 0 errors)
./node_modules/.bin/tsc --noEmit

# Install dependencies
npm install

# Update single package
npm install react-native-svg@latest --legacy-peer-deps
```

---

**Last Updated:** 2026-04-20  
**Author:** Growth Players Development Team  
**Status:** ✅ Ready for Expo Go testing
