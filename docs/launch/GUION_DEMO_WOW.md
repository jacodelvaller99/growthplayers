# GUION DEMO WOW — 10 minutos, 2 actos (borrador v1)

> **Para: Capuozzo.** Coreografía exacta. Los 3 momentos WOW están marcados ★. Ensáyalo 2 veces completas en prod antes de la demo (Fase 5). Se refina tras el diagnóstico de prod.
>
> **Preparación previa (Fase 2, hacemos juntos):** cuenta demo con 3 semanas de historia — biométricos sintéticos burnout→recuperación (se siembran desde `/admin/usuarios/<demo>` → sección K. BIOMÉTRICOS), 2–3 chats con Norman con compromisos explícitos, check-ins que los contradicen, plan de mentoría confirmado.

---

## ACTO 1 — Móvil en la mano del jefe (~5 min): "el producto"

| # | Pantalla | Qué haces | Qué dices (idea) |
|---|---|---|---|
| 1 | Login → **Comando** | Entra con la cuenta demo. Deja que el score ring anime. | "Esto es lo primero que ve el cliente cada mañana: su estado operativo en un número — y de dónde sale." |
| 2 | **Check-in** (desde Comando) | Ábrelo, mueve 2 sliders, menciona el micro-ritual de respiración ("regula ANTES de medir") — **no corras los 6 ciclos**. Guarda. | "30 segundos al día. Con esto el sistema aprende más del cliente que una sesión mensual de coaching." |
| 3 | ★ **Norman** (tab Mentor) | Abre el chat. Norman abre **confrontando con el dato**. | ★ WOW #1+#2: "Dijiste que dormirías 7 horas — tu reloj marca 5.2 de promedio esta semana." → "No es un chatbot: tiene memoria de lo que el cliente DIJO y datos de lo que HIZO. Confronta con evidencia, con consentimiento explícito." |
| 4 | **Norman — modos** | Muestra los chips (diagnóstico/decisión/accountability/reflexión), cambia a *decisión*, una pregunta corta. | "El operador elige cómo lo acompaña. Y si el cliente toca un tema de crisis, Norman deriva a ayuda profesional — no juega al terapeuta." |
| 5 | **Perfil → Tu cuerpo hoy** | Muestra el estado del cuerpo + sparkline con el arco de recuperación. | "Wearable → interpretación en lenguaje humano. Al cliente jamás le hablamos en jerga clínica ni con alarma." |
| 6 | **Bienestar → Respiración** | Entra a una práctica, muestra el player. NO reproduzcas entero. | "Y el protocolo diario vive aquí: respiración, sueño, ayuno con guía médica, hábitos." |

**Transición:** "Eso ve el cliente. Ahora te muestro lo que ve el negocio." → pasar al PC.

## ACTO 2 — PC, pantalla grande (~5 min): "el negocio"

| # | Pantalla | Qué haces | Qué dices (idea) |
|---|---|---|---|
| 7 | ★ **Admin → Mission Control** | Deja respirar la pantalla: retención 90d (estrella polar), churn crítico, "a contactar hoy". | ★ WOW #3: "Una pantalla: cuántos clientes retengo, quién está en riesgo esta semana y a quién llamo HOY. Esto es lo que un coach con 200 clientes no puede hacer sin esto." |
| 8 | **Dossier del cliente demo** (`usuarios/<demo>`) | Recorre con calma: identidad → membresías → inteligencia → **FRICCIONES DETECTADAS** (dijo vs hizo) → memoria/briefing → ejecución (scores explicables) → biométricos → cuerpo & protocolo. | "El expediente vivo. Todo lo que el cliente dice Y hace, sintetizado. El briefing se lo escribe la IA al coach antes de cada sesión." |
| 9 | **Admin → Memoria** | Los 3 rankings: loops abiertos, follow-up estancado, riesgo. | "El sistema prioriza por mí a quién atender. Nadie se cae por las grietas." |
| 10 | **Admin → Biométricos** | Hero de distribución del equipo + % en alerta. | "Y el estado fisiológico de TODA la cartera de un vistazo: a quién darle descanso antes de que se rompa." |
| 11 | Cierre en **Inteligencia ML** | Engagement, churn, cohortes. | "Todo esto aprende solo con cada interacción. Es un negocio que se vuelve más inteligente con cada cliente." |

## Los 3 momentos WOW (no correr — dejarlos aterrizar)

1. **★ Norman responde como Norman** (primer intercambio, paso 3) — pausa de 2 segundos después.
2. **★ La confrontación con el dato** (paso 3) — es EL momento; si el jefe pregunta "¿cómo sabe eso?", esa es la conversación que quieres.
3. **★ Mission Control** (paso 7) — abre con la pantalla ya cargada, nunca en frío.

## Plan B por parada

| Riesgo | Señal | Acción |
|---|---|---|
| Norman lento (>8s) | spinner largo | Botón **Detener** → cambia chip a *decisión* (respuestas más cortas) → reintenta. |
| IA caída | aviso de simulación | "Te muestro la sesión de ayer" → **video pregrabado** (se graba en el ensayo de Fase 5, dejar en el escritorio del PC y en el teléfono). |
| Sin red / Vercel caído | nada carga | Screenshots de respaldo de las 11 paradas (se capturan en el ensayo) en una carpeta local. |
| Pregunta sobre precios/pago en web | — | "La suscripción va por iOS/Android (App Store); en web capturamos el lead" — NO abrir el paywall web más de 5 segundos. |

> **Pre-requisito duro (verificado 2026-07-02):** el chat con Norman solo persiste
> en la nube si el bloque **FIX-0** de `SQL_PENDIENTES_COMBINADAS.sql` está
> aplicado. Sin él, el hilo sobrevive a recargas en el MISMO navegador (guard
> local, iter 64) pero NO aparece en otro dispositivo — en una demo PC+móvil
> con la misma cuenta se notaría. Aplicar FIX-0 antes del ensayo (Fase 5).

## ANEXO — Script de las conversaciones con Norman (cuenta demo, Fase 2)

> El motor de confrontación solo cita compromisos EXPLÍCITOS. En los 2–3 chats de
> preparación (día antes de la demo, con la cuenta demo ya sembrada con el escenario
> `burnout_week`), usa frases de compromiso en primera persona, claras y medibles:

**Chat 1 (modo diagnóstico):** cuenta el contexto ("vengo de semanas de mucha carga,
duermo poco, dejé el gimnasio") y cierra con: *"Me comprometo a dormir 7 horas cada
noche a partir de hoy"* y *"Me comprometo a entrenar fuerza 3 veces por semana"*.

**Chat 2 (modo accountability, día siguiente):** reporta a medias: *"Anoche dormí 5
horas otra vez, no fui al gimnasio"*. Esto crea el gap DIJO vs HIZO que — junto al
dato del wearable sintético — produce la fricción citable.

**Chat 3 (opcional, modo decisión):** una decisión de negocio corta — muestra el
cambio de modo en vivo.

Además: 3+ check-ins en días distintos (estrés alto 7–8, energía baja) y confirmar
un plan de acción de mentoría (crea las tareas de ejecución del dossier).

## Qué NO tocar durante la demo

- Admin: ejecución de mentores, comunidad, auditoría, ranking, copilot (funcionales pero sin el pulido final — el guion las rodea).
- Grabación de sesión de mentoría en web (muestra el aviso "disponible en la app móvil").
- Cambio de tema en vivo SOLO si va sobrado de tiempo (está verificado, pero cada variable extra es riesgo).
- No borrar/crear nada en admin frente al jefe salvo lo ensayado.
