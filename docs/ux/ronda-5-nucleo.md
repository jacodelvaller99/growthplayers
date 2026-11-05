# Ronda 5 · Núcleo — puerta final antes de publicar

Fecha: 2026-11-04 · Local con `9a37239` · Capturas: `docs/ux/capturas-ronda-5.md`
(desktop-dark, desktop-light, mobile-dark, mobile-light) · Vara:
`docs/ux/ESTANDAR_UX.md` · Base: `ronda-4-nucleo-bienestar.md`.

Panel: A (experiencia), B (visual y marca), C (accesibilidad y producto). Cada
celda es la **nota más baja** de los tres. Aprueba: ningún criterio < 3 y
promedio ≥ 3,5.

Artefactos de captura (no cuentan): la tarjeta «Juan Jacobo» de la barra
lateral de escritorio aparece debajo de la franja móvil (composición); el
selector de la barra lateral marca «OSCURO» en las capturas en claro (la
captura cambia `data-theme` sin pasar por `setMode`); el video de la lección
en móvil muestra los controles nativos comprimidos.

---

## 1. Verificaciones pedidas en código

| Qué | Resultado | Evidencia |
|---|---|---|
| `alpha()` se pinta en web (R4-N1) | **RESUELTO** | `constants/themeColors.ts:592–601` devuelve `var(--polaris-alpha, color-mix(in srgb, … N%, transparent))`. `isWebColor` de react-native-web acepta cualquier cadena que empiece por `var(` (`node_modules/react-native-web/dist/modules/isWebColor/index.js:10`), así que ya no se descarta. Hay test que fija el formato (`__tests__/unit/themeColors.test.ts:159–178`). |
| Segmentos pendientes del módulo (R3-2) | **RESUELTO** | En las 4 capturas de `/module/modulo-1` se ven los 7 segmentos: 4 hechos (tinta), 1 actual (contorno), 2 pendientes (tinta al 55 % sobre oro). Calculado: ≈3,9:1 contra el oro, por encima de 3:1 para elementos no textuales. |
| SIGUIENTE deshabilitado de `/checkin` | **RESUELTO** | `app/checkin.tsx:611–612` (`alpha(palette.ink,'14')` / `'80'`). En móvil y escritorio, oscuro y claro, se ve un relleno tenue y el texto apagado: se distingue del estado activo. (Los controles deshabilitados están exentos del contraste mínimo en WCAG 1.4.3.) |
| Enlace «¿No arranca? Abrir el video» con margen | **RESUELTO en código** | `components/SkoolVideo.tsx:220` añade `paddingHorizontal: 16`. La captura es anterior y aún lo muestra pegado al borde. |
| Botón de ayuda oculto en el teléfono fuera de las pantallas con barra | **NO ESTÁ EN EL CÓDIGO** | El commit `9a37239` lo anuncia en su mensaje, pero solo toca `SkoolVideo.tsx`. `components/tour/TourButton.tsx` no cambió: sin barra y fuera de escritorio, el botón se sigue colocando arriba a la derecha (`{ top: insets.top + TOP_OFFSET }`), y `module` no está en `HIDDEN_ROUTES`. En la captura de móvil tapa «MÓDULO 1 DE 9» (se lee «MÓDULO 1 ✦ 9»). Ver R5-P1-1. |

---

## 2. Núcleo

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R4/R3 | ¿Aprueba? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /comando | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /checkin | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | **3,67** | 3,67 | Sí |
| /mentor | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /progreso | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /yo | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,67** | 3,67 | Sí |
| /norte | 4 | 3 | 4 | 3 | 3 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | **3,67** | 3,67 | Sí |
| /programas | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 3 | 4 | **3,50** | 3,50 | Sí |
| /module/modulo-1 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | **2** | 4 | 3 | 4 | **3,50** | 3,58 | **No** |
| /lesson/m1-5 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /mentoria | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,67** | 3,67 | Sí |

Resultado: aprueban 9 de 10. `/module` sube en accesibilidad (los segmentos
por fin existen) pero cae en responsive por el botón de ayuda encima de su
cabecera en el teléfono. Con R5-P1-1 corregido vuelve a 3,58 y aprueba.

### Chrome global

- **Barra lateral (escritorio):** sin cambios, coherente en oscuro y claro;
  estrella gris en claro. Aprueba.
- **Barra de pestañas (móvil):** HOY · NORMAN · PROGRESO · YO, activa en oro
  con subrayado. Aprueba.
- **Botón de ayuda:** bien en escritorio (abajo a la derecha), bien sobre la
  barra y bien oculto en `/checkin`, `/lesson` y `/mentor`. Mal en `/module`
  (R5-P1-1).

---

## 3. Hallazgos

**R5-P1-1 · P1 · `/module/[id]` en el teléfono · Chrome / Responsive.**
El botón de ayuda tapa «MÓDULO 1 DE 9». El arreglo que dice el commit
`9a37239` no está en el código: `TourButton.tsx` sigue colocándolo arriba a la
derecha en toda pantalla sin barra. `/module` tiene su propia cabecera con la
meta a la derecha, que es justo el caso que el comentario `ponytail:` del
archivo advierte.
*Fix (una de dos):* añadir `'module'` a `HIDDEN_ROUTES`, o hacer lo que anuncia
el commit: en el teléfono, mostrar el botón solo cuando hay barra
(`hidden = … || (!isDesktop && !withBottomBar)`). La segunda es más segura:
cubre también cualquier pantalla futura con acción arriba a la derecha.
Después, corregir o completar el commit para que el historial no mienta.
*Archivo:* `components/tour/TourButton.tsx:64–90`.

**R5-P2-1 · P2 · `/comando` móvil.** Quieto, el botón sobre la barra queda
encima de «Semana 1 de 12 · Empezar» (tapa la «a» de «Semana»). Se aparta al
desplazar y la fila se puede subir, por eso no pasa de P2. Si se quiere
cerrar: un `paddingBottom` de 18 px extra en el ScrollView de las pestañas.

**Siguen (P3, aceptados):** «Semana 1 de 12 · Empezar» en Hoy; Title Case;
en `/programas` móvil ninguna pestaña queda activa.

**Totales:** P0 0 · P1 1 · P2 1 · P3 3.

---

## 4. Veredictos

**Evaluadora A · Investigación y experiencia — ME CONVENCE.**
Nada de lo que pedí se rompió y el día 1 sigue diciendo la verdad en Hoy y
Progreso. El botón sobre «MÓDULO 1 DE 9» molesta, pero el usuario no pierde
información que no tenga en otra parte (segmentos y «Te faltan 3 lecciones»).

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
La causa raíz de `alpha()` quedó bien resuelta, con test, y los segmentos por
fin se ven. Pero un elemento flotante encima del texto de cabecera en la
primera pantalla de cada módulo no se publica. Falta R5-P1-1 y que el commit
diga lo que realmente cambió.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Los segmentos pendientes pasan 3:1 y el SIGUIENTE deshabilitado se distingue.
Me falta R5-P1-1: hoy el botón de ayuda tapa contenido en el teléfono, y la
nota de capturas lo daba por corregido sin que lo estuviera. Quiero verlo en
código y en una captura nueva de `/module/modulo-1` en móvil (oscuro y claro).
