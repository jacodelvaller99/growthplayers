import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import SafetyWarning from '@/components/SafetyWarning';
import { Aura } from '@/components/aura';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { SLEEP_MUSIC } from '@/data/wellness';
import { getSleepScript, sleepSegmentsToPhases } from '@/data/sleep';
import { useBinauralEngine } from '@/hooks/useBinauralEngine';

/** Convert "5 min" → 300, "20 min" → 1200, etc. */
function parseDurationSecs(dur: string): number {
  const n = parseInt(dur, 10);
  return isNaN(n) ? 600 : n * 60;
}

// ─── Content catalog (hardcoded — audio URLs wired when available) ─────────────
interface SleepItem {
  id: string;
  title: string;
  duration: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}

const SLEEP_CATEGORIES: {
  id: string;
  label: string;
  color: string;
  items: SleepItem[];
}[] = [
  {
    id: 'sos',
    label: 'S.O.S PARA DORMIR',
    color: palette.ash,
    items: [
      {
        id: 'sos-1',
        title: 'Relajación de Emergencia',
        duration: '5 min',
        description: 'Lleva tu sistema nervioso a 0 en 5 minutos.',
        icon: 'emergency',
      },
      {
        id: 'sos-2',
        title: 'Body Scan Rápido',
        duration: '8 min',
        description: 'Relaja cada parte del cuerpo sistemáticamente.',
        icon: 'accessibility-new',
      },
    ],
  },
  {
    id: 'stories',
    label: 'HISTORIAS PARA DORMIR',
    color: palette.purple,
    items: [
      {
        id: 'story-1',
        title: 'El Bosque de las Secuoyas',
        duration: '20 min',
        description: 'Narración inmersiva en un bosque antiguo.',
        icon: 'park',
      },
      {
        id: 'story-2',
        title: 'La Orilla del Mar Tranquilo',
        duration: '25 min',
        description: 'Déjate llevar por el ritmo de las olas.',
        icon: 'waves',
      },
      {
        id: 'story-3',
        title: 'Cabaña en las Montañas',
        duration: '18 min',
        description: 'Nieve, silencio y calor de chimenea.',
        icon: 'cabin',
      },
    ],
  },
  {
    id: 'nidra',
    label: 'YOGA NIDRA',
    color: palette.ash,
    items: [
      {
        id: 'nidra-1',
        title: 'Nidra Intro — 20 min',
        duration: '20 min',
        description: 'El estado entre vigilia y sueño. Restauración total.',
        icon: 'self-improvement',
      },
      {
        id: 'nidra-2',
        title: 'Nidra Profundo — 40 min',
        duration: '40 min',
        description: 'Sesión completa de yoga nidra guiado.',
        icon: 'self-improvement',
      },
    ],
  },
  {
    id: 'relax',
    label: 'RELAJACIONES',
    color: palette.ash,
    items: [
      {
        id: 'relax-1',
        title: 'Relajación Muscular Progresiva',
        duration: '15 min',
        description: 'Técnica Jacobson para liberar tensión acumulada.',
        icon: 'fitness-center',
      },
      {
        id: 'relax-2',
        title: 'Coherencia Cardíaca Nocturna',
        duration: '10 min',
        description: 'Respiración 5-5 para calmar el sistema nervioso.',
        icon: 'favorite',
      },
    ],
  },
];

export default function SuenoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const engine = useBinauralEngine();

  function handlePlay(item: SleepItem, catId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Los guiones narrados de `data/sleep/` (208 segmentos, 9 sesiones) llevaban
    // escritos desde el inicio y NADIE los reproducía: esta pantalla lanzaba
    // solo el tono y la cama, así que la voz de Norman nunca sonaba en Sueño.
    // `getSleepScript` casa por `item.id`; si una tarjeta aún no tiene guión,
    // la sesión suena como antes (cama + binaural) en vez de romperse.
    const script = getSleepScript(item.id);
    const narration = script ? sleepSegmentsToPhases(script) : undefined;

    // Audio real: pista Suno de sueño + binaural delta suave debajo (2 Hz,
    // banda de sueño profundo). El engine global maneja timer, mini-player y stop.
    engine.start({
      carrierHz: 100,
      beatHz: 2,
      sessionName: item.title,
      targetSeconds: parseDurationSecs(item.duration),
      waveVolume: 0.2,
      bgVolume: 0,
      musicUrl: catId === 'nidra' ? SLEEP_MUSIC.nidra : SLEEP_MUSIC.descenso,
      narration,
    });
    // Navigate back to hub so the mini-player is visible
    router.back();
  }

  return (
    <View style={sc.root}>
      {/* Dormir. `noche` es el único estado azul de la paleta. */}
      <Aura state="noche" weight={0.85} />
    <ScrollView
      style={styles.auraScroll}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>SUEÑO</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Banner */}
      <PremiumCard style={styles.bannerCard}>
        <MaterialIcons name="bedtime" size={28} color={palette.ash} />
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>Estás durmiendo, pero ¿estás descansando?</Text>
          <Text style={styles.bannerSub}>
            El sueño de calidad es el cimiento de toda la performance.
          </Text>
        </View>
      </PremiumCard>

      <SafetyWarning
        body="Estas prácticas favorecen el descanso, pero no tratan el insomnio crónico, la apnea del sueño ni otros trastornos. Si tienes problemas de sueño persistentes, consulta a un profesional de la salud. No las uses mientras conduces u operas maquinaria."
      />

      {/* Categories — todo desbloqueado. */}
      {SLEEP_CATEGORIES.map((cat) => (
        <View key={cat.id}>
          <GoldDivider label={cat.label} />
          {cat.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handlePlay(item, cat.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.duration}`}
              style={({ pressed }) => [
                styles.itemCard,
                pressed && { opacity: 0.75 },
              ]}>
              <View style={[styles.itemIcon, { backgroundColor: cat.color + '22' }]}>
                <MaterialIcons name={item.icon} size={22} color={cat.color} />
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDuration}>{item.duration}</Text>
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
              <MaterialIcons name="play-circle" size={28} color={cat.color} />
            </Pressable>
          ))}
        </View>
      ))}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // El ScrollView ya no es la raíz: el aura se ancla al viewport por encima.
  auraScroll: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerBody: { flex: 1, gap: 4 },
  bannerTitle: {
    ...typography.body,
    color: palette.ivory,
    fontWeight: '600',
  },
  bannerSub: { ...typography.caption, color: palette.smoke },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 1.5 },
  itemDuration: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  itemDesc: { ...typography.caption, color: palette.smoke, fontSize: 11 },
});
