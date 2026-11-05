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
import { Pressable, StyleSheet, Text } from 'react-native';

import { Fila } from '@/components/pantalla';
import { PremiumCard } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { useJornada } from '@/hooks/use-jornada';
import { useWearableDaily, type WearableDaily } from '@/lib/wearables';

// ─── Tu reloj (pre-práctica) ──────────────────────────────────────────────────

/**
 * Una sola fila gris, sin segundo amarillo ni jerga: "Tu reloj · Conectar" o
 * el dato del día en palabras llanas. Nunca un dato inventado.
 */
export function BodyContextCard() {
  const router = useRouter();
  const { today, loading } = useWearableDaily();

  // Mientras carga no mostramos nada (no hay promesa que cumplir todavía).
  if (loading) return null;

  const value = today?.recovery_score != null
    ? `Recuperación ${Math.round(today.recovery_score)} %`
    : today?.resting_hr != null
      ? `Pulso en reposo ${Math.round(today.resting_hr)}`
      : today?.hrv_ms != null
        ? 'Datos de hoy'
        : 'Conectar';
  const connected = value !== 'Conectar';

  return (
    <Fila
      label="TU RELOJ"
      value={value}
      onPress={() => router.push(connected ? '/bienestar/biometrics' : '/perfil/wearables')}
      last
    />
  );
}

// ─── Cierre (post-práctica): el siguiente paso de la jornada ──────────────────

/**
 * Cierre honesto tras terminar. Era el sumidero del loop: TODAS las prácticas
 * morían aquí con un único botón al diario, y el diario no devolvía a nada.
 * Ahora el botón sigue a la JORNADA (lib/jornadaLogic.ts): terminar la
 * práctica marca REGULA (derivado de la sesión recién guardada) y el cierre
 * ofrece el paso que falta — normalmente cerrar en el diario, pero si aún no
 * ejecutaste, la lección. Sin jornada (log cargando), el destino clásico.
 */
export function PracticeClose({ message }: { message: string }) {
  const router = useRouter();
  const jornada = useJornada();

  const destino = (() => {
    switch (jornada?.current) {
      case 'leete':
        return { label: 'HACER MI CHECK-IN', route: '/checkin', icon: 'monitor-heart' as const };
      case 'ejecuta':
        return { label: 'EJECUTAR LA LECCIÓN', route: '/(tabs)/programas', icon: 'play-arrow' as const };
      case null:
        // Jornada completa: la práctica fue extra. Salida serena.
        return jornada
          ? { label: 'VER TU PROGRESO', route: '/(tabs)/progreso', icon: 'insights' as const }
          : { label: 'REGISTRAR CÓMO TE SIENTES', route: '/bienestar/diario', icon: 'edit-note' as const };
      default:
        // 'cierra', 'regula' (sesión aún no reflejada) o jornada sin cargar:
        // el diario, que era y sigue siendo el cierre natural de una práctica.
        return { label: 'REGISTRAR CÓMO TE SIENTES', route: '/bienestar/diario', icon: 'edit-note' as const };
    }
  })();

  return (
    <PremiumCard style={styles.closeCard}>
      <Text style={styles.closeText}>{message}</Text>
      <Pressable
        onPress={() => router.push(destino.route as never)}
        style={styles.closeBtn}
        accessibilityRole="button"
        accessibilityLabel={destino.label}>
        <MaterialIcons name={destino.icon} size={18} color={palette.ink} />
        <Text style={styles.closeBtnText}>{destino.label}</Text>
      </Pressable>
    </PremiumCard>
  );
}

// Re-export del tipo por conveniencia para consumidores.
export type { WearableDaily };

const styles = StyleSheet.create({
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
