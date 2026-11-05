# Ronda 3 · Núcleo — evaluación del panel UX

Fecha: 2026-11-04 · Fuente: capturas locales con las correcciones de la ronda 2
(`docs/ux/capturas-ronda-3.md`, commit `c63208c`) · Vara: `docs/ux/ESTANDAR_UX.md` ·
Base: `docs/ux/ronda-2-nucleo.md`.

Alcance: `/comando`, `/checkin`, `/mentor`, `/progreso`, `/yo`, `/norte`,
`/programas`, `/module/modulo-1`, `/lesson/m1-5`, `/mentoria` + chrome global
(barra lateral, barra de pestañas móvil, botón flotante). **Novedad: esta vez
hay capturas en móvil claro.**

Método: igual que en las rondas anteriores. La tabla da la **nota más baja** de
los tres evaluadores por criterio. El código se leyó solo para confirmar una
corrección o ubicar un archivo.

Artefactos de captura (no se cuentan como defectos):
- Lección móvil: el video aún mostraba «Cargando el video…» (lo dicen las notas).
- En las capturas en claro, el selector de la barra lateral marca «OSCURO» y la
  estrella del logo sale oro. La captura cambió `data-theme` en `<html>` sin pasar
  por `setMode`, así que el estado de React siguió en `tinta`. Con el interruptor
  real, `mode` cambia y los dos se ven bien. Queda una nota P3 (ver P3-R3-3).

---

## 1. Tabla resumen por ruta

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R2 | ¿Aprueba? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /comando | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,67** | 3,42 | Sí |
| /checkin | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | **3,67** | 3,58 | Sí |
| /mentor | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,33 | Sí |
| /progreso | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | **3,58** | 3,50 | Sí |
| /yo | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,67** | 3,67 | Sí |
| /norte | 4 | 3 | 4 | 3 | 3 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | **3,67** | 3,50 | Sí |
| /programas | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 3 | 4 | **3,50** | 3,50 | Sí |
| /module/modulo-1 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,58** | 3,58 | Sí |
| /lesson/m1-5 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | **3,50** | 3,33 | Sí |
| /mentoria | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,67** | 3,50 | Sí |

Media del núcleo: **3,62** (R1 2,42 → R2 3,49 → R3 3,62). Las diez rutas aprueban
la rúbrica y ninguna tiene un P0 o P1 abierto.

Lectura rápida: Hoy ya pide una sola cosa, y la tarjeta oro dice lo mismo que el
texto. Progreso y Programa usan la misma cuenta (`lib/modulosCuenta.ts`). Norman
usa el oro solo en la flecha de enviar. Mentoría ya tiene un titular de dos líneas
y un botón secundario que sí parece botón. En móvil, la lección muestra el
reproductor y la salida a la vez. La barra móvil en claro se ve bien. Lo que queda
es oficio (P2/P3).

---

## 2. Estado de los hallazgos de la ronda 2

| ID | Estado | Evidencia |
|---|---|---|
| N-1 Hoy pide dos cosas | **RESUELTO** | Las 4 variantes: «cuéntame cómo llegas» + tarjeta «CHECK-IN · 2 MIN / ¿Cómo llegas hoy?». `selectTurno` aplica el invariante espejo (`lib/turnoLogic.ts:251–255`) y tiene test. |
| N-2 Dos cuentas de módulos | **RESUELTO** | Progreso «0 de 9 terminados»; Programa «MÓDULO 1 DE 9». Las dos leen `lib/modulosCuenta.ts`. |
| N-3 Video móvil cae a respaldo | **RESUELTO** | El reproductor ya no se reemplaza. El enlace «¿No arranca? Abrir el video ↗» está siempre visible, y a los 15 s cambia a «Tarda en cargar…» (`SkoolVideo.tsx`). En móvil se ve el reproductor cargando + el enlace. |
| N-4 Notas sin campo | **PARCIAL** | Ahora es un `AccessField` (rótulo + línea). En oscuro, la línea casi no se ve, y los dos campos de la tarea, justo encima, son cajas rellenas: hay dos gramáticas de campo en la misma pantalla. Ver R3-1. |
| N-5 Botón flotante tapa texto | **PARCIAL** | Se oculta mientras se desplaza (solo web móvil) y es más pequeño. Quieto, sigue tapando: la flecha de «Semana 1 de 12 · Empezar» en la **primera vista** de Hoy, la columna D del calendario en Progreso y el final de «hacer esta semana» en Mentoría. Sigue como P2. |
| N-6 Norman con cinco oros | **RESUELTO** | Las etiquetas van en gris. El oro solo está en la flecha de enviar. |
| N-7 Meta de Norman partido | **RESUELTO** | «NORMAN · IA», en una sola línea en móvil. |
| N-8 «Que Norman arme el plan» | **RESUELTO** | Botón con contorno, 48 px, y la pista «Escribe una nota primero.» debajo. |
| N-9 Titular de Mentoría partido | **RESUELTO** | «Tu sesión / semanal.» en dos líneas. |
| N-10 «EMPEZAR» en la tarjeta | **RESUELTO** en Mentoría | La tarjeta dice «SEMANA 1 · 4 nov – 10 nov». Sigue en la fila de Hoy: «Semana 1 de 12 · Empezar» (P3-R3-1). |
| N-11 «más que la semana pasada» el día 1 | **SIGUE** | «5 de 5 · 2,4 más que la semana pasada» junto a «DÍA 1 / 90». Además, el calendario pinta un día amarillo antes de hoy. P2 (Confianza). |
| N-12 Segmentos ≠ lecciones | **PARCIAL** | El código ya pinta un segmento por lección (`module/[id].tsx:113`). Pero los pendientes van con tinta al 25 % sobre oro (`tick`, línea 239): unos 1,8:1, invisibles en la captura. Se ven 5 de 7. Ver R3-2. |
| P1-14 Subtítulo de filas de curso | **PARCIAL** | «Intro al cuarto nivel de consciencia» ya va en minúscula. Siguen sin subtítulo sencillo. P2. |
| P1-21 Estrella amarilla en claro | **RESUELTO** | Norte en claro, escritorio y móvil: estrella gris #CFCFCF. |
| P2-12 Check-in todo amarillo | **SIGUE** (decisión del dueño) | Sin cambios. No bloquea. |
| P2-13 SIGUIENTE deshabilitado | **RESUELTO** | Velo de tinta al 8 % y texto al 50 %, sin contorno. Ya no se lee como «mostaza roto», y la diferencia con el activo (relleno tinta, texto oro) es clara. |
| P3-1 Title Case | **PARCIAL** | Corregidos «Crea tu nueva identidad» y «Detecta tus creencias». Quedan «Mercader: Gestión del Tiempo», «La No Negociación» y «Pontífice: Estado de Flow» (`data/modules.ts`). |
| P3-N1 Check-in solo en la barra lateral | Aceptado | Sin cambios. Documentado. |
| P3-N2 «Ordena mi dia» | **RESUELTO** | «Ordena mi día». |
| P3-N3 «LECCIÓN 05» | **RESUELTO** | «MÓDULO 1 · GUERRERO · LECCIÓN 5». |
| P3-N4 «YO» activa en móvil | **SIGUE** | En Norte y Programa móvil no se marca ninguna pestaña. La flecha compensa. P3. |
| Barra móvil en claro (pendiente de R2) | **RESUELTO** | Verificada en las 5 rutas con pestañas: rótulos legibles y activo en ámbar. |

---

## 3. Hallazgos nuevos y abiertos

### P0 · Bloqueantes
Ninguno.

### P1 · Graves
Ninguno.

### P2 · Mejorables

- **R3-1 · /lesson · todas** — Dos gramáticas de campo en la misma pantalla:
  «Yo soy…» y «¿Qué evidencia…?» son cajas rellenas, y «TUS NOTAS» es una línea
  casi invisible en oscuro. *Fix:* usar la misma caja que los campos de la tarea
  (o subir el contraste de la línea de `AccessField` a ≥3:1). *Archivo:*
  `app/lesson/[id].tsx:989`.
- **R3-2 · /module · todas** — Los segmentos pendientes (tinta al 25 % sobre oro,
  ~1,8:1) no cumplen WCAG 1.4.11 (3:1 para elementos que no son texto). El usuario
  ve 5 segmentos para 7 lecciones. *Fix:* pendiente = contorno de 1,5 px de tinta
  (como `tickNow`, pero más fino) o tinta al ~55 %. *Archivo:*
  `app/module/[id].tsx:239`.
- **R3-3 · /progreso · móvil** — El titular de la tarjeta se parte en el guion:
  «Hacer mi check- / in». *Fix:* guion que no se parte (U+2011) en «check‑in», o
  «Hacer el check-in» con el `titleSize` del móvil. *Archivo:*
  `app/(tabs)/progreso.tsx` (TarjetaOro).
- **R3-4 · /lesson · todas** — El oro se gasta en «GUÍA PRÁCTICA» (texto + ícono),
  que es secundaria. La acción principal (guardar la tarea) va en gris. *Fix:* la
  guía en `--c-text-2`. Que el oro quede para «GUARDAR TAREA» cuando se active.
  *Archivo:* `app/lesson/[id].tsx` (fila de la guía).
- **N-5 (sigue) · Chrome · móvil** — Quieto, el botón flotante tapa la flecha de
  una fila en la primera vista de Hoy. *Fix:* reservar un gutter derecho de
  56 px en las `Fila` cuando el botón está visible, o anclarlo encima de la barra
  de pestañas, dentro del margen inferior de 96 px. *Archivo:*
  `components/tour/TourButton.tsx`.
- **N-11 (sigue) · /progreso** — Comparación con «la semana pasada» y un día
  marcado antes del día 1. *Archivo:* `app/(tabs)/progreso.tsx:66–70`.
- **P1-14 (rebajado, sigue) · /programas** — Subtítulo sencillo en las filas con
  nombre de curso. *Archivo:* `data/modules.ts`.

### P3 · Pulido

- **P3-R3-1 · /comando** — La fila de Mentoría dice «Semana 1 de 12 · Empezar».
  Usar «Semana 1 · 4–10 nov», igual que la tarjeta de Mentoría.
- **P3-R3-2 · /mentoria** — «SEMANA 1 DE 12» en el meta y «SEMANA 1» en la tarjeta
  repiten el dato. En la tarjeta bastaría el rango de fechas.
- **P3-R3-3 · Chrome** — El logo de la barra lateral decide su color con `mode`
  (`DesktopSidebar.tsx:86`), y el resto de las estrellas con la variable CSS
  (`useDecorStarColor`). Usar la variable en los dos sitios: así el color sigue a
  `data-theme` aunque el estado y el atributo se desincronicen (por ejemplo, otra
  pestaña).
- **P3-1 (sigue)** — Title Case en «Mercader: Gestión del Tiempo», «La No
  Negociación» y «Pontífice: Estado de Flow».
- **P3-N4 (sigue)** — Marcar «YO» como pestaña activa en las rutas hijas en móvil.

---

## 4. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — ME CONVENCE.**
Lo que pedí está cerrado. La primera pantalla pide una sola cosa y la tarjeta oro
es esa misma cosa. El curso tiene un solo número en toda la app. Mentoría ya no
tiene un texto que parece botón ni una etiqueta que parece orden. Un usuario
nuevo y cansado, en el teléfono, sabe qué hacer en cada pantalla del núcleo. Pido
cerrar N-11 en la misma iteración: es barato y es un tema de honestidad.

**Evaluador B · Diseño visual y marca — ME CONVENCE.**
El oro ya se gana en todo el núcleo: Norman tiene un solo oro, la estrella va gris
en claro y los titulares no se parten palabra a palabra. Lo que queda no rompe el
sistema, pero hay que pulirlo: R3-2 (segmentos pendientes invisibles: el número
está bien, pero no se ve), R3-4 (oro en «Guía práctica»), R3-3 (guion partido) y
el resto del Title Case. Todos son baratos. Los quiero en esta misma iteración.

**Evaluadora C · Accesibilidad y producto — ME CONVENCE.**
La lección se ve dentro de la app en el móvil, con la salida siempre visible.
SIGUIENTE deshabilitado ya no parece roto. La barra móvil en claro está
verificada, y el botón flotante se aparta al desplazarse. No queda nada que
impida usar el núcleo. Dejo como P2 de accesibilidad, para esta iteración: R3-2
(contraste de elementos que no son texto, por debajo de 3:1), R3-1 (un solo
significante de campo) y N-5 quieto (el botón tapa una flecha en la primera vista
de Hoy).
