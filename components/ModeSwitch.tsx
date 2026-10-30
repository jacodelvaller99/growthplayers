/**
 * ModeSwitch — "CLIENTE | MENTOR/ADMIN" en un toque, desde cualquier lado.
 *
 * Antes, un admin o mentor entraba a su panel por un botón al fondo de Perfil
 * y volvía por "Volver a la App" en el sidebar del admin: dos caminos
 * distintos, ninguno a la vista. Ahora es el mismo interruptor arriba en las
 * dos mitades de la app (patrón LifeFlow). Solo se pinta para staff; la
 * autorización real sigue en RLS + el guard de app/admin/_layout.tsx.
 */
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, palette } from '@/constants/theme';
import { useStaffRole } from '@/hooks/useIsAdmin';

export function ModeSwitch({ current }: { current: 'client' | 'staff' }) {
  const router = useRouter();
  const { isAdmin, isMentor } = useStaffRole();
  if (!isAdmin && !isMentor) return null;

  const staffLabel = isAdmin ? 'ADMIN' : 'MENTOR';
  const go = (to: 'client' | 'staff') => {
    if (to === current) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    if (to === 'client') router.replace('/(tabs)/comando' as never);
    else router.push('/admin' as never);
  };

  return (
    <View style={s.track} accessibilityRole="tablist" accessibilityLabel="Cambiar de modo">
      {(['client', 'staff'] as const).map((m) => {
        const on = m === current;
        const label = m === 'client' ? 'CLIENTE' : staffLabel;
        return (
          <Pressable
            key={m}
            onPress={() => go(m)}
            hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={m === 'client' ? 'Modo cliente' : `Modo ${staffLabel.toLowerCase()}`}
            style={({ pressed }) => [s.seg, on && s.segOn, pressed && !on && s.segPressed]}>
            <Text style={[s.label, on && s.labelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.black,
  },
  seg: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: { backgroundColor: palette.gold },
  segPressed: { backgroundColor: palette.goldLight },
  label: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1.2, color: palette.ash },
  labelOn: { color: palette.ink },
});
