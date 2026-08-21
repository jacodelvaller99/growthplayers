import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import type React from 'react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedNumber } from './AnimatedNumber';
import { Canvas, LinearGradient, Path, Skia, usePathInterpolation, vec } from '@shopify/react-native-skia';

import { Colors, Fonts, palette, radii, spacing, surfaces, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { parseMarkdownLite } from '@/lib/markdownLite';
import { calcSovereignTier, type SovereignDelta } from '@/lib/utils';
import { PolarisLogo } from './PolarisLogo';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// ─── Polaris Mark — usa el SVG oficial del Manual de Marca ───────────────────

export function PolarisMark({ size = 34 }: { size?: number }) {
  return <PolarisLogo variant="star" size={size} color={palette.goldText} />;
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
// El único patrón de "franja dorada" sancionado por DESIGN.md — onPress opcional
// lo vuelve interactivo (hover/focus/press vía HoverCard) sin romper los usos
// estáticos existentes (mentoria/norte/checkin/admin), que no pasan onPress.

export function GoldAccentCard({
  children,
  style,
  onPress,
  hoverStyle,
  ...props
}: ViewProps & {
  onPress?: PressableProps['onPress'];
  hoverStyle?: StyleProp<ViewStyle>;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: PressableProps['accessibilityLabel'];
}) {
  if (onPress) {
    return (
      <HoverCard
        onPress={onPress}
        hoverStyle={hoverStyle}
        style={[styles.goldAccentCard, style]}
        accessibilityRole={props.accessibilityRole}
        accessibilityLabel={props.accessibilityLabel}>
        <View style={styles.goldAccentStripe} />
        <View style={styles.goldAccentContent}>{children}</View>
      </HoverCard>
    );
  }
  return (
    <View style={[styles.goldAccentCard, style]} {...props}>
      <View style={styles.goldAccentStripe} />
      <View style={styles.goldAccentContent}>{children}</View>
    </View>
  );
}

// ─── Hover Card — Pressable con estados de escritorio (web) ──────────────────
// El style-callback de react-native-web recibe { hovered, focused } además de
// { pressed }; los tipos de RN solo declaran pressed, de ahí el cast local.
// En nativo hovered/focused son undefined → el componente degrada a un
// Pressable normal con feedback de pressed. Pensado para cards clickeables.

type WebPressableState = PressableStateCallbackType & {
  hovered?: boolean;
  focused?: boolean;
};

// Transición suave del lift/borde en web; en nativo no existe la propiedad.
const hoverTransition = Platform.select<ViewStyle | undefined>({
  web: {
    transitionProperty: 'transform, border-color, background-color',
    transitionDuration: '160ms',
  } as unknown as ViewStyle,
  default: undefined,
});

const hoverLift: ViewStyle = {
  borderColor: palette.lineHard,
  backgroundColor: palette.graphiteLight,
  transform: [{ translateY: -2 }],
};

// Anillo de foco oro para navegación por teclado (outline* solo existe en RNW).
const focusRing = Platform.select<ViewStyle | undefined>({
  web: {
    outlineColor: palette.gold,
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineOffset: 2,
  } as unknown as ViewStyle,
  default: undefined,
});

export function HoverCard({
  style,
  hoverStyle,
  children,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      {...props}
      style={(state) => {
        const { hovered, focused, pressed } = state as WebPressableState;
        return [
          hoverTransition,
          style,
          hovered && (hoverStyle ?? hoverLift),
          focused && focusRing,
          pressed && { opacity: 0.9 },
        ];
      }}>
      {children}
    </Pressable>
  );
}

// ─── Gold Divider ────────────────────────────────────────────────────────────

/**
 * Rótulo de sección.
 *
 * Era una línea dorada con la etiqueta CENTRADA en medio. Repetido 53 veces,
 * eso convierte cada pantalla en una escalera de barras doradas: el oro deja de
 * señalar y pasa a ser el fondo. En el diseño aprobado el rótulo es lo
 * contrario — pequeño, gris, pegado a la izquierda, sin línea: se lee cuando lo
 * buscas y desaparece cuando no. El acento se reserva para lo accionable.
 *
 * Se conserva el nombre y la firma a propósito: así los 53 sitios adoptan el
 * rótulo nuevo sin tocar ni una llamada.
 */
/**
 * Rotulo de seccion. `inset` cuando el contenedor NO trae margen lateral.
 *
 * POR QUE HACE FALTA DECIRLO: la app tiene dos familias de pantalla. Veintisiete
 * usan el contenedor compartido `screen.content`, que ya lleva su margen, y el
 * rotulo hereda. Otras quince traen contenedor propio sin margen lateral y se
 * lo ponen bloque a bloque -- ahi el rotulo era el unico hijo sin el, y caia
 * en x=0 mientras las tarjetas de al lado empezaban en 24.
 *
 * Un componente no puede saber en cual de las dos esta, asi que se declara.
 * Medido en El Circulo: rotulos en x=0, tarjetas en x=24.
 *
 * No lo causo el rediseno; lo destapo. Cuando esto era una linea a todo lo
 * ancho, empezar en cero parecia intencionado. Convertido en texto, se lee
 * como lo que siempre fue: un bloque fuera de la reticula.
 */
export function GoldDivider({ label, inset }: { label?: string; inset?: boolean }) {
  if (!label) return <View style={styles.dividerLine} />;
  return (
    <Text
      style={[styles.sectionLabel, inset && styles.sectionLabelInset]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={label}>
      {label}
    </Text>
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

export function MetricCard({
  label, value, numericValue, numericSuffix = '', meta, icon, accent, entryDelay = 0, style, onPress,
}: {
  label: string;
  value: string;
  numericValue?: number;
  numericSuffix?: string;
  meta?: string;
  icon: IconName;
  accent?: string;
  entryDelay?: number;
  /** Override card container styles — use for desktop flex:1 or custom sizing */
  style?: object;
  /** Hace la tarjeta navegable (drill-down a la pantalla de la métrica) */
  onPress?: () => void;
}) {
  const iconColor = accent ?? palette.gold;
  const body = (
    <>
      <View style={styles.metricTop}>
        <MaterialIcons name={icon} color={iconColor} size={16} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      {numericValue !== undefined
        ? <AnimatedNumber value={numericValue} suffix={numericSuffix} delay={entryDelay + 120} style={styles.metricValue} />
        : <Text style={styles.metricValue}>{value}</Text>
      }
      {meta ? <Text style={styles.metricMeta}>{meta}</Text> : null}
    </>
  );
  return (
    <Animated.View
      style={[styles.card, styles.metricCard, style]}
      entering={FadeInDown.delay(entryDelay).springify().damping(20).stiffness(180)}
    >
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label} — abrir detalle`}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </Animated.View>
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

// ─── Sovereign Delta tag ──────────────────────────────────────────────────────
// Muestra el PROGRESO (cuerpo de hoy vs línea base propia), no el absoluto.
// gaining=success · declining=ámbar (goldText) · stable=neutro (ash).
// Sin línea base lista → "Construyendo tu línea base · día X de 7".

export function SovereignDeltaTag({
  delta,
  baselineDay,
}: {
  delta: SovereignDelta;
  /** Día (1-based) dentro de la ventana de 7 días de construcción de línea base. */
  baselineDay?: number;
}) {
  if (!delta.hasBaseline) {
    const day = Math.min(Math.max(baselineDay ?? 1, 1), 7);
    return (
      <View style={styles.deltaTag}>
        <MaterialIcons name="hourglass-bottom" size={13} color={palette.smoke} />
        <Text style={styles.deltaTagBuilding}>
          Construyendo tu línea base · día {day} de 7
        </Text>
      </View>
    );
  }

  const tone =
    delta.state === 'gaining' ? palette.success
    : delta.state === 'declining' ? palette.goldText
    : palette.ash;
  const icon: IconName =
    delta.state === 'gaining' ? 'trending-up'
    : delta.state === 'declining' ? 'trending-down'
    : 'trending-flat';

  return (
    <View style={styles.deltaTag}>
      <MaterialIcons name={icon} size={14} color={tone} />
      <Text style={[styles.deltaTagLabel, { color: tone }]}>{delta.label}</Text>
    </View>
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

type SparklineProps = {
  label: string;
  values: number[];
  color?: string;
};

// Dispatcher: Platform.OS is constant per session, so each branch renders a
// dedicated component with its own (unconditional) hook order.
export function WeeklySparkline(props: SparklineProps) {
  if (Platform.OS === 'web') return <SparklineWebBars {...props} />;
  return <SparklineNativeSkia {...props} />;
}

// ── Web fallback — @shopify/react-native-skia doesn't run in browsers ────────
function SparklineWebBars({ label, values, color = palette.gold }: SparklineProps) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.sparklineBlock}>
      <Text style={styles.sparklineLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: SPARKLINE_H, gap: 4 }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{
              width: '100%',
              height: Math.max(4, Math.round((v / max) * (SPARKLINE_H - 8))),
              backgroundColor: color,
              borderRadius: radii.xs,
              opacity: 0.85,
            }} />
            <Text style={[styles.sparklineDay, { textAlign: 'center' }]}>{DAY_LABELS[i % 7]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SparklineNativeSkia({ label, values, color = palette.gold }: SparklineProps) {
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

// ─── Achievement Badge — BORRADO ─────────────────────────────────────────────
//
// Era una ficha de 22% de ancho que se rellenaba de oro macizo al ganarse, con
// icono de copa o medalla. Sus unicos consumidores eran las ocho baldosas de
// LOGROS en Progreso, que es la "badge-as-toy mechanic" que PRODUCT.md nombra
// como anti-referencia. Sin ellas, este componente no tiene a quien servir: un
// primitivo de premio en el sistema de diseño es una invitacion a que vuelva.
//
// El reconocimiento del cruce vive en `MilestoneToast` (components/narrative),
// que es sobrio y cita las palabras del usuario.

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
  guide,
}: {
  label: string;
  /** `null` = el usuario todavía no ha elegido. NO es lo mismo que un 5. */
  value: number | null;
  onChange: (value: number) => void;
  icon?: IconName;
  /** Guía corta de rangos bajo la escala (p.ej. "1-3 Despejado · 4-7
   *  Cargado · 8-10 Saturado") — opcional: solo los campos donde el número
   *  solo no basta para calibrar la respuesta la necesitan. */
  guide?: string;
}) {
  return (
    <View style={styles.scaleBlock}>
      <View style={styles.rowBetween}>
        <View style={styles.scaleLabelRow}>
          {icon ? <MaterialIcons name={icon} size={14} color={palette.goldText} /> : null}
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
            // Eran 10 botones sin decir cuál está elegido: el lector de pantalla
            // leía "Energía 1 … Energía 10" sin marcar el valor actual.
            accessibilityState={{ selected: item === value }}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(item);
            }}
            style={({ pressed }) => [
              styles.scaleStep,
              // Oro MACIZO solo en el paso elegido; el recorrido va tintado.
              //
              // Antes `item <= value` rellenaba de #FFC804 sólido todo lo que
              // quedaba por debajo: con los valores por defecto (7/7/4/7) el
              // check-in abría con 25 de 40 celdas de oro macizo, sin que el
              // usuario hubiera tocado nada. El oro de esta marca se GANA, y
              // ahí lo regalaba una barra de progreso. Además dejaba sin efecto
              // las dos cosas que sí deben brillar: el botón de guardar y la
              // zona del cuerpo que uno señala.
              // `value === null` = sin elegir: ninguna celda encendida.
              value !== null && item < value && styles.scaleStepFilled,
              item === value && styles.scaleStepActive,
              item === value && styles.scaleStepGlow,
              pressed && { transform: [{ scale: 0.88 }] },
            ]}>
            <Text style={[styles.scaleStepText, item === value && styles.scaleStepTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {guide ? <Text style={styles.scaleGuide}>{guide}</Text> : null}
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
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 250 });
  };
  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Animated.View style={[animStyle, disabled && { opacity: 0.4 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        // `disabled` solo bajaba la opacidad: el lector de pantalla anunciaba como
        // accionable un CTA que no lo era, y el Pressable seguía disparando eventos.
        // El guard de handlePress no basta — la promesa tiene que llegar al árbol.
        disabled={disabled}
        accessibilityState={{ disabled: !!disabled }}
        onPress={handlePress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{label}</Text>
        {icon ? <MaterialIcons name={icon} color={palette.ink} size={18} /> : null}
      </Pressable>
    </Animated.View>
  );
}

// ─── Secondary Button ────────────────────────────────────────────────────────

export function SecondaryButton({ label, icon, onPress }: { label: string; icon?: IconName; onPress?: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12, stiffness: 250 }); };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{label}</Text>
        {icon ? <MaterialIcons name={icon} color={palette.goldText} size={18} /> : null}
      </Pressable>
    </Animated.View>
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
      {icon ? <MaterialIcons name={icon} color={palette.dangerText} size={18} /> : null}
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
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // El pulso es un bucle INFINITO: es justo el tipo de movimiento sostenido
    // que molesta con sensibilidad vestibular. Con reduce-motion queda estático
    // a media opacidad, que sigue leyéndose como "cargando".
    if (reducedMotion) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(withTiming(0.75, { duration: 700 }), -1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: palette.charcoal, borderRadius: radii.sm }, animStyle, style]}
    />
  );
});

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

/**
 * Texto con markdown-lite (negrita/itálica/divisores) — para mensajes de
 * Norman y cualquier salida de modelo que llegue con ** y --- crudos.
 */
export const MarkdownText = memo(function MarkdownText({
  text,
  style,
}: {
  text: string;
  style?: React.ComponentProps<typeof Text>['style'];
}) {
  const blocks = useMemo(() => parseMarkdownLite(text), [text]);
  return (
    <>
      {blocks.map((block, i) =>
        block.kind === 'divider' ? (
          <View key={i} style={styles.mdDivider} />
        ) : (
          <Text key={i} style={style}>
            {block.segments.map((seg, j) => (
              <Text
                key={j}
                style={[
                  seg.bold && { fontFamily: Fonts.sansBold },
                  seg.italic && { fontStyle: 'italic' },
                ]}>
                {seg.text}
              </Text>
            ))}
          </Text>
        ),
      )}
    </>
  );
});

export const ChatBubble = memo(function ChatBubble({
  role,
  children,
}: {
  role: 'mentor' | 'user';
  children: React.ReactNode;
}) {
  const textStyle = [styles.chatText, role === 'user' && styles.userChatText];
  return (
    <View style={[styles.chatBubble, role === 'user' ? styles.userBubble : styles.mentorBubble]}>
      {typeof children === 'string' ? (
        <MarkdownText text={children} style={textStyle} />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
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

/**
 * Returns responsive screen styles.
 * Desktop (≥1200px): centrado, maxWidth 960, padding horizontal 40.
 * Tablet  (768-1199): centrado, maxWidth 720, padding horizontal 32.
 * Mobile  (<768):     maxWidth 430 (igual que screen.content estático).
 */
export function useScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1200;
  const isTablet  = width >= 768;

  if (isDesktop) {
    return {
      root: screen.root,
      content: {
        alignSelf:       'center'  as const,
        width:           '100%'   as const,
        maxWidth:        960,
        paddingHorizontal: 40,
        paddingTop:      32,
        paddingBottom:   80,
        gap:             spacing.xl,
      },
      isDesktop: true,
      isTablet:  true,
    };
  }

  if (isTablet) {
    return {
      root: screen.root,
      content: {
        alignSelf:       'center'  as const,
        width:           '100%'   as const,
        maxWidth:        720,
        paddingHorizontal: 32,
        paddingTop:      16,
        paddingBottom:   120,
        gap:             spacing.xl,
      },
      isDesktop: false,
      isTablet:  true,
    };
  }

  return {
    root:      screen.root,
    content:   screen.content,
    isDesktop: false,
    isTablet:  false,
  };
}

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
    color: palette.goldText,
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
  // Rótulo de sección — gris, pequeño, a la izquierda. Ver GoldDivider.
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: palette.smoke,
    marginTop: spacing.sm,
  },
  sectionLabelInset: { paddingHorizontal: spacing.lg },
  dividerLine: {
    backgroundColor: palette.line,
    height: 1,
    marginVertical: spacing.sm,
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
    fontFamily: Fonts.display,  // GrandisExtended-Bold
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2.0,
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
    color: palette.ash,
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
    fontFamily: Fonts.display,  // GrandisExtended-Bold
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  metricMeta: {
    ...typography.mono,
    color: palette.smoke,
  },

  // Sovereign score
  sovereignCard: {
    gap: spacing.md,
    alignItems: 'flex-start',
    borderColor: palette.goldMuted,
    padding: spacing.xl,
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  sovereignEyebrow: {
    ...typography.label,
    color: palette.ash,
  },
  sovereignNumber: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 80,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 84,
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
    color: palette.goldText,
  },

  // Sovereign delta tag
  deltaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaTagLabel: {
    ...typography.mono,
    fontSize: 11,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  deltaTagBuilding: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 0.3,
    flexShrink: 1,
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
    color: palette.goldText,
  },
  progressTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: radii.xs,    // subtle rounding on progress bar
    height: 3,
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
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 2,
  },
  // Con flex:1 puro los 10 pasos se repartían el ancho disponible: 26.7px por paso
  // a 375px de pantalla y 21.2px a 320px — muy por debajo de los 44pt de la regla
  // del proyecto. Son 4 selectores × 10 pasos = 40 objetivos que el usuario toca a
  // diario, y un toque errado ensucia el dato que alimenta a Norman.
  // minWidth pone el suelo y flexWrap deja que baje de fila en vez de encogerse;
  // en escritorio (≥476px de contenido) los 10 siguen cabiendo en una sola fila.
  scaleGuide: {
    color: palette.ash,
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  scaleStep: {
    alignItems: 'center',
    backgroundColor: palette.charcoal,
    borderColor: palette.lineSoft,
    borderWidth: 1,
    // SIN `flex: 1`. Con flexWrap, a 301px de ancho util `flex: 1` estiraba las
    // 4 celdas de la segunda fila a ~73pt contra los 47pt de arriba: la escala
    // 1-10 se veia como dos escalas distintas.
    //
    // `flexBasis: 18%` fuerza 5+5 en vez de 6+4 — dos filas iguales se leen
    // como rejilla; 6+4 se lee como desbordamiento. A 320px de pantalla siguen
    // saliendo 44.6pt, asi que el piso tactil aguanta.
    flexBasis: '18%',
    height: 44,
    justifyContent: 'center',
    minWidth: 44,
  },
  scaleStepActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  // El recorrido hasta el valor: se lee como camino, no como premio.
  scaleStepFilled: {
    backgroundColor: palette.goldLight,
    borderColor: palette.lineGold,
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
    // 11 es el piso del proyecto para cualquier etiqueta visible, y estos son
    // los diez numeros que hay que leer para calibrarse.
    fontSize: 11,
  },
  scaleStepTextActive: {
    color: palette.ink,
  },

  // Buttons
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,     // 8px — premium soft-sharp
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    ...typography.section,
    color: palette.ink,
    letterSpacing: 2.5,
    fontSize: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: palette.line,
    borderRadius: radii.sm,     // 8px — consistent with primary
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    ...typography.section,
    color: palette.ivory,
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
    color: palette.dangerText,   // etiqueta a 11pt: necesita 4.5:1, no 3:1
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
    maxWidth: '86%',
    padding: spacing.lg,
  },
  mentorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.graphiteLight,
    borderColor: palette.line,
    borderLeftColor: palette.gold,
    borderLeftWidth: 2,        // gold left accent — brand editorial signature
    borderWidth: 1,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: radii.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: palette.gold,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: 4,
  },
  chatText: {
    ...typography.body,
    color: palette.ivory,
    lineHeight: 21,
  },
  userChatText: {
    color: palette.ink,
    fontFamily: Fonts.sansBold,
  },
  mdDivider: {
    backgroundColor: palette.line,
    height: 1,
    marginVertical: spacing.sm,
  },

  // Pill
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.xs,    // 4px — compact label feel, not full pill
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  pillDot: {
    borderRadius: radii.xs,
    height: 7,
    width: 7,
  },
  pillText: {
    ...typography.label,
    fontSize: 8,
  },
});
