/**
 * Mapa de Niveles de Consciencia (Dr. David Hawkins)
 * Basado en Doc 3.4 del curso Polaris (Capuozzo 2.0)
 *
 * Herramienta de autoexploración emocional:
 * — Debajo de 200: operando desde la Fuerza (contracción)
 * — Encima de 200: operando desde el Poder (expansión)
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreen } from '@/components/polaris';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── Haptic ───────────────────────────────────────────────────────────────────
function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// ─── Scale data ───────────────────────────────────────────────────────────────
interface Level {
  hz: number;
  name: string;
  description: string;
  actionAdvice: string;
  zone: 'fuerza' | 'poder';
}

const LEVELS: Level[] = [
  {
    hz: 20,
    name: 'Vergüenza',
    description: 'Autodestrucción, casi muerto. El nivel más bajo de energía vital.',
    actionAdvice: 'Habla con alguien de confianza. Pequeños actos de bondad hacia ti mismo. Luz, movimiento, naturaleza.',
    zone: 'fuerza',
  },
  {
    hz: 30,
    name: 'Culpa',
    description: 'Autoflagelación, arrepentimiento destructivo. La mente condena el pasado.',
    actionAdvice: 'Practica la autocompasión. La culpa ya cumplió su función: aprender. Ahora es momento de soltar.',
    zone: 'fuerza',
  },
  {
    hz: 50,
    name: 'Apatía',
    description: 'Desesperanza, víctima. "No tiene sentido intentarlo."',
    actionAdvice: 'Una sola acción mínima. Sal del espacio físico. Conecta con algo vivo — persona, animal, naturaleza.',
    zone: 'fuerza',
  },
  {
    hz: 75,
    name: 'Tristeza',
    description: 'Pérdida, nostalgia. El corazón llora lo que fue o pudo ser.',
    actionAdvice: 'Permite sentir sin resistir. La tristeza procesada es liberación. Escritura terapéutica o tapping.',
    zone: 'fuerza',
  },
  {
    hz: 100,
    name: 'Miedo',
    description: 'Ansiedad, retraimiento. El sistema nervioso ve peligro donde puede no haberlo.',
    actionAdvice: 'Respiración coherente 5:5. Nombra el miedo exacto. La acción pequeña disuelve el miedo grande.',
    zone: 'fuerza',
  },
  {
    hz: 125,
    name: 'Deseo',
    description: 'Codicia, adicción. Querer sin tener genera frustración crónica.',
    actionAdvice: 'Distingue deseo de necesidad. Gratitud por lo que ya tienes. Acción concreta hacia el deseo legítimo.',
    zone: 'fuerza',
  },
  {
    hz: 150,
    name: 'Ira',
    description: 'Odio, agresión. Energía alta pero destructiva si no se canaliza.',
    actionAdvice: 'Grito de Liberación, ejercicio físico intenso. La ira tiene información — ¿qué límite fue violado?',
    zone: 'fuerza',
  },
  {
    hz: 175,
    name: 'Orgullo',
    description: 'Arrogancia, negación. "Yo tengo razón, los demás están mal."',
    actionAdvice: 'Apertura genuina a otra perspectiva. Recuerda: el orgullo es el último escudo antes del Poder.',
    zone: 'fuerza',
  },
  {
    hz: 200,
    name: 'Valentía',
    description: '⚡ UMBRAL. Primera frecuencia de Poder. Afirmación, productividad.',
    actionAdvice: 'Estás en el umbral. Expande este estado tomando acción hacia tu norte. Aquí nace el liderazgo real.',
    zone: 'poder',
  },
  {
    hz: 250,
    name: 'Neutralidad',
    description: 'Confianza, no apego. Las cosas suceden, tú observas y respondes.',
    actionAdvice: 'Excelente estado base. Mantén la práctica. Desde aquí puedes decidir con claridad y sin reactividad.',
    zone: 'poder',
  },
  {
    hz: 310,
    name: 'Voluntad',
    description: 'Optimismo, intención. La energía se organiza y fluye hacia el objetivo.',
    actionAdvice: 'Tu sistema quiere ejecutar. Prioriza una cosa y muévete. El impulso es tuyo — no lo desperdicies.',
    zone: 'poder',
  },
  {
    hz: 350,
    name: 'Aceptación',
    description: 'Perdón, armonía. La vida es como es. Desde aquí se actúa sin resistencia.',
    actionAdvice: 'Estado óptimo para el trabajo profundo. Aprovecha para crear, conectar y construir desde el amor.',
    zone: 'poder',
  },
  {
    hz: 400,
    name: 'Razón',
    description: 'Comprensión, significado. La mente ve patrones y sistemas con claridad.',
    actionAdvice: 'Comparte tu comprensión. Enseña, escribe, diseña. La razón elevada es servicio al mundo.',
    zone: 'poder',
  },
  {
    hz: 500,
    name: 'Amor',
    description: 'Reverencia, la emoción que más expande. El amor incondicional trasciende el ego.',
    actionAdvice: 'Desde aquí tu presencia inspira. Sé intencional con quién y qué recibes este estado.',
    zone: 'poder',
  },
  {
    hz: 540,
    name: 'Alegría',
    description: 'Serenidad, transfiguración. La felicidad que no depende de lo externo.',
    actionAdvice: 'Tu energía eleva a quienes te rodean. Gratitud profunda y servicio son el vehículo natural.',
    zone: 'poder',
  },
  {
    hz: 600,
    name: 'Paz',
    description: 'Iluminación, presencia pura. La mente ya no necesita resolver nada.',
    actionAdvice: 'La paz de este nivel es contagiosa. Tu trabajo es estar presente. El universo hace el resto.',
    zone: 'poder',
  },
];

// Default to the threshold level (Valentía · 200 Hz) so the screen reads complete on load.
const DEFAULT_INDEX = LEVELS.findIndex((l) => l.hz === 200);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConscienciaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selIdx, setSelIdx] = useState<number>(DEFAULT_INDEX);

  const selected = LEVELS[selIdx];
  const isPower = selected.zone === 'poder';
  const next = selIdx < LEVELS.length - 1 ? LEVELS[selIdx + 1] : null;

  const select = useCallback((idx: number) => {
    setSelIdx(idx);
    haptic();
  }, []);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[
        sc.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>ESCALA DE CONSCIENCIA</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Intro gold card */}
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>¿DESDE DÓNDE OPERAS?</Text>
        <Text style={styles.introBody}>
          Mapa de Hawkins. Bajo 200 gastas FUERZA; desde 200 generas PODER.
        </Text>
        <View style={styles.zoneBar}>
          <View style={styles.zoneFuerza} />
          <View style={styles.zonePoder} />
        </View>
        <View style={styles.zoneLabels}>
          <Text style={styles.zoneLabelFuerza}>FUERZA · &lt;200</Text>
          <Text style={styles.zoneLabelPoder}>PODER · ≥200</Text>
        </View>
      </View>

      <SafetyWarning
        title="HERRAMIENTA DE AUTOEXPLORACIÓN"
        body="Esta es una herramienta de autoexploración, no un diagnóstico ni tratamiento."
      />

      <Text style={styles.sectionLabel}>NIVELES</Text>

      {/* Level grid — 4 columns */}
      <View style={styles.grid}>
        {LEVELS.map((level, i) => {
          const isSelected = i === selIdx;
          const isPoder = level.zone === 'poder';
          return (
            <Pressable
              key={level.hz}
              onPress={() => select(i)}
              style={[
                styles.cell,
                isPoder && styles.cellPower,
                isSelected && styles.cellSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${level.hz} Hz, ${level.name}`}>
              <Text style={[styles.cellHz, { color: isPoder ? palette.gold : palette.ivory }]}>{level.hz}</Text>
              <Text style={styles.cellName} numberOfLines={1}>{level.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Detail panel */}
      <View style={[styles.detailCard, isPower && styles.detailCardPower]}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailHz}>{selected.hz}</Text>
          <Text style={styles.detailHzUnit}>Hz</Text>
          <Text style={styles.detailName}>{selected.name}</Text>
        </View>
        <Text style={styles.detailDesc}>{selected.description}</Text>

        {next && (
          <View style={styles.howToRise}>
            <Text style={styles.howToRiseLabel}>CÓMO SUBIR</Text>
            <View style={styles.howToRiseRow}>
              <MaterialIcons name="arrow-upward" size={20} color={palette.gold} />
              <Text style={styles.howToRiseText}>
                Hacia <Text style={styles.howToRiseStrong}>{next.name}</Text> ({next.hz} Hz) — suelta el nivel actual sin juzgarlo.
              </Text>
            </View>
            <Text style={styles.adviceText}>{selected.actionAdvice}</Text>
          </View>
        )}
        {!next && (
          <View style={styles.howToRise}>
            <Text style={styles.howToRiseLabel}>EL CIMA DE LA ESCALA</Text>
            <Text style={styles.adviceText}>{selected.actionAdvice}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.graphite,
  },
  title: { ...typography.title, color: palette.ivory, fontSize: 14 },

  // Intro card
  introCard: {
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  introTitle: { fontFamily: Fonts.display, color: palette.gold, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  introBody: { ...typography.caption, color: palette.ivory, fontSize: 13, lineHeight: 20 },
  zoneBar: { flexDirection: 'row', height: 12, borderRadius: radii.pill, overflow: 'hidden' },
  zoneFuerza: { flex: 1, backgroundColor: palette.danger, opacity: 0.6 },
  zonePoder: { flex: 1, backgroundColor: palette.gold },
  zoneLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  zoneLabelFuerza: { fontFamily: Fonts.mono, color: palette.ash, fontSize: 10 },
  zoneLabelPoder: { fontFamily: Fonts.mono, color: palette.gold, fontSize: 10 },

  sectionLabel: { ...typography.label, color: palette.gold, fontSize: 11, letterSpacing: 1.8 },

  // Grid — 4 columns
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: '22.5%',
    flexGrow: 1,
    minWidth: 72,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  cellPower: {
    borderColor: palette.lineGold,
    backgroundColor: palette.goldLight,
  },
  cellSelected: {
    borderColor: palette.gold,
    borderWidth: 2,
  },
  cellHz: { fontFamily: Fonts.display, fontSize: 14, fontWeight: '700' },
  cellName: { fontFamily: Fonts.mono, color: palette.ash, fontSize: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.2 },

  // Detail
  detailCard: {
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  detailCardPower: {
    borderColor: palette.lineGold,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  detailHz: { fontFamily: Fonts.display, color: palette.gold, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  detailHzUnit: { fontFamily: Fonts.mono, color: palette.ash, fontSize: 11 },
  detailName: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 18, fontWeight: '800', letterSpacing: 0.5, marginLeft: 'auto' },
  detailDesc: { ...typography.body, color: palette.ivory, lineHeight: 22 },

  howToRise: {
    marginTop: spacing.xs,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    gap: spacing.sm,
  },
  howToRiseLabel: { fontFamily: Fonts.mono, color: palette.ash, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  howToRiseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  howToRiseText: { ...typography.caption, color: palette.ash, fontSize: 13, flex: 1, lineHeight: 20 },
  howToRiseStrong: { color: palette.gold, fontFamily: Fonts.sansBold },
  adviceText: { ...typography.caption, color: palette.smoke, fontSize: 12, lineHeight: 19, fontStyle: 'italic' },
});
