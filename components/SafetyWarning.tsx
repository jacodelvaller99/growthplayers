/**
 * SafetyWarning — contextual, non-dismissable health/safety notice.
 *
 * Shown on the intro/setup view of a wellness practice, BEFORE the user starts
 * the exercise (App Store guideline 1.4.1). Unlike `MedicalDisclaimer`, this is
 * always visible — it cannot be dismissed and is not persisted.
 *
 * Mirrors the inline disclaimer pattern in `app/bienestar/suplementacion.tsx`
 * and the modal in `app/bienestar/ayuno.tsx`: warning icon + title + body, on a
 * tinted accent card. Themeable — uses only `palette.*` tokens (status/brand
 * accents are constant by design; surrounding text re-themes light/dark).
 *
 * Usage:
 *   <SafetyWarning title="ANTES DE EMPEZAR" body="No realices…" />
 *   <SafetyWarning tone="danger" body="…" />
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';

type Tone = 'gold' | 'danger';

interface SafetyWarningProps {
  /** Body copy — the actual safety guidance. */
  body: string;
  /** Short heading. Defaults to "AVISO DE SEGURIDAD". */
  title?: string;
  /** Accent: gold (default, cautionary) or danger (stronger, red). */
  tone?: Tone;
  /** MaterialIcons glyph. Defaults to "warning". */
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  /** Extra margin overrides (e.g. spacing between surrounding cards). */
  style?: object;
}

const TONES: Record<Tone, { accent: string; tint: string; border: string }> = {
  gold:   { accent: palette.gold,   tint: palette.goldLight,    border: palette.lineGold },
  danger: { accent: palette.danger, tint: palette.dangerMuted,  border: palette.danger },
};

export default function SafetyWarning({
  body,
  title = 'AVISO DE SEGURIDAD',
  tone = 'gold',
  icon = 'warning',
  style,
}: SafetyWarningProps) {
  const t = TONES[tone];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${body}`}
      style={[
        styles.container,
        { backgroundColor: t.tint, borderColor: t.border },
        style,
      ]}>
      <MaterialIcons name={icon} size={18} color={t.accent} style={styles.icon} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: t.accent }]}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  icon: {
    marginTop: 1,
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  body: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 12,
    lineHeight: 18,
  },
});
