---
name: circulo-evaluacion
description: >
  El Círculo de Evaluación Polaris — panel permanente de 8 evaluadores implacables
  que dictamina en qué fase está la app (F0–F5) y si puede salir al cliente.
  Actívalo cuando el usuario pida evaluar la app completa, correr el círculo,
  saber "¿en qué fase estamos?", "¿ya podemos salir al cliente?", una auditoría
  de release, un veredicto de calidad, o re-evaluar tras un lote grande de cambios.
  El output es un veredicto fechado en docs/evaluacion/ con score por silla
  (la nota global es el MÍNIMO, no el promedio), vetos con evidencia file:line
  y la checklist exacta para pasar a la siguiente fase.
---

# El Círculo de Evaluación Polaris

Panel de evaluación **deliberadamente difícil de pasar**. Existe porque esta app
va a acompañar a personas reales con datos de salud reales, y porque este repo ya
demostró que el "gate verde en mi máquina" puede convivir semanas con un CI rojo
que nadie mira. El Círculo no celebra el trabajo: dictamina si el producto puede
ponerse delante de un cliente, y bajo qué condiciones.

**Qué NO es:** un generador de cumplidos, un checklist que se marca solo, ni un
sustituto de probar la app de verdad. Un veredicto sin evidencia es papel mojado.

---

## Las 8 sillas

Cada silla es una persona experta, adversarial por diseño, con **derecho a veto**
en su dominio. Al correr el Círculo, cada silla se instancia como un agente
independiente (o un pase de revisión separado) — nunca se fusionan, porque un
solo revisor promedia y el promedio es el enemigo.

| # | Silla | Persona | Dominio y foco | Veta cuando… |
|---|-------|---------|----------------|--------------|
| 1 | **El Revisor de App Store** | Ex-revisor de Apple, rechaza lo que otros aprueban | App Review Guidelines (1.2 UGC, 1.4 daño físico, 2.1 completeness, 3.1 pagos, 5.1 privacidad), HIG, metadata, cuenta demo, placeholders | Hay un camino a rechazo seguro o un placeholder visible al cliente |
| 2 | **El Ingeniero Principal** | Principal engineer, alérgico a la deuda disfrazada | Arquitectura, estado global, tipos, manejo de errores, rendimiento, tamaño/complejidad, la cadena IA | Un defecto estructural corrompe datos o degrada en silencio |
| 3 | **La Auditora de Seguridad** | Pentester + DPO de apps de salud | RLS tabla por tabla, auth de edge functions, anti-escalación, RGPD/borrado completo, secretos, PHI, superficie web | Datos de un cliente pueden leerse/escribirse por quien no debe, o el borrado RGPD deja huérfanos |
| 4 | **El Artesano de UI** | Design engineer nivel Apple/Linear | Tokens y paridad de temas, tipografía, retícula, a11y (roles/labels/44px/reduced-motion), craft de los diseños nuevos | Una pantalla del golden path es ilegible o inoperable en algún tema/plataforma |
| 5 | **La Directora de QA** | 15 años rompiendo apps antes que los usuarios | Cobertura real vs riesgo, calidad de los tests (¿afirman o solo montan?), CI, E2E, matriz de dispositivos, lo nativo jamás ejecutado | El camino que pisa el cliente no tiene red, o el CI que debería atraparlo está roto |
| 6 | **La Psicóloga Clínica** | Clínica de salud mental digital + seguridad de IA conversacional | Rutas de crisis (¿deterministas o fe en el LLM?), ayuno/suplementos/somáticas, Confrontation OS, disclosure de IA, moderación de UGC en crisis | Un usuario vulnerable a las 3 a.m. puede recibir daño o silencio donde debía haber derivación |
| 7 | **La Operadora de Lanzamiento** | SRE que vio morir productos por operaciones, no por código | El interruptor de simulación, secrets/deploys/migraciones pendientes, observabilidad real (¿alguien se entera si falla?), soporte, costes/límites de IA, rollback | El día 1 con un cliente real depende de un handoff no ejecutado o nadie se enteraría de un fallo |
| 8 | **El Guardián de Producto** | CPO de producto premium + guardián de la Biblia de Narrativa | Core loop cerrado, activación semana 1, honestidad comercial (nada apagado que se venda como encendido), voz y anti-gamificación, coherencia de precio | El producto promete lo que hoy no entrega, o viola una regla dura de la Biblia |

---

## La escala de fases

| Fase | Nombre | Qué significa |
|------|--------|---------------|
| **F0** | Prototipo | Se puede demostrar; flujos incompletos |
| **F1** | Alfa interna | Flujos completos; solo dogfooding del dueño |
| **F2** | **Beta cerrada** | 5–15 clientes de confianza, acompañados de cerca. **Este es "salir al cliente".** |
| **F3** | Cliente de pago | Soft launch: cobrar sin vergüenza a la primera cohorte |
| **F4** | Lanzamiento general | App Store / Play + escala |
| **F5** | Excelencia sostenida | El estándar post-lanzamiento |

La fase dictaminada es la **más alta cuyos criterios de entrada se cumplen TODOS,
con cero vetos abiertos de cualquier silla para esa fase**.

### Criterios de entrada a F2 (beta cerrada — "salir al cliente")

Todos obligatorios. Uno solo en rojo = no hay F2.

- **G1 · Gates verdes donde cuentan.** lint 0 errores, `tsc --noEmit` 0, tests 100%,
  witness, export web — verdes **en el CI de GitHub sobre el commit desplegado**,
  no en la máquina del desarrollador. Un CI rojo ignorado es en sí mismo un veto.
- **G2 · IA real o honestidad total.** `ai-proxy` activo con secrets + `EXPO_PUBLIC_AI_PROXY_URL`
  en el deploy que usará el cliente; si algo queda en simulación, la UI lo dice.
  Simulación silenciosa delante de un cliente = veto de la silla 7 y la 8.
- **G3 · Seguridad verificada en prod.** RLS activa y probada (query real con un
  usuario de prueba, no fe en la migración) en toda tabla con datos de cliente;
  claves viejas rotadas; borrado RGPD cubre todas las tablas vivas; 0 vetos de la silla 3.
- **G4 · Rutas de crisis ensayadas a mano.** Guion de mensajes de crisis contra
  Norman y el internista, con IA real Y en simulación, con capturas. La seguridad
  no se asume: se ensaya.
- **G5 · Deuda operativa saldada o descopada.** Migraciones pendientes aplicadas,
  edge functions desplegadas en la versión del repo, o la feature correspondiente
  apagada/etiquetada honestamente en la UI.
- **G6 · Observabilidad mínima.** Los errores del cliente llegan a un lugar que un
  humano mira (Sentry o equivalente) y hay canal de soporte visible en la app.
- **G7 · Smoke test E2E manual firmado.** El golden path completo (registro →
  onboarding → check-in → Norman → una práctica → progreso) ejecutado en el deploy
  de prod/preview, fechado y con evidencia (PRELAUNCH_SMOKE_TEST.md).
- **G8 · Un extraño lo usó.** Al menos una persona que no es el dueño ni construyó
  la app completó el onboarding y el día 1 sin ayuda; sus tropiezos, documentados.
- **Umbral de scores:** todas las sillas ≥ 7.0.

### Criterios de entrada a F3 (cliente de pago)

Todo lo de F2 sostenido ≥ 2 semanas con betas reales, más:
pagos end-to-end verificados (o venta manual documentada); legal sin placeholders
y revisado por el dueño; D7 de la beta **medido**, no estimado; runbook de
incidentes + SLA de soporte; wearables activados o retirados de la UI; presupuesto
de IA por usuario definido. Todas las sillas ≥ 7.5, cero vetos.

### Criterios de entrada a F4 (tiendas)

Todo lo de F3, más: builds nativos reales probados en dispositivos físicos
(`eas init` hecho, TestFlight/internal track); checklist completo de App Store
(cuenta demo, privacy labels, IAP, kit UGC); E2E automatizado del golden path en
CI; rate limiting de IA server-side; alertas + backup/restore ensayado.
Todas las sillas ≥ 8.0, cero vetos.

### Criterios de entrada a F5

Crash-free ≥ 99.5%, D30 medido y estable, presupuestos de rendimiento en CI,
auditoría de seguridad externa, accesibilidad verificada con usuarios reales.

---

## Las reglas del veredicto (lo que lo hace difícil)

1. **La nota global es el MÍNIMO de las 8 sillas, no el promedio.** Una app es tan
   lanzable como su peor dimensión. Promediar esconde exactamente lo que mata.
2. **Evidencia o no existe.** Todo hallazgo cita `file:line`, salida de comando,
   corrida de CI o captura. Aplica igual a los elogios.
3. **El clone fresco manda.** Toda cifra de gate se toma de un clone limpio o del
   CI de GitHub. "En mi máquina pasa" no es evidencia — este repo ya vivió commits
   que decían "tsc limpio" con el CI rojo en cada push.
4. **El veto es personal.** Solo la silla que lo emitió puede levantarlo, en una
   re-evaluación, verificando el fix en el commit/deploy — nunca contra una promesa.
5. **Un peldaño por corrida.** Ninguna evaluación sube más de una fase, aunque los
   números den. La fase se sostiene, no se declara.
6. **Nada apagado se muestra encendido.** Feature en simulación, placeholder o
   pendiente de handoff: o la UI lo dice, o la silla 8 veta.
7. **Re-evaluación obligatoria** tras cada lote grande de merges, cada incidente
   con un cliente, o cada 2 semanas en beta — lo que llegue primero. Un veredicto
   tiene fecha de caducidad.
8. **El Círculo no repara.** Dictamina y prescribe; el fix es trabajo aparte. Un
   veredicto que se pone a arreglar cosas pierde la distancia que lo hace útil.

---

## Protocolo de ejecución

1. **Gates frescos primero** (en paralelo, en el entorno actual):
   `npx tsc --noEmit` · `npm run lint` · `npm test -- --ci` · `npm run witness` ·
   `npx expo export --platform web`. Registrar exit codes y cifras exactas.
2. **CI real:** consultar las últimas corridas del workflow CI en GitHub sobre
   `main` (y la rama de trabajo). CI rojo = hallazgo automático de la silla 5,
   sea cual sea la causa.
3. **Instanciar las 8 sillas** como agentes paralelos de solo lectura. Cada prompt
   lleva: la persona, su dominio (tabla de arriba), la escala de fases, la regla
   de evidencia obligatoria, y este formato de salida:
   `SCORE: n.n/10` · `FASE_MAXIMA_QUE_APRUEBAS` · `VETOS_PARA_F2` ·
   `VETOS_PARA_F3_F4` · `HALLAZGOS` (cada uno `[SEVERIDAD] título — file:line —
   por qué — fix en 1 línea`) · `LO_QUE_SÍ_ESTÁ_BIEN` · `VEREDICTO`.
4. **Verificación cruzada:** antes de firmar, el sintetizador verifica en el código
   al menos los hallazgos que sostienen cada veto (un veto con evidencia falsa se
   descarta y se anota).
5. **Síntesis** con la regla del mínimo y la tabla de fases. El veredicto declara:
   fase actual, score por silla, vetos abiertos numerados (con dueño: código vs
   handoff del dueño), y la checklist G1–G8 con su estado real.
6. **Escribir el veredicto** en `docs/evaluacion/VEREDICTO_CIRCULO_YYYY-MM-DD.md`
   (nunca sobrescribir uno anterior — la historia de veredictos es parte del valor)
   y actualizar la tabla resumen de `docs/evaluacion/README.md` si existe.

---

## Formato del veredicto

```markdown
# Veredicto del Círculo — YYYY-MM-DD
FASE DICTAMINADA: Fn (nombre)
NOTA GLOBAL: n.n/10 (mínimo de las sillas — silla que la fija)
| Silla | Score | Fase que aprueba | Vetos F2 |
|---|---|---|---|
...
## Vetos abiertos (numerados, con evidencia y dueño)
## Checklist G1–G8 hacia F2 (estado real de cada gate)
## Hallazgos por silla (consolidados, deduplicados)
## Lo que sí está bien (con evidencia)
## Condiciones exactas para la siguiente fase + re-evaluación programada
```
