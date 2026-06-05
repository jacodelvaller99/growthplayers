/**
 * Admin CMI — Usuarios
 *
 * Lista completa de usuarios con búsqueda y filtros.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, screen, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { fetchUsers } from '@/lib/admin/queries';
import type { AdminUser } from '@/lib/admin/types';

const FILTERS = ['TODOS', 'ADMIN', 'PREMIUM'] as const;
type Filter = typeof FILTERS[number];

function ChurnBadge({ label }: { label?: string }) {
  const colorMap: Record<string, string> = {
    low:      palette.success,
    medium:   palette.warning,
    high:     palette.warning,
    critical: palette.danger,
  };
  if (!label) return null;
  return (
    <View style={[rb.pill, { borderColor: colorMap[label] ?? palette.line }]}>
      <Text style={[rb.pillText, { color: colorMap[label] ?? palette.ash }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function MemberBadge({ tier }: { tier?: string }) {
  const colors: Record<string, string> = {
    premium_plus: palette.gold,
    premium:      palette.goldMuted,
    free:         palette.smoke,
  };
  return (
    <View style={[rb.pill, { borderColor: colors[tier ?? 'free'] ?? palette.smoke }]}>
      <Text style={[rb.pillText, { color: colors[tier ?? 'free'] ?? palette.smoke }]}>
        {(tier ?? 'FREE').replace(/_/g, ' ').toUpperCase()}
      </Text>
    </View>
  );
}

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.rowMain}>
        <Text style={s.rowName}>{user.name}</Text>
        <Text style={s.rowMeta}>{user.role ?? 'Usuario'}</Text>
      </View>
      <View style={s.rowBadges}>
        <MemberBadge tier={user.subscription_tier} />
        {user.is_admin && <ChurnBadge label="admin" />}
      </View>
      <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
    </Pressable>
  );
}

export default function UsuariosScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('TODOS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchUsers();
    setUsers(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filter === 'ADMIN') list = list.filter(u => u.is_admin);
    if (filter === 'PREMIUM') list = list.filter(u => u.subscription_tier && u.subscription_tier !== 'free');
    setFiltered(list);
  }, [users, search, filter]);

  if (loading) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} />
      </View>
    );
  }

  return (
    <View style={[sc.root, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>USUARIOS</Text>
        <Text style={s.badge}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <MaterialIcons name="search" size={18} color={palette.smoke} style={{ marginLeft: spacing.md }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor={palette.smoke}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={{ marginRight: spacing.md }}>
            <MaterialIcons name="close" size={18} color={palette.smoke} />
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <GoldDivider />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            onPress={() => router.push(`/admin/usuarios/${item.id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={
          <Text style={s.emptyText}>Sin usuarios que coincidan</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.gold} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  badge: {
    ...typography.mono,
    color: palette.goldText,
    backgroundColor: palette.goldLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    fontSize: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: palette.ivory,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  filterChipActive: {
    backgroundColor: palette.goldLight,
    borderColor: palette.gold,
  },
  filterText: { ...typography.label, color: palette.ash },
  filterTextActive: { color: palette.goldText },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 14, color: palette.goldText },
  rowMain: { flex: 1 },
  rowName: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  rowMeta: { ...typography.caption, color: palette.smoke, marginTop: 2 },
  rowBadges: { flexDirection: 'row', gap: spacing.xs },
  separator: { height: 1, backgroundColor: palette.lineSoft, marginHorizontal: spacing.lg },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.xl },
});

const rb = StyleSheet.create({
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillText: { ...typography.label, fontSize: 8 },
});
