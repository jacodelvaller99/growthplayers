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
- [ ] app/(auth)/index.tsx — login/registro
- [ ] app/(onboarding)/index.tsx — onboarding + consent
- [ ] app/(tabs)/comando.tsx — home/dashboard
- [ ] app/checkin.tsx — check-in
- [ ] app/(tabs)/norte.tsx — Mi Norte
- [ ] app/(tabs)/mentor.tsx — Norman
- [ ] app/(tabs)/programas.tsx — programa
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
