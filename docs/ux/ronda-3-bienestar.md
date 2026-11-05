# Ronda 3 · Bienestar — panel evaluador

Fecha: 2026-11-04 · Local con `c30ecc7`, `db244fc` y `c63208c` · Capturas:
`docs/ux/capturas-ronda-3.md` (desktop-dark, desktop-light, desktop-dark-scrolled,
mobile-dark y, por primera vez, **mobile-light**; nutrición sin scrolled).
Vara: `docs/ux/ESTANDAR_UX.md`. Panel: A (experiencia), B (visual y marca),
C (accesibilidad y producto). Cada celda es la **nota más baja** de los tres.

Límites que siguen abiertos: no hay capturas de reproductores ni de pantallas
finales ("Hecho. N min."), ni del tiempo del cambio de tema, ni del final del
hub en móvil. Lo verificado solo en código se marca así. Las notas de captura
(barra lateral cargando en suplementos, Tu calma y Medidas) no se cuentan como
defectos.

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza. Aprueba: ningún criterio < 3 y promedio ≥ 3,5.

---

## 1. Tabla resumen

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R2 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,58 | 3,50 | **Aprueba** |
| /bienestar/respiracion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,67 | 3,42 | **Aprueba** |
| /bienestar/meditacion | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,67 | 3,33 | **Aprueba** |
| /bienestar/binaurales (Sonidos) | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,67 | 3,67 | **Aprueba** |
| /bienestar/sueno | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,67 | 3,42 | **Aprueba** |
| /bienestar/diario | 4 | 3 | 3 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,50 | 3,33 | **Aprueba** |
| /bienestar/habitos | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,58 | 3,42 | **Aprueba** |
| /bienestar/ayuno | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3,58 | 3,50 | **Aprueba** |
| /bienestar/nutricion | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,58 | 3,42 | **Aprueba** |
| /bienestar/cuerpo (Medidas) | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,67 | 3,42 | **Aprueba** |
| /bienestar/suplementacion | 4 | 3 | 3 | 4 | **2** | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3,25 | 2,92 | No aprueba |
| /bienestar/consciencia (Tu calma) | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 3,33 | 3,00 | No aprueba |

Lectura rápida: 10 de 12 aprueban. La flecha de volver arriba y la fila gris
"Tu reloj" cerraron los dos P1 transversales; el móvil claro está al nivel del
oscuro (sin fondos negros perdidos, estrella en tinta sobre amarillo, texto
legible). Quedan dos pantallas: Suplementos dice "Guardado" sin haber guardado
todo (estado engañoso) y Tu calma no llega al promedio por lenguaje en
masculino y una grilla de cajas que se sale de la gramática.

---

## 2. Estado de los hallazgos de ronda 2

### P0
| # | Hallazgo | Estado | Nota |
|---|---|---|---|
| N-P0-1 | "Suplement/os" partido en escritorio | RESUELTO | Sin `hero` el titular usa `headDeskFull` y baja a 52 px si la palabra pasa de 9 letras (`components/pantalla.tsx` l. 64–70). Se ve entero en oscuro y claro. |

### P1
| # | Hallazgo | Estado | Nota |
|---|---|---|---|
| N-P1-1 | "Tu cuerpo hoy" con segundo amarillo y HRV | RESUELTO | Ahora es una fila gris "TU RELOJ · Conectar →" en respiración y meditación. Sin caja, sin jerga. |
| N-P1-2 | Tres formas de volver; `back()` muerto sin historial | RESUELTO | Flecha arriba 44×44 en las 11 + hub; sin historial cae a `/bienestar` o `/(tabs)/yo`. Filas y enlaces "Volver" sueltos eliminados. Nutrición usa `onBack` para el paso anterior. |
| N-P1-3 | Duraciones partidas en móvil | RESUELTO | "5 min", "8 min" en una línea; "SI NO PUEDES DORMIR" cabe en 390 px. |
| N-P1-4 | Tu calma = escala de Hawkins sin números | RESUELTO | 13 emociones cotidianas en orden alfabético; `migrateMarked` conserva lo guardado. Ver nuevo N3-P2-1 (género). |

### P2
| # | Estado | Nota |
|---|---|---|
| 1 Tarjeta repite la primera fila | RESUELTO | Hábitos, nutrición y sueño ya no repiten. |
| 2 Respiración: "1 min" vs "5 minutos", pares casi iguales | RESUELTO | Hub "en pocos minutos"; 5 intenciones distintas. |
| 3 Botón deshabilitado oliva | PARCIAL | Diario, Tu calma y nutrición: contorno gris, bien. Medidas: contorno tinta sobre amarillo se lee como botón activo (N3-P2-3). |
| 4 "UNA HISTORIA" ×3 | RESUELTO | "HISTORIA · EL BOSQUE", etc. |
| 5 Meditación: mayúsculas y categorías opacas | RESUELTO | "Cierre del día", "Quién quieres ser", "Para decidir", "Sesión larga". |
| 6 Suplementos sin tarjeta | PARCIAL | El titular ya no se parte, pero la acción sigue al final, bajo 5 filas y un plegado en móvil. |
| 7 IMC sin explicar, unidad en placeholder | RESUELTO | "ÍNDICE DE MASA CORPORAL (IMC)"; "PESO (KG)", "ALTURA (CM)". |
| 8 Subtítulo de nutrición | RESUELTO | "Cuéntanos cómo comes y guarda el plan de tu nutriólogo." (ver N3-P2-2). |

### P3
| # | Estado | Nota |
|---|---|---|
| 1 Tu calma: 13 recuadros con borde | SIGUE | Ver N3-P2-1. |
| 2 Ayuno: "EMPEZAR" como meta | RESUELTO | "Empezar 16:8". |
| 3 Flecha de 12 px en filas | RESUELTO | 18 px, gris. |

### Arrastrados de ronda 1 sin verificar
Hub móvil completo, esqueleto "Para hoy", Arial durante la carga,
reproductores, pantalla final: **SIN VERIFICAR** (no hay capturas).

---

## 3. Hallazgos nuevos

### P0 · Bloqueantes (0)

### P1 · Graves (1)

**N3-P1-1 · /bienestar/suplementacion · todas** — Guardar solo guarda la
pestaña visible y siempre dice "Guardado". (a) Marcas algo en Energía, pasas a
Sueño, marcas, tocas "Guardar mis suplementos": aparece "Guardado. 1 en esta
lista." y Energía nunca se guardó; al salir se pierde sin aviso. (b) El
`upsert` está en `catch { }` vacío y sin `userId` no se llama: en ambos casos
la pantalla dice "Guardado". Éxito falso = estado engañoso y pérdida de datos.
*Nielsen #1, confianza.*
**Fix:** guardar las tres pestañas en una sola acción (recorrer `TABS` y hacer
`upsert` por `goal`); en el `catch` mostrar "No se pudo guardar. Inténtalo de
nuevo." y `logSilentError('suplementos.save', e)`; "Guardado" solo tras éxito
real. Archivo: `app/bienestar/suplementacion.tsx` l. 119–139 y l. 228–232.

### P2 · Mejorables (5)

1. **N3-P2-1 · /bienestar/consciencia · todas** — Las 13 emociones están en
   masculino ("Abrumado", "Cansado", "Enojado", "Querido", "Tranquilo"…): la
   mitad de los usuarios se lee en otro género en una pantalla íntima, y "Solo"
   es ambiguo (¿"solamente"?). Además, la grilla de 13 cajas con borde es la
   única de la sección que no usa filas. Es lo que deja la pantalla en 3,33.
   **Fix:** sustantivos neutros, alfabéticos: Agobio, Alegría, Ansiedad,
   Calma, Cansancio, Cariño, Energía, Enfoque, Enojo, Gratitud, Seguridad,
   Soledad, Tristeza; celdas sin borde (fondo `charcoal` solo al marcar) o
   filas con check. `app/bienestar/consciencia.tsx` l. 40–53 y estilos
   `cell` l. 195–204.
2. **N3-P2-2 · /bienestar/nutricion · móvil** — La fila se parte: "TU PLAN
   DEL / NUTRIÓLOGO" en dos líneas y el valor "Pega el enlace de tu / plan"
   deja "plan" huérfano. "Nutriólogo" es de México; en Colombia se dice
   nutricionista. **Fix:** etiqueta "TU PLAN", valor "Pegar enlace";
   "nutricionista" en sub, placeholder y `accessibilityLabel`.
   `app/bienestar/nutricion.tsx` l. 261, 279–281, 308.
3. **N3-P2-3 · /bienestar/cuerpo · todas** — Con los campos vacíos, GUARDAR
   (contorno tinta, texto tinta sobre amarillo) parece un botón activo; y el
   placeholder "kg"/"cm" a 28 px en tinta se lee como un valor ya escrito.
   **Fix:** deshabilitado con texto y borde al 40 % de tinta (`ink` + opacidad
   solo en el texto) o el botón oculto hasta que haya peso y altura;
   placeholder en gris medio o vacío (la unidad ya está en la etiqueta).
   `app/bienestar/cuerpo.tsx` estilos `oroBtnOff`, `oroBtnTextOff`, `oroInput`.
4. **N3-P2-4 · /bienestar/suplementacion · todas** — La acción vive al final
   (bajo 5 filas y, en móvil, bajo el pliegue), y el botón amarillo está
   activo con cero marcados. **Fix:** tras N3-P1-1, el texto del botón con el
   conteo ("Guardar 2 suplementos") y deshabilitado si no hubo cambios.
5. **N3-P2-5 · /bienestar/binaurales · móvil** — Valores largos ("Para
   sostener la atención en una tarea.") ocupan dos líneas junto a la etiqueta;
   la fila se lee a saltos. **Fix:** en móvil, valor corto ("Una tarea", "Un
   bloque exigente") o la frase como subtítulo bajo la etiqueta.
   `app/bienestar/binaurales.tsx` (valores de fila).

### P3 · Pulido (2)

1. **/bienestar/sueno** — La tarjeta dice "20 MIN" arriba y "…para empezar,
   20 min." en el detalle. Quitar la duración del detalle.
2. **/bienestar/respiracion** — Todas las filas dicen "1 min" mientras el hub
   dice "Diez minutos bastan". Mostrar ciclos ("4 ciclos") o la duración real
   de la sesión completa.

**Totales nuevos:** P0 0 · P1 1 · P2 5 · P3 2.

---

## 4. Veredictos

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
Diez pantallas se entienden en 3 s, tienen una sola acción y una salida
arriba que funciona siempre: así se ve una sección madura. No firmo mientras
Suplementos diga "Guardado" cuando no guardó (N3-P1-1) y Tu calma le hable en
masculino a todo el mundo (N3-P2-1). Con esas dos, me convence.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Negro y amarillo planos, Grandis en caja baja, un solo amarillo por pantalla,
estrella en tinta sobre la tarjeta, y el claro móvil tan limpio como el
oscuro. Falta: la grilla de cajas de Tu calma, que es lo único fuera de la
gramática de filas, y el GUARDAR deshabilitado de Medidas, que parece activo.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Volver 44×44 con salida sin historial, duraciones en una línea, contraste del
claro móvil correcto, deshabilitados con contorno. Bloquea el éxito falso de
Suplementos (pérdida silenciosa de datos). Para firmar también necesito ver,
una vez, los reproductores y la pantalla final ("Hecho") en móvil, y el final
del hub en 390 px.
