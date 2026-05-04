/**
 * Admin CMI — Gestión de Membresías
 *
 * Panel izquierdo: buscar usuario
 * Panel derecho: activar membresía
 * Tabla inferior: historial de todas las membresías activas
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { activateMembership } from '@/lib/admin/actions';
import { fetchAllMemberships, searchUsers } from '@/lib/admin/queries';
import { PRODUCT_LABELS, type AdminUser, type MembershipProduct, type UserMembership } from '@/lib/admin/types';

const PRODUCTS: MembershipProduct[] = [
  'lifeflow_premium',
  'lifeflow_premium_plus',
  'polaris',
  'growthplayers',
];

const DURATION_OPTS = [
  { label: 'Indefinida', days: null },
  { label: '30 días',    days: 30 },
  { label: '90 días',    days: 90 },
  { label: '180 días',   days: 180 },
  { label: '365 días',   days: 365 },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const col = status === 'active' ? palette.success : palette.smoke;
  return (
    <View style={[bd.pill, { borderColor: col }]}>
      <Text style={[bd.text, { color: col }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

export default function MembresiasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();
  const { userId: preselectedUserId } = useLocalSearchParams<{ userId?: string }>();

  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [product, setProduct] = useState<MembershipProduct>('lifeflow_premium');
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [pricePaid, setPricePaid] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMemberships = useCallback(async () => {
    const data = await fetchAllMemberships('active');
    setMemberships(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadMemberships(); }, [loadMemberships]);

  // Debounced user search
  useEffect(() => {
    if (userQuery.trim().length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchUsers(userQuery);
      setUserResults(results);
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  const handleActivate = async () => {
    if (!adminId || !selectedUser) return;
    setSaving(true);

    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 864e5).toISOString()
      : null;

    const result = await activateMembership({
      adminId,
      userId: selectedUser.id,
      product,
      expiresAt,
      pricePaid: pricePaid ? parseFloat(pricePaid) : 0,
      notes: notes || undefined,
    });

    setSaving(false);

    if (result.success) {
      Alert.alert('✅ Membresía activada', `${PRODUCT_LABELS[product]} activada para ${selectedUser.name}`);
      setSelectedUser(null);
      setUserQuery('');
      setPricePaid('');
      setNotes('');
      loadMemberships();
    } else {
      Alert.alert('Error', result.error ?? 'No se pudo activar la membresía');
    }
  };

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>MEMBRESÍAS</Text>
      </View>

      {/* ── Activation Form ── */}
      <GoldDivider label="ACTIVAR MEMBRESÍA" />
      <PremiumCard style={s.card}>
        {/* User search */}
        <Text style={s.fieldLabel}>USUARIO</Text>
        {selectedUser ? (
          <View style={s.selectedUser}>
            <View style={{ flex: 1 }}>
              <Text style={s.selectedName}>{selectedUser.name}</Text>
              {selectedUser.email ? <Text style={s.selectedEmail}>{selectedUser.email}</Text> : null}
            </View>
            <Pressable onPress={() => setSelectedUser(null)}>
              <MaterialIcons name="close" size={18} color={palette.smoke} />
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={s.input}
              placeholder="Buscar por nombre..."
              placeholderTextColor={palette.smoke}
              value={userQuery}
              onChangeText={setUserQuery}
            />
            {userResults.length > 0 && (
              <View style={s.dropdown}>
                {userResults.map(u => (
                  <Pressable key={u.id} style={s.dropdownItem} onPress={() => { setSelectedUser(u); setUserResults([]); setUserQuery(''); }}>
                    <Text style={s.dropdownName}>{u.name}</Text>
                    <Text style={s.dropdownRole}>{u.role}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* Product */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>PRODUCTO</Text>
        <View style={s.optionGrid}>
          {PRODUCTS.map(p => (
            <Pressable
              key={p}
              style={[s.optionChip, product === p && s.optionChipActive]}
              onPress={() => setProduct(p)}>
              <Text style={[s.optionText, product === p && s.optionTextActive]}>
                {PRODUCT_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Duration */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DURACIÓN</Text>
        <View style={s.optionGrid}>
          {DURATION_OPTS.map(d => (
            <Pressable
              key={d.label}
              style={[s.optionChip, durationDays === d.days && s.optionChipActive]}
              onPress={() => setDurationDays(d.days)}>
              <Text style={[s.optionText, durationDays === d.days && s.optionTextActive]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Price */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>PRECIO PAGADO (USD)</Text>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={palette.smoke}
          keyboardType="decimal-pad"
          value={pricePaid}
          onChangeText={setPricePaid}
        />

        {/* Notes */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>NOTAS INTERNAS</Text>
        <TextInput
          style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
          placeholder="Ej: Pago por transferencia..."
          placeholderTextColor={palette.smoke}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* Submit */}
        <Pressable
          style={[s.submitBtn, (!selectedUser || saving) && s.submitBtnDisabled]}
          onPress={handleActivate}
          disabled={!selectedUser || saving}>
          {saving ? (
            <ActivityIndicator color={palette.black} size="small" />
          ) : (
            <Text style={s.submitText}>ACTIVAR MEMBRESÍA</Text>
          )}
        </Pressable>
      </PremiumCard>

      {/* ── Active Memberships Table ── */}
      <GoldDivider label={`MEMBRESÍAS ACTIVAS (${memberships.length})`} />
      <PremiumCard style={s.card}>
        {loading ? (
          <ActivityIndicator color={palette.gold} style={{ padding: spacing.xl }} />
        ) : memberships.length === 0 ? (
          <Text style={s.emptyText}>Sin membresías activas</Text>
        ) : (
          memberships.map(m => (
            <View key={m.id} style={s.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.memberProduct}>{m.product.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={s.memberMeta}>
                  Activado {formatDate(m.activated_at)}
                  {m.expires_at ? ` · Expira ${formatDate(m.expires_at)}` : ''}
                  {m.price_paid ? ` · $${m.price_paid}` : ''}
                </Text>
              </View>
              <StatusBadge status={m.status} />
            </View>
          ))
        )}
      </PremiumCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg },
  fieldLabel: { ...typography.label, color: palette.smoke, marginBottom: spacing.xs, fontSize: 9 },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  selectedUser: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.goldLight, borderRadius: radii.md, borderWidth: 1, borderColor: palette.lineGold, padding: spacing.md },
  selectedName: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 14, color: palette.ivory },
  selectedEmail: { ...typography.caption, color: palette.ash },
  dropdown: { backgroundColor: palette.graphiteLight, borderColor: palette.lineHard, borderWidth: 1, borderRadius: radii.md, marginTop: 2, overflow: 'hidden' },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  dropdownName: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  dropdownRole: { ...typography.caption, color: palette.smoke },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.line },
  optionChipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  optionText: { ...typography.caption, color: palette.ash, fontSize: 12 },
  optionTextActive: { color: palette.gold },
  submitBtn: { backgroundColor: palette.gold, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { ...typography.section, color: palette.black },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  memberProduct: { fontFamily: Fonts.display, fontSize: 11, color: palette.ivory, letterSpacing: 1 },
  memberMeta: { ...typography.caption, color: palette.smoke, marginTop: 2, fontSize: 10 },
});

const bd = StyleSheet.create({
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.pill, borderWidth: 1 },
  text: { ...typography.label, fontSize: 8 },
});
