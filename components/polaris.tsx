import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import type React from 'react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Canvas, LinearGradient, Path, Skia, usePathInterpolation, vec } from '@shopify/react-native-skia';

import { Colors, Fonts, palette, radii, spacing, surfaces, typography } from '@/constants/theme';
import { calcSovereignTier } from '@/lib/utils';

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
// Signature luxury KPI — count-up animation 0→score in 1200ms

export function SovereignScore({ score, max = 1000 }: { score: number; max?: number }) {
  const targetPct = Math.min(Math.round((score / max) * 100), 100);
  const tier = calcSovereignTier(score);

  const animScore = useSharedValue(0);
  const animPct   = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    animScore.value = withTiming(score,      { duration: 1200 });
    animPct.value   = withTiming(targetPct,  { duration: 1200 });
  }, [score, targetPct]);

  useAnimatedReaction(
    () => Math.round(animScore.value),
    (val) => { runOnJS(setDisplayScore)(val); },
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animPct.value}%`,
  }));

  return (
    <PremiumCard style={styles.sovereignCard}>
      <Text style={styles.sovereignEyebrow}>SCORE SOBERANO</Text>
      <Text style={styles.sovereignNumber}>{displayScore}</Text>
      <View style={styles.sovereignTrackRow}>
        <View style={styles.sovereignTrack}>
          <Animated.View style={[styles.sovereignFill, fillStyle]} />
        </View>
        <Text style={styles.sovereignPct}>{targetPct}%</Text>
      </View>
      <StatusPill label={tier} tone="gold" />
    </PremiumCard>
  );
}

// ─── Weekly Sparkline ────────────────────────────────────────────────────────
// Cubic bezier line + gradient fill + 800ms entrance via usePathInterpolation

const SPARKLINE_H = 56;
const DAY_LABELS  = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Build a smooth cubic bezier path through an array of {x,y} points. */
function buildLinePath(pts: { x: number; y: number }[]) {
  const path = Skia.Path.Make();
  if (pts.length === 0) return path;
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    path.cubicTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  return path;
}

/** Same as buildLinePath but closed at the bottom (for gradient fill). */
function buildFillPath(pts: { x: number; y: number }[], H: number) {
  const path = buildLinePath(pts);
  if (pts.length > 0) {
    path.lineTo(pts[pts.length - 1].x, H);
    path.lineTo(pts[0].x, H);
    path.close();
  }
  return path;
}

export function WeeklySparkline({
  label,
  values,
  color = palette.gold,
}: {
  label: string;
  values: number[];
  color?: string;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const canvasW = Math.min(screenWidth - 72, 366);
  const H       = SPARKLINE_H;
  const max     = Math.max(...values, 1);
  const n       = values.length;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 800 });
  }, []); // only on mount

  // Pre-compute start (flat at bottom) and end (actual) paths
  const { flatLine, actualLine, flatFill, actualFill } = useMemo(() => {
    const actPts = values.map((v, i) => ({
      x: n > 1 ? (i / (n - 1)) * canvasW : canvasW / 2,
      y: H - (v / max) * H,
    }));
    const flatPts = values.map((_, i) => ({
      x: n > 1 ? (i / (n - 1)) * canvasW : canvasW / 2,
      y: H,
    }));
    return {
      flatLine:   buildLinePath(flatPts),
      actualLine: buildLinePath(actPts),
      flatFill:   buildFillPath(flatPts, H),
      actualFill: buildFillPath(actPts, H),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.join(','), max, n, canvasW, H]);

  // Animated paths via Skia's usePathInterpolation (SharedValue<SkPath>)
  const animLine = usePathInterpolation(progress, [0, 1], [flatLine, actualLine]);
  const animFill = usePathInterpolation(progress, [0, 1], [flatFill, actualFill]);

  return (
    <View style={styles.sparklineBlock}>
      <Text style={styles.sparklineLabel}>{label}</Text>
      <Canvas style={{ width: canvasW, height: H }}>
        {/* Gradient fill area */}
        <Path path={animFill as any} style="fill">
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, H)}
            colors={[`${color}50`, `${color}00`]}
          />
        </Path>
        {/* Stroke line */}
        <Path
          path={animLine as any}
          style="stroke"
          strokeWidth={2}
          color={color}
          strokeCap="round"
          strokeJoin="round"
        />
      </Canvas>
      <View style={[styles.sparklineDaysRow, { width: canvasW }]}>
        {values.map((_, i) => (
          <Text key={i} style={[styles.sparklineDay, { flex: 1, textAlign: 'center' }]}>
            {DAY_LABELS[i % 7]}
          </Text>
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
// Selection haptic on tap + glow shadow on exact active step

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
            onPress={() => {
              Haptics.selectionAsync();
              onChange(item);
            }}
            style={({ pressed }) => [
              styles.scaleStep,
              item <= value && styles.scaleStepActive,
              item === value && styles.scaleStepGlow,
              pressed && { transform: [{ scale: 0.88 }] },
            ]}>
            <Text style={[styles.scaleStepText, item <= value && styles.scaleStepTextActive]}>
              {item}
            </Text>
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

export function PrimaryButton({ label, icon, onPress, disabled }: { label: string; icon?: IconName; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && { opacity: 0.4 },
        !disabled && pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
      ]}>
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

export function PremiumInput({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={palette.smoke}
      style={[styles.input, style]}
      selectionColor={palette.gold}
      {...rest}
    />
  );
}

// ─── Skeleton Bar ────────────────────────────────────────────────────────────
// Reanimated pulse — use when content is loading

export const SkeletonBar = memo(function SkeletonBar({
  width = '100%',
  height = 16,
  style,
}: {
  width?: string | number;
  height?: number;
  style?: object;
}) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.75, { duration: 700 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: palette.charcoal, borderRadius: radii.sm }, animStyle, style]}
    />
  );
});

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

export const ChatBubble = memo(function ChatBubble({
  role,
  children,
}: {
  role: 'mentor' | 'user';
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.chatBubble, role === 'user' ? styles.userBubble : styles.mentorBubble]}>
      <Text style={[styles.chatText, role === 'user' && styles.userChatText]}>{children}</Text>
    </View>
  );
});

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
    paddingTop: 16,
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
    elevation: 2,
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
  // Brand accent panel — left gold strip signature element
  accentPanel: {
    flexDirection: 'row',
    backgroundColor: palette.graphite,
    borderRadius: radii.none,
    overflow: 'hidden',
  },
  accentStrip: {
    width: 3,
    backgroundColor: palette.gold,
  },
  accentContent: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingLeft: spacing.lg,
  },
  editorialTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '400',      // Michroma is single-weight
    letterSpacing: 2.5,     // Extended brand spacing
    lineHeight: 36,
    textTransform: 'uppercase',
  },
  editorialBody: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 22,
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
    fontSize: 26,
    fontWeight: '400',   // Michroma single-weight
    letterSpacing: 2,
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

  // Weekly sparkline (Skia)
  sparklineBlock: {
    gap: spacing.sm,
  },
  sparklineLabel: {
    ...typography.label,
    color: palette.ash,
  },
  sparklineDaysRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  sparklineDay: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 8,
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
    borderRadius: radii.none,  // sharp = brand tactical feel
    height: 3,                 // thin, precise line
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
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 2,
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
  scaleStepGlow: {
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 8,
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
    borderRadius: radii.none,   // zero radius = brand precision/tactical
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    ...typography.section,
    color: palette.black,
    letterSpacing: 2.5,
    fontSize: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: palette.line,
    borderRadius: radii.none,   // zero = brand precision/tactical
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
    letterSpacing: 2.5,
    fontSize: 10,
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
    borderRadius: radii.sm,    // near-sharp corners — brand precision
    maxWidth: '86%',
    padding: spacing.lg,
  },
  mentorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.charcoal,
    borderColor: Colors.dark.border,
    borderLeftColor: palette.gold,
    borderLeftWidth: 2,        // accent left strip — brand editorial element
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
    borderRadius: radii.sm,    // brand: sharp corners even on pills
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
