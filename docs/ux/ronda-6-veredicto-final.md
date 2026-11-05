# Ronda 6 — Veredicto final del panel

Fecha: 2026-11-04 · Commit evaluado: `c08cffa` · Vara: `docs/ux/ESTANDAR_UX.md`.

En la ronda 5 todo aprobó salvo tres hallazgos. Esta ronda solo confirma esos
tres con código, pruebas y capturas nuevas. No se cambió código.

## Calidad

- `npx tsc --noEmit` → sale 0.
- `npx jest --testPathIgnorePatterns "worktrees/agent-"` → 146 suites, 1173 tests, todos pasan.

## Los tres hallazgos

### 1. Núcleo R5-P1-1 — el botón de ayuda tapaba «MÓDULO 1 DE 9» → RESUELTO

- **Código** (`components/tour/TourButton.tsx`): nueva condición
  `sinBarra = !isDesktop && !(inTabs || root === 'admin')`, que entra en `hidden`.
  En el teléfono, el botón ya no se dibuja en las pantallas sin barra abajo. Esta
  vez el cambio sí está en el archivo (en `9a37239` solo estaba en el mensaje).
- **Capturas** (pestaña nueva de Chrome, iframe de 390×640, `innerWidth` del iframe = 390):
  - `/module/modulo-1` en oscuro: se lee «MÓDULO 1 DE 9» completo, arriba a la
    derecha. No hay ningún botón encima.
  - El mismo iframe con `data-theme="light"`: igual de limpio. En el DOM no
    queda ningún elemento con etiqueta de ayuda o de tour.
- **Efecto secundario aceptado (P3):** en el teléfono, las pantallas sin barra
  (perfil, wearables, apariencia, pricing, mensajes, módulo) ya no muestran el botón de ayuda.
  El tour se sigue abriendo desde las pestañas y desde el escritorio. Es mejor
  que tapar contenido.

### 2. Bienestar R5-P1-1 — Meditación mostraba una presión vieja y en otra escala → RESUELTO

- **Código** (`app/bienestar/meditacion.tsx`): lee `todayCheckIn` y ya no
  `latestCheckIn`. `todayCheckIn` filtra con `isSameDay(c.date, new Date())` en
  `hooks/use-lifeflow.tsx:715`. El valor guardado (×2, ver `app/checkin.tsx:483`)
  vuelve a 1–5 con la misma fórmula que el check-in (`checkin.tsx:320`). El
  aviso solo sale con 4 o 5 («Alta», «Al límite»).
- **Copy:** «Hoy marcaste tu presión en 4 de 5.» Usa la palabra del check-in
  («PRESIÓN»), la escala con la que respondió y el día correcto. Si no hay
  check-in de hoy, sale la frase neutra. El criterio 12 (Confianza) se cumple.
- **Sin captura en vivo:** mostrar el aviso exige guardar un check-in, y esta
  ronda era de solo lectura. La lógica es corta y la vimos completa en el código.

### 3. Cuenta N-36 — los radios de Apariencia no tenían aria-checked → RESUELTO

- **Código** (`app/perfil/apariencia.tsx`): `accessibilityState={{ checked: active }}` + `aria-checked={active}`.
- **DOM en vivo** (`/perfil/apariencia`, tema `tinta`):

  | Grupo | Opción | aria-checked |
  |---|---|---|
  | Tema | Oscuro | true |
  | Tema | Claro | false |
  | Modo | Específico | true |
  | Modo | Esencial · Operador · Calma · Guiado · Logos | false |

  Hay un solo `true` por grupo y coincide con el tema real. Cumple WCAG 4.1.2.

### P2 pendiente (no bloquea) — `/comando` en el teléfono

Captura de `/comando` a 390 px: con la pantalla quieta, el botón de ayuda
(centrado sobre el borde de la barra) toca el inicio de «Semana 1 de 12 ·
Empezar» en la fila MENTORÍA. Se lee y desaparece al desplazar. Sigue siendo
**R5-P2-1**. Arreglo barato: subir el `paddingBottom` del scroll de Comando
unos 24 px para que la última fila no quede a la altura del botón.

## Veredicto final por evaluador (toda la app)

**Evaluadora A · Investigación y experiencia — ME CONVENCE.**
Meditación ya habla de hoy, con la palabra y la escala que el usuario eligió.
Nada engaña. El núcleo, bienestar y cuenta/salud/admin se entienden en 3 segundos.
P2/P3 abiertos: R5-P2-1, N3-P2-5, N-31, N-07, H-29, R5-P3-*.

**Evaluador B · Diseño visual y marca — ME CONVENCE.**
La primera pantalla de cada módulo queda limpia en oscuro y en claro, y la
línea de meta se ve entera. Pido cerrar R5-P2-1 en la próxima iteración porque
es barato. No bloquea.

**Evaluadora C · Accesibilidad y producto — ME CONVENCE.**
Pedí capturas móviles de `/module/modulo-1` en oscuro y claro, y están: sin
oclusión. Los radios anuncian su estado. tsc y jest en verde. El botón de ayuda
fuera de las pestañas en el teléfono es una pérdida menor (P3), aceptable.

**Resultado:** 0 P0 · 0 P1. Los tres evaluadores dicen «ME CONVENCE». Según la
sección 2 de `ESTANDAR_UX.md`, la app queda aprobada.
