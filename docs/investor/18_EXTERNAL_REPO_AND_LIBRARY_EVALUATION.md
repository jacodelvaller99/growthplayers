# 18 — External Repo & Library Evaluation

> Mandato: investigar amplio, adoptar solo con justificación clara, **no** introducir un segundo design
> system ni bloat. Clasificación: ADOPT NOW · REFERENCE ONLY · DEFER · REJECT.

## Resultado neto: **NO se instaló nada.**
El stack (Expo 54 / RN 0.81 / Reanimated / Skia / Gesture-Handler) ya contiene lo necesario. El valor está
en **usar mejor lo presente**, no en añadir superficie. Cada candidato fue evaluado contra: ¿el problema ya
está resuelto internamente? · riesgo de migración · ganancia de UX · deuda técnica.

| Librería / patrón | Problema que resuelve | Veredicto | Razón |
|---|---|---|---|
| **react-native-reanimated** (ya instalado) | Transiciones/motion fluido | **ADOPT NOW (usar más)** | Sin costo de instalación; habilita spring/stagger/scale Apple-grade. Es la palanca de motion. |
| **@shopify/react-native-skia** (ya instalado) | Charts/sparklines | **REFERENCE ONLY** | Ya cubre los sparklines actuales. No expandir a dashboards complejos sin necesidad de producto. |
| **expo-blur** | Glassmorphism / dismissal de sheets | **DEFER** | El mandato prohíbe blur decorativo. Solo si un sheet real necesita señal de fondo descartable. |
| **moti** | API declarativa de animación | **REJECT** | Redundante con Reanimated; añadiría una 2ª forma de animar → inconsistencia. |
| **tamagui / gluestack / nativewind** | UI kit / theming | **REJECT (crítico)** | Introduciría un **segundo design system**, destruiría la identidad Polaris (GrandisExtended + tokens + cv). El mandato lo prohíbe explícitamente. |
| **react-native-mmkv** | Storage rápido | **DEFER** | `expo-secure-store`/localStorage funcionan; cambiar el adapter de sesión es riesgo sin ganancia de UX visible. |
| **Sentry** | Error logging externo | **DEFER (recomendado pre-scale)** | Hoy hay crash capture → analytics. Sentry daría visibilidad de fallos de sync silenciosos (#21). Útil al escalar, no bloqueante. |
| **@tanstack/react-query** | Cache/estado servidor | **REJECT** | `useLifeFlow` + hooks dedicados + local-first ya cubren; migrar sería rewrite de toda la capa de datos. |

## Patrones de referencia (Apple HIG / Expo) adoptados como criterio, no como código
- **HIG — deferencia y claridad:** ya reflejado en el sistema de tarjetas/espacio.
- **HIG — touch targets 44pt:** auditado; corregido el caso <44 detectado (`norte` back button).
- **HIG — Dynamic Type / legibilidad mín:** auditado; corregidas fuentes <11pt en `welcome`.
- **Expo theming (CSS vars en web):** ya implementado de forma idéntica al patrón recomendado.

## Principio rector
> "Don't introduce a second design system by accident. Don't destroy the current Polaris identity while
> trying to improve polish." — cumplido: cero instalaciones, identidad intacta.
