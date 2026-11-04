# Estándar UX de Polaris — el "cerebro" del panel evaluador

Este documento es la vara con la que se mide cada pantalla. Lo usa un panel
de tres evaluadores con 15 años de experiencia cada uno. Una pantalla no se
publica hasta que los tres la aprueban.

Fuentes: Nielsen (10 heurísticas, 1994/2020), Don Norman (*The Design of
Everyday Things*: affordances, significantes, mapeo, feedback, modelo
conceptual), Steve Krug (*Don't Make Me Think*), Wathan y Schoger
(*Refactoring UI*), Jon Yablonski (*Laws of UX*: Hick, Fitts, Jakob,
Miller, Tesler, carga cognitiva, Von Restorff, efecto pico-final, Zeigarnik,
Doherty), BJ Fogg (*Tiny Habits*, B=MAP), Nir Eyal (*Hooked*, usado con ética),
Apple Human Interface Guidelines, Material 3, WCAG 2.2 AA,
Kahneman (sistema 1/2), Dieter Rams (10 principios), Polaris (manual de
marca, PRODUCT.md, DESIGN.md).

---

## 1. Principios de Polaris (no negociables)

1. **Una decisión por pantalla.** Cada pantalla tiene UNA acción principal
   evidente en menos de 3 segundos (Hick, Krug). Todo lo demás es secundario
   y se ve secundario.
2. **Un niño de 5 años entiende para qué es.** Sin jerga: nada de
   "coherencia", "score soberano", "lectura", "protocolo operativo" sin
   explicar. Las palabras son las del usuario, no las del sistema
   (Nielsen #2).
3. **Busca el estado, no el resultado.** Voz sobria, directa, sin
   gamificación infantil, sin confeti, sin culpa.
4. **Manual de marca.** Negro y amarillo planos (#000 / #FFC804), gris
   #CFCFCF para la estrella en claro, Grandis Extended para titulares,
   Source Sans para texto. La estrella oficial. Sin fotos de personas. Sin
   degradados de texto, sin glassmorphism decorativo, sin barras laterales
   de color, sin etiquetas sobre cada título.
5. **El amarillo se gana.** Solo para la acción principal o el dato que más
   importa. Si hay dos cosas amarillas compitiendo, una sobra (Von Restorff).
6. **Menos ruido.** Feedback recurrente del dueño: cada chip, borde,
   etiqueta o tarjeta debe justificar su existencia.

## 2. Rúbrica por pantalla (0–4 cada criterio)

| # | Criterio | Qué mira el evaluador |
|---|---|---|
| 1 | **Propósito en 3 s** | ¿Se entiende qué es la pantalla y para qué sirve sin leer todo? |
| 2 | **Acción principal** | ¿Hay UNA, se ve, está donde el pulgar llega (Fitts), dice lo que hace? |
| 3 | **Jerarquía visual** | Escala tipográfica clara, espacio respira, el ojo sabe dónde ir. |
| 4 | **Lenguaje** | Palabras del usuario, frases cortas, verbos en los botones, cero jerga. |
| 5 | **Estado y feedback** | Vacío, cargando, error, éxito: todos existen y se dicen en humano. |
| 6 | **Consistencia** | Misma gramática que el resto (meta → titular → una acción → filas). |
| 7 | **Marca** | Colores, tipografías y estrella según el manual. Nada fuera de sistema. |
| 8 | **Accesibilidad** | Contraste ≥4.5:1 texto / 3:1 grande, táctil ≥44 px, foco visible, lectores de pantalla, `prefers-reduced-motion`. |
| 9 | **Responsive** | Móvil 375–430 sin scroll horizontal ni textos cortados; escritorio usa el ancho con intención, no un móvil estirado. |
| 10 | **Temas** | Oscuro y claro igual de cuidados; nada ilegible, nada "negro sobre negro". |
| 11 | **Emoción / pico-final** | El momento clave (guardar, completar) se siente bien y termina limpio. |
| 12 | **Confianza** | Honestidad (no promete lo que no hace), privacidad clara, IA identificada. |

**Aprobación:** una pantalla aprueba cuando ningún criterio está por debajo
de 3 y el promedio es ≥ 3,5. La app aprueba cuando todas sus pantallas
aprueban y los tres evaluadores dicen, cada uno, "me convence".

## 3. Severidad de hallazgos

- **P0 · Bloqueante**: impide usar, engaña, rompe accesibilidad básica,
  ilegible en un tema, texto cortado, botón que no hace nada.
- **P1 · Grave**: confunde la acción principal, jerga que un nuevo usuario
  no entiende, inconsistencia evidente con la gramática, ruido que compite.
- **P2 · Mejorable**: ajuste de espaciado, copy, orden, microinteracción.
- **P3 · Pulido**: detalle fino de oficio.

Se corrigen todos los P0 y P1 antes de publicar. Los P2 en la misma
iteración si son baratos.

## 4. El panel

- **Evaluadora A · Investigación y experiencia** (Nielsen/Norman/Krug):
  ¿entiende un usuario nuevo, cansado, en el celular, qué hacer?
- **Evaluador B · Diseño visual y marca** (Refactoring UI, Rams, manual
  Polaris): jerarquía, tipografía, espacio, color, consistencia.
- **Evaluadora C · Accesibilidad y producto** (WCAG 2.2, HIG, Fogg): ¿lo
  puede usar todo el mundo? ¿el hábito diario es fácil (B=MAP)?

Cada uno puntúa la rúbrica, lista hallazgos con severidad y pantalla, y
cierra con "ME CONVENCE" o "TODAVÍA NO" (con lo que falta).
