/**
 * components/wearable-compat.tsx
 *
 * Catálogo informativo de relojes/wearables compatibles. Calma la pregunta
 * "¿incluye mi reloj?" sin que el cliente tenga que ir a Google. Es read-only:
 * solo lista marcas + la vía por la que sus datos llegan al motor biométrico.
 */
import { StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';

type Route = 'healthkit' | 'healthconnect' | 'oauth';
const ROUTE_LABEL: Record<Route, string> = {
  healthkit:     'iOS · Apple Salud',
  healthconnect: 'Android · Health Connect',
  oauth:         'OAuth directo',
};

const BRANDS: { name: string; routes: Route[] }[] = [
  { name: 'Apple Watch',              routes: ['healthkit'] },
  { name: 'Garmin',                   routes: ['healthkit', 'healthconnect'] },
  { name: 'Polar',                    routes: ['healthkit', 'healthconnect'] },
  { name: 'Coros',                    routes: ['healthkit', 'healthconnect'] },
  { name: 'Suunto',                   routes: ['healthkit', 'healthconnect'] },
  { name: 'Withings',                 routes: ['healthkit', 'healthconnect'] },
  { name: 'Fitbit',                   routes: ['healthconnect'] },
  { name: 'Samsung Galaxy Watch',     routes: ['healthconnect'] },
  { name: 'Wear OS (Pixel, otros)',   routes: ['healthconnect'] },
  { name: 'WHOOP',                    routes: ['oauth', 'healthkit', 'healthconnect'] },
  { name: 'Oura Ring',                routes: ['oauth', 'healthkit', 'healthconnect'] },
];

export function WearableCompat() {
  return (
    <PremiumCard style={s.card}>
      <Text style={s.title}>RELOJES COMPATIBLES</Text>
      <Text style={s.sub}>
        Cualquier reloj que escriba a Apple Salud (iOS) o Health Connect (Android) queda disponible para Norman. Oura y WHOOP también funcionan vía OAuth directo en web.
      </Text>
      <View style={s.grid}>
        {BRANDS.map((b) => (
          <View key={b.name} style={s.row}>
            <Text style={s.name}>{b.name}</Text>
            <View style={s.routes}>
              {b.routes.map((r) => (
                <View key={r} style={s.routeChip}>
                  <Text style={s.routeText}>{ROUTE_LABEL[r]}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  card:  { gap: spacing.sm, marginTop: spacing.md },
  title: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 1 },
  sub:   { ...typography.body, color: palette.ash, fontSize: 12, lineHeight: 18 },
  grid:  { gap: spacing.xs, marginTop: spacing.sm },
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: palette.line },
  name:  { ...typography.body, color: palette.ivory, fontSize: 12, flexShrink: 0 },
  routes:{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  routeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.charcoal },
  routeText: { ...typography.mono, color: palette.smoke, fontSize: 9, letterSpacing: 0.5 },
});
