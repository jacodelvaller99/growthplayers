# Brief de diseño Apple-grade — Polaris

Destilado de las skills `impeccable`, `emil-design-eng` (Emil Kowalski), `frontend-design`
y `redesign-existing-projects`, traducido a React Native/Expo y verificado contra el
código real de este repo — no genérico. Este documento es el **contrato** que sigue
cada agente de la Fase B/C del [plan](../../../../.claude/plans/que-hace-falta-para-parsed-canyon.md).
Si un finding o un fix contradice algo de aquí, gana este documento.

## Punto de partida (no hay que inventar un sistema, hay que cumplirlo)

Polaris ya tiene un design system real: `constants/theme.ts` (paleta con 6 ejes
semánticos, tokens dark/light vía `cv()`), `constants/themeColors.ts`, tipografía
GrandisExtended con 5 pesos, 5 variantes de botón, grid de 8pt, `radii.sm/md/lg`,
touch targets 44×44, `useReducedMotion` ya cableado. La auditoría interna previa lo
puntuó 7.9/10 en belleza. **El trabajo de esta pasada no es crear identidad — es
disciplina de ejecución**: encontrar dónde el sistema existe pero no se sigue, y
dónde faltan los detalles invisibles que separan "bien" de "Apple".

Stack de motion real disponible (verificado en `package.json`): `react-native-reanimated`
4.1, `react-native-gesture-handler` 2.28, `expo-haptics`, `expo-blur`,
`expo-linear-gradient`. **Dato del barrido**: haptics ya se usa en 21 archivos/62
sitios — bien. Reanimated (`useAnimatedStyle`/`withSpring`/`withTiming`) está
concentrado en solo 11 de ~87 pantallas (`welcome`, `comando`, `lesson`, `body-front-scan`,
`aura`, `polaris.tsx`, `HomeSkeleton`, `focus-deck`, `narrative`, `AnimatedNumber`). **La
mayoría de la app no tiene motion propio.** Esa es la brecha más grande y más barata de
cerrar: no hace falta un sistema nuevo, hace falta extender el que ya funciona.

## Reglas duras (no negociables — todo agente las obedece)

### Tokens y color
- Cero hex crudo nuevo. Siempre `palette.*` / `Colors.dark.*` / `cv()`.
- `palette.goldText` para texto/íconos dorados; `palette.gold` solo para fills;
  `palette.ink` solo sobre superficies doradas/claras (nunca como background).
- Para opacidad sobre un token themeable, usar `alpha(token, hex2)` de `themeColors.ts`
  — nunca concatenar string (`palette.gold + '44'` rompe en web, ver comentario en
  `theme.ts:41`).
- Un único acento saturado (el oro de marca). El púrpura de wellness y los semánticos
  (success/danger/warning/info/calm) ya están definidos — no inventar un color nuevo
  sin verificar que no exista ya un token para ese propósito.
- Paridad dark/light obligatoria en web (protegida por `__tests__/unit/themeColors` y
  `themeContrast.test.ts` — AA en las 5 superficies). Nativo se queda dark, no tocar
  esa decisión.

### Tipografía
- `Fonts.display*` para headings, nunca string literal de familia.
- Mínimo 11pt en cualquier label visible. Line-length razonable en bloques de texto
  largo (journaling, notas de sesión, chat de Norman).
- Jerarquía real: si dos niveles de texto usan el mismo peso/tamaño, no son dos niveles.

### Layout
- Grid de 8pt (`spacing.xs=4 … spacing.xxxl=48`); `radii.sm=8/md=12/lg=16`.
- Touch targets 44×44 mínimo, siempre.
- **Anti-patrón a cazar**: grillas de 3 tarjetas idénticas (icono+título+texto) — el
  catálogo de métricas de `comando.tsx` y los dashboards de admin son candidatos
  probables. Si el contenido varía en longitud, no forzar altura igual.
- Bordes tipo "side-stripe" (borde lateral de color como acento) — nunca intencional,
  usar fill tintado o ícono líder en su lugar.

### Motion (marco de decisión de Emil Kowalski, aplicado a Reanimated)
Antes de animar algo, en este orden:
1. **¿Se ve 100+ veces al día?** (toggle de tab, abrir/cerrar algo trivial) → sin
   animación.
2. **¿Cuál es el propósito?** — consistencia espacial, indicar estado, feedback de
   press, o evitar un cambio brusco. "Se ve cool" no es un propósito si es frecuente.
3. **Easing**: entra/sale → ease-out; se mueve en pantalla → ease-in-out; hover/color →
   ease; constante (progress bar) → linear. **Nunca ease-in en UI** — se siente lento
   justo en el momento que el usuario más mira. En Reanimated: `Easing.bezier(0.23, 1,
   0.32, 1)` como ease-out fuerte por defecto, no el `Easing.ease` plano.
4. **Duración**: press feedback 100-160ms · tooltips/popovers 125-200ms · modales/drawers
   200-500ms. Bajo 300ms para cualquier interacción de UI repetida.
5. **Feedback de press**: todo elemento presionable con `scale(0.97)` en press-in,
   vuelta en press-out. Combinar con el haptic ya existente en ese componente cuando
   aplique — no duplicar el feedback, complementarlo.
6. **Nunca animar desde `scale(0)`** — arrancar en `scale(0.9-0.95)` + opacity 0.
7. **`useReducedMotion()` obligatorio** en toda animación nueva no trivial — ya está
   cableado en `AnimatedNumber`, `SkeletonBar`, `HomeSkeleton`; extender el patrón, no
   reinventarlo.
8. Springs (`withSpring`) para: drag/gestos, elementos que deben sentirse "vivos"
   (streak, aura, focus-deck), interacciones interrumpibles. Timing (`withTiming`) para
   todo lo demás. Bounce sutil (0.1-0.3) si se usa, nunca en UI funcional (dashboards,
   biométricos) — ahí cero rebote.

### Copy y estados (frontend-design + redesign-existing-projects)
- Voz activa, específica, sin clichés de "elevar/potenciar/desbloquea tu mejor
  versión". El copy ya tiene voz propia (Norman, "Persigue el estado, no el
  resultado") — reforzarla, no genérica.
- **No tocar copy protegido por witness** (`scripts/check-witness.mjs` +
  `witness-fixes.json`) — verificar antes de editar cualquier string que aparezca ahí.
- Estados vacíos son invitación a actuar, no un hueco en blanco. Estados de error
  explican qué pasó y qué hacer, en la voz de la interfaz — nunca `Alert.alert`
  genérico tipo "Oops!".
- Marcadores numerados (01/02/03) solo si el contenido es de verdad una secuencia
  ordenada (el wizard de onboarding SÍ califica; una lista de features NO).

### Accesibilidad
- No bajar la cobertura actual de `accessibilityLabel`/`accessibilityRole` (86% de
  archivos con texto ya la tienen — es una fortaleza real, protegerla).
- Contraste AA verificado por los tests existentes — cualquier color nuevo debe pasar
  esa misma barra, no asumir.

### Seguridad de producto (no tocar)
- `SafetyWarning`, disclaimers de salud, ruteo de crisis en Norman/internista: cambios
  visuales sí, cambios de comportamiento/copy de seguridad no, sin excepción.
- Consent gates (onboarding, internista, comunidad) no se simplifican sin revisar la
  lógica legal detrás.

### Disciplina de ejecución multiagente
- Cambios quirúrgicos por pantalla — cada finding referencia archivo(s) concretos.
- Lo compartido (`components/polaris.tsx`, `constants/theme.ts`, `themeColors.ts`) lo
  toca UN agente dedicado en la Fase C, nunca en paralelo con los agentes de dominio.
- Un agente de dominio no edita archivos de otro dominio — los 8 dominios de la Fase B
  no se solapan en archivos.

## Categorías de finding esperadas (guía para los auditores de Fase B)

1. **Jerarquía visual rota** — dos niveles de info con el mismo peso.
2. **Motion faltante** — pantalla sin Reanimated donde hay una transición de estado
   que hoy es un corte seco (loading→loaded, seleccionado→no seleccionado, entrada de
   lista).
3. **Feedback de press ausente** — Pressable sin scale/haptic en una acción primaria.
4. **Inconsistencia cross-dominio** — el mismo patrón (ej. tarjeta de métrica, empty
   state, skeleton) resuelto distinto en dos pantallas → candidato a extraer a
   `polaris.tsx`.
5. **Hueco de a11y** — falta `accessibilityLabel`/`accessibilityHint` en control no
   obvio.
6. **Anti-patrón de layout** — grilla forzada, tarjeta anidada, densidad pareja donde
   debería haber respiro.
7. **Copy genérico o alerta nativa** — `Alert.alert` crudo, mensaje de error sin
   dirección clara.
8. **Token roto** — hex crudo, o token themeable usado donde debía ser constante (o
   viceversa) — riesgo real dado el bug histórico de `goldStatic` en Reanimated.

Cada finding: `{screen, issue, severity (P0-P2), fix_sugerido, files}`. Severidad por
impacto en el golden path (auth→onboarding→comando→mentor→paywall pesan más que
pantallas administrativas).
