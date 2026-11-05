# Ronda 1 · Bienestar — panel evaluador

Fecha: 2026-11-04 · Producción · Capturas: `docs/ux/capturas-ronda-1.md`
(desktop-dark, desktop-dark-scrolled, desktop-light, mobile-dark,
mobile-dark-scrolled, mobile-light de cada ruta).
Vara: `docs/ux/ESTANDAR_UX.md`. Panel: A (experiencia), B (visual y marca),
C (accesibilidad y producto). Cada celda es la **nota más baja** de los tres.

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza. Aprueba: ningún criterio < 3 y promedio ≥ 3,5.

---

## 1. Tabla resumen por ruta

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar | 4 | 3 | 3 | 3 | 2 | 4 | 3 | 2 | 3 | 1 | 3 | 3 | 2,8 | No aprueba |
| /bienestar/respiracion | 3 | 2 | 2 | 1 | 2 | 1 | 1 | 1 | 2 | 0 | 2 | 3 | 1,7 | No aprueba |
| /bienestar/meditacion | 2 | 1 | 2 | 3 | 2 | 1 | 2 | 1 | 1 | 0 | 2 | 3 | 1,7 | No aprueba |
| /bienestar/binaurales | 1 | 1 | 1 | 1 | 2 | 1 | 0 | 2 | 2 | 0 | 2 | 2 | 1,3 | No aprueba |
| /bienestar/sueno | 2 | 1 | 2 | 2 | 1 | 1 | 1 | 2 | 2 | 0 | 2 | 3 | 1,6 | No aprueba |
| /bienestar/diario | 4 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 4 | 2,6 | No aprueba |
| /bienestar/habitos | 2 | 1 | 1 | 1 | 2 | 1 | 0 | 0 | 1 | 2 | 1 | 1 | 1,1 | No aprueba |
| /bienestar/ayuno | 3 | 1 | 2 | 1 | 2 | 1 | 1 | 2 | 2 | 2 | 2 | 1 | 1,7 | No aprueba |
| /bienestar/nutricion | 1 | 1 | 2 | 3 | 1 | 1 | 2 | 2 | 2 | 2 | 1 | 1 | 1,6 | No aprueba |
| /bienestar/cuerpo | 2 | 1 | 1 | 2 | 1 | 1 | 1 | 2 | 2 | 2 | 1 | 1 | 1,4 | No aprueba |
| /bienestar/suplementacion | 3 | 3 | 2 | 1 | 2 | 1 | 2 | 2 | 3 | 2 | 2 | 0 | 1,9 | No aprueba |
| /bienestar/consciencia | 1 | 1 | 1 | 0 | 2 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | 0,8 | No aprueba |

Lectura rápida: el hub ya habla la gramática nueva y está cerca de aprobar
(lo hunden el tema claro y su congelamiento, no su diseño). **Ninguna de las
11 subpantallas usa la gramática nueva**: todas abren con el header viejo
(flecha · TÍTULO CENTRADO EN MAYÚSCULAS · hueco), un aviso amarillo en caja
y una lista de tarjetas. Al entrar desde el hub el usuario cambia de producto.

---

## 2. Hallazgos (P0 → P3)

### P0 · Bloqueantes (9)

1. **Transversal (respiración, meditación, binaurales, sueño, consciencia) ·
   claro** — El título del aviso ("AVISO DE SEGURIDAD", "SOBRE LOS
   BINAURALES", "HERRAMIENTA DE AUTOEXPLORACIÓN") es amarillo #FFC804 sobre
   fondo crema teñido: ~1,3:1, ilegible. Un aviso de seguridad que no se lee
   no protege. *WCAG 1.4.3; regla de color del proyecto (gold = relleno,
   goldText = texto).* **Fix:** en `TONES.gold` usar `accent: palette.goldText`
   para título e ícono (dejar `palette.gold` solo para el borde).
   Archivo: `components/SafetyWarning.tsx` (l. 38 y 60–62).

2. **Transversal · claro** — Cambiar a tema claro congela la página 10–30 s;
   la captura mobile-light de /bienestar quedó a medio pintar (columna clara
   sobre el render oscuro). *Doherty (<400 ms), Nielsen #1.* **Fix:** el
   cambio debe ser solo el `data-theme` del `<html>` (las variables ya
   existen); no remontar el árbol ni re-inyectar `<style>`; medir con
   Performance y quitar cualquier `key`/estado que fuerce re-render global.
   Archivos: `hooks/use-app-theme.tsx`, `constants/themeColors.ts`.

3. **Transversal (todas las rutas, escritorio) · claro** — La barra lateral
   queda gris oscuro con los ítems (HOY, CHECK-IN, PROGRAMA…) en gris sobre
   gris: ilegibles. Solo se lee el selector CLIENTE/ADMIN. *WCAG 1.4.3,
   "negro sobre negro" del estándar.* **Fix:** fondo `palette.black`
   (tematizado) y texto `palette.ivory`/`ash`; nada de hex fijo.
   Archivo: `components/DesktopSidebar.tsx` (fuera de alcance de esta ronda,
   pero se ve en las 12 pantallas).

4. **/bienestar/respiracion y /bienestar/consciencia · todas** — Círculo vacío
   arriba a la derecha (blanco en claro, gris en oscuro). Parece un botón y no
   hace nada. *Norman: significante falso.* **Fix:** el espaciador reutiliza
   `styles.backBtn` (que tiene fondo); darle un estilo propio sin fondo
   (`{ width: 40, height: 40 }`). Archivos: `app/bienestar/respiracion.tsx`
   l. 213, `app/bienestar/consciencia.tsx` (header l. 299).

5. **/bienestar/consciencia · todas** — Los niveles se miden en "Hz" ("200 Hz",
   "Promedio de la semana: 230 Hz"). La escala de Hawkins no son hercios: es
   un dato falso con apariencia científica. *Confianza: no prometer lo que no
   es; PRODUCT.md "confront with data".* **Fix:** quitar "Hz" en toda la
   pantalla y en los `accessibilityLabel`; si se conserva el número, llamarlo
   "nivel". Archivo: `app/bienestar/consciencia.tsx` (l. 228, 341, 352, 385,
   396).

6. **/bienestar/consciencia · todas** — Texto cortado: "PENA / AFLI…".
   *Estándar: texto cortado = P0.* **Fix:** etiqueta "PENA" (o permitir 2
   líneas). Archivo: `app/bienestar/consciencia.tsx` (datos de niveles).

7. **/bienestar/meditacion · mobile** — El sello "Evidencia sólida" se monta
   sobre el ícono de completado/play ("Evidencia sólid▶") y "5 min" se parte
   en dos líneas. *Texto cortado + target tapado.* **Fix:** sacar el sello de
   la fila de metadatos (o eliminarlo, ver P1-5) y reservar 44 px fijos a la
   derecha para el botón. Archivo: `app/bienestar/meditacion.tsx`.

8. **/bienestar/habitos · mobile** — Las tarjetas tocan el borde (~6 px de
   margen, el estándar pide 16) y el botón "+" mide ~20 px. *WCAG 2.5.8,
   HIG 44 pt.* **Fix:** `paddingHorizontal: spacing.lg`; hacer toda la fila
   tocable para añadir, o `hitSlop` hasta 44×44. Archivo:
   `app/bienestar/habitos.tsx`.

9. **/bienestar/respiracion · claro** — El círculo "LISTO" es crema sobre
   crema con halo amarillo: el único elemento de la pantalla casi desaparece
   y "LISTO" queda en ámbar fino sobre crema. *WCAG 1.4.11 (3:1 para
   componentes).* **Fix:** círculo con borde `palette.lineHard` y texto
   `palette.ivory`; sin halo (ver P1-3). Archivo:
   `app/bienestar/respiracion.tsx`.

### P1 · Graves (16)

1. **/bienestar → subpantallas · todas** — El hub promete una cosa y la
   pantalla dice otra: "TU CALMA · mide qué tan en paz estás" abre "ESCALA DE
   CONSCIENCIA" con Fuerza/Poder; "SONIDOS" abre "BINAURALES"; "MEDIDAS" abre
   "CUERPO"; "NUTRICIÓN · tu plan de comidas" abre un cuestionario 1/5 sobre
   tipo de dieta. *Nielsen #4, modelo conceptual.* **Fix:** el titular de cada
   pantalla repite la palabra del hub (Sonidos, Medidas, Tu calma, Tu plan de
   comidas). Archivos: `app/bienestar/index.tsx` l. 25–65 y el título de cada
   pantalla.

2. **Transversal (11 subpantallas)** — Gramática vieja: header centrado en
   mayúsculas, aviso en caja amarilla arriba, tarjetas con borde. Nada de
   meta → titular → una tarjeta amarilla → filas. *Consistencia (Jakob), regla
   6 del estándar.* **Fix:** aplicar el patrón compartido de la sección 2.b.

3. **/bienestar/respiracion · todas** — Halo/resplandor amarillo alrededor del
   círculo, fondo con viñeta: decorativo, fuera de manual (amarillo plano, sin
   brillos). Y la acción "COMENZAR SESIÓN" queda bajo el pliegue en
   escritorio (columna de 230 px de ancho en una pantalla de 920). *Rams,
   Fitts, Von Restorff.* **Fix:** círculo plano + estrella oficial; botón
   pegado bajo el círculo; en escritorio, dos columnas como el hub.

4. **/bienestar/respiracion · todas** — Chips "4·7·8 · BOX · 5·5 · WIM HOF ·
   SUSPIRO FISIO" (el último cortado en móvil): jerga que un usuario nuevo no
   entiende. *Regla del niño de 5 años.* **Fix:** nombres por intención —
   "Para dormir", "Para enfocarte", "Para calmarte ya", "Para activarte"; el
   patrón técnico va en la línea de descripción.

5. **/bienestar/meditacion · todas** — 9 pestañas horizontales + 6–10 tarjetas
   por pestaña, cada una con play amarillo: decenas de acciones iguales, cero
   propuesta. El chip "MAÑANA" en cada tarjeta repite la pestaña; el sello
   "Evidencia sólida" en amarillo compite con el play. *Hick, Von Restorff,
   "el amarillo se gana".* **Fix:** una tarjeta amarilla "Para ahora" elegida
   por hora del día; el resto como filas (nombre · min · →); quitar chip de
   categoría; el sello pasa a una línea gris en el detalle.

6. **/bienestar/binaurales · todas** — Franjas laterales de color (azul,
   morado, verde, naranja) e íconos de cuatro colores: prohibido por el
   manual ("sin barras laterales de color") y fuera de la paleta. *Marca.*
   **Fix:** filas planas en gris; color solo en el play de la fila propuesta.
   Archivo: `app/bienestar/binaurales.tsx`.

7. **/bienestar/binaurales · todas** — "DELTA 0,5–4 Hz · 2 HZ BEAT · 200 HZ
   PORTADORA", "MEZCLADOR": jerga técnica en la cara de la pantalla; "requiere
   audífonos" se dice 3 veces y hay dos cajas de aviso antes del primer
   sonido (en móvil el primer play aparece a 1,5 pantallas). *Krug, carga
   cognitiva.* **Fix:** filas "Dormir profundo · Relajarte · Calma alerta ·
   Concentrarte"; un solo aviso de una línea ("Usa audífonos. Si te mareas,
   para."); el mezclador como fila al final ("Hacer tu mezcla").

8. **/bienestar/sueno · todas** — Plays morados (`wellness-purple`) fuera de
   manual; "Sueño 10/10 — lo estás haciendo bien" sin decir de dónde sale el
   10/10; "S.O.S", "Body scan", "Yoga Nidra", "Nidra intro" sin traducir.
   *Marca, Nielsen #2, confianza.* **Fix:** plays en `palette.ash` (amarillo
   solo en la propuesta); "Anoche: 10/10 en tu check-in"; "Si no puedes
   dormir", "Recorre tu cuerpo", "Descanso guiado". Archivo:
   `app/bienestar/sueno.tsx`.

9. **/bienestar/habitos · todas** — Puntos (+10, +20 pts, "PUNTOS 0 de 0"):
   gamificación que el manual y PRODUCT.md rechazan. "0/1 hábitos" sin haber
   elegido ninguno confunde. *Busca el estado, no el resultado.* **Fix:**
   quitar puntos de la UI (y del `accessibilityLabel` l. 298); arriba solo
   "Hoy: 0 de 3 hechos" cuando haya hábitos; vacío = "Elige uno para
   empezar". Archivo: `app/bienestar/habitos.tsx` l. 259–308.

10. **/bienestar/habitos · todas** — Afirmaciones sin respaldo o falsas en
    las descripciones: "Alcaliniza", "Libera BDNF", "activa la corteza
    prefrontal", "Café bulletproof · combustible". *Confianza; prioridad 6
    del consejo (curar por evidencia).* **Fix:** una frase llana por hábito
    sin mecanismos ("Empieza el día con agua"); retirar "café bulletproof".

11. **/bienestar/habitos, ayuno, nutricion, cuerpo, suplementacion ·
    escritorio** — Filas a todo el ancho (900 px+), con el dato a la
    izquierda y la acción a 700 px de distancia; el resto de pantallas usa una
    columna de ~530 px. *Refactoring UI (largo de línea), Fitts, consistencia.*
    **Fix:** mismo `maxWidth` que el hub (≈680) para todas.

12. **/bienestar/ayuno · todas** — "INICIAR AYUNO" está al final del scroll,
    después de 6 protocolos, 8 etapas y la guía. 48 h y 72 h aparecen como
    opciones al mismo nivel que 16:8. "Autofagia… mecanismo del Nobel 2016",
    "cetosis", "recambio inmune" en primer plano. *Una decisión por pantalla;
    riesgo reputacional (consejo asesor, riesgo 2).* **Fix:** protocolo
    elegido + botón amarillo arriba; 24/48/72 h tras una fila "Ayunos largos
    (con supervisión)"; etapas y guía como filas plegadas. Archivo:
    `app/bienestar/ayuno.tsx` l. 223–323.

13. **/bienestar/nutricion · todas** — Un asistente "1/5" (tipo de dieta)
    mezclado con un formulario distinto (enlace del plan + nutriólogo) y dos
    botones grises ("AGREGAR PLAN", "CONTINUAR") sin acción principal. El
    texto dice "Sube el plan" pero pide una URL. *Una decisión por pantalla,
    honestidad.* **Fix:** separar: paso del asistente con un único botón
    amarillo "Seguir"; el plan en su propia fila "Tu plan del nutriólogo";
    texto "Pega el enlace de tu plan". Archivo: `app/bienestar/nutricion.tsx`.

14. **/bienestar/cuerpo · todas** — Lo primero que se ve es un IMC con zona
    roja (juicio sobre el cuerpo; el propio repo cortó detectores por riesgo
    TCA). Debajo, 9 campos a la vez y un "GUARDAR MEDICIÓN" gris. Los
    placeholders (75.0, 175, 80, 100…) parecen datos ya cargados. *Fogg
    (habilidad), confianza, Nielsen #5.* **Fix:** titular "Tus medidas";
    tarjeta amarilla = "Registrar hoy" con solo peso y altura; "Más medidas"
    plegado; placeholders vacíos o "kg"/"cm"; IMC como fila neutra, sin rojo.
    Archivo: `app/bienestar/cuerpo.tsx` l. 38–43, 207–237.

15. **/bienestar/suplementacion · todas** — Dosis por defecto como si fueran
    recomendación ("Vitamina D3 5000 UI", "Ashwagandha 300–600 mg") y
    "Huberman Lab" como fuente junto a PubMed. "Stack", "B-Complex", "KSM-66",
    "ATP", "ferritina sérica" sin explicar. *Confianza/regulatorio (consejo
    asesor: separar consejo y venta).* **Fix:** sin dosis precargadas ("Tu
    dosis: la que te indicó tu médico"); fuentes solo primarias; "Guardar mis
    suplementos". Archivo: `app/bienestar/suplementacion.tsx` l. 40, 275.

16. **/bienestar/consciencia · todas** — Barra roja "FUERZA <200" vs amarilla
    "PODER": califica emociones (vergüenza = 20, iluminación = 700) — culpa
    explícita, contrario a "sin culpa". En móvil la grilla queda desalineada
    (anchos variables), y en claro los niveles ≥200 son ámbar sobre beige.
    *Voz Polaris, Gestalt, contraste.* **Fix:** reencuadrar como "Tu calma
    esta semana": marcar emociones (ya existe abajo) es la acción principal y
    va arriba; quitar la escala numérica y la barra roja; grilla de 3 columnas
    fijas. Archivo: `app/bienestar/consciencia.tsx`.

### P2 · Mejorables (9)

1. **/bienestar · todas** — Cuatro amarillos compiten: meta "BIENESTAR",
   tarjeta, y rótulos de grupo "CALMA/CUERPO/SALUD". **Fix:** rótulos de grupo
   en `palette.ash`; amarillo solo en la tarjeta. `app/bienestar/index.tsx`.
2. **/bienestar · mobile** — "TU SALUD" y su descripción se parten en dos
   líneas; 17 filas es mucho para "Elige una". **Fix:** acortar a "Tus
   exámenes"; plegar MENTE bajo "Más".
3. **/bienestar · estados** — Sin estado de carga/vacío visible para la
   propuesta "Para hoy". **Fix:** esqueleto de la tarjeta.
4. **Transversal · mobile (meditación, sueño, diario)** — Texto en Arial
   durante la carga (fuente de sistema antes de Source Sans): salto visible.
   **Fix:** `font-display: optional` o precarga en `app/+html.tsx`.
5. **/bienestar/diario · todas** — "GUARDAR ENTRADA" deshabilitado sin decir
   por qué; dos amarillos (chip activo + botón). **Fix:** texto auxiliar
   "Escribe algo para guardar"; chip activo en `ivory`, no amarillo.
6. **/bienestar/diario · escritorio** — Caja de texto de 520 px en pantalla
   ancha; "TIPO" y "ENTRADA" son rótulos de sistema. **Fix:** titular "¿Qué
   te dejó el día?" y el campo directo.
7. **/bienestar/respiracion** — "CICLOS COMPLETADOS · 0" en monoespaciada con
   cero al inicio: dato vacío sin valor. **Fix:** mostrarlo solo al pausar o
   terminar.
8. **/bienestar/suplementacion · claro** — Caja informativa con borde negro
   duro; horarios ámbar de 11 px. **Fix:** fila gris sin borde; horario en
   `ash` 12 px.
9. **/bienestar/ayuno · todas** — Tarjetas de guía con franja lateral
   amarilla (prohibida). **Fix:** filas planas.

### P3 · Pulido (5)

1. **/bienestar/cuerpo · mobile** — Falta la flecha de volver en la primera
   captura (header sin `←`). Verificar que exista en todas las anchuras.
2. **/bienestar/meditacion** — "Usa auriculares", en binaurales "audífonos":
   unificar.
3. **/bienestar/consciencia** — "CHECK SEMANAL" → "Esta semana".
4. **/bienestar/suplementacion** — Pestañas ENERGÍA/SUEÑO/COGNITIVO con
   ícono y relleno amarillo: bastaría texto subrayado.
5. **/bienestar · desktop** — La flecha "→" de las filas es de 12 px;
   subirla a 16 para mejor significante.

**Totales:** P0 9 · P1 16 · P2 9 · P3 5.

---

## 2.b Patrón compartido para pantallas de práctica

Para respiración, meditación, sonidos, sueño (y ayuno como temporizador):

1. **Meta** (`BIENESTAR · CALMA`, gris) → **titular** Grandis grande en caja
   baja con la palabra del hub ("Respira", "Sonidos") → una línea de para qué.
2. **Una tarjeta amarilla**: la sesión propuesta ahora (nombre llano · min ·
   estrella oficial) que empieza con un toque.
3. **Filas** para las alternativas: nombre por intención · duración · →. Sin
   chips, sin franjas, sin íconos de color, sin sellos.
4. **Seguridad** como una fila gris "Antes de empezar" que se despliega (y,
   si hace falta, confirmación al iniciar), no una caja amarilla arriba.
5. **Reproductor**: negro plano, temporizador grande, la estrella como único
   movimiento (respeta reduced-motion), un solo botón Pausa.
6. **Final**: "Hecho. 5 min." + "Volver", sin confeti ni puntos.
7. **Escritorio**: igual que el hub — titular a la izquierda, tarjeta a la
   derecha, filas debajo, ancho máximo ≈680.

---

## 3. Veredictos

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
El hub se entiende en 3 s; las pantallas a las que lleva, no. Lo que falta:
que cada pantalla diga con la palabra del hub para qué es (P1-1), una sola
propuesta en lugar de catálogos de 30 botones iguales (meditación, sonidos,
sueño, hábitos), la acción arriba y no al final (ayuno, nutrición, cuerpo) y
cero jerga técnica (Hz, BOX, Wim Hof, Nidra, KSM-66).

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
El hub es la marca; las subpantallas son otro producto: franjas de color,
morados, azules y verdes, halos amarillos, puntos tipo juego, cajas con
borde y amarillo en todas partes. Falta aplicar el patrón 2.b a las once
pantallas y unificar el ancho de columna en escritorio.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
El tema claro no está listo: avisos de seguridad ilegibles, barra lateral
ilegible y un congelamiento de hasta 30 s. Hay targets de 20 px y textos
cortados. En producto, la confianza está en juego: hercios inventados,
dosis precargadas, IMC en rojo, afirmaciones fisiológicas sin respaldo.
Primero los 9 P0, luego los P1-9, 10, 14, 15 y 16.
