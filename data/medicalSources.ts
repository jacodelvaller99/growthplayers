/**
 * Fuentes de la información de salud que muestra la app (App Review 1.4.1:
 * toda información médica/de salud lleva su cita, fácil de encontrar).
 * Cada pantalla de bienestar muestra las de su tema con <Fuentes />, y
 * /legal/fuentes las lista todas. Enlaces verificados el 2026-11-12.
 */
export type SourceTopic =
  | 'sueno' | 'ayuno' | 'nutricion' | 'suplementos' | 'respiracion' | 'meditacion'
  | 'binaurales' | 'tapping' | 'movimiento' | 'habitos' | 'cuerpo' | 'biometria'
  | 'laboratorio' | 'estres' | 'crisis';

export type MedicalSource = { title: string; org: string; url: string };

export const TOPIC_LABEL: Record<SourceTopic, string> = {
  sueno: 'Sueño',
  ayuno: 'Ayuno',
  nutricion: 'Nutrición',
  suplementos: 'Suplementos',
  respiracion: 'Respiración',
  meditacion: 'Meditación y atención plena',
  binaurales: 'Audios binaurales',
  tapping: 'Tapping (EFT)',
  movimiento: 'Actividad física',
  habitos: 'Hábitos',
  cuerpo: 'Peso y medidas corporales',
  biometria: 'Pulso, variabilidad cardíaca y relojes',
  laboratorio: 'Exámenes de laboratorio',
  estres: 'Estrés y regulación emocional',
  crisis: 'Ayuda en crisis',
};

export const MEDICAL_SOURCES: Record<SourceTopic, MedicalSource[]> = {
  sueno: [
    { title: 'About Sleep', org: 'CDC — Centers for Disease Control and Prevention', url: 'https://www.cdc.gov/sleep/about/index.html' },
    { title: 'Sleep Deprivation and Deficiency', org: 'NIH — National Heart, Lung, and Blood Institute', url: 'https://www.nhlbi.nih.gov/health/sleep-deprivation' },
  ],
  ayuno: [
    { title: 'Effects of Intermittent Fasting on Health, Aging, and Disease (2019)', org: 'New England Journal of Medicine', url: 'https://www.nejm.org/doi/full/10.1056/NEJMra1905136' },
    { title: 'Calorie restriction and fasting diets: What do we know?', org: 'NIH — National Institute on Aging', url: 'https://www.nia.nih.gov/news/calorie-restriction-and-fasting-diets-what-do-we-know' },
  ],
  nutricion: [
    { title: 'Healthy diet', org: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
    { title: 'Primary Prevention of Cardiovascular Disease with a Mediterranean Diet (PREDIMED, 2018)', org: 'New England Journal of Medicine', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1800389' },
  ],
  suplementos: [
    { title: 'Dietary Supplement Fact Sheets', org: 'NIH — Office of Dietary Supplements', url: 'https://ods.od.nih.gov/factsheets/list-all/' },
    { title: 'Vitamin D — Fact Sheet', org: 'NIH — Office of Dietary Supplements', url: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/' },
    { title: 'Omega-3 Fatty Acids — Fact Sheet', org: 'NIH — Office of Dietary Supplements', url: 'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/' },
    { title: 'Magnesium — Fact Sheet', org: 'NIH — Office of Dietary Supplements', url: 'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/' },
    { title: 'ISSN position stand: creatine supplementation (2017)', org: 'Journal of the International Society of Sports Nutrition', url: 'https://doi.org/10.1186/s12970-017-0173-z' },
  ],
  respiracion: [
    { title: 'Relaxation Techniques: What You Need To Know', org: 'NIH — National Center for Complementary and Integrative Health', url: 'https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know' },
    { title: 'How Breath-Control Can Change Your Life: A Systematic Review (2018)', org: 'Frontiers in Human Neuroscience', url: 'https://doi.org/10.3389/fnhum.2018.00353' },
  ],
  meditacion: [
    { title: 'Meditation and Mindfulness: What You Need To Know', org: 'NIH — National Center for Complementary and Integrative Health', url: 'https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety' },
    { title: 'Meditation Programs for Psychological Stress and Well-being (2014)', org: 'JAMA Internal Medicine', url: 'https://doi.org/10.1001/jamainternmed.2013.13018' },
  ],
  binaurales: [
    { title: 'Efficacy of binaural auditory beats in cognition, anxiety, and pain perception: a meta-analysis (2019)', org: 'Psychological Research', url: 'https://doi.org/10.1007/s00426-018-1066-8' },
  ],
  tapping: [
    { title: 'Emotional Freedom Techniques for Anxiety: A Systematic Review With Meta-analysis (2016)', org: 'Journal of Nervous and Mental Disease', url: 'https://doi.org/10.1097/NMD.0000000000000483' },
  ],
  movimiento: [
    { title: 'Physical activity', org: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' },
    { title: 'Adult Activity: An Overview', org: 'CDC — Centers for Disease Control and Prevention', url: 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html' },
  ],
  habitos: [
    { title: 'How are habits formed: Modelling habit formation in the real world (2010)', org: 'European Journal of Social Psychology', url: 'https://doi.org/10.1002/ejsp.674' },
  ],
  cuerpo: [
    { title: 'Obesity and overweight', org: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
  ],
  biometria: [
    { title: 'All About Heart Rate', org: 'American Heart Association', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse' },
    { title: 'An Overview of Heart Rate Variability Metrics and Norms (2017)', org: 'Frontiers in Public Health', url: 'https://doi.org/10.3389/fpubh.2017.00258' },
  ],
  laboratorio: [
    { title: 'Lab Tests', org: 'NIH — MedlinePlus', url: 'https://medlineplus.gov/lab-tests/' },
    { title: 'Recommendation Topics', org: 'U.S. Preventive Services Task Force', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/topic_search_results?topic_status=P' },
  ],
  estres: [
    { title: "I'm So Stressed Out! Fact Sheet", org: 'NIH — National Institute of Mental Health', url: 'https://www.nimh.nih.gov/health/publications/so-stressed-out-fact-sheet' },
  ],
  crisis: [
    { title: 'Mental health: strengthening our response', org: 'World Health Organization', url: 'https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response' },
    { title: '988 Suicide & Crisis Lifeline (EE. UU.)', org: 'SAMHSA', url: 'https://988lifeline.org/' },
  ],
};
