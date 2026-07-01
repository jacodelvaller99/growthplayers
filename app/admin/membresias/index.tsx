/**
 * Admin CMI — Gestión de Membresías (completo)
 *
 * - Lista paginada con filtros (Todas / Activas / Expiradas / Canceladas)
 * - Modal "Activar Membresía" para cualquier usuario/tier
 * - Acciones por fila: SUBIR, BAJAR, EXTENDER, CANCELAR
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import {
  SUBSCRIPTION_TIERS,
  TIER_ORDER,
  getTierColor,
  getTierLabel,
  getTiersAbove,
  getTiersBelow,
  type SubscriptionTier,
} from '@/constants/subscriptions';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  activateMembership,
  cancelMembership,
  changeTier,
  extendMembership,
} from '@/lib/admin/actions';
import { fetchAllMemberships, searchUsers } from '@/lib/admin/queries';
import type { AdminUser, UserMembership } from '@/lib/admin/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

type FilterStatus = 'all' | 'active' | 'expired' | 'cancelled';

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'Todas',     value: 'all'       },
  { label: 'Activas',   value: 'active'    },
  { label: 'Expiradas', value: 'expired'   },
  { label: 'Canceladas',value: 'cancelled' },
];

const DURATION_OPTS = [
  { label: 'Indefinida', days: null },
  { label: '30 días',    days: 30   },
  { label: '90 días',    days: 90   },
  { label: '180 días',   days: 180  },
  { label: '365 días',   days: 365  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <View style={[toast.wrap, type === 'error' && toast.error]}>
      <MaterialIcons name={type === 'success' ? 'check-circle' : 'error'} size={14} color={palette.ivory} />
      <Text style={toast.text}>{msg}</Text>
    </View>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const col = getTierColor(tier);
  // El tier premium es #FFC804 (gold brillante). Como TEXTO sobre superficie theme-aware
  // es ilegible en tema claro → goldText. Borde/dot conservan el color real del tier.
  const colText = col === palette.gold ? palette.goldText : col;
  return (
    <View style={[tb.wrap, { borderColor: col }]}>
      <View style={[tb.dot, { backgroundColor: col }]} />
      <Text style={[tb.text, { color: colText }]}>{getTierLabel(tier).toUpperCase()}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MembresiasScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();

  const [memberships, setMemberships]   = useState<UserMembership[]>([]);
  const [loading, setLoading]           = useState(true);
  const [toastMsg, setToastMsg]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery]   = useState('');

  // ── Activate modal ──────────────────────────────────────────────────────────
  const [activateOpen, setActivateOpen]     = useState(false);
  const [userQuery, setUserQuery]           = useState('');
  const [userResults, setUserResults]       = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser]     = useState<AdminUser | null>(null);
  const [selectedTier, setSelectedTier]     = useState<SubscriptionTier>('premium');
  const [durationDays, setDurationDays]     = useState<number | null>(null);
  const [pricePaid, setPricePaid]           = useState('');
  const [notes, setNotes]                   = useState('');
  const [saving, setSaving]                 = useState(false);

  // ── Row action modals ───────────────────────────────────────────────────────
  const [actionTarget, setActionTarget]     = useState<UserMembership | null>(null);
  const [actionType, setActionType]         = useState<'upgrade' | 'downgrade' | 'extend' | 'cancel' | null>(null);
  const [actionTier, setActionTier]         = useState<SubscriptionTier>('free');
  const [extendDate, setExtendDate]         = useState('');
  const [cancelReason, setCancelReason]     = useState('');
  const [actionSaving, setActionSaving]     = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllMemberships(filterStatus === 'all' ? undefined : filterStatus);
    setMemberships(data);
    setLoading(false);
  }, [filterStatus]);

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

  // ── Filtered display ────────────────────────────────────────────────────────
  const displayed = memberships.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.user_name ?? '').toLowerCase().includes(q) ||
      (m.user_email ?? '').toLowerCase().includes(q) ||
      m.product.toLowerCase().includes(q)
    );
  });

  // ── Activate handler ────────────────────────────────────────────────────────
  const handleActivate = async () => {
    if (!adminId || !selectedUser) return;
    setSaving(true);

    const expiresAt = durationDays
      ? new Date(Date.now() + durationDays * 864e5).toISOString()
      : null;

    const result = await activateMembership({
      adminId,
      userId:   selectedUser.id,
      product:  selectedTier,
      expiresAt,
      pricePaid: pricePaid ? parseFloat(pricePaid) : 0,
      notes:     notes || undefined,
    });

    setSaving(false);

    if (result.success) {
      showToast(`✅ Membresía ${getTierLabel(selectedTier)} activada para ${selectedUser.name}`, 'success');
      setActivateOpen(false);
      setSelectedUser(null);
      setUserQuery('');
      setPricePaid('');
      setNotes('');
      loadMemberships();
    } else {
      showToast(result.error ?? 'Error al activar', 'error');
    }
  };

  // ── Row action handler ──────────────────────────────────────────────────────
  const handleRowAction = async () => {
    if (!adminId || !actionTarget) return;
    setActionSaving(true);

    let result: { success: boolean; error?: string };

    if (actionType === 'upgrade' || actionType === 'downgrade') {
      result = await changeTier({
        adminId,
        userId:  actionTarget.user_id,
        newTier: actionTier,
      });
    } else if (actionType === 'extend') {
      if (!extendDate) { setActionSaving(false); return; }
      result = await extendMembership({
        adminId,
        membershipId: actionTarget.id,
        userId:       actionTarget.user_id,
        newExpiresAt: new Date(extendDate).toISOString(),
      });
    } else if (actionType === 'cancel') {
      result = await cancelMembership({
        adminId,
        membershipId: actionTarget.id,
        userId:       actionTarget.user_id,
        downgradeTo:  'free',
        reason:       cancelReason,
      });
    } else {
      setActionSaving(false); return;
    }

    setActionSaving(false);

    if (result.success) {
      const labels: Record<string, string> = {
        upgrade:   '↑ Subido',
        downgrade: '↓ Bajado',
        extend:    '⏱ Extendido',
        cancel:    '✖ Cancelado',
      };
      showToast(`${labels[actionType ?? '']} · ${actionTarget.user_name ?? actionTarget.user_id}`, 'success');
      setActionTarget(null);
      setActionType(null);
      loadMemberships();
    } else {
      showToast(result.error ?? 'Error en la acción', 'error');
    }
  };

  const openAction = (m: UserMembership, type: typeof actionType) => {
    setActionTarget(m);
    setActionType(type);
    const currentTier = m.product as SubscriptionTier;
    if (type === 'upgrade') setActionTier(getTiersAbove(currentTier)[0] ?? 'premium_plus');
    if (type === 'downgrade') setActionTier(getTiersBelow(currentTier).slice(-1)[0] ?? 'free');
    setExtendDate('');
    setCancelReason('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={sc.root}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={s.title}>MEMBRESÍAS</Text>
          <Pressable
            style={s.activateBtn}
            onPress={() => setActivateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Activar membresía">
            <MaterialIcons name="add" size={16} color={palette.ink} />
            <Text style={s.activateBtnText}>ACTIVAR</Text>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={s.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => setFilterStatus(f.value)}
              style={[s.filterChip, filterStatus === f.value && s.filterChipActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: filterStatus === f.value }}
              accessibilityLabel={`Filtro ${f.label}`}>
              <Text style={[s.filterText, filterStatus === f.value && s.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <MaterialIcons name="search" size={16} color={palette.smoke} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar usuario..."
            placeholderTextColor={palette.smoke}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List */}
        <GoldDivider label={`${filterStatus.toUpperCase()} (${displayed.length})`} />
        <PremiumCard style={s.card}>
          {loading ? (
            <ActivityIndicator color={palette.goldText} style={{ padding: spacing.xl }} />
          ) : displayed.length === 0 ? (
            <Text style={s.emptyText}>Sin membresías</Text>
          ) : (
            displayed.map((m) => (
              <View key={m.id} style={s.memberRow}>
                {/* User info */}
                <View style={s.memberInfo}>
                  <Text style={s.memberName}>{m.user_name ?? m.user_id.slice(0, 8)}</Text>
                  <TierBadge tier={m.product} />
                  <Text style={s.memberMeta}>
                    Desde {fmtDate(m.activated_at)}
                    {m.expires_at ? ` · Expira ${fmtDate(m.expires_at)}` : ' · Indefinida'}
                    {m.price_paid ? ` · $${m.price_paid} ${m.currency ?? 'USD'}` : ''}
                    {' · por '}{m.activated_by ?? 'admin'}
                  </Text>
                </View>

                {/* Row actions (only for active) */}
                {m.status === 'active' && (
                  <View style={s.rowActions}>
                    {getTiersAbove(m.product).length > 0 && (
                      <Pressable style={s.rowBtn} onPress={() => openAction(m, 'upgrade')} accessibilityRole="button" accessibilityLabel={`Subir de nivel a ${m.user_name ?? 'usuario'}`}>
                        <MaterialIcons name="arrow-upward" size={12} color={palette.goldText} />
                        <Text style={s.rowBtnText}>SUBIR</Text>
                      </Pressable>
                    )}
                    {getTiersBelow(m.product).length > 0 && (
                      <Pressable style={s.rowBtn} onPress={() => openAction(m, 'downgrade')} accessibilityRole="button" accessibilityLabel={`Bajar de nivel a ${m.user_name ?? 'usuario'}`}>
                        <MaterialIcons name="arrow-downward" size={12} color={palette.ash} />
                        <Text style={[s.rowBtnText, { color: palette.ash }]}>BAJAR</Text>
                      </Pressable>
                    )}
                    <Pressable style={s.rowBtn} onPress={() => openAction(m, 'extend')} accessibilityRole="button" accessibilityLabel={`Extender membresía de ${m.user_name ?? 'usuario'}`}>
                      <MaterialIcons name="schedule" size={12} color={palette.ash} />
                      <Text style={[s.rowBtnText, { color: palette.ash }]}>EXTENDER</Text>
                    </Pressable>
                    <Pressable style={s.rowBtn} onPress={() => openAction(m, 'cancel')} accessibilityRole="button" accessibilityLabel={`Cancelar membresía de ${m.user_name ?? 'usuario'}`}>
                      <MaterialIcons name="cancel" size={12} color={palette.danger} />
                      <Text style={[s.rowBtnText, { color: palette.danger }]}>CANCELAR</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
        </PremiumCard>
      </ScrollView>

      {/* ── Toast ── */}
      {toastMsg && (
        <View style={s.toastContainer} pointerEvents="none">
          <Toast msg={toastMsg.msg} type={toastMsg.type} />
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ACTIVAR MEMBRESÍA
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={activateOpen} transparent animationType="slide" onRequestClose={() => setActivateOpen(false)}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={modal.header}>
                <Text style={modal.title} accessibilityRole="header">ACTIVAR MEMBRESÍA</Text>
                <Pressable onPress={() => setActivateOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <MaterialIcons name="close" size={20} color={palette.ash} />
                </Pressable>
              </View>

              {/* User search */}
              <Text style={modal.fieldLabel}>USUARIO *</Text>
              {selectedUser ? (
                <View style={modal.selectedUser}>
                  <Text style={modal.selectedName}>{selectedUser.name}</Text>
                  <TierBadge tier={selectedUser.role ?? 'free'} />
                  <Pressable onPress={() => setSelectedUser(null)} accessibilityRole="button" accessibilityLabel="Quitar usuario seleccionado">
                    <MaterialIcons name="close" size={16} color={palette.smoke} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    style={modal.input}
                    placeholder="Buscar por nombre..."
                    placeholderTextColor={palette.smoke}
                    value={userQuery}
                    onChangeText={setUserQuery}
                  />
                  {userResults.length > 0 && (
                    <View style={modal.dropdown}>
                      {userResults.map((u) => (
                        <Pressable
                          key={u.id}
                          style={modal.dropdownItem}
                          onPress={() => { setSelectedUser(u); setUserResults([]); setUserQuery(''); }}
                          accessibilityRole="button"
                          accessibilityLabel={`Seleccionar ${u.name}`}>
                          <Text style={modal.dropdownName}>{u.name}</Text>
                          <TierBadge tier={u.role ?? 'free'} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Tier */}
              <Text style={[modal.fieldLabel, { marginTop: spacing.md }]}>NIVEL *</Text>
              {TIER_ORDER.filter((t) => t !== 'free').map((t) => (
                <Pressable
                  key={t}
                  style={[modal.tierRow, selectedTier === t && modal.tierRowActive]}
                  onPress={() => setSelectedTier(t)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedTier === t }}
                  accessibilityLabel={`Nivel ${getTierLabel(t)}`}>
                  <View style={[modal.tierDot, { backgroundColor: getTierColor(t) }]} />
                  <Text style={[modal.tierName, selectedTier === t && { color: palette.ivory }]}>
                    {getTierLabel(t)}
                  </Text>
                  <Text style={modal.tierDesc}>
                    {SUBSCRIPTION_TIERS[t]?.description ?? ''}
                  </Text>
                  {selectedTier === t && (
                    <MaterialIcons name="check" size={14} color={getTierColor(t)} />
                  )}
                </Pressable>
              ))}

              {/* Price */}
              <Text style={[modal.fieldLabel, { marginTop: spacing.md }]}>PRECIO PAGADO (USD)</Text>
              <TextInput
                style={modal.input}
                placeholder="0"
                placeholderTextColor={palette.smoke}
                keyboardType="decimal-pad"
                value={pricePaid}
                onChangeText={setPricePaid}
              />

              {/* Duration */}
              <Text style={[modal.fieldLabel, { marginTop: spacing.md }]}>DURACIÓN</Text>
              <View style={modal.durationRow}>
                {DURATION_OPTS.map((d) => (
                  <Pressable
                    key={d.label}
                    style={[modal.durationChip, durationDays === d.days && modal.durationChipActive]}
                    onPress={() => setDurationDays(d.days)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: durationDays === d.days }}
                    accessibilityLabel={`Duración ${d.label}`}>
                    <Text style={[modal.durationText, durationDays === d.days && modal.durationTextActive]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Notes */}
              <Text style={[modal.fieldLabel, { marginTop: spacing.md }]}>NOTAS INTERNAS</Text>
              <TextInput
                style={[modal.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Pago por transferencia..."
                placeholderTextColor={palette.smoke}
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              {/* Actions */}
              <View style={modal.footer}>
                <Pressable style={modal.cancelBtn} onPress={() => setActivateOpen(false)} accessibilityRole="button" accessibilityLabel="Cancelar">
                  <Text style={modal.cancelText}>CANCELAR</Text>
                </Pressable>
                <Pressable
                  style={[modal.submitBtn, (!selectedUser || saving) && modal.submitBtnDisabled]}
                  onPress={handleActivate}
                  disabled={!selectedUser || saving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !selectedUser || saving }}
                  accessibilityLabel="Activar membresía">
                  {saving ? (
                    <ActivityIndicator color={palette.ink} size="small" />
                  ) : (
                    <>
                      <Text style={modal.submitText}>ACTIVAR MEMBRESÍA</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={palette.ink} />
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ACCIONES POR FILA (upgrade / downgrade / extend / cancel)
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!actionType}
        transparent
        animationType="fade"
        onRequestClose={() => { setActionTarget(null); setActionType(null); }}>
        <View style={modal.overlay}>
          <View style={[modal.sheet, { maxHeight: 380 }]}>
            <View style={modal.header}>
              <Text style={modal.title}>
                {actionType === 'upgrade'   ? '↑ SUBIR DE NIVEL'   :
                 actionType === 'downgrade' ? '↓ BAJAR DE NIVEL'   :
                 actionType === 'extend'    ? '⏱ EXTENDER'         :
                                              '✖ CANCELAR MEMBRESÍA'}
              </Text>
              <Pressable onPress={() => { setActionTarget(null); setActionType(null); }} accessibilityRole="button" accessibilityLabel="Cerrar">
                <MaterialIcons name="close" size={20} color={palette.ash} />
              </Pressable>
            </View>

            {actionTarget && (
              <Text style={modal.actionSubtitle}>
                {actionTarget.user_name ?? actionTarget.user_id.slice(0, 8)} · {getTierLabel(actionTarget.product)}
              </Text>
            )}

            {/* Upgrade / Downgrade tier picker */}
            {(actionType === 'upgrade' || actionType === 'downgrade') && (
              <>
                <Text style={modal.fieldLabel}>NUEVO NIVEL</Text>
                {(actionType === 'upgrade'
                  ? getTiersAbove(actionTarget?.product ?? 'free')
                  : getTiersBelow(actionTarget?.product ?? 'growthplayers')
                ).map((t) => (
                  <Pressable
                    key={t}
                    style={[modal.tierRow, actionTier === t && modal.tierRowActive]}
                    onPress={() => setActionTier(t)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: actionTier === t }}
                    accessibilityLabel={`Nuevo nivel ${getTierLabel(t)}`}>
                    <View style={[modal.tierDot, { backgroundColor: getTierColor(t) }]} />
                    <Text style={[modal.tierName, actionTier === t && { color: palette.ivory }]}>
                      {getTierLabel(t)}
                    </Text>
                    {actionTier === t && <MaterialIcons name="check" size={14} color={getTierColor(t)} />}
                  </Pressable>
                ))}
              </>
            )}

            {/* Extend: date input */}
            {actionType === 'extend' && (
              <>
                <Text style={modal.fieldLabel}>NUEVA FECHA DE EXPIRACIÓN (YYYY-MM-DD)</Text>
                <TextInput
                  style={modal.input}
                  placeholder={`Ej: ${new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]}`}
                  placeholderTextColor={palette.smoke}
                  value={extendDate}
                  onChangeText={setExtendDate}
                />
              </>
            )}

            {/* Cancel: reason + warning */}
            {actionType === 'cancel' && (
              <>
                <Text style={[modal.fieldLabel, { color: palette.danger }]}>
                  El usuario pasará a FREE inmediatamente.
                </Text>
                <TextInput
                  style={modal.input}
                  placeholder="Motivo (opcional)"
                  placeholderTextColor={palette.smoke}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />
              </>
            )}

            <View style={modal.footer}>
              <Pressable style={modal.cancelBtn} onPress={() => { setActionTarget(null); setActionType(null); }} accessibilityRole="button" accessibilityLabel="Volver">
                <Text style={modal.cancelText}>VOLVER</Text>
              </Pressable>
              <Pressable
                style={[
                  modal.submitBtn,
                  actionType === 'cancel' && { backgroundColor: palette.danger },
                  actionSaving && modal.submitBtnDisabled,
                ]}
                onPress={handleRowAction}
                disabled={actionSaving}
                accessibilityRole="button"
                accessibilityState={{ disabled: actionSaving }}
                accessibilityLabel={actionType === 'cancel' ? 'Sí, cancelar membresía' : 'Confirmar'}>
                {actionSaving ? (
                  <ActivityIndicator color={palette.ink} size="small" />
                ) : (
                  <Text style={modal.submitText}>
                    {actionType === 'cancel' ? 'SÍ, CANCELAR' : 'CONFIRMAR'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  backBtn:       { padding: spacing.xs },
  title:         { ...typography.title, color: palette.ivory, flex: 1 },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  activateBtnText: { ...typography.label, color: palette.ink, fontSize: 9 },
  filterRow:   { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterChip:  { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.line },
  filterChipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  filterText:  { ...typography.label, color: palette.ash, fontSize: 9 },
  filterTextActive: { color: palette.goldText },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: palette.ivory,
    paddingVertical: spacing.sm,
  },
  card:          { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  emptyText:     { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.md },
  memberRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineSoft,
    gap: spacing.sm,
  },
  memberInfo: { gap: 4 },
  memberName:    { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 14, color: palette.ivory },
  memberMeta:    { ...typography.caption, color: palette.smoke, fontSize: 10, marginTop: 2 },
  rowActions:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rowBtnText:    { ...typography.label, color: palette.goldText, fontSize: 8 },
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.blackDeep,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '90%',
  },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title:         { ...typography.section, color: palette.ivory },
  actionSubtitle:{ ...typography.caption, color: palette.smoke, marginBottom: spacing.md },
  fieldLabel:    { ...typography.label, color: palette.smoke, marginBottom: spacing.xs, fontSize: 9 },
  input: {
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: palette.ivory,
    marginBottom: spacing.sm,
  },
  dropdown: {
    backgroundColor: palette.graphiteLight,
    borderColor: palette.lineHard,
    borderWidth: 1,
    borderRadius: radii.md,
    marginTop: 2,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineSoft,
  },
  dropdownName:  { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, flex: 1 },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.goldLight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.lineGold,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  selectedName:  { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 14, color: palette.ivory, flex: 1 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: 4,
  },
  tierRowActive: { backgroundColor: 'rgba(255,200,4,0.06)', borderColor: palette.lineGold },
  tierDot:       { width: 8, height: 8, borderRadius: 4 },
  tierName:      { fontFamily: Fonts.sans, fontWeight: '600', fontSize: 13, color: palette.ash, flex: 1 },
  tierDesc:      { ...typography.caption, color: palette.smoke, fontSize: 10 },
  durationRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  durationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  durationChipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  durationText:       { ...typography.caption, color: palette.ash, fontSize: 12 },
  durationTextActive: { color: palette.goldText },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText:    { ...typography.label, color: palette.ash },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText:    { ...typography.section, color: palette.ink },
});

const tb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot:  { width: 5, height: 5, borderRadius: 3 },
  text: { ...typography.label, fontSize: 8 },
});

const toast = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.success,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  error:  { backgroundColor: palette.danger },
  text:   { ...typography.caption, color: palette.ivory, flex: 1 },
});
