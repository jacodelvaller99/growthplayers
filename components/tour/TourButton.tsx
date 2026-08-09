/**
 * TourButton — botón flotante global que arranca el tour de Norman. Oculto
 * en flujos inmersivos (auth/onboarding/ritual/prácticas) donde un botón
 * extra compite con el foco que esa pantalla existe para dar.
 */
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSegments } from 'expo-router';

import { palette } from '@/constants/theme';
import { useTourStore } from '@/store/tourStore';
import { TourOverlay } from '@/components/tour/TourOverlay';

const HIDDEN_ROOTS = new Set(['(auth)', '(onboarding)']);
const HIDDEN_ROUTES = new Set(['ritual', 'checkin']);
/** Prácticas inmersivas — el foco es la práctica, no un tour sobre ella. */
const HIDDEN_PREFIXES = ['bienestar'];

export function TourButton() {
  const segments = useSegments() as string[];
  const active = useTourStore((s) => s.active);
  const start = useTourStore((s) => s.start);
  const hydrateVoicePref = useTourStore((s) => s.hydrateVoicePref);

  useEffect(() => { hydrateVoicePref(); }, [hydrateVoicePref]);

  const root = segments[0] ?? '';
  const hidden =
    HIDDEN_ROOTS.has(root) ||
    HIDDEN_ROUTES.has(root) ||
    HIDDEN_PREFIXES.includes(root) ||
    active; // el propio overlay ya trae su navegación — no duplicar el botón encima.

  return (
    <>
      <TourOverlay />
      {!hidden && (
        <Pressable
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel="Norman te explica esta pantalla"
          style={s.btn}>
          <MaterialIcons name="auto-awesome" size={20} color={palette.ink} />
        </Pressable>
      )}
    </>
  );
}

const s = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: 24,
    bottom: Platform.OS === 'web' ? 24 : 96,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    width: 48,
    zIndex: 850,
    ...(Platform.OS === 'web' ? { position: 'fixed' as never } : null),
  },
});
