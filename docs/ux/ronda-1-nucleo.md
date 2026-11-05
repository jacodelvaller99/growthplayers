# Ronda 1 · Núcleo — evaluación del panel UX

Fecha: 2026-11-04 · Fuente: capturas de producción listadas en
`docs/ux/capturas-ronda-1.md` · Vara: `docs/ux/ESTANDAR_UX.md`.

Alcance: `/comando` (Hoy), `/checkin`, `/mentor` (Norman), `/progreso`, `/yo`,
`/norte`, `/programas`, `/module/modulo-1`, `/lesson/m1-5`, `/mentoria`. Todas
las variantes (escritorio/móvil, oscuro/claro, con scroll, modal del ritual).

Panel: **A** Investigación y experiencia (Nielsen/Norman/Krug) · **B** Diseño
visual y marca (Refactoring UI/Rams/manual Polaris) · **C** Accesibilidad y
producto (WCAG 2.2/HIG/Fogg). Cada uno puntuó los 12 criterios; la tabla
muestra la **nota más baja** de los tres por criterio.

Nota de método: el código fuente se leyó solo para ubicar el archivo a
cambiar o desambiguar una captura. Se juzga lo que el usuario VE en producción.
Donde el código ya corrige algo que la captura muestra roto, se dice.

---

## 1. Tabla resumen por ruta

Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado ·
6 Consistencia · 7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas ·
11 Emoción · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Prom. | ¿Aprueba? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /comando | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 2 | 3 | 1 | 3 | 3 | 2,58 | No |
| /checkin | 4 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 2,83 | No |
| /mentor | 3 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 2 | 2 | 3 | 2 | 2,25 | No |
| /progreso | 2 | 1 | 3 | 1 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 2 | 2,08 | No |
| /yo | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 4 | 2,83 | No |
| /norte | 2 | 3 | 4 | 3 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 3 | 2,75 | No |
| /programas | 3 | 4 | 3 | 2 | 2 | 2 | 3 | 2 | 2 | 2 | 3 | 2 | 2,50 | No |
| /module/modulo-1 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 2 | 2 | 2 | 3 | 3 | 2,58 | No |
| /lesson/m1-5 | 3 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 3 | 2 | 2 | 2 | 2,00 | No |
| /mentoria | 2 | 2 | 1 | 2 | 3 | 1 | 1 | 1 | 2 | 1 | 2 | 3 | 1,75 | No |

Lectura rápida: el rediseño (gramática meta → titular → una acción → filas)
ya funciona en Hoy, Check-in, Yo, Norte y Programa — la estructura es buena.
Lo que tumba la nota es transversal: **el tema claro rompe la navegación**,
el **botón flotante amarillo** tapa contenido en todas las pantallas, y
**Mentoría y Lección siguen en el sistema visual anterior** (tarjetas con
borde, Space Mono, chips, oro por todas partes). Ninguna pantalla aprueba;
cuatro (Check-in, Yo, Norte, Hoy) quedan a uno o dos arreglos de hacerlo.

---

## 2. Hallazgos (P0 → P3)

Formato: **ID · Severidad · Ruta(s) · Variante(s)** — qué pasa · por qué
importa · fix · archivo.

### P0 · Bloqueantes

**P0-1 · Todas las rutas · escritorio-claro y móvil-claro**
La barra lateral (escritorio) y la barra de pestañas (móvil) se ven como un
velo gris oscuro con las etiquetas casi invisibles (HOY, CHECK-IN, NORMAN,
PROGRESO, YO). Solo el interruptor CLIENTE | ADMIN se lee. En móvil, la
pestaña activa amarilla es lo único legible.
*Por qué:* la navegación principal es ilegible en un tema → P0 por el
estándar ("ilegible en un tema"); WCAG 1.4.3 (contraste muy por debajo de 4,5:1).
*Fix:* en web, quitar el `BlurView` (o como mínimo en tema claro) y dar fondo
sólido: barra lateral `palette.graphite`, barra de pestañas `palette.black`
sin `alpha()`. Verificar que `--c-text-3`/`smoke` sobre ese fondo dé ≥4,5:1.
La causa probable es la combinación `BlurView tint="light"` de expo-blur en
web + `alpha(cv(...))` → `color-mix()` sobre una variable CSS.
*Archivos:* `components/DesktopSidebar.tsx` (BlurView línea ~105, `sidebar.backgroundColor` línea ~228), `app/(tabs)/_layout.tsx` (`tabBarStyle.backgroundColor` y `tabBarBackground`, líneas ~76–90).

**P0-2 · /lesson/m1-5 · todas las variantes**
El reproductor muestra un anillo de carga permanente: en capturas tomadas con
más de un minuto de diferencia sigue girando. No hay póster, ni mensaje, ni
salida. La lección es el contenido; sin video no hay lección.
*Por qué:* impide usar (Nielsen #1 visibilidad del estado, #9 recuperarse de
errores).
*Fix:* en la rama web de `SkoolVideo`, poner un tiempo límite (8–10 s) tras el
cual se reemplaza el iframe por: titular «El video no cargó aquí.» + botón
secundario «Abrir el video →» (enlace a Skool/Vimeo). Mientras carga, texto
«Cargando el video…» bajo el anillo. Revisar por qué el embed no arranca
(URL Vimeo / permisos de dominio del embed).
*Archivo:* `components/SkoolVideo.tsx` (rama web, antes de la línea ~60).

**P0-3 · /mentoria · móvil (oscuro y claro)**
No hay flecha de volver ni barra de pestañas. En la PWA instalada (sin botón
atrás del navegador) el usuario queda atrapado; solo sale por el botón
flotante.
*Por qué:* callejón sin salida (Nielsen #3 control y libertad).
*Fix:* `AppHeader` con `onBack={() => router.back()}` y fallback a
`/(tabs)/comando`; o mejor, migrar la pantalla a `Pantalla` con la misma
flecha que `/module` (ver P1-14).
*Archivo:* `app/mentoria/index.tsx` (línea ~430).

### P1 · Graves

**P1-1 · Todas · móvil y escritorio** — Botón flotante amarillo (✦) tapa
contenido: «Onboarding →» en Hoy, «desbloqueados →» en Progreso, «Después:
Emociones…» en Módulo, el último cuadro del calendario, la fila «Descargar
todo» en Yo. Además es un segundo amarillo que compite con la acción principal
(Von Restorff, «el amarillo se gana»). Sin etiqueta visible: nadie sabe qué hace.
*Fix:* quitarlo de las pantallas que ya tienen acción amarilla; donde se quede,
dar `paddingBottom` al contenido = alto del botón + 16 px y convertirlo en
botón neutro (`palette.graphite`, ícono `goldText`) con `accessibilityLabel`
«Preguntarle a Norman». *Archivo:* el componente montado en `app/_layout.tsx`
(botón global de Norman) + `components/pantalla.tsx` (padding inferior).

**P1-2 · Todas (navegación) · móvil vs escritorio** — Dos arquitecturas
distintas: escritorio muestra 9 destinos (Hoy, Check-in, Mi Norte, Programa,
Mentoría, Progreso, Norman, Bienestar, Yo) con rótulos de grupo («COMANDO»,
«PROTOCOLO», «NORMAN IA», «RECUPERACIÓN»); móvil muestra 4 (Hoy · Norman ·
Progreso · Yo). Los rótulos de grupo son jerga y de ~9 px en gris muy bajo.
*Fix:* que la barra lateral replique las 4 pestañas como primer bloque y deje
el resto bajo un único «Más» o dentro de Yo; borrar los rótulos de grupo.
*Archivo:* `components/DesktopSidebar.tsx`.

**P1-3 · /norte, /programas · móvil** — Ninguna pestaña activa y sin flecha
de volver: el usuario no sabe dónde está ni cómo regresar (Nielsen #1).
*Fix:* flecha de volver arriba a la izquierda en `Pantalla` cuando la ruta no
es una de las 4 pestañas; o marcar «YO» como activa (ambas se abren desde Yo).
*Archivos:* `components/pantalla.tsx`, `app/(tabs)/_layout.tsx`.

**P1-4 · /comando · todas** — «Lo único que pide hoy es una lectura honesta
de cómo entras.» Usa «lectura», palabra vetada por el estándar.
*Fix:* «Hoy solo te pido una cosa: cuéntame cómo llegas.»
*Archivo:* `lib/narrativeLogic.ts:174`.

**P1-5 · /comando · escritorio-oscuro-scroll** — La tarjeta «TU SIGUIENTE
PASO» muestra «Hablar con norman» (minúscula) y el detalle «…consume atención
en segundo plano… sácalo del limbo» a un usuario del día 1. Jerga + tono de
reproche. *Nota:* el commit `43e8b97` ya capitaliza «Norman»
(`comando.tsx:427`); verificar que está desplegado.
*Fix del copy:* titular «Cierra lo que dijiste que harías»; detalle «Le dijiste
a Norman que harías algo y sigue abierto. Termínalo o cámbialo.»
*Archivo:* `lib/coachIntelligenceLogic.ts:584`.

**P1-6 · /checkin · todas** — La escala 1–5 no dice qué es 1 y qué es 5 hasta
que eliges (la palabra aparece después en «ELIGE UNO»). Elegir a ciegas (Norman:
mapeo; Nielsen #6 reconocer antes que recordar).
*Fix:* bajo los botones, en `caption`, «1 = vacío» a la izquierda y «5 = a
tope» a la derecha (palabras de `paso.words[0]` y `[4]`). Mover «ELIGE UNO»
justo encima de los botones (hoy flota a media pantalla en móvil y lejos a la
derecha en escritorio). *Archivo:* `app/checkin.tsx` (~líneas 470–520).

**P1-7 · /checkin + /progreso · cruzado** — El check-in pregunta en 1–5 y
Progreso muestra «10,0 de 10 · +4,9» (se guarda ×2). El usuario nunca eligió
un 10. El «+4,9» no dice contra qué.
*Fix:* mostrar en la escala que el usuario usó: «5 de 5 · subió 2,5 vs la
semana anterior». *Archivo:* `app/(tabs)/progreso.tsx:80–89`.

**P1-8 · /progreso · todas** — Titular «Retoma hoy.» con «DÍA 1 / 90»: le
dice que retome a alguien que acaba de llegar (culpa; contradice «busca el
estado, no el resultado»). Y la pantalla no tiene acción: el titular ordena
algo pero no hay botón.
*Fix:* si `protocolDay <= 2` o no hay check-in hoy: titular «Hoy cuenta.» y
una `TarjetaOro` «Hacer mi check-in» → `/checkin`. Si ya lo hizo, sin tarjeta.
*Archivo:* `app/(tabs)/progreso.tsx:95–101`.

**P1-9 · /progreso · todas** — El calendario de 42 cuadros no tiene días de
la semana ni fecha; un niño de 5 años no sabe qué cuadro es hoy. «PUNTAJE 368
· INICIANDO» y «ARQUETIPOS 0 de 6 desbloqueados» son jerga y gamificación
(«desbloqueados» es lenguaje de videojuego, anti-referencia de PRODUCT.md).
*Fix:* fila de iniciales L M M J V S D sobre el calendario y «hoy» debajo del
cuadro con borde. Quitar «PUNTAJE» de esta pantalla (o renombrar «Tu nivel» con
una línea que diga qué mide). «ARQUETIPOS» → «MÓDULOS · 0 de 6 terminados».
*Archivo:* `app/(tabs)/progreso.tsx:104–115` y el componente `Calendario`.

**P1-10 · /progreso · claro** — Los cuadros vacíos (#EEE sobre #E8E8E8) son
invisibles: contraste de componente < 3:1 (WCAG 1.4.11).
*Fix:* cuadro vacío `palette.lineHard` (o `--c-surface-3` del tema claro
oscurecido a ≥3:1 contra el fondo). *Archivo:* `Calendario` en `app/(tabs)/progreso.tsx`.

**P1-11 · /mentor · todas** — El aviso «Norman es un mentor de IA. No sustituye
atención médica ni psicológica.» va a ~9 px en gris bajo, y en móvil desaparece
porque el chat abre ya desplazado al final (no se ve la cabecera). La
identificación de la IA es el criterio 12 y la guía de seguridad del proyecto.
*Fix:* el aviso a `caption` (12 px, `--c-text-2`) fijo sobre el campo de
escribir, no en la cabecera que se va con el scroll. *Archivo:* `app/(tabs)/mentor.tsx`.

**P1-12 · /mentor · todas** — «Estoy leyendo tu protocolo. Haz check-in y te
devuelvo una instrucción operativa para hoy.» Jerga («protocolo»,
«instrucción operativa»). Además el primer mensaje va en Grandis grande y los
siguientes en Source Sans pequeño: dos voces para el mismo Norman.
*Fix:* «Haz tu check-in y te digo qué hacer hoy.» en el mismo estilo `body`
que el resto de mensajes de Norman. *Archivo:* `app/(tabs)/mentor.tsx`.

**P1-13 · /programas · todas** — Contadores que se contradicen: tarjeta
«LECCIÓN 5 DE 7» vs línea de tiempo «Estás aquí · 4 de 7»; «MÓDULO 1 DE 11»
pero la lista pone «Onboarding · Completado» antes (¿entonces es el 2?).
*Fix:* una sola cuenta: tarjeta «LECCIÓN 5 DE 7», línea «Vas en la 5 de 7»;
excluir Onboarding de la numeración o numerarlo como 0 y mostrar «MÓDULO 1 DE 10».
*Archivo:* `app/(tabs)/programas.tsx`.

**P1-14 · /programas · todas** — Jerga de curso: «PROTOCOLO SOBERANO»,
«Pontífice», «Logrología», «Mercader», «Intro al 4to Nivel de Consciencia»,
«En el classroom» (inglés y no dice que abre Skool).
*Fix:* meta «TU PROGRAMA · 90 DÍAS»; «En el classroom» → «Se abre en Skool ↗».
Los nombres de módulo pueden quedarse (son del curso) pero con su subtítulo
sencillo en la fila («Pontífice · Trabajar en flow»). *Archivo:*
`app/(tabs)/programas.tsx:211`, `data/modules.ts`.

**P1-15 · /module/modulo-1 · móvil** — «SEGUIR DONDE IBA» queda bajo el
pliegue; la primera pantalla solo muestra lecciones vistas. «Al cerrarlo
integras el Guerrero.» no se entiende.
*Fix:* subir el botón al bloque amarillo (debajo de la barra de progreso) o
fijarlo abajo. Copy: «Te faltan 3 lecciones para terminar este módulo.»
*Archivos:* `app/module/[id].tsx`, `app/(tabs)/programas.tsx:46`.

**P1-16 · /lesson/m1-5 · todas** — Antes de cada lección no completada salta
un ritual de 3 pasos (Respira → Intención → Compromiso). Fricción alta antes
del contenido (Fogg: capacidad), y promete «Tu sistema nervioso entra en modo
aprendizaje» (claim sin evidencia, criterio 12).
*Fix:* un solo paso opcional, solo la primera lección del día; botón principal
«Empezar la lección», secundario «Respirar antes (30 s)». Quitar la frase del
sistema nervioso. *Archivo:* `app/lesson/[id].tsx:214–300, 741`.

**P1-17 · /lesson/m1-5 · todas** — Marca fuera de sistema: Space Mono en
«MÓDULO 1 · GUERRERO», «RITUAL DE ENFOQUE», «Saltar ritual»; titular de la
lección en Arial mientras carga la fuente (se ve en el modal). Tres amarillos
compiten: tarjeta «TU TAREA», «GUARDAR TAREA» y «MARCAR COMO VISTA» (estos dos
deshabilitados en mostaza sucio, que parecen rotos).
*Fix:* `Fonts.mono` → `Fonts.display`/`Source Sans` (17 usos en el archivo);
tarjeta de tarea en `palette.graphite` con borde `lineSoft`, oro solo para el
botón que está activo; los deshabilitados en `palette.charcoal` con texto
`--c-text-3`. *Archivo:* `app/lesson/[id].tsx` (estilos 330–1610).

**P1-18 · /mentoria · todas** — Pantalla entera en el sistema anterior:
tarjetas con borde, chip «SEMANA 1 DE 12», «AHORA», «SEM 1 / SEM 2», Space Mono,
íconos, cabecera con logo distinta a todas las demás (no sigue meta → titular).
Repite la lista de módulos de Programa (Guerrero, Emociones…) con fechas: el
usuario ve el mismo camino en dos sitios y no sabe cuál manda. Tres acciones
compiten (Generar con Norman · + · Guardar nota). «Tu Navegador registra…»
es jerga interna.
*Fix:* rehacer con `Pantalla`: meta «MENTORÍA · SEMANA 1 DE 12», titular «Tu
sesión de esta semana.», UNA acción («Escribir notas de la sesión»), y filas
(Plan de acción · Próxima sesión · Semanas). Quitar la ruta de 12 semanas
duplicada (enlazar a Programa). «Tu Navegador» → «Tu mentor». *Archivo:*
`app/mentoria/index.tsx`.

**P1-19 · /mentoria · claro** — «GENERAR CON NORMAN» (deshabilitado) queda
texto amarillo pálido sobre amarillo pálido: ilegible. Aunque WCAG exime los
deshabilitados, el usuario no puede leer qué hace el botón.
*Fix:* deshabilitado = `palette.charcoal` + texto `--c-text-3` + línea
«Escribe una nota primero». *Archivo:* `app/mentoria/index.tsx`.

**P1-20 · /yo · todas** — Los interruptores tienen la perilla verde azulado
(teal por defecto de react-native-web, que ignora `thumbColor`). Color fuera
de la marca.
*Fix:* añadir `activeThumbColor={palette.ink}` (prop de RN-web) y
`{...{ thumbColor }}` para nativo. *Archivo:* `app/(tabs)/yo.tsx:320–334`.

**P1-21 · /norte · claro** — La estrella grande y las viñetas-estrella van en
amarillo sobre gris claro; el manual pide #CFCFCF en temas claros.
*Fix:* `color={mode === 'light' ? '#CFCFCF' (token) : palette.gold}` — crear
token `palette.starMuted`. *Archivo:* `app/(tabs)/norte.tsx`.

### P2 · Mejorables

- **P2-1 · /comando, /lesson · primera carga** — Titulares en Arial antes de
  que cargue Grandis (FOUT). `font-display: block` corto o precargar
  `GrandisExtended-Bold` con `<link rel="preload">`. *Archivo:* `app/+html.tsx`.
- **P2-2 · /comando · todas** — Oro en exceso: fecha, «DÍA 1/90», tarjeta,
  botón flotante y nav activa. Fecha y día en `--c-text-2`; oro solo en la
  tarjeta. *Archivo:* `components/pantalla.tsx` (meta/metaRight).
- **P2-3 · /comando · todas** — «Semana 1 de 12 · Onboarding»: inglés.
  → «Semana 1 de 12 · Empezar». *Archivo:* `data/mentorship.ts`.
- **P2-4 · /mentor · todas** — El texto del usuario va en oro sin burbuja;
  el oro se gasta en lo que dice el usuario. Usar `--c-text` con alineación
  derecha y fondo `palette.graphite`. «MODO · ADAPTATIVO» es jerga → «Cómo
  te acompaña Norman». *Archivo:* `app/(tabs)/mentor.tsx`.
- **P2-5 · /mentor · móvil** — Al entrar el chat ya está desplazado y el
  primer mensaje sale cortado arriba («Estoy leyendo tu…»). Dejar 16 px de
  margen o anclar el primer mensaje visible completo.
- **P2-6 · /yo · todas** — Encabezados «TU PERFIL» y «AVISOS Y DATOS» en oro:
  pasar a `--c-text-2`. El botón «GUARDAR PERFIL ✓» enseña la palomita antes de
  guardar: quitarla y mostrar «Guardado» tras éxito. Pie «Cada día a las 7:00»
  a ~9 px → 12 px. *Archivo:* `app/(tabs)/yo.tsx`.
- **P2-7 · /norte · todas** — Falta la línea que explica qué es «Mi Norte».
  Sub: «Lo que quieres lograr en estos 90 días.» «EDITAR» es texto de 11 px
  arriba a la derecha: zona táctil < 44 px; darle `hitSlop` 12.
- **P2-8 · /programas · todas** — Subtítulos de la línea de tiempo («4
  lecciones», «Completado») a ~9 px; los módulos futuros no dicen si se pueden
  abrir (sin flecha ni candado). 12 px + flecha en los abribles.
- **P2-9 · /module · todas** — Filas de lección sin significante de toque
  (sin flecha). Segmentos de progreso vacíos (mostaza sobre amarillo) < 3:1.
  Añadir «→» a las filas y segmentos vacíos en `ink` al 25 %.
- **P2-10 · /lesson · todas** — «TUS NOTAS» parece texto suelto, no un campo
  (sin borde). Darle el mismo campo que «Yo soy…». La flecha de volver va en
  caja con borde aquí y desnuda en Módulo: unificar (desnuda).
- **P2-11 · /lesson · escritorio** — El contenido ocupa todo el ancho
  (~760 px de línea en el campo de texto) mientras Módulo usa columna de
  ~420 px. Usar el mismo `maxWidth` de `Pantalla`.
- **P2-12 · /checkin · todas** — Pantalla completa amarilla: rompe «el
  amarillo se gana» (más de 1/5 de pantalla en oro, DESIGN.md «One Voice»).
  Evaluar fondo `palette.black` con la pregunta en Grandis y oro solo en el
  número elegido y «SIGUIENTE». (B lo marca; A y C lo aceptan como momento
  ritual — se deja en P2 para decisión del dueño.)
- **P2-13 · /checkin · todas** — «SIGUIENTE» deshabilitado en mostaza con
  texto amarillo: parece roto. Deshabilitado = `ink` al 15 % + texto `ink` 40 %.
- **P2-14 · /mentoria · móvil** — «PLAN DE ACCIÓN» se parte en 3 líneas al
  lado del botón. Botón debajo del titular.

### P3 · Pulido

- **P3-1 · /module** — Títulos de lección en Title Case inglés («Nunca es
  Suficiente», «Crea tu Nueva Identidad»); en español va caja de oración. Y
  «Mindset» → «mentalidad». *Archivo:* `data/modules.ts`.
- **P3-2 · /norte** — Cinco estrellas como viñetas diluyen la estrella
  oficial; usar raya o punto.
- **P3-3 · /comando vs /mentor** — El saludo dice «Juan.» y Norman dice
  «Juan Jacobo»: elegir uno (el nombre de pila).
- **P3-4 · /mentoria** — «que TÚ te comprometes»: mayúscula enfática fuera
  de tono. → «que tú te comprometes».
- **P3-5 · docs** — `DESIGN.md`/`PRODUCT.md` dicen Inter para texto; el
  estándar y la app usan Source Sans. Alinear la documentación.
- **P3-6 · Todas · escritorio** — La barra lateral recorta «YO» abajo en
  ventanas bajas en algunas capturas; confirmar que el `ScrollView` de
  `DesktopSidebar` llega al final.

### Inconsistencias entre pantallas (resumen)

1. Navegación: 9 destinos en escritorio vs 4 en móvil (P1-2); pantallas sin
   pestaña activa ni volver (P1-3, P0-3).
2. Escalas: check-in 1–5 vs progreso «de 10» (P1-7).
3. Conteos: «Módulo 1 de 11» con Onboarding antes; «Lección 5 de 7» vs «4 de 7» (P1-13).
4. Dos sistemas visuales: Hoy/Check-in/Yo/Norte/Programa/Módulo (nuevo) vs
   Lección/Mentoría (anterior: Space Mono, tarjetas con borde, chips) (P1-17, P1-18).
5. Mismo camino en dos sitios: módulos en Programa y semanas en Mentoría con
   los mismos títulos (P1-18).
6. Volver: flecha desnuda (Módulo), flecha en caja (Lección), nada (Mentoría, Norte, Programa).
7. Voz de Norman: primer mensaje en Grandis grande, resto en Source Sans (P1-12).

---

## 3. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
La gramática nueva funciona: en Hoy y en Check-in se entiende qué hacer en
menos de 3 segundos. Pero el usuario nuevo se pierde: Progreso le dice
«Retoma» el día 1 y no le da qué hacer; Programa y Mentoría le cuentan el
mismo camino con números distintos; en móvil hay pantallas sin salida. Falta:
P0-3, P1-3, P1-8, P1-9, P1-13, P1-18 y el barrido de jerga (P1-4, P1-5,
P1-12, P1-14, P1-15).

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Hoy, Norte, Yo y Programa ya parecen una sola marca: negro plano, Grandis,
mucho aire. Pero el oro no se gana: botón flotante, fechas, encabezados y
texto del usuario en amarillo; Lección y Mentoría siguen en el sistema viejo
con Space Mono; la estrella va amarilla en claro y la perilla del interruptor
es verde azulado. Falta: P1-1, P1-17, P1-18, P1-20, P1-21, P2-2, P2-12.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
El tema claro deja la navegación ilegible en todas las pantallas, el video de
la lección no carga y no ofrece salida, el aviso de IA de Norman está a 9 px y
se pierde en móvil, y el botón flotante tapa filas tocables. Para el hábito
diario (B=MAP) el check-in es fácil, pero la lección pide tres pasos de ritual
antes del contenido. Falta: P0-1, P0-2, P1-1, P1-6, P1-10, P1-11, P1-16, P1-19.
