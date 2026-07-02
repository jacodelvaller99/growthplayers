/**
 * EL CÍRCULO — Conexiones: solicitudes recibidas (aceptar/rechazar) + mi red.
 * Las conexiones son privadas (RLS: solo participantes). Rechazar = eliminar
 * la solicitud (permite re-solicitar). Filtrado por bloqueos.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENV } from '@/app/config/env';
import { Avatar } from '@/components/Avatar';
import { CircleDisabled, CircleEmpty } from '@/components/circle';
import { GoldDivider, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  acceptConnection,
  fetchBlockedIds,
  fetchMyConnections,
  fetchNamesFor,
  removeConnection,
} from '@/lib/circle';
import { connectionPeerId, connectionStateFor, type Connection } from '@/lib/circleLogic';

interface ConnRow {
  connection: Connection;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
}

export default function ConexionesScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [received, setReceived] = useState<ConnRow[]>([]);
  const [accepted, setAccepted] = useState<ConnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const [conns, blocked] = await Promise.all([
      fetchMyConnections(userId),
      fetchBlockedIds(userId),
    ]);
    const visible = conns.filter((c) => !blocked.has(connectionPeerId(userId, c)));
    const names = await fetchNamesFor(visible.map((c) => connectionPeerId(userId, c)));
    const toRow = (c: Connection): ConnRow => {
      const peerId = connectionPeerId(userId, c);
      return {
        connection: c,
        peerId,
        peerName: names[peerId]?.name ?? 'Miembro',
        peerAvatar: names[peerId]?.avatar ?? null,
      };
    };
    setReceived(visible.filter((c) => connectionStateFor(userId, c) === 'pending_received').map(toRow));
    setAccepted(visible.filter((c) => c.status === 'accepted').map(toRow));
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const handleAccept = async (row: ConnRow) => {
    setBusyId(row.connection.id);
    const res = await acceptConnection(row.connection.id);
    if (res.success) {
      setReceived((prev) => prev.filter((r) => r.connection.id !== row.connection.id));
      setAccepted((prev) => [{ ...row, connection: { ...row.connection, status: 'accepted' } }, ...prev]);
    }
    setBusyId(null);
  };

  const handleReject = async (row: ConnRow) => {
    setBusyId(row.connection.id);
    const res = await removeConnection(row.connection.id);
    if (res.success) setReceived((prev) => prev.filter((r) => r.connection.id !== row.connection.id));
    setBusyId(null);
  };

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.goldText} />}>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>MI RED</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : (
        <>
          {/* Solicitudes recibidas */}
          <GoldDivider label={`SOLICITUDES (${received.length})`} />
          <View style={s.section}>
            {received.length === 0 ? (
              <Text style={s.emptyLine}>Sin solicitudes pendientes.</Text>
            ) : (
              received.map((row) => (
                <View key={row.connection.id} style={s.row}>
                  <Avatar id={row.peerId} name={row.peerName} uri={row.peerAvatar ?? undefined} size={36} />
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/comunidad/perfil/${row.peerId}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver perfil de ${row.peerName}`}>
                    <Text style={s.rowName}>{row.peerName}</Text>
                    <Text style={s.rowSub}>quiere conectar contigo</Text>
                  </Pressable>
                  <Pressable
                    style={[s.acceptBtn, busyId === row.connection.id && { opacity: 0.5 }]}
                    disabled={busyId === row.connection.id}
                    onPress={() => handleAccept(row)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busyId === row.connection.id }}
                    accessibilityLabel={`Aceptar solicitud de ${row.peerName}`}>
                    <MaterialIcons name="check" size={18} color={palette.ink} />
                  </Pressable>
                  <Pressable
                    style={[s.rejectBtn, busyId === row.connection.id && { opacity: 0.5 }]}
                    disabled={busyId === row.connection.id}
                    onPress={() => handleReject(row)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busyId === row.connection.id }}
                    accessibilityLabel={`Rechazar solicitud de ${row.peerName}`}>
                    <MaterialIcons name="close" size={18} color={palette.ash} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Mi red */}
          <GoldDivider label={`CONEXIONES (${accepted.length})`} />
          <View style={s.section}>
            {accepted.length === 0 ? (
              <CircleEmpty
                icon="group"
                text={'Todavía no tienes conexiones.\nConecta desde el perfil de otros miembros — en eventos, espacios o la plaza.'}
              />
            ) : (
              accepted.map((row) => (
                <Pressable
                  key={row.connection.id}
                  style={s.row}
                  onPress={() => router.push(`/comunidad/perfil/${row.peerId}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver perfil de ${row.peerName}`}>
                  <Avatar id={row.peerId} name={row.peerName} uri={row.peerAvatar ?? undefined} size={36} />
                  <Text style={[s.rowName, { flex: 1 }]}>{row.peerName}</Text>
                  <Pressable
                    style={s.dmBtn}
                    onPress={() => router.push(`/comunidad/chat/${row.peerId}?id=${row.peerId}&name=${encodeURIComponent(row.peerName)}` as never)}
                    accessibilityRole="button"
                    accessibilityLabel={`Enviar mensaje a ${row.peerName}`}>
                    <MaterialIcons name="forum" size={16} color={palette.goldText} />
                  </Pressable>
                  <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
                </Pressable>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  emptyLine: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, minHeight: 60 },
  rowName: { ...typography.body, color: palette.ivory, fontSize: 14, fontWeight: '600' },
  rowSub: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 1 },
  acceptBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  dmBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, alignItems: 'center', justifyContent: 'center' },
});
