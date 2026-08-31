/**
 * Admin CMI — Focus Desk (Escritorio del Mentor)
 *
 * Nuevo home del admin: un vistazo del equipo + a quién atender hoy, y la
 * asignación mentor↔cliente (mentores = admins actuales, por cliente, sin
 * agenda). Mission Control (KPIs de retención) se mudó a su propia ruta.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusHero, HeroPanel, HeroRule, LensRow, LensTabs, RowList, type Lens } from '@/components/focus-deck';
import { StatusPill, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useAdminRole } from '@/hooks/use-admin-role';
import { assignMentor } from '@/lib/admin/actions';
import {
  fetchClientNames, fetchMentorAssignments, fetchMentorsList, fetchUsers,
  type MentorAssignment, type MentorInfo,
} from '@/lib/admin/queries';
import type { AdminUser } from '@/lib/admin/types';
import { buildDesk, type DeskClient } from '@/lib/admin/deskLogic';
import { fetchExecutionDashboard, type ExecutionDashboardRow } from '@/lib/mentorExecution';

const MOMENTUM_LABEL: Record<string, string> = {
  rising: 'ascenso', stable: 'estable', fragile: 'frágil', declining: 'caída', critical: 'crítico',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FocusDeskScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const role = useAdminRole();
  const isMentor = role === 'mentor';

  const [rows, setRows] = useState<ExecutionDashboardRow[]>([]);
  const [assignments, setAssignments] = useState<MentorAssignment[]>([]);
  const [mentors, setMentors] = useState<MentorInfo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  // Roster mínimo de un mentor restringido: solo {user_id, name} de SUS
  // clientes (fetchUsers org-wide no le sirve — RLS se lo deja casi vacío).
  const [mentorRoster, setMentorRoster] = useState<{ user_id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [assigning, setAssigning] = useState<DeskClient | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    // allSettled: una fuente que falle (p.ej. mentor_assignments sin migrar) no
    // debe dejar el escritorio en spinner infinito. Un mentor restringido no
    // usa el roster completo ni la lista de mentores (RLS se lo dejaría casi
    // vacío igual — ambas lentes que los necesitan no existen para él) — se
    // ahorran esas 2 llamadas.
    const [rowsRes, assignRes, mentorsRes, usersRes] = await Promise.allSettled([
      fetchExecutionDashboard(),
      fetchMentorAssignments(),
      isMentor ? Promise.resolve<MentorInfo[]>([]) : fetchMentorsList(),
      isMentor ? Promise.resolve<AdminUser[]>([]) : fetchUsers(),
    ]);
    if (rowsRes.status === 'fulfilled') setRows(rowsRes.value);
    if (assignRes.status === 'fulfilled') setAssignments(assignRes.value);
    if (mentorsRes.status === 'fulfilled') setMentors(mentorsRes.value);
    if (usersRes.status === 'fulfilled') setUsers(usersRes.value);
    // Mentor restringido: nombres de sus clientes asignados. Sin esto, un
    // cliente sin mentor_tasks salía como "Usuario" (o directamente no salía —
    // ver el fix del universo en buildDesk).
    if (isMentor && userId && assignRes.status === 'fulfilled') {
      const myClientIds = assignRes.value.filter((a) => a.mentor_id === userId).map((a) => a.user_id);
      setMentorRoster(await fetchClientNames(myClientIds));
    }
    setLoading(false);
    setRefreshing(false);
  }, [isMentor, userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const desk = useMemo(() => buildDesk({
    rows,
    roster: isMentor
      ? mentorRoster.map((r) => ({ user_id: r.user_id, name: r.name, is_admin: false }))
      : users.map((u) => ({ user_id: u.id, name: u.name, is_admin: !!u.is_admin })),
    assignments: assignments.map((a) => ({ user_id: a.user_id, mentor_id: a.mentor_id })),
    // Para un mentor, ÉL es la única entrada que buildDesk necesita en
    // `mentors`: antes se pasaba [] y deskLogic anulaba TODA asignación cuyo
    // mentor no estuviera en la lista → `mine` siempre vacío → "Aún no tienes
    // clientes asignados" aunque los tuviera. Ese era el bug entero.
    mentors: isMentor && userId
      ? [{ id: userId, name: 'Yo' }]
      : mentors.map((m) => ({ id: m.id, name: m.name })),
    myId: userId ?? '',
  }), [rows, users, mentorRoster, assignments, mentors, userId, isMentor]);

  const openAssign = (client: DeskClient) => {
    setAssignError(null);
    setAssigning(client);
  };
  const closeAssign = () => { if (!assignSaving) setAssigning(null); };

  const handleAssign = async (mentorId: string | null) => {
    if (!assigning || !userId) return;
    setAssignSaving(true);
    setAssignError(null);
    const target = assigning;
    const res = await assignMentor({ adminId: userId, userId: target.user_id, mentorId });
    setAssignSaving(false);
    if (!res.success) {
      setAssignError(res.error ?? 'No se pudo guardar la asignación.');
      return;
    }
    setAssignments((prev) => {
      const rest = prev.filter((a) => a.user_id !== target.user_id);
      if (mentorId === null) return rest;
      return [...rest, { user_id: target.user_id, mentor_id: mentorId, assigned_by: userId, assigned_at: new Date().toISOString() }];
    });
    setAssigning(null);
  };

  if (loading) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} size="large" />
        <Text style={s.loadingText}>Cargando escritorio...</Text>
      </View>
    );
  }

  // Un mentor restringido solo ve lo suyo — el hero y los 3 números de arriba
  // eran org-wide siempre (viven fuera de cualquier lente), así que sin este
  // scoping un mentor vería "ATIENDE A [cliente de otro mentor]" y el tap lo
  // mandaría a un Espacio del Mentor que RLS le bloquea entero.
  const mineUrgent = desk.mine.filter((c) => c.severity && (c.severity === 'high' || c.severity === 'critical'));
  const clientCount = isMentor ? mineUrgent.length : desk.needsIntervention;
  const topUrgent = isMentor
    ? (desk.mine[0] && (desk.mine[0].attention > 0 || desk.mine[0].overdue > 0) ? desk.mine[0] : null)
    : desk.topUrgent;
  const statement = clientCount > 0
    ? `${clientCount} cliente${clientCount === 1 ? '' : 's'} necesita${clientCount === 1 ? '' : 'n'} intervención hoy.`
    : 'Nadie urgente hoy. El equipo respira.';
  const stats = isMentor
    ? [
        { label: 'Clientes asignados', value: String(desk.mine.length) },
        { label: 'Tareas vencidas', value: String(desk.mine.reduce((sum, c) => sum + c.overdue, 0)) },
        { label: 'Momentum en riesgo', value: String(desk.mine.filter((c) => c.momentum === 'fragile' || c.momentum === 'declining' || c.momentum === 'critical').length) },
      ]
    : [
        { label: 'Sin mentor asignado', value: String(desk.unassigned) },
        { label: 'Tareas vencidas', value: String(desk.overdueTotal) },
        { label: 'Momentum en riesgo', value: String(desk.momentumRisk) },
      ];

  const renderMisClientes = () => (
    desk.mine.length === 0 ? (
      <Text style={s.emptyLens}>
        {isMentor ? 'Aún no tienes clientes asignados.' : 'Sin clientes asignados. Asígnate desde la lente ASIGNACIÓN.'}
      </Text>
    ) : (
      <View style={{ gap: spacing.xs }}>
        {desk.mine.map((c) => (
          <LensRow
            key={c.user_id}
            icon="person"
            label={c.name}
            sub={`${c.openTasks} abiertas · ${c.overdue} vencidas · ${MOMENTUM_LABEL[c.momentum] ?? c.momentum}`}
            badge={c.attention > 0 ? String(c.attention) : undefined}
            onPress={() => router.push(`/admin/mentor/${c.user_id}` as never)}
          />
        ))}
      </View>
    )
  );

  const lenses: Lens[] = [
    { id: 'mios', label: 'MIS CLIENTES', render: renderMisClientes },
    {
      id: 'asignar',
      label: 'ASIGNACIÓN',
      render: () => (
        <View style={{ gap: 2 }}>
          {desk.clients.map((c) => {
            const mentorName = c.mentorId ? mentors.find((m) => m.id === c.mentorId)?.name ?? 'Mentor' : null;
            return (
              <Pressable
                key={c.user_id}
                onPress={() => openAssign(c)}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}. ${mentorName ? `Asignado a ${mentorName}` : 'Sin mentor'}. Cambiar asignación`}
                style={({ pressed }) => [s.assignRow, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.assignName}>{c.name}</Text>
                  <Text style={s.assignSub} numberOfLines={1}>
                    {c.openTasks} abiertas · {c.overdue} vencidas
                  </Text>
                </View>
                <Text style={mentorName ? s.assignChipGold : s.assignChipMuted} numberOfLines={1}>
                  {(mentorName ?? 'SIN MENTOR').toUpperCase()}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
              </Pressable>
            );
          })}
        </View>
      ),
    },
    {
      id: 'equipo',
      label: 'EQUIPO',
      render: () => (
        desk.byMentor.length === 0 ? (
          <Text style={s.emptyLens}>No hay mentores todavía — marca is_admin en Usuarios.</Text>
        ) : (
          <RowList
            rows={[
              ...desk.byMentor.map((m) => ({ label: m.mentor.name, value: `${m.clients} · ${m.inAttention} en atención` })),
              { label: 'Sin asignar', value: String(desk.unassigned) },
            ]}
          />
        )
      ),
    },
  ];

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
      }>
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>POLARIS GROWTH INSTITUTE</Text>
          <Text style={s.headerTitle}>ESCRITORIO</Text>
        </View>
        <StatusPill label={isMentor ? 'MENTOR' : 'ADMIN'} tone="gold" dot />
      </View>

      <HeroPanel>
        <FocusHero
          eyebrow="ESCRITORIO DEL MENTOR"
          statement={statement}
          metric={{ value: String(clientCount), caption: 'EN ATENCIÓN' }}
          directive={topUrgent ? {
            title: `ATIENDE A ${topUrgent.name.toUpperCase()}`,
            reason: topUrgent.topReason ?? `atención ${topUrgent.attention} · ${topUrgent.overdue} vencidas`,
            onPress: () => router.push(`/admin/mentor/${topUrgent.user_id}` as never),
          } : undefined}
        />
        <HeroRule />
        <RowList rows={stats} />
      </HeroPanel>

      {isMentor ? renderMisClientes() : <LensTabs initial="mios" lenses={lenses} />}

      {/* ══════════════════════ MODAL: ASIGNAR MENTOR ══════════════════════ */}
      <Modal visible={!!assigning} transparent animationType="slide" onRequestClose={closeAssign}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.handle} />
            <View style={modal.header}>
              <Text style={modal.title} accessibilityRole="header">ASIGNAR MENTOR</Text>
              <Pressable onPress={closeAssign} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
                <MaterialIcons name="close" size={20} color={palette.ash} />
              </Pressable>
            </View>
            {assigning && <Text style={modal.subtitle}>{assigning.name}</Text>}

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {mentors.length === 0 ? (
                <Text style={s.emptyLens}>No hay mentores disponibles.</Text>
              ) : mentors.map((m) => {
                const active = assigning?.mentorId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => handleAssign(m.id)}
                    disabled={assignSaving}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Asignar a ${m.name}`}
                    style={[modal.mentorRow, active && modal.mentorRowActive]}>
                    <Text style={[modal.mentorName, active && { color: palette.ivory }]}>{m.name}</Text>
                    {active && <MaterialIcons name="check" size={16} color={palette.goldText} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            {assigning?.mentorId && (
              <Pressable
                onPress={() => handleAssign(null)}
                disabled={assignSaving}
                style={modal.removeRow}
                accessibilityRole="button"
                accessibilityLabel="Quitar asignación">
                <MaterialIcons name="close" size={16} color={palette.danger} />
                <Text style={modal.removeText}>QUITAR ASIGNACIÓN</Text>
              </Pressable>
            )}

            {assignError && <Text style={modal.error}>{assignError}</Text>}
            {assignSaving && <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.sm }} />}

            <Pressable onPress={closeAssign} style={modal.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancelar">
              <Text style={modal.cancelText}>CANCELAR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ height: insets.bottom + spacing.xxxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.caption, color: palette.ash },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerEyebrow: { ...typography.label, color: palette.smoke, marginBottom: 2 },
  headerTitle: { ...typography.title, color: palette.ivory },

  emptyLens: { ...typography.caption, color: palette.smoke, fontStyle: 'italic', paddingVertical: spacing.md },

  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineSoft,
  },
  assignName: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.5 },
  assignSub: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 1 },
  assignChipGold: { ...typography.label, color: palette.goldText, fontSize: 9, maxWidth: 100 },
  assignChipMuted: { ...typography.label, color: palette.smoke, fontSize: 9, maxWidth: 100 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.blackDeep,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: palette.line,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.section, color: palette.ivory },
  subtitle: { ...typography.body, color: palette.ash, marginTop: 2, marginBottom: spacing.md },
  mentorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.sm,
    borderWidth: 1, borderColor: palette.line, marginBottom: 4,
  },
  mentorRowActive: { backgroundColor: 'rgba(255,200,4,0.06)', borderColor: palette.lineGold },
  mentorName: { fontFamily: Fonts.sans, fontWeight: '600', fontSize: 14, color: palette.ash },
  removeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    minHeight: 44, marginTop: spacing.sm,
  },
  removeText: { ...typography.label, color: palette.danger, fontSize: 11 },
  error: { ...typography.caption, color: palette.danger, marginTop: spacing.sm, textAlign: 'center' },
  cancelBtn: {
    minHeight: 44, borderWidth: 1, borderColor: palette.line, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.md,
  },
  cancelText: { ...typography.label, color: palette.ash },
});
