# Biometric Intelligence Layer

> Cómo Polaris convierte datos crudos de wearables en una **lectura accionable del cuerpo** —
> para el cliente (acompañamiento) y para el mentor (decisión) — y la conecta con la memoria de Norman.

## El problema que resuelve

Un wearable produce números (HRV, sueño, recuperación). Esos números, solos, no cambian conducta:
el cliente no sabe qué hacer con un "HRV de 42ms" y el mentor no tiene tiempo de leer dashboards por
cliente. La **capa de inteligencia biométrica** traduce la señal en estados interpretables, drivers
explícitos y una recomendación de intervención — sin pretender ser diagnóstico clínico.

Conecta con la tesis del consejo asesor (prioridad #1: una sola salida — capacidad operativa del
fundador en 90 días) cerrando el loop **medir → diagnosticar → actuar**: el cuerpo entra al circuito
de decisión, no como vanity metric sino como input de carga/recuperación.

## Qué hace

1. **Normaliza** cualquier proveedor (Oura/WHOOP/sintético) al modelo canónico `wearable_daily`
   (reutiliza la capa existente — no se duplicó nada).
2. **Interpreta** cada día en 6 estados explicables: sueño, recuperación, coherencia (HRV/FC vs base),
   riesgo de fatiga, tendencia (ventana de 7d) y **nivel de intervención** (seguir/observar/atender/urgente).
   Cada lectura expone sus *drivers* ("Sueño corto 5.4h · HRV −22% vs base · Tendencia a la baja").
3. **Diferencia audiencia:** el mentor ve la lectura técnica (`coach_safe_summary` + drivers + estados);
   el cliente ve una versión de apoyo (`client_safe_summary`: "Tu cuerpo viene cargando — hoy prioriza
   descanso") sin jerga ni alarma.
4. **Alimenta la memoria:** las reflexiones de bienestar del cliente entran al Memory OS como resúmenes
   (`source_type='wellness'`) — Norman conecta lo subjetivo ("me siento con energía") con lo objetivo
   ("pero tu recuperación está débil") y puede confrontar el desajuste.
5. **Datos sintéticos deterministas:** un simulador sembrado genera 7 escenarios narrativos (semana
   sólida, desgaste, recuperación, sueño inestable, post-viaje, carga alta, recuperación baja) para
   demo/ventas/QA sin depender de un wearable físico — misma semilla, misma serie (testeable).

## Arquitectura (patrón puro/IO, igual que Memory OS y Mentor Execution OS)

- **`lib/biometricLogic.ts`** — lógica PURA, sin IO: `sleepState`/`recoveryState`/`coherenceState`/
  `fatigueRisk`/`trendState`/`interventionLevel` + `computeInsight` (drivers + resúmenes coach/cliente)
  + `reflectionMismatch` + `computeBaseline`. **Testeada** (31 tests de lógica pura).
- **`lib/biometricSimulator.ts`** — generador determinista (PRNG mulberry32 sembrado, sin `Math.random`)
  de los 7 escenarios.
- **`lib/biometric.ts`** — IO degradable (try/catch → vacío): lee series, computa+persiste insights,
  canaliza reflexiones al Memory OS, siembra datos sintéticos, dashboard cross-client.
- **Migración `20260617000000_biometric_intelligence.sql`** — extiende `wearable_daily`
  (respiratory_rate, signal_confidence, proveedor 'synthetic'), `wearable_connections` (estado de sync),
  `journal_entries` (capa de reflexión), `memory_summaries` (source_type 'wellness') y añade SOLO la
  tabla nueva `biometric_insights` (owner+admin por RLS).
- **UI:** tarjetas en `components/biometric.tsx`; sección Biométricos en `app/admin/usuarios/[id]`;
  dashboard cross-client `app/admin/biometria.tsx`; lectura "Tu cuerpo hoy" + captura de reflexión en
  `app/perfil/cliente.tsx`.

## Privacidad y seguridad

- `biometric_insights` es **owner+admin** por RLS; el cliente ve solo su `client_safe_summary` (la UI
  no expone el `coach_safe_summary`).
- **No es diagnóstico clínico** — es coaching intelligence; el lenguaje y los disclaimers existentes de
  salud se mantienen.
- Toda lectura/escritura degrada a vacío: sin migración aplicada o sin red, la app no rompe.

## Estado

- ✅ Lógica + simulador + IO + UI admin/cliente implementados. **31 tests** de lógica pura (134 total).
  tsc 0 · lint 0 errores · export web OK.
- ✅ Migración aplicada en producción vía dashboard.
- Handoff: la generación de insights desde datos **reales** de wearable corre client-side on-read hoy;
  moverla al cron de `sync-wearables` (server-side) queda como evolución (igual que el scoring de
  ejecución). El simulador cubre demo/ventas sin wearable físico.
