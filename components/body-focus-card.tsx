import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type { EnergyFocus } from '@/lib/energyFocusLogic';

interface BodyFocusCardProps {
  focus: EnergyFocus;
  showChestSafety?: boolean;
  showMeditationAction?: boolean;
}

export function BodyFocusCard({
  focus,
  showChestSafety = false,
  showMeditationAction = true,
}: BodyFocusCardProps) {
  const router = useRouter();

  return (
    <View style={s.root} accessibilityRole="summary">
      <View style={s.eyebrowRow}>
        <MaterialIcons name="self-improvement" size={17} color={palette.goldText} />
        <Text style={s.eyebrow}>FOCO DE ATENCIÓN</Text>
      </View>
      <Text style={s.title}>{focus.label}</Text>
      <Text style={s.practice}>{focus.practice}</Text>
      <Text style={s.reflection}>{focus.reflection}</Text>
      <Text style={s.cue}>{focus.cue}</Text>

      {showChestSafety ? (
        <View style={s.safety} accessibilityRole="alert">
          <View style={s.safetyTitleRow}>
            <MaterialIcons name="warning-amber" size={18} color="#FFB86B" />
            <Text style={s.safetyTitle}>PRIMERO, SEGURIDAD</Text>
          </View>
          <Text style={s.safetyText}>
            Si el dolor del pecho es repentino, intenso, no cede, se extiende al brazo, cuello,
            mandíbula o espalda, o aparece con falta de aire, sudor, náusea o mareo, no inicies la
            meditación: llama al 123 o busca atención de urgencias.
          </Text>
          <Pressable
            onPress={() => { void Linking.openURL('tel:123'); }}
            accessibilityRole="link"
            accessibilityLabel="Llamar a emergencias, línea 123"
            style={({ pressed }) => [s.emergencyButton, pressed && s.pressed]}>
            <MaterialIcons name="call" size={17} color={palette.ink} />
            <Text style={s.emergencyButtonText}>LLAMAR AL 123</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={s.generalSafety}>
          Si el malestar es intenso, nuevo, persistente o te preocupa, busca orientación profesional.
        </Text>
      )}

      <View style={s.symbolicNotice}>
        <MaterialIcons name="info-outline" size={15} color={palette.smoke} />
        <Text style={s.symbolicText}>
          Exploración simbólica opcional: no explica la causa física, no diagnostica y no reemplaza atención médica.
        </Text>
      </View>

      {showMeditationAction ? (
        <Pressable
          onPress={() => router.push(`/bienestar/meditacion?focus=${encodeURIComponent(focus.id)}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir meditación para ${focus.label}`}
          style={({ pressed }) => [s.meditationButton, pressed && s.pressed]}>
          <Text style={s.meditationButtonText}>ABRIR MEDITACIÓN</Text>
          <MaterialIcons name="arrow-forward" size={17} color={palette.goldText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: palette.lineGold,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  eyebrow: {
    ...typography.caption,
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: { ...typography.title, color: palette.ivory, fontSize: 19 },
  practice: {
    color: palette.goldText,
    fontFamily: Fonts.displayMedium,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  reflection: { ...typography.body, color: palette.ash, fontSize: 15, lineHeight: 22 },
  cue: { ...typography.caption, color: palette.smoke, lineHeight: 19 },
  safety: {
    backgroundColor: 'rgba(255,128,64,0.08)',
    borderColor: 'rgba(255,184,107,0.55)',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
    padding: spacing.md,
  },
  safetyTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  safetyTitle: {
    color: '#FFB86B',
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  safetyText: { ...typography.caption, color: palette.ash, lineHeight: 19 },
  emergencyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFB86B',
    borderRadius: 999,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  emergencyButtonText: { color: palette.ink, fontFamily: Fonts.display, fontSize: 11, letterSpacing: 0.8 },
  generalSafety: { ...typography.caption, color: palette.smoke, lineHeight: 18 },
  symbolicNotice: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs },
  symbolicText: { ...typography.caption, color: palette.smoke, flex: 1, fontSize: 11, lineHeight: 17 },
  meditationButton: {
    alignItems: 'center',
    borderColor: palette.lineGold,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  meditationButtonText: { color: palette.goldText, fontFamily: Fonts.display, fontSize: 12, letterSpacing: 1 },
  pressed: { opacity: 0.7 },
});
