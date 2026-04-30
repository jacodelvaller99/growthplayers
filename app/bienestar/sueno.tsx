import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useWellnessStore } from '@/store/wellnessStore';

// ─── Content catalog (hardcoded — audio URLs wired when available) ─────────────
interface SleepItem {
  id: string;
  title: string;
  duration: string;
  description: string;
  isPremium: boolean;
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
    color: '#4a6fa5',
    items: [
      {
        id: 'sos-1',
        title: 'Relajación de Emergencia',
        duration: '5 min',
        description: 'Lleva tu sistema nervioso a 0 en 5 minutos.',
        isPremium: false,
        icon: 'emergency',
      },
      {
        id: 'sos-2',
        title: 'Body Scan Rápido',
        duration: '8 min',
        description: 'Relaja cada parte del cuerpo sistemáticamente.',
        isPremium: true,
        icon: 'accessibility-new',
      },
    ],
  },
  {
    id: 'stories',
    label: 'HISTORIAS PARA DORMIR',
    color: '#7c5cbf',
    items: [
      {
        id: 'story-1',
        title: 'El Bosque de las Secuoyas',
        duration: '20 min',
        description: 'Narración inmersiva en un bosque antiguo.',
        isPremium: true,
        icon: 'park',
      },
      {
        id: 'story-2',
        title: 'La Orilla del Mar Tranquilo',
        duration: '25 min',
        description: 'Déjate llevar por el ritmo de las olas.',
        isPremium: true,
        icon: 'waves',
      },
      {
        id: 'story-3',
        title: 'Cabaña en las Montañas',
        duration: '18 min',
        description: 'Nieve, silencio y calor de chimenea.',
        isPremium: true,
        icon: 'cabin',
      },
    ],
  },
  {
    id: 'nidra',
    label: 'YOGA NIDRA',
    color: '#2e7d52',
    items: [
      {
        id: 'nidra-1',
        title: 'Nidra Intro — 20 min',
        duration: '20 min',
        description: 'El estado entre vigilia y sueño. Restauración total.',
        isPremium: false,
        icon: 'self-improvement',
      },
      {
        id: 'nidra-2',
        title: 'Nidra Profundo — 40 min',
        duration: '40 min',
        description: 'Sesión completa de yoga nidra guiado.',
        isPremium: true,
        icon: 'self-improvement',
      },
    ],
  },
  {
    id: 'relax',
    label: 'RELAJACIONES',
    color: '#b07d1a',
    items: [
      {
        id: 'relax-1',
        title: 'Relajación Muscular Progresiva',
        duration: '15 min',
        description: 'Técnica Jacobson para liberar tensión acumulada.',
        isPremium: false,
        icon: 'fitness-center',
      },
      {
        id: 'relax-2',
        title: 'Coherencia Cardíaca Nocturna',
        duration: '10 min',
        description: 'Respiración 5-5 para calmar el sistema nervioso.',
        isPremium: true,
        icon: 'favorite',
      },
    ],
  },
];

export default function SuenoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useWellnessStore();
  const isPremium = user.subscriptionTier !== 'free';

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>SUEÑO</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Banner */}
      <PremiumCard style={styles.bannerCard}>
        <MaterialIcons name="bedtime" size={28} color="#4a6fa5" />
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>Estás durmiendo, pero ¿estás descansando?</Text>
          <Text style={styles.bannerSub}>
            El sueño de calidad es el cimiento de toda la performance.
          </Text>
        </View>
      </PremiumCard>

      {/* Premium lock if free */}
      {!isPremium && (
        <PremiumCard style={styles.lockBanner}>
          <MaterialIcons name="lock" size={18} color={palette.gold} />
          <Text style={styles.lockText}>
            La mayoría del contenido de Sueño es Premium.
            Activa tu cuenta para acceder sin límites.
          </Text>
        </PremiumCard>
      )}

      {/* Categories */}
      {SLEEP_CATEGORIES.map((cat) => (
        <View key={cat.id}>
          <GoldDivider label={cat.label} />
          {cat.items.map((item) => {
            const locked = item.isPremium && !isPremium;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (locked) return;
                  // TODO: wire up audio player
                }}
                style={({ pressed }) => [
                  styles.itemCard,
                  pressed && !locked && { opacity: 0.75 },
                ]}>
                <View style={[styles.itemIcon, { backgroundColor: cat.color + '22' }]}>
                  <MaterialIcons name={item.icon} size={22} color={locked ? palette.smoke : cat.color} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemTitle, locked && styles.itemLocked]}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemDuration}>{item.duration}</Text>
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                {locked ? (
                  <MaterialIcons name="lock" size={18} color={palette.smoke} />
                ) : (
                  <MaterialIcons name="play-circle" size={28} color={cat.color} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Premium CTA */}
      {!isPremium && (
        <PremiumCard style={styles.premiumCta}>
          <Text style={styles.premiumCtaTitle}>DESBLOQUEA TODO EL CONTENIDO</Text>
          <Text style={styles.premiumCtaBody}>
            Historias, Yoga Nidra, relajaciones guiadas y más con LifeFlow Premium.
          </Text>
          <Pressable style={styles.premiumBtn}>
            <Text style={styles.premiumBtnText}>VER PLANES</Text>
          </Pressable>
        </PremiumCard>
      )}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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

  lockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderColor: palette.gold,
  },
  lockText: { ...typography.caption, color: palette.ash, flex: 1 },

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
  itemLocked: { color: palette.smoke },
  itemDuration: { ...typography.mono, color: palette.goldMuted, fontSize: 10 },
  itemDesc: { ...typography.caption, color: palette.smoke, fontSize: 11 },

  premiumCta: {
    gap: spacing.md,
    borderColor: palette.gold,
    marginTop: spacing.lg,
  },
  premiumCtaTitle: { ...typography.section, color: palette.gold, letterSpacing: 2 },
  premiumCtaBody: { ...typography.body, color: palette.ash, fontSize: 13 },
  premiumBtn: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  premiumBtnText: { ...typography.label, color: palette.black, fontWeight: '700' },
});
