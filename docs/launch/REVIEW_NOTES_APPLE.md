# Notas de revisión para Apple — App Store Connect

Pegar esto (traducido si Apple lo pide en inglés) en el campo **"Notes"** de App Store Connect, sección
**App Review Information**, antes de enviar la build a revisión.

## 1. Cómo entrar (registro es solo por invitación)

Polaris es una app de coaching de alto rendimiento por membresía — el registro requiere un código de
acceso a propósito (no es un bug). Para la revisión:

- **Código de acceso**: `APPLEREVIEW` *(generarlo antes de enviar — ver "Handoff del dueño" abajo)*
- **Cuenta demo ya creada** (evita que el revisor tenga que pasar por el flujo de registro):
  - Email: `revisor.apple@polarisgrowthinstitute.com` *(o el que decida el dueño)*
  - Password: *(generar y pegar aquí — no reutilizar contraseñas reales)*
  - Esta cuenta ya completó el onboarding y tiene datos narrativos de ejemplo (racha, check-ins,
    progreso) para que ninguna pantalla se vea vacía.

Si el revisor prefiere registrar su propia cuenta: pantalla de bienvenida → "Iniciar sin código" está
deshabilitado a propósito; debe usar el código `APPLEREVIEW` en el paso de invitación.

## 2. Por qué la app pide acceso a Apple Salud (HealthKit)

Polaris lee (nunca escribe) sueño, frecuencia cardíaca, recuperación y actividad desde Apple Salud para
personalizar el protocolo del usuario y las recomendaciones del mentor de IA. Es de lectura únicamente
(`NSHealthShareUsageDescription`); no compartimos estos datos con terceros ni los usamos con fines
publicitarios. El permiso es opcional — la app funciona completa sin conceder acceso a Salud.

## 3. Sobre "Norman", el mentor de inteligencia artificial

Norman es un chat de IA generativa (no un humano, no un profesional licenciado). La app lo declara
explícitamente en el disclaimer de salud (pantalla Legal → Salud, enlazada desde el consentimiento de
onboarding) y en un banner persistente dentro del chat. Ante mensajes de crisis o autolesión, Norman
interrumpe la conversación normal y deriva a líneas de emergencia reales (ver esa misma pantalla).

## 4. Suscripciones (RevenueCat / In-App Purchase)

Los planes se gestionan con RevenueCat. El paywall muestra: divulgación de renovación automática, botón
de restaurar compras, y enlaces a Términos/Privacidad/Salud — todos tocables antes de comprar.

## 5. Handoff del dueño antes de enviar a revisión (checklist corto)

- [ ] Generar el código `APPLEREVIEW` en `/admin/codigos` (tipo de acceso: el nivel que se quiera mostrar
      al revisor, ej. Premium — así ve el producto completo, no la versión free limitada).
- [ ] Crear la cuenta demo vía `/admin/usuarios` → "Crear perfil", o registrarla manualmente con el
      código de arriba; completar su onboarding con datos de ejemplo reales (no vacíos).
- [ ] Confirmar que el ai-proxy tiene los secrets de servidor activos en Supabase (`ANTHROPIC_API_KEY`,
      etc.) — sin esto Norman falla en el primer mensaje y la build se rechaza. Ver handoff #22 en
      `KNOWN_ISSUES_REGISTER.md`.
- [ ] Pegar aquí arriba el password real de la cuenta demo antes de enviar.
