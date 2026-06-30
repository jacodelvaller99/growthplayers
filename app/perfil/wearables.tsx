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
  Alert,
  Linking,
  Modal,
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
  isNativeProvider,
  isAggregatorProvider,
  triggerWearableSync,
  useWearableConnections,
  useWearableDaily,
  recoveryLabel,
  type WearableProvider,
} from '@/lib/wearables';
import { connectAggregator } from '@/lib/wearableAggregator';
import { requestNativePermissions, syncRange, nativeProviderForPlatform } from '@/lib/wearablesNative';
import { WearableCompat } from '@/components/wearable-compat';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ENV } from '@/app/config/env';

const PROVIDER_NAME: Record<WearableProvider, string> = {
  whoop:          'WHOOP',
  oura:           'Oura Ring',
  apple_health:   'Apple Salud',
  health_connect: 'Google Health Connect',
  aggregator:     'Cualquier reloj',
};

// Marcas cloud que cubre Open Wearables vía OAuth (modo self-host). El connect es
// POR proveedor (aún no hay widget multi-marca hosteado), así que la UI ofrece elegir.
const OW_PROVIDERS: { id: string; label: string }[] = [
  { id: 'garmin',     label: 'Garmin' },
  { id: 'oura',       label: 'Oura' },
  { id: 'whoop',      label: 'WHOOP' },
  { id: 'polar',      label: 'Polar' },
  { id: 'suunto',     label: 'Suunto' },
  { id: 'fitbit',     label: 'Fitbit' },
  { id: 'strava',     label: 'Strava' },
  { id: 'ultrahuman', label: 'Ultrahuman' },
];

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
type ProviderMeta = {
  id: WearableProvider;
  name: string;
  subtitle: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  metrics: string[];
  /** Si está definido, la tarjeta solo se muestra en esa plataforma. */
  platform?: 'ios' | 'android';
};

const ALL_PROVIDERS: ProviderMeta[] = [
  {
    id:          'aggregator',
    name:        'Cualquier reloj',
    subtitle:    'Garmin · Polar · Coros · Fitbit · Withings · Suunto +500',
    description: 'Una sola conexión para casi cualquier reloj o app de salud — sin importar la marca. Funciona también desde el navegador. Elige tu dispositivo y autoriza; tus métricas llegan a Norman automáticamente.',
    icon:        'watch',
    metrics:     ['Sueño', 'HRV', 'FC Reposo', 'Recuperación'],
  },
  {
    id:          'apple_health',
    name:        'Apple Salud',
    subtitle:    'Apple Watch + cualquier reloj compatible',
    description: 'Lee sueño, recuperación, HRV, FC y actividad de tu Apple Watch — y de cualquier reloj que sincronice con la app Salud (Garmin, Polar, Coros, Whoop, Oura, etc.).',
    icon:        'favorite',
    metrics:     ['Sueño', 'HRV', 'FC Reposo', 'Actividad'],
    platform:    'ios',
  },
  {
    id:          'health_connect',
    name:        'Google Health Connect',
    subtitle:    'Galaxy · Fitbit · Garmin · Polar · Wear OS',
    description: 'Lee tus métricas desde Health Connect — el agregador de Android. Cualquier reloj o app de salud que escriba ahí queda disponible para Norman.',
    icon:        'health-and-safety',
    metrics:     ['Sueño', 'HRV', 'FC Reposo', 'Pasos'],
    platform:    'android',
  },
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
    description: 'El anillo Oura mide readiness, calidad de sueño y frecuencia cardíaca en reposo con alta precisión para dispositivos de consumo.',
    icon:        'circle',
    metrics:     ['Readiness', 'HRV', 'Sueño', 'FC Reposo'],
  },
];

function visibleProviders(): ProviderMeta[] {
  return ALL_PROVIDERS.filter((p) => {
    if (!p.platform) return true;
    return Platform.OS === p.platform;
  });
}

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
    backgroundColor: palette.black,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.graphiteLight,
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
  track: { height: 3, backgroundColor: palette.graphite, borderRadius: 2, overflow: 'hidden', width: '100%' },
  fill:  { height: '100%', borderRadius: 2 },
});

// ─── Connected Device Card ────────────────────────────────────────────────────
function ConnectedCard({
  provider, conn, onSync, onDisconnect, isSyncing,
}: {
  provider: ProviderMeta;
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
            ? <ActivityIndicator size="small" color={palette.goldText} />
            : <>
                <MaterialIcons name="sync" size={15} color={palette.goldText} />
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
    backgroundColor: palette.graphite,
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
    backgroundColor: palette.black,
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
  syncText:       { ...typography.label, color: palette.goldText, fontWeight: '700', fontSize: 11 },
  disconnectBtn:  { paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center' },
  disconnectText: { ...typography.caption, color: palette.smoke },
});

// ─── Disconnected Device Card ─────────────────────────────────────────────────
function DisconnectedCard({
  provider, onConnect, isConnecting,
}: {
  provider: ProviderMeta;
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
          ? <ActivityIndicator size="small" color={palette.ink} />
          : <>
              <MaterialIcons name="link" size={18} color={palette.ink} />
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
    backgroundColor: palette.graphite,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: { ...typography.section, color: palette.ash, fontSize: 15 },
  sub:  { ...typography.mono,    color: palette.smoke, fontSize: 10, marginTop: 2 },
  offBadge: {
    backgroundColor: palette.graphite,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.sm,
  },
  offText: { ...typography.label, color: palette.smoke, fontSize: 9 },
  description: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: palette.graphite,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.charcoal,
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
    color: palette.ink,
    letterSpacing: 1,
  },
});

// ─── Hero Card (agregador universal — "Cualquier reloj") ──────────────────────
// El agregador (Terra) es el camino recomendado: una sola conexión, cualquier
// marca, funciona en navegador. Por eso se destaca como héroe arriba del resto.
const HERO_BRANDS = ['Garmin', 'Polar', 'Coros', 'Apple', 'Oura', 'Fitbit', 'Withings', 'Samsung'];

function AggregatorHeroCard({
  provider, onConnect, isConnecting,
}: {
  provider: ProviderMeta;
  onConnect: () => void;
  isConnecting: boolean;
}) {
  return (
    <PremiumCard style={heroStyles.card}>
      <View style={heroStyles.ribbon}>
        <MaterialIcons name="star" size={12} color={palette.ink} />
        <Text style={heroStyles.ribbonText}>RECOMENDADO</Text>
      </View>

      <View style={heroStyles.header}>
        <View style={heroStyles.iconWrap}>
          <MaterialIcons name="watch" size={26} color={palette.gold} />
        </View>
        <View style={heroStyles.info}>
          <Text style={heroStyles.name}>{provider.name}</Text>
          <Text style={heroStyles.sub}>Una conexión · cualquier marca · también en web</Text>
        </View>
      </View>

      <Text style={heroStyles.description}>{provider.description}</Text>

      {/* Cobertura de marcas */}
      <View style={heroStyles.brandRow}>
        {HERO_BRANDS.map((b) => (
          <View key={b} style={heroStyles.brandChip}>
            <Text style={heroStyles.brandText}>{b}</Text>
          </View>
        ))}
        <View style={[heroStyles.brandChip, heroStyles.brandChipMore]}>
          <Text style={[heroStyles.brandText, heroStyles.brandTextMore]}>+500 dispositivos</Text>
        </View>
      </View>

      <Pressable
        style={[heroStyles.connectBtn, isConnecting && { opacity: 0.6 }]}
        onPress={onConnect}
        disabled={isConnecting}
        accessibilityRole="button"
        accessibilityLabel={`Conectar ${provider.name}`}>
        {isConnecting
          ? <ActivityIndicator size="small" color={palette.ink} />
          : <>
              <MaterialIcons name="link" size={18} color={palette.ink} />
              <Text style={heroStyles.connectText}>CONECTAR MI DISPOSITIVO</Text>
            </>
        }
      </Pressable>
    </PremiumCard>
  );
}

const heroStyles = StyleSheet.create({
  card: { gap: spacing.md, borderWidth: 1, borderColor: palette.lineGold, backgroundColor: palette.goldGlow },
  ribbon: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radii.sm,
  },
  ribbonText: { fontFamily: Fonts.display, color: palette.ink, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 52, height: 52,
    borderRadius: radii.md,
    backgroundColor: palette.black,
    borderWidth: 1, borderColor: palette.lineGold,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: { ...typography.section, color: palette.ivory, fontSize: 18 },
  sub:  { ...typography.mono, color: palette.goldText, fontSize: 10, marginTop: 3, letterSpacing: 0.5 },
  description: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 20 },
  brandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  brandChip: {
    backgroundColor: palette.black,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderWidth: 1, borderColor: palette.charcoal,
  },
  brandChipMore: { borderColor: palette.lineGold, backgroundColor: palette.goldGlow },
  brandText: { ...typography.mono, color: palette.ash, fontSize: 10 },
  brandTextMore: { color: palette.goldText },
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
    color: palette.ink,
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
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [owPickerOpen, setOwPickerOpen] = useState(false);

  // Handle OAuth callback params (?connected=whoop or ?error=...)
  useEffect(() => {
    if (params.connected) {
      const name = params.connected === 'whoop' ? 'WHOOP'
        : params.connected === 'aggregator' ? 'Tu reloj'
        : 'Oura Ring';
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

    // ── Agregador universal ────────────────────────────────────────────────
    if (isAggregatorProvider(provider)) {
      // Self-host (Open Wearables): el connect es OAuth por marca → abre selector.
      if (ENV.aggregatorVendor === 'open_wearables') {
        setOwPickerOpen(true);
        return;
      }
      // Terra: widget multi-marca hosteado, funciona en web.
      setConnecting(provider);
      // "conectando…" honesto: en web la página se redirige, así que el banner
      // queda visible hasta que el navegador cambia de URL.
      setBanner({ type: 'info', msg: 'Conectando… abriendo tu dispositivo' });
      try {
        const res = await connectAggregator();
        if (!res.ok) {
          if (res.notConfigured) {
            // El backend respondió pero faltan los secrets del agregador.
            // Honesto: la integración existe, está en activación — NO afirmamos
            // que ya funciona ni mostramos un error crudo.
            setBanner({
              type: 'info',
              msg: res.error ?? 'Integración en activación — disponible muy pronto.',
            });
          } else {
            setBanner({ type: 'error', msg: res.error ?? 'No se pudo conectar' });
          }
        }
        // En web se redirige la página (si res.ok); en nativo el browser maneja
        // el retorno. El webhook del agregador vincula la cuenta y empuja los datos.
        await reload();
      } finally {
        setConnecting(null);
      }
      return;
    }

    // ── Nativos (HealthKit / Health Connect): permisos del SO + sync local ──
    if (isNativeProvider(provider)) {
      if (Platform.OS === 'web') {
        setBanner({ type: 'error', msg: `${PROVIDER_NAME[provider]} solo está disponible en la app móvil` });
        return;
      }
      setConnecting(provider);
      try {
        const perm = await requestNativePermissions();
        if (!perm.ok) {
          if (perm.reason === 'permission_denied') {
            // Sin salida sería un loop: guiamos a Ajustes del SO para habilitar.
            const settingsLabel = Platform.OS === 'ios' ? 'Ajustes › Salud' : 'Ajustes › Apps › Polaris › Permisos';
            setBanner({ type: 'error', msg: `Permisos no concedidos. Habilítalos en ${settingsLabel}.` });
            Alert.alert(
              'Permisos de salud',
              `Para conectar ${PROVIDER_NAME[provider]} necesitamos permiso de lectura. Habilítalo en ${settingsLabel}.`,
              [
                { text: 'Ahora no', style: 'cancel' },
                { text: 'Abrir Ajustes', onPress: () => { Linking.openSettings().catch(() => {}); } },
              ],
            );
          } else {
            setBanner({ type: 'error', msg: perm.message ?? 'Error de conexión' });
          }
          return;
        }
        const sync = await syncRange(30);
        if (sync.ok) {
          setBanner({ type: 'success', msg: `${PROVIDER_NAME[provider]} conectado · ${sync.value.daysWritten} días leídos` });
          await reload();
        } else {
          setBanner({ type: 'error', msg: sync.message ?? 'Error al leer datos' });
        }
      } finally {
        setConnecting(null);
      }
      return;
    }

    // ── OAuth providers (Oura / WHOOP) ─────────────────────────────────────
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
      // El return scheme debe coincidir con `scheme` en app.json ("polaris"),
      // o en nativo el navegador no devuelve el control a la app tras el OAuth.
      const result = await WebBrowser.openAuthSessionAsync(url, 'polaris://oauth');

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

          setBanner({ type: 'success', msg: `${PROVIDER_NAME[provider]} conectado ✓` });
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

  // Conecta una marca específica vía Open Wearables (modo self-host, OAuth por marca).
  async function connectOwBrand(brand: string) {
    setOwPickerOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting('aggregator');
    setBanner({ type: 'info', msg: 'Conectando…' });
    try {
      const res = await connectAggregator(brand);
      if (!res.ok) {
        setBanner(
          res.notConfigured
            ? { type: 'info', msg: res.error ?? 'Integración en activación — disponible muy pronto.' }
            : { type: 'error', msg: res.error ?? 'No se pudo conectar' },
        );
      }
      await reload();
    } finally {
      setConnecting(null);
    }
  }

  async function handleSync(provider: WearableProvider) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncing(provider);

    // Nativos: leen del SO directamente, no llaman a la edge function.
    if (isNativeProvider(provider)) {
      const sync = await syncRange(7);
      if (sync.ok) {
        setBanner({ type: 'success', msg: `Sincronizado · ${sync.value.daysWritten} días ✓` });
      } else {
        setBanner({ type: 'error', msg: sync.message ?? 'Error al sincronizar' });
      }
      await reload();
      setSyncing(null);
      return;
    }

    // Agregador: el dato llega por webhook (push). No hay pull manual — refrescamos.
    if (isAggregatorProvider(provider)) {
      await reload();
      setBanner({ type: 'success', msg: 'Tus datos se actualizan automáticamente cuando tu reloj sincroniza' });
      setSyncing(null);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSyncing(null); return; }

    const { success, error } = await triggerWearableSync(session.user.id, provider);
    if (success) {
      // Honesto: el sync corre en el servidor; los datos aparecen en unos segundos.
      // No afirmamos "completa" porque la escritura puede no haber aterrizado aún.
      setBanner({ type: 'success', msg: 'Sincronización en curso — tus métricas se actualizan en breve' });
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
    const tail = isNativeProvider(provider)
      ? ' — para revocar permisos del sistema, ve a Ajustes del dispositivo'
      : '';
    setBanner({ type: 'success', msg: `${PROVIDER_NAME[provider]} desconectado${tail}` });
  }

  const PROVIDERS = visibleProviders();
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
      {banner && (() => {
        const tone =
          banner.type === 'success' ? palette.success
          : banner.type === 'error' ? palette.danger
          : palette.goldText;
        const bannerStyle =
          banner.type === 'success' ? styles.bannerSuccess
          : banner.type === 'error' ? styles.bannerError
          : styles.bannerInfo;
        const icon =
          banner.type === 'success' ? 'check-circle'
          : banner.type === 'error' ? 'error-outline'
          : 'info-outline';
        return (
          <Pressable style={[styles.banner, bannerStyle]} onPress={() => setBanner(null)}>
            <MaterialIcons name={icon} size={18} color={tone} />
            <Text style={[styles.bannerText, { color: tone }]}>{banner.msg}</Text>
            <MaterialIcons name="close" size={15} color={palette.smoke} />
          </Pressable>
        );
      })()}

      {/* Info card */}
      <PremiumCard style={styles.infoCard}>
        <MaterialIcons name="monitor-heart" size={28} color={palette.goldText} />
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
          <ActivityIndicator size="large" color={palette.goldText} />
          <Text style={styles.loadingText}>Cargando conexiones...</Text>
        </View>
      ) : (
        PROVIDERS.map((p) => {
          const connected = isConnected(p.id);
          const conn      = getConnection(p.id);

          if (connected) {
            return (
              <ConnectedCard
                key={p.id}
                provider={p}
                conn={conn}
                onSync={() => handleSync(p.id)}
                onDisconnect={() => handleDisconnect(p.id)}
                isSyncing={syncing === p.id}
              />
            );
          }
          // El agregador universal se destaca como héroe (camino recomendado).
          if (p.id === 'aggregator') {
            return (
              <AggregatorHeroCard
                key={p.id}
                provider={p}
                onConnect={() => handleConnect(p.id)}
                isConnecting={connecting === p.id}
              />
            );
          }
          return (
            <DisconnectedCard
              key={p.id}
              provider={p}
              onConnect={() => handleConnect(p.id)}
              isConnecting={connecting === p.id}
            />
          );
        })
      )}

      {/* Web hint: nativos no disponibles en PWA */}
      {Platform.OS === 'web' && !nativeProviderForPlatform() && (
        <PremiumCard style={styles.privacyCard}>
          <MaterialIcons name="phone-iphone" size={15} color={palette.smoke} />
          <Text style={styles.privacyText}>
            Para conectar Apple Watch o cualquier reloj vía Google Health Connect, descarga la app móvil de Polaris en iOS o Android. La PWA web solo admite Oura y WHOOP por OAuth.
          </Text>
        </PremiumCard>
      )}

      {/* Compatibility catalog */}
      <WearableCompat />

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

  // Selector de marca (solo modo self-host / Open Wearables).
  const owPicker = (
    <Modal visible={owPickerOpen} transparent animationType="fade" onRequestClose={() => setOwPickerOpen(false)}>
      <Pressable style={styles.owBackdrop} onPress={() => setOwPickerOpen(false)} accessibilityLabel="Cerrar selector">
        <Pressable style={styles.owSheet} onPress={() => {}}>
          <Text style={styles.owSheetTitle}>ELIGE TU RELOJ</Text>
          <Text style={styles.owSheetSub}>
            Conexión vía tu agregador self-host (Open Wearables). Cada marca abre su propio inicio de sesión.
          </Text>
          <View style={styles.owGrid}>
            {OW_PROVIDERS.map((b) => (
              <Pressable
                key={b.id}
                style={styles.owChip}
                onPress={() => connectOwBrand(b.id)}
                accessibilityRole="button"
                accessibilityLabel={`Conectar ${b.label}`}>
                <Text style={styles.owChipText}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.owCancel} onPress={() => setOwPickerOpen(false)}>
            <Text style={styles.owCancelText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <>
        <ScrollView
          style={sc.root}
          contentContainerStyle={styles.contentDesktop}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
        {owPicker}
      </>
    );
  }

  // ── Mobile ───────────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
      {owPicker}
    </>
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
  countText: { ...typography.label, color: palette.goldText, fontSize: 10 },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.sm,
  },
  bannerSuccess: { backgroundColor: 'rgba(100,200,100,0.08)', borderColor: palette.success + '44' },
  bannerError:   { backgroundColor: 'rgba(200,60,60,0.08)',   borderColor: palette.danger  + '44' },
  bannerInfo:    { backgroundColor: palette.goldGlow,         borderColor: palette.lineGold },
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

  // Selector de marca (Open Wearables self-host)
  owBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  owSheet: {
    width: '100%', maxWidth: 520,
    backgroundColor: palette.black, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg,
    borderWidth: 1, borderColor: palette.line,
    padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm,
  },
  owSheetTitle: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 14, letterSpacing: 1.4 },
  owSheetSub: { ...typography.caption, color: palette.smoke, fontSize: 12, lineHeight: 17, marginBottom: spacing.xs },
  owGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  owChip: {
    paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 44,
    borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold,
    backgroundColor: palette.goldGlow, justifyContent: 'center',
  },
  owChipText: { fontFamily: Fonts.display, color: palette.goldText, fontSize: 12, letterSpacing: 0.5 },
  owCancel: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs, minHeight: 44, justifyContent: 'center' },
  owCancelText: { ...typography.caption, color: palette.smoke, fontSize: 13 },
});
