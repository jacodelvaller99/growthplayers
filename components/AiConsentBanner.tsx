/**
 * AiConsentBanner — la IA del panel está apagada hasta que el staff la autoriza.
 *
 * Toda llamada a IA pasa por el cerrojo de permiso (lib/aiConsent.ts, Apple
 * 5.1.2(i)). Un admin o mentor que nunca abrió el chat de Norman jamás pulsó
 * "AUTORIZO", así que el reparto de sesiones, el briefing y el copiloto
 * fallaban en silencio. Este aviso lo dice y da el botón; la persona decide.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { acceptAiConsent, AI_PROVIDERS_LABEL, isAiConsentGranted, subscribeAiConsent } from '@/lib/aiConsent';

export function AiConsentBanner() {
  const { userId } = useLifeFlow();
  const [granted, setGranted] = useState(isAiConsentGranted());
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAiConsent(setGranted), []);

  if (granted || !userId) return null;
  return (
    <View style={s.banner} accessibilityRole="alert">
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title}>La IA del panel está apagada</Text>
        <Text style={s.body}>
          Sin tu autorización no se reparten las sesiones ni se generan briefings. Al activarla, las
          notas de tus clientes se envían a {AI_PROVIDERS_LABEL} para procesarlas.
        </Text>
      </View>
      <Pressable
        onPress={async () => { setBusy(true); await acceptAiConsent(userId); setBusy(false); }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Autorizar y activar la IA del panel"
        style={({ pressed }) => [s.cta, (pressed || busy) && { opacity: 0.8 }]}>
        <Text style={s.ctaText}>{busy ? 'ACTIVANDO…' : 'AUTORIZO · ACTIVAR IA'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.lineGold,
    backgroundColor: palette.graphite,
  },
  title: { ...typography.body, fontWeight: '600', color: palette.ivory },
  body: { ...typography.caption, color: palette.ash, marginTop: 2 },
  cta: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { ...typography.label, color: palette.ink, fontSize: 11, fontWeight: '700' },
});
