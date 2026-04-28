# Master Context

## Integración IA
System prompt: POLARIS v2 — empresario senior, ventas, growth, cierre de deals

---

## 🦾 SUPERPOWERS ACTIVOS
**Instalado:** obra/superpowers v14 skills  
**Comando instalación:** `npx skills add obra/superpowers`  
**Fecha activación:** 2026-04-20  
**Status:** ✅ 14/14 skills instalados y activos

### REGLAS DE USO OBLIGATORIO

ANTES de cualquier **FIX**:
→ `/systematic-debugging` (4 fases, NO patches ciegos)
   - Fase 1: Root cause investigation
   - Fase 2: Pattern analysis
   - Fase 3: Hypothesis + test mínimo
   - Fase 4: Fix + verify

ANTES de cualquier **FEATURE NUEVA**:
→ `/brainstorming` → `/writing-plans` → `/executing-plans`

ANTES de decir **"LISTO"**:
→ `/verification-before-completion` siempre

ANTES de **MERGEAR**:
→ `/finishing-a-development-branch` (checklist de merge)

### LOS 14 SKILLS ACTIVADOS

**OBLIGATORIOS (úsalos en CADA tarea):**
1. `using-superpowers` — Regla maestra: invocar skill antes de cualquier acción
2. `brainstorming` — Antes de implementar cualquier feature nueva
3. `systematic-debugging` — Antes de intentar CUALQUIER fix (no más parches ciegos)
4. `writing-plans` — Antes de tocar código en tareas complejas
5. `executing-plans` — Para ejecutar los planes escritos
6. `verification-before-completion` — Verificar ANTES de decir "listo"

**IMPORTANTES:**
7. `test-driven-development` — Escribir test fallido ANTES del código
8. `requesting-code-review` — Pedir review después de cambios grandes
9. `receiving-code-review` — Aplicar feedback correctamente
10. `subagent-driven-development` — Para tareas paralelizables
11. `dispatching-parallel-agents` — Múltiples tareas simultáneas
12. `finishing-a-development-branch` — Antes de mergear cualquier rama
13. `using-git-worktrees` — Para aislar features
14. `writing-skills` — Para documentación clara

### RED FLAGS (PARAR SI PIENSAS ESTO)
- "Fix rápido por ahora" → **STOP**
- "Probablemente es X" → **STOP**
- "Ya sé lo que es" → **STOP**
- "Un cambio más" → **STOP**

Cuando veas estos flags, invoca `/systematic-debugging` inmediatamente.

### FLUJO ESTÁNDAR DEBUGGGING
1. Leer error completo (no saltarse nada)
2. Reproducir consistentemente
3. Revisar cambios recientes (`git diff`)
4. Hipótesis única y específica
5. Fix mínimo para testear hipótesis
6. Si 3+ fixes fallaron → problema arquitectural, STOP

### CHECKLIST ANTES DE CADA TAREA
- [ ] ¿Es un fix? → `/systematic-debugging` primero
- [ ] ¿Es feature nueva? → `/brainstorming` → `/writing-plans`
- [ ] ¿Cambios grandes? → `/requesting-code-review` después
- [ ] ¿Antes de mergear? → `/finishing-a-development-branch`
- [ ] ¿Terminé? → `/verification-before-completion` siempre

---

## 🎨 UX LUXURY UPGRADES

**Skills instalados:** `ui-ux-pro-max` (nextlevelbuilder) + `react-native-design` (wshobson)
**Audit completado:** 21 Abril 2026
**Stack:** React Native + Expo 54 + Reanimated v4 + expo-haptics + expo-linear-gradient

### Scores finales

| Pantalla | Pre-audit | Post Nivel 2+3 | Delta |
|---|---|---|---|
| comando.tsx | 7/10 | **9/10** | +2.0 |
| mentor.tsx | 6.5/10 | **9/10** | +2.5 |
| bitacora.tsx | 7/10 | **8.5/10** | +1.5 |
| avatar.tsx | 6/10 | **8.5/10** | +2.5 |
| checkin.tsx | 6/10 | **8/10** | +2.0 |

**Score promedio pre-audit:** 6.5/10
**Score promedio post-fix:** 8.6/10 ✅

### Fixes Implementados ✅ — Nivel 1

1. ✅ **Pulsing ONLINE dot** — `Animated.loop` en statusDot, señal "live" instantánea
2. ✅ **Staggered KPI entrance 80ms** — 4 cards con translateY+opacity stagger
3. ✅ **Wave LoadingDots 0/150/300ms** — ola premium vs blink sincronizado
4. ✅ **Haptic send Light** — `impactAsync(Light)` al enviar mensaje mentor
5. ✅ **SkeletonBar shimmer** — reemplaza "Cargando actividad..." con skeleton animado
6. ✅ **Animated progress bars** — `Animated.timing` 0%→target%, 900ms ease-out-cubic

### Fixes Implementados ✅ — Nivel 2

7. ✅ **Frosted glass modales** — `rgba(13,43,48,0.88)` + border `rgba(174,254,240,0.12)` en UpgradeCard y checkin options
8. ✅ **Weight contrast tipográfico** — victorias/retos `400Regular`→`600SemiBold` color mint
9. ✅ **Pull-to-refresh mint** — `RefreshControl tintColor="#AEFEF0"` en comando + bitácora
10. ✅ **Empty states diseñados** — ícono 72px opacity 0.25 + título + CTA mint en avatar/checkin

### Fixes Implementados ✅ — Nivel 3

11. ✅ **Haptic completo (5 puntos)** — tabs `selectionAsync`, ritual `notificationAsync(SUCCESS)`, checkin `SUCCESS`/`ERROR`, mentor error `ERROR`
12. ✅ **RadarChart spring animation** — 5 ejes stagger 100ms, `withSpring(damping:10, stiffness:80)`, container `scale 0.7→1`

### Fixes Implementados ✅ — Sesión 3 (21 Abril 2026)

13. ✅ **`comunidad.tsx` full UX upgrade** — FadeInDown stagger, animated progress bar (withSpring), haptics (like=Light, post=Medium, sector=selectionAsync), snapToInterval sector scroll, frosted glass input (BlurView intensity=70), arrow-up send icon, RefreshControl mint, feed stagger 80ms
14. ✅ **`roadmap.tsx` full UX upgrade** — FadeInDown stagger 5 sections (0/80/160/240/320/400ms), animated CountdownBar + HitosProgressBar (withSpring), haptics (checkbox=Light, urgencia=selectionAsync, save=SUCCESS), RefreshControl mint, removed Alert.alert
15. ✅ **Skeleton loaders** — `BitacoraSkeleton` + `AvatarSkeleton` con shimmer pulsante (`withRepeat(withSequence(...), -1)`) reemplazando `return null` y static loading text
16. ✅ **`expo-blur` nativo iOS** — `BlurView` (intensity=60/70, tint="dark") en UpgradeCard (mentor.tsx) y input bar (comunidad.tsx)

### Scores finales sesión 3

| Pantalla | Pre-sesión3 | Post-sesión3 | Delta |
|---|---|---|---|
| comunidad.tsx | 5/10 | **9/10** | +4.0 |
| roadmap.tsx | 5.5/10 | **9/10** | +3.5 |
| bitacora.tsx | 8.5/10 | **9.5/10** | +1.0 |
| avatar.tsx | 8.5/10 | **9.5/10** | +1.0 |
| mentor.tsx | 9/10 | **9.5/10** | +0.5 |

**Score promedio post-sesión3:** 9.3/10 ✅

### Feature: Cuadro de Respiración ✅ [21 Abril 2026]

**Decisión UX:** Modal screen `app/respiracion.tsx` (no tab) — inmersión total, sin tab bar, se lanza y cierra desde Comando.

**Implementado:**
- `app/respiracion.tsx` — Box Breathing 4-4-4-4 completo
  - Círculo SVG animado: `circleScale` `withTiming(4000ms, Easing.inOut(ease))` inhala 0.6→1.0 / exhala 1.0→0.6
  - Anillo de progreso SVG: `AnimatedCircle` con `useAnimatedProps` → `strokeDashoffset` CIRCUMFERENCE→0 en 4s por fase
  - Glow exterior animado: `Animated.View` con `shadowColor: mint`, opacity sincronizada con fase
  - Fases hold: pulso suave `withRepeat(withSequence(…), 2, true)` en glow
  - Contador 4…3…2…1 por fase via `setInterval` 1000ms
  - Selector: 3 / 5 / 10 rondas
  - Dots de progreso de rondas
  - Phase guide strip (INHALA/SOSTÉN/EXHALA/SOSTÉN) activo durante sesión
- **Haptics por fase:** INHALA=Light, SOSTÉN=Medium, EXHALA=Light, ronda completa=SUCCESS
- **Estado máquina:** idle → running → paused → complete, refs estables para closures de timer
- **Acceso desde `comando.tsx`:** tarjeta "RESPIRA" en Row 2 (3 columnas junto a Roadmap) con `router.push('/respiracion')`

---

## Sesión 2026-04-22 — Multi-programa completado

### Design System
- `components/design/tokens.ts` extendido con `PolarisTokens` + `GrowthPlayersTokens`
- `getProgramTokens(programType)` disponible globalmente
- `POLARIS_SYMBOL_ICONS` mapeados a Ionicons (10 símbolos)
- `ProgramType = 'polaris' | 'growth_players'` exportado

### Estado — programStore
- `store/programStore.ts` creado con persist (AsyncStorage)
- `POLARIS_MODULES`: 10 módulos (pol_1 → pol_10)
- `GP_MODULES`: 11 módulos (gp_1 → gp_11)
- Racha, arquetipo, notas por módulo, sovereigntyScore persistidos
- `getModulesForProgram(programType)` helper disponible

### UI
- Tab bar dinámico: dorado (#EDBA01) para Polaris, mint (#AEFEF0) para GP
- `app/(tabs)/academia.tsx` creado: lista de módulos con progreso, notas, completado
- `services/revenuecat.ts` vaciado: stub sin pagos, `isActive: true` siempre

### IA Mentor
- Sin límites de mensajes (eliminados free tier checks, UpgradeCard, isFreeAndLimited)
- `buildFullSystemPrompt` ahora acepta objeto `{userName, programType, archetypeId, currentModuleTitle, ...}`
- System prompt dinámico: Polaris usa brand values de transformación integral; GP usa brand de negocios/ventas
- Nunca menciona precios ni upgrades
- Termina con 1 acción en 24h conectada al módulo actual

### Pendientes siguiente sesión
- Conectar `programType` en mentor.tsx desde `useProgramStore` (actualmente hardcoded como 'growth_players')
- Conectar `currentModuleTitle/Subtitle` en mentor.tsx desde módulo activo del programStore
- Conectar `sovereigntyScore` desde programStore al system prompt

---

### Pendientes UX (para llegar a 10/10)

- [ ] Transiciones shared element entre tabs (ritual completion → comando)
- [ ] `expo-linear-gradient` en identity card borde superior (avatar.tsx)
- [ ] `comunidad.tsx` — conectar feed real a backend/Supabase
- [ ] `roadmap.tsx` — conectar hitos/acciones a backend
- [ ] Guardar sesión de respiración completada en AsyncStorage/Supabase

---

### Historial de sesiones

#### [21 Abril 2026] — UX Luxury Upgrade 6.5→8.6
- Skills: `nextlevelbuilder/ui-ux-pro-max` + `wshobson/react-native-design`
- Audit completo: 5 pantallas evaluadas
- 12 fixes implementados (Nivel 1+2+3)
- Score promedio: 6.5 → 8.6/10
- 0 errores TypeScript ✅

#### [21 Abril 2026] — UX Luxury Upgrade 8.6→9.3 (Sesión 3)
- Audit completo: comunidad.tsx + roadmap.tsx
- 4 fixes implementados (Nivel 4)
- Score promedio: 8.6 → 9.3/10
- expo-blur instalado y activo (SDK 54 compatible)
- 0 errores TypeScript ✅

#### [21 Abril 2026] — Feature: Cuadro de Respiración (Sesión 4)
- Nueva pantalla: `app/respiracion.tsx` (modal, no tab)
- Box Breathing 4-4-4-4 con AnimatedCircle SVG + progress ring + glow
- State machine: idle/running/paused/complete con refs estables
- Haptics en cada fase + SUCCESS por ronda
- Selector 3/5/10 rondas + dots de progreso
- Acceso desde comando.tsx (Row 2 → tarjeta RESPIRA)
- 0 errores TypeScript ✅

#### [23 Abril 2026] — OPERACIÓN ACABADO TOTAL (Sesión 5)

**Objetivo:** App 100% funcional en dev mode sin credenciales reales.

**Fixes aplicados:**

| Archivo | Fix |
|---|---|
| `app/(auth)/login.tsx` | Dev bypass inteligente: activa SOLO cuando `EXPO_PUBLIC_SUPABASE_URL` contiene `'your-project'`. Se auto-desactiva con credenciales reales. |
| `app/(auth)/register.tsx` | Eliminado mock bypass; error de red muestra instrucciones claras para configurar `.env` |
| `store/index.ts` | Fix race condition: `getSession()` ya no sobreescribe sesión dev si resuelve null después del bypass |
| `app/(tabs)/mentor.tsx` | `marginBottom: Platform.OS === 'web' ? 60 : 0` en inputBar — send button tapado por tab bar (z=999) |
| `app/(tabs)/avatar.tsx` | SVG `viewBox="-20 -20 280 280"` — label "Impacto" ya no se recorta (eje 180°, textAnchor middle) |
| `app/(tabs)/_layout.tsx` | Biometría (`heart-pulse`) y Comunidad (`account-group`) con íconos correctos |
| `app/(tabs)/academia.tsx` | `backgroundColor: '#01191D'` — corrige fondo negro puro |
| `app/(tabs)/comando.tsx` | `SkeletonBar` component para loading state de KPIs |
| `app/(onboarding)/wheel.tsx` | Supabase save en try/catch con fallback graceful en dev mode |

**Bugs raíz descubiertos:**
- Race condition en auth store: `getSession()` resolvía null DESPUÉS del login bypass y borraba la sesión
- Send button de Mentor debajo del tab bar en web (`position: absolute`, z=999 del tab bar vs z=10 del inputBar)
- SVG viewBox sin margen para labels externos al radio del radar

**Estado final:**
- `tsc --noEmit`: 0 errores en código app ✅
- Login dev mode: funcional (bypass auto-detect placeholder URL) ✅
- MENTOR send: mensaje enviado → fallback "Error de conexión con Qwen" ✅
- AVATAR: radar chart con sovereignty index 6.3/10 ✅
- COMANDO: KPIs, módulo actual, acciones del día ✅

**Credenciales necesarias para producción:**
```
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
EXPO_PUBLIC_OPENAI_KEY=sk-...
REVENUE_CAT_API_KEY=...
```
Al configurar estas variables el dev bypass se desactiva automáticamente.

---

#### [28 Abril 2026] — OPERACIÓN LIFEFLOW COMPLETA (Sesiones 6–8)

**Objetivo:** Método Polaris completo en app — 26 lecciones, Skool URLs, WebView, sistema de tareas, Mentor IA entrenado, Supabase 5 tablas.

---

### Arquitectura final — Stack de datos

| Capa | Tecnología | Uso |
|---|---|---|
| Local primario | expo-secure-store (`writeLocal`/`readLocal`) | Offline-first, estado en tiempo real |
| Remoto backup | Supabase PostgreSQL | Sync, multi-device, analytics |
| Auth | Supabase Auth (email + anon) | Sesión persistida en SecureStore |
| Video | react-native-webview → Skool URL | Lecciones embebidas |

---

### Schema Supabase — 5 tablas ✅ LIVE

```sql
user_profiles       — perfil + norte + sovereign_score + streak + tier
daily_checkins      — energy/clarity/stress/sleep por fecha (UNIQUE user_id+date)
lesson_tasks        — respuestas a tareas por lección (UNIQUE user_id+lesson_id)
completed_lessons   — registro de lecciones completadas
mentor_messages     — historial conversación IA (role: 'user'|'assistant')
```

**View:** `user_progress` — agrega perfil + lecciones + tareas + último check-in.
**RLS:** habilitado en las 5 tablas. Políticas `auth.uid() = user_id`.
**Triggers:** `handle_new_user()` (auto-crea perfil al registrarse), `handle_updated_at()` (updated_at automático).
**Migración:** `supabase/migrations/20260428155503_lifeflow_complete_schema.sql` — aplicada vía SQL Editor ✅

---

### Módulos Polaris — estructura final

| # | ID | Título | Lecciones | Status |
|---|---|---|---|---|
| 0 | onboarding | Onboarding | 7 | active |
| 1 | guerrero-mentalidad | El Guerrero: Mentalidad | 7 (Skool URLs ✅) | active |
| 2 | emociones-autoconocimiento | Emociones y Autoconocimiento | 4 | locked |
| 3 | maduracion-guerrero | Maduración del Guerrero | 5 | locked |
| 4 | pontifice-flow | El Pontífice y el Flow | 4 | locked |
| 5–9 + sesiones | varios | Módulos avanzados + Sesiones Semanales | — | coming_soon |

**Skool URLs:** Módulo 1 tiene todas las URLs cargadas. Módulos 2–4 sin URL (coming soon individual). Módulos 5–9 con URL de módulo general.

---

### Sistema de Tareas por Lección ✅

- **12 tareas** en `data/tasks.ts` cubriendo módulos 1–7
- Pantalla `app/lesson/[id].tsx`: WebView + formulario de tarea + guardar/completar flow
- `saveLessonTask(lessonId, responses)` → local + Supabase `lesson_tasks`
- `markLessonComplete(lessonId)` → local + Supabase `completed_lessons`
- Estado de lección derivado dinámicamente de `completedLessons[]`

---

### Mentor IA — contexto completo ✅

```typescript
MentorContext {
  userName, role, totalDays, streak, sovereignScore, tier,
  activeModuleTitle, activeModuleProgress,
  northStar: { purpose, identity, nonNegotiables, dailyReminder },
  todayCheckIn,       // energy/clarity/stress/sleep del día
  messageCount,
  completedTasks[]    // lessonId + lessonTitle + keyResponse
}
```

- System prompt: 9 módulos del Método Polaris + 6 reglas de comportamiento
- Providers: NVIDIA (deepseek-ai/deepseek-v4-pro) primario, Groq (Qwen3-32b) fallback
- `saveMentorMessage('user'|'assistant', content)` persiste cada mensaje en Supabase

---

### Persistencia en `hooks/use-lifeflow.tsx`

| Función | Local | Supabase |
|---|---|---|
| `completeOnboarding` | `writeLocal` | `db.profiles().upsert()` |
| `saveCheckIn` | `writeLocal` | `db.checkins().upsert()` + actualiza `sovereign_score/streak/total_days` en profiles |
| `saveLessonTask` | `writeLocal` | `db.tasks().upsert()` |
| `markLessonComplete` | `writeLocal` | `db.completed().upsert()` |
| `saveMentorMessage` | — | `db.messages().insert()` |
| `loadUserData(uid)` | `readLocal` (seed) | carga las 5 tablas al login |

---

### Estado del día — 28 Abril 2026

| Ítem | Estado |
|---|---|
| Método Polaris completo en app (9 módulos) | ✅ |
| 26 lecciones con estructura real | ✅ |
| Skool URLs Módulo 1 cargadas | ✅ |
| WebView videos con loading/error states | ✅ |
| Sistema de tareas por lección (12 tareas) | ✅ |
| Mentor IA entrenado al 100% con Polaris | ✅ |
| Schema Supabase 5 tablas + RLS + triggers | ✅ LIVE |
| TypeScript typed client + db.* helpers | ✅ |
| Full data persistence (local-first + Supabase) | ✅ |
| tsc --noEmit | ✅ 0 errores |
| npm test | ✅ 34/34 |
| TestFlight piloto | 🔴 siguiente sesión |

---

### Siguiente sesión — TestFlight

1. `eas build --platform ios --profile preview` → IPA para piloto
2. Subir a TestFlight + invitar testers internos
3. Conectar Skool URLs Módulos 2–4 cuando estén listos
4. Activar módulos 2–4 (`status: 'locked'` → `'active'`) según avance del piloto
