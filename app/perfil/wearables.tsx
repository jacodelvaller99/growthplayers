/**
 * app/perfil/wearables.tsx
 *
 * Pantalla de conexión de dispositivos wearables (WHOOP + Oura Ring).
 *
 * OAuth Flow:
 *  WEB  → window.location.href = url  →  WHOOP/Oura auth page
 *         → redirect back to /oauth/whoop/callback?code=...
 *         → callback page calls edge fn & redirects here with ?connected=whoop
 *  NATIVE → WebBrowser.openAuthSessionAsync → in-app browser
 *           → code extracted → edge fn called → reload
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;
import {
  OAUTH_URLS,
  triggerWearableSync,
  useWearableConnections,
  useWearableDaily,
  recoveryLabel,
  type WearableProvider,
} from '@/lib/wearables';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateState(): string {
  return Math.random().toString(36).substring(2, 18);
}

function timeSince(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function scoreBar(value: number | null, max = 100) {
  if (value == null) return null;
  return Math.min(Math.round((value / max) * 100), 100);
}

// ─── Provider metadata ────────────────────────────────────────────────────────
const PROVIDERS: {
  id: WearableProvider;
  name: string;
  subtitle: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  metrics: string[];
}[] = [
  {
    id:          'whoop',
    name:        'WHOOP',
    subtitle:    'Recovery · Strain · Sueño · HRV',
    description: 'Conecta tu WHOOP para obtener scores de recuperación, HRV y carga de entrenamiento que Norman usa para personalizar tu protocolo.',
    icon:        'watch',
    metrics:     ['Recovery', 'HRV', 'Strain', 'Sueño'],
  },
  {
    id:          'oura',
    name:        'Oura Ring',
    subtitle:    'Readiness · Sueño · FC · HRV',
    description: 'El anillo Oura mide readiness, calidad de sueño y frecuencia cardíaca en reposo con alta precisión clínica.',
    icon:        'circle',
    metrics:     ['Readiness', 'HRV', 'Sueño', 'FC Reposo'],
  },
];

// ─── Metric chip ──────────────────────────────────────────────────────────────
function MetricChip({ label, value, unit, color }: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={metricStyles.chip}>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={[metricStyles.value, color ? { color } : null]}>
        {value != null ? `${Math.round(value)}${unit ?? ''}` : '—'}
      </Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    backgroundColor: '#0d0d0d',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  label: { ...typography.mono, color: palette.ash, fontSize: 9, letterSpacing: 1 },
  value: { ...typography.body, color: palette.ivory, fontWeight: '700', fontSize: 18 },
});

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ value, color }: { value: number | null; color: string }) {
  const pct = scoreBar(value) ?? 0;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 3, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden', width: '100%' },
  fill:  { height: '100%', borderRadius: 2 },
});

// ─── Connected Device Card ────────────────────────────────────────────────────
function ConnectedCard({
  provider, conn, onSync, onDisconnect, isSyncing,
}: {
  provider: typeof PROVIDERS[0];
  conn: ReturnType<ReturnType<typeof useWearableConnections>['getConnection']>;
  onSync: () => void;
  onDisconnect: () => void;
  isSyncing: boolean;
}) {
  const { today } = useWearableDaily(7);
  const rec   = today?.recovery_score ?? null;
  const hrv   = today?.hrv_ms ?? null;
  const sleep = today?.sleep_score ?? null;
  const strain = today?.strain_score ?? null;
  const rhr   = today?.resting_hr ?? null;

  const recColor = rec == null ? palette.smoke
    : rec >= 70 ? palette.success
    : rec >= 50 ? palette.gold
    : rec >= 30 ? palette.warning
    : palette.danger;

  return (
    <PremiumCard style={connStyles.card}>
      {/* Header */}
      <View style={connStyles.header}>
        <View style={connStyles.iconWrap}>
          <MaterialIcons name={provider.icon} size={24} color={palette.ivory} />
        </View>
        <View style={connStyles.info}>
          <Text style={connStyles.name}>{provider.name}</Text>
          <Text style={connStyles.sub}>{timeSince(conn?.last_synced_at ?? null)}</Text>
        </View>
        <View style={connStyles.activeBadge}>
          <View style={connStyles.activeDot} />
          <Text style={connStyles.activeText}>ACTIVO</Text>
        </View>
      </View>

      {/* Today's metrics */}
      {today && (
        <>
          <View style={connStyles.metricsRow}>
            {provider.id === 'whoop' ? (
              <>
                <MetricChip label="RECOVERY" value={rec} unit="%" color={recColor} />
                <MetricChip label="HRV"      value={hrv} unit="ms" />
                <MetricChip label="STRAIN"   value={strain} />
                <MetricChip label="SUEÑO"    value={sleep} unit="%" />
              </>
            ) : (
              <>
                <MetricChip label="READINESS" value={rec} unit="%" color={recColor} />
                <MetricChip label="HRV"       value={hrv} unit="ms" />
                <MetricChip label="FC REPOSO" value={rhr} unit=" bpm" />
                <MetricChip label="SUEÑO"     value={sleep} unit="%" />
              </>
            )}
          </View>

          {/* Recovery bar */}
          {rec != null && (
            <View style={connStyles.barWrap}>
              <Text style={connStyles.barLabel}>
                RECOVERY {Math.round(rec)}% · {recoveryLabel(rec)}
              </Text>
              <ScoreBar value={rec} color={recColor} />
            </View>
          )}
        </>
      )}

      {!today && (
        <View style={connStyles.noData}>
          <Text style={connStyles.noDataText}>Sin datos hoy — sincroniza para ver métricas</Text>
        </View>
      )}

      {/* Actions */}
      <View style={connStyles.actions}>
        <Pressable
          style={[connStyles.syncBtn, isSyncing && { opacity: 0.6 }]}
          onPress={onSync}
          disabled={isSyncing}
          accessibilityLabel={`Sincronizar ${provider.name}`}>
          {isSyncing
            ? <ActivityIndicator size="small" color={palette.gold} />
            : <>
                <MaterialIcons name="sync" size={15} color={palette.gold} />
                <Text style={connStyles.syncText}>SINCRONIZAR AHORA</Text>
              </>
          }
        </Pressable>
        <Pressable style={connStyles.disconnectBtn} onPress={onDisconnect} accessibilityLabel={`Desconectar ${provider.name}`}>
          <Text style={connStyles.disconnectText}>Desconectar</Text>
        </Pressable>
      </View>
    </PremiumCard>
  );
}

const connStyles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: { ...typography.section, color: palette.ivory, fontSize: 15 },
  sub:  { ...typography.mono,    color: palette.smoke, fontSize: 10, marginTop: 2 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(100,200,100,0.10)',
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.sm,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.success },
  activeText: { ...typography.label, color: palette.success, fontSize: 9 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  barWrap: { gap: 6 },
  barLabel: { ...typography.mono, color: palette.ash, fontSize: 10, letterSpacing: 1 },
  noData: {
    paddingVertical: spacing.md,
    backgroundColor: '#0d0d0d',
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  noDataText: { ...typography.caption, color: palette.smoke },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  syncBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderWidth: 1, borderColor: palette.gold,
    borderRadius: radii.sm, paddingVertical: spacing.md, minHeight: 44,
  },
  syncText:       { ...typography.label, color: palette.gold, fontWeight: '700', fontSize: 11 },
  disconnectBtn:  { paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center' },
  disconnectText: { ...typography.caption, color: palette.smoke },
});

// ─── Disconnected Device Card ─────────────────────────────────────────────────
function DisconnectedCard({
  provider, onConnect, isConnecting,
}: {
  provider: typeof PROVIDERS[0];
  onConnect: () => void;
  isConnecting: boolean;
}) {
  return (
    <PremiumCard style={discStyles.card}>
      <View style={discStyles.header}>
        <View style={discStyles.iconWrap}>
          <MaterialIcons name={provider.icon} size={24} color={palette.smoke} />
        </View>
        <View style={discStyles.info}>
          <Text style={discStyles.name}>{provider.name}</Text>
          <Text style={discStyles.sub}>{provider.subtitle}</Text>
        </View>
        <View style={discStyles.offBadge}>
          <Text style={discStyles.offText}>NO CONECTADO</Text>
        </View>
      </View>

      <Text style={discStyles.description}>{provider.description}</Text>

      {/* Metric tags */}
      <View style={discStyles.tags}>
        {provider.metrics.map(m => (
          <View key={m} style={discStyles.tag}>
            <Text style={discStyles.tagText}>{m}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={[discStyles.connectBtn, isConnecting && { opacity: 0.6 }]}
        onPress={onConnect}
        disabled={isConnecting}
        accessibilityRole="button"
        accessibilityLabel={`Conectar ${provider.name}`}>
        {isConnecting
          ? <ActivityIndicator size="small" color={palette.black} />
          : <>
              <MaterialIcons name="link" size={18} color={palette.black} />
              <Text style={discStyles.connectText}>
                CONECTAR {provider.name.toUpperCase()}
              </Text>
            </>
        }
      </Pressable>
    </PremiumCard>
  );
}

const discStyles = StyleSheet.create({
  card: { gap: spacing.md, opacity: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: { ...typography.section, color: palette.ash, fontSize: 15 },
  sub:  { ...typography.mono,    color: palette.smoke, fontSize: 10, marginTop: 2 },
  offBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.sm,
  },
  offText: { ...typography.label, color: palette.smoke, fontSize: 9 },
  description: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: '#111',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  tagText: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: palette.gold,
    borderRadius: radii.sm, paddingVertical: 14,
    minHeight: 48,
  },
  connectText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '800',
    color: palette.black,
    letterSpacing: 1,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WearablesScreen() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ connected?: string; error?: string }>();

  const { connections, loading, isConnected, getConnection, reload } = useWearableConnections();
  const [connecting, setConnecting] = useState<WearableProvider | null>(null);
  const [syncing,    setSyncing]    = useState<WearableProvider | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Handle OAuth callback params (?connected=whoop or ?error=...)
  useEffect(() => {
    if (params.connected) {
      const name = params.connected === 'whoop' ? 'WHOOP' : 'Oura Ring';
      setBanner({ type: 'success', msg: `${name} conectado exitosamente ✓` });
      reload();
      // Clean URL params
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/perfil/wearables');
      }
    }
    if (params.error) {
      const msgs: Record<string, string> = {
        denied:          'Autorización cancelada por el usuario',
        no_code:         'No se recibió código de autorización',
        exchange_failed: 'Error al intercambiar tokens. Intenta de nuevo.',
      };
      setBanner({ type: 'error', msg: msgs[params.error] ?? 'Error de conexión' });
    }
  }, [params.connected, params.error, reload]);

  async function handleConnect(provider: WearableProvider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const state = generateState();
    const url   = OAUTH_URLS[provider](state);

    // ── WEB: redirect full page → callback page handles the exchange ──────
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
      return;
    }

    // ── NATIVE: in-app browser ─────────────────────────────────────────────
    setConnecting(provider);
    try {
      const result = await WebBrowser.openAuthSessionAsync(url, 'growthplayers://oauth');

      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const code   = parsed.searchParams.get('code');

        if (code) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session');

          const { error } = await supabase.functions.invoke('sync-wearables', {
            body: { action: 'connect', provider, code },
          });
          if (error) throw new Error(error.message);

          const name = provider === 'whoop' ? 'WHOOP' : 'Oura Ring';
          setBanner({ type: 'success', msg: `${name} conectado ✓` });
          await reload();
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de conexión';
      setBanner({ type: 'error', msg });
    } finally {
      setConnecting(null);
    }
  }

  async function handleSync(provider: WearableProvider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncing(provider);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSyncing(null); return; }

    const { success, error } = await triggerWearableSync(session.user.id, provider);
    if (success) {
      setBanner({ type: 'success', msg: 'Sincronización completa ✓' });
    } else {
      setBanner({ type: 'error', msg: error ?? 'Error al sincronizar' });
    }
    await reload();
    setSyncing(null);
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
    setBanner({ type: 'success', msg: `${provider === 'whoop' ? 'WHOOP' : 'Oura Ring'} desconectado` });
  }

  const connectedCount = PROVIDERS.filter(p => isConnected(p.id)).length;

  const content = (
    <>
      {/* Top nav */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>DISPOSITIVOS</Text>
        <View style={styles.topRight}>
          {connectedCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{connectedCount} activo{connectedCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Banner */}
      {banner && (
        <Pressable
          style={[styles.banner, banner.type === 'success' ? styles.bannerSuccess : styles.bannerError]}
          onPress={() => setBanner(null)}>
          <MaterialIcons
            name={banner.type === 'success' ? 'check-circle' : 'error-outline'}
            size={18}
            color={banner.type === 'success' ? palette.success : palette.danger}
          />
          <Text style={[styles.bannerText, { color: banner.type === 'success' ? palette.success : palette.danger }]}>
            {banner.msg}
          </Text>
          <MaterialIcons name="close" size={15} color={palette.smoke} />
        </Pressable>
      )}

      {/* Info card */}
      <PremiumCard style={styles.infoCard}>
        <MaterialIcons name="monitor-heart" size={28} color={palette.gold} />
        <View style={styles.infoBody}>
          <Text style={styles.infoTitle}>BIOMETRÍA INTELIGENTE</Text>
          <Text style={styles.infoSub}>
            Tus datos biométricos alimentan a Norman directamente — recovery, HRV y sueño calibran
            el ritmo de tu protocolo y las recomendaciones de acción diaria.
          </Text>
        </View>
      </PremiumCard>

      <GoldDivider label="DISPOSITIVOS" />

      {/* Device list */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.gold} />
          <Text style={styles.loadingText}>Cargando conexiones...</Text>
        </View>
      ) : (
        PROVIDERS.map((p) => {
          const connected = isConnected(p.id);
          const conn      = getConnection(p.id);

          return connected ? (
            <ConnectedCard
              key={p.id}
              provider={p}
              conn={conn}
              onSync={() => handleSync(p.id)}
              onDisconnect={() => handleDisconnect(p.id)}
              isSyncing={syncing === p.id}
            />
          ) : (
            <DisconnectedCard
              key={p.id}
              provider={p}
              onConnect={() => handleConnect(p.id)}
              isConnecting={connecting === p.id}
            />
          );
        })
      )}

      {/* Privacy note */}
      <PremiumCard style={styles.privacyCard}>
        <MaterialIcons name="lock" size={15} color={palette.smoke} />
        <Text style={styles.privacyText}>
          Los tokens OAuth se almacenan cifrados en tu cuenta y nunca se comparten con terceros.
          Puedes desconectar cualquier dispositivo en cualquier momento.
        </Text>
      </PremiumCard>
    </>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={styles.contentDesktop}
        showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  // ── Mobile ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  contentDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
    gap: spacing.lg,
  },

  // Top nav
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:    { fontFamily: Fonts.display, fontSize: 18, fontWeight: '800', color: palette.ivory, letterSpacing: 2 },
  topRight: { width: 80, alignItems: 'flex-end' },
  countBadge: {
    backgroundColor: palette.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  countText: { ...typography.label, color: palette.gold, fontSize: 10 },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm,
  },
  bannerSuccess: { backgroundColor: 'rgba(100,200,100,0.08)', borderColor: palette.success + '44' },
  bannerError:   { backgroundColor: 'rgba(200,60,60,0.08)',   borderColor: palette.danger  + '44' },
  bannerText:    { ...typography.body, flex: 1, fontSize: 13 },

  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoBody:  { flex: 1 },
  infoTitle: { ...typography.section, color: palette.ivory, fontSize: 13, marginBottom: 6 },
  infoSub:   { ...typography.body,    color: palette.smoke, fontSize: 13, lineHeight: 20 },

  // Loading
  loadingWrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  loadingText: { ...typography.body, color: palette.smoke },

  // Privacy
  privacyCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md,
  },
  privacyText: { ...typography.caption, color: palette.smoke, flex: 1, lineHeight: 18 },
});
