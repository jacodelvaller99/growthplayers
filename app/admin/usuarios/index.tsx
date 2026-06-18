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
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, screen, useScreen } from '@/components/polaris';
import { TIER_ORDER, getTierColor, getTierLabel } from '@/constants/subscriptions';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { createUserProfile } from '@/lib/admin/actions';
import { fetchUsers } from '@/lib/admin/queries';
import { fetchNotesByUsers, type NoteSummary } from '@/lib/memory';
import { NoteBadge } from '@/components/admin-decision';
import type { AdminUser } from '@/lib/admin/types';

const FILTERS = ['TODOS', 'NUEVOS', 'ADMIN', 'PREMIUM'] as const;
type Filter = typeof FILTERS[number];

/** Sin actividad aún: signup creado pero sin score/streak/check-in. */
const isNuevo = (u: AdminUser) =>
  (u.sovereign_score ?? 0) === 0 && (u.streak ?? 0) === 0 && !u.created_at;

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

function UserRow({ user, notes, onPress }: { user: AdminUser; notes?: NoteSummary; onPress: () => void }) {
  const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.rowMain}>
        <Text style={s.rowName}>{user.name}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>
          {notes?.last ? `📝 ${notes.last}` : (user.role ?? 'Usuario')}
        </Text>
      </View>
      <View style={s.rowBadges}>
        <NoteBadge count={notes?.count ?? 0} preview={notes?.last} />
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
  const [notes, setNotes] = useState<Record<string, NoteSummary>>({});

  // Crear perfil
  const { userId: adminId } = useLifeFlow();
  const [createOpen, setCreateOpen] = useState(false);
  const [cEmail, setCEmail] = useState('');
  const [cName, setCName] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cTier, setCTier] = useState<string>('free');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchUsers();
    setUsers(data);
    // Notas privadas por usuario — impregnadas en las filas (degradable).
    fetchNotesByUsers(data.map(u => u.id)).then(setNotes).catch(() => {});
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetCreate = () => { setCEmail(''); setCName(''); setCPassword(''); setCTier('free'); };

  const handleCreate = useCallback(async () => {
    if (!adminId) return;
    if (!cEmail.trim() || !cName.trim() || cPassword.length < 8) {
      Alert.alert('Campos incompletos', 'Email, nombre y contraseña (mínimo 8 caracteres) son requeridos.');
      return;
    }
    setCreating(true);
    const res = await createUserProfile({
      adminId,
      email: cEmail.trim(),
      name: cName.trim(),
      password: cPassword,
      tier: cTier === 'free' ? undefined : cTier,
    });
    setCreating(false);
    if (res.success) {
      const ingreso = res.needsConfirm
        ? `Le enviamos un email de confirmación a ${cEmail.trim()}. Debe confirmarlo y luego entrar con la contraseña: ${cPassword}`
        : `Email: ${cEmail.trim()}\nContraseña temporal: ${cPassword}\n\nCompártela con el cliente para su primer ingreso.`;
      Alert.alert(`Usuario "${cName.trim()}" creado`, ingreso);
      setCreateOpen(false);
      resetCreate();
      load();
    } else {
      Alert.alert('No se pudo crear', res.error ?? 'Error desconocido');
    }
  }, [adminId, cEmail, cName, cPassword, cTier, load]);

  useEffect(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filter === 'NUEVOS') list = list.filter(isNuevo);
    if (filter === 'ADMIN') list = list.filter(u => u.is_admin);
    if (filter === 'PREMIUM') list = list.filter(u => u.subscription_tier && u.subscription_tier !== 'free');
    setFiltered(list);
  }, [users, search, filter]);

  // Roster completo (todos los perfiles reales) para la sección de seguimiento.
  const totalProfiles = users.length;
  const sinActividad = users.filter(isNuevo).length;
  const conActividad = totalProfiles - sinActividad;

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
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>USUARIOS</Text>
        <Pressable
          onPress={() => setCreateOpen(true)}
          style={s.createBtn}
          accessibilityRole="button"
          accessibilityLabel="Crear perfil">
          <MaterialIcons name="person-add" size={15} color={palette.ink} />
          <Text style={s.createBtnText}>CREAR</Text>
        </Pressable>
        <Text style={s.badge}>{filtered.length}</Text>
      </View>

      {/* Perfiles activos — roster completo para seguimiento (visible para todo admin) */}
      <View style={s.rosterCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.rosterEyebrow}>PERFILES ACTIVOS</Text>
          <Text style={s.rosterHint}>Roster completo · seguimiento a todos</Text>
        </View>
        <View style={s.rosterStats}>
          <View style={s.rosterStat}>
            <Text style={s.rosterCount}>{totalProfiles}</Text>
            <Text style={s.rosterStatLbl}>TOTAL</Text>
          </View>
          <View style={s.rosterVDivider} />
          <View style={s.rosterStat}>
            <Text style={[s.rosterCountSm, { color: palette.success }]}>{conActividad}</Text>
            <Text style={s.rosterStatLbl}>ACTIVOS</Text>
          </View>
          <Pressable style={s.rosterStat} onPress={() => setFilter('NUEVOS')} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Ver ${sinActividad} perfiles nuevos sin actividad`}>
            <Text style={[s.rosterCountSm, { color: palette.warning }]}>{sinActividad}</Text>
            <Text style={s.rosterStatLbl}>NUEVOS</Text>
          </Pressable>
        </View>
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
            notes={notes[item.id]}
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

      {/* ── Modal: Crear perfil ── */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={m.header}>
                <Text style={m.title}>CREAR PERFIL</Text>
                <Pressable onPress={() => setCreateOpen(false)} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color={palette.ash} />
                </Pressable>
              </View>

              <Text style={m.label}>EMAIL *</Text>
              <TextInput
                style={m.input}
                placeholder="cliente@email.com"
                placeholderTextColor={palette.smoke}
                value={cEmail}
                onChangeText={setCEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[m.label, { marginTop: spacing.md }]}>NOMBRE *</Text>
              <TextInput
                style={m.input}
                placeholder="Nombre del cliente"
                placeholderTextColor={palette.smoke}
                value={cName}
                onChangeText={setCName}
              />

              <Text style={[m.label, { marginTop: spacing.md }]}>CONTRASEÑA TEMPORAL *</Text>
              <TextInput
                style={m.input}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={palette.smoke}
                value={cPassword}
                onChangeText={setCPassword}
                autoCapitalize="none"
              />
              <Text style={m.hint}>El cliente la usa para su primer ingreso y luego la cambia.</Text>

              <Text style={[m.label, { marginTop: spacing.md }]}>TIER INICIAL</Text>
              <View style={m.tierWrap}>
                {TIER_ORDER.map((t) => {
                  const active = cTier === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setCTier(t)}
                      style={[m.tierChip, active && { backgroundColor: getTierColor(t), borderColor: getTierColor(t) }]}>
                      <Text style={[m.tierChipText, active && { color: palette.ink }]}>{getTierLabel(t)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={m.footer}>
                <Pressable style={m.cancelBtn} onPress={() => setCreateOpen(false)}>
                  <Text style={m.cancelText}>CANCELAR</Text>
                </Pressable>
                <Pressable
                  style={[m.submitBtn, creating && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={creating}>
                  {creating ? (
                    <ActivityIndicator color={palette.ink} size="small" />
                  ) : (
                    <>
                      <Text style={m.submitText}>CREAR PERFIL</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={palette.ink} />
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  // Roster "Perfiles activos" — sección de seguimiento
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rosterEyebrow: { ...typography.section, color: palette.goldText, fontSize: 11 },
  rosterHint: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 2 },
  rosterStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rosterStat: { alignItems: 'center', minWidth: 44 },
  rosterCount: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 28, color: palette.goldText },
  rosterCountSm: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 18, color: palette.ivory },
  rosterStatLbl: { ...typography.label, color: palette.smoke, fontSize: 8, marginTop: 2 },
  rosterVDivider: { width: 1, height: 28, backgroundColor: palette.line },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  createBtnText: { ...typography.label, color: palette.ink, fontSize: 11, letterSpacing: 1 },
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

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.graphiteLight,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
    maxHeight: '88%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.section, color: palette.ivory, fontSize: 15 },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    ...typography.body,
    color: palette.ivory,
    fontSize: 14,
    backgroundColor: palette.charcoal,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hint: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 4 },
  tierWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tierChip: { borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tierChipText: { ...typography.label, color: palette.ash, fontSize: 11 },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
  },
  cancelText: { ...typography.label, color: palette.smoke, fontSize: 12, letterSpacing: 1 },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
  },
  submitText: { ...typography.label, color: palette.ink, fontSize: 12, letterSpacing: 1 },
});
