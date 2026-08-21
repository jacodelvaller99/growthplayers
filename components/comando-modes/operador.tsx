import { View, Text } from 'react-native';
import { RowList } from '@/components/focus-deck';
import { palette, radii, spacing, typography, Fonts } from '@/constants/theme';
import type { ComandoModeProps } from '@/components/comando-modes/types';

export default function OperadorMode(props: ComandoModeProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={s.header}>
        <Text style={s.eyebrow} numberOfLines={1}>{props.eyebrow}</Text>
        <Text style={s.score}>{props.score}<Text style={s.scoreMax}>/{props.scoreMax}</Text></Text>
      </View>

      <View style={s.grid}>
        <View style={s.cell}>
          <Text style={s.cellLabel}>BIOMETRÍA</Text>
          <RowList
            rows={props.tiles.map((t) => ({
              label: t.label,
              value: `${t.value}${t.unit ?? ''} · ${t.stateLabel ?? ''}`,
            }))}
          />
        </View>

        <View style={s.cell}>
          <Text style={s.cellLabel}>ESTADO DEL DÍA</Text>
          <RowList rows={props.rows} />
        </View>

        <View style={s.cell}>
          <Text style={s.cellLabel}>NORMAN IA</Text>
          <Text style={s.normanLine} numberOfLines={4}>{props.normanLine}</Text>
        </View>

        <View style={s.cell}>
          <Text style={s.cellLabel}>PRÓXIMA LECCIÓN</Text>
          <RowList rows={[{ label: props.moduleLabel, value: `${props.lessonPct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const s = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: palette.smoke,
    flexShrink: 1,
    fontSize: 11,
  },
  score: {
    fontFamily: Fonts.mono,
    color: palette.goldText,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  scoreMax: {
    fontFamily: Fonts.mono,
    color: palette.smoke,
    fontSize: 12,
    fontWeight: '400' as const,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  cell: {
    flexBasis: '48%' as const,
    flexGrow: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cellLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 11,
  },
  normanLine: {
    color: palette.ivory,
    fontSize: 12,
    lineHeight: 16,
  },
};
