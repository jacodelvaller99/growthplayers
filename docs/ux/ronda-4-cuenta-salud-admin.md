# Ronda 4 · Cuenta, salud y admin — panel evaluador

Fecha: 2026-11-04 · Fuente: capturas locales con las correcciones de la ronda 3
(`docs/ux/capturas-ronda-4.md`, sobre `2345e75`) + lectura de código.
Vara: `docs/ux/ESTANDAR_UX.md`. Ronda anterior: `ronda-3-cuenta-salud-admin.md`.

Rutas: `/bienestar/internista`, `/bienestar/biometrics`, `/bienestar/comunidad`,
`/comunidad/mensajes`, `/perfil`, `/perfil/wearables`, `/perfil/apariencia`,
`/pricing` (incluye "Otros planes" abierto), `/admin`.

Advertencias de captura (no se cuentan como defectos):
- **Internista** solo está capturado en el consentimiento (sin aceptar). La conversación se
  revisó en código: `app/bienestar/internista.tsx:160–176, 238–326, 338–408`.
- **Wearables** tiene una captura "cargando". Se usa la cargada (`el1457`).
- En las capturas en claro, el selector de `/perfil/apariencia` y el del sidebar siguen
  marcando "Oscuro". `apariencia.tsx:55–61` ya sincroniza con `data-theme`, pero lo lee al
  renderizar. Si el tema se forzó desde fuera sin re-render, la captura no lo refleja. Sigue
  pendiente verificarlo en vivo con el botón real (H-17).
- La insignia "Equipo" de comunidad se retiró a propósito, a la espera de un rol del
  servidor. Es un handoff documentado, no un defecto.

---

## 1. Tabla resumen

Puntuación fusionada = la más baja de los tres expertos por criterio (0–4).
1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado · 6 Consistencia ·
7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas · 11 Pico-final · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Media | R3 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar/internista | 4 | 4 | 3 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 4 | 3,4 | 3,2 | NO APRUEBA (media; la conversación) |
| /bienestar/biometrics | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,7 | **APRUEBA** |
| /bienestar/comunidad | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 4 | 3 | 3 | **3,6** | 3,3 | **APRUEBA** |
| /comunidad/mensajes | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,3 | **APRUEBA** |
| /perfil | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,7 | **APRUEBA** |
| /perfil/wearables | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 3 | 3 | 4 | 3 | 4 | **3,6** | 3,4 | **APRUEBA** |
| /perfil/apariencia | 4 | 3 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 3 | 3 | 4 | **3,5** | 3,5 | **APRUEBA** (pendiente H-17 en vivo) |
| /pricing | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | **3,6** | 3,0 | **APRUEBA** |
| /admin | 4 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 4 | 3,4 | 3,2 | NO APRUEBA (media) |

Aprueban 7 de 9 (antes 3). **P0: 0** · **P1: 2** · P2: 8 · P3: 7.

Los grandes saltos son `/pricing` (de 3,0 a 3,6: ahora usa `Pantalla`, dice "Tienes Premium
Plus." y pliega los otros planes) y comunidad/mensajes (avatares neutros). Quedan dos
pantallas a menos de 0,1 de la media exigida: la **conversación** del internista, que sigue
en la gramática vieja aunque el consentimiento ya es ejemplar, y el **Hoy del admin**, que
nombra a la misma clienta cuatro veces.

---

## 2. Estado de lo abierto en la ronda 3

| # | Sev. R3 | Ruta | Estado | Evidencia |
|---|---|---|---|---|
| N-18 | P1 | internista, consentimiento | **RESUELTO** | `Pantalla` con meta "INTERNISTA", titular "Antes de empezar.", sub "Asistente con IA · no es un médico.". Párrafos a 15 px en `ash`, énfasis en `ivory` bold, 4 filas a 16 px, un solo amarillo. La conversación sigue en la gramática vieja (ver N-27). |
| N-20 | P1 | pricing, gramática vieja | **RESUELTO** | Meta "TU PLAN", titular "Tienes Premium Plus.", filas `Fila`, "Escribir a mi asesor · Correo →". |
| H-31 | P1 | pricing, jerga | **RESUELTO** | "Curso Polaris completo (9 módulos)", "Acompañamiento 1 a 1 con tu asesor", "Lo nuevo antes que nadie", "Gratis". Sin "FREE", "Magister", "features" ni "Score Soberano". |
| H-27 | P1 | wearables, tarjeta "RELOJES COMPATIBLES" | **RESUELTO** | Sin caja, sin chips mono, sin "OAuth". Queda texto. Ver N-28 por la repetición. |
| N-25 | P1 | avatares de color | **RESUELTO** | Avatares neutros con borde en comunidad y mensajes, legibles en claro ("N", "C"). |
| N-21 | P1 | admin, amarillo repartido | **RESUELTO** | El chip "Míos" es neutro con borde. Los mentores están plegados en "Mentores y asignación · Ver →". Contadores en 0 ocultos. En el Hoy solo hay un amarillo de acción. |
| N-19 | P2 | mensajes, botón fuera de la columna | **RESUELTO** | "Nuevo mensaje" bajo el titular, dentro de la columna de 720 px. |
| N-22 | P2 | wearables, segundo amarillo | **SIGUE** | "Conectado · sin datos en los últimos 7 días" en `goldText` en la fila de Oura (`wearables.tsx:489`). |
| N-24 | P2 | comunidad, usuario "Norman" | **SIGUE** | "Norman · Hola" se sigue leyendo como la IA. Va con el handoff del rol. |
| N-26 | P2 | pricing, otros planes desplegados | **RESUELTO** | "Otros planes · Ver 2 →" plegado; abierto muestra "Gratis" y "Premium" como filas. |
| H-37 | P2 | botón del tour tapa contenido | **PARCIAL** | `Pantalla` deja `FAB_CLEARANCE` al final del scroll, pero en móvil el botón sigue tapando la primera fila visible: "Empieza con el registro d…" (perfil), "Conect…" (wearables) y "Necesitan atención primero" (admin). |
| N-07 | P2 | biometrics, error crudo | **SIGUE** | `biometrics.tsx:64` sigue interpolando `${error}`. |
| H-17 | P2 | apariencia, check del tema | **PARCIAL** | Código corregido (sincroniza con `data-theme`). Las capturas en claro siguen marcando "Oscuro". Falta la prueba en vivo. |
| H-20 | P2 | admin, mentores cortados | **RESUELTO** | Plegados; no salen en el Hoy. |
| H-21 | P2 | admin, asignación en Hoy | **PARCIAL** | Plegada en una fila "Ver →" al final. Aceptable; ideal en Clientes. |
| H-22 | P2 | admin, cuentas de prueba | **NO VERIFICABLE** | No salen en el Hoy (la lista está plegada). Revisar en Clientes antes del lanzamiento. |
| H-23 | P2 | admin, tarjeta anidada y Ana ×4 | **SIGUE → P1** | Ver N-29. Es lo único que deja al admin por debajo de 3,5. |
| H-29 | P2 | apariencia, nombres de modo | **SIGUE** | "Operador · Cockpit denso", "Calma · protocolo atenuado", "Logos" (`use-app-mode.tsx:21–24`). |
| N-23 | P3 | comunidad, subtítulo pegado | **RESUELTO** | `whoReads` con `marginTop: spacing.sm`. |
| H-33 | P3 | pricing, triple rótulo | **RESUELTO** | Solo el meta "TU PLAN". |
| H-36 | P3 | admin, fecha lejos | **SIGUE** | En escritorio, "Miércoles, 4 de noviembre" a ~550 px de "Hoy". |
| N-14 | P3 | perfil, "90." huérfano | **SIGUE** | En escritorio, "90." solo en la tercera línea. |
| N-16 | P3 | internista, aviso IA a 11 px | **PARCIAL** | Resuelto en el consentimiento. En la conversación, la barra de aviso está a 12 px en `goldText` (N-27). |
| N-17 | P3 | wearables, "OURA RING" partido | **SIGUE** | Ahora verificable: en móvil se parte en "OURA / RING" al lado de un estado largo. |

Resueltos: 13 · Parciales: 4 · Siguen: 7 (1 sube a P1) · No verificable: 1.

---

## 3. Hallazgos

### P0 · Bloqueantes
Ninguno.

### P1 · Graves (impiden aprobar)

**N-27 · /bienestar/internista · conversación — la pantalla de uso real sigue en la gramática vieja.**
El consentimiento ya es la mejor pantalla de salud de la app. Pero al aceptarlo el usuario
entra a otra familia: cabecera propia centrada ("INTERNISTA" a 18 px + subtítulo a 12 px),
una banda dorada de aviso en `goldText` a 12 px (un segundo amarillo que compite con el botón
de enviar), un saludo en `PremiumCard` a 13 px, burbujas del usuario a 13,5 px, el enlace a
exámenes como caja con etiqueta en mayúsculas a 11 px y el campo de texto a 14 px (en iOS, por
debajo de 16 px el navegador hace zoom al enfocar). Es lo que se lee todos los días; el
consentimiento se lee una vez.
Fix: la misma cabecera de `Pantalla` (meta "INTERNISTA", sub "Asistente con IA · no es un
médico."). Aviso en una línea en `ash` a 13–14 px, sin banda dorada. Saludo como texto plano
a 15 px. Burbujas del usuario a 15 px. Exámenes como `Fila` "Tus exámenes médicos →".
Campo a 16 px. `app/bienestar/internista.tsx:160–176, 244–300, 335–404`.

**N-29 (era H-23) · /admin · Hoy — la misma clienta cuatro veces y una tarjeta dentro de otra.**
En una sola vista de escritorio, "Ana Isabel Gómez Serna" aparece en el titular, en el botón
amarillo, dentro de la tarjeta "1 · Sin check-in" (una tarjeta anidada con su propia vista
previa) y otra vez en "Necesitan atención primero". El ojo no sabe si son cuatro cosas o una.
Fix: quitar la vista previa anidada del contador (el contador solo, tocable) y, cuando la
lista de "Necesitan atención" tenga solo a quien ya está en el titular, no repetirla.
`components/mentor-board.tsx:198–203` (vista previa) y la sección de atención en
`app/admin/index.tsx`.

### P2 · Mejorables
- **N-28 · /perfil/wearables — dos líneas dicen lo mismo.** "Apple Watch y los relojes de Google Health Connect se conectan desde la app móvil…" y debajo "Apple Watch, Garmin, Polar… se conectan desde la app del teléfono…". Fix: dejar solo la segunda. `app/perfil/wearables.tsx` / `components/wearable-compat.tsx`.
- **N-30 · /perfil/wearables — el sub repite la fila.** "Conectado · sin datos en los últimos 7 días" está en el sub y otra vez en la fila de Oura, en amarillo. Fix: cerrar N-22 (fila en `ash`) y dejar el sub como explicación ("Se sincroniza una vez al día; puedes forzarlo aquí.").
- **N-31 · /pricing — flecha → en filas que despliegan.** "Gratis →", "Premium →" y "Otros planes · Ver 2 →" abren en el sitio; la flecha promete navegar. Fix: chevron abajo/arriba en las filas plegables de `Fila` (o `accessibilityState={{ expanded }}` + chevron). `app/pricing.tsx:62, 211–214`.
- Abiertos: N-22, N-24, H-37 (parcial), N-07, H-17 (verificar en vivo), H-29.

### P3 · Pulido
- **N-32 · /pricing — "GRATIS · Gratis →".** Rótulo y valor iguales. Fix: valor "Ver qué incluye".
- **N-33 · /pricing — "Todo lo de Premium".** Para quien nunca tuvo Premium no dice nada. Fix: nombrar las dos o tres cosas clave, o "Todo lo del plan Premium (ver abajo)".
- **N-34 · /pricing — "CANJEAR" deshabilitado al 40 %.** El amarillo a 40 % sobre negro queda marrón. Fix: deshabilitado en `graphite`/`smoke`, no en oro translúcido. `app/pricing.tsx:243`.
- **N-35 · wearables vs biometrics — "Tu Oura Ring" / "Tu Oura".** Mismo dispositivo con dos nombres. Fix: usar el mismo `name` en ambos titulares.
- Abiertos: H-36, N-14 (también "app." huérfano en `/perfil/apariencia` móvil; `textWrap: 'balance'` en `pantalla.tsx` cierra ambos), N-17.

---

## 4. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — ME CONVENCE.**
Pedí que precios y relojes hablaran como `/perfil`, y lo hacen. "Tienes Premium Plus." se
entiende en un segundo, los otros planes ya no estorban, y "OAuth" desapareció. El
consentimiento del internista es claro y honesto. Lo que queda (Ana repetida en el admin, la
flecha que despliega) es acabado. No impide a nadie saber qué hacer.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Siete de nueve pantallas son ya de la misma familia, los avatares son neutros y el Hoy del
admin tiene un solo amarillo. Faltan dos cosas: la conversación del internista, que es la
última isla de la gramática vieja (banda dorada, `PremiumCard`, caja de exámenes), y la
tarjeta anidada del admin. Me convence cuando esas dos estén cerradas y el estado de Oura deje
de ir en amarillo.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Contraste de avatares resuelto, consentimiento de salud legible, sin bloqueantes. Quedan tres
cosas concretas: el texto de 11–13,5 px y el campo a 14 px en la conversación del internista
(zoom forzado en iOS), el botón del tour que tapa la primera fila en móvil, y la prueba en
vivo del selector de tema. Me convence cuando esas tres estén.
