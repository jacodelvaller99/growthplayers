import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Directive, HeroPanel, MetricTile, RowList } from '@/components/focus-deck';
import type { ComandoModeProps } from '@/components/comando-modes/types';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

export default function EspecificoMode(props: ComandoModeProps) {
  return (
    <View style={s.container}>
      <HeroPanel>
        <Text style={s.eyebrow}>{props.eyebrow}</Text>
        <Text style={s.statement}>{props.statement}</Text>
        <View style={s.scoreRow}>
          <Text style={[s.score, props.sinLecturas && s.scoreDim]}>
            {props.score}
            <Text style={s.scoreMax}>/{props.scoreMax}</Text>
          </Text>
          <Text style={s.scoreTier}>{props.scoreTier}</Text>
        </View>
        <Directive title={props.directiveTitle} reason={props.directiveReason} onPress={props.onDirective} />
      </HeroPanel>

      <View style={s.tiles}>
        {props.tiles.map((t) => (
          <MetricTile
            key={t.label}
            label={t.label}
            value={t.value}
            unit={t.unit}
            stateLabel={t.stateLabel}
            state={t.state}
            series={t.series}
          />
        ))}
      </View>
      {props.tilesSource === 'checkin' && (
        <Text style={s.note}>SEGÚN TU CHECK-IN — CONECTA UN WEARABLE PARA LECTURAS EXACTAS</Text>
      )}

      <View>
        <Text style={s.sectionLabel}>ESTADO DEL DÍA</Text>
        <RowList rows={props.rows} />
      </View>

      <View style={s.normanBlock}>
        <Text style={s.normanLine}>{props.normanLine}</Text>
        <Pressable
          onPress={props.onOpenNorman}
          accessibilityRole="button"
          accessibilityLabel="Consultar a Norman"
          style={({ pressed }) => [s.consultBtn, pressed && { opacity: 0.85 }]}>
          <Text style={s.consultBtnText}>CONSULTAR</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: spacing.lg },
  eyebrow: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: palette.goldText,
    textTransform: 'uppercase',
  },
  statement: { ...typography.body, fontWeight: '300', fontSize: 19, lineHeight: 27, color: palette.ivory },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  score: {
    fontFamily: Fonts.mono,
    fontSize: 40,
    fontWeight: '700',
    color: palette.goldText,
    fontVariant: ['tabular-nums'],
  },
  scoreDim: { opacity: 0.45 },
  scoreMax: { fontFamily: Fonts.mono, fontSize: 18, color: palette.smoke },
  scoreTier: { ...typography.label, color: palette.smoke, fontSize: 11, letterSpacing: 1.4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  sectionLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: spacing.xs,
  },
  normanBlock: { gap: spacing.sm },
  normanLine: { ...typography.body, color: palette.ash, fontSize: 14, lineHeight: 20 },
  consultBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  consultBtnText: {
    fontFamily: Fonts.display,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.4,
    color: palette.ink,
    textTransform: 'uppercase',
  },
});
