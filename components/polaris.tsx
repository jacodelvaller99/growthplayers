import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type React from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewProps } from 'react-native';

import { Colors, Fonts, palette, radii, spacing, surfaces, typography } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function PolarisMark({ size = 34 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <View style={styles.markNorth} />
      <View style={styles.markCross} />
    </View>
  );
}

export function AppHeader({
  title,
  eyebrow = 'POLARIS GROWTH INSTITUTE',
  right,
}: {
  title: string;
  eyebrow?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <PolarisMark />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

export function PremiumCard({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

export function EditorialPanel({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <PremiumCard style={styles.editorialPanel}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.editorialTitle}>{title}</Text>
      {body ? <Text style={styles.editorialBody}>{body}</Text> : null}
      {children}
    </PremiumCard>
  );
}

export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={screen.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

export function MetricCard({ label, value, meta, icon }: { label: string; value: string; meta?: string; icon: IconName }) {
  return (
    <PremiumCard style={styles.metricCard}>
      <MaterialIcons name={icon} color={Colors.dark.tint} size={20} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {meta ? <Text style={styles.metricMeta}>{meta}</Text> : null}
    </PremiumCard>
  );
}

export function StateMeter({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const score = Math.max(0, Math.min(value, 10));
  const percent = score * 10;
  const strong = inverted ? score <= 4 : score >= 7;
  return (
    <View style={styles.stateMeter}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={[styles.progressValue, strong && { color: palette.ivory }]}>{score}/10</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: strong ? palette.gold : palette.smoke }]} />
      </View>
    </View>
  );
}

export function ScaleSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.scaleBlock}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.scaleValue}>{value}</Text>
      </View>
      <View style={styles.scaleRow}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[styles.scaleStep, item <= value && styles.scaleStepActive]}>
            <Text style={[styles.scaleStepText, item <= value && styles.scaleStepTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ProgressCard({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <PremiumCard style={styles.progressCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.progressValue}>{value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 100))}%` }]} />
      </View>
    </PremiumCard>
  );
}

export function PrimaryButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      {icon ? <MaterialIcons name={icon} color={palette.black} size={18} /> : null}
    </Pressable>
  );
}

export function SecondaryButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
      {icon ? <MaterialIcons name={icon} color={palette.gold} size={18} /> : null}
    </Pressable>
  );
}

export function PremiumInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={palette.smoke}
      style={[styles.input, props.style]}
      selectionColor={palette.gold}
      {...props}
    />
  );
}

export function ChatBubble({ role, children }: { role: 'mentor' | 'user'; children: React.ReactNode }) {
  return (
    <View style={[styles.chatBubble, role === 'user' ? styles.userBubble : styles.mentorBubble]}>
      <Text style={[styles.chatText, role === 'user' && styles.userChatText]}>{children}</Text>
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'gold',
  dot = false,
}: {
  label: string;
  tone?: 'gold' | 'muted' | 'success';
  dot?: boolean;
}) {
  const color = tone === 'success' ? palette.success : tone === 'muted' ? palette.ash : palette.gold;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      {dot ? <View style={[styles.pillDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export const screen = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    alignSelf: 'flex-start',
    maxWidth: 390,
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 110,
    gap: spacing.xl,
  },
  sectionTitle: {
    ...typography.section,
    color: palette.ivory,
  },
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    flex: 1,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    ...typography.label,
    color: palette.gold,
  },
  headerTitle: {
    ...typography.title,
    color: palette.ivory,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: palette.blackDeep,
    borderColor: palette.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
  },
  markNorth: {
    borderBottomColor: palette.gold,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    height: 0,
    width: 0,
  },
  markCross: {
    backgroundColor: palette.gold,
    height: 2,
    marginTop: 2,
    width: 18,
  },
  card: {
    ...surfaces.premiumCard,
    padding: spacing.lg,
  },
  editorialPanel: {
    gap: spacing.lg,
    overflow: 'hidden',
    paddingVertical: spacing.xl,
  },
  editorialTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.35,
    lineHeight: 33,
    textTransform: 'uppercase',
  },
  editorialBody: {
    ...typography.body,
    color: palette.ash,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionMeta: {
    ...typography.mono,
    color: palette.gold,
  },
  metricCard: {
    gap: spacing.sm,
    minHeight: 126,
    width: '47.8%',
  },
  metricLabel: {
    ...typography.label,
    color: palette.ash,
  },
  metricValue: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricMeta: {
    ...typography.mono,
    color: palette.gold,
  },
  progressCard: {
    gap: spacing.md,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    ...typography.label,
    color: palette.ash,
  },
  progressValue: {
    ...typography.mono,
    color: palette.gold,
  },
  progressTrack: {
    backgroundColor: palette.charcoal,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: palette.gold,
    height: '100%',
  },
  stateMeter: {
    gap: spacing.sm,
  },
  scaleBlock: {
    gap: spacing.md,
  },
  scaleValue: {
    color: palette.gold,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 5,
  },
  scaleStep: {
    alignItems: 'center',
    backgroundColor: palette.charcoal,
    borderColor: Colors.dark.borderSoft,
    borderWidth: 1,
    flex: 1,
    height: 34,
    justifyContent: 'center',
  },
  scaleStepActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  scaleStepText: {
    color: palette.ash,
    fontFamily: Fonts.mono,
    fontSize: 10,
  },
  scaleStepTextActive: {
    color: palette.black,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    ...typography.label,
    color: palette.black,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: Colors.dark.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    ...typography.label,
    color: palette.gold,
  },
  input: {
    ...typography.body,
    backgroundColor: palette.graphite,
    borderColor: Colors.dark.borderSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.ivory,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  chatBubble: {
    borderRadius: radii.md,
    maxWidth: '86%',
    padding: spacing.lg,
  },
  mentorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.charcoal,
    borderColor: Colors.dark.borderSoft,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: palette.gold,
  },
  chatText: {
    ...typography.body,
    color: palette.ivory,
  },
  userChatText: {
    color: palette.black,
    fontFamily: Fonts.sansBold,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pillDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  pillText: {
    ...typography.label,
  },
});
