/**
 * components/narrative — las piezas del arco.
 *
 * POR QUÉ EXISTEN: `components/polaris.tsx` tiene 25 componentes y ninguno de
 * progresión, consecuencia o hito. Por eso la app se siente plana: no había
 * con qué construir un arco aunque el dato existiera. Estos tres son la
 * primitiva que faltaba.
 *
 *   ArcHeader       → SETUP.   ¿Dónde estoy? (día N · acto)
 *   ConsequenceCard → PAYOFF.  ¿Qué cambió porque actué?
 *   MilestoneToast  → PAYOFF.  El cruce que hoy pasa en silencio.
 *
 * (La TENSIÓN —qué está en juego hoy— vive en el copy de los CTA de cada
 * pantalla, no en un componente: es una frase, no una caja.)
 *
 * Presentacionales: solo tokens de tema, cero IO. Reglas de oro/ink
 * respetadas — `goldText` para texto, `gold` para rellenos, `ink` solo sobre
 * superficies doradas.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { Arc, Milestone } from '@/lib/narrativeLogic';

// ─── ArcHeader — dónde estoy en la historia ─────────────────────────────────

/**
 * El marcador de posición en el arco de 90 días.
 *
 * Es lo primero que debe leerse al abrir la app. Antes solo existía en la
 * rama desktop de Comando (`comando.tsx:1112`) y enterrado en Progreso; el
 * móvil —que es donde se abre a diario— no tenía ningún marcador de día.
 *
 * `compact` quita la línea narrativa y deja solo el eyebrow, para cuando ya
 * hay otro texto largo cerca y repetir la frase sería ruido.
 */
export function ArcHeader({ arc, compact = false }: { arc: Arc; compact?: boolean }) {
  return (
    <View
      style={styles.arcWrap}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${arc.actLabel}. ${arc.line}`}>
      <View style={styles.arcEyebrowRow}>
        <View style={styles.arcRule} />
        <Text style={styles.arcEyebrow}>{arc.actLabel}</Text>
        <View style={styles.arcRule} />
      </View>
      {compact ? null : <Text style={styles.arcLine}>{arc.line}</Text>}
    </View>
  );
}

// ─── ConsequenceCard — qué cambió porque actué ──────────────────────────────

export interface ConsequenceCardProps {
  /** Etiqueta corta del tipo de lectura. Ej: "DESCOMPRESIÓN". */
  tag: string;
  /** El titular accionable. */
  title: string;
  /** El desarrollo: qué significa y qué conviene hacer. */
  body: string;
  /** Icono de MaterialIcons. */
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  /**
   * El delta contra el registro anterior (`deltaSince`). Es lo ÚNICO que el
   * usuario no podía saber antes de guardar — por eso va destacado arriba y
   * no mezclado en el cuerpo. Ausente en el primer check-in.
   */
  delta?: string | null;
  /** Botones de acción. El llamante decide; esta tarjeta no navega. */
  children?: React.ReactNode;
}

/**
 * El payoff de una acción del usuario.
 *
 * Existe porque el check-in era una acción sin recompensa: la lectura de
 * coherencia ya se veía mientras movías los sliders, así que guardar no
 * revelaba nada y quedaba la pregunta "¿pero para qué?". Esta tarjeta es
 * donde se responde.
 */
export function ConsequenceCard({ tag, title, body, icon, delta, children }: ConsequenceCardProps) {
  return (
    <PremiumCard style={styles.consequenceCard}>
      <View style={styles.consequenceHead}>
        <View style={styles.consequenceIcon}>
          <MaterialIcons name={icon} size={18} color={palette.goldText} />
        </View>
        <Text style={styles.consequenceTag}>{tag}</Text>
      </View>

      {delta ? (
        <View style={styles.deltaStrip}>
          <Text style={styles.deltaText}>{delta}</Text>
        </View>
      ) : null}

      <Text style={styles.consequenceTitle}>{title}</Text>
      <Text style={styles.consequenceBody}>{body}</Text>
      {children ? <View style={styles.consequenceActions}>{children}</View> : null}
    </PremiumCard>
  );
}

// ─── MilestoneToast — el cruce que no debe pasar en silencio ────────────────

/**
 * Reconoce un hito recién cruzado.
 *
 * Reusa el patrón que YA funciona en `app/(tabs)/norte.tsx:383-392` (el toast
 * "NORTE FIJADO EN EL SISTEMA"), que hoy es la única celebración del camino
 * principal. Racha de 7, día 30 y día 90 pasaban sin que nadie los nombrara.
 *
 * `milestoneCrossed` (lógica pura) ya garantiza que esto solo aparece en el
 * cruce, no mientras el hito se sostiene — si no, la felicitación diaria se
 * convierte en ruido y deja de significar nada.
 */
export function MilestoneToast({ milestone }: { milestone: Milestone | null }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!milestone) return;
    if (reduced) {
      // Sin movimiento: aparece ya visible. El hito no se pierde, solo no viaja.
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [milestone, reduced, anim]);

  if (!milestone) return null;

  return (
    <Animated.View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${milestone.title}. ${milestone.line}`}
      style={[
        styles.milestone,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}>
      {/* Sin medalla. `military-tech` es literalmente una condecoración, y
          PRODUCT.md nombra la insignia-juguete como anti-referencia. La copy
          ("Cruzaste la zona donde la mayoría abandona") aguanta sola. */}
      <View style={styles.milestoneText}>
        <Text style={styles.milestoneTitle}>{milestone.title}</Text>
        <Text style={styles.milestoneLine}>{milestone.line}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ArcHeader
  arcWrap: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  arcEyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  arcRule: {
    backgroundColor: palette.lineGoldSubtle,
    flex: 1,
    height: 1,
  },
  arcEyebrow: {
    ...typography.label,
    color: palette.goldText,
  },
  arcLine: {
    // NO lleva `statement`. Se le puso en la ronda anterior por subir de 14px, y
    // el resultado fue peor: `arcForDay` devuelve 85-155 caracteres —tres
    // oraciones—, así que el cockpit abría con ~300px de párrafo centrado a
    // 26px mientras el verbo de "TU TURNO" seguía a 11px. `statement` es para
    // FRASES; un párrafo a ese tamaño no es jerarquía, es ruido grande.
    ...typography.body,
    color: palette.ivoryDim,
    textAlign: 'center',
  },

  // ConsequenceCard
  consequenceCard: {
    borderColor: palette.lineGold,
    gap: spacing.sm,
  },
  consequenceHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  consequenceIcon: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  consequenceTag: {
    ...typography.label,
    color: palette.goldText,
  },
  deltaStrip: {
    backgroundColor: palette.goldLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deltaText: {
    ...typography.body,
    color: palette.goldText,
    fontSize: 13,
  },
  consequenceTitle: {
    // Es la lectura que la app le devuelve — el titular de la tarjeta, no su
    // etiqueta. Iba en `typography.section`: versalitas a 13px con tracking 2.
    // O sea que la frase sobre el propio cuerpo, que dos segundos antes se leía
    // a 26px en caja baja, reaparecía convertida en rótulo administrativo. La
    // jerarquía invertida sobrevivía dentro del mismo flujo que se arregló.
    ...typography.statement,
    color: palette.ivory,
  },
  consequenceBody: {
    ...typography.body,
    color: palette.ash,
  },
  consequenceActions: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },

  // MilestoneToast
  milestone: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  milestoneText: {
    flex: 1,
    gap: 2,
  },
  milestoneTitle: {
    ...typography.section,
    // `ink` es correcto aquí: el fondo es dorado. Es el único caso permitido.
    color: palette.ink,
    fontSize: 12,
  },
  milestoneLine: {
    ...typography.body,
    color: palette.ink,
    fontSize: 12,
    opacity: 0.8,
  },
});
