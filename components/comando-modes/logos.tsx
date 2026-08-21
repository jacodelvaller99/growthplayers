/**
 * Modo Logos — silencio visual. Solo los iconos del menú, centrados.
 *
 * Pensado para quien se satura con datos (TDAH): cero números, cero
 * tarjetas, cero CTAs compitiendo. Círculos de línea fina sobre el fondo
 * de la página — el vocabulario visual de las apps de calma (Endel) con
 * los iconos que la app ya usa en su navegación, así nada se reaprende.
 *
 * Deliberadamente NO muestra: score, fichas, racha, Norman, directivas.
 * La ausencia es el diseño. Quien quiera datos tiene los otros 5 modos.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ComandoModeProps } from '@/components/comando-modes/types';
import { Fonts, palette, spacing } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// Los mismos iconos y destinos de la navegación real (DesktopSidebar/tabs) —
// consistencia: este modo cambia la densidad, no el mapa mental.
const DESTINATIONS: { icon: IconName; label: string; route: string }[] = [
  { icon: 'monitor-heart',       label: 'CHECK-IN',  route: '/checkin' },
  { icon: 'explore',             label: 'MI NORTE',  route: '/(tabs)/norte' },
  { icon: 'view-module',         label: 'PROGRAMA',  route: '/(tabs)/programas' },
  { icon: 'route',               label: 'MENTORÍA',  route: '/mentoria' },
  { icon: 'insights',            label: 'PROGRESO',  route: '/(tabs)/progreso' },
  { icon: 'chat-bubble-outline', label: 'NORMAN IA',    route: '/(tabs)/mentor' },
  { icon: 'spa',                 label: 'BIENESTAR', route: '/bienestar' },
];

export default function LogosMode(props: ComandoModeProps) {
  return (
    <View style={s.stage}>
      <View style={s.grid}>
        {DESTINATIONS.map((d) => (
          <Pressable
            key={d.route}
            onPress={() => props.onNavigate(d.route)}
            accessibilityRole="button"
            accessibilityLabel={d.label}
            style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}>
            <View style={s.circle}>
              <MaterialIcons name={d.icon} size={30} color={palette.ivory} />
            </View>
            <Text style={s.label}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 560,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    // Aire generoso a propósito: el espacio ES la calma.
    columnGap: spacing.xxl,
    rowGap: spacing.xxl,
    maxWidth: 420,
  },
  item: {
    alignItems: 'center',
    gap: spacing.sm,
    width: 96,
    minHeight: 44,
  },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: palette.lineHard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: palette.ash,
  },
});
