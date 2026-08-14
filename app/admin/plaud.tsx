/**
 * Admin — Plaud: cola de revisión + sincronización de mentorías grabadas.
 *
 * Las grabaciones cuyo nombre matchea a un cliente se importan solas (cron
 * horario). Aquí vive lo demás: sincronizar a demanda, asignar con un clic lo
 * que no matcheó (nombre ambiguo o sin cliente) y ver el historial de imports.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { showAlert } from '@/lib/confirm';
import { fetchUsers } from '@/lib/admin/queries';
import type { AdminUser } from '@/lib/admin/types';
import {
  assignPlaudImport,
  fetchPlaudImports,
  ignorePlaudImport,
  triggerPlaudSync,
  type PlaudImportRow,
} from '@/lib/plaud';

const STATUS_LABEL: Record<PlaudImportRow['status'], string> = {
  pending_review: 'EN COLA',
  processing: 'PROCESANDO',
  imported: 'IMPORTADO',
  ignored: 'IGNORADO',
  error: 'ERROR',
};

const STATUS_COLOR: Record<PlaudImportRow['status'], string> = {
  pending_review: palette.goldText,
  processing: palette.smoke,
  imported: palette.success,
  ignored: palette.smoke,
  error: palette.danger,
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(sec: number | null): string {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
}

// ─── Fila de la cola de revisión (con selector de cliente) ────────────────────
function QueueRow({
  imp, users, onAssign, onIgnore, busy,
}: {
  imp: PlaudImportRow;
  users: AdminUser[];
  onAssign: (userId: string) => void;
  onIgnore: () => void;
  busy: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <PremiumCard style={qr.card}>
      <View style={qr.header}>
        <MaterialIcons name="mic" size={18} color={palette.goldText} />
        <View style={{ flex: 1 }}>
          <Text style={qr.name}>{imp.recording_name ?? '(sin nombre)'}</Text>
          <Text style={qr.meta}>
            {formatDate(imp.recorded_at ?? imp.created_at)}
            {imp.duration_sec ? ` · ${formatDuration(imp.duration_sec)}` : ''}
          </Text>
        </View>
      </View>

      {imp.plaud_summary ? (
        <Text style={qr.summary} numberOfLines={3}>{imp.plaud_summary}</Text>
      ) : null}

      {busy ? (
        <ActivityIndicator size="small" color={palette.goldText} />
      ) : pickerOpen ? (
        <View style={qr.picker}>
          <Text style={qr.pickerTitle}>¿DE QUIÉN ES ESTA SESIÓN?</Text>
          <View style={qr.pickerGrid}>
            {users.map((u) => (
              <Pressable
                key={u.id}
                style={qr.userChip}
                onPress={() => onAssign(u.id)}
                accessibilityRole="button"
                accessibilityLabel={`Asignar a ${u.name}`}>
                <Text style={qr.userChipText}>{u.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setPickerOpen(false)} style={qr.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancelar asignación">
            <Text style={qr.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={qr.actions}>
          <Pressable
            style={qr.assignBtn}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Asignar a un cliente">
            <MaterialIcons name="person-add" size={15} color={palette.ink} />
            <Text style={qr.assignText}>ASIGNAR CLIENTE</Text>
          </Pressable>
          <Pressable style={qr.ignoreBtn} onPress={onIgnore} accessibilityRole="button" accessibilityLabel="Ignorar esta grabación">
            <Text style={qr.ignoreText}>Ignorar</Text>
          </Pressable>
        </View>
      )}
    </PremiumCard>
  );
}

const qr = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.section, color: palette.ivory, fontSize: 14 },
  meta: { ...typography.mono, color: palette.smoke, fontSize: 10, marginTop: 2 },
  summary: { ...typography.caption, color: palette.ash, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assignBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: palette.gold, borderRadius: radii.sm,
    paddingVertical: spacing.md, minHeight: 44,
  },
  assignText: { fontFamily: Fonts.display, color: palette.ink, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  ignoreBtn: { paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' },
  ignoreText: { ...typography.caption, color: palette.smoke },
  picker: { gap: spacing.sm },
  pickerTitle: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1.2 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  userChip: {
    paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 44,
    borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold,
    backgroundColor: palette.goldGlow, justifyContent: 'center',
  },
  userChipText: { fontFamily: Fonts.display, color: palette.goldText, fontSize: 12 },
  cancelBtn: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  cancelText: { ...typography.caption, color: palette.smoke },
});

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function AdminPlaudScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [imports, setImports] = useState<PlaudImportRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [imps, us] = await Promise.all([fetchPlaudImports(), fetchUsers()]);
    setImports(imps);
    setUsers(us);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    const res = await triggerPlaudSync();
    setSyncing(false);
    if (res.ok) {
      showAlert(
        'Sincronización completa',
        `${res.fetched ?? 0} grabaciones revisadas · ${res.imported ?? 0} importadas · ${res.queued ?? 0} en cola`,
      );
    } else {
      showAlert('Error', res.error ?? 'No se pudo sincronizar');
    }
    await load();
  };

  const handleAssign = async (imp: PlaudImportRow, userId: string) => {
    setBusyId(imp.id);
    const res = await assignPlaudImport(imp.id, userId);
    setBusyId(null);
    if (!res.ok) showAlert('Error', res.error ?? 'No se pudo asignar');
    await load();
  };

  const handleIgnore = async (imp: PlaudImportRow) => {
    setBusyId(imp.id);
    await ignorePlaudImport(imp.id);
    setBusyId(null);
    await load();
  };

  const queue = imports.filter((i) => i.status === 'pending_review' || i.status === 'error');
  const history = imports.filter((i) => i.status !== 'pending_review' && i.status !== 'error');

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>
      {/* Top nav */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>PLAUD</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Cómo funciona + sincronizar */}
      <PremiumCard style={styles.infoCard}>
        <MaterialIcons name="graphic-eq" size={26} color={palette.goldText} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>MENTORÍAS GRABADAS</Text>
          <Text style={styles.infoSub}>
            Nombra la grabación en Plaud con el nombre del cliente (&ldquo;Juan Pérez — sesión 3&rdquo;)
            y se importa sola cada hora: resumen, compromisos y memoria. Lo que no matchea
            cae aquí para que lo asignes con un clic.
          </Text>
        </View>
      </PremiumCard>

      <Pressable
        style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
        onPress={handleSync}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityState={{ disabled: syncing }}
        accessibilityLabel="Sincronizar Plaud ahora">
        {syncing
          ? <ActivityIndicator size="small" color={palette.ink} />
          : <>
              <MaterialIcons name="sync" size={18} color={palette.ink} />
              <Text style={styles.syncText}>SINCRONIZAR AHORA</Text>
            </>
        }
      </Pressable>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.goldText} />
        </View>
      ) : (
        <>
          <GoldDivider label={`COLA DE REVISIÓN (${queue.length})`} />
          {queue.length === 0 ? (
            <Text style={styles.emptyText}>
              Nada pendiente — todo lo nuevo matcheó solo o ya fue asignado.
            </Text>
          ) : (
            queue.map((imp) => (
              <View key={imp.id} style={{ gap: spacing.xs }}>
                {imp.status === 'error' && imp.error ? (
                  <Text style={styles.errorText}>Último intento falló: {imp.error}</Text>
                ) : null}
                <QueueRow
                  imp={imp}
                  users={users}
                  busy={busyId === imp.id}
                  onAssign={(userId) => handleAssign(imp, userId)}
                  onIgnore={() => handleIgnore(imp)}
                />
              </View>
            ))
          )}

          <GoldDivider label="HISTORIAL" />
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Aún no hay imports. Pulsa &ldquo;Sincronizar ahora&rdquo;.</Text>
          ) : (
            history.map((imp) => (
              <View key={imp.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName} numberOfLines={1}>
                    {imp.recording_name ?? '(sin nombre)'}
                  </Text>
                  <Text style={styles.historyMeta}>{formatDate(imp.recorded_at ?? imp.created_at)}</Text>
                </View>
                <Text style={[styles.historyStatus, { color: STATUS_COLOR[imp.status] }]}>
                  {STATUS_LABEL[imp.status]}
                </Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 18, fontWeight: '800', color: palette.ivory, letterSpacing: 2 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoTitle: { ...typography.section, color: palette.ivory, fontSize: 13, marginBottom: 6 },
  infoSub: { ...typography.body, color: palette.smoke, fontSize: 13, lineHeight: 20 },

  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: palette.gold, borderRadius: radii.sm,
    paddingVertical: 14, minHeight: 48, marginTop: spacing.md,
  },
  syncText: { fontFamily: Fonts.display, fontSize: 13, fontWeight: '800', color: palette.ink, letterSpacing: 1 },

  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { ...typography.caption, color: palette.smoke, fontSize: 12, lineHeight: 17 },
  errorText: { ...typography.mono, color: palette.danger, fontSize: 10 },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.graphite,
  },
  historyName: { ...typography.body, color: palette.ash, fontSize: 13 },
  historyMeta: { ...typography.mono, color: palette.smoke, fontSize: 10, marginTop: 2 },
  historyStatus: { ...typography.label, fontSize: 9, letterSpacing: 1 },
});
