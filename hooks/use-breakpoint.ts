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
  // Always start with mobile default so server-render and first client-render match.
  // The real width is applied after hydration in useEffect.
  const [bp, setBp] = useState<Breakpoint>(() => getBreakpoint(375));

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Sync to real viewport width after hydration (no mismatch risk)
    setBp(getBreakpoint(Dimensions.get('window').width));
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setBp(getBreakpoint(window.width));
    });
    return () => sub?.remove();
  }, []);

  return bp;
};
