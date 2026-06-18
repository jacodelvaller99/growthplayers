/**
 * internistKnowledge — base de conocimiento educativa del internista de Polaris.
 *
 * NO es un sustituto de criterio clínico. Cada ítem está anclado en una guía
 * o consenso ampliamente aceptado (USPSTF, NIH/MedlinePlus, Mayo Clinic,
 * ACLM, Endocrine Society, ATA, ADA, NCEP/AHA, Cochrane, ISSN, WHO).
 * Los rangos son referencias TÍPICAS para adultos sanos — un médico
 * puede interpretarlos diferente según el contexto del paciente.
 *
 * Estructura intencional: datos como constantes (no inventan, no cambian
 * en runtime), lógica de clasificación en `lib/internistLogic.ts`.
 *
 * Reglas duras del internista (ver `lib/internist.ts` para el system prompt):
 *  1. EDUCATIVO, no diagnóstico. Nunca dice "tienes X".
 *  2. Cita la fuente cuando hace una afirmación clínica.
 *  3. Ante red-flag → para de educar, deriva a médico/urgencias.
 *  4. Reconoce incertidumbre. Conservador por diseño.
 *  5. No prescribe. No ajusta dosis. No reemplaza al médico real.
 */

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type EvidenceGrade =
  | 'established' // guía consolidada, meta-análisis o RCT grande
  | 'probable'    // RCTs medianos consistentes o evidencia observacional fuerte
  | 'uncertain';  // evidencia mixta, débil o emergente

export type Severity = 'urgent' | 'soon' | 'routine';

export interface LabMarker {
  /** Identificador estable (snake_case). */
  key: string;
  /** Nombre completo en castellano. */
  name: string;
  /** Sinónimos / aliases para parseo de PDFs / typing por el usuario. */
  aliases: string[];
  /** Unidad estándar (el internista pide convertir si el usuario reporta otra). */
  unit: string;
  /** Rango de referencia bajo (adulto sano típico). */
  low: number;
  /** Rango de referencia alto (adulto sano típico). */
  high: number;
  /** Umbral por debajo del cual conviene atención médica pronta. null = sin umbral crítico inferior. */
  criticalLow?: number | null;
  /** Umbral por encima del cual conviene atención médica pronta. */
  criticalHigh?: number | null;
  /** Qué evalúa (lenguaje educativo). */
  whatItMeasures: string;
  /** Significado educativo si está bajo. */
  educationalLow: string;
  /** Significado educativo si está alto. */
  educationalHigh: string;
  /** Fuente real consultada (organismo + año). */
  citation: string;
  /** Nivel de evidencia del rango (la mayoría son 'established'). */
  evidence: EvidenceGrade;
}

export interface LifestyleFact {
  topic: string;
  educationalExplanation: string;
  citation: string;
  evidence: EvidenceGrade;
}

export interface RedFlagRule {
  /** Patrón / síntoma / cifra que dispara la regla. */
  trigger: string;
  /** Por qué es urgente — fundamento educativo. */
  rationale: string;
  /** Severidad → acción esperada. */
  severity: Severity;
  /** Acción concreta a recomendar al usuario. */
  action: string;
  /** Fuente que respalda la urgencia. */
  citation: string;
}

// ─── Marcadores de laboratorio comunes ────────────────────────────────────────
// Rangos en unidades convencionales (US). El internista pide al usuario convertir
// si recibe unidades SI (ej. glucosa en mmol/L → mg/dL × 18.018).

export const LAB_MARKERS: LabMarker[] = [
  // ── Metabólicos ─────────────────────────────────────────────────────────────
  {
    key: 'glucose_fasting',
    name: 'Glucosa en ayunas',
    aliases: ['glucemia', 'glucemia basal', 'fasting glucose', 'glucosa basal'],
    unit: 'mg/dL',
    low: 70, high: 99,
    criticalLow: 54, criticalHigh: 250,
    whatItMeasures: 'Azúcar en sangre tras 8h sin comer. Refleja el control basal de la glucosa.',
    educationalLow: 'Una glucosa baja en ayunas puede asociarse a hipoglucemia, ayunos prolongados o, raramente, condiciones endocrinas. Si va acompañada de sudoración, temblor o desmayo, se considera urgente.',
    educationalHigh: 'Una glucosa elevada en ayunas se asocia educativamente a la categoría de "prediabetes" (100–125 mg/dL) o "diabetes" (≥126 mg/dL en dos mediciones), criterios definidos por la American Diabetes Association. El diagnóstico lo hace un médico, no este texto.',
    citation: 'American Diabetes Association — Standards of Care in Diabetes (2024)',
    evidence: 'established',
  },
  {
    key: 'hba1c',
    name: 'Hemoglobina glicosilada (HbA1c)',
    aliases: ['a1c', 'hemoglobina glicada', 'glycated hemoglobin'],
    unit: '%',
    low: 4.0, high: 5.6,
    criticalLow: null, criticalHigh: 10,
    whatItMeasures: 'Promedio de glucosa en sangre de los últimos ~3 meses. Más estable que la glucosa puntual.',
    educationalLow: 'Valores muy bajos son inusuales y pueden requerir contexto (anemia, transfusiones recientes).',
    educationalHigh: 'Según ADA: 5.7–6.4% se etiqueta educativamente como "prediabetes", ≥6.5% cumple criterio de "diabetes". Sirve también para evaluar el control en personas ya diagnosticadas. La interpretación individual la hace el médico.',
    citation: 'American Diabetes Association — Standards of Care (2024)',
    evidence: 'established',
  },
  // ── Perfil lipídico ─────────────────────────────────────────────────────────
  {
    key: 'ldl_cholesterol',
    name: 'Colesterol LDL',
    aliases: ['ldl', 'colesterol malo', 'low-density lipoprotein'],
    unit: 'mg/dL',
    low: 0, high: 100,
    criticalLow: null, criticalHigh: 190,
    whatItMeasures: 'Lipoproteína que transporta colesterol y que, en exceso, se asocia a aterosclerosis (placas en arterias).',
    educationalLow: 'No suele ser problema clínico estar por debajo del rango.',
    educationalHigh: 'Un LDL alto se asocia educativamente a mayor riesgo cardiovascular. Los objetivos individuales dependen del riesgo cardiovascular global (calculado por un médico), no de un único valor.',
    citation: 'AHA/ACC — Cholesterol Clinical Practice Guideline (2018, vigente)',
    evidence: 'established',
  },
  {
    key: 'hdl_cholesterol',
    name: 'Colesterol HDL',
    aliases: ['hdl', 'colesterol bueno', 'high-density lipoprotein'],
    unit: 'mg/dL',
    low: 40, high: 90,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Lipoproteína que transporta colesterol "de retorno" al hígado. Niveles más altos se asocian a menor riesgo cardiovascular.',
    educationalLow: 'HDL bajo (<40 mg/dL hombres, <50 mg/dL mujeres) se asocia educativamente a mayor riesgo cardiovascular. La actividad física aeróbica regular es la intervención no farmacológica con mejor evidencia para subirlo.',
    educationalHigh: 'Valores muy altos no son típicamente "mejor" — la curva de riesgo no es lineal en extremos.',
    citation: 'AHA/ACC — Cholesterol Clinical Practice Guideline (2018)',
    evidence: 'established',
  },
  {
    key: 'triglycerides',
    name: 'Triglicéridos',
    aliases: ['tg', 'triglicéridos'],
    unit: 'mg/dL',
    low: 0, high: 150,
    criticalLow: null, criticalHigh: 500,
    whatItMeasures: 'Grasas circulantes. Se elevan con dietas altas en azúcares simples y alcohol.',
    educationalLow: 'Sin relevancia clínica conocida.',
    educationalHigh: '150–199 mg/dL = "limítrofe alto", 200–499 = "alto", ≥500 = "muy alto" (riesgo de pancreatitis). El estilo de vida (azúcar, alcohol, peso, ejercicio) tiene gran impacto.',
    citation: 'AHA — Triglycerides and Cardiovascular Disease Scientific Statement (2011)',
    evidence: 'established',
  },
  // ── Tiroides ────────────────────────────────────────────────────────────────
  {
    key: 'tsh',
    name: 'Hormona estimulante del tiroides (TSH)',
    aliases: ['tsh', 'thyroid stimulating hormone', 'tirotropina'],
    unit: 'mIU/L',
    low: 0.4, high: 4.0,
    criticalLow: 0.1, criticalHigh: 10,
    whatItMeasures: 'Hormona de la hipófisis que regula la función tiroidea. Es la primera prueba para evaluar el tiroides.',
    educationalLow: 'TSH bajo puede sugerir hipertiroidismo. Se interpreta junto a T4 libre.',
    educationalHigh: 'TSH alto puede sugerir hipotiroidismo. Entre 4.5–10 mIU/L se considera "subclínico" y la decisión de tratar la toma un endocrinólogo según síntomas y otros marcadores.',
    citation: 'American Thyroid Association — Guidelines on Hypothyroidism (2014)',
    evidence: 'established',
  },
  // ── Vitaminas y minerales ───────────────────────────────────────────────────
  {
    key: 'vitamin_d_25oh',
    name: 'Vitamina D (25-hidroxivitamina D)',
    aliases: ['vitamina d', 'vit d', '25-oh-d', 'calcidiol'],
    unit: 'ng/mL',
    low: 30, high: 100,
    criticalLow: 10, criticalHigh: 150,
    whatItMeasures: 'Reserva corporal de vitamina D. Implicada en metabolismo óseo, inmunidad y función muscular.',
    educationalLow: '<20 ng/mL se etiqueta como "deficiencia", 20–29 "insuficiencia". La Endocrine Society sugiere suplementación cuando es deficitaria; la dosis depende del nivel y del médico.',
    educationalHigh: '>100 ng/mL puede asociarse a toxicidad por hipercalcemia (raro, casi siempre por sobre-suplementación).',
    citation: 'Endocrine Society — Vitamin D Clinical Practice Guideline (2011, actualizada 2024)',
    evidence: 'established',
  },
  {
    key: 'vitamin_b12',
    name: 'Vitamina B12',
    aliases: ['b12', 'cobalamina'],
    unit: 'pg/mL',
    low: 200, high: 900,
    criticalLow: 150, criticalHigh: null,
    whatItMeasures: 'Vitamina esencial para nervios y producción de glóbulos rojos. Riesgo de deficiencia en dieta vegana sin suplemento, malabsorción o ciertos medicamentos (metformina, IBP a largo plazo).',
    educationalLow: 'Deficiencia puede causar anemia y problemas neurológicos. Niveles <200 pg/mL típicamente requieren evaluación.',
    educationalHigh: 'Valores altos sin suplementación deben evaluarse — pueden tener causas no nutricionales.',
    citation: 'NIH Office of Dietary Supplements — Vitamin B12 (2024)',
    evidence: 'established',
  },
  {
    key: 'ferritin',
    name: 'Ferritina',
    aliases: ['ferritina'],
    unit: 'ng/mL',
    low: 30, high: 300,
    criticalLow: 15, criticalHigh: null,
    whatItMeasures: 'Reserva de hierro del cuerpo. Más sensible que el hierro sérico para evaluar depósitos.',
    educationalLow: 'Ferritina <30 ng/mL sugiere depósitos bajos. <15 es indicativo de deficiencia franca. Causas frecuentes: pérdidas (menstruación abundante, sangrado digestivo) o ingesta insuficiente.',
    educationalHigh: 'Niveles altos pueden indicar inflamación, enfermedad hepática o sobrecarga de hierro (hemocromatosis). Requiere contexto clínico.',
    citation: 'British Society for Haematology — Iron Deficiency Guideline (2021)',
    evidence: 'established',
  },
  // ── Función renal / hepática ────────────────────────────────────────────────
  {
    key: 'creatinine',
    name: 'Creatinina',
    aliases: ['creatinina'],
    unit: 'mg/dL',
    low: 0.6, high: 1.2,
    criticalLow: null, criticalHigh: 2.0,
    whatItMeasures: 'Producto del metabolismo muscular eliminado por el riñón. Marcador básico de función renal.',
    educationalLow: 'Suele asociarse a masa muscular baja, no a enfermedad.',
    educationalHigh: 'Valores elevados pueden sugerir filtrado renal reducido. El cálculo del filtrado glomerular estimado (eGFR) es más útil que la creatinina aislada.',
    citation: 'KDIGO — Clinical Practice Guideline for the Evaluation of CKD (2024)',
    evidence: 'established',
  },
  {
    key: 'alt',
    name: 'ALT (Alanina aminotransferasa)',
    aliases: ['alt', 'tgp'],
    unit: 'U/L',
    low: 0, high: 40,
    criticalLow: null, criticalHigh: 200,
    whatItMeasures: 'Enzima hepática. Su elevación se asocia a inflamación o daño del hígado.',
    educationalLow: 'Sin relevancia clínica conocida.',
    educationalHigh: 'Elevación leve es frecuente y puede asociarse a hígado graso (NAFLD), medicamentos, alcohol o ejercicio reciente intenso. Elevaciones marcadas (>3× límite superior) ameritan evaluación.',
    citation: 'ACG — Clinical Guideline: Evaluation of Abnormal Liver Chemistries (2017)',
    evidence: 'established',
  },
  // ── Inflamación / cardiovascular ────────────────────────────────────────────
  {
    key: 'hs_crp',
    name: 'Proteína C reactiva ultrasensible (hs-CRP)',
    aliases: ['hs-crp', 'pcr ultrasensible', 'high-sensitivity crp'],
    unit: 'mg/L',
    low: 0, high: 1,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Marcador de inflamación sistémica. En personas sin infección aguda, refleja inflamación crónica de bajo grado.',
    educationalLow: '<1 mg/L = riesgo cardiovascular relativo bajo (categoría AHA/CDC).',
    educationalHigh: '1–3 mg/L = riesgo intermedio; >3 mg/L = riesgo alto. Una infección, lesión o procedimiento reciente puede elevarla transitoriamente — repetir tras 2 semanas si fue inesperada.',
    citation: 'AHA/CDC — Markers of Inflammation and Cardiovascular Disease (2003, vigente)',
    evidence: 'established',
  },
  // ── Hormonal ────────────────────────────────────────────────────────────────
  {
    key: 'testosterone_total',
    name: 'Testosterona total',
    aliases: ['testosterona', 'testosterone'],
    unit: 'ng/dL',
    low: 300, high: 1000,
    criticalLow: 200, criticalHigh: null,
    whatItMeasures: 'Hormona sexual masculina (presente también en mujeres en menor cantidad). Influye en libido, masa muscular, ánimo y densidad ósea.',
    educationalLow: 'En hombres, valores <300 ng/dL acompañados de síntomas (fatiga persistente, libido bajo, pérdida de masa muscular) pueden orientar hacia "hipogonadismo". El diagnóstico requiere al menos dos mediciones matutinas y evaluación por endocrinólogo.',
    educationalHigh: 'Valores altos en quien no usa terapia hormonal son inusuales — requieren contexto.',
    citation: 'Endocrine Society — Testosterone Therapy in Men with Hypogonadism (2018)',
    evidence: 'established',
  },
  // ── Hematología ─────────────────────────────────────────────────────────────
  {
    key: 'hemoglobin',
    name: 'Hemoglobina',
    aliases: ['hb', 'hemoglobina'],
    unit: 'g/dL',
    low: 12.0, high: 17.5,
    criticalLow: 8.0, criticalHigh: 19.0,
    whatItMeasures: 'Proteína de los glóbulos rojos que transporta oxígeno. Marcador clave de anemia y oxigenación.',
    educationalLow: 'Hemoglobina baja se llama "anemia". Causas frecuentes: deficiencia de hierro, sangrado oculto, déficit de B12/folato, enfermedad crónica.',
    educationalHigh: 'Valores altos pueden asociarse a deshidratación, tabaquismo crónico, vivir a gran altitud o trastornos hematológicos.',
    citation: 'Mayo Clinic — Complete Blood Count Reference (2024)',
    evidence: 'established',
  },
  // ── Electrolitos críticos ───────────────────────────────────────────────────
  {
    key: 'potassium',
    name: 'Potasio',
    aliases: ['k', 'potasio'],
    unit: 'mmol/L',
    low: 3.5, high: 5.0,
    criticalLow: 3.0, criticalHigh: 5.5,
    whatItMeasures: 'Electrolito esencial para la función cardíaca y muscular.',
    educationalLow: 'Niveles bajos pueden causar debilidad muscular y arritmias. <3.0 mmol/L se considera grave.',
    educationalHigh: 'Niveles altos también pueden causar arritmias. >5.5 mmol/L amerita atención médica.',
    citation: 'KDIGO — Potassium Disorders (2023)',
    evidence: 'established',
  },
];

// ─── Hechos de lifestyle medicine (evidencia consolidada) ─────────────────────

export const LIFESTYLE_FACTS: LifestyleFact[] = [
  {
    topic: 'Sueño de 7–9 horas en adultos',
    educationalExplanation: 'Dormir entre 7 y 9 horas se asocia educativamente a mejor metabolismo de glucosa, regulación del apetito, consolidación de memoria, función inmune y menor mortalidad. Dormir menos de 6h o más de 9h se asocia a peores marcadores en estudios poblacionales grandes.',
    citation: 'National Sleep Foundation — Sleep Duration Recommendations (Hirshkowitz et al., Sleep Health 2015) + American Academy of Sleep Medicine consensus',
    evidence: 'established',
  },
  {
    topic: 'Ejercicio aeróbico ≥150 min/semana de intensidad moderada',
    educationalExplanation: 'Reduce mortalidad por todas las causas, mejora sensibilidad a la insulina, baja presión arterial, mejora HDL y reduce riesgo de depresión. Añadir 2× semana de fuerza añade beneficios independientes en masa muscular y mortalidad.',
    citation: 'WHO — Guidelines on Physical Activity (2020) · ACSM — Position Stand on Quantity and Quality of Exercise (2011)',
    evidence: 'established',
  },
  {
    topic: 'Patrón dietético mediterráneo',
    educationalExplanation: 'Asociado en RCT a reducción del 30% en eventos cardiovasculares mayores en personas con riesgo alto (estudio PREDIMED). Características: aceite de oliva extra virgen, vegetales, frutos secos, pescado, legumbres, granos integrales; limita carnes rojas procesadas y azúcar añadido.',
    citation: 'PREDIMED Study — Estruch et al., New England Journal of Medicine 2013, reanalysis 2018',
    evidence: 'established',
  },
  {
    topic: 'Entrenamiento de fuerza 2–3 veces/semana',
    educationalExplanation: 'Preserva masa muscular y función con el envejecimiento. Reduce riesgo de caídas, mejora densidad ósea, control glucémico y mortalidad por todas las causas — incluso en dosis bajas (1×/semana). El efecto sobre mortalidad se observa por encima del ejercicio aeróbico.',
    citation: 'ACSM Position Stand — Progression Models in Resistance Training (2009) · Momma et al., Br J Sports Med 2022 (meta-análisis)',
    evidence: 'established',
  },
  {
    topic: 'Creatina monohidrato (3–5 g/día) en adultos sanos',
    educationalExplanation: 'Suplemento con evidencia robusta para mejorar fuerza, masa magra y rendimiento en ejercicio de alta intensidad. Perfil de seguridad sólido en adultos sanos con función renal normal. El uso en condiciones específicas (renales, neurológicas) lo decide un médico.',
    citation: 'International Society of Sports Nutrition — Position Stand on Creatine (Kreider et al., JISSN 2017)',
    evidence: 'established',
  },
  {
    topic: 'Vitamina D — suplementar solo si hay déficit confirmado',
    educationalExplanation: 'El ensayo VITAL (>25k personas) no encontró reducción de eventos cardiovasculares o cáncer con suplementación rutinaria en personas sin déficit. La recomendación ampliamente aceptada es medir nivel y suplementar solo si está bajo, no como práctica universal.',
    citation: 'VITAL Trial — Manson et al., NEJM 2019 · Endocrine Society Guideline 2024',
    evidence: 'established',
  },
  {
    topic: 'Manejo del estrés crónico (mindfulness, respiración, terapia)',
    educationalExplanation: 'El estrés crónico eleva cortisol, presión arterial, inflamación y resistencia a la insulina. Intervenciones como MBSR (mindfulness-based stress reduction), respiración lenta diafragmática (~6 respiraciones/min) y terapia cognitivo-conductual muestran reducciones modestas pero consistentes en presión arterial y marcadores inflamatorios.',
    citation: 'Cochrane Review — Mindfulness for Chronic Conditions (2020) · AHA Scientific Statement on Meditation and CVD Risk (2017)',
    evidence: 'probable',
  },
  {
    topic: 'Ayuno intermitente (16:8, 18:6, 5:2)',
    educationalExplanation: 'En meta-análisis, produce pérdida de peso comparable (no superior) a la restricción calórica continua. No hay evidencia robusta de que sea metabólicamente superior por sí mismo. Es una herramienta válida para quien tolera mejor la ventana alimenticia, no un imperativo de salud.',
    citation: 'Cochrane Review — Intermittent Fasting for Weight Loss (2021) · Trepanowski et al., JAMA Intern Med 2017',
    evidence: 'probable',
  },
  {
    topic: 'HRV (variabilidad de frecuencia cardíaca) como marcador del sistema nervioso autónomo',
    educationalExplanation: 'HRV refleja el tono vagal/equilibrio simpático-parasimpático. Tendencias a la baja sostenidas se asocian a estrés, sobreentrenamiento o enfermedad incipiente. Los valores absolutos varían mucho entre personas — lo útil es la tendencia personal vs uno mismo, no comparar con otros.',
    citation: 'Shaffer & Ginsberg — Front Public Health 2017 (revisión) · Task Force ESC/NASPE — Circulation 1996',
    evidence: 'established',
  },
  {
    topic: 'Frecuencia cardíaca en reposo (RHR)',
    educationalExplanation: 'En adultos sanos, RHR más baja se asocia a mejor condición cardiovascular y menor mortalidad. Cambios sostenidos de +5–10 latidos vs basal pueden reflejar infección incipiente, deshidratación, estrés o sobreentrenamiento. No es diagnóstico — es señal.',
    citation: 'Aune et al., Nutr Metab Cardiovasc Dis 2017 (meta-análisis de RHR y mortalidad)',
    evidence: 'established',
  },
  {
    topic: 'Precisión de wearables para etapas del sueño',
    educationalExplanation: 'Los wearables de consumo (Oura, WHOOP, Apple Watch, Garmin) miden bien duración total de sueño y FC. Para etapas (REM/profundo/ligero) la precisión vs polisomnografía es ~70–80%. Útiles para detectar tendencias personales; no son medición clínica.',
    citation: 'de Zambotti et al., Chronobiol Int 2020 (revisión de validación de wearables)',
    evidence: 'probable',
  },
  {
    topic: 'Omega-3 (EPA/DHA)',
    educationalExplanation: 'Evidencia mixta. VITAL no encontró beneficio cardiovascular generalizado. REDUCE-IT mostró beneficio en pacientes con triglicéridos altos en prevención secundaria con dosis altas de EPA puro (icosapent etilo). No hay consenso para suplementar universalmente; depende del perfil cardiovascular y lo decide el médico.',
    citation: 'VITAL — Manson et al., NEJM 2019 · REDUCE-IT — Bhatt et al., NEJM 2019',
    evidence: 'uncertain',
  },
  {
    topic: 'Magnesio para sueño y función muscular',
    educationalExplanation: 'Evidencia moderada en personas con deficiencia. Beneficio modesto sobre latencia de sueño en algunas RCT pequeñas; no hay evidencia robusta de mejora universal en quienes no tienen déficit. La forma quelada (glicinato, malato) tiene mejor biodisponibilidad que el óxido.',
    citation: 'Abbasi et al., J Res Med Sci 2012 · Schwalfenberg & Genuis, Scientifica 2017 (revisión)',
    evidence: 'probable',
  },
];

// ─── Red-flags: cuándo el internista PARA de educar y deriva ──────────────────
// Estas reglas son la capa de seguridad. Si cualquiera dispara, el internista
// debe responder con la acción de derivación, NO con educación adicional.

export const RED_FLAGS: RedFlagRule[] = [
  // ── Síntomas que ameritan urgencias inmediatas ──────────────────────────────
  {
    trigger: 'Dolor torácico opresivo, sobre todo si se irradia a brazo/mandíbula, con sudoración o disnea',
    rationale: 'Patrón compatible con síndrome coronario agudo. La ventana de tratamiento es de minutos.',
    severity: 'urgent',
    action: 'Llamar a emergencias (112/911) o ir a urgencias ya. No esperar a "ver si se pasa".',
    citation: 'AHA — ACLS Guidelines (2020)',
  },
  {
    trigger: 'Disnea súbita, dolor torácico al respirar, o tos con sangre',
    rationale: 'Puede sugerir embolia pulmonar u otra urgencia respiratoria/cardiovascular.',
    severity: 'urgent',
    action: 'Acudir a urgencias inmediatamente.',
    citation: 'ESC — Pulmonary Embolism Guidelines (2019)',
  },
  {
    trigger: 'Déficit neurológico súbito: debilidad de un lado, alteración del habla, pérdida de visión, vértigo intenso',
    rationale: 'Patrón compatible con ictus. "Time is brain" — la ventana terapéutica es corta.',
    severity: 'urgent',
    action: 'Llamar a emergencias ya. No conducir uno mismo.',
    citation: 'AHA/ASA — Guidelines for Acute Ischemic Stroke (2019)',
  },
  {
    trigger: 'Cefalea súbita "la peor de la vida", o cefalea con rigidez de cuello y fiebre',
    rationale: 'Puede sugerir hemorragia subaracnoidea o meningitis.',
    severity: 'urgent',
    action: 'Acudir a urgencias inmediatamente.',
    citation: 'AHA/ASA — Aneurysmal Subarachnoid Hemorrhage Guidelines (2023)',
  },
  {
    trigger: 'Síncope (pérdida de conocimiento) sin causa obvia',
    rationale: 'Puede tener causas cardíacas que requieren evaluación urgente.',
    severity: 'urgent',
    action: 'Acudir a urgencias o consultar al médico el mismo día.',
    citation: 'ESC — Syncope Guidelines (2018)',
  },
  // ── Salud mental ────────────────────────────────────────────────────────────
  {
    trigger: 'Ideación suicida, plan de hacerse daño o crisis emocional aguda',
    rationale: 'Requiere acompañamiento profesional especializado. No es un tema de coaching ni de educación general.',
    severity: 'urgent',
    action: 'Línea de prevención del suicidio local (en España 024; en Latinoamérica varía por país) o acudir a urgencias. Si hay un ser querido cerca, pedirle compañía.',
    citation: 'WHO — Live Life: Implementation Guide for Suicide Prevention (2021)',
  },
  // ── Trastornos alimentarios (riesgo señalado en arquitectura Polaris) ──────
  {
    trigger: 'Pérdida de peso rápida no intencional, restricción severa, atracones o purgas, obsesión por contar calorías o medirse',
    rationale: 'Riesgo de trastorno de conducta alimentaria. Polaris no debe reforzar mediciones del cuerpo en este contexto — requiere evaluación por especialista.',
    severity: 'urgent',
    action: 'Consultar a un médico o profesional especializado en TCA antes de cualquier ajuste de dieta, ayuno o protocolo de cuerpo. El internista no acompaña este tema desde la educación.',
    citation: 'NICE Guideline NG69 — Eating Disorders: Recognition and Treatment (2017, vigente)',
  },
  // ── Valores de laboratorio críticos ────────────────────────────────────────
  {
    trigger: 'Glucosa >300 mg/dL con sed, poliuria, vómitos o aliento afrutado',
    rationale: 'Posible cetoacidosis diabética. Es una urgencia médica.',
    severity: 'urgent',
    action: 'Acudir a urgencias.',
    citation: 'ADA — Hyperglycemic Crises Standards (2024)',
  },
  {
    trigger: 'Potasio sérico <3.0 mmol/L o >5.5 mmol/L',
    rationale: 'Riesgo de arritmias cardíacas.',
    severity: 'urgent',
    action: 'Contactar al médico el mismo día. Si hay palpitaciones, debilidad muscular o calambres marcados, urgencias.',
    citation: 'KDIGO — Acute Potassium Disorders (2023)',
  },
  {
    trigger: 'Presión arterial sistólica ≥180 mmHg o diastólica ≥120 mmHg, sobre todo con síntomas',
    rationale: 'Crisis hipertensiva.',
    severity: 'urgent',
    action: 'Acudir a urgencias.',
    citation: 'ACC/AHA — Hypertension Guideline (2017)',
  },
  // ── Embarazo + medicación ───────────────────────────────────────────────────
  {
    trigger: 'Embarazo (confirmado o sospechado) con consultas sobre suplementos, medicación, ayuno o ejercicio intenso',
    rationale: 'El embarazo cambia muchas recomendaciones; lo que es seguro fuera puede no serlo durante. Aún más con primer trimestre.',
    severity: 'soon',
    action: 'Cualquier ajuste de suplementación, ayuno o entrenamiento durante el embarazo debe revisarlo el obstetra. El internista solo da información general.',
    citation: 'ACOG — Committee Opinions on Pregnancy (varias, vigentes)',
  },
  // ── Routine routing ────────────────────────────────────────────────────────
  {
    trigger: 'Resultados de laboratorio fuera de rango sin contexto clínico claro',
    rationale: 'Un valor aislado no es diagnóstico. La interpretación requiere historia clínica, examen físico y otros marcadores.',
    severity: 'routine',
    action: 'Compartir los resultados con el médico tratante en la próxima visita. El internista educativo puede explicar qué significa el rango, no qué significa para tu caso.',
    citation: 'USPSTF — Counseling and Screening principles',
  },
];

// ─── Helpers de búsqueda ──────────────────────────────────────────────────────

/** Busca un marcador por key, nombre o alias (case-insensitive). */
export function findLabMarker(query: string): LabMarker | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // 1. Match exacto por key/name/alias.
  for (const m of LAB_MARKERS) {
    if (m.key === q || m.name.toLowerCase() === q) return m;
    if (m.aliases.some((a) => a.toLowerCase() === q)) return m;
  }
  // 2. Contains por NOMBRE — recoge todos los candidatos y prefiere el de nombre
  //    más corto (más directo). Evita que "Hemoglobina glicosilada (HbA1c)" gane
  //    sobre "Hemoglobina" cuando el usuario teclea "hemoglob".
  const byName = LAB_MARKERS.filter((m) => m.name.toLowerCase().includes(q));
  if (byName.length) {
    return byName.slice().sort((a, b) => a.name.length - b.name.length)[0]!;
  }
  // 3. Contains por ALIAS — último recurso, mismo criterio.
  const byAlias = LAB_MARKERS.filter((m) => m.aliases.some((a) => a.toLowerCase().includes(q)));
  if (byAlias.length) {
    return byAlias.slice().sort((a, b) => a.name.length - b.name.length)[0]!;
  }
  return null;
}
