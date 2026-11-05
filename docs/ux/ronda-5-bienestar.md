# Ronda 5 · Bienestar — puerta final del panel evaluador

Fecha: 2026-11-04 · Local con `9a37239` · Capturas: `docs/ux/capturas-ronda-5.md`
(desktop-dark, desktop-light, mobile-dark, mobile-light; además reproductores
de respiración en marcha, inicio de meditación y sonidos, y final del hub en
390 px) · Vara: `docs/ux/ESTANDAR_UX.md` · Base: `ronda-4-nucleo-bienestar.md`.

Panel: A (experiencia), B (visual y marca), C (accesibilidad y producto). Cada
celda es la **nota más baja** de los tres. Aprueba: ningún criterio < 3 y
promedio ≥ 3,5.

Artefactos de captura (no cuentan): la tarjeta «Juan Jacobo» de la barra
lateral aparece sobre la franja móvil; en claro, el selector lateral marca
«OSCURO»; en el hub y en suplementos (escritorio oscuro) la barra lateral aún
cargaba.

**Pantalla final «Hecho» (no capturada, verificada en código):**
`respiracion.tsx:193`, `meditacion.tsx:245` y `binaurales.tsx:308` usan
`Pantalla` con título «Hecho.» y «N min.» con espacio duro, sin confeti ni
puntos. Respiración y meditación agregan `PracticeClose` (`body-context.tsx:65`):
una sola salida según la jornada (check-in, lección, progreso o diario).
Sonidos no la tiene: termina solo con la flecha (P3, ver abajo).

---

## 1. Notas

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R4 | ¿Aprueba? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,58 | Sí |
| /bienestar/respiracion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 4 | 4 | **3,75** | 3,67 | Sí |
| /bienestar/meditacion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 4 | **2** | **3,67** | 3,67 | **No** |
| /bienestar/binaurales | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,67** | 3,67 | Sí |
| /bienestar/sueno | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,67** | 3,50 | Sí |
| /bienestar/diario | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | **3,50** | 3,50 | Sí |
| /bienestar/habitos | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | **3,58** | 3,58 | Sí |
| /bienestar/ayuno | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | **3,58** | 3,58 | Sí |
| /bienestar/nutricion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /bienestar/cuerpo (Medidas) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /bienestar/suplementacion | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |
| /bienestar/consciencia (Tu calma) | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | **3,75** | 3,75 | Sí |

Resultado: aprueban **11 de 12**. Sueño vuelve a aprobar. Meditación cae por
el mismo defecto que se corrigió en Sueño, y que la ronda 4 pidió buscar en
otras pantallas.

## 2. Estado de los hallazgos de la ronda 4

| ID | Estado | Evidencia |
|---|---|---|
| N4-P1-1 Sueño: «Anoche 10/10» falso | **RESUELTO** | `sueno.tsx:61-71` usa `todayCheckIn` (solo hoy), lo devuelve en la escala 1–5 («Anoche dormiste N de 5, según tu check-in de hoy») y, sin check-in de hoy, muestra el subtítulo neutro (captura móvil oscura: «Elige una, apaga la pantalla y escucha.»). El umbral `<= 4` en la escala guardada equivale a responder «Muy mal» o «Mal»: correcto. |
| Reproductores y final del hub en 390 px | **VERIFICADO** | Respiración en marcha: aro, fase y cuenta grandes, PAUSA en contorno (sin amarillo compitiendo), cuenta con `accessibilityLiveRegion`. Meditación y sonidos al inicio: tiempo grande y un EMPEZAR amarillo. Opciones de sonidos con `minHeight: 44` y `accessibilityState.selected`. El hub termina en «Grito» con aire debajo; no se corta nada. |
| «Hecho» | **VERIFICADO EN CÓDIGO** | Ver arriba. |
| N3-P2-5 Sonidos: valores largos en móvil | SIGUE | «Para sostener la atención en / una tarea.» se parte en 390 px. P2. |
| N4-P3-1 «GUARDAR (NINGUNO)» | SIGUE | Visible en móvil claro y escritorio. P3. |
| N4-P3-2 Suplementos: salir pierde cambios | SIGUE (sin verificar) | P3. |
| P3 Respiración: «1 min» en todas las filas | SIGUE | P3. |

## 3. Hallazgos nuevos

**R5-P1-1 · /bienestar/meditacion · todas · Confianza.**
`meditacion.tsx:322-328` lee `latestCheckIn?.stress` sin mirar la fecha y lo
muestra como «Tu estrés está en 8/10 en tu check-in». Tiene los dos errores
de N4-P1-1: (a) un check-in de hace semanas se presenta como estado actual;
(b) el valor guardado es la respuesta ×2 (`checkin.tsx:483`), así que la
persona eligió «Alta» (4 de 5) y la pantalla le dice 8/10, una cifra que nunca
eligió. Además, la pantalla del check-in la llama **PRESIÓN**, no «estrés». No
salió en las capturas porque el usuario de prueba no tenía presión alta, pero
el código lo produce.
*Fix (el mismo de Sueño):* usar `todayCheckIn`, convertir a 1–5 y decir
«Hoy marcaste tu presión en N de 5. Diez minutos aquí ayudan. Usa audífonos.»
*Archivo:* `app/bienestar/meditacion.tsx:322-328`.

**R5-P3-1 · /bienestar/binaurales · final.** «Hecho.» sin `PracticeClose`:
respiración y meditación ofrecen la salida siguiente y sonidos no. Agregar el
mismo cierre («¿Cómo quedaste?») para que las tres terminen igual.

**R5-P3-2 · /bienestar/meditacion · reproductor.** El título dice «Cierre del
Día» (mayúscula inicial en cada palabra) y la tarjeta dice «Cierre del día».

**R5-P3-3 · /bienestar · 390 px.** «Golpecitos para soltar tensión · opcional»
ocupa dos líneas; es la única fila del hub que se parte.

**R5-P3-4 · /bienestar/respiracion · reproductor.** No se ve cuánto falta (ni
ciclos ni tiempo). Con «1 min» basta una línea pequeña, «Ciclo 2 de 4».

**Totales:** P0 0 · P1 1 (R5-P1-1) · P2 1 (N3-P2-5) · P3 6.

---

## 4. Veredictos

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
Sueño ya dice la verdad y en la escala de la persona: era lo que pedí. Pero
meditación tiene la misma frase con un dato viejo y en una escala ajena, y
además usa «estrés» donde el check-in dijo «presión». No puedo firmar una
sección en la que una pantalla ya corrigió un problema y la de al lado lo
conserva. Arreglen R5-P1-1 y firmo.

**Evaluador B · Diseño visual y marca — ME CONVENCE.**
Los reproductores están en la marca: negro plano, un número grande y un solo
amarillo (EMPEZAR) o ninguno (PAUSA en contorno). «Hecho.» es sobrio. El hub
cierra limpio en 390 px. Lo que queda (Title Case, una fila partida,
«(NINGUNO)») es pulido.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Por fin vi los reproductores y el final del hub: objetivos de 44 px, estados
de selección anunciados, cuenta en región viva y avisos de seguridad en
respiración, meditación, sonidos, sueño y ayuno. «Hecho» está bien en código.
Me falta lo mismo que a A: meditación decide qué decir con un dato que no es
de hoy y que no está en la escala de la persona. Es el mismo bug que me hizo
decir «todavía no» en la ronda 4.
