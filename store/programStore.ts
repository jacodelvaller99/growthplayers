import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ProgramType = 'polaris' | 'growth_players'

export interface ProgramModule {
  id: string
  title: string
  subtitle: string
  symbol: string
  order: number
}

export interface ModuleProgress {
  completed: boolean
  notes: string
  progress: number
  completedAt?: string
}

export const POLARIS_MODULES: ProgramModule[] = [
  { id: 'pol_1',  title: 'Identidad Soberana',    subtitle: 'Quién eres antes de lo que haces',       symbol: 'alignment', order: 1  },
  { id: 'pol_2',  title: 'Dominio del Cuerpo',     subtitle: 'Tu templo, tu ventaja',                 symbol: 'body',      order: 2  },
  { id: 'pol_3',  title: 'Detox Mental',           subtitle: 'Elimina el ruido, amplifica la señal',  symbol: 'detox',     order: 3  },
  { id: 'pol_4',  title: 'Luz Interior',           subtitle: 'Conecta con tu fuente de energía',      symbol: 'light',     order: 4  },
  { id: 'pol_5',  title: 'Paz Inquebrantable',     subtitle: 'Estabilidad bajo cualquier presión',    symbol: 'peace',     order: 5  },
  { id: 'pol_6',  title: 'Gran Despertar',         subtitle: 'Expande tu percepción de lo posible',   symbol: 'awaken',    order: 6  },
  { id: 'pol_7',  title: 'Equilibrio Total',       subtitle: 'Todas las áreas en armonía',            symbol: 'balance',   order: 7  },
  { id: 'pol_8',  title: 'Armonía Profunda',       subtitle: 'Integración cuerpo-mente-espíritu',     symbol: 'harmony',   order: 8  },
  { id: 'pol_9',  title: 'Crecimiento Consciente', subtitle: 'Evolución intencional y sostenida',     symbol: 'growth',    order: 9  },
  { id: 'pol_10', title: 'Espíritu Invencible',    subtitle: 'La fortaleza que nadie puede quitarte', symbol: 'spirit',    order: 10 },
]

export const GP_MODULES: ProgramModule[] = [
  { id: 'gp_1',  title: 'Mentalidad de Élite',         subtitle: 'El juego comienza en tu cabeza',             symbol: 'trending-up-outline',      order: 1  },
  { id: 'gp_2',  title: 'Identidad de Vendedor',       subtitle: 'Vender es servir a nivel máximo',            symbol: 'person-outline',           order: 2  },
  { id: 'gp_3',  title: 'Discovery Profundo',          subtitle: 'El que pregunta controla la venta',          symbol: 'search-outline',           order: 3  },
  { id: 'gp_4',  title: 'Propuesta Irrechazable',      subtitle: 'Valor tan claro que el precio desaparece',   symbol: 'document-text-outline',    order: 4  },
  { id: 'gp_5',  title: 'Manejo de Objeciones',        subtitle: 'El "no" es solo el inicio',                  symbol: 'shield-outline',           order: 5  },
  { id: 'gp_6',  title: 'Cierre de Alto Impacto',      subtitle: 'Técnicas que cierran deals reales',          symbol: 'checkmark-circle-outline', order: 6  },
  { id: 'gp_7',  title: 'Sistemas de Productividad',   subtitle: 'No motivación: sistemas',                    symbol: 'grid-outline',             order: 7  },
  { id: 'gp_8',  title: 'Liderazgo y Equipos',         subtitle: 'Tu techo es el techo de tu equipo',          symbol: 'people-outline',           order: 8  },
  { id: 'gp_9',  title: 'Marketing y Posicionamiento', subtitle: 'Que el mercado te persiga a ti',             symbol: 'megaphone-outline',        order: 9  },
  { id: 'gp_10', title: 'Negociación Avanzada',        subtitle: 'Win-win sin ceder en lo esencial',           symbol: 'swap-horizontal-outline',  order: 10 },
  { id: 'gp_11', title: 'Legado y Escala',             subtitle: 'Construye algo que te sobreviva',            symbol: 'rocket-outline',           order: 11 },
]

export function getModulesForProgram(programType: ProgramType): ProgramModule[] {
  return programType === 'polaris' ? POLARIS_MODULES : GP_MODULES
}

interface ProgramState {
  programType: ProgramType
  currentModuleId: string
  moduleProgress: Record<string, ModuleProgress>
  streak: number
  totalDays: number
  archetypeId: string
  sovereigntyScore: number
  polarisDolor: string
  polarisDeseo: string
  criticalArea: string

  setProgramType: (type: ProgramType) => void
  setCurrentModule: (id: string) => void
  updateModuleProgress: (moduleId: string, progress: Partial<ModuleProgress>) => void
  setModuleNotes: (moduleId: string, notes: string) => void
  completeModule: (moduleId: string) => void
  incrementStreak: () => void
  setArchetype: (id: string) => void
  setSovereigntyScore: (score: number) => void
  setPolarisDolor: (dolor: string) => void
  setPolarisDeseo: (deseo: string) => void
  setCriticalArea: (area: string) => void
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      programType: 'growth_players',
      currentModuleId: 'gp_1',
      moduleProgress: {},
      streak: 0,
      totalDays: 0,
      archetypeId: 'constructor',
      sovereigntyScore: 0,
      polarisDolor: '',
      polarisDeseo: '',
      criticalArea: '',

      setProgramType: (type) =>
        set({ programType: type, currentModuleId: type === 'polaris' ? 'pol_1' : 'gp_1' }),
      setCurrentModule: (id) => set({ currentModuleId: id }),
      updateModuleProgress: (moduleId, progress) =>
        set((state) => ({
          moduleProgress: {
            ...state.moduleProgress,
            [moduleId]: {
              ...({ completed: false, notes: '', progress: 0 } as ModuleProgress),
              ...state.moduleProgress[moduleId],
              ...progress,
            },
          },
        })),
      setModuleNotes: (moduleId, notes) =>
        set((state) => ({
          moduleProgress: {
            ...state.moduleProgress,
            [moduleId]: {
              ...({ completed: false, progress: 0, notes: '' } as ModuleProgress),
              ...state.moduleProgress[moduleId],
              notes,
            },
          },
        })),
      completeModule: (moduleId) =>
        set((state) => ({
          moduleProgress: {
            ...state.moduleProgress,
            [moduleId]: {
              ...({ notes: '', progress: 100 } as Partial<ModuleProgress>),
              ...state.moduleProgress[moduleId],
              completed: true,
              completedAt: new Date().toISOString(),
            },
          },
          totalDays: state.totalDays + 1,
        })),
      incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
      setArchetype: (id) => set({ archetypeId: id }),
      setSovereigntyScore: (score) => set({ sovereigntyScore: score }),
      setPolarisDolor: (dolor) => set({ polarisDolor: dolor }),
      setPolarisDeseo: (deseo) => set({ polarisDeseo: deseo }),
      setCriticalArea: (area) => set({ criticalArea: area }),
    }),
    {
      name: 'program-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
