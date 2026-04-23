/**
 * GROWTH PLAYERS — Paleta de Colores
 * Sistema de diseño premium con mint accent on rich black
 */

export const Colors = {
  // Primarios - Growth Players Brand
  mint: '#AEFEF0',
  mintDark: '#0D2B30',
  richBlack: '#01191D',

  // Variantes Mint
  mintLight: 'rgba(174, 254, 240, 0.15)',
  mintMid: 'rgba(174, 254, 240, 0.30)',
  mintBorder: 'rgba(174, 254, 240, 0.20)',
  mintBorderActive: 'rgba(174, 254, 240, 0.40)',

  // Fondos
  background: '#01191D',
  surface: '#021F26',
  surfaceAlt: '#032A31',
  surfaceElevated: '#043B44',

  // Textos
  text: '#FFFFFF',
  textSecondary: '#B0C4BB',
  textMuted: 'rgba(174, 254, 240, 0.30)',
  textFaint: 'rgba(174, 254, 240, 0.15)',
  textInverse: '#01191D',

  // Estados
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Pilares (Rueda de la Vida)
  pillar: {
    fe: '#7c3aed',
    finanzas: '#059669',
    salud: '#dc2626',
    familia: '#f97316',
    mente: '#06b6d4',
    negocio: '#8b5cf6',
    impacto: '#0ea5e9',
    legado: '#64748b',
  },

  // Transiciones
  transparent: 'transparent',
  alpha: (color: string, alpha: number) => {
    // Convierte #RRGGBB a rgba(r, g, b, a)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
} as const;

export type ColorKey = keyof typeof Colors;
