/**
 * Apariencia — el cliente elige cómo se ve su app.
 *
 * Claro u oscuro — Tinta o Luz, los dos fondos del manual de marca — y cuánto
 * se muestra. Vive en el perfil, no en admin, porque es del usuario — el admin
 * llega a la misma pantalla desde su panel.
 *
 * La preferencia se guarda en ESTE navegador. No toca la base de datos ni lo que
 * ven otras personas, y en la app nativa el color no re-tematiza (ahí va
 * compilado en hex); la pantalla lo dice en vez de fingir que funciona.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { APP_MODES, useAppMode, type AppMode } from '@/hooks/use-app-mode';

function OptionCard({
  name, note, active, onPress, children,
}: {
  name: string;
  note: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${name}. ${note}`}
      style={({ pressed }) => [s.opt, active && s.optOn, pressed && { opacity: 0.85 }]}>
      <View style={s.optHead}>
        {children}
        {active && <MaterialIcons name="check-circle" size={16} color={palette.goldText} />}
      </View>
      <Text style={[s.optName, active && { color: palette.goldText }]}>{name}</Text>
      <Text style={s.optNote}>{note}</Text>
    </Pressable>
  );
}

export default function AparienciaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, canToggle } = useAppTheme();
  const { mode: appMode, setMode: setAppMode } = useAppMode();

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">APARIENCIA</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Solo los dos fondos del manual de marca: Tinta (oscuro) y Luz (claro). */}
      {canToggle ? (
        <>
          <GoldDivider label="CLARO U OSCURO" />
          <View style={s.pair} accessibilityRole="radiogroup">
            {([['tinta', 'Oscuro', 'dark-mode'], ['light', 'Claro', 'light-mode']] as const).map(([id, name, icon]) => {
              const on = mode === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setMode(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={name}
                  style={({ pressed }) => [s.pairBtn, on && s.optOn, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons name={icon} size={22} color={on ? palette.goldText : palette.ash} />
                  <Text style={[s.pairName, on && { color: palette.goldText }]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View style={s.scopeNote}>
          <MaterialIcons name="info-outline" size={15} color={palette.smoke} />
          <Text style={s.scopeText}>En la app del teléfono el color es fijo (oscuro). Desde el navegador puedes elegir claro u oscuro.</Text>
        </View>
      )}

      <GoldDivider label="CUÁNTO SE MUESTRA" />
      <View style={s.grid} accessibilityRole="radiogroup">
        {APP_MODES.map((m: { id: AppMode; label: string; description: string }) => (
          <OptionCard
            key={m.id}
            name={m.label}
            note={m.description}
            active={appMode === m.id}
            onPress={() => setAppMode(m.id)}>
            <View />
          </OptionCard>
        ))}
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 18, fontWeight: '800', color: palette.ivory, letterSpacing: 2 },

  scopeNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginTop: spacing.md, paddingHorizontal: spacing.xs,
  },
  scopeText: { ...typography.caption, color: palette.smoke, flex: 1, fontSize: 12, lineHeight: 17 },

  // flexBasis 200 → una columna en móvil (375px), dos o tres en escritorio.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  opt: {
    flexGrow: 1, flexBasis: 200, minHeight: 44,
    backgroundColor: palette.graphite,
    borderWidth: 1, borderColor: palette.line, borderRadius: radii.md,
    padding: spacing.md, gap: 6,
  },
  optOn: { borderColor: palette.lineGold, backgroundColor: palette.goldGlow },
  optHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optName: { ...typography.section, color: palette.ivory, fontSize: 12 },
  optNote: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16 },

  pair: { flexDirection: 'row', gap: spacing.md },
  pairBtn: {
    flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderRadius: radii.md,
  },
  pairName: { ...typography.section, color: palette.ivory, fontSize: 14 },
});
