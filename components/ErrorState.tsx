/**
 * CMI LifeFlow — ErrorState
 *
 * Shown when a screen or section fails to load.
 *
 * Usage:
 *   <ErrorState message="No se pudo cargar los usuarios." onRetry={loadData} />
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { SecondaryButton } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Ocurrió un error inesperado.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <MaterialIcons name="error-outline" size={32} color={palette.danger} />
      </View>
      <Text style={s.title}>Algo salió mal</Text>
      <Text style={s.message}>{message}</Text>
      {onRetry ? (
        <View style={s.action}>
          <SecondaryButton label="REINTENTAR" icon="refresh" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    backgroundColor: palette.dangerMuted,
    borderColor: 'rgba(214,91,91,0.3)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  title: {
    ...typography.section,
    color: palette.ivory,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: palette.ash,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.sm,
    width: '100%',
    maxWidth: 240,
  },
});
