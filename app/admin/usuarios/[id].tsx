/**
 * Admin CMI — Perfil Completo de Usuario
 *
 * Secciones: Identidad · Membresías · Cursos · Intelligence ML ·
 *             Actividad · Conversaciones · Diario · Check-ins ·
 *             Score Soberano · Auditoría
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldAccentCard, GoldDivider, PremiumCard, screen, StatusPill } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  fetchMentorConversations,
  fetchUserAuditLog,
  fetchUserCheckIns,
  fetchUserDetail,
  fetchUserEvents,
  fetchUserMemberships,
} from '@/lib/admin/queries';
import type { AdminUserDetail, AuditLogEntry, JournalEntry, LiveEvent, MentorConversation, UserMembership } from '@/lib/admin/types';
import { deactivateMembership, recalculateUserMLAction, sendMessageAsNorman } from '@/lib/admin/actions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`;
  return `hace ${Math.floor(mins / 1440)}d`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={h.row}>
      <Text style={h.title}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} style={h.actionBtn}>
          <Text style={h.actionText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Engagement Gauge ────────────────────────────────────────────────────────

function EngagementGauge({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const col = pct >= 70 ? palette.success : pct >= 40 ? palette.warning : palette.danger;
  return (
    <View style={g.container}>
      <View style={g.track}>
        <View style={[g.fill, { width: `${pct}%` as unknown as number, backgroundColor: col }]} />
      </View>
      <Text style={[g.label, { color: col }]}>{pct}/100</Text>
    </View>
  );
}

// ─── Affinity Bar ─────────────────────────────────────────────────────────────

function AffinityBar({ label, value }: { label: string; value?: number }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <View style={ab.row}>
      <Text style={ab.label}>{label}</Text>
      <View style={ab.track}>
        <View style={[ab.fill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={ab.pct}>{pct}%</Text>
    </View>
  );
}

// ─── Norman message modal ─────────────────────────────────────────────────────

function NormanModal({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (msg: string) => void;
}) {
  const [msg, setMsg] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mo.overlay}>
        <View style={mo.sheet}>
          <Text style={mo.title}>ENVIAR MENSAJE COMO NORMAN</Text>
          <Text style={mo.sub}>El usuario verá esto en su chat con el Mentor</Text>
          <TextInput
            style={mo.input}
            multiline
            numberOfLines={5}
            value={msg}
            onChangeText={setMsg}
            placeholder="Escribe el mensaje..."
            placeholderTextColor={palette.smoke}
          />
          <View style={mo.actions}>
            <Pressable style={mo.cancelBtn} onPress={onClose}>
              <Text style={mo.cancelText}>CANCELAR</Text>
            </Pressable>
            <Pressable
              style={[mo.sendBtn, !msg.trim() && mo.sendBtnDisabled]}
              onPress={() => { if (msg.trim()) { onSend(msg.trim()); setMsg(''); } }}>
              <Text style={mo.sendText}>ENVIAR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UserDetailScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [conversations, setConversations] = useState<MentorConversation[]>([]);
  const [checkIns, setCheckIns] = useState<Array<{ date: string; energy: number; clarity: number; stress: number; sleep: number }>>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNorman, setShowNorman] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [userDetail, evts, convs, cis, audit] = await Promise.all([
      fetchUserDetail(userId),
      fetchUserEvents(userId, 30),
      fetchMentorConversations(userId, 30),
      fetchUserCheckIns(userId),
      fetchUserAuditLog(userId),
    ]);
    setUser(userDetail);
    setEvents(evts);
    setConversations(convs);
    setCheckIns(cis as typeof checkIns);
    setAuditLog(audit);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleDeactivateMembership = async (membership: UserMembership) => {
    if (!adminId) return;
    Alert.alert('Desactivar membresía', `¿Desactivar ${membership.product} de este usuario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          await deactivateMembership({ adminId, membershipId: membership.id, userId: userId! });
          load();
        },
      },
    ]);
  };

  const handleRecalcML = async () => {
    if (!adminId || !userId) return;
    setRecalcLoading(true);
    await recalculateUserMLAction({ adminId, userId });
    setRecalcLoading(false);
    Alert.alert('✅ Recalculado', 'El ML de este usuario fue actualizado.');
    load();
  };

  const handleSendNorman = async (message: string) => {
    if (!adminId || !userId) return;
    await sendMessageAsNorman({ adminId, userId, message });
    setShowNorman(false);
    Alert.alert('✅ Enviado', 'El mensaje fue enviado al chat del usuario.');
  };

  if (loading || !user) {
    return (
      <View style={[screen.root, s.center]}>
        <ActivityIndicator color={palette.gold} />
      </View>
    );
  }

  const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      <ScrollView
        style={screen.root}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Back + title ── */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={s.headerTitle}>PERFIL DE USUARIO</Text>
        </View>

        {/* ─────────────────────────────────────────────────── */}
        {/* A. IDENTIDAD */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="A. IDENTIDAD" />
        <PremiumCard style={s.card}>
          <View style={s.identityRow}>
            <View style={s.bigAvatar}>
              <Text style={s.bigAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{user.name}</Text>
              <Text style={s.userRole}>{user.role ?? '—'}</Text>
              {user.is_admin && <StatusPill label="ADMIN" tone="gold" dot />}
              <Text style={s.userMeta}>Registrado {formatDate(user.created_at)}</Text>
              {user.last_sign_in_at && (
                <Text style={s.userMeta}>Último acceso {timeAgo(user.last_sign_in_at)}</Text>
              )}
            </View>
          </View>
          <Pressable style={s.normanBtn} onPress={() => setShowNorman(true)}>
            <MaterialIcons name="send" size={16} color={palette.gold} />
            <Text style={s.normanBtnText}>ENVIAR MENSAJE COMO NORMAN</Text>
          </Pressable>
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* B. MEMBRESÍAS */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="B. MEMBRESÍAS Y ACCESO" />
        <PremiumCard style={s.card}>
          {(user.memberships ?? []).length === 0 ? (
            <Text style={s.emptyText}>Sin membresías activas</Text>
          ) : (
            user.memberships!.map(m => (
              <View key={m.id} style={s.membershipRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.membershipProduct}>{m.product.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={s.membershipMeta}>
                    Activado {formatDate(m.activated_at)}
                    {m.expires_at ? ` · Expira ${formatDate(m.expires_at)}` : ' · Sin vencimiento'}
                  </Text>
                  {m.price_paid ? <Text style={s.membershipPrice}>${m.price_paid} {m.currency}</Text> : null}
                </View>
                <View style={[s.statusDot, { backgroundColor: m.status === 'active' ? palette.success : palette.danger }]} />
                <Pressable onPress={() => handleDeactivateMembership(m)} style={s.deactivateBtn}>
                  <Text style={s.deactivateText}>DESACTIVAR</Text>
                </Pressable>
              </View>
            ))
          )}
          <Pressable
            style={s.addBtn}
            onPress={() => router.push(`/admin/membresias?userId=${userId}` as never)}>
            <MaterialIcons name="add" size={16} color={palette.gold} />
            <Text style={s.addBtnText}>ACTIVAR MEMBRESÍA</Text>
          </Pressable>
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* C. CURSOS */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="C. ACCESO A CURSOS" />
        <PremiumCard style={s.card}>
          {(user.course_access ?? []).length === 0 ? (
            <Text style={s.emptyText}>Sin acceso a cursos activos</Text>
          ) : (
            user.course_access!.map(ca => (
              <View key={ca.id} style={s.courseRow}>
                <MaterialIcons name="school" size={16} color={palette.gold} />
                <Text style={s.courseLabel}>{ca.course_id.replace(/_/g, ' ').toUpperCase()}</Text>
                {ca.expires_at && <Text style={s.courseMeta}>Expira {formatDate(ca.expires_at)}</Text>}
              </View>
            ))
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* D. INTELLIGENCE ML */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="D. INTELIGENCIA ML" />
        <PremiumCard style={s.card}>
          <SectionHeader
            title=""
            action={recalcLoading ? '⏳ Recalculando...' : '↻ RECALCULAR'}
            onAction={handleRecalcML}
          />
          {user.engagement_score !== undefined && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>ENGAGEMENT SCORE</Text>
              <EngagementGauge score={user.engagement_score} />
            </View>
          )}
          {user.churn_risk_label && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>CHURN RISK</Text>
              <Text style={[s.mlValue, { color: user.churn_risk_label === 'critical' ? palette.danger : user.churn_risk_label === 'low' ? palette.success : palette.warning }]}>
                {user.churn_risk_label.toUpperCase()} · {Math.round((user.churn_risk ?? 0) * 100)}%
              </Text>
            </View>
          )}
          {user.cohort_label && (
            <View style={s.mlRow}>
              <Text style={s.mlLabel}>COHORT</Text>
              <Text style={s.mlValue}>{user.cohort_label}</Text>
            </View>
          )}
          {user.next_action && (
            <GoldAccentCard style={{ padding: spacing.md, marginTop: spacing.sm }}>
              <Text style={s.mlLabel}>PRÓXIMA MEJOR ACCIÓN</Text>
              <Text style={s.mlBody}>{user.next_action}</Text>
            </GoldAccentCard>
          )}
          <View style={{ marginTop: spacing.md }}>
            <Text style={s.mlLabel}>AFINIDADES DE CONTENIDO</Text>
            <AffinityBar label="Binaurales"  value={user.affinity_binaural} />
            <AffinityBar label="Respiración" value={user.affinity_breathing} />
            <AffinityBar label="Meditación"  value={user.affinity_meditation} />
            <AffinityBar label="Lecciones"   value={user.affinity_lessons} />
            <AffinityBar label="Mentor"      value={user.affinity_mentor} />
            <AffinityBar label="Journaling"  value={user.affinity_journaling} />
          </View>
          {user.anomaly_detected && (
            <View style={[s.anomalyAlert]}>
              <Text style={s.anomalyText}>⚠ ANOMALÍA: {user.anomaly_type ?? 'desconocido'}</Text>
            </View>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* E. ACTIVIDAD RECIENTE */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`E. ACTIVIDAD RECIENTE (${events.length})`} />
        <PremiumCard style={s.card}>
          {events.length === 0 ? (
            <Text style={s.emptyText}>Sin actividad registrada</Text>
          ) : (
            events.slice(0, 15).map(evt => (
              <View key={evt.id} style={s.evtRow}>
                <View style={s.evtDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.evtType}>{evt.event_type.replace(/_/g, ' ')}</Text>
                  {evt.screen && <Text style={s.evtScreen}>{evt.screen}</Text>}
                </View>
                <Text style={s.evtTime}>{timeAgo(evt.created_at)}</Text>
              </View>
            ))
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* F. CONVERSACIONES CON MENTOR */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`F. CONVERSACIONES (${conversations.length})`} />
        <PremiumCard style={s.card}>
          {conversations.length === 0 ? (
            <Text style={s.emptyText}>Sin conversaciones</Text>
          ) : (
            conversations.slice(0, 10).map(conv => {
              const isExpanded = expandedConv === conv.id;
              return (
                <Pressable key={conv.id} onPress={() => setExpandedConv(isExpanded ? null : conv.id)}>
                  <View style={[s.convBubble, conv.role === 'assistant' ? s.bubbleLeft : s.bubbleRight]}>
                    <Text style={s.convRole}>{conv.role === 'assistant' ? 'MENTOR' : 'USUARIO'}</Text>
                    <Text style={s.convText} numberOfLines={isExpanded ? undefined : 2}>
                      {conv.content}
                    </Text>
                    <Text style={s.convTime}>{timeAgo(conv.created_at)}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* G. CHECK-INS HISTÓRICOS */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`G. CHECK-INS (${checkIns.length})`} />
        <PremiumCard style={s.card}>
          {checkIns.length === 0 ? (
            <Text style={s.emptyText}>Sin check-ins</Text>
          ) : (
            <View>
              <View style={s.checkInHeader}>
                {['FECHA', 'E', 'C', 'S', 'D'].map(col => (
                  <Text key={col} style={s.checkInHeaderCell}>{col}</Text>
                ))}
              </View>
              {checkIns.slice(0, 14).map(ci => (
                <View key={ci.date} style={s.checkInRow}>
                  <Text style={[s.checkInCell, { flex: 2 }]}>{ci.date}</Text>
                  <Text style={s.checkInCell}>{ci.energy}</Text>
                  <Text style={s.checkInCell}>{ci.clarity}</Text>
                  <Text style={s.checkInCell}>{ci.stress}</Text>
                  <Text style={s.checkInCell}>{ci.sleep}</Text>
                </View>
              ))}
            </View>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* K. BIOMÉTRICOS */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label="K. BIOMÉTRICOS" />
        <PremiumCard style={s.card}>
          {!user.biometric_provider ? (
            <Text style={s.emptyText}>Sin wearable conectado</Text>
          ) : (
            <>
              <View style={s.mlRow}>
                <Text style={s.mlLabel}>DISPOSITIVO</Text>
                <Text style={s.mlValue}>
                  {user.biometric_provider === 'oura' ? '⬡ Oura Ring' : '◈ WHOOP'}
                </Text>
              </View>
              {user.biometric_readiness != null && (
                <View style={s.mlRow}>
                  <Text style={s.mlLabel}>READINESS (3d avg)</Text>
                  <Text style={[s.mlValue, {
                    color: user.biometric_readiness >= 70 ? palette.success
                      : user.biometric_readiness >= 50 ? palette.warning
                      : palette.danger,
                  }]}>
                    {user.biometric_readiness}/100
                  </Text>
                </View>
              )}
              {user.biometric_hrv_ms != null && (
                <View style={s.mlRow}>
                  <Text style={s.mlLabel}>HRV HOY</Text>
                  <Text style={s.mlValue}>{Math.round(user.biometric_hrv_ms)} ms</Text>
                </View>
              )}
              {user.biometric_resting_hr != null && (
                <View style={s.mlRow}>
                  <Text style={s.mlLabel}>FC REPOSO</Text>
                  <Text style={s.mlValue}>{user.biometric_resting_hr} bpm</Text>
                </View>
              )}
              {user.biometric_anomaly && (
                <View style={[s.anomalyAlert, { marginTop: spacing.sm }]}>
                  <Text style={s.anomalyText}>
                    ⚠ {user.biometric_anomaly === 'biometric_stress'
                      ? 'HRV baja — sistema nervioso bajo tensión'
                      : 'FC reposo elevada sobre línea base'}
                  </Text>
                </View>
              )}
            </>
          )}
        </PremiumCard>

        {/* ─────────────────────────────────────────────────── */}
        {/* H. AUDITORÍA DE ESTE USUARIO */}
        {/* ─────────────────────────────────────────────────── */}
        <GoldDivider label={`H. AUDITORÍA (${auditLog.length})`} />
        <PremiumCard style={s.card}>
          {auditLog.length === 0 ? (
            <Text style={s.emptyText}>Sin acciones admin sobre este usuario</Text>
          ) : (
            auditLog.map(entry => (
              <View key={entry.id} style={s.auditRow}>
                <Text style={s.auditAction}>{entry.action.replace(/_/g, ' ')}</Text>
                <Text style={s.auditTime}>{timeAgo(entry.created_at)}</Text>
              </View>
            ))
          )}
        </PremiumCard>
      </ScrollView>

      <NormanModal
        visible={showNorman}
        onClose={() => setShowNorman(false)}
        onSend={handleSendNorman}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  headerTitle: { ...typography.title, color: palette.ivory },

  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', paddingVertical: spacing.sm },

  identityRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bigAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { fontFamily: Fonts.display, fontSize: 20, color: palette.gold },
  userName: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 16, color: palette.ivory },
  userRole: { ...typography.caption, color: palette.ash, marginTop: 2 },
  userMeta: { ...typography.mono, color: palette.smoke, marginTop: 2, fontSize: 10 },

  normanBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: palette.goldLight, borderRadius: radii.md, borderWidth: 1, borderColor: palette.lineGold, alignSelf: 'flex-start' },
  normanBtnText: { ...typography.label, color: palette.gold, fontSize: 10 },

  membershipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  membershipProduct: { fontFamily: Fonts.display, fontSize: 11, color: palette.ivory, letterSpacing: 1 },
  membershipMeta: { ...typography.caption, color: palette.smoke, marginTop: 2, fontSize: 10 },
  membershipPrice: { ...typography.mono, color: palette.gold, fontSize: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deactivateBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.danger },
  deactivateText: { ...typography.label, color: palette.danger, fontSize: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: spacing.sm, backgroundColor: palette.goldLight, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold },
  addBtnText: { ...typography.label, color: palette.gold, fontSize: 9 },

  courseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  courseLabel: { ...typography.section, color: palette.ivory, flex: 1, fontSize: 11 },
  courseMeta: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  mlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  mlLabel: { ...typography.label, color: palette.smoke, fontSize: 9 },
  mlValue: { fontFamily: Fonts.mono, fontSize: 12, color: palette.ivory },
  mlBody: { ...typography.caption, color: palette.ivory, marginTop: spacing.xs },
  anomalyAlert: { marginTop: spacing.md, backgroundColor: 'rgba(192,57,43,0.12)', borderRadius: radii.sm, padding: spacing.md, borderWidth: 1, borderColor: palette.danger },
  anomalyText: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 13, color: palette.danger },

  evtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  evtDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.gold },
  evtType: { fontFamily: Fonts.sans, fontSize: 12, color: palette.ivory, flex: 1, textTransform: 'capitalize' },
  evtScreen: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  evtTime: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  convBubble: { borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.sm },
  bubbleLeft: { backgroundColor: palette.overlay, alignSelf: 'flex-start', maxWidth: '90%' },
  bubbleRight: { backgroundColor: palette.goldLight, borderColor: palette.lineGold, borderWidth: 1, alignSelf: 'flex-end', maxWidth: '90%' },
  convRole: { ...typography.label, color: palette.smoke, fontSize: 8, marginBottom: 2 },
  convText: { ...typography.caption, color: palette.ivory },
  convTime: { ...typography.mono, color: palette.smoke, fontSize: 9, marginTop: 2 },

  checkInHeader: { flexDirection: 'row', paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.line },
  checkInHeaderCell: { ...typography.label, color: palette.smoke, flex: 1, textAlign: 'center', fontSize: 8 },
  checkInRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  checkInCell: { ...typography.mono, color: palette.ivory, flex: 1, textAlign: 'center', fontSize: 11 },

  auditRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  auditAction: { fontFamily: Fonts.sans, fontSize: 12, color: palette.ivory, textTransform: 'capitalize' },
  auditTime: { ...typography.mono, color: palette.smoke, fontSize: 10 },
});

const h = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.label, color: palette.smoke, fontSize: 9 },
  actionBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3, backgroundColor: palette.goldLight, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.lineGold },
  actionText: { ...typography.label, color: palette.gold, fontSize: 9 },
});

const g = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  track: { flex: 1, height: 6, backgroundColor: palette.charcoal, borderRadius: 3 },
  fill: { height: 6, borderRadius: 3 },
  label: { ...typography.mono, fontSize: 11, width: 50, textAlign: 'right' },
});

const ab = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  label: { ...typography.mono, color: palette.ash, fontSize: 10, width: 80 },
  track: { flex: 1, height: 4, backgroundColor: palette.charcoal, borderRadius: 2 },
  fill: { height: 4, borderRadius: 2, backgroundColor: palette.gold },
  pct: { ...typography.mono, color: palette.smoke, fontSize: 10, width: 32, textAlign: 'right' },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  sheet: { backgroundColor: palette.graphiteLight, borderRadius: radii.lg, padding: spacing.xl, width: '100%', maxWidth: 480, gap: spacing.md },
  title: { ...typography.section, color: palette.gold },
  sub: { ...typography.caption, color: palette.smoke },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line },
  cancelText: { ...typography.label, color: palette.ash },
  sendBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.sm, backgroundColor: palette.gold },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { ...typography.label, color: palette.black },
});
