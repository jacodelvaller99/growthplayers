# Ronda 2 · Bienestar — panel evaluador

Fecha: 2026-11-04 · Local con las correcciones de `b6ea03e` · Capturas:
`docs/ux/capturas-ronda-2.md` (desktop-dark, desktop-light, mobile-dark y
desktop-dark-scrolled; nutrición sin scrolled).
Vara: `docs/ux/ESTANDAR_UX.md`. Panel: A (experiencia), B (visual y marca),
C (accesibilidad y producto). Cada celda es la **nota más baja** de los tres.

Límites de esta ronda: no hay capturas de reproductores ni de pantallas
finales ("Hecho. N min."), ni de móvil claro. Lo que solo se pudo verificar
en código se marca así.

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza. Aprueba: ningún criterio < 3 y promedio ≥ 3,5.

---

## 1. Tabla resumen

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R1 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar | 4 | 3 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,50 | 2,8 | **Aprueba** |
| /bienestar/respiracion | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 3 | 3 | 3,42 | 1,7 | No aprueba |
| /bienestar/meditacion | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 3,33 | 1,7 | No aprueba |
| /bienestar/binaurales (Sonidos) | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,67 | 1,3 | **Aprueba** |
| /bienestar/sueno | 4 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 2 | 4 | 3 | 4 | 3,42 | 1,6 | No aprueba |
| /bienestar/diario | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 3,33 | 2,6 | No aprueba |
| /bienestar/habitos | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | 3,42 | 1,1 | No aprueba |
| /bienestar/ayuno | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3,50 | 1,7 | **Aprueba** |
| /bienestar/nutricion | 3 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3,42 | 1,6 | No aprueba |
| /bienestar/cuerpo (Medidas) | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3,42 | 1,4 | No aprueba |
| /bienestar/suplementacion | 4 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 1 | 4 | 3 | 4 | 2,92 | 1,9 | No aprueba |
| /bienestar/consciencia (Tu calma) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 3,00 | 0,8 | No aprueba |

Lectura rápida: el salto es enorme (media de la sección 1,7 → 3,4). Las once
subpantallas ya hablan la gramática del hub: meta → titular con la palabra
del hub → una tarjeta amarilla → filas. El tema claro está tan cuidado como el
oscuro. Lo que separa a las 9 que no aprueban del listón son pocas cosas que
se repiten: una tarjeta "Tu cuerpo hoy" que compite con el amarillo, tres
formas distintas de volver, la tarjeta que repite la primera fila, duraciones
que se parten en móvil, un titular partido a media palabra y una lista de
emociones que sigue siendo la escala de Hawkins disfrazada.

---

## 2. Estado de los hallazgos de ronda 1

### P0
| # | Hallazgo | Estado | Nota |
|---|---|---|---|
| 1 | Título de aviso amarillo ilegible en claro | RESUELTO | `SafetyWarning` usa `goldText`; además el aviso pasó a fila plegable "Antes de empezar". |
| 2 | Congelamiento al cambiar a claro | RESUELTO en capturas | Las capturas claras se pintan completas; falta medir el tiempo con Performance. |
| 3 | Barra lateral ilegible en claro | RESUELTO | Fondo y texto tematizados. |
| 4 | Círculo vacío falso (respiración, consciencia) | RESUELTO | El header viejo desapareció. |
| 5 | "Hz" en consciencia | RESUELTO | Sin número ni unidad. |
| 6 | "PENA / AFLI…" cortado | RESUELTO | "Pena". |
| 7 | Sello sobre el play en meditación | RESUELTO | Sin sellos; filas por categoría. |
| 8 | Hábitos: márgenes y "+" de 20 px | RESUELTO | Gutter de 16 px; fila entera tocable. |
| 9 | Círculo "LISTO" invisible en claro | RESUELTO (código) | `orb` con borde `lineHard`, sin halo. Reproductor sin captura. |

### P1
| # | Hallazgo | Estado | Nota |
|---|---|---|---|
| 1 | Hub promete una cosa, la pantalla dice otra | RESUELTO | Sonidos, Medidas, Tu calma; Nutrición con "Tu plan de comidas". |
| 2 | Gramática vieja en 11 pantallas | PARCIAL | Aplicada en 10; suplementos no tiene tarjeta y volver tiene 3 formas (N-P1-2). |
| 3 | Halo y botón bajo el pliegue en respiración | RESUELTO | Tarjeta propuesta arriba a la derecha en escritorio. |
| 4 | Jerga en chips de respiración | PARCIAL | Nombres por intención, pero "Calor y energía interna" no dice para qué y hay pares casi iguales (N-P2-2). |
| 5 | Meditación como catálogo | RESUELTO | Una propuesta + 9 filas de categoría. |
| 6 | Franjas de color en binaurales | RESUELTO | |
| 7 | Jerga Hz/portadora y triple aviso | RESUELTO | Un aviso de una línea en el subtítulo; mezcla como fila. |
| 8 | Morado en sueño, 10/10 sin fuente | RESUELTO | "Anoche: 10/10 en tu check-in". |
| 9 | Puntos en hábitos | RESUELTO | `points` solo en datos. |
| 10 | Afirmaciones sin respaldo en hábitos | RESUELTO | Una frase llana por hábito. |
| 11 | Filas a todo el ancho en escritorio | RESUELTO | Columna ≈680 en todas. |
| 12 | Ayuno: acción al final, 48/72 h al mismo nivel | RESUELTO | 16:8 propuesto arriba; largos bajo "con supervisión". |
| 13 | Nutrición: asistente mezclado, "sube" vs URL | RESUELTO | "Pega el enlace de tu plan". |
| 14 | IMC rojo, 9 campos, placeholders con datos | RESUELTO | Peso y altura en la tarjeta; IMC neutro; "Más medidas" plegado. |
| 15 | Dosis precargadas, Huberman | RESUELTO | "Tu dosis: la que te indicó tu médico"; NIH ODS + PubMed. |
| 16 | Escala Fuerza/Poder, culpa | PARCIAL | Sin números ni barra roja, pero el orden y los nombres siguen siendo la escala de Hawkins (N-P1-4). |

### P2
| # | Estado | Nota |
|---|---|---|
| 1 Rótulos de grupo amarillos | RESUELTO | En gris. |
| 2 Hub móvil, 17 filas | SIN VERIFICAR | La captura móvil no llega al final. |
| 3 Esqueleto "Para hoy" | SIN VERIFICAR | |
| 4 Arial durante la carga | SIN VERIFICAR | |
| 5 Guardar del diario sin motivo | RESUELTO | "Escribe algo para guardar." |
| 6 Rótulos TIPO/ENTRADA | RESUELTO | La pregunta es el subtítulo. |
| 7 "CICLOS COMPLETADOS · 0" | RESUELTO (código) | |
| 8 Caja con borde en suplementos | RESUELTO | Línea gris de texto. |
| 9 Franja amarilla en guía de ayuno | RESUELTO | Filas plegables. |

### P3
| # | Estado | Nota |
|---|---|---|
| 1 Falta flecha en cuerpo | SIGUE (cambió de forma) | Ahora no hay flecha arriba en ninguna; ver N-P1-2. |
| 2 auriculares / audífonos | RESUELTO | |
| 3 "CHECK SEMANAL" | RESUELTO | "ESTA SEMANA". |
| 4 Pestañas con relleno en suplementos | RESUELTO | Texto subrayado. |
| 5 Flecha de 12 px en filas | SIGUE | |

---

## 3. Hallazgos nuevos

### P0 · Bloqueantes (1)

**N-P0-1 · /bienestar/suplementacion · escritorio (oscuro y claro)** — El
titular se parte a media palabra: "Suplement / os". Texto cortado = P0, y es
lo primero que se ve. Causa: `headDesk` tiene `flexBasis: 420` y el titular
mide 64 px; sin `hero` la columna no crece y la palabra no cabe.
**Fix:** en `Pantalla`, cuando no hay `hero`, `headDesk` ocupa todo el ancho
(`flex: 1`, sin `flexBasis`); o darle a suplementos su tarjeta amarilla
("Guardar mis suplementos") como `hero`, que además arregla N-P2-6.
Archivos: `components/pantalla.tsx` l. 186; `app/bienestar/suplementacion.tsx` l. 147.

### P1 · Graves (4)

**N-P1-1 · /bienestar/respiracion y /bienestar/meditacion · todas** — Al
final aparece "TU CUERPO HOY": caja con borde, reloj en amarillo, enlace
amarillo "CONECTAR RELOJ" y la frase "HRV, frecuencia cardíaca en reposo y
recuperación". Es un segundo amarillo que compite con la tarjeta, una caja
que el patrón 2.b ya no usa y jerga (HRV) en una pantalla de calma.
**Fix:** reemplazar por una `Fila` gris "Tu reloj · Conectar →" (o quitarla
de estas pantallas: el hub ya tiene "Tu reloj"). Archivo:
`app/bienestar/body-context.tsx` l. 45–70.

**N-P1-2 · Transversal (11 subpantallas) · todas** — Volver tiene tres
formas: fila "VOLVER · Bienestar" al final (respiración, meditación,
sonidos, sueño, diario, hábitos, ayuno, consciencia), enlace "← VOLVER"
(medidas, suplementos, nutrición en móvil) y ninguna flecha arriba en
ninguna. En escritorio el usuario tiene que bajar hasta el final para
salir. Además `router.back()` no hace nada si se entró por enlace directo
(sin historial): botón que no hace nada. *Jakob, Nielsen #3.*
**Fix:** pasar `onBack` a `Pantalla` en las 11 (flecha arriba, 44×44) con
`router.canGoBack() ? router.back() : router.replace('/bienestar')`; quitar
las filas y enlaces "Volver" sueltos. Archivos: `components/pantalla.tsx`
l. 63–72 y cada `app/bienestar/*.tsx` (respiracion l. 278, meditacion
l. 423, binaurales l. 495, sueno l. 121, diario l. 176, habitos l. 375,
ayuno l. 228, nutricion l. 201, cuerpo l. 224, suplementacion l. 152,
consciencia l. 175).

**N-P1-3 · /bienestar/sueno (y toda fila con duración) · móvil** — "Calma
de emergencia · 5 / min", "Recorrido rápido · 8 / min": el número queda en
una línea y "min" en la siguiente; las etiquetas también se parten ("SI NO
PUEDES / DORMIR"). En 390 px la fila se lee a saltos. *Responsive.*
**Fix:** espacio duro entre número y unidad (`${n} min`) en el valor;
en móvil, valor corto (solo "5 min") y el nombre largo como subtítulo, o
etiqueta encima del valor. Archivos: `app/bienestar/sueno.tsx` (valores de
fila), `components/pantalla.tsx` `Fila` l. 140–150.

**N-P1-4 · /bienestar/consciencia · todas** — La lista sigue siendo la
escala de Hawkins, solo sin números: ordenada de Vergüenza a Plenitud y con
niveles que no son emociones ("Neutralidad", "Disposición", "Razón",
"Plenitud"). Un usuario no "siente razón" esta semana; y el orden de peor a
mejor sigue calificando. *Lenguaje (niño de 5 años), voz sin culpa.*
**Fix:** emociones cotidianas sin orden de valor (p. ej. Tranquilo,
Cansado, Ansioso, Contento, Irritable, Triste, Agradecido, Con energía,
Abrumado…), alfabéticas o en grupos neutros; nada que se pueda leer como
ranking. Archivo: `app/bienestar/consciencia.tsx` (datos de la grilla).

### P2 · Mejorables (8)

1. **/bienestar/habitos, nutricion, sueno · todas** — La tarjeta amarilla
   repite la primera fila ("Beber agua al despertar"; "Cuéntanos cómo
   comes" = "Cómo comes"; "Descanso guiado" = fila "DESCANSO GUIADO ·
   Completo 40 min"). **Fix:** excluir de las filas lo que ya está en la
   tarjeta. `habitos.tsx`, `nutricion.tsx`, `sueno.tsx`.
2. **/bienestar/respiracion** — Las 8 filas dicen "1 min" mientras el hub
   promete "Baja el ritmo en 5 minutos"; pares casi iguales ("Para
   enfocarte" / "Para sostener el foco"; "Para calmarte ya" / "Para bajar
   el ritmo"); "Calor y energía interna" no dice para qué. **Fix:** ciclos
   que lleguen a la duración prometida o hub "en pocos minutos"; dejar 5
   intenciones distintas. `respiracion.tsx` l. 31–44, `index.tsx`.
3. **/bienestar/diario, cuerpo · todas** — El botón deshabilitado es el
   elemento más grande y es oliva apagado (oscuro) o crema lavado (claro);
   en Medidas, oliva con texto amarillo dentro de la tarjeta amarilla.
   **Fix:** deshabilitado = contorno `lineHard` + texto `smoke`; el
   amarillo solo cuando se puede guardar. `diario.tsx`, `cuerpo.tsx`.
4. **/bienestar/sueno** — "UNA HISTORIA" tres veces como etiqueta; detalle
   de la tarjeta "Para empezar" no dice nada. **Fix:** una fila "Historias
   para dormir · 3 →" o etiqueta con el nombre; detalle "40 min de
   relajación guiada".
5. **/bienestar/meditacion** — "Cierre del Día" en mayúscula de título;
   categorías opacas ("Identidad", "Decisión", "Inmersión"). **Fix:**
   "Cierre del día"; "Quién quieres ser", "Para decidir", "Sesión larga".
6. **/bienestar/suplementacion · escritorio** — Única subpantalla sin
   tarjeta propuesta: la columna derecha queda vacía y la acción vive al
   final. **Fix:** ver N-P0-1.
7. **/bienestar/cuerpo** — "IMC" sin explicar; la unidad es el placeholder
   y desaparece al escribir. **Fix:** "Índice de masa corporal (IMC)";
   unidad como sufijo fijo junto al campo.
8. **/bienestar/nutricion** — El subtítulo promete "Tu plan de comidas, en
   un solo lugar" y no hay plan a la vista. **Fix:** "Cuéntanos cómo comes
   y guarda el plan de tu nutriólogo."

### P3 · Pulido (3)

1. **/bienestar/consciencia** — 17 recuadros con borde: mucha caja para una
   selección. Chips sin borde o filas con check.
2. **/bienestar/ayuno** — La tarjeta dice "EMPEZAR" como meta, no como
   verbo del botón; "Empezar 16:8" en el título sería más directo.
3. **Transversal** — Flecha "→" de 12 px en filas (R1 P3-5).

**Totales nuevos:** P0 1 · P1 4 · P2 8 · P3 3.

---

## 4. Veredictos

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
Ahora un usuario nuevo entiende cada pantalla en 3 s y encuentra la acción
sin bajar: es otra sección. Lo que falta: una forma de volver, arriba, que
funcione siempre (N-P1-2); que "Tu calma" pregunte por emociones que la
gente reconoce y no por la escalera de Hawkins (N-P1-4); y quitar la fila
que repite la tarjeta en tres pantallas.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
La marca se lee en las once: negro plano, un amarillo, la estrella, Grandis
en caja baja. Pero "Suplement/os" partido en escritorio no puede salir
(N-P0-1); la caja "Tu cuerpo hoy" con amarillo vuelve a meter un segundo
acento (N-P1-1), y los botones deshabilitados color oliva ensucian la
paleta.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Los P0 de contraste y targets de ronda 1 están cerrados y el tema claro está
al nivel del oscuro. Faltan: el botón Volver que no hace nada sin historial,
las duraciones partidas en móvil (N-P1-3) y, por confianza, la escala
encubierta en "Tu calma". Pendiente de verificar con capturas: reproductores,
pantalla final, móvil claro y el tiempo del cambio de tema.
