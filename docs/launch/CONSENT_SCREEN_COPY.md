# CONSENT_SCREEN_COPY — Biometría / Wearables · IA · Salud (ES)

**Equipo 5 — Producto / Copy / Experiencia**
Copy listo para 3 superficies que hoy faltan o están incompletas:
1. **Consentimiento de biometría/wearable** — antes del OAuth de WHOOP/Oura (hoy `app/perfil/wearables.tsx` lanza el OAuth sin un checkpoint de consentimiento explícito; solo hay una nota de privacidad al final).
2. **Divulgación de IA** — primera vez que el usuario abre a Norman.
3. **Disclaimer de salud** — surfacing consistente (hoy existe `MedicalDisclaimer.tsx` solo en biometría; se propone reutilizarlo y reforzarlo).

Requisitos que cubre: consentimiento informado para datos de salud (GDPR art. 9 — categoría especial), divulgación de IA (App Store 5.1.1), no-consejo-médico, y derecho a revocar.

---

## 1. Pantalla de consentimiento de biometría / wearable

> Se muestra **antes** de iniciar el OAuth (al pulsar "Conectar WHOOP/Oura"), como paso intermedio. El botón de continuar queda deshabilitado hasta marcar la casilla.

**Título**
> CONECTA TU CUERPO AL PROTOCOLO

**Intro**
> Al conectar tu wearable, Polaris recibe tus datos de recuperación, sueño, variabilidad cardíaca (HRV) y frecuencia cardíaca. Norman los usa para ajustar el ritmo de tu protocolo y tus recomendaciones diarias.

**Qué datos recibimos**
> - Recuperación / readiness
> - Sueño (duración y calidad)
> - Variabilidad cardíaca (HRV) y frecuencia cardíaca en reposo
> - Actividad / esfuerzo del día

**Cómo los usamos**
> - Para personalizar tus recomendaciones y la lectura de tu estado diario.
> - Para que Norman (IA) contextualice sus respuestas con cómo amaneciste.
> Estos datos **no se venden ni se comparten con terceros con fines publicitarios.**

**Tu control**
> - Tú decides conectar, y puedes **desconectar en cualquier momento** desde Perfil → Dispositivos.
> - Puedes exportar o eliminar tus datos desde Perfil → Privacidad y Datos (GDPR).
> - Los tokens de acceso se almacenan cifrados en tu cuenta.

**Aviso de salud (destacado)**
> Tus datos biométricos son **informativos**. No constituyen diagnóstico ni consejo médico. Las recomendaciones de Polaris y de Norman no sustituyen la valoración de un profesional de la salud.

**Casilla de consentimiento (obligatoria)**
> ☐ Entiendo cómo se usan mis datos biométricos y autorizo a Polaris a procesarlos para personalizar mi experiencia. He leído la [Política de Privacidad].

**Botones**
> [ CONTINUAR Y CONECTAR ]  (deshabilitado hasta marcar la casilla)
> [ Ahora no ]

---

## 2. Divulgación de IA (primera apertura de Norman)

> Hoja/modal la primera vez que el usuario entra a la pestaña Mentor. Una sola vez (persistir con flag, igual que `MedicalDisclaimer`).

**Título**
> TE PRESENTO A NORMAN

**Cuerpo**
> Norman es tu mentor con **inteligencia artificial**, entrenado con el método y la filosofía de Norman Capuozzo, fundador de Polaris.
>
> No es una persona ni un profesional humano: es una IA que conoce tu contexto y te responde con preguntas y herramientas del método.
>
> Como toda IA, **puede equivocarse o no captar todo el contexto.** Tómalo como un apoyo para pensar, no como una verdad absoluta. Para temas de salud física o mental, consulta siempre a un profesional cualificado.

**Microcopy de privacidad**
> Tus conversaciones se guardan para darte continuidad dentro de la app, conforme a nuestra Política de Privacidad.

**Botón**
> [ ENTENDIDO, EMPECEMOS ]

> Refuerzo persistente (no modal): mantener el label **"NORMAN · MENTOR IA"** ya presente en `comando.tsx:415` y añadir "IA" junto al título "MENTOR POLARIS" en `mentor.tsx:495` (p. ej. badge "IA" en el header del chat).

---

## 3. Disclaimer de salud — surfacing consistente

El componente `components/MedicalDisclaimer.tsx` ya existe y su texto es correcto. Recomendaciones:

**(a) Texto actual — conservar (está bien):**
> Los datos biométricos mostrados son informativos y no constituyen diagnóstico ni consejo médico. Consulta a un profesional de salud antes de tomar decisiones basadas en estos datos.

**(b) Surfacing — ampliar a estas pantallas (hoy solo aparece en `biometrics.tsx`):**
- Cualquier sesión de **respiración** intensa (`respiracion.tsx` — Wim Hof / holotrópica / retención) → banner o modal previo.
- **Ayuno** (`ayuno.tsx`) → ya tiene modal no-omitible excelente. **Usar como modelo.**
- **Tapping / Grito / Consciencia** (`bienestar/`) → banner una vez: "Herramienta de bienestar y autoconocimiento, no un tratamiento."
- **Norman** → cuando dé interpretaciones de biometría (ver "LECTURA DE NORMAN IA" en TRUST_COPY_REWRITE §6).

**(c) Variante para herramientas emocionales / respiración (texto nuevo):**
> Esta es una herramienta de bienestar, no un tratamiento médico ni psicológico. Si tienes una condición de salud, estás embarazada, o sientes mareo o malestar, detente y consulta a un profesional.

**(d) Línea de crisis (añadir donde se aborden emociones difíciles — escala de consciencia, diario, Norman ante señales de angustia):**
> Si estás pasando por un momento difícil o piensas en hacerte daño, no estás solo. Contacta a los servicios de emergencia de tu país o a una línea de ayuda local.

> Nota de implementación: definir un único componente reutilizable (extender `MedicalDisclaimer` con una prop `variant: 'biometric' | 'wellness' | 'crisis'`) para no duplicar textos y mantener consistencia.

---

## Checklist de cumplimiento (para QA antes de stores)

- [ ] El OAuth de wearables no se dispara sin consentimiento explícito marcado.
- [ ] La divulgación de IA aparece antes (o en) la primera interacción con Norman.
- [ ] Toda interpretación de biometría por IA lleva "generado por IA · no es consejo médico".
- [ ] Ninguna pantalla de bienestar afirma curar/tratar; las de respiración intensa y ayuno tienen aviso previo.
- [ ] Existe una vía visible para exportar/eliminar datos (Perfil → Privacidad y Datos).
- [ ] La Política de Privacidad enlazada declara: datos biométricos (categoría especial GDPR) + conversaciones con IA.
