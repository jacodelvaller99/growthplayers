import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type React from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewProps } from 'react-native';

import { Colors, Fonts, palette, radii, spacing, surfaces, typography } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ─── Polaris Mark ────────────────────────────────────────────────────────────

export function PolarisMark({ size = 34 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <View style={styles.markNorth} />
      <View style={styles.markCross} />
    </View>
  );
}

// ─── App Header ──────────────────────────────────────────────────────────────

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

// ─── Premium Card ────────────────────────────────────────────────────────────

export function PremiumCard({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

// ─── Gold Accent Card (left border stripe) ───────────────────────────────────

export function GoldAccentCard({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.goldAccentCard, style]} {...props}>
      <View style={styles.goldAccentStripe} />
      <View style={styles.goldAccentContent}>{children}</View>
    </View>
  );
}

// ─── Gold Divider ────────────────────────────────────────────────────────────

export function GoldDivider({ label }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      {label ? <Text style={styles.dividerLabel}>{label}</Text> : null}
      {label ? <View style={styles.dividerLine} /> : null}
    </View>
  );
}

// ─── Editorial Panel ─────────────────────────────────────────────────────────

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

// ─── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={screen.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

export function MetricCard({ label, value, meta, icon }: { label: string; value: string; meta?: string; icon: IconName }) {
  return (
    <PremiumCard style={styles.metricCard}>
      <View style={styles.metricTop}>
        <MaterialIcons name={icon} color={palette.gold} size={18} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {meta ? <Text style={styles.metricMeta}>{meta}</Text> : null}
    </PremiumCard>
  );
}

// ─── Sovereign Score ─────────────────────────────────────────────────────────
// Signature luxury KPI — the single most important number on the profile screen

export function SovereignScore({ score, max = 1000 }: { score: number; max?: number }) {
  const pct = Math.min(Math.round((score / max) * 100), 100);
  const tier = score >= 800 ? 'ELITE' : score >= 600 ? 'AVANZADO' : score >= 400 ? 'EN ASCENSO' : 'INICIANDO';
  return (
    <PremiumCard style={styles.sovereignCard}>
      <Text style={styles.sovereignEyebrow}>SCORE SOBERANO</Text>
      <Text style={styles.sovereignNumber}>{score}</Text>
      <View style={styles.sovereignTrackRow}>
        <View style={styles.sovereignTrack}>
          <View style={[styles.sovereignFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.sovereignPct}>{pct}%</Text>
      </View>
      <StatusPill label={tier} tone="gold" />
    </PremiumCard>
  );
}

// ─── Weekly Sparkline ────────────────────────────────────────────────────────

export function WeeklySparkline({ label, values, color = palette.gold }: { label: string; values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.sparklineBlock}>
      <Text style={styles.sparklineLabel}>{label}</Text>
      <View style={styles.sparklineBars}>
        {values.map((v, i) => (
          <View key={i} style={styles.sparklineBarWrap}>
            <View
              style={[
                styles.sparklineBar,
                {
                  height: Math.max(4, Math.round((v / max) * 40)),
                  backgroundColor: i === values.length - 1 ? color : `${color}66`,
                },
              ]}
            />
            <Text style={styles.sparklineDay}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'][i % 7]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Achievement Badge ───────────────────────────────────────────────────────

export function AchievementBadge({ icon, label, earned }: { icon: IconName; label: string; earned: boolean }) {
  return (
    <View style={[styles.badge, !earned && styles.badgeEarned]}>
      <MaterialIcons name={icon} size={22} color={earned ? palette.black : palette.smoke} />
      <Text style={[styles.badgeLabel, !earned && styles.badgeLabelDim]}>{label}</Text>
    </View>
  );
}

// ─── State Meter ─────────────────────────────────────────────────────────────

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

// ─── Scale Selector ──────────────────────────────────────────────────────────

export function ScaleSelector({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.scaleBlock}>
      <View style={styles.rowBetween}>
        <View style={styles.scaleLabelRow}>
          {icon ? <MaterialIcons name={icon} size={14} color={palette.gold} /> : null}
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
        <Text style={styles.scaleValue}>{value}</Text>
      </View>
      <View style={styles.scaleRow}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
          <Pressable
            key={item}
            accessibilityLabel={`${label} ${item}`}
            accessibilityRole="button"
            onPress={() => onChange(item)}
            style={({ pressed }) => [styles.scaleStep, item <= value && styles.scaleStepActive, pressed && { opacity: 0.75 }]}>
            <Text style={[styles.scaleStepText, item <= value && styles.scaleStepTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Progress Card ───────────────────────────────────────────────────────────

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

// ─── Primary Button ──────────────────────────────────────────────────────────

export function PrimaryButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      {icon ? <MaterialIcons name={icon} color={palette.black} size={18} /> : null}
    </Pressable>
  );
}

// ─── Secondary Button ────────────────────────────────────────────────────────

export function SecondaryButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
      {icon ? <MaterialIcons name={icon} color={palette.gold} size={18} /> : null}
    </Pressable>
  );
}

// ─── Danger Button ───────────────────────────────────────────────────────────

export function DangerButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}>
      <Text style={styles.dangerButtonText}>{label}</Text>
      {icon ? <MaterialIcons name={icon} color={palette.danger} size={18} /> : null}
    </Pressable>
  );
}

// ─── Premium Input ───────────────────────────────────────────────────────────

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

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

export function ChatBubble({ role, children }: { role: 'mentor' | 'user'; children: React.ReactNode }) {
  return (
    <View style={[styles.chatBubble, role === 'user' ? styles.userBubble : styles.mentorBubble]}>
      <Text style={[styles.chatText, role === 'user' && styles.userChatText]}>{children}</Text>
    </View>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

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

// ─── Screen defaults ─────────────────────────────────────────────────────────

export const screen = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  sectionTitle: {
    ...typography.section,
    color: palette.ivory,
  },
});

// ─── Internal Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
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

  // Polaris mark
  mark: {
    alignItems: 'center',
    backgroundColor: palette.blackDeep,
    borderColor: palette.line,
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

  // Cards
  card: {
    ...surfaces.premiumCard,
    padding: spacing.lg,
  },
  goldAccentCard: {
    ...surfaces.premiumCard,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  goldAccentStripe: {
    backgroundColor: palette.gold,
    width: 3,
  },
  goldAccentContent: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },

  // Gold divider
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  dividerLine: {
    backgroundColor: palette.line,
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    ...typography.label,
    color: palette.gold,
  },

  // Editorial panel
  editorialPanel: {
    gap: spacing.lg,
    overflow: 'hidden',
    paddingVertical: spacing.xl,
  },
  editorialTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 40,
    textTransform: 'uppercase',
  },
  editorialBody: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 24,
  },

  // Section header
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionMeta: {
    ...typography.mono,
    color: palette.gold,
  },

  // Metric card
  metricCard: {
    gap: spacing.sm,
    minHeight: 130,
    width: '47.8%',
    justifyContent: 'space-between',
  },
  metricTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricLabel: {
    ...typography.label,
    color: palette.ash,
  },
  metricValue: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 34,
  },
  metricMeta: {
    ...typography.mono,
    color: palette.gold,
  },

  // Sovereign score
  sovereignCard: {
    gap: spacing.md,
    alignItems: 'flex-start',
    borderColor: palette.lineHard,
  },
  sovereignEyebrow: {
    ...typography.label,
    color: palette.gold,
  },
  sovereignNumber: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 76,
  },
  sovereignTrackRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  sovereignTrack: {
    backgroundColor: palette.charcoal,
    flex: 1,
    height: 3,
    overflow: 'hidden',
  },
  sovereignFill: {
    backgroundColor: palette.gold,
    height: '100%',
  },
  sovereignPct: {
    ...typography.mono,
    color: palette.gold,
  },

  // Weekly sparkline
  sparklineBlock: {
    gap: spacing.sm,
  },
  sparklineLabel: {
    ...typography.label,
    color: palette.ash,
  },
  sparklineBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: 52,
  },
  sparklineBarWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 4,
  },
  sparklineBar: {
    borderRadius: 1,
    width: '100%',
    minHeight: 4,
  },
  sparklineDay: {
    ...typography.label,
    color: palette.smoke,
  },

  // Achievement badge
  badge: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    gap: 6,
    padding: spacing.md,
    width: '22%',
  },
  badgeEarned: {
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderWidth: 1,
  },
  badgeLabel: {
    ...typography.label,
    color: palette.black,
    textAlign: 'center',
  },
  badgeLabelDim: {
    color: palette.smoke,
  },

  // Progress
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
    height: 2,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: palette.gold,
    height: '100%',
  },

  // State meter
  stateMeter: {
    gap: spacing.sm,
  },

  // Scale selector
  scaleBlock: {
    gap: spacing.md,
  },
  scaleLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scaleValue: {
    color: palette.gold,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '800',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  scaleStep: {
    alignItems: 'center',
    backgroundColor: palette.charcoal,
    borderColor: palette.lineSoft,
    borderWidth: 1,
    flex: 1,
    height: 44,
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

  // Buttons
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    ...typography.section,
    color: palette.black,
    fontSize: 11,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    ...typography.section,
    color: palette.gold,
    fontSize: 11,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: palette.dangerMuted,
    borderColor: 'rgba(214, 91, 91, 0.3)',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
  },
  dangerButtonText: {
    ...typography.section,
    color: palette.danger,
    fontSize: 11,
  },

  // Input
  input: {
    ...typography.body,
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: palette.ivory,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },

  // Chat
  chatBubble: {
    borderRadius: radii.md,
    maxWidth: '86%',
    padding: spacing.lg,
  },
  mentorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.charcoal,
    borderColor: palette.lineSoft,
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

  // Pill
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  pillDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  pillText: {
    ...typography.label,
    fontSize: 8,
  },
});
