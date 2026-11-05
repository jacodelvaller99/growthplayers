# Ronda 2 · Núcleo — evaluación del panel UX

Fecha: 2026-11-04 · Fuente: capturas locales con las correcciones de la ronda 1
(`docs/ux/capturas-ronda-2.md`) · Vara: `docs/ux/ESTANDAR_UX.md` · Base:
`docs/ux/ronda-1-nucleo.md`.

Alcance: `/comando`, `/checkin`, `/mentor`, `/progreso`, `/yo`, `/norte`,
`/programas`, `/module/modulo-1`, `/lesson/m1-5`, `/mentoria` + chrome global
(barra lateral, barra de pestañas móvil, botón flotante de ayuda).

Método: igual que en la ronda 1. La tabla da la **nota más baja** de los tres
evaluadores por criterio. El código se leyó solo para confirmar una corrección
o ubicar el archivo.

Nota sobre las capturas: el tema claro solo se capturó en escritorio. La
barra de pestañas móvil en claro (parte de P0-1) no se pudo verificar.

---

## 1. Tabla resumen por ruta

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | R1 | ¿Aprueba? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /comando | 4 | 3 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3,42 | 2,58 | **No** |
| /checkin | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 3,58 | 2,83 | Sí |
| /mentor | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3,33 | 2,25 | **No** |
| /progreso | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3,50 | 2,08 | Sí* |
| /yo | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 3,67 | 2,83 | Sí |
| /norte | 4 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3,50 | 2,75 | Sí* |
| /programas | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3,50 | 2,50 | Sí* |
| /module/modulo-1 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,58 | 2,58 | Sí |
| /lesson/m1-5 | 4 | 3 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3,33 | 2,00 | **No** |
| /mentoria | 4 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 3,50 | 1,75 | Sí |

\* Aprueba por la rúbrica, pero tiene un P1 abierto (N-2 en Progreso y
Programa; P1-21 por verificar en Norte). Por el estándar, los P1 se corrigen
antes de publicar, así que esa aprobación depende del arreglo.

Lectura rápida: el salto es grande. La media del núcleo pasa de 2,42 a 3,49.
Mentoría (de 1,75 a 3,50) y Lección (de 2,00 a 3,33) ya están en el sistema
nuevo. El tema claro ya no rompe la navegación. El botón flotante es neutro y
tiene nombre. Siete de diez rutas aprueban; tres de ellas con un P1 pendiente.
Quedan tres sin aprobar. **Hoy** contradice su propio texto. **Norman** gasta
el oro en etiquetas. En **Lección**, el video no cargó en móvil y el campo de
notas sigue sin parecer un campo.

---

## 2. Estado de los hallazgos de la ronda 1

| ID | Estado | Evidencia |
|---|---|---|
| P0-1 Nav ilegible en claro | **RESUELTO** (escritorio) | Barra lateral clara legible en las 10 rutas. La barra móvil en claro no se capturó: verificar. |
| P0-2 Video sin salida | **RESUELTO** | Escritorio: el reproductor carga y aparece «¿No arranca? Abrir el video ↗». Móvil: «El video no cargó aquí.» + «Abrir el video ↗». La salida existe, pero ver N-3. |
| P0-3 Mentoría sin volver | **RESUELTO** | Flecha arriba a la izquierda en móvil y escritorio. |
| P1-1 Botón flotante | **PARCIAL** → baja a P2 | Ahora es neutro (`graphite`, ícono `ash`), tiene `accessibilityLabel` y el contenido deja 96 px de margen al final. Mientras se desplaza en móvil, aún tapa valores alineados a la derecha (ver N-5). |
| P1-2 Dos arquitecturas de nav | **RESUELTO** | Barra lateral: Hoy · Check-in · Norman · Progreso · Yo, sin rótulos de grupo. Queda una diferencia menor: Check-in solo está en escritorio (P3-N1). |
| P1-3 Sin pestaña activa / sin volver | **PARCIAL** | Norte, Programa, Módulo, Mentoría y Lección tienen flecha. En escritorio, «YO» queda activa. En móvil, ninguna pestaña se marca (aceptable con la flecha; se deja en P3). |
| P1-4 «lectura» | **RESUELTO** | «Hoy solo te pido una cosa: cuéntame cómo llegas.» |
| P1-5 Jerga en siguiente paso | **RESUELTO** (copy) | «Cierra lo que dijiste que harías / Le dijiste a Norman que harías algo…». Abre N-1. |
| P1-6 Escala 1–5 sin anclas | **RESUELTO** | «1 = nada» / «5 = mucha», con «ELIGE UNO» justo encima. |
| P1-7 Escala ×2 en Progreso | **RESUELTO** | «5 de 5 · 2,4 más que la semana pasada». |
| P1-8 «Retoma hoy» el día 1 | **RESUELTO** | «Hoy cuenta.» + tarjeta «Hacer mi check-in · 2 MIN». |
| P1-9 Calendario sin días / jerga | **RESUELTO** | L M M J V S D, «El cuadro con borde es hoy.», sin PUNTAJE, «Módulos · 0 de 6 terminados». Abre N-2. |
| P1-10 Cuadros vacíos invisibles en claro | **RESUELTO** | Cuadros con borde visible en claro. |
| P1-11 Aviso IA a 9 px | **RESUELTO** | 12 px, fijo sobre el campo de escribir, visible en móvil. |
| P1-12 Jerga + dos voces de Norman | **RESUELTO** | «Haz tu check-in y te digo qué hacer hoy.» en el mismo estilo. |
| P1-13 Contadores contradictorios | **RESUELTO** (dentro de Programa) | «MÓDULO 1 DE 9», «LECCIÓN 5 DE 7», «Vas en la 5 de 7», «Bienvenida · Terminado». La contradicción ahora es con Progreso (N-2). |
| P1-14 Jerga de curso | **PARCIAL** | «TU PROGRAMA · 90 DÍAS» y «Se abre en Skool ↗» están hechos. Las filas siguen sin subtítulo sencillo («Intro al 4to Nivel de Consciencia», «Pontífice: Estado de Flow»). Baja a P2. |
| P1-15 «Seguir donde iba» bajo el pliegue | **RESUELTO** | Botón negro dentro del bloque amarillo + «Te faltan 3 lecciones…». |
| P1-16 Ritual de 3 pasos | **RESUELTO** | Un paso opcional: «Empezar la lección» / «Respirar antes (30 s)». Sin la frase del sistema nervioso. |
| P1-17 Marca fuera de sistema en Lección | **RESUELTO** | Cero `Fonts.mono`. Tarjeta de tarea neutra. Los deshabilitados son grises y llevan la pista «Guarda tu tarea para marcar…». |
| P1-18 Mentoría en sistema viejo | **RESUELTO** | `Pantalla`: meta «MENTORÍA · SEMANA 1 DE 12», titular, UNA tarjeta oro, filas. Sin ruta de 12 semanas duplicada; «Tu programa →» enlaza. |
| P1-19 Deshabilitado ilegible en claro | **RESUELTO** | «Que Norman arme el plan con tus notas» + «Escribe una nota primero.» en texto neutro. Ver N-8. |
| P1-20 Interruptor teal | **RESUELTO** | `activeThumbColor: palette.ink` + track oro (`yo.tsx:410`). |
| P1-21 Estrella amarilla en claro | **PARCIAL / verificar** | El código es correcto (`useDecorStarColor` → `starOnLight #CFCFCF`, `norte.tsx:95`), pero en la captura `/norte desktop-light` la estrella aún se ve amarilla. Recapturar. Si sigue amarilla, el `mode` del hook no está llegando. |
| P2-1 FOUT | Sin evidencia | No se ve en estas capturas. |
| P2-2 Oro en fecha/día | **RESUELTO** | Fecha y «DÍA 1 / 90» en gris. |
| P2-3 «Onboarding» | **RESUELTO** | «Semana 1 de 12 · Empezar». |
| P2-4 Texto del usuario en oro / «MODO» | **PARCIAL** | «Cómo te acompaña Norman · adaptativo» está bien. No hay mensaje del usuario en la captura para verificar la burbuja. |
| P2-5 Chat abre cortado | **RESUELTO** | En móvil, el primer contenido se ve completo. |
| P2-6 Yo: encabezados oro / ✓ / pie 9 px | **RESUELTO** | Encabezados en gris, «GUARDAR PERFIL» sin palomita, pie legible. |
| P2-7 Norte sin explicación / EDITAR | **RESUELTO** | «Lo que quieres lograr en estos 90 días.» + `hitSlop={12}`. |
| P2-8 Programa subtítulos / flechas | **RESUELTO** | Subtítulos legibles y «›» en todas las filas. |
| P2-9 Módulo sin flecha / segmentos | **RESUELTO** | «›» en las filas y segmento vacío con contorno. |
| P2-10 Notas sin campo / volver en caja | **PARCIAL** | La flecha ya va desnuda. «TUS NOTAS» sigue como texto suelto, sin campo (N-4). |
| P2-11 Ancho de Lección | **RESUELTO** | Columna igual a la de Módulo. |
| P2-12 Check-in todo amarillo | **SIGUE** (decisión del dueño) | Sin cambios. A y C lo aceptan como ritual; B mantiene la objeción. |
| P2-13 SIGUIENTE deshabilitado | **SIGUE** | Contorno mostaza con texto amarillo pálido: sigue pareciendo roto. |
| P2-14 Plan de acción partido | **RESUELTO** | Ya no hay botón al lado. |
| P3-1 Title Case / Mindset | **SIGUE** | «Crea tu Nueva Identidad», «Resultados de Trabajar tu Mindset», «Detecta Tus Creencias». |
| P3-2 Viñetas estrella | **RESUELTO** | Rayas. |
| P3-3 Juan / Juan Jacobo | **PARCIAL** | Hoy y Yo dicen «Juan.». La tarjeta de la barra lateral dice «Juan Jacobo» (aceptable ahí). |
| P3-4 «TÚ» | **RESUELTO** | «que tú te comprometes». |
| P3-5 Docs Inter | No verificado | Fuera de captura. |
| P3-6 «YO» recortado | **RESUELTO** | Con 5 ítems, la barra lateral cabe entera. |

---

## 3. Hallazgos nuevos (P0 → P3)

### P0 · Bloqueantes

Ninguno.

### P1 · Graves

**N-1 · P1 · /comando · todas las variantes**
El texto dice «Hoy solo te pido una cosa: cuéntame cómo llegas.», pero la
tarjeta oro dice «Cierra lo que dijiste que harías». El check-in de hoy no está
hecho (Progreso muestra «Hacer mi check-in»). La pantalla pide dos cosas
distintas y la amarilla no es la que el texto anuncia (Krug, una decisión por
pantalla; Nielsen #4 consistencia).
*Fix:* en `selectTurno`, si no hay check-in hoy, el turno es `/checkin` aunque
exista una narrativa del coach. La tarjeta sería «CHECK-IN · 2 MIN / ¿Cómo
llegas hoy?», que `comando.tsx:392–397` ya sabe pintar. La narrativa pasa a
ser la siguiente tarjeta después del check-in.
*Archivo:* `lib/turnoLogic.ts:234` (`selectTurno`).

**N-2 · P1 · /progreso ↔ /programas · todas**
Progreso dice «MÓDULOS · 0 de 6 terminados». Programa dice «MÓDULO 1 DE 9» y
«Bienvenida · Terminado». Son dos cuentas distintas del mismo camino: Progreso
cuenta solo los módulos con `arquetipo`, y además ignora que Bienvenida ya está
terminado.
*Fix:* que Progreso cuente el mismo conjunto que Programa (`numerados`) →
«1 de 9 terminados», o la cuenta que use Programa.
*Archivo:* `app/(tabs)/progreso.tsx:55–118`. La lista de referencia está en
`app/(tabs)/programas.tsx:183`.

**N-3 · P1 · /lesson/m1-5 · móvil**
En móvil el video cayó al respaldo («El video no cargó aquí.»), mientras en
escritorio el mismo embed sí carga. La salida existe (P0-2 está resuelto),
pero el contenido principal no se ve dentro de la app en el dispositivo
principal.
*Fix:* verificar si el embed falla de verdad a 390 px o si 8 s no alcanzan en
3G/4G. Mientras el iframe no avise de error, mostrar el reproductor y el
enlace a la vez en lugar de sustituirlo. Subir `WEB_LOAD_TIMEOUT_MS` a 15 s.
*Archivo:* `components/SkoolVideo.tsx:20, 39`.

### P2 · Mejorables

- **N-4 · /lesson · todas** — «TUS NOTAS» sigue sin campo visible (la
  pregunta parece texto, no un lugar donde escribir). Usar el mismo estilo de
  campo que «Yo soy…». *Archivo:* `app/lesson/[id].tsx:~995`.
- **N-5 · Chrome · móvil** — El botón flotante tapa valores alineados a la
  derecha mientras se desplaza. En Hoy se lee «Crea tu Nueva Identid»; también
  tapa la última columna del calendario, «hacer esta semana» en Mentoría, la
  barra de progreso de Programa y la flecha de una fila de Módulo. Ocultarlo
  al desplazar hacia abajo (aparece al subir), o bajarlo a 40 px y alinearlo
  con el gutter. *Archivo:* `components/tour/TourButton.tsx`.
- **N-6 · /mentor · todas** — El oro no se gana: «NORMAN · MENTOR IA»,
  «DEMOSTRACIÓN», «CHATS», «QUÉ VE NORMAN» y la flecha de enviar, todos en oro
  a la vez. Solo la flecha de enviar (la acción) en oro; el resto en
  `--c-text-2`. Mantener «DEMOSTRACIÓN» visible, en gris. *Archivo:*
  `app/(tabs)/mentor.tsx`.
- **N-7 · /mentor · móvil** — «NORMAN · MENTOR IA» se parte en dos líneas y
  choca con «DEMOSTRACIÓN · CHATS». Meta corto («NORMAN · IA») o «CHATS» como
  ícono. *Archivo:* `app/(tabs)/mentor.tsx`.
- **N-8 · /mentoria · todas** — «Que Norman arme el plan con tus notas» no
  parece tocable ni deshabilitado: es texto plano con una nota debajo. Darle la
  forma de botón secundario (contorno) deshabilitado, con la pista debajo.
  *Archivo:* `app/mentoria/index.tsx`.
- **N-9 · /mentoria · escritorio** — El titular «Tu sesión / de / esta /
  semana.» se parte en 4 líneas, una palabra por línea. La columna del texto es
  demasiado estrecha frente a la tarjeta. Dar más ancho a la columna del
  titular o bajar un paso la escala en escritorio. *Archivo:*
  `components/pantalla.tsx` (hero de escritorio) / `app/mentoria/index.tsx`.
- **N-10 · /mentoria · todas** — La etiqueta de la tarjeta dice «EMPEZAR ·
  4 nov – 10 nov»: «Empezar» es el nombre de la semana, pero se lee como una
  orden que compite con «Escribir notas de la sesión». Usar «SEMANA 1 · 4–10
  nov». *Archivo:* `app/mentoria/index.tsx`.
- **N-11 · /progreso · todas** — «DÍA 1 / 90» junto a «2,4 más que la semana
  pasada»: no hay semana pasada el día 1. Si los datos de la demo son
  anteriores al inicio, ocultar la comparación hasta que existan 7 días
  reales. *Archivo:* `app/(tabs)/progreso.tsx:80–89`.
- **N-12 · /module · todas** — 5 segmentos de progreso para 7 lecciones: el
  usuario no puede contar lo que falta en la barra. Un segmento por lección.
  *Archivo:* `app/module/[id].tsx`.
- **P1-14 rebajado · /programas** — Subtítulo sencillo en las filas de módulos
  con nombre de curso («Intro al 4to Nivel de Consciencia» → «Cómo funciona tu
  atención», por ejemplo). *Archivo:* `data/modules.ts`.

### P3 · Pulido

- **P3-N1 · Chrome** — Check-in es destino en la barra lateral, pero no en la
  barra móvil. Aceptable (en móvil se entra desde Hoy), pero conviene
  documentarlo.
- **P3-N2 · /mentor** — «Ordena mi dia» → «Ordena mi día».
- **P3-N3 · /lesson** — «LECCIÓN 05» → «LECCIÓN 5» (los ceros a la izquierda
  son de máquina).
- **P3-N4 · /norte, /programas · móvil** — Marcar «YO» como pestaña activa
  (resto de P1-3).

---

## 4. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
El usuario nuevo ya no se pierde: todas las pantallas secundarias tienen
salida, el check-in dice qué es 1 y qué es 5, y Progreso le dice qué hacer el
día 1. Pero la primera pantalla de la app le pide dos cosas («cuéntame cómo
llegas» y «Cierra lo que dijiste»), y el progreso del curso tiene dos números
según dónde mire (0 de 6 contra 1 de 9). Falta exactamente: **N-1, N-2**; y de
P2, N-8 y N-10.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Lección y Mentoría por fin hablan la misma lengua que el resto: sin Space
Mono, sin tarjetas con borde, una sola tarjeta oro por pantalla. El
interruptor y el botón flotante ya están en la marca. Falta: **N-6** (Norman
con cinco oros), **P1-21** (recapturar Norte en claro y confirmar el gris
#CFCFCF), **N-9** (titular de Mentoría partido palabra a palabra), **N-12** y
el barrido de Title Case (**P3-1**). P2-12 (check-in todo amarillo) queda a
decisión del dueño; no bloquea mi voto.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Lo grave de la ronda 1 está cerrado: la navegación es legible en claro, el aviso
de IA mide 12 px y está fijo, el ritual es un paso opcional y el video tiene
salida. Para darlo por bueno falta: **N-3** (que la lección se pueda ver en el
móvil, no solo abrir fuera), **N-5** (el botón flotante sigue tapando texto en
móvil mientras se desplaza), **P2-13** (SIGUIENTE deshabilitado que parece
roto) y **N-4** (campo de notas sin significante). Además, verificar la barra
móvil en tema claro, que no se capturó.
