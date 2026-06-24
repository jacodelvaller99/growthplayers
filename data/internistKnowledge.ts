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
  {
    key: 'insulin_fasting',
    name: 'Insulina en ayunas',
    aliases: ['insulina en ayunas', 'insulina basal', 'insulina sérica en ayunas', 'fasting insulin', 'fasting serum insulin', 'insulin fasting', 'insulin', 'ins', 'fins', 'insulina'],
    unit: 'µIU/mL',
    low: 2.6, high: 24.9,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Mide la cantidad de insulina circulante en sangre tras un ayuno de 8-12 horas. La insulina es la hormona que el páncreas libera para que las células absorban glucosa; en ayunas refleja cuánta hormona necesita el cuerpo para mantener la glucosa basal, una señal indirecta de la sensibilidad a la insulina.',
    educationalLow: 'Un valor bajo en ayunas suele observarse en personas muy sensibles a la insulina o con baja masa grasa, y en general no es preocupante por sí mismo. Valores muy bajos junto con glucosa alta podrían reflejar una producción pancreática insuficiente y conviene comentarlos con un profesional. La interpretación siempre depende del valor de glucosa acompañante (a menudo combinados en el índice HOMA-IR).',
    educationalHigh: 'Una insulina en ayunas elevada con glucosa todavía normal puede ser una señal temprana de resistencia a la insulina: el cuerpo necesita más hormona para mantener la glucosa en rango. Aunque los laboratorios consideran "normal" hasta cerca de 25 µIU/mL, gran parte de la literatura de salud metabólica sugiere que valores por encima de ~10-12 µIU/mL merecen atención educativa al estilo de vida (sueño, actividad, composición corporal). No es un diagnóstico; la resistencia a la insulina se evalúa en conjunto con glucosa, HbA1c e historia clínica.',
    citation: 'Mayo Clinic Laboratories — Insulin, Serum (test INS); respaldo: MedlinePlus (NIH) — Insulin in Blood',
    evidence: 'established',
  },
  {
    key: 'uric_acid',
    name: 'Ácido úrico',
    aliases: ['ácido úrico', 'acido urico', 'urato', 'uric acid', 'serum uric acid', 'urate', 'ua', 'sua', 'ác. úrico'],
    unit: 'mg/dL',
    low: 3.5, high: 8.6,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Es el producto final del metabolismo de las purinas, que se eliminan principalmente por el riñón. Su nivel en sangre refleja el equilibrio entre producción (dieta, recambio celular) y excreción renal.',
    educationalLow: 'Un valor por debajo del rango suele carecer de relevancia clínica y a menudo es benigno. De forma educativa, valores bajos pueden asociarse a ciertos fármacos (probenecid, algunos hipolipemiantes), dietas muy bajas en purinas o, con menor frecuencia, a trastornos metabólicos hereditarios. Conviene interpretarlo con un profesional junto al contexto completo.',
    educationalHigh: 'Un valor elevado se denomina hiperuricemia. Cuando el urato supera el punto de saturación (en torno a 6.8 mg/dL) puede cristalizar en las articulaciones y asociarse con gota, y también con cálculos renales. La elevación puede deberse a dieta rica en purinas o fructosa, alcohol, deshidratación, ciertos diuréticos o enfermedad renal. El límite superior depende del sexo (≈7.1 mg/dL en mujeres y ≈8.6 mg/dL en hombres según MedlinePlus). Como referencia educativa, las guías de la ACR (2020) usan un objetivo de tratamiento por debajo de 6 mg/dL en personas con gota establecida; es un umbral terapéutico, no un diagnóstico.',
    citation: 'U.S. National Library of Medicine — MedlinePlus: Uric acid - blood (2024); objetivo terapéutico: ACR Gout Guideline (2020)',
    evidence: 'established',
  },
  // ── Perfil lipídico ─────────────────────────────────────────────────────────
  {
    key: 'cholesterol_total',
    name: 'Colesterol total',
    aliases: ['colesterol total', 'colesterol', 'total cholesterol', 'cholesterol total', 'chol total', 'tc', 'col total', 'colesterol sérico', 'serum cholesterol'],
    unit: 'mg/dL',
    low: 125, high: 200,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Mide la cantidad total de colesterol que circula en la sangre, sumando el de las lipoproteínas LDL y HDL más una fracción estimada a partir de los triglicéridos. Es un marcador general del panel lipídico que se usa para estimar el riesgo cardiovascular junto con el LDL, el HDL y otros valores.',
    educationalLow: 'Un colesterol total bajo suele considerarse favorable, pero valores muy bajos pueden acompañar a desnutrición, problemas hepáticos, malabsorción, hipertiroidismo o ciertas condiciones hereditarias. No se interpreta de forma aislada; conviene revisarlo junto con el resto del panel y el contexto clínico de cada persona.',
    educationalHigh: 'Según las categorías del NCEP/ATP III (vigentes y citadas por la AHA), un colesterol total por debajo de 200 mg/dL se considera deseable, entre 200 y 239 mg/dL limítrofe-alto, y 240 mg/dL o más se clasifica como alto. Un valor elevado puede asociarse a mayor riesgo cardiovascular, pero su significado depende del LDL, el HDL, los triglicéridos y los factores de riesgo individuales (edad, tabaquismo, presión, diabetes). Es información educativa, no un diagnóstico.',
    citation: 'National Cholesterol Education Program (NCEP) — ATP III Final Report, NIH/NHLBI (2002)',
    evidence: 'established',
  },
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
  {
    key: 'free_t4',
    name: 'T4 libre (tiroxina libre, FT4)',
    aliases: ['t4 libre', 'tiroxina libre', 'ft4', 'free t4', 'free thyroxine', 'thyroxine free', 't4l', 't4 free', 'ft-4'],
    unit: 'ng/dL',
    low: 0.9, high: 1.7,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Mide la fracción de tiroxina (T4) que circula libre, no unida a proteínas transportadoras, y por tanto biológicamente disponible para los tejidos. Se interpreta siempre junto a la TSH para evaluar el eje tiroideo.',
    educationalLow: 'Un valor por debajo del rango (algunos laboratorios orientan con niveles por debajo de ~0.8 ng/dL) puede sugerir, junto con una TSH elevada, hipotiroidismo. No es un diagnóstico por sí solo: el resultado depende del ensayo del laboratorio y debe leerse con la TSH y la clínica. Lo valora tu médico.',
    educationalHigh: 'Un valor por encima del rango (algunos laboratorios orientan con niveles por encima de ~2.0 ng/dL) puede sugerir, junto con una TSH suprimida, hipertiroidismo o tirotoxicosis. No es concluyente de forma aislada: varía según el ensayo y debe interpretarse con la TSH, otros valores tiroideos y el contexto clínico por tu médico.',
    citation: 'Cleveland Clinic — Thyroxine (T4) Test, rango de referencia adulto (2024)',
    evidence: 'established',
  },
  {
    key: 'free_t3',
    name: 'T3 libre (triyodotironina libre, FT3)',
    aliases: ['t3 libre', 'triyodotironina libre', 't3l', 'ft3', 'free t3', 'free triiodothyronine', 't3 free', 'triiodothyronine free', 'ft-3'],
    unit: 'pg/mL',
    low: 2.3, high: 4.2,
    criticalLow: null, criticalHigh: null,
    whatItMeasures: 'Mide la fracción activa y no unida a proteínas de la triyodotironina (T3), la hormona tiroidea más potente a nivel celular. Refleja la disponibilidad real de hormona tiroidea para los tejidos y se interpreta siempre junto a la TSH y la T4 libre.',
    educationalLow: 'Un valor por debajo del rango puede acompañar a estados de hipofunción tiroidea o aparecer en enfermedades no tiroideas (el llamado "síndrome del enfermo eutiroideo"), donde la conversión de T4 a T3 disminuye sin que la tiroides esté enferma. No es diagnóstico por sí solo; su lectura depende del patrón conjunto con TSH y T4 libre y del contexto clínico.',
    educationalHigh: 'Un valor por encima del rango puede asociarse a estados de hiperfunción tiroidea y suele evaluarse junto a una TSH baja y T4 libre. Algunos cuadros cursan con T3 elevada de forma predominante. El resultado debe interpretarlo un profesional dentro del panel completo; este dato aislado no confirma ninguna condición.',
    citation: 'Cleveland Clinic — Triiodothyronine (T3) Test, rango Free T3 (2024); varía según el método de ensayo (Labcorp publica 2.0–4.4 pg/mL)',
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
    key: 'folate_serum',
    name: 'Ácido fólico (folato sérico)',
    aliases: ['ácido fólico', 'acido folico', 'folato', 'folato sérico', 'folato serico', 'vitamina b9', 'vitamina b-9', 'folate', 'folic acid', 'serum folate', 'folate serum', 'vitamin b9', 'b9', 'fol'],
    unit: 'ng/mL',
    low: 5.8, high: 32.8,
    criticalLow: 3.1, criticalHigh: null,
    whatItMeasures: 'Mide la concentración de folato (vitamina B9) circulante en suero. El folato participa en la síntesis de ADN, la división celular y el metabolismo de la homocisteína, junto con la vitamina B12.',
    educationalLow: 'Un valor bajo suele asociarse a ingesta dietética insuficiente, malabsorción o aumento de demanda (embarazo, alcohol, ciertos fármacos). Las guías describen el folato sérico por debajo de ~3.1 ng/mL (equivalente a <7 nmol/L, umbral de balance negativo de folato según el NIH) como compatible con deficiencia bioquímica; cifras entre ese umbral y el límite inferior de referencia se consideran limítrofes. El folato sérico refleja sobre todo la ingesta reciente y no los depósitos tisulares, por lo que suele interpretarse junto con la homocisteína y la vitamina B12 para distinguir entre déficit de folato y de B12. Es un dato educativo, no un diagnóstico.',
    educationalHigh: 'Valores altos no suelen tener relevancia clínica por sí solos y con frecuencia reflejan suplementación reciente con ácido fólico o alimentos fortificados; el folato es hidrosoluble y el exceso se elimina por orina, por lo que no se define un umbral de toxicidad sérico. Conviene tener presente que un aporte alto de ácido fólico puede enmascarar los signos hematológicos de un déficit de vitamina B12 no tratado, por lo que ante folato elevado a veces se valora también la B12.',
    citation: 'NIH Office of Dietary Supplements — Folate Fact Sheet (2022); intervalo de referencia: ARUP Laboratories — Folate, Serum',
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
  {
    key: 'esr',
    name: 'Eritrosedimentación (VSG/ESR)',
    aliases: ['eritrosedimentación', 'velocidad de sedimentación globular', 'vsg', 'vsg westergren', 'eritro', 'esr', 'erythrocyte sedimentation rate', 'sed rate', 'sedimentation rate', 'westergren esr'],
    unit: 'mm/h',
    low: 0, high: 20,
    criticalLow: null, criticalHigh: 100,
    whatItMeasures: 'Mide la velocidad a la que los glóbulos rojos sedimentan en una columna de sangre en una hora (método Westergren). Es un marcador inespecífico de inflamación: sube cuando aumentan proteínas de fase aguda como el fibrinógeno.',
    educationalLow: 'Una VSG baja no suele tener relevancia clínica y generalmente se considera normal. En casos puntuales valores muy bajos pueden acompañar a ciertas condiciones de la sangre (por ejemplo, alteraciones en la forma de los glóbulos rojos o policitemia), pero por sí sola una VSG baja no indica enfermedad. Cualquier interpretación corresponde al equipo médico.',
    educationalHigh: 'Una VSG elevada sugiere la presencia de inflamación en algún punto del organismo, pero es inespecífica: no indica dónde ni por qué. Puede subir con infecciones, procesos reumáticos/autoinmunes, anemia, edad avanzada o embarazo. El rango sube con la edad y es mayor en mujeres (referencia Westergren típica: hombres <50 años hasta ~15 mm/h, mujeres <50 hasta ~20 mm/h; por encima de 50, hasta ~20 y ~30 respectivamente). Las guías señalan que valores por encima de 100 mm/h tienen baja tasa de falsos positivos para una causa significativa de fondo (infección grave, enfermedades reumáticas o ciertas neoplasias) y ameritan evaluación médica. Se interpreta siempre junto al cuadro clínico y a otros marcadores como la PCR; no es diagnóstica por sí sola.',
    citation: 'NIH/NCBI — StatPearls: Erythrocyte Sedimentation Rate (2025)',
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

// ─── Orden de Exámenes recomendada (panel base del protocolo) ─────────────────
// Panel de laboratorio recomendado como línea base del Protocolo Soberano, basado
// en la orden de medicina integrativa del Dr. Armando Romero. Es EDUCATIVO /
// ORIENTATIVO: indica qué exámenes conviene hacerse para tener una foto basal del
// cuerpo. NO es una orden médica individual ni una prescripción — el examen lo
// indica y firma tu médico tratante según tu caso. Cada ítem se enlaza, cuando
// existe, con un marcador de LAB_MARKERS para que el internista pueda explicarlo.

export interface ExamPanelItem {
  /** Nombre del examen tal como aparece en la orden. */
  label: string;
  /** key de LAB_MARKERS si el internista lo interpreta; null para estudios cualitativos. */
  markerKey: string | null;
}

export interface ExamPanelGroup {
  /** Nombre del panel (como en la orden). */
  panel: string;
  /** Para qué sirve este panel, en una línea educativa. */
  purpose: string;
  items: ExamPanelItem[];
}

export interface RecommendedExamPanel {
  title: string;
  /** Médico que recomienda el panel base (atribución, NO orden individual). */
  physician: string;
  specialty: string;
  /** Aclaración educativa/legal que SIEMPRE acompaña al panel. */
  disclaimer: string;
  groups: ExamPanelGroup[];
}

export const RECOMMENDED_EXAM_PANEL: RecommendedExamPanel = {
  title: 'Orden de Exámenes recomendada',
  physician: 'Dr. Armando Romero',
  specialty: 'Medicina Integrativa y del Estilo de Vida',
  disclaimer:
    'Panel base orientativo del protocolo. No es una orden médica individual ni una ' +
    'prescripción: el examen lo indica y firma tu médico tratante según tu caso.',
  groups: [
    {
      panel: 'Panel metabólico',
      purpose: 'Cómo maneja tu cuerpo el azúcar y el metabolismo basal.',
      items: [
        { label: 'Glucosa en ayunas', markerKey: 'glucose_fasting' },
        { label: 'Hemoglobina glicosilada (HbA1c)', markerKey: 'hba1c' },
        { label: 'Insulina en ayunas', markerKey: 'insulin_fasting' },
        { label: 'Ácido úrico', markerKey: 'uric_acid' },
      ],
    },
    {
      panel: 'Panel lipídico',
      purpose: 'Colesterol y grasas circulantes — riesgo cardiovascular.',
      items: [
        { label: 'Colesterol total', markerKey: 'cholesterol_total' },
        { label: 'Colesterol LDL', markerKey: 'ldl_cholesterol' },
        { label: 'Colesterol HDL', markerKey: 'hdl_cholesterol' },
        { label: 'Triglicéridos', markerKey: 'triglycerides' },
      ],
    },
    {
      panel: 'Panel nutricional',
      purpose: 'Reservas de vitaminas clave para energía, nervios y huesos.',
      items: [
        { label: 'Vitamina D', markerKey: 'vitamin_d_25oh' },
        { label: 'Vitamina B12', markerKey: 'vitamin_b12' },
        { label: 'Ácido fólico', markerKey: 'folate_serum' },
      ],
    },
    {
      panel: 'Hemograma completo',
      purpose: 'Glóbulos rojos, blancos y plaquetas — anemia, infección, inflamación.',
      items: [
        { label: 'Hemograma completo', markerKey: 'hemoglobin' },
      ],
    },
    {
      panel: 'Panel hormonal (tiroides)',
      purpose: 'Función tiroidea — metabolismo, energía y peso.',
      items: [
        { label: 'TSH', markerKey: 'tsh' },
        { label: 'T4 libre', markerKey: 'free_t4' },
        { label: 'T3 libre', markerKey: 'free_t3' },
      ],
    },
    {
      panel: 'Panel inmunológico / inflamación',
      purpose: 'Marcadores de inflamación sistémica.',
      items: [
        { label: 'Proteína C reactiva (PCR)', markerKey: 'hs_crp' },
        { label: 'Eritrosedimentación (VSG)', markerKey: 'esr' },
      ],
    },
    {
      panel: 'Otros estudios',
      purpose: 'Tamizaje general complementario.',
      items: [
        { label: 'Examen general de heces', markerKey: null },
        { label: 'Examen general de orina', markerKey: null },
      ],
    },
  ],
};
