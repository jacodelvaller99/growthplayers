/**
 * GROWTH PLAYERS — Tipografía
 * Space Grotesk para máxima compatibilidad, con estética premium
 */

import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold, SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

export { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold, SpaceGrotesk_400Regular, SpaceMono_400Regular, SpaceMono_700Bold };

export const Typography = {
  // Headlines
  h1: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  h2: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  h3: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
  },

  // Body
  body: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  // Display
  display: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },

  // Button
  button: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },

  // Tag
  tag: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },

  // Metadata
  meta: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },

  // Mono variants
  mono: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },

  monoBold: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700' as const,
  },

  monoLarge: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
} as const;
