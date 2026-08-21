import type { PolarisModule } from '@/types/lifeflow';

export const POLARIS_MODULES: PolarisModule[] = [

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  {
    id: 'onboarding',
    order: 0,
    title: 'Onboarding',
    subtitle: 'Bienvenido al Método Polaris',
    arquetipo: null,
    semana: 0,
    status: 'active',
    progress: 0,
    lessons: [
      { id: 'ob-1', order: 1, title: 'InformACCIÓN', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=e9e3f1d119a64ddc83ff14e908610dba', vimeoId: '1085827630' },
      { id: 'ob-2', order: 2, title: 'Historia, Misión & Visión', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=2a1c86286d374c12933f086864923264', vimeoId: '1085834569' },
      { id: 'ob-3', order: 3, title: 'RoadMap', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=147e394f2a8f4eec91c012037b28a132', vimeoId: '1088268193' },
      { id: 'ob-4', order: 4, title: 'Dashboard de Control de Tareas', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=e9347ad2c2f34b0da64e7f856518e450', vimeoId: '1088267512' },
      // md corregido: apuntaba al de "Dashboard de Control de Tareas" (copy-paste).
      { id: 'ob-5', order: 5, title: 'Funcionamiento de la comunidad', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=6770eaadd17e492da1299e8b884b034c', vimeoId: '1117193173', resources: [{ title: 'Manual de la comunidad', url: 'https://docs.google.com/document/d/1j2Apx4e7AWXJTKS2sjLh6RQQsX9YmL4U/copy' }] },
      { id: 'ob-6', order: 6, title: 'Proceso de trabajo', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=e9347ad2c2f34b0da64e7f856518e450', vimeoId: '1110043409' },
      { id: 'ob-7', order: 7, title: 'Cómo descargar y compartir el documento', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/36a2cd73?md=e9347ad2c2f34b0da64e7f856518e450', vimeoId: '1109082325' },
    ],
  },

  // ── MÓDULO 1: GUERRERO MENTALIDAD ────────────────────────────────────────────
  {
    id: 'modulo-1',
    order: 1,
    title: 'Guerrero: Mentalidad',
    subtitle: 'La base de todo lo que construirás',
    arquetipo: 'Guerrero',
    semana: 1,
    status: 'active',
    progress: 0,
    lessons: [
      { id: 'm1-1', order: 1, title: 'Nunca es Suficiente', status: 'active', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=af471edf6938439c897c5a41805d3d84', vimeoId: '1088923347', resources: [{ title: 'Guía Práctica', url: 'https://docs.google.com/document/d/1i_CBvii60u94lr5Bw-p4pkK_HV7tEzMjE_pRi3h6lJ4/copy' }] },
      { id: 'm1-2', order: 2, title: 'Resultados de Trabajar tu Mindset', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=089d7beb1b3b453684cba74da028919d', vimeoId: '1088926583' },
      { id: 'm1-3', order: 3, title: 'Origen de una Creencia', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=f0e4f9aae07443f2b227c3afd62eeffa', vimeoId: '1088935041', resources: [{ title: 'Guía Práctica', url: 'https://docs.google.com/document/d/1K5ngBBJlNF-8_13QWZft1ltdUgFMu41kEV5HMP48Q1I/copy' }] },
      { id: 'm1-4', order: 4, title: 'Detecta Tus Creencias', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=f488c00cf9b64c61877465375804277b', vimeoId: '1088929514', resources: [{ title: 'Guía Práctica', url: 'https://docs.google.com/document/d/1b7f7Uxu0VQkxzdqtsOk5w2Zrx7EESR2IbtOASuYIbp0/copy' }] },
      { id: 'm1-5', order: 5, title: 'Crea tu Nueva Identidad', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=4c74a831301a4a7ea46716d0daf7e008', vimeoId: '1088936319', resources: [{ title: 'Guía Práctica', url: 'https://docs.google.com/document/d/1XNv7apojeX_s9E1fjpNhQHaLPuS9uyzCSy9zLdob9N0/copy' }] },
      { id: 'm1-6', order: 6, title: 'Integra tu Nueva Identidad', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=ac5c0a79eeae49cd804845a4ee07d4b8', vimeoId: '1088937516', resources: [{ title: 'Guía Práctica', url: 'https://docs.google.com/document/d/1q-C9gDkHniCmRgHu0whMtTAlmjXxT4rfwNkAQWeicxU/copy' }] },
      { id: 'm1-7', order: 7, title: 'Recupera tu Inversión', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=7011f79a9f704bbe91b68ba2a5967703', vimeoId: '1117104560' },
    ],
  },

  // ── MÓDULO 2: EMOCIONES (orden real Skool) ───────────────────────────────────
  {
    id: 'modulo-2',
    order: 2,
    title: 'Emociones: Autoconocimiento',
    subtitle: 'Domina tu mundo interno',
    arquetipo: null,
    semana: 2,
    status: 'locked',
    progress: 0,
    lessons: [
      { id: 'm2-1', order: 1, title: 'Emociones', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=196d43b4cf094c1e9428366fa897d8a0', vimeoId: '1097988685' },
      { id: 'm2-2', order: 2, title: 'Herramientas para subir la energía', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=492c405d134240899e62f4cef5f19905', vimeoId: '1097992012' },
      { id: 'm2-3', order: 3, title: 'Escritura Terapéutica', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=5e0685267ea24bdc83bd4b8e89cd2b7d', vimeoId: '1097994417' },
      { id: 'm2-4', order: 4, title: 'Escala de Consciencia', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=382efce8d76b44b09acaba22afb514b8', vimeoId: '1097996259' },
    ],
  },

  // ── MÓDULO 3: MADURACIÓN DEL GUERRERO ───────────────────────────────────────
  {
    id: 'modulo-3',
    order: 3,
    title: 'Maduración del Guerrero',
    subtitle: 'Profundiza en quién eres',
    arquetipo: 'Comprensión',
    semana: 3,
    status: 'locked',
    progress: 0,
    lessons: [
      { id: 'm3-1', order: 1, title: 'Sentido Propósito de Vida', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=d3041ef11b0349d0bd20938979a70c97', vimeoId: '1085877501', resources: [{ title: 'Doc. IKIGAI', url: 'https://docs.google.com/document/d/1QHsHDuBu6cf_tsNY7acobaFfbCQQ3R9S4Sk0yuQXpUI/edit?usp=sharing' }] },
      { id: 'm3-2', order: 2, title: 'HISAR - PERAS', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=10f7aa26393a41c69b461fce5e91161b', vimeoId: '1085877661', resources: [{ title: 'Doc. HISAR - PERAS', url: 'https://docs.google.com/document/d/1NQ6-9c6jpQuMi-Sm_Poa9QXbTvX8lN_kv-esuPKjj0g/edit?usp=sharing' }] },
      { id: 'm3-3', order: 3, title: 'Leyes Universales', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=e7e9a5c5dbed4b1b8092538ce04d8ce4', vimeoId: '1085877756' },
      { id: 'm3-4', order: 4, title: 'Leyes Universales II', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=d8f10be096984139a3c389230993c080', vimeoId: '1085877856', resources: [{ title: 'Doc. Leyes Universales', url: 'https://docs.google.com/document/d/1adrR4RgkJUL_4LHDScKxhN1RbgZ7727dBvgi9A6FBLA/edit?usp=sharing' }] },
      { id: 'm3-5', order: 5, title: 'C.A.D.A.V.R.A.', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=274cdf77a7cc45eb858ce68df01e1afb', vimeoId: '1101667335', resources: [{ title: 'Doc. CADAVRA', url: 'https://docs.google.com/document/d/1Y0G1Z71_F-jfNz4KhUGbxNeiwwD8c4XoUXt72LjV4QA/edit?usp=sharing' }] },
    ],
  },

  // ── MÓDULO 4: PONTÍFICE FLOW ─────────────────────────────────────────────────
  {
    id: 'modulo-4',
    order: 4,
    title: 'Pontífice: Estado de Flow',
    subtitle: 'El rendimiento nace del estado',
    arquetipo: 'Pontífice',
    semana: 4,
    status: 'locked',
    progress: 0,
    lessons: [
      { id: 'm4-1', order: 1, title: 'LifeFLOW', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=a1596b7c6d87493180508ca310d957ae', vimeoId: '1097998980', resources: [{ title: 'Doc Guía', url: 'https://docs.google.com/document/d/1ZYK_c7xl_8Hp8JxGZFvIIIBj7CbM6mo-OrZR4gPhqaY/edit?usp=sharing' }] },
      { id: 'm4-2', order: 2, title: 'La Ciencia detrás de la técnica', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=02eca7ebca7d48669bc1b2003460c870', vimeoId: '1098000497', resources: [{ title: 'Doc Guía', url: 'https://docs.google.com/document/d/15wwCUikfQFvz1RW52DZEJCcHFP3wzAApmLRwAKYW9I4/edit?usp=sharing' }] },
      { id: 'm4-3', order: 3, title: 'Coherencia Cardíaca', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=9138f57a60364e16814748483329ba4f', vimeoId: '1097999810', resources: [{ title: 'Doc Guía', url: 'https://docs.google.com/document/d/1d6S8n4tNeKPfWvO8Bi-vrU7QXagMzNBYe2BAtolUJXM/edit?usp=sharing' }] },
      { id: 'm4-4', order: 4, title: 'Indicadores Subjetivos del Flow', status: 'locked', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=e87585b8124b4c4ab03a89e52559fec7', vimeoId: '1097999601', resources: [{ title: 'Doc Guía', url: 'https://docs.google.com/document/d/18F65GHf_gj4m6taZCV7ACOTqyNhawL3tPeCrPM9XNRo/edit?usp=sharing' }] },
    ],
  },

  // ── MÓDULOS 5–7: COMING SOON (lecciones pre-cargadas para cuando se activen) ──
  {
    id: 'modulo-5',
    order: 5,
    title: 'Intro al 4to Nivel de Consciencia',
    subtitle: 'Cooperación y energía como moneda',
    arquetipo: 'Cooperación',
    semana: 5,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/bde6664a?md=74caeed013094614a12f51428fb125b1',
    lessons: [
      { id: 'm5-1', order: 1, title: 'Los 7 Niveles de Consciencia', status: 'locked' },
      { id: 'm5-2', order: 2, title: 'Llave 1 — La Intención Correcta', status: 'locked' },
      // En Skool esta guía vive en "5.2. Llave del Pasado | Presente | Futuro"
      // (la lección de Skool abarca las llaves 2-4; ver evaluación del curso).
      { id: 'm5-3', order: 3, title: 'Llave 2 — Libera tu Pasado con el Dinero', status: 'locked', resources: [{ title: 'Doc. Guía', url: 'https://docs.google.com/document/d/1M_WvWu0Udii8Vz2MRJLfOtPwcBTcF38bnmBMCoQ2uQ8/copy' }, { title: 'Test de Prosperidad', url: 'https://las-7-llaves-polaris.vercel.app/' }] },
      { id: 'm5-4', order: 4, title: 'Llave 3 — El Presente: Saber Vivir con lo que Tienes', status: 'locked' },
      { id: 'm5-5', order: 5, title: 'Llave 4 — El Futuro: Sueña sin Límites', status: 'locked' },
      { id: 'm5-6', order: 6, title: 'Llave 5 — El Camino: RECREO y CLASES', status: 'locked' },
      { id: 'm5-7', order: 7, title: 'Llave 6 — El Servicio Incondicional', status: 'locked' },
      { id: 'm5-8', order: 8, title: 'Llave 7 — La Administración', status: 'locked' },
    ],
  },
  {
    id: 'modulo-6',
    order: 6,
    title: 'Mercader: Gestión del Tiempo',
    subtitle: 'El único recurso no renovable',
    arquetipo: 'Mercader',
    semana: 6,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/08c3550a?md=3c89b47dd9bb4deeb4391ead90d3c73e',
    lessons: [
      { id: 'm6-1', order: 1, title: 'Planeación Semanal Polaris', status: 'locked' },
      { id: 'm6-2', order: 2, title: 'Planeación Diaria: Las 6 Preguntas', status: 'locked' },
      { id: 'm6-3', order: 3, title: 'Cierre del Día: Las 4 Preguntas', status: 'locked' },
    ],
  },
  {
    id: 'modulo-7',
    order: 7,
    title: 'Mercader: Relaciones',
    subtitle: 'Construye desde adentro hacia afuera',
    arquetipo: 'Mercader',
    semana: 7,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c11b3c52?md=15e609aca14a4090b38f3579d428c46a',
    lessons: [
      { id: 'm7-1', order: 1, title: 'Los 3 Personajes Internos', status: 'locked' },
      { id: 'm7-2', order: 2, title: 'La Gran Obra: Integración', status: 'locked' },
      { id: 'm7-3', order: 3, title: 'Relaciones desde el Escultor', status: 'locked' },
    ],
  },
  {
    id: 'modulo-8',
    order: 8,
    title: 'La No Negociación',
    subtitle: 'Las 7 Llaves de la Prosperidad',
    arquetipo: null,
    semana: 8,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/a667a3d1?md=ee90006c1ac34b5c853105c5f800b5d8',
    lessons: [],
  },
  {
    id: 'modulo-9',
    order: 9,
    title: 'Logrología',
    subtitle: 'Ley de Ayuda y Servicio',
    arquetipo: null,
    semana: 9,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/13e4d406?md=b99ef2eb74164ad79251231abeb2e322',
    lessons: [],
  },

  // ── SESIONES SEMANALES (bonus) ───────────────────────────────────────────────
  {
    id: 'sesiones-semanales',
    order: 10,
    title: 'Sesiones Semanales Polaris',
    subtitle: 'Masterclasses en vivo',
    arquetipo: null,
    semana: null,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/96cf5bd5?md=d11d645153c245dba3231e50a964d18d',
    lessons: [],
  },

  // ── LIFEFLOW (sesiones grabadas — en desarrollo activo en Skool) ─────────────
  // Espejo del módulo b72aa806 de Skool (14 sesiones al 2026-08-21). Los videos
  // viven en Skool (sin vimeoId propio): cada lección abre su página de Skool.
  {
    id: 'lifeflow-sesiones',
    order: 11,
    title: 'Sesiones Lifeflow',
    subtitle: 'Grabaciones del programa en vivo',
    arquetipo: null,
    semana: null,
    status: 'active',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806',
    lessons: [
      { id: 'lf-1',  order: 1,  title: 'Sesión Lifeflow — 19 may', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=f072ec9c48204997bc9d18019beb0640' },
      { id: 'lf-2',  order: 2,  title: 'Sesión Lifeflow — 4 jun',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=e817e70ac6554748a260ff53f0a6cb41' },
      { id: 'lf-3',  order: 3,  title: 'Sesión Lifeflow — 6 jun',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=6be9d6d14f734e98962cee73152cac36' },
      { id: 'lf-4',  order: 4,  title: 'Sesión Lifeflow — 9 jun',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=bb65634f77e6422482ff24bc0bb842fb' },
      { id: 'lf-5',  order: 5,  title: 'Sesión Lifeflow — 11 jun', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=880704157e1348bd9f400d7b6c86c033' },
      { id: 'lf-6',  order: 6,  title: 'Sesión Lifeflow — 28 jul', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=8a40e4e9926d48e08b2b9bef3e6d66b6' },
      { id: 'lf-7',  order: 7,  title: 'Sesión Lifeflow — 30 jul', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=d892554bc8844b85b4442561775204c4' },
      { id: 'lf-8',  order: 8,  title: 'Sesión Lifeflow — 1 ago',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=eaa94c521eab4d4a80dbb6c01dcd9ee3' },
      { id: 'lf-9',  order: 9,  title: 'Sesión Lifeflow — 4 ago',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=ce9e48045d09469c84a467f666e6d65d' },
      { id: 'lf-10', order: 10, title: 'Sesión Lifeflow — 6 ago',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=4827fd3a0bf040249c075ba9a8afec0e' },
      { id: 'lf-11', order: 11, title: 'Sesión Lifeflow — 8 ago',  status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=1d1c9906fc3c4ded812637a37bfc2a06' },
      { id: 'lf-12', order: 12, title: 'Sesión Lifeflow — 11 ago', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=84a2fc4a09474084b574712966e1a5b2' },
      { id: 'lf-13', order: 13, title: 'Sesión Lifeflow — 13 ago', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=7e597ec0d1fe47c5b05bb022bc682d4f' },
      { id: 'lf-14', order: 14, title: 'Sesión Lifeflow — 15 ago', status: 'available', skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b72aa806?md=d634e98bc30141b996e3527c7e245a96' },
    ],
  },
];

export const ACTIVE_MODULE =
  POLARIS_MODULES.find((m) => m.status === 'active' && m.order > 0) ??
  POLARIS_MODULES.find((m) => m.status === 'active') ??
  POLARIS_MODULES[0];
