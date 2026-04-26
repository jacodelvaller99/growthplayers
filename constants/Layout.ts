/**
 * PROTOCOLO SOBERANO — Sistema de Layout
 * Grid de 8px, espaciado modular
 */

export const Layout = {
  // Grid base: 8px system
  grid: 8,

  // Espaciado
  spacing: {
    xs: 4,     // 0.5 grid
    sm: 8,     // 1 grid
    md: 16,    // 2 grid
    lg: 24,    // 3 grid
    xl: 32,    // 4 grid
    xxl: 48,   // 6 grid
    xxxl: 64,  // 8 grid
  },

  // Tamaños de fuente para escalas
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },

  // Bordes
  borders: {
    thin: 0.5,
    default: 1,
    thick: 2,
  },

  // Sombras
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // Componentes
  components: {
    // Botones
    button: {
      height: 52,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    buttonSmall: {
      height: 40,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },

    // Input
    input: {
      height: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },

    // Card
    card: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 12,
    },
    cardLarge: {
      paddingHorizontal: 24,
      paddingVertical: 24,
      borderRadius: 12,
    },

    // Tab bar
    tabBar: {
      height: 64,
      paddingBottom: 8,
    },

    // Header
    header: {
      height: 56,
      paddingHorizontal: 16,
    },
  },

  // Grid visual (TacticalGrid)
  tacticalGrid: {
    gridSize: 48,    // Cada 48px
    gridOpacity: 0.04,
  },
} as const;
