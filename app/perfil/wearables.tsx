import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;
import {
  OAUTH_URLS,
  triggerWearableSync,
  useWearableConnections,
  type WearableProvider,
} from '@/lib/wearables';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateState(): string {
  return Math.random().toString(36).substring(2, 18);
}

function timeSince(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Provider metadata ────────────────────────────────────────────────────────
const PROVIDERS: {
  id: WearableProvider;
  name: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
}[] = [
  {
    id:       'oura',
    name:     'Oura Ring',
    subtitle: 'Readiness · Sueño · FC · HRV',
    icon:     'circle',
    color:    palette.ash,
  },
  {
    id:       'whoop',
    name:     'WHOOP',
    subtitle: 'Recovery · Strain · Sueño · HRV',
    icon:     'watch',
    color:    palette.ash,
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WearablesScreen() {
  const sc = useScreen();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ connected?: string; error?: string }>();

  const { connections, loading, isConnected, getConnection, reload } = useWearableConnections();
  const [connecting, setConnecting] = useState<WearableProvider | null>(null);
  const [syncing, setSyncing] = useState<WearableProvider | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle OAuth callback params
  useEffect(() => {
    if (params.connected) {
      setSuccessMsg(`${params.connected === 'oura' ? 'Oura Ring' : 'WHOOP'} conectado ✓`);
      reload();
    }
  }, [params.connected, reload]);

  async function handleConnect(provider: WearableProvider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(provider);
    const state = generateState();

    try {
      const url    = OAUTH_URLS[provider](state);
      const result = await WebBrowser.openAuthSessionAsync(url, 'growthplayers://oauth');

      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const code   = parsed.searchParams.get('code');

        if (code) {
          // Exchange code via edge function
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session');

          const { error } = await supabase.functions.invoke('sync-wearables', {
            body: { action: 'connect', provider, code },
          });

          if (error) throw new Error(error.message);

          setSuccessMsg(`${provider === 'oura' ? 'Oura Ring' : 'WHOOP'} conectado ✓`);
          await reload();
        }
      }
    } catch (e: any) {
      console.error('[wearables] connect error:', e.message);
    } finally {
      setConnecting(null);
    }
  }

  async function handleSync(provider: WearableProvider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncing(provider);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSyncing(null); return; }

    await triggerWearableSync(session.user.id, provider);
    await reload();
    setSyncing(null);
    setSuccessMsg('Sincronización completa ✓');
  }

  async function handleDisconnect(provider: WearableProvider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const conn = getConnection(provider);
    if (!conn) return;

    await supa
      .from('wearable_connections')
      .update({ is_active: false })
      .eq('id', conn.id);

    await reload();
  }

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[
        sc.content,
        { paddingTop: insets.top + 16, paddingBottom: 80 },
      ]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>DISPOSITIVOS</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Success banner */}
      {successMsg && (
        <PremiumCard style={styles.successBanner}>
          <MaterialIcons name="check-circle" size={18} color={palette.success} />
          <Text style={styles.successText}>{successMsg}</Text>
          <Pressable onPress={() => setSuccessMsg(null)}>
            <MaterialIcons name="close" size={16} color={palette.smoke} />
          </Pressable>
        </PremiumCard>
      )}

      {/* Info banner */}
      <PremiumCard style={styles.infoBanner}>
        <MaterialIcons name="monitor-heart" size={24} color={palette.gold} />
        <View style={styles.infoBannerBody}>
          <Text style={styles.infoBannerTitle}>Datos que trabajan para ti</Text>
          <Text style={styles.infoBannerSub}>
            Tus datos biométricos alimentan directamente las recomendaciones de Norman
            y optimizan el ML Engine para tu programa.
          </Text>
        </View>
      </PremiumCard>

      <GoldDivider label="DISPOSITIVOS CONECTADOS" />

      {loading ? (
        <ActivityIndicator color={palette.gold} style={{ marginTop: spacing.xl }} />
      ) : (
        PROVIDERS.map((p) => {
          const connected = isConnected(p.id);
          const conn      = getConnection(p.id);
          const isConn    = connecting === p.id;
          const isSync    = syncing   === p.id;

          return (
            <PremiumCard key={p.id} style={styles.deviceCard}>
              {/* Device info */}
              <View style={styles.deviceRow}>
                <View style={[styles.deviceIcon, { backgroundColor: p.color + '22' }]}>
                  <MaterialIcons name={p.icon} size={22} color={p.color} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{p.name}</Text>
                  <Text style={styles.deviceSub}>{p.subtitle}</Text>
                  {connected && conn?.last_synced_at && (
                    <Text style={styles.lastSync}>
                      Última sync: {timeSince(conn.last_synced_at)} atrás
                    </Text>
                  )}
                </View>
                {connected && (
                  <View style={styles.connectedBadge}>
                    <MaterialIcons name="check-circle" size={14} color={palette.success} />
                    <Text style={styles.connectedText}>Activo</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.deviceActions}>
                {!connected ? (
                  <Pressable
                    style={[styles.connectBtn, { borderColor: p.color }]}
                    onPress={() => handleConnect(p.id)}
                    disabled={isConn}>
                    {isConn
                      ? <ActivityIndicator size="small" color={p.color} />
                      : <>
                          <MaterialIcons name="link" size={16} color={p.color} />
                          <Text style={[styles.connectBtnText, { color: p.color }]}>
                            CONECTAR
                          </Text>
                        </>
                    }
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      style={styles.syncBtn}
                      onPress={() => handleSync(p.id)}
                      disabled={isSync}>
                      {isSync
                        ? <ActivityIndicator size="small" color={palette.gold} />
                        : <>
                            <MaterialIcons name="sync" size={16} color={palette.gold} />
                            <Text style={styles.syncBtnText}>SINCRONIZAR</Text>
                          </>
                      }
                    </Pressable>
                    <Pressable
                      style={styles.disconnectBtn}
                      onPress={() => handleDisconnect(p.id)}>
                      <Text style={styles.disconnectText}>Desconectar</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </PremiumCard>
          );
        })
      )}

      {/* Privacy note */}
      <PremiumCard style={styles.privacyCard}>
        <MaterialIcons name="lock" size={16} color={palette.smoke} />
        <Text style={styles.privacyText}>
          Tus tokens OAuth se almacenan de forma encriptada y solo se usan para
          sincronizar datos. Nunca se comparten con terceros.
        </Text>
      </PremiumCard>

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
  backBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:     { ...typography.title, color: palette.ivory, fontSize: 18 },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderColor: palette.success,
  },
  successText: { ...typography.body, color: palette.success, flex: 1 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBannerBody:  { flex: 1 },
  infoBannerTitle: { ...typography.body, color: palette.ivory, fontWeight: '600', marginBottom: 4 },
  infoBannerSub:   { ...typography.caption, color: palette.smoke, lineHeight: 18 },

  deviceCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deviceInfo: { flex: 1 },
  deviceName: { ...typography.section, color: palette.ivory, fontSize: 14 },
  deviceSub:  { ...typography.caption, color: palette.smoke, marginTop: 2 },
  lastSync:   { ...typography.mono, color: palette.smoke, fontSize: 10, marginTop: 4 },

  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.successMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  connectedText: { ...typography.label, color: palette.success, fontSize: 10 },

  deviceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  connectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  connectBtnText: { ...typography.label, fontWeight: '700' },

  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  syncBtnText: { ...typography.label, color: palette.gold, fontWeight: '700' },

  disconnectBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: { ...typography.caption, color: palette.smoke },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  privacyText: { ...typography.caption, color: palette.smoke, flex: 1, lineHeight: 18 },
});
