# Ronda 5 · Cuenta, salud y admin — panel evaluador (puerta final)

Fecha: 2026-11-04 · Fuente: capturas locales (`docs/ux/capturas-ronda-5.md`, sobre
`38747eb` + `9a37239`), lectura de código y una prueba en vivo del DOM en
`localhost:8082/perfil/apariencia`. Vara: `docs/ux/ESTANDAR_UX.md`. Ronda anterior:
`ronda-4-cuenta-salud-admin.md`.

Rutas: `/bienestar/internista`, `/bienestar/biometrics`, `/bienestar/comunidad`,
`/comunidad/mensajes`, `/perfil`, `/perfil/wearables`, `/perfil/apariencia`, `/pricing`,
`/admin`.

Advertencias (no cuentan como defectos):
- **Internista**: solo se capturó el consentimiento. La conversación se evalúa en código
  (`app/bienestar/internista.tsx:159–179, 238–316, 318–390`).
- **Insignia "Equipo"** en comunidad: retirada a la espera del rol del servidor. Handoff
  documentado.
- **Persistir el tema cuando cambia `data-theme` desde fuera** (`apariencia.tsx:77–79`): no es
  un problema. En uso real solo la app escribe el atributo (`applyAttr` en
  `hooks/use-app-theme.tsx`), así que persistir lo que se ve es persistir lo que el usuario
  eligió. Que el agente de captura lo disparara a mano prueba que la sincronía funciona.

---

## 1. Tabla resumen

Puntuación fusionada = la más baja de los tres por criterio (0–4).
1 Propósito · 2 Acción · 3 Jerarquía · 4 Lenguaje · 5 Estado · 6 Consistencia ·
7 Marca · 8 Accesibilidad · 9 Responsive · 10 Temas · 11 Pico-final · 12 Confianza.

| Ruta | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | Media | R4 | Veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /bienestar/internista | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 4 | 3 | 3 | 3 | 4 | **3,6** | 3,4 | **APRUEBA** |
| /bienestar/biometrics | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,7 | **APRUEBA** |
| /bienestar/comunidad | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 4 | 3 | 3 | **3,6** | 3,6 | **APRUEBA** |
| /comunidad/mensajes | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,7** | 3,7 | **APRUEBA** |
| /perfil | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | **3,8** | 3,7 | **APRUEBA** |
| /perfil/wearables | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,8** | 3,6 | **APRUEBA** |
| /perfil/apariencia | 4 | 3 | 4 | 3 | 4 | 4 | 4 | **2** | 4 | 4 | 3 | 4 | 3,6 | 3,5 | **NO APRUEBA** (accesibilidad < 3) |
| /pricing | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | **3,6** | 3,6 | **APRUEBA** |
| /admin | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 | 4 | **3,6** | 3,4 | **APRUEBA** |

Aprueban 8 de 9 (antes 7). **P0: 0** · **P1: 1** · P2: 7 · P3: 6.

Los dos P1 de la ronda 4 están cerrados de verdad. Lo que impide aprobar `/perfil/apariencia`
no estaba en la ronda anterior: salió al inspeccionar el DOM en vivo y es una línea.

---

## 2. Estado de lo abierto en la ronda 4

| # | Sev. R4 | Ruta | Estado | Evidencia |
|---|---|---|---|---|
| N-27 | P1 | internista, conversación | **RESUELTO** | Cabecera meta "INTERNISTA" → titular 28 px "Pregunta con calma." → sub 15 px. Aviso en `ash` 14 px, sin banda dorada. Saludo como texto a 15 px, sin `PremiumCard`. Burbujas del usuario a 15 px. Exámenes como `Fila`. Campo a 16 px (sin zoom en iOS). Un solo amarillo: enviar. Columna de 720 px. |
| N-29 | P1 | admin, Ana ×4 y tarjeta anidada | **RESUELTO** | Captura: Ana sale en el titular y en el botón (dos menciones con funciones distintas). El contador "1 · Sin check-in" ya no anida vista previa. "Necesitan atención" se oculta si solo estaba quien nombra el titular (`mentor-board.tsx:102–106, 217`). |
| N-22 / N-30 | P2 | wearables, estado en amarillo y repetido | **RESUELTO** | Fila de Oura neutra (`wearables.tsx:538`). El sub explica ("Se sincroniza una vez al día; puedes forzarlo aquí.") en vez de repetir. |
| H-37 | P2 | botón del tour tapa contenido | **RESUELTO** | En el teléfono vive arriba a la derecha (perfil, wearables, apariencia, pricing, mensajes) o en la cabecera del Hoy del admin. Ya no tapa la primera fila. |
| H-17 | P2 | apariencia, check del tema | **RESUELTO** | `MutationObserver` sobre `data-theme` + `pick()` mueve el check en el mismo render. Captura en claro marca "Claro". Prueba en vivo: Claro → `data-theme=light`; Oscuro → `tinta` y `localStorage` = `tinta`. Ver N-37 (riesgo con la barra lateral). |
| H-36 | P3 | admin, fecha lejos | **SIGUE** (aceptado) | En escritorio la fecha queda a la derecha. En móvil, junto al titular. |
| N-28 | P2 | wearables, dos líneas iguales | **NO VERIFICABLE** | La captura cargada no muestra el bloque de compatibles; no se cambió en código. |
| N-31 | P2 | pricing, flecha en filas que despliegan | **SIGUE** | "Otros planes · Ver 2 →". |
| N-35 | P3 | "Tu Oura Ring" / "Tu Oura" | **SIGUE** | Wearables "Tu Oura Ring no ha enviado datos."; biometrics "Tu Oura no ha enviado datos." |
| N-24 | P2 | comunidad, usuario "Norman" | **SIGUE** | Va con el handoff del rol. |
| N-07 | P2 | biometrics, error crudo | **SIGUE** | `biometrics.tsx:64`. |
| H-29 | P2 | apariencia, nombres de modo | **SIGUE** | "Operador · Cockpit denso", "Logos". |
| N-32, N-33, N-34, N-14, N-17 | P3 | varios | **SIGUEN** | Sin cambios. N-17 no se ve en esta captura. |

---

## 3. Hallazgos

### P0 · Bloqueantes
Ninguno.

### P1 · Graves (impiden aprobar)

**N-36 · /perfil/apariencia — un lector de pantalla no sabe qué opción está elegida.**
Las ocho filas se exponen como `role="radio"`, pero ninguna lleva `aria-checked` ni
`aria-selected` (verificado en el DOM en vivo: `aria-checked=null` y `aria-selected=null` en
las 8, también después de elegir). `Opcion` pasa `accessibilityState={{ selected: active }}`,
y en un radio el estado que cuenta es `checked`. El check es solo visual. Falla WCAG 4.1.2
(nombre, función, valor) en la única pantalla cuyo trabajo es elegir.
Fix: `accessibilityState={{ checked: active }}` en `Opcion` (`app/perfil/apariencia.tsx:48`) y
confirmar en el DOM que aparece `aria-checked="true"` en la fila activa.

### P2 · Mejorables
- **N-37 · /perfil/apariencia — posible carrera con la barra lateral en escritorio.** El efecto
  `if (effective !== mode) setMode(effective)` corre con el `shown` viejo cuando el tema cambia
  desde `DesktopSidebar` (que llama `setMode` directo, sin `setShown`). Si React vacía los
  efectos antes del callback del observer, la pantalla devolvería el tema anterior. No se pudo
  reproducir (la pestaña de prueba no tenía ancho de escritorio). Fix barato: quitar el efecto
  de persistencia y dejar solo el observer para el check, o leer `readShownTheme()` dentro del
  efecto. Verificar: en `/perfil/apariencia` a ≥1200 px, tocar CLARO/OSCURO en la barra.
- **N-38 · /bienestar/internista — la cabecera ocupa cuatro líneas en un chat.** Meta, titular
  de 28 px, "Asistente con IA · no es un médico." y "Educación general — no reemplaza a tu
  médico tratante." Dicen casi lo mismo y en un teléfono de 667 px le quitan ~200 px al hilo.
  Fix: una sola línea de aviso ("Asistente con IA. Educa, no reemplaza a tu médico.").
- Abiertos: N-31, N-24, N-07, H-29, N-28 (verificar).

### P3 · Pulido
- **N-39 · /bienestar/internista — "EXÁMENES · Tus exámenes médicos".** Rótulo y valor dicen lo
  mismo. Fix: valor "Subir o ver →".
- Abiertos: N-35, N-32, N-33, N-34, N-14, H-36.

---

## 4. Veredicto de cada experto

**Evaluadora A · Investigación y experiencia — ME CONVENCE.**
El Hoy del admin dice una cosa y una acción. El internista, al entrar a la conversación, sigue
hablando como el consentimiento. Relojes ya no repite. Lo que queda (cabecera larga del
internista, flecha que despliega) no impide a nadie saber qué hacer.

**Evaluador B · Diseño visual y marca — ME CONVENCE.**
Las nueve pantallas son de la misma familia: meta → titular → una acción → filas, un solo
amarillo por pantalla, estado del reloj neutro, sin tarjeta anidada en el admin. Pediría
cerrar N-35 ("Oura" con un nombre) y N-38 en la próxima pasada, pero no bloquean.

**Evaluadora C · Accesibilidad y producto — TODAVÍA NO.**
Lo que pedí en la ronda 4 está: texto ≥15 px y campo a 16 px en el internista, el botón del
tour ya no tapa filas, y el selector de tema sigue al tema real. Falta una cosa: N-36, los
radios de Apariencia sin estado para lectores de pantalla (`checked` en vez de `selected`,
verificado en el DOM). Me convence cuando aparezca `aria-checked="true"` en la fila activa. De
paso, comprobar N-37 con la barra lateral.
