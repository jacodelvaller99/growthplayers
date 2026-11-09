/**
 * app/perfil/wearables.tsx
 *
 * "Tu reloj": conexión de wearables, en la gramática del rediseño — una sola
 * acción amarilla (sincronizar el conectado), el resto en filas, estado honesto.
 *
 * OAuth Flow:
 *  WEB  → window.location.href = url  →  WHOOP/Oura auth page
 *         → redirect back to /oauth/whoop/callback?code=...
 *         → callback page calls edge fn & redirects here with ?connected=whoop
 *  NATIVE → WebBrowser.openAuthSessionAsync → in-app browser
 *           → code extracted → edge fn called → reload
 */

import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/confirm';
import {
  OAUTH_URLS,
  isNativeProvider,
  isAggregatorProvider,
  triggerWearableSync,
  disconnectWearable,
  useWearableConnections,
  useWearableDaily,
  type WearableProvider,
} from '@/lib/wearables';
import { connectAggregator, disconnectAggregator } from '@/lib/wearableAggregator';
import { requestNativePermissions, syncRange, disconnectNative, nativeProviderForPlatform } from '@/lib/wearablesNative';
import { WearableCompat } from '@/components/wearable-compat';
import { ENV } from '@/app/config/env';

const PROVIDER_NAME: Record<WearableProvider, string> = {
  whoop:          'WHOOP',
  oura:           'Oura Ring',
  polar:          'Polar',
  strava:         'Strava',
  apple_health:   'Apple Health',
  health_connect: 'Google Health Connect',
  aggregator:     'Cualquier reloj',
};

// Marcas cloud que cubre Open Wearables vía OAuth (modo self-host). El connect es
// POR proveedor (aún no hay widget multi-marca hosteado), así que la UI ofrece elegir.
//
// `gated` marca las que NO son self-service: su API exige aprobación comercial o
// contrato firmado con el fabricante (verificado 2026-07): Garmin tiene el developer
// program SUSPENDIDO y exige entidad legal; Suunto pide acuerdo firmado y no admite
// uso personal; Ultrahuman requiere cuenta Ring Air. Se listan al final y avisadas,
// porque solo funcionan si el dueño ya obtuvo esas credenciales — hacer clic sin
// ellas devuelve error del backend. Fitbit queda FUERA: su Web API se apaga el
// 2026-09-30 (migración forzada a Google Health con re-consentimiento de todos los
// usuarios) — no vale la pena que un cliente conecte algo que muere en semanas.
// Withings tampoco aparece: Open Wearables no lo cubre en su matriz oficial.
// Polar y Strava salieron de esta lista: ahora tienen tarjeta OAuth directa
// propia (ver ALL_PROVIDERS) que no depende de ningún vendor externo — dejarlos
// aquí también habría creado dos botones "Polar" con dos caminos distintos.
const OW_PROVIDERS: { id: string; label: string; gated?: boolean }[] = [
  { id: 'whoop',      label: 'WHOOP' },
  { id: 'oura',       label: 'Oura' },
  { id: 'garmin',     label: 'Garmin',     gated: true },
  { id: 'suunto',     label: 'Suunto',     gated: true },
  { id: 'ultrahuman', label: 'Ultrahuman', gated: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateState(): string {
  return Math.random().toString(36).substring(2, 18);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "hoy", "ayer", "hace 7 días" — fecha ISO (día o timestamp). */
function haceCuanto(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / DAY_MS);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

// ─── Provider metadata ────────────────────────────────────────────────────────
type ProviderMeta = {
  id: WearableProvider;
  name: string;
  /** Si está definido, solo se muestra en esa plataforma. */
  platform?: 'ios' | 'android';
};

const ALL_PROVIDERS: ProviderMeta[] = [
  { id: 'aggregator',     name: 'Cualquier reloj' },
  { id: 'apple_health',   name: 'Apple Health', platform: 'ios' },
  { id: 'health_connect', name: 'Google Health Connect', platform: 'android' },
  { id: 'whoop',          name: 'WHOOP' },
  { id: 'oura',           name: 'Oura Ring' },
  { id: 'polar',          name: 'Polar' },
  { id: 'strava',         name: 'Strava' },
];

function visibleProviders(): ProviderMeta[] {
  return ALL_PROVIDERS.filter((p) => {
    // El agregador solo se ofrece si está provisionado: sin infraestructura
    // detrás siempre acababa en "Integración en activación".
    if (p.id === 'aggregator' && !ENV.aggregatorEnabled) return false;
    if (!p.platform) return true;
    return Platform.OS === p.platform;
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WearablesScreen() {
  const params  = useLocalSearchParams<{ connected?: string; error?: string }>();

  const { loading, isConnected, getConnection, staleConnections, reload } = useWearableConnections();
  const { data: daily } = useWearableDaily(7);
  const [connecting, setConnecting] = useState<WearableProvider | null>(null);
  const [syncing,    setSyncing]    = useState<WearableProvider | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [owPickerOpen, setOwPickerOpen] = useState(false);

  // El hook solo recarga al montar. Si el usuario deja esta pantalla abierta
  // (o vuelve a ella tras un rato) y su conexión se cayó por fuera —circuit
  // breaker, revocación manual desde el proveedor, un intento anterior que sí
  // funcionó pero la vista nunca se refrescó—, la tarjeta seguía mostrando
  // "conectado" indefinidamente y cada Desconectar chocaba contra una fila que
  // ya no existe ("Connection not found"), sin forma de que el usuario lo notara.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  // Handle OAuth callback params (?connected=whoop or ?error=...)
  useEffect(() => {
    if (params.connected) {
      const name = params.connected === 'aggregator' ? 'Tu reloj'
        : PROVIDER_NAME[params.connected as WearableProvider] ?? 'Tu dispositivo';
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
        // {activate:true}: SOLO el connect explícito (re)activa la conexión —
        // el botón de sync no, para no revertir una desconexión (bug previo).
        const sync = await syncRange(30, { activate: true });
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

    // Confirmación antes de una acción destructiva: se revoca el acceso y se
    // borra el histórico sincronizado de ese dispositivo (la promesa de la UI).
    showAlert(
      'Desconectar dispositivo',
      `Se cerrará la conexión con ${PROVIDER_NAME[provider]} y se borrará tu histórico sincronizado de este dispositivo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar', style: 'destructive',
          onPress: async () => {
            let ok = false;
            let err: string | undefined;

            if (isNativeProvider(provider)) {
              const res = await disconnectNative();
              ok = res.ok;
              if (!res.ok) err = res.message;
            } else if (isAggregatorProvider(provider)) {
              const res = await disconnectAggregator();
              ok = res.ok;
              err = res.error;
            } else {
              const res = await disconnectWearable(provider);
              ok = res.success;
              err = res.error;
            }

            // "Connection not found" es el mensaje literal y fijo que devuelve
            // sync-wearables cuando la fila ya no existe — no un error real: el
            // estado que el usuario quería (desconectado) ya es el actual. Sin
            // esto, una conexión caída por fuera (revocada en el proveedor, o un
            // intento previo que sí funcionó pero la pantalla no se refrescó)
            // dejaba al usuario atrapado viendo "No se pudo desconectar" para
            // siempre, sin ninguna acción que se lo resolviera.
            const alreadyGone = err === 'Connection not found';

            await reload();
            if (ok || alreadyGone) {
              const tail = provider === 'apple_health'
                ? ' — para revocar el permiso de lectura, ve a Ajustes › Salud'
                : '';
              setBanner({ type: 'success', msg: `${PROVIDER_NAME[provider]} desconectado y datos borrados${tail}` });
            } else {
              setBanner({ type: 'error', msg: err ?? 'No se pudo desconectar — inténtalo de nuevo' });
            }
          },
        },
      ],
    );
  }

  // Selector de marca (solo modo self-host / Open Wearables).
  const owPicker = (
    <Modal visible={owPickerOpen} transparent animationType="fade" onRequestClose={() => setOwPickerOpen(false)}>
      <Pressable style={styles.owBackdrop} onPress={() => setOwPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar selector">
        <Pressable style={styles.owSheet} onPress={() => {}}>
          <Text style={styles.owSheetTitle}>ELIGE TU RELOJ</Text>
          <Text style={styles.owSheetSub}>
            Conexión vía tu agregador self-host (Open Wearables). Cada marca abre su propio inicio de sesión.
          </Text>
          <View style={styles.owGrid}>
            {OW_PROVIDERS.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.owChip, b.gated && styles.owChipGated]}
                onPress={() => connectOwBrand(b.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  b.gated
                    ? `Conectar ${b.label} — requiere que el fabricante apruebe el acceso`
                    : `Conectar ${b.label}`
                }>
                <Text style={[styles.owChipText, b.gated && styles.owChipTextGated]}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
          {/* Honestidad: estas marcas exigen aprobación comercial del fabricante,
              así que pueden no estar disponibles todavía. Mejor decirlo antes del
              clic que devolver un error opaco después. */}
          <Text style={styles.owGatedNote}>
            Garmin, Suunto y Ultrahuman dependen de que el fabricante apruebe el acceso — puede que aún no estén listas.
          </Text>
          <Pressable style={styles.owCancel} onPress={() => setOwPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={styles.owCancelText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const PROVIDERS = visibleProviders();
  const connected = PROVIDERS.filter((p) => isConnected(p.id));
  const main = connected[0] ?? null;

  /** Estado honesto: "Conectado" solo dice algo si hay datos recientes. */
  function estado(p: ProviderMeta): { text: string; warn: boolean } {
    const last = daily?.find((d) => d.provider === p.id)?.date ?? null;
    if (last) return { text: `Conectado · últimos datos ${haceCuanto(last)}`, warn: false };
    const sync = haceCuanto(getConnection(p.id)?.last_synced_at ?? null);
    return {
      text: sync ? 'Conectado · sin datos en los últimos 7 días' : 'Conectado · todavía sin datos',
      warn: true,
    };
  }

  const mainEstado = main ? estado(main) : null;

  // Una sola acción amarilla: sincronizar el reloj conectado. Sin reloj, la
  // conexión nativa del teléfono (si existe); si no, todo va en filas.
  const nativeFirst = PROVIDERS.find((p) => p.platform);
  const hero = main ? (
    <TarjetaOro
      meta={main.name.toUpperCase()}
      title={syncing === main.id ? 'Sincronizando…' : 'Sincronizar ahora'}
      detail="Trae lo último que registró tu reloj."
      onPress={() => { if (!syncing) void handleSync(main.id); }}
    />
  ) : nativeFirst ? (
    <TarjetaOro
      meta="EN ESTE TELÉFONO"
      title={connecting === nativeFirst.id ? 'Conectando…' : `Conectar ${nativeFirst.name}`}
      detail={nativeFirst.id === 'apple_health'
        ? 'Usa HealthKit para leer tu sueño, pulso y actividad desde la app Salud.'
        : 'Lee tu reloj desde la app de salud del teléfono.'}
      onPress={() => { if (!connecting) void handleConnect(nativeFirst.id); }}
    />
  ) : undefined;

  const bannerTone =
    banner?.type === 'success' ? palette.success
    : banner?.type === 'error' ? palette.dangerText
    : palette.goldText;

  return (
    <>
      <Pantalla
        meta="TU RELOJ"
        // Mismo titular que /bienestar/biometrics: "conectado" sin datos sonaba a que todo iba bien.
        title={main ? (mainEstado?.warn ? `Tu ${main.name} no ha enviado datos.` : `${main.name} conectado.`) : 'Conecta tu reloj.'}
        sub={mainEstado
          ? `${mainEstado.text}. Se sincroniza una vez al día; puedes forzarlo aquí.`
          : 'Tu sueño y tu pulso le dicen a Norman cómo estás de verdad. Se sincroniza una vez al día.'}
        hero={hero}
        footer={
          <View style={styles.footer}>
            {Platform.OS === 'web' && !nativeProviderForPlatform() && (
              <Text style={styles.note}>
                Apple Watch y los relojes de Google Health Connect se conectan desde la app móvil de Polaris (iOS o Android).
              </Text>
            )}
            {/* App Review 2.5.1: el uso de HealthKit se identifica en la interfaz. */}
            {Platform.OS === 'ios' && (
              <View style={styles.health}>
                <Text style={styles.healthTitle}>APPLE HEALTH · HEALTHKIT</Text>
                <Text style={styles.healthText}>
                  Polaris usa HealthKit para leer, desde la app Salud de Apple y solo con tu permiso:
                  sueño, frecuencia cardíaca, variabilidad cardíaca (HRV), pulso en reposo, pasos,
                  energía activa, oxígeno en sangre, frecuencia respiratoria y temperatura corporal.
                  Con eso calculamos tu recuperación y Norman adapta su acompañamiento. Polaris no
                  escribe en Salud, y tus datos de salud no se usan para publicidad ni se comparten
                  con terceros. Cambia los permisos en Ajustes › Salud › Acceso a datos y dispositivos.
                </Text>
              </View>
            )}
            <WearableCompat />
            {/* Antes decía "se almacenan cifrados" — no era cierto a nivel de columna
                (P1-7). Se describe la protección que SÍ existe: RLS owner-only + TLS. */}
            <Text style={styles.note}>
              Los permisos de tu reloj quedan ligados a tu cuenta: solo tú puedes leerlos, viajan
              siempre por conexión cifrada y nunca se comparten con terceros. Al desconectar,
              revocamos el acceso ante el proveedor y borramos tu histórico de ese dispositivo.
            </Text>
          </View>
        }>
        {banner && (
          <Pressable
            style={styles.banner}
            onPress={() => setBanner(null)}
            accessibilityRole="button"
            accessibilityLabel={`${banner.msg}. Toca para descartar`}
            accessibilityLiveRegion={banner.type === 'error' ? 'assertive' : 'polite'}>
            <Text style={[styles.bannerText, { color: bannerTone }]}>{banner.msg}</Text>
          </Pressable>
        )}

        {loading ? (
          <Text style={styles.note}>Cargando conexiones…</Text>
        ) : (
          PROVIDERS.map((p, i) => {
            const last = i === PROVIDERS.length - 1;
            if (isConnected(p.id)) {
              const e = estado(p);
              return (
                <View key={p.id}>
                  {/* N-22: el estado va neutro; el amarillo es de «Sincronizar ahora». */}
                  <Fila label={p.name.toUpperCase()} value={e.text} />
                  <Pressable
                    onPress={() => handleDisconnect(p.id)}
                    style={styles.quiet}
                    accessibilityRole="button"
                    accessibilityLabel={`Desconectar ${p.name}`}>
                    <Text style={styles.quietText}>Desconectar {p.name}</Text>
                  </Pressable>
                </View>
              );
            }
            // Conexión matada por el circuit breaker (token revocado / fallos seguidos).
            const stale = staleConnections.some((c) => c.provider === p.id);
            return (
              <Fila
                key={p.id}
                label={p.name.toUpperCase()}
                value={connecting === p.id ? 'Conectando…' : stale ? 'Conexión caducada · volver a conectar' : 'Conectar'}
                onPress={connecting ? undefined : () => handleConnect(p.id)}
                last={last}
              />
            );
          })
        )}
      </Pantalla>
      {owPicker}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  footer: { gap: spacing.lg },
  note: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: palette.smoke },
  health: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: palette.line },
  healthTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },
  healthText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ivory },
  banner: { minHeight: 44, justifyContent: 'center', marginBottom: spacing.sm },
  bannerText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21 },
  quiet: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  quietText: { fontFamily: Fonts.sans, fontSize: 14, color: palette.smoke },

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
  // Marcas tras aprobación del fabricante: mismo tamaño de toque, jerarquía menor
  // (borde/fondo neutros) para que se lean como "quizá aún no", sin deshabilitarlas
  // — si el dueño ya consiguió las credenciales, deben poder usarse.
  owChipGated: { borderColor: palette.line, backgroundColor: palette.graphite },
  owChipTextGated: { color: palette.smoke },
  owGatedNote: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  owCancel: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs, minHeight: 44, justifyContent: 'center' },
  owCancelText: { ...typography.caption, color: palette.smoke, fontSize: 13 },
});
