/**
 * EL CÍRCULO — Perfil público MÍNIMO de un miembro.
 * Expone SOLO name + avatar + tier + streak (nada sensible: sin scores
 * detallados, sin datos de salud, sin actividad). Acciones: conectar (según
 * estado), mensaje 1-1, bloquear.
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENV } from '@/app/config/env';
import { Avatar } from '@/components/Avatar';
import { CircleDisabled, CircleEmpty } from '@/components/circle';
import { PremiumCard, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  acceptConnection,
  fetchConnectionWith,
  fetchPublicProfile,
  removeConnection,
  requestConnection,
} from '@/lib/circle';
import { connectionStateFor, type Connection, type ConnectionStatus, type PublicProfile } from '@/lib/circleLogic';
import { supabase } from '@/lib/supabase';

 
const anyDb = supabase as any;

export default function PerfilPublicoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isSelf = !!userId && userId === profileId;

  const load = useCallback(async () => {
    if (!profileId) return;
    const [p, conn] = await Promise.all([
      fetchPublicProfile(profileId),
      userId && userId !== profileId ? fetchConnectionWith(userId, profileId) : Promise.resolve(null),
    ]);
    setProfile(p);
    setConnection(conn);
    setLoading(false);
  }, [profileId, userId]);

  useEffect(() => { load(); }, [load]);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const connState: ConnectionStatus = connectionStateFor(userId ?? '', connection);

  const handleConnect = async () => {
    if (!userId || !profileId || busy) return;
    setBusy(true);
    if (connState === 'none') {
      const res = await requestConnection(userId, profileId);
      if (res.success) await load();
      else setNotice(res.error ?? 'No se pudo enviar la solicitud.');
    } else if (connState === 'pending_received' && connection) {
      const res = await acceptConnection(connection.id);
      if (res.success) await load();
    } else if ((connState === 'pending_sent' || connState === 'accepted') && connection) {
      const res = await removeConnection(connection.id);
      if (res.success) await load();
    }
    setBusy(false);
  };

  const handleBlock = () => {
    if (!userId || !profileId || !profile) return;
    Alert.alert('Bloquear miembro', `No verás más el contenido de ${profile.name}. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear', style: 'destructive',
        onPress: async () => {
          try {
            await anyDb.from('user_blocks').insert({ blocker_id: userId, blocked_id: profileId });
          } catch { /* degradable */ }
          router.back();
        },
      },
    ]);
  };

  const CONNECT_LABEL: Record<ConnectionStatus, string> = {
    none: 'CONECTAR',
    pending_sent: 'SOLICITUD ENVIADA · CANCELAR',
    pending_received: 'ACEPTAR SOLICITUD',
    accepted: 'CONECTADOS · DESHACER',
  };

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>PERFIL</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : !profile ? (
        <CircleEmpty icon="person-off" text="Este miembro no está disponible." />
      ) : (
        <PremiumCard style={s.card}>
          <Avatar id={profile.user_id} name={profile.name} uri={profile.avatar_url ?? undefined} size={72} />
          <Text style={s.name}>{profile.name}</Text>
          <View style={s.badges}>
            {!!profile.tier && (
              <View style={s.badge} accessible accessibilityLabel={`Rango ${profile.tier}`}>
                <MaterialIcons name="military-tech" size={13} color={palette.goldText} />
                <Text style={s.badgeText}>{profile.tier.toUpperCase()}</Text>
              </View>
            )}
            {profile.streak != null && profile.streak > 0 && (
              <View style={s.badge} accessible accessibilityLabel={`Racha de ${profile.streak} días`}>
                <MaterialIcons name="local-fire-department" size={13} color={palette.goldText} />
                <Text style={s.badgeText}>{profile.streak} DÍAS</Text>
              </View>
            )}
          </View>

          {!isSelf && (
            <View style={s.actions}>
              <Pressable
                style={[connState === 'none' || connState === 'pending_received' ? s.primaryBtn : s.secondaryBtn, busy && { opacity: 0.5 }]}
                onPress={handleConnect}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={CONNECT_LABEL[connState]}>
                <Text style={connState === 'none' || connState === 'pending_received' ? s.primaryBtnText : s.secondaryBtnText}>
                  {CONNECT_LABEL[connState]}
                </Text>
              </Pressable>
              <Pressable
                style={s.secondaryBtn}
                onPress={() => router.push(`/comunidad/chat/${profile.user_id}?id=${profile.user_id}&name=${encodeURIComponent(profile.name)}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Enviar mensaje a ${profile.name}`}>
                <Text style={s.secondaryBtnText}>MENSAJE</Text>
              </Pressable>
              <Pressable
                style={s.dangerBtn}
                onPress={handleBlock}
                accessibilityRole="button"
                accessibilityLabel={`Bloquear a ${profile.name}`}>
                <Text style={s.dangerBtnText}>BLOQUEAR</Text>
              </Pressable>
            </View>
          )}

          {notice && (
            <Text style={s.notice} accessibilityLiveRegion="polite" role="alert">{notice}</Text>
          )}
        </PremiumCard>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  card: { marginHorizontal: spacing.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  name: { ...typography.title, color: palette.ivory, fontSize: 20 },
  badges: { flexDirection: 'row', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { ...typography.label, color: palette.goldText, fontSize: 9, letterSpacing: 0.8 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: { backgroundColor: palette.gold, borderRadius: radii.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...typography.label, color: palette.ink, letterSpacing: 1 },
  secondaryBtn: { borderWidth: 1, borderColor: palette.gold, borderRadius: radii.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { ...typography.label, color: palette.goldText, letterSpacing: 1 },
  dangerBtn: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { ...typography.label, color: palette.danger, fontSize: 10, letterSpacing: 1 },
  notice: { ...typography.caption, color: palette.goldText, textAlign: 'center', fontSize: 12 },
});
