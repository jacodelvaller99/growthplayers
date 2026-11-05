# Ronda 1 · Cuenta, salud y admin — panel evaluador

Fecha: 2026-11-04 · Fuente: capturas de producción (`docs/ux/capturas-ronda-1.md`) +
lectura de código cuando la captura era ambigua. Vara: `docs/ux/ESTANDAR_UX.md`.

Rutas: `/bienestar/internista`, `/bienestar/biometrics`, `/bienestar/comunidad`,
`/comunidad/mensajes`, `/perfil`, `/perfil/wearables`, `/perfil/apariencia`,
`/pricing`, `/admin`. Todas las variantes listadas revisadas.

Advertencias de captura: `biometrics desktop-dark` es el estado previo a cargar
(muestra "Conecta tu wearable"; el resto de variantes muestra "Mi cuerpo hoy" con
Oura). Los "mobile" son 390 px a la izquierda de una captura de 1536 px; lo gris a
la derecha no se evalúa. El cambio a tema claro congelaba la página 10–30 s, por eso
el hallazgo del chrome atenuado en claro (H-01) queda como "verificar en vivo".

---

## 1. Tabla resumen

Puntuación fusionada = la más baja de los tres expertos por criterio (0–4).
Criterios: 1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado · 6 Consistencia ·
7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas · 11 Pico-final · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Media | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar/internista | 3 | 3 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2,0 | NO APRUEBA |
| /bienestar/biometrics | 2 | 1 | 2 | 2 | 1 | 2 | 3 | 2 | 1 | 2 | 1 | 2 | 1,8 | NO APRUEBA |
| /bienestar/comunidad | 2 | 2 | 3 | 3 | 2 | 2 | 2 | 2 | 3 | 2 | 2 | 1 | 2,2 | NO APRUEBA |
| /comunidad/mensajes | 3 | 2 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 2,5 | NO APRUEBA |
| /perfil | 1 | 1 | 1 | 1 | 2 | 1 | 1 | 2 | 2 | 2 | 2 | 1 | 1,4 | NO APRUEBA |
| /perfil/wearables | 2 | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 1,8 | NO APRUEBA |
| /perfil/apariencia | 3 | 3 | 3 | 2 | 1 | 2 | 3 | 3 | 2 | 2 | 3 | 2 | 2,4 | NO APRUEBA |
| /pricing | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 3 | 2 | 3 | 2 | 1 | 2,0 | NO APRUEBA |
| /admin | 2 | 2 | 2 | 2 | 2 | 3 | 3 | 2 | 3 | 1 | 3 | 2 | 2,3 | NO APRUEBA |

Ninguna ruta del bloque aprueba (regla: ningún criterio <3 y media ≥3,5). Las más
cercanas son `/comunidad/mensajes` y `/perfil/apariencia`: arreglos baratos. La más
lejana es `/perfil`: sigue entera en la gramática vieja.

Conteo: **P0: 4 · P1: 15 · P2: 13 · P3: 5** (37 hallazgos).

---

## 2. Hallazgos

### P0 · Bloqueantes

**H-01 · Transversal (las 9 rutas) · desktop-light y admin mobile-light — chrome ilegible en claro.**
Qué: en todas las capturas en claro el sidebar de escritorio (HOY, CHECK-IN, MI NORTE…)
y la barra inferior/cabecera del admin móvil aparecen grises sobre gris; los
rótulos son casi invisibles. Solo el conmutador CLIENTE/ADMIN queda nítido.
Por qué: WCAG 1.4.3 (contraste <2:1); Nielsen #1 (dónde estoy). Estándar: "ilegible en un tema" = P0.
Fix: reproducir en vivo con `data-theme="light"`. Si es real, revisar el fondo
`alpha(palette.graphite,'cc')` y los textos `palette.muted`/`ash` del sidebar
en claro (la mezcla `color-mix` sobre `--c-surface` + capa superior no está
dando contraste); comprobar que no quede montada una capa de oscurecimiento (tour /
modal) tras el cambio de tema. Si es artefacto del congelamiento, bajar a cerrado.
Archivo: `components/DesktopSidebar.tsx` (estilo contenedor ~l.228, labels ~l.253–352);
barra admin móvil en `app/admin/_layout.tsx`.

**H-02 · /bienestar/internista · todas — markdown crudo en la respuesta.**
Qué: la respuesta se pinta con `#`, `##`, `**negritas**`, `---` y tablas `| Pilar | … |`
literales. Un usuario lee asteriscos y tuberías en una pantalla de salud.
Por qué: ilegible (P0 por estándar); destruye la credibilidad clínica justo donde
"cito mis fuentes" es la promesa (Nielsen #8, confianza).
Fix: renderizar con el `MarkdownText` que ya existe (`components/polaris.tsx:908`,
usado en `app/(tabs)/mentor.tsx`) en lugar de `<Text>{t.text}</Text>`
(`app/bienestar/internista.tsx:263`). Añadir al prompt de `buildInternistPrompt`
(`lib/internist.ts`) "sin tablas ni separadores `---`", porque las tablas no caben a 390 px.

**H-03 · /bienestar/biometrics · mobile-dark y mobile-light — palabra partida.**
Qué: el rótulo de la tarjeta se parte en "RECUPERA / CIÓN".
Por qué: texto cortado = P0 por estándar; rompe lectura (WCAG 1.4.10 reflow).
Fix: en móvil usar "Recuperación" en caja normal Source Sans o reducir tracking
del rótulo; o apilar las tres métricas en filas (gramática nueva) en vez de 3 columnas.
Archivo: `app/bienestar/biometrics.tsx:235–257`.

**H-04 · /pricing · todas — "Consulta el precio en la app" estando en la app, y el botón lleva a otro callejón.**
Qué: el plan RECOMENDADO no muestra precio y dice "Consulta el precio en la app".
El CTA amarillo "VER PRECIO Y SUSCRIBIRME" empuja a `/paywall`, que en web
responde "se gestiona en iOS/Android". Dos pantallas para no saber cuánto cuesta.
Por qué: engaña (P0: "engaña"); Nielsen #2 y #9; confianza en pagos.
Fix: mostrar el precio real o, en web, sustituir el CTA por un texto honesto
"La suscripción se activa desde la app de iOS o Android" sin botón amarillo; ocultar
"VER PRECIO" en web. Alinear con la oferta vigente (ecosistema v2, coaching 1 a 1).
Archivo: `app/pricing.tsx:225–227`.

### P1 · Graves

**H-05 · /bienestar/internista · desktop — sin titular ni acción; conversación como bloque gigante.**
La burbuja de IA ocupa todo el ancho (líneas de ~150 caracteres) y no hay medida
de lectura; la columna derecha queda vacía. Fix: `maxWidth` ~68ch para la burbuja en
escritorio, centrar el hilo. Archivo: `app/bienestar/internista.tsx` (estilos `bubbleAI`).

**H-06 · /bienestar/internista · todas — la IA no se identifica dentro de la conversación.**
La cabecera dice "Internista · Educación clínica basada en evidencia"; solo el
saludo inicial (que desaparece en cuanto hay historial) dice que es IA. "Internista"
suena a médico humano. Fix: subtítulo fijo "Asistente con IA · no es un médico" y
mantener la barra de disclaimer. Archivo: `app/bienestar/internista.tsx` (cabecera).

**H-07 · /bienestar/biometrics · todas — pantalla vacía sin salida.**
Con Oura "conectado" hay siete guiones "—" y un "Sin datos" de 11 px; la única
acción es un enlace gris "Gestionar dispositivos". El chip "⬡ Oura" no dice si está
conectado ni cuándo sincronizó. La versión pre-carga dice "Conecta tu wearable"
(contradicción entre estados). Fix: estado vacío con titular ("Tu Oura no envía datos
desde hace 7 días") y UNA tarjeta amarilla "Sincronizar ahora"; quitar las cuadrículas
de guiones. Archivo: `app/bienestar/biometrics.tsx:177–260`.

**H-08 · /bienestar/biometrics · todas — gramática vieja.**
Tarjetas con bordes, iconos de colores (corazón rojo, termómetro), aviso legal en caja
gris arriba de todo. No sigue meta → titular → una tarjeta amarilla → filas.
Fix: rehacer con la gramática de `/progreso`; aviso legal como línea pequeña al pie.
Archivo: `app/bienestar/biometrics.tsx`.

**H-09 · /bienestar/comunidad · todas — un autor llamado "Norman" publica "Hola".**
Norman es la IA. Un post firmado "Norman" sin marca de IA ni de equipo es ambiguo:
¿la IA participa en el feed?, ¿es una persona suplantando? Fix: si es cuenta del
equipo, mostrar "Equipo Polaris"; si es la IA, insignia "IA" visible; reservar el
nombre "Norman" en el registro. Archivo: `app/bienestar/comunidad.tsx` (render autor ~l.500)
+ regla en el alta de perfiles.

**H-10 · /bienestar/comunidad · todas — dos iconos de burbuja casi iguales y sin texto.**
Burbuja rellena = comentarios; burbuja contorno = mensaje privado. Además los dos
iconos de la cabecera (personas, chat) en amarillo compiten con nada. Fix: rótulos de
texto "Comentar" / "Escribir" (o quitar el DM del post) y cabecera con texto
"Círculo" / "Mensajes". Archivo: `app/bienestar/comunidad.tsx:334–345, 527–551`.

**H-11 · /comunidad/mensajes · todas — no hay forma de empezar una conversación; el único botón flotante es otra cosa.**
La pantalla no tiene acción principal. El botón amarillo flotante (✦) es "Norman te
explica esta pantalla" (tour), y por posición y color se lee como "nuevo mensaje".
Fix: acción "Escribir a alguien" (o explicar que se escribe desde un post); el botón
del tour en gris/contorno, no amarillo, para que no robe la acción principal (aplica a
todas las rutas). Archivos: `app/comunidad/mensajes.tsx`, `components/tour/TourButton.tsx:55–61`.

**H-12 · /perfil · todas — "Score Soberano" y jerga prohibida en primer plano.**
"368 /1000 SCORE SOBERANO", "Perfil soberano", "Protocolo soberano", "ascenso · +4.3 de
energía vs tu línea base", "lecturas de estado". El estándar los nombra como jerga.
Fix: titular en palabras del usuario ("Juan, vas en el día 1 de 90") y el número solo
si se explica en una frase. Archivo: `app/perfil/index.tsx`.

**H-13 · /perfil · todas — gramática y marca viejas.**
Barra lateral dorada en "Declaración de identidad" (prohibida), etiquetas en Space Mono
sobre cada bloque, cuatro cosas amarillas (avatar, EL ARCO, LA EVIDENCIA, HOY, barra de
progreso), tres tarjetas de métricas, ninguna acción principal. Fix: migrar a meta →
titular → una tarjeta amarilla → filas, como `/yo`. Archivo: `app/perfil/index.tsx`.

**H-14 · /perfil · todas — datos que se contradicen.**
"Día 1/90 · Iniciando" y "Llevas 1 día aquí" junto a "11 lecciones · 20 lecturas de
estado" y "Racha —". Un usuario concluye que el sistema no lo ve bien. Fix: contar días
desde el primer registro real, o explicar el reinicio ("Reiniciaste el protocolo el …").
Archivo: `app/perfil/index.tsx` (+ origen del día en `hooks/use-lifeflow.tsx`).

**H-15 · /perfil/wearables · todas — tres botones amarillos iguales.**
CONECTAR WHOOP, CONECTAR POLAR, CONECTAR STRAVA, más SINCRONIZAR AHORA con borde
amarillo y la píldora "1 ACTIVO". El amarillo no se gana. Fix: la acción amarilla es
la del dispositivo conectado (Sincronizar); el resto, filas "Conectar →" en texto.
Archivo: `app/perfil/wearables.tsx`.

**H-16 · /perfil/wearables · todas — "Activo" que no lo está.**
Oura dice "● ACTIVO" con "hace 7d" y "Sin datos hoy". En `/perfil` la fila dice
"biometría en tiempo real". Ninguna de las dos cosas es cierta.
Fix: estado "Sin datos hace 7 días" en ámbar; quitar "en tiempo real" (es sincronización
diaria). Archivos: `app/perfil/wearables.tsx`, `app/perfil/index.tsx`.

**H-17 · /perfil/apariencia · desktop-light, mobile-light — el selector dice "Oscuro" en tema claro.**
La opción marcada sigue siendo OSCURO mientras la pantalla está en claro.
Feedback de estado falso (Nielsen #1). Verificar si viene de cambiar el tema por
`data-theme` en la captura; si el toggle real deja el estado bien, bajar a P3.
Fix: leer el tema efectivo de `useAppTheme()` para el estado activo.
Archivo: `app/perfil/apariencia.tsx`.

**H-18 · /pricing · todas — al cliente con Premium Plus ACTIVO se le recomienda un plan inferior.**
El plan "RECOMENDADO" con el único botón amarillo es Premium; el usuario ya tiene
Premium Plus. Fix: si hay plan activo, abrir con ese plan arriba ("Tu plan: Premium Plus")
y quitar RECOMENDADO/CTA a planes inferiores. Archivo: `app/pricing.tsx:77, 102–106`.

**H-19 · /admin · todas — el titular contradice la lista.**
"Nadie te espera ahora." y justo debajo "Necesitan atención primero · 1 — Ana Isabel,
188 días sin check-in". El titular solo cuenta "por revisar". Un coach no técnico
cree que no tiene nada que hacer. Fix: si hay atención pendiente, el titular la nombra
("Ana Isabel lleva 188 días sin registrarse") y la tarjeta amarilla es "Escribirle".
Archivo: `components/mentor-board.tsx:118–121`.

### P2 · Mejorables

- **H-20 · /admin · desktop — nombres de mentor cortados** ("CLAUDIA CUA…") con ancho libre de sobra; además en amarillo, compitiendo con la acción. Fix: quitar `numberOfLines` en escritorio y texto gris. `app/admin/index.tsx:250–254`.
- **H-21 · /admin · todas — "Mentores y asignación" vive en Hoy.** Segunda decisión en la pantalla del día; "abiertas · vencidas" sin decir de qué. Fix: mover a Clientes/Equipo; rotular "3 tareas abiertas · 2 vencidas". `app/admin/index.tsx`.
- **H-22 · /admin · todas — cuentas de prueba en la lista** ("Apple Review", "Apple Review Polaris", "Clau", "Nicolas" ×2). Ruido y riesgo de asignar mal. Fix: marcar/ocultar cuentas internas. `lib/admin/deskLogic.ts` (`buildDesk`).
- **H-23 · /admin · todas — tarjeta "Sin check-in" con tarjeta anidada** y cuatro contadores de igual peso (tres en 0). Fix: ocultar contadores en cero; sin tarjeta dentro de tarjeta. `components/mentor-board.tsx:185–190`.
- **H-24 · /comunidad/mensajes · todas — "1 hermano en tu red"** para una conversación con Claudia; masculino genérico y banda amarilla decorativa. Fix: "1 persona en tu red", sin caja amarilla. `app/comunidad/mensajes.tsx:156–165`.
- **H-25 · /comunidad/mensajes y /bienestar/comunidad — avatares verdes** fuera de paleta. Fix: gris neutro / amarillo según manual. Estilos de avatar en ambos archivos.
- **H-26 · /bienestar/comunidad · todas — sin titular ni explicación**: "Comparte algo con la tribu…" es lo primero; un usuario nuevo no sabe quién lee. Fix: meta "Comunidad de clientes Polaris · lo ven solo miembros". `app/bienestar/comunidad.tsx`.
- **H-27 · /perfil/wearables · todas — jerga en inglés** ("Recovery · Strain · Nightly Recharge · HRV", "scores") y chips en Space Mono. Fix: "Recuperación, esfuerzo, sueño, variabilidad cardíaca"; quitar chips. `app/perfil/wearables.tsx`.
- **H-28 · /perfil/wearables · desktop — columna móvil estirada**, mucho vacío lateral. Fix: dos columnas (conectado / disponibles). `app/perfil/wearables.tsx`.
- **H-29 · /perfil/apariencia · todas — seis modos con nombres de sistema** ("Operador: cockpit denso", "Logos", "Específico"). Hick y jerga. Fix: nombres que digan qué cambia ("Todo a la vista", "Solo lo de hoy"…) o reducir a 3. `app/perfil/apariencia.tsx`.
- **H-30 · /perfil · "Apariencia · 30 combinaciones"** — hay 2 × 6 = 12. Fix: quitar el número. `app/perfil/index.tsx`.
- **H-31 · /pricing · todas — "LifeFlow + Polaris completo", "Analytics personales", "Acompañamiento 1:1 (Magister)", "Score Soberano + racha".** Mezcla de marcas y jerga. Fix: beneficios en palabras del usuario. `app/pricing.tsx`.
- **H-32 · /bienestar/internista · mobile — chips de preguntas sugeridas a 11 px** sobre gris, objetivo táctil <44 px. Fix: filas de 44 px. `app/bienestar/internista.tsx`.

### P3 · Pulido

- **H-33 · /pricing — doble rótulo** "POLARIS GROWTH INSTITUTE / PLANES Y ACCESO" + "PLANES" + "PLANES DISPONIBLES". Tres etiquetas para decir lo mismo. `app/pricing.tsx`.
- **H-34 · /bienestar/comunidad — cabecera "COMUNIDAD"** en un peso fino distinto al de las demás cabeceras. `app/bienestar/comunidad.tsx`.
- **H-35 · /perfil/wearables — píldora "1 ACTIVO"** de texto apretado en dos líneas, bajo contraste en claro. Quitarla. `app/perfil/wearables.tsx`.
- **H-36 · /admin — fecha "Miércoles, 4 de noviembre"** en gris 11 px alineada lejos del titular en escritorio. Juntarla como meta sobre "Hoy". `components/mentor-board.tsx:107–113`.
- **H-37 · Transversal — botón del tour (✦) tapa contenido** en móvil (tarjeta PRÁCTICAS en `/perfil`, estado de Strava en wearables). Margen inferior seguro. `components/tour/TourButton.tsx`.

**Conteo final: P0 4 · P1 15 · P2 13 · P3 5 (37).**

---

## 3. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
Estas pantallas siguen hablando el idioma del sistema, no el del usuario. Lo más
grave: un coach no técnico lee "Nadie te espera" y deja de mirar a una clienta con
188 días de silencio. En salud, el internista escupe markdown crudo y biométricos es
una cuadrícula de guiones sin salida. Me convence cuando cada pantalla tenga un
titular que diga qué pasa y UNA acción, y cuando `/perfil` deje de ser un cockpit.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Los núcleos rediseñados no llegaron aquí: `/perfil`, `/biometrics`, `/wearables` y
`/pricing` mantienen barras laterales doradas, Space Mono, chips, tarjetas con borde y
tres o cuatro amarillos peleando. `/admin` y `/mensajes` son los que más se acercan a la
gramática nueva. Me convence cuando el amarillo vuelva a significar "esto primero" y
las cuatro pantallas viejas se migren a meta → titular → tarjeta → filas.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Hay cuatro bloqueantes: el chrome en claro (por verificar), el markdown, la palabra
partida y un precio que no existe. La confianza falla donde más pesa: "Activo" sin
datos, "tiempo real" que no lo es, un "Internista" que no se presenta como IA en el
hilo, un autor "Norman" en el feed, un plan inferior recomendado a quien paga más.
Me convence cuando lo que la pantalla dice sea verdad en cada estado, con objetivos
de 44 px y contraste AA en los dos temas.
