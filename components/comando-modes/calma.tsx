/**
 * Modo Calma — recuperación primero, protocolo secundario y atenuado.
 *
 * UN número (recuperación), no cuatro fichas de biometría. El protocolo
 * queda como nota secundaria atenuada debajo, nunca como grid.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ComandoModeProps } from '@/components/comando-modes/types';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

export default function CalmaMode(props: ComandoModeProps) {
  return (
    <View style={s.container}>
      <View style={s.panel}>
        <Text style={s.value}>{props.recoveryValue}</Text>
        <Text style={s.label}>{props.recoveryLabel}</Text>
        <Text style={s.suggestion}>{props.recoverySuggestion}</Text>
        <Pressable
          onPress={props.onRecoveryAction}
          accessibilityRole="button"
          accessibilityLabel="Atender ahora"
          style={({ pressed }) => [s.action, pressed && { opacity: 0.85 }]}>
          <Text style={s.actionText}>ATENDER AHORA</Text>
        </Pressable>
      </View>

      <View style={s.protocol}>
        <Pressable
          onPress={props.onContinueLesson}
          accessibilityRole="button"
          accessibilityLabel={`${props.moduleLabel}, ${props.lessonPct} por ciento completado`}
          style={s.protocolRow}>
          <Text style={s.protocolText}>{props.moduleLabel}</Text>
          <Text style={s.protocolText}>{props.lessonPct}%</Text>
        </Pressable>
        <Pressable
          onPress={props.onDirective}
          accessibilityRole="button"
          accessibilityLabel={props.directiveTitle}
          style={s.protocolRow}>
          <Text style={s.protocolText} numberOfLines={1}>{props.directiveTitle}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  panel: {
    borderWidth: 1,
    borderColor: palette.info,
    borderRadius: radii.lg,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 56,
    color: palette.goldText,
  },
  label: {
    fontFamily: Fonts.displayMedium,
    fontWeight: '700',
    fontSize: typography.label.fontSize,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.smoke,
  },
  suggestion: {
    marginTop: spacing.md,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.fontSize * 1.6,
    // palette.paper es blanco CONSTANTE (para texto sobre rellenos oscuros
    // como danger/purple) — este texto va sobre el fondo normal de la
    // página, no sobre un relleno de color. En tema claro sería texto
    // blanco invisible. palette.ivory es el texto primario que sí sigue
    // el tema.
    color: palette.ivory,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: Fonts.displayMedium,
    fontWeight: '700',
    fontSize: typography.label.fontSize,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.goldText,
  },
  protocol: {
    opacity: 0.65,
    gap: spacing.xs,
  },
  protocolRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  protocolText: {
    fontSize: typography.caption.fontSize,
    color: palette.smoke,
  },
});
