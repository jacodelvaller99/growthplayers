# Ronda 2 · Cuenta, salud y admin — panel evaluador

Fecha: 2026-11-04 · Fuente: capturas locales con las correcciones de la ronda 1
(`docs/ux/capturas-ronda-2.md`, commit `b6ea03e`) + lectura de código.
Vara: `docs/ux/ESTANDAR_UX.md`. Ronda anterior: `docs/ux/ronda-1-cuenta-salud-admin.md`.

Rutas: `/bienestar/internista`, `/bienestar/biometrics`, `/bienestar/comunidad`,
`/comunidad/mensajes`, `/perfil`, `/perfil/wearables`, `/perfil/apariencia`,
`/pricing`, `/admin`.

Advertencias de captura:
- **Internista** solo se capturó en la pantalla de consentimiento. La vista de
  conversación se verificó **solo en código** (`app/bienestar/internista.tsx`):
  `MarkdownText` en las respuestas (l.265 y l.270, también en streaming),
  hilo centrado con `maxWidth: 720` (l.349) y burbuja IA con `maxWidth: 680`
  (l.359), subtítulo fijo "Asistente con IA · no es un médico" (l.164, visible en
  las capturas), preguntas sugeridas como filas de 44 px y 15 px (l.368–372), y
  prompt con "NUNCA tablas (|), NUNCA títulos con #, NUNCA separadores ---"
  (`lib/internist.ts:176`). No se vio una respuesta real pintada.
- `admin` no tiene captura mobile-light esta ronda.
- Todas las capturas en claro muestran el conmutador del sidebar en "OSCURO". Parece
  que el tema se forzó con `data-theme` desde fuera. Ver H-17.

---

## 1. Tabla resumen

Puntuación fusionada = la más baja de los tres expertos por criterio (0–4).
1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado · 6 Consistencia ·
7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas · 11 Pico-final · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Media | R1 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar/internista | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 3,0 | 2,0 | NO APRUEBA |
| /bienestar/biometrics | 4 | 4 | 4 | 4 | 3 | 2 | 4 | 3 | 3 | 4 | 3 | 4 | 3,5 | 1,8 | NO APRUEBA (un criterio <3) |
| /bienestar/comunidad | 3 | 3 | 2 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 2 | 2,6 | 2,2 | NO APRUEBA |
| /comunidad/mensajes | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3,0 | 2,5 | NO APRUEBA (media) |
| /perfil | 4 | 4 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 4 | 3 | 3 | 3,1 | 1,4 | NO APRUEBA |
| /perfil/wearables | 4 | 4 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 4 | 3 | 4 | 3,3 | 1,8 | NO APRUEBA |
| /perfil/apariencia | 3 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2,8 | 2,4 | NO APRUEBA |
| /pricing | 4 | 3 | 2 | 2 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2 | 2,7 | 2,0 | NO APRUEBA |
| /admin | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 1 | 3 | 3 | 2,8 | 2,3 | NO APRUEBA |

Progreso real: todas suben y **biometrics, perfil y wearables pasaron a la gramática
nueva** (meta → titular → una tarjeta amarilla → filas). Ninguna aprueba todavía.
`/bienestar/biometrics` queda a una línea de código (la flecha atrás). `/admin`
mantiene un P0: el velo oscuro en tema claro que se arregló en el sidebar del
cliente no se arregló en el del admin.

Conteo de esta ronda: **P0 abiertos: 1** (arrastrado) · **P1 abiertos: 9**
(3 arrastrados parciales + 6 nuevos) · P2: 14 · P3: 6.

---

## 2. Estado de los hallazgos de la ronda 1

| # | Sev. | Ruta | Estado | Evidencia |
|---|---|---|---|---|
| H-01 | P0 | transversal, chrome en claro | **PARCIAL** | Sidebar del cliente nítido en claro en todas las capturas. **Sidebar del admin sigue con velo gris oscuro y los rótulos son invisibles** (`/admin desktop-light`). Causa confirmada: `app/admin/_layout.tsx` conserva `BlurView` en web en l.107 (sidebar), l.193 (barra inferior móvil) y l.281 (barra de mentor). El fix de `DesktopSidebar.tsx` no se copió aquí. |
| H-02 | P0 | internista, markdown crudo | **RESUELTO (código)** | `MarkdownText` en l.265/270 + prompt sin tablas/#/---. Sin captura de una respuesta. |
| H-03 | P0 | biometrics, palabra partida | **RESUELTO** | La cuadrícula de 3 columnas ya no existe. |
| H-04 | P0 | pricing, precio inexistente | **RESUELTO** | Sin CTA a `/paywall`; "Se activa desde la app de iOS o Android". (Ver N-04 por cómo se pinta.) |
| H-05 | P1 | internista, burbuja a todo ancho | **RESUELTO (código)** | `maxWidth` 720/680, hilo centrado. |
| H-06 | P1 | internista, IA no identificada | **RESUELTO** | Subtítulo fijo visible en las tres capturas. |
| H-07 | P1 | biometrics, vacío sin salida | **RESUELTO** | "Tu Oura no ha enviado datos." + una tarjeta amarilla "Sincronizar ahora" con "Última vez hace 7 días". |
| H-08 | P1 | biometrics, gramática vieja | **RESUELTO** | Pantalla + TarjetaOro + Fila; aviso legal al pie. |
| H-09 | P1 | comunidad, autor "Norman" | **PARCIAL** | Se ve "Equipo Polaris · EQUIPO", pero se decide **por el nombre** (`isTeamAuthor`, regex `^norman\b`). Abre N-01 (suplantación). |
| H-10 | P1 | comunidad, iconos iguales | **RESUELTO** | "Comentar" / "Escribir"; cabecera "Círculo" / "Mensajes". |
| H-11 | P1 | mensajes, sin acción | **RESUELTO** | "Nuevo mensaje" amarillo; botón del tour en gris neutro. |
| H-12 | P1 | perfil, jerga | **PARCIAL** | El titular está limpio ("Juan, vas en el día 1 de 90.") y "Puntaje" se explica. Al final sigue el bloque `EL ARCO / LA EVIDENCIA / HOY` con "20 lecturas de estado" y "El sistema está funcionando" (`lib/narrativeLogic.ts:433–466`, pintado en `app/perfil/index.tsx:166–174`). |
| H-13 | P1 | perfil, gramática vieja | **RESUELTO** | Sin barra dorada ni Space Mono; un solo amarillo. Las etiquetas por capítulo del bloque final van en H-12. |
| H-14 | P1 | perfil, datos contradictorios | **PARCIAL** | El subtítulo explica el reinicio ("Reiniciaste el programa el 4 de noviembre…"). El bloque final repite "Llevas 1 día aquí" y vuelve a contar lecciones y registros que ya están en las filas. |
| H-15 | P1 | wearables, tres amarillos | **RESUELTO** | Un amarillo (Sincronizar); el resto, filas "Conectar →". |
| H-16 | P1 | wearables, "Activo" falso | **RESUELTO** | "Conectado · sin datos en los últimos 7 días", "se sincroniza una vez al día"; en perfil, "Conectar o sincronizar". |
| H-17 | P1 | apariencia, selector falso | **PARCIAL** | El código ahora lee `data-theme` (`app/perfil/apariencia.tsx:57–66`), pero lo lee al renderizar, sin escuchar cambios. Las capturas en claro siguen marcando OSCURO, y el conmutador del sidebar también. Probablemente es un artefacto de cómo se capturó: con el botón real debería salir bien. Se baja a **P2 hasta verificarlo en vivo**. |
| H-18 | P1 | pricing, plan inferior recomendado | **RESUELTO** | "Tu plan: Premium Plus." arriba; sin RECOMENDADO. |
| H-19 | P1 | admin, titular contradice | **RESUELTO** | "Ana Isabel Gómez Serna lleva 189 días sin registrarse." + "Escribirle". |
| H-20 | P2 | admin, mentores cortados | **SIGUE** | "CLAUDIA CUA…" en amarillo. |
| H-21 | P2 | admin, asignación en Hoy | **SIGUE** | |
| H-22 | P2 | admin, cuentas de prueba | **SIGUE** | "Apple Review", "Apple Review Polaris", "Clau", "Nicolas" ×2. |
| H-23 | P2 | admin, tarjeta anidada y ceros | **SIGUE** | Tres contadores en 0 y una tarjeta dentro de "Sin check-in". Ana Isabel aparece 4 veces en la primera pantalla. |
| H-24 | P2 | mensajes, "hermano" | **RESUELTO** | "1 persona en tu red." sin banda amarilla. |
| H-25 | P2 | avatares verdes | **SIGUE** | `avatarSwatches` (`constants/theme.ts`, vía `components/Avatar.tsx:14`). |
| H-26 | P2 | comunidad, quién lee | **RESUELTO** | "Comunidad de clientes Polaris · lo ven solo miembros". |
| H-27 | P2 | wearables, jerga en inglés | **PARCIAL** | Las filas están limpias. La tarjeta "RELOJES COMPATIBLES" sigue con "OAuth directo en web" y chips monoespaciados (`components/wearable-compat.tsx:17, 37–39`). |
| H-28 | P2 | wearables, columna estirada | **RESUELTO** | Titular + tarjeta a dos columnas en escritorio. |
| H-29 | P2 | apariencia, modos con nombre de sistema | **SIGUE** | "Operador · Cockpit denso", "Logos", "Específico" (`hooks/use-app-mode.tsx:19–24`). |
| H-30 | P2 | perfil, "30 combinaciones" | **RESUELTO** | "Claro u oscuro". |
| H-31 | P2 | pricing, jerga | **SIGUE** | "LifeFlow + Polaris completo", "(Magister)", "nuevas features", "Score Soberano + racha", "Analytics personales" (`constants/subscriptions.ts:38, 55…`). |
| H-32 | P2 | internista, chips 11 px | **RESUELTO (código)** | Filas `minHeight: 44`, 15 px. |
| H-33 | P3 | pricing, triple rótulo | **PARCIAL** | Siguen "POLARIS GROWTH INSTITUTE / PLANES Y ACCESO" + "PLANES DISPONIBLES". |
| H-34 | P3 | comunidad, peso de cabecera | **RESUELTO** | Ver N-17 para mensajes. |
| H-35 | P3 | wearables, píldora "1 ACTIVO" | **RESUELTO** | |
| H-36 | P3 | admin, fecha lejos | **SIGUE** | La fecha sigue alineada a la derecha, lejos de "Hoy". |
| H-37 | P3 | botón del tour tapa contenido | **PARCIAL** | En wearables móvil tapa la segunda línea de "Conectado · sin datos…". |

Resueltos: 21 · Parciales: 9 · Siguen: 7.

---

## 3. Hallazgos nuevos

### P0 · Bloqueantes

No hay P0 nuevos. Sigue abierto **H-01 en /admin** (velo en claro). Fix: aplicar en
`app/admin/_layout.tsx` (l.107, 193, 281) el mismo cambio de `DesktopSidebar.tsx`:
en web, un fondo sólido del tema en lugar de `BlurView`.

### P1 · Graves

**N-01 · /bienestar/comunidad · todas — cualquiera puede publicar como "Equipo Polaris".**
`isTeamAuthor` (`app/bienestar/comunidad.tsx:60–66`) marca como equipo a quien tenga
un nombre que empiece por "Norman". Un cliente llamado "Norman García", o que se
ponga ese nombre, publica con la insignia EQUIPO y el nombre "Equipo Polaris". Es
suplantación de la marca dentro de la comunidad (confianza, UGC 1.2).
Fix: que la insignia salga de un dato del servidor (`is_admin` o rol en
`profiles`/`user_profiles`, leído en el mismo `select` de l.198), nunca del nombre.
Además, reservar "Norman" y "Equipo Polaris" al registrarse y al editar el perfil.

**N-02 · /bienestar/biometrics, /perfil, /perfil/wearables · móvil — sin flecha atrás.**
Ninguna de las tres le pasa `onBack` a `Pantalla`, y por eso en móvil no aparece la flecha
(confirmado en las tres capturas móviles). Son rutas de stack sin barra de pestañas.
En la PWA instalada (sin botón atrás del navegador) el usuario queda atrapado. Las
demás pantallas del bloque sí tienen flecha. Es una regresión de la migración.
Fix: `onBack={() => router.back()}` en `app/bienestar/biometrics.tsx` (las 4
`<Pantalla>`), `app/perfil/index.tsx` y `app/perfil/wearables.tsx`. Mejor aún: que
`components/pantalla.tsx` la muestre por defecto cuando `router.canGoBack()` y la
pantalla no sea una pestaña.

**N-03 · /pricing (y sidebar en todas) — el mismo plan con dos nombres.**
La tarjeta de usuario del sidebar dice "Plan Elite" y `/pricing` dice "Tu plan:
Premium Plus.". Un cliente que paga no sabe qué compró.
Fix: `TIER_LABEL` en `components/DesktopSidebar.tsx:36–40` con los nombres de
`constants/subscriptions.ts` (Gratis / Premium / Premium Plus), o un solo
diccionario compartido.

**N-04 · /pricing · todas — el amarillo más fuerte de la página es un plan que el usuario no necesita.**
"Premium · Se activa desde la app de iOS o Android" va en amarillo brillante con
viñetas amarillas, y debajo de "Free". El plan propio (Premium Plus) queda en un
dorado apagado. El orden es Plus → Free → Premium. Von Restorff contra el usuario.
Fix: con plan activo, los demás planes van en gris y en orden ascendente
(Free → Premium), sin amarillo. El texto de iOS/Android, como línea pequeña.
`app/pricing.tsx:68` (`accentText`), l.232 (orden), l.242.

**N-05 · /bienestar/internista · consentimiento — jerga en un consentimiento informado.**
"red-flags", "TCA", "embarazo + medicación", y "USPSTF, NIH, Mayo Clinic, ACLM,
Cochrane" en el primer párrafo. Un consentimiento que no se entiende no es
informado (Nielsen #2, principio 2 del estándar).
Fix: "señales de alarma", "trastornos de la conducta alimentaria", "guías médicas
reconocidas (por ejemplo, Mayo Clinic)"; las siglas, en una línea al pie.
`app/bienestar/internista.tsx:185–215`.

**N-06 · /admin · mobile — el botón principal sale cortado.**
"Escribirle a Ana Isabel …": la acción amarilla pierde el nombre. El estándar trata
el texto cortado como bloqueante. Aquí queda en P1 porque el verbo sobrevive y el
nombre completo está en el titular de arriba.
Fix: usar solo el nombre de pila en el botón ("Escribirle a Ana Isabel"), o dejar
"Escribirle" y el nombre en la línea secundaria. `components/mentor-board.tsx`.

Siguen abiertos como P1 parciales de la ronda 1: **H-12** (bloque EL ARCO / LA
EVIDENCIA en /perfil), **H-14** (repetición "Llevas 1 día aquí") y **H-09**
(cubierto por N-01). La solución más barata para H-12 y H-14 es la misma: quitar el
bloque `historia` de `/perfil`, porque sus números ya están en las filas
(`app/perfil/index.tsx:166–174`).

### P2 · Mejorables

- **N-07 · /bienestar/biometrics — error de sync crudo.** `No se pudo sincronizar: ${error ?? 'error desconocido'}` muestra el mensaje técnico. Fix: "No pudimos hablar con tu Oura. Prueba en un minuto." y `logSilentError` para el detalle. `app/bienestar/biometrics.tsx` (~l.64).
- **N-08 · /pricing — "escribe a tu asesor" sin forma de hacerlo.** No hay enlace ni botón. Fix: fila "Escribir a mi asesor →" (DM o mentoría). `app/pricing.tsx`.
- **N-09 · /perfil/wearables vs /bienestar/biometrics — el mismo hecho con dos titulares.** "Oura Ring conectado." vs "Tu Oura no ha enviado datos.". El primero suena a que todo va bien. Fix: el mismo titular en las dos pantallas. `app/perfil/wearables.tsx`.
- **N-10 · /comunidad/mensajes · desktop — fila de 1.500 px.** "127d" queda a ~1.000 px del nombre. Fix: `maxWidth` ~720 centrado, como el hilo del internista. `app/comunidad/mensajes.tsx`.
- **N-11 · /bienestar/comunidad · desktop — publicaciones y composer a todo el ancho.** Fix: `maxWidth` ~680 centrado. `app/bienestar/comunidad.tsx`.
- **N-12 · /bienestar/comunidad — gramática vieja.** Tarjetas con borde, la insignia EQUIPO en amarillo y "Comparte algo con la tribu…" como titular de facto. Fix: meta → titular corto ("Lo que comparten los clientes") → composer → filas. La insignia, en gris.
- **N-13 · /perfil/apariencia — rejilla irregular de 4 + 2 cajas con borde.** Fix: filas (`Fila`) con check, como el resto de "Yo"; en la misma pasada, renombrar los modos (H-29).
- **H-17 rebajado** (ver tabla): verificar el toggle en vivo, y que el conmutador del sidebar también lea el tema efectivo.
- Abiertos de la ronda 1: H-20, H-21, H-22, H-23, H-25, H-27 (parcial), H-29, H-31.

### P3 · Pulido

- **N-14 · /perfil · desktop — "90." huérfano** en la tercera línea del titular. Fix: `maxWidth` del titular o `textWrap: 'balance'` en web. `components/pantalla.tsx`.
- **N-15 · /comunidad/mensajes — título "MENSAJES" en peso fino**, distinto de COMUNIDAD o APARIENCIA. Fix: `fontWeight: '700'` en `title` (`app/comunidad/mensajes.tsx:227`).
- **N-16 · /bienestar/internista — subtítulo de IA a 11 px en `smoke`.** Es el aviso más importante de la cabecera y es lo más pequeño. Fix: 12–13 px en `ash`. `app/bienestar/internista.tsx:331`.
- **N-17 · /perfil/wearables · mobile — "OURA RING" partido en dos líneas** y el estado en dos líneas debajo del botón del tour. Fix: rótulo de fila con `flexShrink: 0`, estado debajo. `app/perfil/wearables.tsx`.
- Abiertos de la ronda 1: H-33 (parcial), H-36, H-37 (parcial).

---

## 4. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
El salto es grande y es real. `/perfil`, biometría y reloj ahora dicen qué pasa en
una frase y ofrecen una acción, y el coach por fin lee el nombre de quien lo necesita.
Pero tres pantallas recién migradas perdieron la flecha atrás: en la PWA eso es un
callejón. El usuario ve "Plan Elite" en un lado y "Premium Plus" en otro. Y el
consentimiento del internista sigue hablando de "red-flags" y "TCA". Me convence
cuando ninguna pantalla deje al usuario sin salida y cada nombre signifique lo mismo
en todas partes.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Biometría, perfil y reloj son ya de la familia nueva, limpios y con un solo amarillo.
Bien. Quedan tres pantallas de la familia vieja: comunidad, apariencia y precios, con
cajas con borde, chips monoespaciados y avatares verdes. En `/pricing` el amarillo
más fuerte lo tiene un plan inferior. El sidebar del admin en claro sigue velado. Me
convence cuando esas tres pantallas se migren y el amarillo solo marque lo que el
usuario tiene que hacer.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Tres de los cuatro bloqueantes están cerrados. El cuarto (el chrome en claro) sigue
abierto en el admin, con su causa exacta en el código. Lo que más me preocupa es
nuevo: la insignia EQUIPO se le da a cualquiera que se llame "Norman". Es una puerta
abierta a la suplantación en una comunidad moderada. Me convence cuando la insignia
salga de un rol del servidor, el admin sea legible en claro y las rutas de stack
tengan salida en la PWA instalada.
