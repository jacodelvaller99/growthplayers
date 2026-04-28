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
      { id: 'ob-1', order: 1, title: 'InformACCIÓN', status: 'available' },
      { id: 'ob-2', order: 2, title: 'Historia, Misión & Visión', status: 'available' },
      { id: 'ob-3', order: 3, title: 'RoadMap', status: 'available' },
      { id: 'ob-4', order: 4, title: 'Dashboard de Control de Tareas', status: 'available' },
      { id: 'ob-5', order: 5, title: 'Funcionamiento de la comunidad', status: 'available' },
      { id: 'ob-6', order: 6, title: 'Proceso de trabajo', status: 'available' },
      { id: 'ob-7', order: 7, title: 'Cómo descargar y compartir el documento', status: 'available' },
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
      {
        id: 'm1-1', order: 1, title: 'Nunca es Suficiente', status: 'active',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=af471edf6938439c897c5a41805d3d84',
      },
      {
        id: 'm1-2', order: 2, title: 'Resultados de Trabajar tu Mindset', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=089d7beb1b3b453684cba74da028919d',
      },
      {
        id: 'm1-3', order: 3, title: 'Origen de una Creencia', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=f0e4f9aae07443f2b227c3afd62eeffa',
      },
      {
        id: 'm1-4', order: 4, title: 'Detecta Tus Creencias', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=f488c00cf9b64c61877465375804277b',
      },
      {
        id: 'm1-5', order: 5, title: 'Crea tu Nueva Identidad', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=4c74a831301a4a7ea46716d0daf7e008',
      },
      {
        id: 'm1-6', order: 6, title: 'Integra tu Nueva Identidad', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=ac5c0a79eeae49cd804845a4ee07d4b8',
      },
      {
        id: 'm1-7', order: 7, title: 'Recupera tu Inversión', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/b67a0843?md=7011f79a9f704bbe91b68ba2a5967703',
      },
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
      {
        id: 'm2-1', order: 1, title: 'Emociones', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=196d43b4cf094c1e9428366fa897d8a0',
      },
      {
        id: 'm2-2', order: 2, title: 'Herramientas para subir la energía', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=492c405d134240899e62f4cef5f19905',
      },
      {
        id: 'm2-3', order: 3, title: 'Escritura Terapéutica', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=5e0685267ea24bdc83bd4b8e89cd2b7d',
      },
      {
        id: 'm2-4', order: 4, title: 'Escala de Consciencia', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/27fd6303?md=382efce8d76b44b09acaba22afb514b8',
      },
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
      {
        id: 'm3-1', order: 1, title: 'Sentido Propósito de Vida', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=d3041ef11b0349d0bd20938979a70c97',
      },
      {
        id: 'm3-2', order: 2, title: 'HISAR - PERAS', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=10f7aa26393a41c69b461fce5e91161b',
      },
      {
        id: 'm3-3', order: 3, title: 'Leyes Universales', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=e7e9a5c5dbed4b1b8092538ce04d8ce4',
      },
      {
        id: 'm3-4', order: 4, title: 'Leyes Universales II', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=d8f10be096984139a3c389230993c080',
      },
      {
        id: 'm3-5', order: 5, title: 'C.A.D.A.V.R.A.', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c82bdf1e?md=274cdf77a7cc45eb858ce68df01e1afb',
      },
    ],
  },

  // ── MÓDULO 4: PONTÍFICE FLOW ─────────────────────────────────────────────────
  {
    id: 'modulo-4',
    order: 4,
    title: 'Pontífice: Estado de Flow',
    subtitle: 'Opera desde tu máximo potencial',
    arquetipo: 'Pontífice',
    semana: 4,
    status: 'locked',
    progress: 0,
    lessons: [
      {
        id: 'm4-1', order: 1, title: 'LifeFLOW', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=a1596b7c6d87493180508ca310d957ae',
      },
      {
        id: 'm4-2', order: 2, title: 'La Ciencia detrás de la técnica', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=02eca7ebca7d48669bc1b2003460c870',
      },
      {
        id: 'm4-3', order: 3, title: 'Coherencia Cardíaca', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=9138f57a60364e16814748483329ba4f',
      },
      {
        id: 'm4-4', order: 4, title: 'Indicadores Subjetivos del Flow', status: 'locked',
        skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/fa30fdf2?md=e87585b8124b4c4ab03a89e52559fec7',
      },
    ],
  },

  // ── MÓDULOS 5–9: COMING SOON ─────────────────────────────────────────────────
  {
    id: 'modulo-5',
    order: 5,
    title: 'Intro al 4to Nivel de Consciencia',
    subtitle: 'Cooperación y energía como moneda',
    arquetipo: 'Cooperación',
    semana: 5,
    status: 'coming_soon',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/bde6664a?md=74caeed013094614a12f51428fb125b1',
    lessons: [],
  },
  {
    id: 'modulo-6',
    order: 6,
    title: 'Mercader: Gestión del Tiempo',
    subtitle: 'El único recurso no renovable',
    arquetipo: 'Mercader',
    semana: 6,
    status: 'coming_soon',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/08c3550a?md=3c89b47dd9bb4deeb4391ead90d3c73e',
    lessons: [],
  },
  {
    id: 'modulo-7',
    order: 7,
    title: 'Mercader: Relaciones',
    subtitle: 'Construye desde adentro hacia afuera',
    arquetipo: 'Mercader',
    semana: 7,
    status: 'coming_soon',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/c11b3c52?md=15e609aca14a4090b38f3579d428c46a',
    lessons: [],
  },
  {
    id: 'modulo-8',
    order: 8,
    title: 'La No Negociación',
    subtitle: 'Las 7 Llaves de la Prosperidad',
    arquetipo: null,
    semana: 8,
    status: 'coming_soon',
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
    status: 'coming_soon',
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
    status: 'coming_soon',
    progress: 0,
    skoolUrl: 'https://www.skool.com/polaris-growth-institute-9573/classroom/96cf5bd5?md=d11d645153c245dba3231e50a964d18d',
    lessons: [],
  },
];

export const ACTIVE_MODULE =
  POLARIS_MODULES.find((m) => m.status === 'active' && m.order > 0) ??
  POLARIS_MODULES.find((m) => m.status === 'active') ??
  POLARIS_MODULES[0];
