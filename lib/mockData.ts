/**
 * MOCK DATA — Datos de prueba para desarrollo
 * Reemplazar con datos reales de Supabase cuando esté conectado
 */

export const MOCK_USER = {
  id: 'user_alex_001',
  email: 'alex@growthplayers.com',
  nombre: 'Alex',
  objetivo_90_dias: 'Lanzar mi negocio en 90 días',
  avatar_descripcion: 'Emprendedor enfocado en crecimiento',
  pilar_mas_debil: 'negocio',
  streak: 7,
  tier: 'free',
  created_at: new Date().toISOString(),
};

export const MOCK_WHEEL = {
  id: 'wheel_alex_001',
  user_id: MOCK_USER.id,
  fe: 8,
  finanzas: 4,
  salud: 7,
  familia: 6,
  mente: 5,
  negocio: 3,
  impacto: 6,
  legado: 5,
  actualizado_at: new Date().toISOString(),
};

export const MOCK_JOURNAL_ENTRY = {
  id: 'journal_today',
  user_id: MOCK_USER.id,
  fecha: new Date().toISOString().split('T')[0],
  gratitud_1: '',
  gratitud_2: '',
  gratitud_3: '',
  victorias: [] as string[],
  retos: [] as string[],
  intencion: '',
  completado: false,
  created_at: new Date().toISOString(),
};

export const MOCK_SECTORS = [
  {
    id: 'sector_1',
    nombre: 'Startups Tech',
    descripcion: 'Comunidad de emprendedores en tecnología',
    agentes_activos: 24,
    imagen: '🚀',
    color: '#0ea5e9',
  },
  {
    id: 'sector_2',
    nombre: 'Finanzas Personales',
    descripcion: 'Gestión de dinero e inversiones',
    agentes_activos: 18,
    imagen: '💰',
    color: '#059669',
  },
  {
    id: 'sector_3',
    nombre: 'Salud & Bienestar',
    descripcion: 'Fitness, nutrición y mindfulness',
    agentes_activos: 31,
    imagen: '🏃',
    color: '#dc2626',
  },
  {
    id: 'sector_4',
    nombre: 'Negocios B2B',
    descripcion: 'Estrategia y ventas empresariales',
    agentes_activos: 15,
    imagen: '💼',
    color: '#8b5cf6',
  },
  {
    id: 'sector_5',
    nombre: 'Comunidad & Impacto',
    descripcion: 'Proyectos sociales y sostenibles',
    agentes_activos: 22,
    imagen: '🌱',
    color: '#06b6d4',
  },
  {
    id: 'sector_6',
    nombre: 'Masterminds Privados',
    descripcion: 'Grupos selectos de alto desempeño',
    agentes_activos: 8,
    imagen: '👑',
    color: '#f97316',
  },
];

export const MOCK_SESSION = {
  access_token: 'mock_token_' + Math.random().toString(36).substring(7),
  user: MOCK_USER,
};
