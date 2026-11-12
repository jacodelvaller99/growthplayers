/**
 * Bienestar — "Tu reloj": lo que tu wearable dice de hoy.
 *
 * Gramática del rediseño: meta → titular que dice qué pasa → UNA acción
 * amarilla (conectar o sincronizar) → filas. Cada estado dice la verdad:
 * sin reloj, reloj sin datos (con la fecha real del último envío) o datos —
 * y si los datos no son de hoy, se dice de qué día son.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fuentes } from '@/components/Fuentes';
import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { Fonts, palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  hrvToNormanLanguage,
  recoveryLabel,
  triggerWearableSync,
  useWearableConnections,
  useWearableDaily,
  type WearableProvider,
} from '@/lib/wearables';

const PROVIDER_NAME: Record<WearableProvider, string> = {
  oura: 'Oura', whoop: 'WHOOP', polar: 'Polar', strava: 'Strava',
  apple_health: 'Apple Health', health_connect: 'Health Connect', aggregator: 'Tu reloj',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "hoy", "ayer", "hace 7 días" — a partir de una fecha ISO. */
function haceCuanto(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const t = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now - t) / DAY_MS);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

const DISCLAIMER = 'Datos de tu reloj para tu bienestar. No son diagnóstico ni consejo médico.';

function BiometricsBody({ onSynced }: { onSynced: () => void }) {
  const router = useRouter();
  const { userId } = useLifeFlow();
  const { connections, loading: connLoading } = useWearableConnections();
  const { data: dailyData, today, averages, loading: dailyLoading } = useWearableDaily(7);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const conn = connections[0] ?? null;
  const name = conn ? PROVIDER_NAME[conn.provider] ?? 'Tu reloj' : 'Tu reloj';
  // App Review 2.5.1: donde se muestran datos de HealthKit, se dice de dónde vienen.
  const disclaimer = conn?.provider === 'apple_health'
    ? `Datos leídos de Apple Health (HealthKit) con tu permiso. ${DISCLAIMER}`
    : DISCLAIMER;
  const footer = (
    <View>
      <Text style={s.footer}>{syncMsg ? `${syncMsg}\n\n${disclaimer}` : disclaimer}</Text>
      <Fuentes topics={['biometria', 'sueno']} />
    </View>
  );

  const sync = async () => {
    if (syncing || !conn || !userId) return;
    setSyncing(true);
    setSyncMsg(null);
    const { success, error } = await triggerWearableSync(userId, conn.provider);
    setSyncing(false);
    if (success) onSynced();
    else setSyncMsg(`No se pudo sincronizar: ${error ?? 'error desconocido'}. Prueba en un minuto.`);
  };

  const syncCard = (
    <TarjetaOro
      meta={name.toUpperCase()}
      metaRight={conn?.last_synced_at ? `ÚLTIMA VEZ ${haceCuanto(conn.last_synced_at)?.toUpperCase()}` : undefined}
      title={syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
      detail="Trae lo último que registró tu reloj."
      onPress={sync}
    />
  );

  if (connLoading || (conn && dailyLoading)) {
    return <Pantalla meta="TU RELOJ" title="Un momento." sub="Leyendo lo que envió tu reloj." />;
  }

  // ── Sin reloj ──────────────────────────────────────────────────────────────
  if (!conn) {
    return (
      <Pantalla
        meta="TU RELOJ"
        title="Conecta tu reloj."
        sub="Con tu sueño y tu pulso, Norman te habla de cómo estás de verdad, no solo de cómo te sientes."
        hero={
          <TarjetaOro
            meta="OURA · WHOOP · APPLE · GARMIN"
            title="Conectar mi reloj"
            detail="Tarda un minuto."
            onPress={() => router.push('/perfil/wearables' as never)}
          />
        }
        footer={footer}
      />
    );
  }

  // ── Conectado pero sin datos en 7 días ────────────────────────────────────
  if (!today) {
    const desde = haceCuanto(conn.last_synced_at);
    return (
      <Pantalla
        meta="TU RELOJ"
        title={`Tu ${name} no ha enviado datos.`}
        sub={desde
          ? `La última sincronización fue ${desde} y no trajo nada de los últimos 7 días.`
          : 'Todavía no ha sincronizado. Abre la app de tu reloj y luego sincroniza aquí.'}
        hero={syncCard}
        footer={footer}>
        <Fila label="DISPOSITIVOS" value="Gestionar" onPress={() => router.push('/perfil/wearables' as never)} last />
      </Pantalla>
    );
  }

  // ── Con datos ──────────────────────────────────────────────────────────────
  const cuando = haceCuanto(today.date);
  const titulo = today.recovery_score != null
    ? `Recuperación: ${recoveryLabel(today.recovery_score).toLowerCase()}.`
    : 'Esto dice tu reloj.';
  // La frase de Norman habla de "hoy": solo se muestra si los datos son de hoy.
  const insight = cuando === 'hoy' && today.hrv_ms ? hrvToNormanLanguage(today.hrv_ms, averages?.hrv ?? null) : null;
  const sub = [
    cuando === 'hoy' ? 'Datos de hoy.' : `Tus últimos datos son de ${cuando}.`,
    insight ? `Norman (IA): ${insight.charAt(0).toUpperCase()}${insight.slice(1)}.` : null,
  ].filter(Boolean).join(' ');

  const sleep = today.sleep_duration_min != null
    ? `${Math.floor(today.sleep_duration_min / 60)} h ${today.sleep_duration_min % 60} min`
    : null;
  const rows: { label: string; value: string | null }[] = [
    { label: 'RECUPERACIÓN', value: today.recovery_score != null ? `${Math.round(today.recovery_score)} de 100` : null },
    { label: 'SUEÑO', value: [sleep, today.sleep_score != null ? `${Math.round(today.sleep_score)} de 100` : null].filter(Boolean).join(' · ') || null },
    { label: 'VARIABILIDAD CARDÍACA', value: today.hrv_ms != null ? `${Math.round(today.hrv_ms)} ms` : null },
    { label: 'PULSO EN REPOSO', value: today.resting_hr != null ? `${today.resting_hr} lpm` : null },
    { label: 'PASOS', value: today.steps != null ? today.steps.toLocaleString('es') : null },
    {
      label: 'TEMPERATURA',
      value: today.body_temp_delta != null
        ? `${today.body_temp_delta >= 0 ? '+' : ''}${today.body_temp_delta.toFixed(1)} °C vs tu normal`
        : null,
    },
    { label: 'OXÍGENO', value: today.spo2_avg != null ? `${today.spo2_avg.toFixed(1)} %` : null },
  ].filter((r) => r.value);

  return (
    <Pantalla
      meta="TU RELOJ"
      metaRight={dailyData.length > 1 ? `${dailyData.length} DÍAS CON DATOS` : undefined}
      title={titulo}
      sub={sub}
      hero={syncCard}
      footer={footer}>
      {rows.map((r) => <Fila key={r.label} label={r.label} value={r.value as string} />)}
      <Fila label="DISPOSITIVOS" value="Gestionar" onPress={() => router.push('/perfil/wearables' as never)} last />
    </Pantalla>
  );
}

export default function BiometricsScreen() {
  // Tras sincronizar se remonta el cuerpo para releer conexiones y datos.
  const [nonce, setNonce] = useState(0);
  return <BiometricsBody key={nonce} onSynced={() => setNonce((n) => n + 1)} />;
}

const s = StyleSheet.create({
  footer: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: palette.smoke },
});
