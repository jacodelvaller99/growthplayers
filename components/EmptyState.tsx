/**
 * CMI LifeFlow — EmptyState
 *
 * Shown when a list or section has no data.
 *
 * Usage:
 *   <EmptyState icon="inbox" title="Sin registros" body="Aún no hay datos." />
 *   <EmptyState icon="search-off" title="Sin resultados" actionLabel="Limpiar filtro" onAction={reset} />
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'inbox',
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <MaterialIcons name={icon} size={32} color={palette.smoke} />
      </View>
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={s.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
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
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  title: {
    ...typography.section,
    color: palette.ivory,
    textAlign: 'center',
  },
  body: {
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
