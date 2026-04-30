import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── Time chips ───────────────────────────────────────────────────────────────
const TIME_CHIPS = [1, 3, 5, 10, 15, 20] as const;

// ─── Category grid ────────────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  count: number;
}

const CATEGORIES: Category[] = [
  { id: 'binaural',    label: 'BINAURALES',    icon: 'graphic-eq',       color: '#b07d1a', count: 5  },
  { id: 'breathing',   label: 'RESPIRACIÓN',   icon: 'air',              color: '#2e7d52', count: 4  },
  { id: 'meditation',  label: 'MEDITACIÓN',    icon: 'self-improvement', color: '#7c5cbf', count: 5  },
  { id: 'sleep',       label: 'SUEÑO',         icon: 'bedtime',          color: '#4a6fa5', count: 8  },
  { id: 'focus',       label: 'ENFOQUE',       icon: 'psychology',       color: '#556B2F', count: 6  },
  { id: 'energy',      label: 'ENERGÍA',       icon: 'bolt',             color: '#c0392b', count: 4  },
  { id: 'anxiety',     label: 'ANSIEDAD',      icon: 'spa',              color: '#5C6BC0', count: 7  },
  { id: 'morning',     label: 'MAÑANA',        icon: 'wb-sunny',         color: '#E65100', count: 5  },
  { id: 'evening',     label: 'NOCHE',         icon: 'nights-stay',      color: '#283593', count: 4  },
  { id: 'performance', label: 'PERFORMANCE',   icon: 'trending-up',      color: '#00695C', count: 6  },
];

// ─── Recent items (mock) ──────────────────────────────────────────────────────
const RECENT = [
  { id: 'r1', title: 'Alpha — Flow & Relax',  type: 'BINAURAL',   duration: '10 min', color: '#b07d1a' },
  { id: 'r2', title: '4-7-8 Calma',           type: 'RESPIRACIÓN',duration: '4 min',  color: '#2e7d52' },
  { id: 'r3', title: 'Despertar Consciente',  type: 'MEDITACIÓN', duration: '5 min',  color: '#7c5cbf' },
];

export default function BibliotecaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery]           = useState('');
  const [activeTime, setActiveTime] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim() && !activeCategory) return CATEGORIES;
    return CATEGORIES.filter((c) => {
      const matchQuery = !query.trim() || c.label.toLowerCase().includes(query.toLowerCase());
      const matchCat   = !activeCategory || c.id === activeCategory;
      return matchQuery && matchCat;
    });
  }, [query, activeCategory]);

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>BIBLIOTECA</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={palette.smoke} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Busca en LifeFlow..."
          placeholderTextColor={palette.smoke}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <MaterialIcons name="close" size={18} color={palette.smoke} />
          </Pressable>
        )}
      </View>

      {/* Time chips */}
      <View style={styles.chipsRow}>
        {TIME_CHIPS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setActiveTime(activeTime === t ? null : t)}
            style={[styles.chip, activeTime === t && styles.chipActive]}>
            <Text style={[styles.chipText, activeTime === t && styles.chipTextActive]}>
              {t}min
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Recent */}
      {!query && !activeCategory && (
        <>
          <GoldDivider label="RECIENTES" />
          {RECENT.map((r) => (
            <Pressable
              key={r.id}
              style={({ pressed }) => [styles.recentCard, pressed && { opacity: 0.75 }]}>
              <View style={[styles.recentDot, { backgroundColor: r.color }]} />
              <View style={styles.recentBody}>
                <Text style={styles.recentTitle}>{r.title}</Text>
                <Text style={styles.recentMeta}>{r.type} · {r.duration}</Text>
              </View>
              <MaterialIcons name="play-circle-outline" size={24} color={r.color} />
            </Pressable>
          ))}
        </>
      )}

      {/* Categories */}
      <GoldDivider label={activeCategory ? 'CATEGORÍA' : 'EXPLORAR'} />
      {activeCategory && (
        <Pressable onPress={() => setActiveCategory(null)} style={styles.clearFilter}>
          <MaterialIcons name="close" size={14} color={palette.gold} />
          <Text style={styles.clearFilterText}>Mostrar todas</Text>
        </Pressable>
      )}
      <View style={styles.grid}>
        {filtered.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            style={({ pressed }) => [
              styles.catCard,
              activeCategory === cat.id && styles.catCardActive,
              pressed && { opacity: 0.8 },
            ]}>
            <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
              <MaterialIcons name={cat.icon} size={24} color={cat.color} />
            </View>
            <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
            <Text style={styles.catCount}>{cat.count} sesiones</Text>
          </Pressable>
        ))}
      </View>

      {/* Favoritos (placeholder) */}
      {!query && !activeCategory && (
        <>
          <GoldDivider label="FAVORITOS" />
          <View style={styles.emptyBox}>
            <MaterialIcons name="favorite-border" size={32} color={palette.smoke} />
            <Text style={styles.emptyText}>
              Marca sesiones como favoritas para verlas aquí.
            </Text>
          </View>
        </>
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

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.ivory,
    fontSize: 14,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  chipText: { ...typography.label, color: palette.ash },
  chipTextActive: { color: palette.gold },

  recentCard: {
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
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  recentBody: { flex: 1, gap: 2 },
  recentTitle: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 1.5 },
  recentMeta: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  clearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  clearFilterText: { ...typography.label, color: palette.gold },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  catCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    minWidth: 130,
  },
  catCardActive: {
    borderColor: palette.gold,
    backgroundColor: palette.goldLight,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    ...typography.section,
    fontSize: 11,
    letterSpacing: 2,
  },
  catCount: { ...typography.caption, color: palette.smoke, fontSize: 11 },

  emptyBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyText: { ...typography.body, color: palette.smoke, textAlign: 'center' },
});
