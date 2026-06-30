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

import { GoldDivider, screen, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';

// ─── Time chips ───────────────────────────────────────────────────────────────
const TIME_CHIPS = [1, 3, 5, 10, 15, 20] as const;

// ─── Category grid ────────────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  /** Ruta a la práctica real. Si está, la categoría abre contenido que YA existe.
   *  Si no, es un tema en curaduría (se muestra "próximamente", sin contar sesiones falsas). */
  route?: string;
}

const CATEGORIES: Category[] = [
  { id: 'binaural',    label: 'BINAURALES',    icon: 'graphic-eq',       color: palette.ash, route: '/bienestar/binaurales'  },
  { id: 'breathing',   label: 'RESPIRACIÓN',   icon: 'air',              color: palette.ash, route: '/bienestar/respiracion' },
  { id: 'meditation',  label: 'MEDITACIÓN',    icon: 'self-improvement', color: palette.ash, route: '/bienestar/meditacion'  },
  { id: 'sleep',       label: 'SUEÑO',         icon: 'bedtime',          color: palette.ash, route: '/bienestar/sueno'       },
  { id: 'focus',       label: 'ENFOQUE',       icon: 'psychology',       color: palette.ash },
  { id: 'energy',      label: 'ENERGÍA',       icon: 'bolt',             color: palette.ash },
  { id: 'anxiety',     label: 'ANSIEDAD',      icon: 'spa',              color: palette.ash },
  { id: 'morning',     label: 'MAÑANA',        icon: 'wb-sunny',         color: palette.ash },
  { id: 'evening',     label: 'NOCHE',         icon: 'nights-stay',      color: palette.ash },
  { id: 'performance', label: 'PERFORMANCE',   icon: 'trending-up',      color: palette.ash },
];

// ─── Lecturas recomendadas ────────────────────────────────────────────────────
// Curaduría inicial de libros REALES (existen) alineados al Método. Son
// recomendaciones honestas para leer fuera de la app, no contenido in-app falso.
// El catálogo completo lo amplía el operador.
interface Reading { title: string; author: string; why: string; tag: string }
const READINGS: Reading[] = [
  { title: 'Meditaciones',                  author: 'Marco Aurelio',  why: 'El manual estoico para gobernar tu mente bajo presión.', tag: 'MENTE' },
  { title: 'El hombre en busca de sentido', author: 'Viktor Frankl',  why: 'Por qué el propósito sostiene cuando todo lo demás cede.',  tag: 'PROPÓSITO' },
  { title: 'Hábitos atómicos',              author: 'James Clear',    why: 'Los pequeños cambios que componen tu identidad.',          tag: 'HÁBITOS' },
  { title: 'Por qué dormimos',              author: 'Matthew Walker', why: 'La evidencia de que el sueño es tu primer activo.',        tag: 'CUERPO' },
  { title: 'Respira',                       author: 'James Nestor',   why: 'Cómo tu respiración regula el sistema nervioso.',          tag: 'RECUPERACIÓN' },
  { title: 'Enfócate (Deep Work)',          author: 'Cal Newport',    why: 'Trabajo profundo en un mundo de distracción.',             tag: 'ENFOQUE' },
];

export default function BibliotecaScreen() {
  const sc = useScreen();
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
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
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
          placeholder="Busca en Polaris..."
          placeholderTextColor={palette.smoke}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
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

      {/* Aviso honesto: la biblioteca está en curaduría. Las categorías con
          práctica real abren contenido que YA existe; el resto, próximamente. */}
      {!query && !activeCategory && (
        <View style={styles.notice}>
          <MaterialIcons name="auto-stories" size={16} color={palette.goldText} />
          <Text style={styles.noticeText}>
            Biblioteca en curaduría. Las categorías con práctica abren contenido real; el resto llega pronto.
          </Text>
        </View>
      )}

      {/* Categories */}
      <GoldDivider label={activeCategory ? 'CATEGORÍA' : 'EXPLORAR'} />
      {activeCategory && (
        <Pressable onPress={() => setActiveCategory(null)} style={styles.clearFilter}>
          <MaterialIcons name="close" size={14} color={palette.goldText} />
          <Text style={styles.clearFilterText}>Mostrar todas</Text>
        </Pressable>
      )}
      <View style={styles.grid}>
        {filtered.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() =>
              cat.route
                ? router.push(cat.route as never)
                : setActiveCategory(activeCategory === cat.id ? null : cat.id)
            }
            accessibilityRole="button"
            accessibilityLabel={cat.route ? `Abrir ${cat.label}` : `${cat.label} próximamente`}
            style={({ pressed }) => [
              styles.catCard,
              activeCategory === cat.id && styles.catCardActive,
              !cat.route && { opacity: 0.7 },
              pressed && { opacity: 0.8 },
            ]}>
            <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
              <MaterialIcons name={cat.icon} size={24} color={cat.color} />
            </View>
            <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
            <Text style={styles.catCount}>{cat.route ? 'ABRIR →' : 'PRÓXIMAMENTE'}</Text>
          </Pressable>
        ))}
      </View>

      {/* Lecturas recomendadas — libros reales (curaduría) */}
      {!query && !activeCategory && (
        <>
          <GoldDivider label="LECTURAS" />
          <Text style={styles.readingsHint}>Curaduría inicial. Libros que sostienen el Método.</Text>
          <View style={styles.readings}>
            {READINGS.map((r) => (
              <View key={r.title} style={styles.readingCard}>
                <View style={styles.readingIcon}>
                  <MaterialIcons name="menu-book" size={20} color={palette.goldText} />
                </View>
                <View style={styles.readingBody}>
                  <Text style={styles.readingTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.readingAuthor} numberOfLines={1}>{r.author}</Text>
                  <Text style={styles.readingWhy} numberOfLines={2}>{r.why}</Text>
                </View>
                <Text style={styles.readingTag}>{r.tag}</Text>
              </View>
            ))}
          </View>
        </>
      )}

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

  // Aviso honesto de curaduría
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(201,160,0,0.06)',
    borderColor: palette.gold + '33',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
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
  chipTextActive: { color: palette.goldText },

  clearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  clearFilterText: { ...typography.label, color: palette.goldText },

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

  // Lecturas recomendadas (libros reales)
  readingsHint: { ...typography.caption, color: palette.smoke, fontSize: 12, marginTop: -spacing.xs, marginBottom: spacing.md },
  readings:     { gap: spacing.sm, marginBottom: spacing.lg },
  readingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  readingIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  readingBody:   { flex: 1, gap: 1 },
  readingTitle:  { ...typography.label, color: palette.ivory, fontSize: 13, letterSpacing: 0.5 },
  readingAuthor: { ...typography.caption, color: palette.goldText, fontSize: 11 },
  readingWhy:    { ...typography.caption, color: palette.smoke, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  readingTag:    { ...typography.mono, color: palette.smoke, fontSize: 8.5, letterSpacing: 1, flexShrink: 0 },

  emptyBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyText: { ...typography.body, color: palette.smoke, textAlign: 'center' },
});
