# Ronda 4 · Núcleo (regresión) y Bienestar — panel evaluador

Fecha: 2026-11-04 · Local con `2345e75` · Capturas: `docs/ux/capturas-ronda-4.md`
(desktop-dark, desktop-light, desktop-dark-scrolled, mobile-dark, mobile-light,
mobile-dark-scrolled; nutrición sin scrolled) · Vara: `docs/ux/ESTANDAR_UX.md` ·
Base: `ronda-3-nucleo.md` y `ronda-3-bienestar.md`.

Panel: A (experiencia), B (visual y marca), C (accesibilidad y producto). Cada
celda es la **nota más baja** de los tres. Aprueba: ningún criterio < 3 y
promedio ≥ 3,5.

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza.

Artefactos de captura (no cuentan): el video de la lección aún cargando; en las
capturas en claro el selector de la barra lateral marca «OSCURO» (la captura
cambia `data-theme` sin pasar por `setMode`). Ahora la estrella del logo sigue
a la variable CSS y sale gris en claro aunque el estado no cambie: eso confirma
que P3-R3-3 está resuelto.

---

## 1. Núcleo · chequeo de regresión

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R3 | ¿Aprueba? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /comando | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,67 | Sí |
| /progreso | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,58 | Sí |
| /module/modulo-1 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,58** | 3,58 | Sí |
| /lesson/m1-5 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,50 | Sí |

Las otras seis rutas del núcleo (`/checkin`, `/mentor`, `/yo`, `/norte`,
`/programas`, `/mentoria`) no cambiaron y conservan la nota de la ronda 3.
**No hay regresiones.**

### Estado de los P2 pedidos en la ronda 3

| ID | Estado | Evidencia |
|---|---|---|
| R3-1 Dos gramáticas de campo en la lección | **RESUELTO** | «Tus notas» usa ahora la misma caja rellena que «Yo soy…» y «¿Qué evidencia…?» (`TextAreaField`), en oscuro, en claro y en móvil. |
| R3-2 Segmentos pendientes del módulo | **NO RESUELTO (causa raíz nueva)** | Ver R4-N1. Medido en píxeles: los 2 segmentos pendientes salen **igual que el oro de fondo** (254,200,4). Se ven 5 segmentos de 7, en escritorio y en móvil. |
| R3-3 «check- / in» partido | **RESUELTO** | «Hacer mi / check‑in» en móvil oscuro y claro (U+2011). |
| R3-4 Oro en «Guía práctica» | **RESUELTO** | Ícono y texto en gris (`palette.ash`). En claro se lee bien. |
| N-5 Botón de ayuda tapa flechas (móvil) | **RESUELTO** | En Hoy y Progreso, el botón queda sobre el borde superior de la barra de pestañas, en el centro. Ya no toca las flechas de las filas. El objetivo táctil es de 44 px (36 + `hitSlop` 4). |
| N-11 «Más que la semana pasada» el día 1 | **RESUELTO** | Día 1: «Sin check-ins aún» en Energía y Claridad. No hay ningún día amarillo antes de hoy. |
| P3-R3-3 Estrella del logo con `mode` | **RESUELTO** | `useDecorStarColor()` en `DesktopSidebar`: estrella gris en las capturas en claro. |
| P3-R3-1 «Semana 1 de 12 · Empezar» en Hoy | SIGUE | P3. |
| P3-1 Title Case, P3-N4 «YO» activa | SIGUE | P3. |

### Hallazgos nuevos · núcleo

**R4-N1 · P2 (alta prioridad, causa raíz transversal) · `/module` (y todo `alpha()` en web).**
En web, `alpha()` (`constants/themeColors.ts:592`) devuelve
`color-mix(in srgb, …)`. React Native Web filtra los colores con
`normalizeColor`, que solo acepta `var(…)`, `currentColor`/`inherit` o lo que
entiende `processColor`. `color-mix` no pasa ese filtro: la propiedad se
**descarta** y no hay color. Por eso subir de 25 % a 55 % no cambió nada: el
segmento pendiente nunca tuvo fondo, y R3 lo atribuyó por error al contraste.
Hay 23 usos de `alpha()` en `app/` y `components/`. Entre ellos están el
SIGUIENTE deshabilitado de `/checkin` (`nextOff`/`nextTextOff`, que la ronda 3
dio por resuelto: hay que volver a verificarlo), los bordes de
`programas`/`lesson`/`paywall` y los íconos de `biblioteca`.
*Fix:* en web, si `color` es un hex, devolver `rgba(r,g,b,a)`. Si es `var(…)`,
usar una variable con alfa propia (o `rgb(from var(--x) r g b / a)` envuelto de
forma que RNW lo acepte). Agregar un test de que `alpha('#0A0A0A','8C')` en web
devuelve un color que `normalizeColor` acepta. Mientras tanto, para el
segmento: `backgroundColor: 'rgba(10,10,10,0.55)'`.
*Archivos:* `constants/themeColors.ts:592`, `app/module/[id].tsx:240`.

No se encontraron más hallazgos en el núcleo.

---

## 2. Bienestar

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R3 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar | — | | | | | | | | | | | | 3,58 | 3,58 | Aprueba (R3) |
| /bienestar/respiracion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,67** | 3,67 | **Aprueba** |
| /bienestar/meditacion | — | | | | | | | | | | | | 3,67 | 3,67 | Aprueba (R3) |
| /bienestar/binaurales | — | | | | | | | | | | | | 3,67 | 3,67 | Aprueba (R3) |
| /bienestar/sueno | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | **2** | **3,50** | 3,67 | **No aprueba** |
| /bienestar/diario | — | | | | | | | | | | | | 3,50 | 3,50 | Aprueba (R3) |
| /bienestar/habitos | — | | | | | | | | | | | | 3,58 | 3,58 | Aprueba (R3) |
| /bienestar/ayuno | — | | | | | | | | | | | | 3,58 | 3,58 | Aprueba (R3) |
| /bienestar/nutricion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,58 | **Aprueba** |
| /bienestar/cuerpo (Medidas) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,75** | 3,67 | **Aprueba** |
| /bienestar/suplementacion | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,75** | 3,25 | **Aprueba** |
| /bienestar/consciencia (Tu calma) | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,33 | **Aprueba** |

Resultado: aprueban 11 de 12. Las dos que fallaban en la ronda 3 ya aprueban.
Sueño cae porque se revisó con más cuidado: el dato de su primera línea ya
estaba en la captura de la ronda 3 y el panel no lo vio (asumimos el error).
Ahora además choca con Progreso, que el día 1 dice «Sin check-ins aún».

### Estado de los hallazgos de la ronda 3

| ID | Estado | Evidencia |
|---|---|---|
| N3-P1-1 Suplementos: «Guardado» falso | **RESUELTO** | Una sola escritura con las 3 pestañas (`TABS.map` → `upsert(rows)`). «Guardado» solo aparece si no hubo `error`. Si falla: «No se pudo guardar. Inténtalo de nuevo.» + `logSilentError`. Sin sesión, lo dice. |
| N3-P2-1 Tu calma en masculino + grilla con bordes | **RESUELTO** | Agobio, Alegría, Ansiedad, Calma, Cansancio, Cariño, Energía, Enfoque, Enojo, Gratitud, Seguridad, Soledad, Tristeza. Casilla + palabra, sin borde. Mismos ids: lo ya guardado se sigue leyendo. |
| N3-P2-2 Nutrición: fila partida / «nutriólogo» | **RESUELTO** | «TU PLAN · Pegar enlace» en una línea. «nutricionista» en el sub, en la etiqueta y en el `accessibilityLabel`. |
| N3-P2-3 Medidas: GUARDAR vacío parece activo | **RESUELTO** | Contorno y texto al 40 %. Ya no hay placeholder «kg/cm» en tinta. El error de guardado se dice con `accessibilityRole="alert"`. |
| N3-P2-4 Suplementos: acción abajo, activa con 0 | **RESUELTO** | La acción está arriba (hero) y se deshabilita si no hay cambios. Con cambios dice «GUARDAR N SUPLEMENTOS». |
| N3-P2-5 Binaurales: valores largos en móvil | SIGUE | La pantalla no cambió. P2. |
| P3 Sueño: «20 MIN» repetido | **RESUELTO** | El detalle ya no repite la duración. |
| P3 Respiración: «1 min» en todas las filas | SIGUE | P3. |
| Reproductores, pantalla final «Hecho», final del hub en 390 px | **SIN VERIFICAR** | Esta ronda tampoco trae esas capturas. |

### Hallazgos nuevos · bienestar

**N4-P1-1 · /bienestar/sueno · todas · Confianza.** El subtítulo dice «Anoche:
10/10 en tu check-in.» el día 1, cuando Progreso dice «Sin check-ins aún».
Hay dos errores en la misma frase:
(a) usa `latestCheckIn` sin mirar la fecha: un check-in de hace semanas (o de
antes del día 1) se presenta como «anoche»;
(b) muestra el valor guardado ×2 sobre 10, pero el usuario respondió de 1 a 5.
Progreso ya corrigió esto («nunca eligió un 10»).
Es un dato falso en la primera línea de la pantalla, y además decide qué
práctica se propone (`sleepReading <= 4`).
*Fix:* usar la lectura solo si el check-in es de hoy (o de ayer después de las
18 h). Mostrarla en la escala del usuario: «Anoche: 5 de 5 en tu check-in».
Ajustar el umbral a la misma escala. Si no hay lectura válida, usar el
subtítulo neutro, que ya existe.
*Archivo:* `app/bienestar/sueno.tsx:57–71`. Conviene buscar otros usos de
`latestCheckIn.sleep` que muestren «/10».

**N4-P3-1 · /bienestar/suplementacion.** El estado inicial dice
«GUARDAR (NINGUNO)», que suena a sistema. Con el botón deshabilitado basta
«GUARDAR». La pista «Tu dosis: la que te indicó tu médico.» queda pegada al
botón y lejos de los campos de dosis: se leería mejor junto a la nota educativa.

**N4-P3-2 · /bienestar/suplementacion.** Si hay cambios sin guardar
(`status === 'dirty'`), salir con la flecha los pierde sin aviso. Basta un
`confirm` o guardar al salir.

**Totales nuevos:** P0 0 · P1 1 (Sueño) · P2 1 (R4-N1, causa raíz) · P3 2.

---

## 3. Veredictos

### (1) Núcleo

**Evaluadora A · Investigación y experiencia — ME CONVENCE.**
Pedí cerrar N-11 y está cerrado: el día 1 ya no compara con una semana que no
existe. Nada de lo que se tocó empeoró la claridad. La lección tiene una sola
gramática de campo.

**Evaluador B · Diseño visual y marca — ME CONVENCE.**
Tres de mis cuatro pedidos están resueltos: guion que no se parte, guía en
gris y estrella gris en claro (ahora robusta). El cuarto, R3-2, no falló por
falta de cuidado: lo rompe `alpha()` en web. No es una regresión y no baja la
nota. Lo quiero corregido en la causa raíz, no parcheado en el segmento.

**Evaluadora C · Accesibilidad y producto — ME CONVENCE.**
El botón de ayuda ya no tapa nada y mide 44 px. Las notas tienen un
significante claro. R3-2 sigue por debajo de 3:1 (de hecho, no se ve). Lo dejo
como P2 de alta prioridad porque el texto «Te faltan 3 lecciones», la lista y
el `accessibilityLabel` dicen la cifra correcta. Pido que, cuando se arregle
`alpha()`, se verifique otra vez el SIGUIENTE deshabilitado de `/checkin`.

### (2) Bienestar (12 pantallas)

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
Suplementos ya dice la verdad sobre lo que guarda, y Tu calma le habla igual a
todo el mundo. Con eso me convencía. Pero Sueño abre con un dato falso
(«Anoche: 10/10» el día 1, en una escala que el usuario no usó). Es el mismo
tipo de problema que cerramos en Progreso. Arreglen N4-P1-1 y firmo.

**Evaluador B · Diseño visual y marca — ME CONVENCE.**
Tu calma ya está en la gramática de filas (casilla + palabra, sin cajas). El
GUARDAR de Medidas se lee apagado. Suplementos tiene un solo amarillo y está
arriba. Nutrición cabe en una línea. Sección coherente, de marca, sin ruido.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
El éxito falso y la pérdida silenciosa de Suplementos están cerrados, y el
error de Medidas se anuncia. Me faltan dos cosas: N4-P1-1 (Sueño decide la
práctica con un dato mal escalado y viejo) y, por segunda ronda, ver una vez en
390 px los reproductores, la pantalla final «Hecho» y el final del hub.
