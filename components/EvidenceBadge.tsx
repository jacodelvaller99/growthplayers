/**
 * Sello de evidencia científica de una práctica de bienestar.
 *
 * POR QUÉ ES DISCRETO Y NO UN BANNER: el valor de este componente está en que
 * NO aparece en la mayoría de las tarjetas. Un catálogo donde todo lleva sello
 * no distingue nada — la señal es el contraste. Si algún día casi todas las
 * sesiones lo tuvieran, habría que revisar si se están citando cosas que la
 * cita no sostiene, no agrandar el badge.
 *
 * DÓNDE NO VA: durante la práctica. Interrumpir a alguien que está bajando a
 * su centro con "JAMA Psychiatry 2023" es peor que no citarlo. Solo en la
 * tarjeta del catálogo y en la vista previa antes de empezar.
 *
 * QUÉ SE CITA: la TÉCNICA, no esta grabación. Ningún estudio evaluó los audios
 * de Norman, y `finding` está redactado para que eso quede claro.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { EVIDENCE, EVIDENCE_GRADE_LABEL, type EvidenceKey } from '@/data/wellnessEvidence';

/** Tono por grado. `uncertain` no se disfraza de respaldo fuerte. */
const GRADE_COLOR: Record<string, string> = {
  established: palette.goldText,
  probable:    palette.goldText,
  uncertain:   palette.ash,
};

export function EvidenceBadge({
  evidence,
  /** `full` añade el hallazgo y la fuente — para la vista previa, no la lista. */
  variant = 'compact',
}: {
  evidence?: EvidenceKey;
  variant?: 'compact' | 'full';
}) {
  // Sin evidencia declarada no se renderiza NADA. No hay estado "sin
  // evidencia" visible: la ausencia del sello ya es la información.
  if (!evidence) return null;

  const ref = EVIDENCE[evidence];
  const color = GRADE_COLOR[ref.grade] ?? palette.ash;

  if (variant === 'compact') {
    return (
      <View style={[styles.pill, { borderColor: color }]}>
        <MaterialIcons name="school" size={11} color={color} />
        <Text style={[styles.pillText, { color }]}>{EVIDENCE_GRADE_LABEL[ref.grade]}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <MaterialIcons name="school" size={14} color={color} />
        <Text style={[styles.cardTitle, { color }]}>{EVIDENCE_GRADE_LABEL[ref.grade].toUpperCase()}</Text>
      </View>
      <Text style={styles.finding}>{ref.finding}</Text>
      <Text style={styles.citation}>{ref.citation}</Text>
      <Text style={styles.caveat}>
        La evidencia respalda la técnica, no esta grabación concreta.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: Fonts.displayMedium,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  card: {
    borderWidth: 1,
    borderColor: palette.charcoal,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  finding: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  citation: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 11,
  },
  caveat: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 11,
    fontStyle: 'italic',
  },
});

export default EvidenceBadge;
