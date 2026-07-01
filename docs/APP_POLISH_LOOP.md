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
- [x] app/(tabs)/progreso.tsx — progreso · guard anti-doble-tap en GUARDAR PERFIL (updateProfile async, "GUARDANDO…"+disabled en desktop+mobile) + a11y (role=button en Cuadro de Mando, Upgrade de plan, Cerrar sesión ×2, y ver-tarjeta-soberana) + render smoke test mobile/desktop de la pantalla grande (score/sparklines SVG/heatmap/ADN/GDPR; fuerza Platform=web para saltar el import dinámico de expo-notifications).
- [x] app/mentoria/index.tsx — mentoría · a11y: chips de semana con accessibilityState={selected} + label; role=button en los 3 botones de eliminar (acción/nota/acción del borrador) + render smoke test mobile/desktop (con y sin borrador de Norman; máquina de estados de grabación IA). Guardrails de consentimiento de grabación intactos.

### Bienestar
- [x] app/bienestar/index.tsx — hub (repulir) · a11y: role=button + labels descriptivos ({label}: {sub}) en el HubTile compartido (cubre todos los tiles móviles) + los 4 grids desktop (HOY/práctica/sistema/emocional) + WearableCard (ambas ramas) + back button. Ya reducido en Ola 1 (HOY+Ver todo); render test bienestarHub existente sigue verde.
- [x] app/bienestar/binaurales.tsx · a11y integral (estaba sin roles): back ×2, tarjetas de preset y mezclador (con estado selected), transporte del reproductor (iniciar/pausar/detener/reanudar/continuar/lanzar), toggle de modo + timer + ambiente con accessibilityState=selected + labels. SafetyWarning de binaurales INTACTO. render smoke test (lista + SafetyWarning).
- [x] app/bienestar/respiracion.tsx · ya tenía buena a11y (back/CTA/chips con role+label) y SafetyWarning; añadido accessibilityState={selected} a los chips de técnica + render smoke test (orbe animado + SafetyWarning preservado).
- [x] app/bienestar/meditacion.tsx · a11y (estaba sin roles): back ×2, tarjetas de sesión (label rico título/categoría/duración/completada) y transporte del reproductor (iniciar/pausar/detener×2/reanudar/completado). SafetyWarning (salud mental/conducción) INTACTO. render smoke test (lista + SafetyWarning).
- [x] app/bienestar/sueno.tsx · funcionalidad: botón "VER PLANES" era muerto (sin onPress) → ahora va a /pricing; ítems bloqueados ya no hacen tap muerto → van a /pricing (upsell). a11y: back + tarjetas de contenido (label con duración + estado premium) + CTA con role/label. SafetyWarning (insomnio/apnea) INTACTO. render smoke test free/premium.
- [x] app/bienestar/diario.tsx · a11y: back + selector de tipo (accessibilityState=selected) + input con label + botón guardar (state disabled) + banners de éxito/error con accessibilityLiveRegion (polite/assertive) para screen readers. Buen manejo de error ya existía (texto preservado en fallo). render smoke test.
- [x] app/bienestar/biblioteca.tsx · funcionalidad: quitados los chips de tiempo (filtro MUERTO — togglaban estado pero no afectaban resultados; las categorías no tienen duración) → menos falsa afordancia + declutter. a11y: back + input de búsqueda + "mostrar todas" con role/label. Ya tenía LECTURAS reales + curaduría honesta (Ola 2); render test bibliotecaScreen existente sigue verde.
- [x] app/bienestar/internista.tsx · a11y: botones del consent gate (aceptar/ahora-no), quick-prompts e input con role/label (back/exams/send ya tenían). GUARDRAILS INTACTOS: consent gate, disclaimer permanente, derivación red-flag sin LLM (lib/internist.ts), PHI/RLS, admin-blind. render smoke test (loading/consent, storage forzado a web).
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
