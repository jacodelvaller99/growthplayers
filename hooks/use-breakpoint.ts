import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export interface Breakpoint {
  isMobile:  boolean;
  isTablet:  boolean;
  isDesktop: boolean;
  width:     number;
}

const getBreakpoint = (width: number): Breakpoint => ({
  isMobile:  width < 768,
  isTablet:  width >= 768 && width < 1200,
  isDesktop: width >= 1200,
  width,
});

export const useBreakpoint = (): Breakpoint => {
  const [bp, setBp] = useState<Breakpoint>(() => {
    // SSR-safe: default to mobile on server
    if (typeof window === 'undefined') {
      return getBreakpoint(375);
    }
    return getBreakpoint(Dimensions.get('window').width);
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setBp(getBreakpoint(window.width));
    });
    // Sync immediately after mount (covers hydration mismatch)
    setBp(getBreakpoint(Dimensions.get('window').width));
    return () => sub?.remove();
  }, []);

  return bp;
};
