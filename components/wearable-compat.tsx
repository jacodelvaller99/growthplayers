/**
 * components/wearable-compat.tsx
 *
 * Responde "¿incluye mi reloj?" en una frase, sin tabla ni jerga técnica.
 * Read-only: las vías reales (Apple Salud, Health Connect, conexión directa de
 * Oura/WHOOP) viven en lib/wearables*.ts.
 */
import { StyleSheet, Text } from 'react-native';

import { Fonts, palette, spacing } from '@/constants/theme';

export function WearableCompat() {
  return (
    <Text style={s.text}>
      Apple Watch, Garmin, Polar, Coros, Suunto, Withings, Fitbit, Samsung y otros relojes se
      conectan desde la app del teléfono, a través de Apple Health o Health Connect. Oura y WHOOP
      también se conectan directo desde aquí.
    </Text>
  );
}

const s = StyleSheet.create({
  text: { marginTop: spacing.lg, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },
});
