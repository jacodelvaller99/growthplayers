# 17 — Apple-grade UX Review

> Estándar aplicado: claridad · deferencia (el contenido es el héroe) · profundidad (jerarquía/movimiento
> con intención) · confianza de producción. No imitación visual de Apple — juicio de producto elite.

## Veredicto
La app ya transmite **calma y premium** en su estructura base. El gap hacia "world-class" no es de
arquitectura (sólida) sino de **consistencia tipográfica y de espaciado** en pantallas densas. Score
**74/100** — alto para un producto privado de este alcance; el último tramo es pulido, no rediseño.

## Fortalezas Apple-grade (mantener)
- **Deferencia real:** tarjetas (`PremiumCard`), divisores de oro y espacio en blanco dejan respirar el
  contenido (proceso, cuerpo, compromisos, tareas). El oro es acento, no decoración.
- **Continuidad de tema:** light/dark cambia instantáneamente vía CSS vars — sin parpadeo, sin refactor
  por pantalla. Verificado en vivo.
- **Jerarquía de marca:** GrandisExtended para display, tokens semánticos, sistema de 5 botones unificado.
- **Estados de confianza:** ErrorBoundary de marca, toasts honestos (synced/queued), timeout visible del
  mentor — el producto no finge éxito.

## Gaps (priorizados, no todos resueltos por disciplina anti-overdesign)
| # | Gap | Acción | Estado |
|---|---|---|---|
| 1 | Fuentes <11pt en `welcome` (stats 9pt, watermark 9.5pt) | subir a 11/10 | ✅ hecho |
| 2 | Back button `norte` 40×40 sin hitSlop | `hitSlop={8}` | ✅ hecho |
| 3 | Skeleton de video con hex crudo | tokenizar | ✅ hecho |
| 4 | `comando.tsx` densa (muchos tamaños de fuente ad-hoc) | refactor a micro-componentes + tokens | ⏸ post-launch (rewrite = riesgo; mandato lo difiere) |
| 5 | Gaps fuera de grid (3/5/6/10) en chat/chips | tokens `spacing.*` | ⏸ post-launch (nit cosmético) |
| 6 | `mentor.tsx` con varios tamaños de label de chat | set tipográfico dedicado | ⏸ post-launch |

## Por qué se difirieron #4–#6
El mandato es explícito: *"Do NOT rewrite the design system impulsively… prefer incremental integration
over disruptive rewrites… reject anything that pushes the app toward generic template design."* Refactorizar
`comando.tsx` (2200+ líneas) en este pase introduciría riesgo de regresión visual sin cerrar ningún
bloqueante. Se documenta como deuda de pulido medible (objetivo: ≤4 tamaños de fuente por pantalla), no se
ejecuta a ciegas.

## Recomendación de movimiento (motion)
`react-native-reanimated` ya está en el stack (Expo 54). Para llevar transiciones a Apple-grade sin
librerías nuevas: spring en push/pop de navegación, fade-in escalonado en listas (30–50ms/item), scale
0.97 en press de tarjetas. **Referencia, no bloqueante** — el producto ya es usable y calmado sin esto.

## Conclusión
La calidad percibida está **a un pase de pulido tipográfico** de sentirse world-class. Ninguno de los gaps
restantes rompe confianza ni bloquea lanzamiento. Lo correcto es lanzar y pulir con datos de uso real,
no frenar por micro-nits.
