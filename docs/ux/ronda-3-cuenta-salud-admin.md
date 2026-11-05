# Ronda 3 · Cuenta, salud y admin — panel evaluador

Fecha: 2026-11-04 · Fuente: capturas locales con las correcciones de la ronda 2
(`docs/ux/capturas-ronda-3.md`, commit `c63208c`) + lectura de código.
Vara: `docs/ux/ESTANDAR_UX.md`. Rondas anteriores: `ronda-1-…` y `ronda-2-cuenta-salud-admin.md`.

Rutas: `/bienestar/internista`, `/bienestar/biometrics`, `/bienestar/comunidad`,
`/comunidad/mensajes`, `/perfil`, `/perfil/wearables`, `/perfil/apariencia`,
`/pricing`, `/admin` (esta ronda **sí** con mobile-light).

Advertencias de captura (no se cuentan como defectos):
- **Internista** sigue capturado solo en el consentimiento. La conversación se
  revisó en código (sin cambios desde la ronda 2: `MarkdownText`, hilo 720/680, filas de 44 px).
- **Comunidad móvil** quedó en "Cargando publicaciones…" (nota de captura).
- En todas las capturas en claro, el conmutador del sidebar y `/perfil/apariencia`
  marcan "Oscuro". `apariencia.tsx:55–61` lee `data-theme` solo al renderizar. Lo más
  probable es que el tema se forzara desde fuera. Sigue pendiente verificarlo en vivo (H-17).
- La insignia "Equipo" de comunidad se retiró a propósito, a la espera de un rol del
  servidor. Es un handoff documentado, no un defecto.

---

## 1. Tabla resumen

Puntuación fusionada = la más baja de los tres expertos por criterio (0–4).
1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado · 6 Consistencia ·
7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas · 11 Pico-final · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Media | R2 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar/internista | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 | 3,2 | 3,0 | NO APRUEBA (media) |
| /bienestar/biometrics | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,5 | **APRUEBA** |
| /bienestar/comunidad | 4 | 3 | 3 | 4 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 3,3 | 2,6 | NO APRUEBA (media) |
| /comunidad/mensajes | 4 | 3 | 3 | 4 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 4 | 3,3 | 3,0 | NO APRUEBA (media) |
| /perfil | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,1 | **APRUEBA** |
| /perfil/wearables | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3,4 | 3,3 | NO APRUEBA (media, por 0,08) |
| /perfil/apariencia | 4 | 3 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 3 | 3 | 4 | **3,5** | 2,8 | **APRUEBA** (pendiente H-17 en vivo) |
| /pricing | 4 | 3 | 3 | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 4 | 3,0 | 2,7 | NO APRUEBA (dos criterios <3) |
| /admin | 4 | 4 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3,2 | 2,8 | NO APRUEBA (media) |

Aprueban 3 de 9: biometrics, perfil y apariencia. **No queda ningún P0**: el velo del
admin en claro está resuelto. Las seis que faltan ya no tienen fallos de uso. Lo que
las frena es acabado: la gramática vieja en internista y precios, la jerga de precios
y relojes, los avatares de color y el exceso de amarillo en el admin.

Conteo: **P0: 0** · **P1: 6** (3 son P2 de rondas anteriores que suben porque son lo
único que impide aprobar) · P2: 13 · P3: 4.

---

## 2. Estado de lo abierto en la ronda 2

| # | Sev. R2 | Ruta | Estado | Evidencia |
|---|---|---|---|---|
| H-01 | P0 | admin, velo en claro | **RESUELTO** | `admin/_layout.tsx`: sin `BlurView` en web y fondo sólido `CHROME_BG`. El sidebar y la barra inferior se leen bien en desktop-light y mobile-light. |
| N-01 / H-09 | P1 | comunidad, insignia por nombre | **RESUELTO** | Se quitó `isTeamAuthor`. La insignia vuelve cuando el servidor dé un rol (handoff). Ver N-24. |
| N-02 | P1 | biometrics/perfil/wearables sin flecha | **RESUELTO** | Flecha visible en las tres, en escritorio y móvil (`pantalla.tsx` la pone por defecto, c30ecc7). |
| N-03 | P1 | plan con dos nombres | **RESUELTO** | El sidebar dice "Plan Premium Plus" (`getTierLabel`). |
| N-04 | P1 | pricing, amarillo en plan inferior | **RESUELTO** | Planes en neutro y orden Plus → Free → Premium. Cero amarillo. |
| N-05 | P1 | internista, jerga en consentimiento | **RESUELTO** | "señal de alarma", "trastorno de la conducta alimentaria", "por ejemplo, Mayo Clinic". Las siglas, al pie. |
| N-06 | P1 | admin móvil, botón cortado | **RESUELTO** | "Escribirle a Ana" cabe en móvil. |
| H-12 / H-14 | P1 | perfil, EL ARCO y repetición | **RESUELTO** | El bloque `historia` desapareció. Las filas cuentan una sola vez. |
| N-07 | P2 | biometrics, error crudo | **PARCIAL** | Se añadió "Prueba en un minuto", pero se sigue mostrando `${error}` (`biometrics.tsx:64`). |
| N-08 | P2 | pricing, asesor sin vía | **RESUELTO** | "Escribir a mi asesor →" (mailto). |
| N-09 | P2 | wearables vs biometrics | **RESUELTO** | Mismo titular: "Tu Oura (Ring) no ha enviado datos." |
| N-10 | P2 | mensajes, fila de 1.500 px | **RESUELTO** | Columna de 720 px. Ver N-19 por el botón. |
| N-11 | P2 | comunidad a todo el ancho | **RESUELTO** | Columna de 680 px. |
| N-12 | P2 | comunidad, gramática vieja | **RESUELTO** | meta → "Lo que comparten los clientes." → composer → filas sin caja. |
| N-13 | P2 | apariencia, rejilla de cajas | **RESUELTO** | `Pantalla` + filas tipo radio con check. |
| H-17 | P2 | apariencia, check del tema | **PARCIAL** | En las capturas en claro sigue marcando "Oscuro". Falta verificar en vivo con el botón real. |
| H-20 | P2 | admin, mentores cortados | **SIGUE** | "CLAUDIA CUA…" en amarillo. |
| H-21 | P2 | admin, asignación en Hoy | **SIGUE** | "Mentores y asignación" sigue debajo de Hoy. |
| H-22 | P2 | admin, cuentas de prueba | **SIGUE** | "Apple Review", "Apple Review Polaris", "Clau", "Nicolas" ×2. |
| H-23 | P2 | admin, ceros y tarjeta anidada | **SIGUE** | Tres contadores en 0. "Sin check-in" lleva otra tarjeta dentro. Ana aparece 4 veces. |
| H-25 | P2 | avatares de color | **SIGUE → P1** | Ver N-25. |
| H-27 | P2 | wearables, "OAuth" y chips mono | **SIGUE → P1** | `wearable-compat.tsx:17, 39, 68`. Es lo único que deja a wearables sin aprobar. |
| H-29 | P2 | apariencia, nombres de modo | **SIGUE** | "Operador · Cockpit denso", "Logos", "protocolo atenuado" (`use-app-mode.tsx:19–24`). |
| H-31 | P2 | pricing, jerga | **SIGUE → P1** | "FREE", "LifeFlow + Polaris completo", "(Magister)", "nuevas features", "Score Soberano + racha". |
| H-33 | P3 | pricing, triple rótulo | **PARCIAL** | Se quitó el eyebrow. Quedan "PLANES Y ACCESO" + "PLANES DISPONIBLES". |
| H-36 | P3 | admin, fecha lejos | **SIGUE** | En escritorio, la fecha queda a ~600 px de "Hoy". En móvil está bien. |
| H-37 | P3 | botón del tour tapa contenido | **SIGUE → P2** | En móvil tapa "Empieza con el registro d…" (perfil) y "Conect…" (wearables). |
| N-14 | P3 | perfil, "90." huérfano | **SIGUE** | En escritorio, "90." queda solo en la tercera línea. |
| N-15 | P3 | mensajes, título fino | **RESUELTO** | Meta + titular "Tus conversaciones." |
| N-16 | P3 | internista, aviso IA a 11 px | **SIGUE** | `internista.tsx:335`: `fontSize: 11`, `smoke`. |
| N-17 | P3 | wearables, "OURA RING" partido | **NO VERIFICABLE** | La fila no sale en la captura móvil. En escritorio está en una línea. |

Resueltos: 19 · Parciales: 3 · Siguen: 12 (3 suben a P1) · No verificable: 1.

---

## 3. Hallazgos

### P0 · Bloqueantes
Ninguno.

### P1 · Graves (impiden aprobar)

**N-18 · /bienestar/internista · consentimiento — gramática vieja y un muro de texto pequeño.**
El copy ya está bien. Pero la pantalla todavía usa una cabecera propia,
`GoldDivider "ANTES DE EMPEZAR"` y una `PremiumCard` con tres párrafos a 13 px, viñetas
a 12 px y tres énfasis en dorado que compiten con el botón amarillo. Es el único
consentimiento de salud de la app y se lee peor que cualquier fila de `/perfil`.
Fix: `Pantalla` con meta "INTERNISTA", titular "Antes de empezar.", sub "Asistente con
IA · no es un médico." (esto cierra también N-16). Luego las 4 viñetas como filas a
15–16 px, los párrafos a 15 px en `ash`, los énfasis en `ivory` bold (no dorado) y un
solo botón amarillo. `app/bienestar/internista.tsx:150–232, 335, 414–417`.

**N-20 · /pricing · todas — es la última pantalla de cuenta con la gramática vieja.**
Tiene un botón atrás en caja, el título "PLANES Y ACCESO", `GoldDivider "PLANES
DISPONIBLES"` y tres tarjetas con borde. Todas las demás pantallas de "Yo" ya usan
`Pantalla` + filas.
Fix: `Pantalla` con meta "TU PLAN", titular "Tienes Premium Plus." y una fila "Escribir
a mi asesor →". Los otros planes, plegados bajo "Otros planes" (cierra también N-26).
`app/pricing.tsx:175–280`.

**H-31 (sube) · /pricing — jerga y nombres internos.** El plan "FREE" está en inglés, junto a
"Gratis". También aparecen "LifeFlow + Polaris completo", "(Magister)", "nuevas features",
"Score Soberano + racha" y "Analytics personales". El cliente paga por algo que no sabe
nombrar.
Fix: "Gratis", "Todo Polaris", "Acompañamiento 1 a 1 con tu asesor", "lo nuevo
antes que nadie", "Puntaje y racha", "Tus números". `constants/subscriptions.ts:38, 55…`.

**H-27 (sube) · /perfil/wearables — la tarjeta "RELOJES COMPATIBLES" es de otra familia.**
Es una caja con borde, chips monoespaciados ("iOS · Apple Salud", "Android · Health
Connect") y "vía OAuth directo en web". Es lo único que deja la pantalla en 3,4.
Fix: una línea de texto ("Apple Watch, Garmin, Polar, Coros, Suunto y otros se conectan
desde la app del teléfono.") en vez de la tabla. Si se quiere conservar, filas `Fila`
sin chips y sin "OAuth". `components/wearable-compat.tsx:17, 37–39, 68`.

**N-25 (era H-25) · /bienestar/comunidad, /comunidad/mensajes — avatares de colores fuera de marca e ilegibles en claro.**
`avatarSwatches` usa verde, azul y morado con un `fg` fijo (#6FBF93 sobre un tinte casi
blanco ≈ 2:1 en claro, visible en "N" y "C"). Rompe el manual (negro/amarillo/gris) y
el contraste en claro. Es lo que más frena a estas dos pantallas.
Fix: una sola pareja neutra que siga el tema (`bg: palette.graphiteLight`, `fg:
palette.ash`) para todos los avatares sin foto. `constants/theme.ts:118–125`.

**N-21 · /admin · Hoy — amarillo repartido y números vacíos.**
En la primera pantalla compiten tres amarillos: el CTA "Escribirle a Ana", el chip "Míos"
relleno y los nombres de mentor en `goldText` (más el conmutador ADMIN). También hay
tres contadores en 0 y una tarjeta anidada (H-23), y Ana aparece cuatro veces. Es ruido
que compite con la única acción.
Fix: el chip activo en gris o ivory con subrayado. Los nombres de mentor en `ash`
(nunca en amarillo) y sin cortar (H-20). Ocultar los contadores en 0, quitar la
tarjeta anidada y llevar "Mentores y asignación" a Clientes (H-21).
`components/mentor-board.tsx:150–165` y la lista de asignación.

### P2 · Mejorables
- **N-19 · /comunidad/mensajes · desktop — "Nuevo mensaje" está fuera de la columna.** El botón queda arriba a la derecha, a ~1.000 px de las filas centradas en 720. Fix: meterlo en la columna, bajo el titular. `app/comunidad/mensajes.tsx:151–164`.
- **N-22 · /perfil/wearables — segundo amarillo.** "Conectado · sin datos en los últimos 7 días" va en `goldText` junto a la tarjeta amarilla. Fix: `ash`. `app/perfil/wearables.tsx`.
- **N-24 · /bienestar/comunidad — un usuario llamado "Norman" se confunde con la IA.** Ahora no hay insignia y por eso no hay suplantación, pero "Norman: Hola" se lee como Norman hablando. Fix (junto al handoff del rol): reservar "Norman" y "Equipo Polaris" al registrarse y al editar el perfil.
- **N-26 · /pricing — el plan más alto ve los dos inferiores desplegados.** Son 15 viñetas que no le sirven. Fix: plegar "Otros planes". `app/pricing.tsx`.
- **H-37 (sube a P2) · botón del tour** tapa el valor de la primera fila en móvil (perfil, wearables). Fix: `paddingBottom` ≥ 72 en `Pantalla` en móvil, o subir el botón por encima de la zona de filas. `components/tour/TourButton.tsx`, `components/pantalla.tsx`.
- Abiertos: N-07 (parcial), H-17 (verificar en vivo), H-20, H-22, H-29.

### P3 · Pulido
- **N-23 · /bienestar/comunidad — subtítulo pegado al titular.** "Lo ven solo los miembros de Polaris." no tiene `marginTop`. Fix: `marginTop: spacing.sm` en `whoReads`. `app/bienestar/comunidad.tsx`.
- Abiertos: N-14 ("90." huérfano; `textWrap: 'balance'` en web en `pantalla.tsx`), N-16 (lo cierra N-18), H-33 (lo cierra N-20), H-36.

---

## 4. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — TODAVÍA NO.**
Ya ninguna pantalla deja al usuario sin salida. Un plan se llama igual en todas partes.
El consentimiento del internista se entiende. Era lo que pedía y está cumplido. Lo que
falta es lenguaje en dos sitios: precios ("FREE", "Magister", "features", "Score
Soberano") y la tarjeta de relojes ("OAuth"). Me convence cuando esas dos pantallas
hablen como `/perfil`.

**Evaluador B · Diseño visual y marca — TODAVÍA NO.**
Comunidad, mensajes y apariencia pasaron a la familia nueva y se ven bien. El admin
en claro por fin es legible. Quedan dos islas de la gramática vieja (el consentimiento
del internista y `/pricing`) y una fuga de color: avatares verdes, azules y morados, y
nombres de mentor en amarillo. Me convence cuando esas dos pantallas usen `Pantalla`, los
avatares sean neutros y en el Hoy del admin solo haya un amarillo.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Los cuatro bloqueantes de la ronda 1 están cerrados. La suplantación en comunidad
desapareció y las rutas de stack tienen salida en la PWA. Bien. Quedan cosas
concretas: iniciales de avatar a ~2:1 en claro, el aviso de IA del internista a 11 px,
texto de 12–13 px en un consentimiento de salud y el botón del tour tapando datos en
móvil. Me convence cuando esos cuatro estén corregidos y alguien confirme en vivo que
el selector de tema marca el tema real.
