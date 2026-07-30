# Evidencia científica del catálogo de bienestar — Polaris OS

**Fecha:** 2026-07-30 · **Alcance:** meditación, sueño, binaurales, respiración

Este documento existe para poder responder una pregunta sin improvisar: *¿en
qué se basa esta práctica?* — incluida la respuesta incómoda, que en varias es
"en nada publicado, y la conservamos igual por estas razones".

La regla que gobierna todo el sistema: **solo se cita lo que tiene respaldo
real, y lo que no lo tiene se queda sin sello.** Un catálogo donde las 44
tarjetas llevan sello no informa nada; el valor está en que se note la
diferencia.

---

## 1. Lo que sí tiene respaldo

Implementado en `data/wellnessEvidence.ts` y referenciado desde
`MeditationSession.evidence`. Los grados (`established` / `probable` /
`uncertain`) son los mismos de `data/internistKnowledge.ts` a propósito: una
app que gradúa la evidencia de un marcador de laboratorio con un criterio y la
de una meditación con otro no está graduando nada.

### `established` — guía consolidada, meta-análisis o RCT grande

| Clave | Fuente | Qué se midió exactamente |
|---|---|---|
| `MBSR_ANXIETY` | Hoge et al., **JAMA Psychiatry 2023** (N=276) | MBSR de 8 semanas **no fue inferior a escitalopram 10–20 mg** en trastornos de ansiedad. Es el resultado más fuerte del campo. |
| `CYCLIC_SIGHING` | Balban et al., **Cell Reports Medicine 2023** (Stanford) | 5 min/día de suspiro fisiológico mejoraron el ánimo y bajaron la frecuencia respiratoria **más que la meditación mindfulness** a 28 días. |
| `PMR_ANXIETY` | Meta-análisis de RCT, *Complement Ther Clin Pract* 2022 · revisión sistemática, *Psychol Res Behav Manag* 2023 | Efecto grande sobre ansiedad (SMD −1.32) y sobre calidad de sueño. |
| `MINDFULNESS_GENERAL` | Goyal et al., **JAMA Internal Medicine 2014** (47 ensayos, N=3.515) | Ansiedad d=0.38, depresión d=0.30, dolor d=0.33 a 8 semanas. |

### `probable` — RCT consistentes o evidencia observacional fuerte

| Clave | Fuente | Qué se midió |
|---|---|---|
| `YOGA_NIDRA_SLEEP` | Dutta et al., revisión sistemática de 6 RCT 2026 · RCT en insomnio crónico 2021 | Mejoras en latencia de sueño, tiempo total y eficiencia. **Riesgo de sesgo moderado-alto** en los estudios incluidos. |
| `LKM_POSITIVE_AFFECT` | Zeng et al., *Frontiers in Psychology* 2015 · Gu et al., *Applied Psychology: Health and Well-Being* 2022 | Efecto medio sobre emociones positivas. **El efecto sobre satisfacción vital desaparece frente a control activo** (g=0.106, ns). |
| `SLOW_BREATHING` | AHA — Levine et al., *JAHA* 2017 | Respiración diafragmática lenta (~6/min): reducciones modestas pero consistentes en presión arterial y marcadores inflamatorios. |

### `uncertain` — evidencia mixta o emergente

| Clave | Fuente | Qué se midió |
|---|---|---|
| `BINAURAL_BEATS` | Garcia-Argibay et al., *Psychological Research* 2019 | Efecto global g=0.45; g=0.69 en ansiedad para theta/delta. **Heterogeneidad alta y calidad metodológica variable.** |

---

## 2. Los límites que NO se omiten

La tentación en una app de bienestar es citar la mitad buena del estudio. Estos
límites están en el código, no solo aquí:

- **Goyal 2014 encontró efecto en ansiedad, depresión y dolor — y NO lo
  encontró en ánimo positivo, atención, sueño, hábitos alimenticios, consumo de
  sustancias ni peso.** Esa segunda mitad se omite casi siempre. Está en el
  campo `finding` de `MINDFULNESS_GENERAL`.
- **Compasión**: el efecto sobre autocompasión cae de d=.86 (contra lista de
  espera) a **d=.19 contra control activo**. Por eso se gradúa `probable` y no
  `established`.
- **Sueño**: **CBT-I es el tratamiento de primera línea** para insomnio crónico,
  y un meta-análisis 2023 encontró **ausencia de efecto** al añadir mindfulness
  a CBT-I. Nuestras prácticas de sueño acompañan el descanso; no tratan
  insomnio. El `SafetyWarning` de `sueno.tsx` ya lo dice y se conserva.
- **Dosis**: no hay relación dosis-respuesta demostrada. Los ensayos que
  compararon 10 vs 30 min no detectaron diferencia. Nuestro formato corto
  (4–10 min) no es una concesión: es lo que la evidencia soporta.
- **La evidencia respalda la TÉCNICA, no estas grabaciones.** Ningún estudio
  evaluó los audios de Norman. El componente `EvidenceBadge` lo dice literal en
  su variante completa.

---

## 3. Eventos adversos — por qué cambió el aviso

**Farias et al., *Acta Psychiatrica Scandinavica* 2020** (revisión sistemática):

- Prevalencia **8.3–22%** en poblaciones clínicas y no clínicas (33% en
  estudios observacionales; 3.7% en RCT).
- Más frecuentes: **ansiedad** (18 estudios), **depresión** (15), síntomas
  psicóticos o delirantes (10), **disociación / despersonalización** (9),
  miedo o terror (9).
- Ocurren **durante o inmediatamente después** de la práctica.

Polaris hace inducciones hipnóticas (La Inmersión: descenso corporal + conteo
descendente + anclaje). El aviso anterior cubría contraindicaciones *antes* de
empezar pero no decía nada sobre qué hacer *durante*.

**Cambio aplicado** en `meditacion.tsx` y `binaurales.tsx`: si durante la
práctica aumenta la angustia, aparece desconexión del cuerpo o del entorno, o
miedo intenso, la instrucción es **detener la sesión** — explícitamente "parar
es la respuesta correcta, no algo que haya que atravesar". En una práctica de
alto rendimiento la cultura por defecto es aguantar; aquí eso sería el consejo
equivocado.

---

## 4. Lo que NO tiene respaldo y se conserva igual

Esta es la sección que importa en una auditoría. Ninguna de estas prácticas
lleva sello de evidencia, y esa ausencia es deliberada.

### `consciencia.tsx` — Mapa de Niveles de Consciencia (Hawkins)

- **Base científica: ninguna.** Los valores "hz" no son frecuencias: son
  números de calibración de la obra de David Hawkins, sin validación
  independiente ni publicación revisada por pares.
- **Por qué se conserva**: decisión explícita del dueño (2026-07-30). Forma
  parte del material del curso Polaris y tiene valor como marco de
  autoexploración emocional, que es exactamente como lo presenta su
  `SafetyWarning`: *"herramienta de autoexploración, no un diagnóstico ni
  tratamiento"*.
- **Regla firme**: no lleva ni llevará `EvidenceBadge`, y su copy no debe
  adquirir lenguaje científico. Si algún día se le pone sello, este documento
  deja de ser cierto.

### `tapping.tsx` — EFT / Emotional Freedom Techniques

- Existe una literatura amplia (>200 ensayos), pero está **dominada por sus
  propios proponentes**, y los estudios de desmantelamiento que atribuyen el
  efecto a los puntos de acupuntura provienen de los mismos grupos que
  promueven la técnica.
- La explicación parsimoniosa de sus resultados es la exposición + la
  reestructuración cognitiva que el protocolo incluye, no el golpeteo.
- Se conserva sin sello. Su `SafetyWarning` ya lo enmarca como herramienta de
  autorregulación, no tratamiento.

### `grito.tsx` — liberación por grito

- Práctica catártica sin base en ensayos controlados. La literatura sobre
  catarsis es, si acaso, desfavorable.
- Se conserva con `SafetyWarning` en tono **danger** (el único del catálogo),
  que es la respuesta proporcional.

### Wim Hof y Tummo (en `BREATHING_TECHNIQUES`)

- **Riesgo real documentado**, no solo falta de evidencia: la hiperventilación
  provoca hipocapnia, retrasa el impulso de respirar y puede causar síncope.
  Hay **ahogamientos documentados** por desvanecimiento en agua tras estas
  respiraciones.
- El `SafetyWarning` de `respiracion.tsx` ya prohíbe explícitamente practicar
  **en el agua**, conduciendo o de pie. Ese aviso es el control crítico y se
  conserva tal cual.

### Las ~30 meditaciones sin sello

La mayor parte del catálogo (visualización, gratitud, intención, claridad para
decidir, identidad) son ejercicios de coaching bien construidos, no técnicas
con ensayos propios. Se conservan sin sello: **no llevan sello porque no lo
tienen, no porque falte investigarlas.**

---

## 5. Lo que se añadió por esta investigación

Cuatro sesiones nuevas, elegidas porque la investigación encontró que faltaban
justo las mejor respaldadas:

| Sesión | Por qué |
|---|---|
| `suspiro-fisiologico` (5 min) | La práctica breve con mejor evidencia que existe. Estaba en la app **solo como temporizador mudo**, nunca como sesión guiada. |
| `body-scan-diurno` (10 min) | Componente central de MBSR. Existía solo dentro de Sueño (`sos-2`), donde el objetivo es dormirse — no como práctica diurna, que es como se estudió. |
| `compasion-hacia-ti` (7 min) | De 41 sesiones, **cero** eran de compasión. Es la mitad de la familia LKM con mejor efecto. |
| `compasion-hacia-otro` (7 min) | La extensión clásica de metta, con efecto medido sobre actitudes interpersonales negativas. |

Categoría nueva `compasión` en `MEDITATION_CATEGORY_META`.

---

## 6. Invariantes que protegen esto en el tiempo

`__tests__/unit/wellnessEvidence.test.ts` bloquea las tres formas de degradar
el sistema:

1. **Sellos rotos** — toda `evidence` declarada apunta a una clave existente.
2. **Citas vagas** — toda cita debe contener un año. (Este test ya atrapó dos
   citas mías redactadas como "meta-análisis de RCT" sin fuente ni año.)
3. **Inflación de sellos** — menos del 50% del catálogo puede llevar evidencia.
   Si algún día se supera, es señal de que se está citando de más, no de que el
   catálogo mejoró.

`__tests__/unit/meditationNarration.test.ts` mantiene el invariante de duración
para las sesiones nuevas: la suma de fases debe cuadrar exacto con
`durationMinutes`.

---

## 7. Pendiente

- **Pad musical de la categoría `compasión`**: `wellness-audio/meditation/compasion.mp3`
  no existe. Sin él la práctica degrada al ruido procedural — funciona, pero no
  suena como las demás. Handoff opcional (Suno).
- **Voz**: los 29 mp3 de las 4 sesiones nuevas están generados en `.voice-out/`
  y pendientes de subir al bucket `norman-voice`, igual que el resto del
  catálogo.
