/**
 * Mapa de Niveles de Consciencia (Dr. David Hawkins)
 * Basado en Doc 3.4 del curso Polaris (Capuozzo 2.0)
 *
 * Herramienta de autoevaluación emocional:
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

import { GoldAccentCard, GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
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
    actionAdvice: 'Tu sistema quiere ejecutar. Prioriza una cosa y muévete. El impulso es tuyo — no lo desperdices.',
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
    description: 'Reverencia, la emoción que sana. El amor incondicional trasciende el ego.',
    actionAdvice: 'Desde aquí tu presencia sana. Sé intencional con quién y qué recibes este estado.',
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

// ─── Zone bar ─────────────────────────────────────────────────────────────────
function ZoneBar({ selected, levels }: { selected: Level | null; levels: Level[] }) {
  const powerCount = levels.filter(l => l.zone === 'poder').length;
  const powerPercent = (powerCount / levels.length) * 100;

  return (
    <View style={styles.zoneBarWrap}>
      <View style={styles.zoneBar}>
        <View style={[styles.zoneFuerza, { width: `${100 - powerPercent}%` as `${number}%` }]}>
          <Text style={styles.zoneLabel}>FUERZA</Text>
        </View>
        <View style={[styles.zonePoder, { width: `${powerPercent}%` as `${number}%` }]}>
          <Text style={styles.zoneLabel}>PODER</Text>
        </View>
      </View>
      {selected && (
        <Text style={[styles.zoneStatus, { color: selected.zone === 'poder' ? palette.gold : palette.smoke }]}>
          {selected.zone === 'poder'
            ? `${selected.hz} Hz — Operando desde el PODER ↑`
            : `${selected.hz} Hz — Zona de Fuerza → Sube sobre 200`}
        </Text>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConscienciaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Level | null>(null);

  const select = useCallback((level: Level) => {
    setSelected(level);
    haptic();
  }, []);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>ESCALA DE CONSCIENCIA</Text>
        <View style={{ width: 36 }} />
      </View>

      <GoldAccentCard>
        <Text style={styles.eyebrow}>DR. DAVID HAWKINS</Text>
        <Text style={styles.heroText}>
          ¿Desde dónde{'\n'}estás operando?
        </Text>
        <Text style={styles.heroSub}>
          Debajo de 200 Hz: Fuerza — contracción, reactividad, gasto energético.{'\n'}
          Encima de 200 Hz: Poder — expansión, creatividad, atracción.
        </Text>
      </GoldAccentCard>

      {/* Zone bar */}
      <ZoneBar selected={selected} levels={LEVELS} />

      <GoldDivider label="SELECCIONA TU ESTADO PREDOMINANTE" />

      {/* Level grid */}
      <View style={styles.grid}>
        {LEVELS.map((level) => {
          const isSelected = selected?.hz === level.hz;
          const isPoder = level.zone === 'poder';
          return (
            <Pressable
              key={level.hz}
              onPress={() => select(level)}
              style={({ pressed }) => [
                styles.levelCard,
                isPoder && styles.levelCardPoder,
                isSelected && styles.levelCardSelected,
                pressed && { opacity: 0.75 },
              ]}>
              <Text style={[styles.levelHz, isSelected && { color: palette.gold }]}>{level.hz}</Text>
              <Text style={[styles.levelName, isSelected && { color: palette.ivory }]}>{level.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Detail panel */}
      {selected && (
        <>
          <GoldDivider label="LECTURA DEL NIVEL" />
          <PremiumCard style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailHz}>{selected.hz} Hz</Text>
              <Text style={[styles.detailZone, { color: selected.zone === 'poder' ? palette.gold : palette.smoke }]}>
                {selected.zone === 'poder' ? '↑ PODER' : '↓ FUERZA'}
              </Text>
            </View>
            <Text style={styles.detailName}>{selected.name}</Text>
            <Text style={styles.detailDesc}>{selected.description}</Text>

            <GoldDivider label="CÓMO SUBIR" />
            <View style={styles.adviceRow}>
              <MaterialIcons name="arrow-upward" size={14} color={palette.gold} />
              <Text style={styles.adviceText}>{selected.actionAdvice}</Text>
            </View>
          </PremiumCard>
        </>
      )}

      {!selected && (
        <PremiumCard style={styles.hintCard}>
          <MaterialIcons name="touch-app" size={20} color={palette.smoke} />
          <Text style={styles.hintText}>
            Toca el nivel que mejor describe tu estado emocional predominante hoy.
          </Text>
        </PremiumCard>
      )}
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 14 },

  eyebrow: { ...typography.mono, color: palette.goldMuted, fontSize: 10, letterSpacing: 2 },
  heroText: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 34,
    marginVertical: spacing.sm,
  },
  heroSub: { ...typography.body, color: palette.ash, lineHeight: 20, fontSize: 13 },

  zoneBarWrap: { marginVertical: spacing.lg, gap: spacing.sm },
  zoneBar: { flexDirection: 'row', height: 28, borderRadius: radii.sm, overflow: 'hidden' },
  zoneFuerza: { backgroundColor: palette.charcoal, alignItems: 'center', justifyContent: 'center' },
  zonePoder: { backgroundColor: 'rgba(201,160,0,0.2)', borderWidth: 1, borderColor: palette.gold + '44', alignItems: 'center', justifyContent: 'center' },
  zoneLabel: { ...typography.mono, color: palette.ash, fontSize: 9, letterSpacing: 1.5 },
  zoneStatus: { ...typography.mono, fontSize: 11, textAlign: 'center', letterSpacing: 0.5 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  levelCard: {
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 90,
    flex: 1,
    gap: 2,
  },
  levelCardPoder: {
    borderColor: palette.gold + '30',
    backgroundColor: 'rgba(201,160,0,0.05)',
  },
  levelCardSelected: {
    borderColor: palette.gold,
    backgroundColor: 'rgba(201,160,0,0.12)',
  },
  levelHz: { fontFamily: Fonts.mono, color: palette.smoke, fontSize: 11, letterSpacing: 1 },
  levelName: { ...typography.body, color: palette.ash, fontSize: 12, textAlign: 'center' },

  detailCard: { gap: spacing.md },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailHz: { fontFamily: Fonts.display, color: palette.gold, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  detailZone: { ...typography.mono, fontSize: 11, letterSpacing: 1.5 },
  detailName: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  detailDesc: { ...typography.body, color: palette.ash, lineHeight: 22 },
  adviceRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  adviceText: { ...typography.body, color: palette.ivory, flex: 1, lineHeight: 22 },

  hintCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hintText: { ...typography.body, color: palette.smoke, flex: 1, fontStyle: 'italic', lineHeight: 20 },
});
