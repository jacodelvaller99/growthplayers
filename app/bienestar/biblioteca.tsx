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
import { alpha } from '@/constants/themeColors';

// ─── Category grid ────────────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  /** Ruta a la práctica real: solo se listan categorías con contenido que YA existe. */
  route: string;
}

const CATEGORIES: Category[] = [
  { id: 'binaural',    label: 'SONIDOS',       icon: 'graphic-eq',       color: palette.ash, route: '/bienestar/binaurales'  },
  { id: 'breathing',   label: 'RESPIRACIÓN',   icon: 'air',              color: palette.ash, route: '/bienestar/respiracion' },
  { id: 'meditation',  label: 'MEDITACIÓN',    icon: 'self-improvement', color: palette.ash, route: '/bienestar/meditacion'  },
  { id: 'sleep',       label: 'SUEÑO',         icon: 'bedtime',          color: palette.ash, route: '/bienestar/sueno'       },
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

  const filtered = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
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
          accessibilityLabel="Buscar en la biblioteca"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
            <MaterialIcons name="close" size={18} color={palette.smoke} />
          </Pressable>
        )}
      </View>

      {/* Categories */}
      <GoldDivider label="EXPLORAR" />
      <View style={styles.grid}>
        {filtered.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => router.push(cat.route as never)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${cat.label}`}
            style={({ pressed }) => [styles.catCard, pressed && { opacity: 0.8 }]}>
            <View style={[styles.catIcon, { backgroundColor: alpha(cat.color, '22') }]}>
              <MaterialIcons name={cat.icon} size={24} color={cat.color} />
            </View>
            <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
            <Text style={styles.catCount}>ABRIR →</Text>
          </Pressable>
        ))}
      </View>

      {/* Lecturas recomendadas — libros reales (curaduría) */}
      {!query && (
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
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
  readingTag:    { ...typography.mono, color: palette.smoke, letterSpacing: 1, flexShrink: 0 },
});
