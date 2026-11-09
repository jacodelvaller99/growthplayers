/**
 * Tu acceso — la app NO vende nada (decisión del dueño, 2026-11-09): el
 * coaching se contrata por fuera, con contrato. Sin planes, sin precios, sin
 * compra. Aquí solo se canjea el código que entrega Polaris.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Pantalla } from '@/components/pantalla';
import { PressableScale } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { redeemAccessCode } from '@/lib/admin/actions';

export default function PricingScreen() {
  const router   = useRouter();
  const { state, userId, refreshTier } = useLifeFlow();
  const active = (state.subscriptionTier ?? 'free') !== 'free';

  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setResult(null);

    const res = await redeemAccessCode({ code: code.trim(), userId: userId ?? '' });

    setLoading(false);
    setResultOk(res.status === 'ok');

    const msgs: Record<string, string> = {
      ok:        '✓ Código activado con éxito. Tu acceso ha sido actualizado.',
      invalid:   'Código no válido. Revisa que lo hayas escrito correctamente.',
      exhausted: 'Este código ya ha alcanzado el límite de usos.',
      expired:   'Este código está vencido.',
      inactive:  'Este código ha sido desactivado.',
    };
    setResult(msgs[res.status] ?? 'Error desconocido.');

    if (res.status === 'ok') {
      // Refresh local state from DB so the new tier shows immediately on return
      await refreshTier();
      setTimeout(() => router.back(), 2500);
    }
  };

  return (
    <Pantalla
      meta="TU ACCESO"
      title={active ? 'Tu acceso está activo.' : 'Tu acceso llega con tu código.'}
      sub={active
        ? 'Tu programa está abierto. Si recibiste un código nuevo, ingrésalo abajo.'
        : 'El Protocolo completo se abre con el código que te entrega tu Navegador al inscribirte. Ingrésalo abajo y se activa al momento.'}>
      <View style={s.col}>
        <View style={s.codeBlock}>
          <Text style={s.codeLabel}>CÓDIGO DE ACCESO</Text>
          <View style={s.codeInputRow}>
            <TextInput
              style={s.codeInput}
              placeholder="XXXX-XXXX"
              placeholderTextColor={palette.smoke}
              value={code}
              onChangeText={t => { setCode(t.toUpperCase()); setResult(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
              maxLength={20}
              accessibilityLabel="Código de acceso"
            />
            <PressableScale
              style={[s.codeBtn, (loading || !code.trim()) && { opacity: 0.4 }]}
              onPress={handleRedeem}
              disabled={loading || !code.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || !code.trim() }}
              accessibilityLabel="Canjear código">
              <Text style={s.codeBtnText}>{loading ? '...' : 'CANJEAR'}</Text>
            </PressableScale>
          </View>
          {result ? (
            <View
              style={[s.resultBanner, { backgroundColor: resultOk ? palette.successMuted : palette.dangerMuted }]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive">
              <Text style={[s.resultText, { color: resultOk ? palette.success : palette.danger }]}>
                {result}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={s.contactText}>
          ¿Necesitas ayuda con tu acceso? Contacta a tu asesor de Polaris Growth Institute.
        </Text>
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  col: { maxWidth: 640, width: '100%' },
  codeBlock: { gap: spacing.md },
  codeLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  codeInputRow: { flexDirection: 'row', gap: spacing.sm },
  codeInput: {
    flex: 1,
    // Sin esto el input NO encoge: el minimo implicito de un item flex es su
    // contenido, asi que la fila pedia 334px en un ancho de 316 y el boton
    // CANJEAR se salia de la tarjeta.
    minWidth: 0,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: palette.ivory,
    fontFamily: Fonts.mono,
    fontSize: 16,
    letterSpacing: 3,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  codeBtn: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: palette.gold,
  },
  codeBtnText: { fontFamily: Fonts.display, fontSize: 11, fontWeight: '700', letterSpacing: 2, color: palette.ink },
  resultBanner: { borderRadius: radii.sm, padding: spacing.md },
  resultText: { ...typography.body, fontSize: 13, lineHeight: 18 },
  contactText: { marginTop: spacing.xl, fontFamily: Fonts.sans, color: palette.smoke, lineHeight: 20, fontSize: 14 },
});
