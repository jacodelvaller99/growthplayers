# El Segundo Norman — Plan de Producción de Voz Guiada

> **Norman 1** ya existe: es el mentor de **texto** (chat IA con cadena NVIDIA→Groq→OpenAI).
> **Norman 2** es lo nuevo: la **voz narrada** que guía cada meditación, respiración y práctica.
> Es la misma personalidad de Norman, pero hablada — clonada y duplicada para todo el contenido guiado.

**Estado de infraestructura hoy:** ❌ No existe ninguna capa de voz narrada en la app.
El único audio actual es el **motor binaural** (genera tonos, no voz). Todo lo de abajo es a construir.

---

## 1. Resumen ejecutivo — los 3 números clave

| Métrica | Cantidad |
|---------|----------|
| **Piezas de audio guiado a producir (biblioteca objetivo)** | **~95 sesiones** |
| **Segmentos/frases de voz individuales** | **~430 segmentos** |
| **Minutos de voz Norman 2 a generar** | **~520–580 min (~9–10 h)** |

Esto se divide en **3 fases**: (A) completar lo que ya tiene guión, (B) escribir lo que falta, (C) expandir la biblioteca.

---

## 2. Inventario actual — lo que YA tiene guión escrito

Esto está listo para producir voz HOY (solo falta generar el audio con la voz de Norman):

| Herramienta | Sesiones | Segmentos de voz | Duración | Estado guión |
|-------------|----------|------------------|----------|--------------|
| **Meditación** | 5 | 34 fases | 4–10 min c/u | ✅ Escrito |
| **Respiración** | 4 técnicas | 12 labels + 4 intros | <5 min | ✅ Escrito (corto) |
| **Grito de Liberación** | 1 (3 modos) | ~10 instrucciones | 8–15 min | ✅ Escrito |
| **Tapping EFT** | 1 (9 puntos) | ~19 afirmaciones | 20–30 min | ✅ Escrito (con variable [EMOCIÓN]) |
| **Ayuno** | 6 etapas | 10 descripciones | transición | ✅ Escrito |
| **Hub diario** | 30 frases | 30 frases estoicas | <15 s c/u | ✅ Escrito |
| **SUBTOTAL listo** | **~12 flujos** | **~119 segmentos** | — | **✅ Producible ya** |

### Detalle de las 5 meditaciones actuales (data/wellness.ts)
1. **Despertar Consciente** — 5 min · mañana · 6 fases
2. **Calma Profunda** — 10 min · estrés · 8 fases
3. **Enfoque Total** — 7 min · enfoque · 7 fases
4. **Cierre del Día** — 8 min · noche · 8 fases
5. **Respiración 4-7-8** — 4 min · estrés · 6 fases

> Las 4 categorías de meditación hoy son: `mañana · noche · enfoque · estrés`.
> Cada categoría tiene solo **1–2 sesiones** → poca variedad. Esto es lo que hay que expandir (ver §4).

---

## 3. Lo que falta ESCRIBIR (guión incompleto)

La sección **Sueño** tiene 9 piezas definidas en la UI pero **sin guión narrado escrito** — solo título y descripción. Son las piezas más largas (las de mayor trabajo de redacción):

| Categoría Sueño | Pieza | Duración | Guión |
|-----------------|-------|----------|-------|
| S.O.S para dormir | Relajación de Emergencia | ~8 min | ❌ Escribir |
| S.O.S para dormir | Body Scan Rápido | ~10 min | ❌ Escribir |
| Historias para dormir | El Bosque de las Secuoyas | 20 min | ❌ Escribir |
| Historias para dormir | La Orilla del Mar Tranquilo | 25 min | ❌ Escribir |
| Historias para dormir | Cabaña en las Montañas | 18 min | ❌ Escribir |
| Yoga Nidra | Nidra Intro | 20 min | ❌ Escribir |
| Yoga Nidra | Nidra Profundo | 40 min | ❌ Escribir |
| Relajaciones | Relajación Muscular Progresiva (Jacobson) | 15 min | ❌ Escribir |
| Relajaciones | Coherencia Cardíaca Nocturna | 12 min | ❌ Escribir |
| **SUBTOTAL** | **9 piezas** | **~168 min** | **❌ ~14.000 palabras de guión** |

---

## 4. Biblioteca OBJETIVO — cuántas meditaciones crear

Hoy hay poca variedad (1–2 por categoría). Para una biblioteca robusta alineada al **Protocolo Soberano de 90 días**, esta es la recomendación de expansión.

### 4.1 Meditación guiada — expandir de 5 → 40 sesiones

| Categoría | Hoy | Objetivo | A crear | Razón |
|-----------|-----|----------|---------|-------|
| **Mañana / Despertar** | 1 | 6 | +5 | Una por estado: energía, claridad, intención, gratitud, activación |
| **Noche / Cierre** | 1 | 6 | +5 | Cierre, descarga, perdón, revisión, sueño |
| **Enfoque / Deep Work** | 1 | 6 | +5 | Pre-bloque, reset, modo mercader, claridad de objetivo |
| **Estrés / Calma** | 2 | 6 | +4 | Ansiedad, presión, decisión difícil, regulación |
| **Identidad / Visualización** ⭐ nueva | 0 | 6 | +6 | El yo soberano, futuro a 5 años, identidad declarada |
| **Decisión / Estrategia** ⭐ nueva | 0 | 5 | +5 | Claridad antes de decidir, soltar el ruido |
| **Energía / Activación** ⭐ nueva | 0 | 5 | +5 | Pre-entreno, recarga mediodía, picos de fatiga |
| **TOTAL Meditación** | **5** | **40** | **+35** | |

### 4.2 Sueño — completar las 9 + expandir a 15

| Bloque | Hoy (sin guión) | Objetivo | A crear |
|--------|------|----------|---------|
| S.O.S para dormir | 2 | 3 | +1 (y escribir las 2) |
| Historias para dormir | 3 | 6 | +3 (y escribir las 3) |
| Yoga Nidra | 2 | 3 | +1 (y escribir las 2) |
| Relajaciones | 2 | 3 | +1 (y escribir las 2) |
| **TOTAL Sueño** | **9** | **15** | **+6 nuevas + 9 a escribir** |

### 4.3 Respiración — expandir de 4 → 8 técnicas

Las 4 actuales (4-7-8, Box, 5·5, Wim Hof) son sólidas. Añadir narración de intro + 4 técnicas más:
Respiración fisiológica (doble inhalación), Nadi Shodhana (alterna), 2:1 (exhalación larga), Tummo simplificada.

### 4.4 Prácticas somáticas/emocionales — con narración Norman 2

| Práctica | Hoy | Objetivo | Nota |
|----------|-----|----------|------|
| Grito de Liberación | 1 (3 modos) | 1 + narración completa | Guiar las 4 fases con voz |
| Tapping EFT | 1 (9 puntos) | 3 secuencias temáticas | Ansiedad, abundancia, autoexigencia |
| Ayuno (narración de etapa) | 6 etapas | 6 + audio de transición | Voz al cambiar de etapa |

### 4.5 Micro-audios diarios (alta rotación)

| Tipo | Hoy | Objetivo |
|------|-----|----------|
| Frase estoica diaria (Hub) | 30 | 90 (una por día del protocolo) |
| Insight biométrico (Norman) | dinámico | generado por IA + voz |
| Recordatorio del Norte | 0 | 7 (uno por no-negociable) |

---

## 5. Total consolidado a producir

| Bloque | Sesiones | Minutos voz aprox. |
|--------|----------|--------------------|
| Meditación guiada (40) | 40 | ~280 min |
| Sueño (15, largos) | 15 | ~210 min |
| Respiración (8, con intro) | 8 | ~24 min |
| Grito + Tapping (4) | 4 | ~50 min |
| Ayuno (6 transiciones) | 6 | ~12 min |
| Micro-audios diarios (90+) | ~97 | ~25 min |
| **TOTAL** | **~95 sesiones** | **~520–580 min (~9–10 h)** |

**Volumen de guión a redactar:** lo nuevo (§3 + §4) ≈ **40.000–48.000 palabras** de scripts de meditación.

---

## 6. Cómo se produce el "Segundo Norman" (pipeline técnico)

### 6.1 Clonación de voz
1. **Grabar a Norman** leyendo un set de calibración (5–20 min de audio limpio en estudio).
2. Crear una **voz clonada** en un motor TTS de alta fidelidad (ElevenLabs Voice Cloning es el estándar para narración tipo meditación; alternativas: PlayHT, Cartesia).
3. Esto produce un `voice_id` reutilizable → **"se duplica" para todo el contenido** (exactamente lo que pides).

### 6.2 Generación de audio (batch)
- Cada `phase.text` del catálogo → una llamada TTS → un archivo `.mp3`.
- Parámetros de meditación: velocidad lenta, estabilidad alta, pausas entre frases.
- Se generan en lote desde un script (Node) que recorre `data/wellness.ts` y las sleep stories.

### 6.3 Almacenamiento y entrega
- Subir los `.mp3` a **Supabase Storage** (bucket `norman-voice/`).
- La app descarga/streamea por `id` de sesión y fase.
- Cache local para offline (las prácticas funcionan sin red).

### 6.4 Integración en la app
- Añadir `expo-audio` (o `expo-av`) — **hoy no está instalado**.
- El player de meditación sincroniza: voz Norman 2 + tono binaural de fondo + ambiente (lluvia/bosque/océano).
- Mezcla de 3 capas: **voz (frente) · binaural (medio) · ambiente (fondo)**.

### 6.5 Dinámico (futuro)
- El insight biométrico y el despacho de Norman son texto generado por IA → se pueden pasar por TTS en tiempo real para voz on-demand.

---

## 7. Roadmap de producción por fases

| Fase | Alcance | Sesiones | Esfuerzo |
|------|---------|----------|----------|
| **F0 · Infraestructura** | Clonar voz Norman, instalar expo-audio, bucket Supabase, player 3-capas | — | Setup técnico |
| **F1 · MVP (lo ya escrito)** | 5 meditaciones + 4 respiraciones + Grito + Tapping + 30 frases | ~12 flujos | Solo generar audio |
| **F2 · Sueño** | Escribir + producir las 9 piezas de sueño | 9 | Redacción pesada |
| **F3 · Expansión meditación** | +35 meditaciones nuevas (7 categorías) | 35 | Redacción + audio |
| **F4 · Completar** | Respiración x4, Tapping temático x3, micro-audios diarios | ~34 | Redacción + audio |
| **TOTAL** | **Biblioteca completa Norman 2** | **~95** | |

---

## 8. Decisiones que necesito de ti antes de arrancar

1. **Motor de voz:** ¿ElevenLabs (recomendado para meditación), u otro?
2. **¿Norman grabará su voz real para clonarla**, o usamos una voz sintética que represente a Norman?
3. **Prioridad:** ¿arrancamos por F1 (lo ya escrito, rápido) o por la expansión de meditaciones (F3)?
4. **Idioma:** ¿solo español, o también inglés para escalar?
5. **¿Quieres que empiece a escribir los guiones** de las sesiones nuevas (§3 y §4) desde ya?
