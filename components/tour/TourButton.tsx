/**
 * TourButton — botón flotante global que arranca el tour de Norman. Oculto
 * en flujos inmersivos (auth/onboarding/ritual/prácticas) donde un botón
 * extra compite con el foco que esa pantalla existe para dar.
 */
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useTourStore } from '@/store/tourStore';
import { TourOverlay } from '@/components/tour/TourOverlay';

const HIDDEN_ROOTS = new Set(['(auth)', '(onboarding)']);
/** Pantallas cuyo control principal vive abajo (composer, CTA de compra, reproductor). */
const HIDDEN_ROUTES = new Set(['ritual', 'checkin', 'paywall', 'lesson', 'cuenta-lifeflow']);
/** Pestañas con composer anclado abajo — el FAB taparía el botón Enviar. */
const HIDDEN_TABS = new Set(['mentor']);
/** Prácticas inmersivas — el foco es la práctica, no un tour sobre ella. */
const HIDDEN_PREFIXES = ['bienestar'];
/** Debe coincidir con `tabBarHeight` de app/(tabs)/_layout.tsx (60 + insets.bottom). */
const TAB_BAR_BASE = 60;
const GAP = 16;
/** Botón montado sobre la barra de pestañas (móvil). */
const DOCK = 36;

export function TourButton() {
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const active = useTourStore((s) => s.active);
  const start = useTourStore((s) => s.start);
  const hydrateVoicePref = useTourStore((s) => s.hydrateVoicePref);

  useEffect(() => { hydrateVoicePref(); }, [hydrateVoicePref]);

  // Mientras se desplaza, el botón se aparta: tapaba valores alineados a la
  // derecha («Crea tu Nueva Identid…», la última columna del calendario).
  // `capture` atrapa el scroll de cualquier ScrollView de react-native-web.
  // ponytail: solo web (la PWA es el móvil real hoy); en nativo queda fijo.
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setScrolling(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => setScrolling(false), 700);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      if (t) clearTimeout(t);
    };
  }, []);

  const root = segments[0] ?? '';
  const inTabs = root === '(tabs)';
  const hidden =
    HIDDEN_ROOTS.has(root) ||
    HIDDEN_ROUTES.has(root) ||
    HIDDEN_PREFIXES.includes(root) ||
    (inTabs && HIDDEN_TABS.has(segments[1] ?? '')) ||
    active || // el propio overlay ya trae su navegación — no duplicar el botón encima.
    (scrolling && !isDesktop);

  // Sobre la tab bar real (oculta en desktop) + área segura; nunca encima de ella.
  // El panel del equipo en el teléfono también tiene barra abajo (Hoy…Más).
  const withBottomBar = (inTabs || root === 'admin') && !isDesktop;
  // Con barra abajo: montado sobre el borde superior de la barra, en el centro
  // (el hueco entre la 2ª y la 3ª pestaña). Quieto ya no tapa la flecha de
  // las filas, que viven en el borde derecho; solo pisa 18 px del centro.
  const bottom = withBottomBar
    ? TAB_BAR_BASE + insets.bottom - DOCK / 2
    : insets.bottom + GAP;

  return (
    <>
      <TourOverlay />
      {!hidden && (
        <Pressable
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel="Norman te explica esta pantalla"
          // 36 + 4·2 = 44 px de objetivo táctil.
          hitSlop={withBottomBar ? 4 : undefined}
          style={[s.btn, !isDesktop && s.btnMobile, withBottomBar && s.btnDock, { bottom }]}>
          <MaterialIcons name="auto-awesome" size={isDesktop ? 20 : 18} color={palette.ash} />
        </Pressable>
      )}
    </>
  );
}

const s = StyleSheet.create({
  // Neutro a propósito: el amarillo se gana — es de la acción principal de
  // cada pantalla, no de un botón de ayuda que flota sobre todas.
  btn: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 48,
    zIndex: 850,
    ...(Platform.OS === 'web' ? { position: 'fixed' as never } : null),
  },
  // Móvil: más chico y pegado al gutter de 16 px, para tapar lo mínimo.
  btnMobile: { width: 40, height: 40, borderRadius: 20, right: 16 },
  btnDock: {
    width: DOCK, height: DOCK, borderRadius: DOCK / 2,
    right: undefined, left: '50%', marginLeft: -DOCK / 2,
  },
});
