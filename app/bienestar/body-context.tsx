/**
 * app/bienestar/body-context.tsx
 *
 * Contexto biométrico HONESTO para las prácticas (respiración / meditación).
 *
 * Regla inviolable: la app NO tiene stream de HRV en tiempo real — solo lee
 * `wearable_daily` (datos del DÍA). Aquí jamás prometemos medición "en vivo":
 * mostramos lo que el reloj ya registró hoy + un encuadre para acompañar la
 * recuperación del día. Sin reloj conectado → estado honesto con link a
 * /perfil/wearables. No se inventan datos ni tablas.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useWearableDaily, type WearableDaily } from '@/lib/wearables';

// ─── Contexto del cuerpo HOY (pre-práctica) ───────────────────────────────────

/**
 * @param frame  encuadre corto de por qué importa hoy (voz Polaris sobria).
 */
export function BodyContextCard({ frame }: { frame: string }) {
  const router = useRouter();
  const { today, loading } = useWearableDaily();

  // Mientras carga no mostramos nada (no hay promesa que cumplir todavía).
  if (loading) return null;

  const hasData =
    today != null &&
    (today.hrv_ms != null || today.resting_hr != null || today.recovery_score != null);

  // ── Sin reloj / sin dato del día → estado honesto, nunca datos falsos ──
  if (!hasData) {
    return (
      <Pressable
        onPress={() => router.push('/perfil/wearables')}
        accessibilityRole="button"
        accessibilityLabel="Conecta tu reloj para ver tu contexto del día">
        <PremiumCard style={styles.card}>
          <View style={styles.headRow}>
            <MaterialIcons name="watch" size={18} color={palette.goldText} />
            <Text style={styles.headLabel}>TU CUERPO HOY</Text>
          </View>
          <Text style={styles.emptyText}>
            Conecta tu reloj para ver tu contexto del día — HRV, frecuencia
            cardíaca en reposo y recuperación.
          </Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText}>CONECTAR RELOJ</Text>
            <MaterialIcons name="chevron-right" size={18} color={palette.goldText} />
          </View>
        </PremiumCard>
      </Pressable>
    );
  }

  return (
    <PremiumCard style={styles.card}>
      <View style={styles.headRow}>
        <MaterialIcons name="watch" size={18} color={palette.goldText} />
        <Text style={styles.headLabel}>TU CUERPO HOY</Text>
      </View>

      <View style={styles.metricRow}>
        <Metric label="HRV" value={fmt(today!.hrv_ms)} unit="ms" />
        <Metric label="FC REPOSO" value={fmt(today!.resting_hr)} unit="bpm" />
        <Metric label="RECUPERACIÓN" value={fmt(today!.recovery_score)} unit="%" />
      </View>

      <Text style={styles.frameText}>{frame}</Text>
      <Text style={styles.disclaimer}>
        Lectura del día, no en tiempo real.
      </Text>
    </PremiumCard>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  const has = value !== '—';
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>
        {value}
        {has ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function fmt(n: number | null): string {
  if (n == null) return '—';
  return String(Math.round(n));
}

// ─── Cierre (post-práctica): invita a registrar cómo se siente ────────────────

/**
 * Cierre honesto tras terminar. No abre tablas nuevas: enlaza al diario, donde
 * el cliente ya registra cómo se siente.
 */
export function PracticeClose({ message }: { message: string }) {
  const router = useRouter();
  return (
    <PremiumCard style={styles.closeCard}>
      <Text style={styles.closeText}>{message}</Text>
      <Pressable
        onPress={() => router.push('/bienestar/diario')}
        style={styles.closeBtn}
        accessibilityRole="button"
        accessibilityLabel="Registrar cómo te sientes">
        <MaterialIcons name="edit-note" size={18} color={palette.ink} />
        <Text style={styles.closeBtnText}>REGISTRAR CÓMO TE SIENTES</Text>
      </Pressable>
    </PremiumCard>
  );
}

// Re-export del tipo por conveniencia para consumidores.
export type { WearableDaily };

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headLabel: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 2,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 22,
    fontWeight: '700',
  },
  metricUnit: {
    fontFamily: Fonts.sans,
    color: palette.smoke,
    fontSize: 11,
    fontWeight: '600',
  },
  metricLabel: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  frameText: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
  },
  disclaimer: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 10,
    letterSpacing: 1,
  },
  emptyText: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Cierre
  closeCard: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  closeText: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.xl,
    height: 44,
    borderRadius: radii.sm,
  },
  closeBtnText: {
    ...typography.label,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
