# App Polish Loop — pulido página-por-página a nivel Apple

> Loop autónomo (dynamic /loop). Cada iteración = **la primera página `[ ]` sin marcar** de la lista.
> Por página: evaluar (UX / ui-ux-pro-max / accesibilidad) → mejorar (móvil + desktop responsive,
> ambos temas vía tokens, funcionalidad, a11y) → **render smoke test** + gate (tsc/lint/jest/export)
> → commit + push a `launch-hardening-p0` → esperar ~3 min → siguiente. Prod lo mergea el dueño por lotes.
> Marcar `[x]` al terminar y anotar 1 línea de qué se hizo.

## Reglas de calidad por página
- Móvil (≤768) y desktop (≥1200) ambos correctos y respirados.
- Tema oscuro Y claro: solo tokens (`palette.*`/`cv()`), 0 hex crudo nuevo, `goldText` para texto/iconos.
- A11y: touch ≥44px, `accessibilityRole/Label`, contraste, orden lógico.
- Funcionalidad real: estados loading/vacío/error honestos, sin dead-ends.
- Sin romper: guardrails de Norman/internista, RLS/consent, moderación, paleta/GrandisExtended.

## Cola (journey primero, admin al final)

### Núcleo del journey
- [x] app/(auth)/welcome.tsx — primera impresión · reduced-motion (a11y Apple HIG: salta la intro si el usuario reduce movimiento) + render smoke test móvil/desktop
- [x] app/(auth)/index.tsx — login/registro · autofill de password managers (textContentType + autoComplete en email/pass/código) + a11y (errores role=alert/live-region, tabs con estado seleccionado) + render test login/register
- [x] app/(onboarding)/index.tsx — onboarding + consent · guard anti-doble-tap del cierre (finish async no re-dispara, botón muestra "INICIANDO…" y se deshabilita) + a11y (progressbar en el indicador de paso con accessibilityValue, roles/labels en los 3 skip-links) + render smoke test del consent gate. Sin tocar el gate de consentimiento ni la lógica RGPD.
- [x] app/(tabs)/comando.tsx — home/dashboard · seguridad: window.open del link de sesión en vivo ahora con noopener,noreferrer (evita reverse-tabnabbing) + a11y: roles/labels en 7 tarjetas accionables que no los tenían (anomalía, NBA, ancla del Norte, comunidad, sesión en vivo, posts del preview, ver-todo) + render smoke test mobile/desktop de la home (la red que faltaba cuando un re-render tumbó el chat).
- [x] app/checkin.tsx — check-in · guard anti-doble-tap en GUARDAR (saveCheckIn async → botón "GUARDANDO…"+disabled, re-habilita si falla) + fix typo "TERRENo"→"TERRENO" + a11y (roles/labels en pills de sugerencia) + render smoke test mobile/desktop (incluye micro-ritual con Animated/timers).
- [x] app/(tabs)/norte.tsx — Mi Norte · guard anti-doble-tap en GUARDAR (updateNorthStar async → "GUARDANDO…"+disabled en ambos layouts) + a11y (roles/labels en CTA de estado vacío desktop+mobile y en pills de sugerencia; toast de éxito con accessibilityLiveRegion=polite+role=alert para screen readers) + render smoke test mobile-vacío/desktop-con-datos.
- [x] app/(tabs)/mentor.tsx — Norman · a11y (role=button en botón CHATS y en filas del historial) + **render smoke test de la pantalla más crítica** (apertura sin mensajes + con historial; muchos hooks/IA mockeados). Guardrails intactos: disclosure IA persistente, crisis routing (lib/mentor.ts), abort/timeout, gate premium, modos. NO se tocó la cadena de seguridad.
- [x] app/(tabs)/programas.tsx — programa · a11y: toast de bloqueo/pronto con accessibilityLiveRegion=polite+role=alert (screen readers lo anuncian) en mobile+desktop; roles/labels en botón cerrar y "seguir en mi módulo" del modal teaser + render smoke test mobile/desktop (lógica de desbloqueo por módulo).
- [ ] app/(tabs)/progreso.tsx — progreso
- [ ] app/mentoria/index.tsx — mentoría

### Bienestar
- [ ] app/bienestar/index.tsx — hub (repulir)
- [ ] app/bienestar/binaurales.tsx
- [ ] app/bienestar/respiracion.tsx
- [ ] app/bienestar/meditacion.tsx
- [ ] app/bienestar/sueno.tsx
- [ ] app/bienestar/diario.tsx
- [ ] app/bienestar/biblioteca.tsx
- [ ] app/bienestar/internista.tsx
- [ ] app/bienestar/examenes.tsx
- [ ] app/bienestar/habitos.tsx
- [ ] app/bienestar/ayuno.tsx
- [ ] app/bienestar/nutricion.tsx
- [ ] app/bienestar/cuerpo.tsx
- [ ] app/bienestar/body-context.tsx
- [ ] app/bienestar/suplementacion.tsx
- [ ] app/bienestar/biometrics.tsx
- [ ] app/bienestar/grito.tsx
- [ ] app/bienestar/tapping.tsx
- [ ] app/bienestar/consciencia.tsx
- [ ] app/bienestar/comunidad.tsx — feed

### Comunidad / perfil / contenido
- [ ] app/comunidad/mensajes.tsx
- [ ] app/comunidad/chat/[id].tsx
- [ ] app/perfil/index.tsx
- [ ] app/perfil/cliente.tsx
- [ ] app/perfil/wearables.tsx
- [ ] app/module/[id].tsx
- [ ] app/lesson/[id].tsx

### Comercial / legal / auth
- [ ] app/pricing.tsx
- [ ] app/paywall.tsx
- [ ] app/legal/privacidad.tsx
- [ ] app/legal/terminos.tsx
- [ ] app/legal/salud.tsx
- [ ] app/(auth)/reset-password.tsx

### Admin (interno — al final)
- [ ] app/admin/index.tsx
- [ ] app/admin/usuarios/index.tsx
- [ ] app/admin/usuarios/[id].tsx
- [ ] app/admin/membresias/index.tsx
- [ ] app/admin/cursos/index.tsx
- [ ] app/admin/codigos/index.tsx
- [ ] app/admin/contenido/index.tsx
- [ ] app/admin/inteligencia/index.tsx
- [ ] app/admin/memoria.tsx
- [ ] app/admin/biometria.tsx
- [ ] app/admin/mentores/ejecucion.tsx
- [ ] app/admin/comunidad/index.tsx
- [ ] app/admin/auditoria/index.tsx
- [ ] app/admin/ranking.tsx
- [ ] app/admin/copilot.tsx

## Bitácora (qué se mejoró por página)
_(el loop agrega una línea por página al terminarla)_
