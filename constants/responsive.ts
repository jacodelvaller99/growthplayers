import { Dimensions, Platform } from 'react-native';

const BASE_WIDTH = 390; // iPhone 14

/** Scale a size proportionally on native; on web the layout wrapper handles it */
export const scale = (size: number): number => {
  if (Platform.OS !== 'web') {
    const { width } = Dimensions.get('window');
    return Math.round(size * (width / BASE_WIDTH));
  }
  return size;
};

export const TEXT = {
  xs:    11,
  sm:    13,
  base:  15,
  lg:    17,
  xl:    20,
  '2xl': 24,
  '3xl': 30,
  hero:  40,
} as const;

export const SPACING = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
} as const;
