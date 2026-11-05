/**
 * Mi Norte — diseño del canvas: la frase grande, los valores debajo, y
 * EDITAR arriba. Leer y editar son dos estados distintos: el Norte se lee
 * casi siempre y se reescribe rara vez, así que la vista por defecto no es
 * un formulario. Si todavía no hay Norte, se abre directo en edición.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessField, AccessNotice, useDecorStarColor } from '@/components/auth/AccessFrame';
import { PolarisLogo } from '@/components/PolarisLogo';
import { PrimaryButton } from '@/components/polaris';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { logSilentError } from '@/lib/observability';

export default function NorteScreen() {
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const starColor = useDecorStarColor();
  const router = useRouter();
  const { state, updateNorthStar } = useLifeFlow();
  // Norte no es una de las 4 pestañas: sin flecha, en la PWA instalada no había salida.
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/yo' as never));
  const north = state.northStar;

  const vacio = !north.purpose.trim() && !north.identity.trim();
  const [editando, setEditando] = useState(vacio);
  const [purpose, setPurpose] = useState(north.purpose);
  const [identity, setIdentity] = useState(north.identity);
  const [dailyReminder, setDailyReminder] = useState(north.dailyReminder);
  const [valores, setValores] = useState(north.nonNegotiables.join('\n'));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recienGuardado, setRecienGuardado] = useState(false);

  const abrirEdicion = () => {
    setPurpose(north.purpose);
    setIdentity(north.identity);
    setDailyReminder(north.dailyReminder);
    setValores(north.nonNegotiables.join('\n'));
    setSaveError(null);
    setEditando(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateNorthStar({
        purpose,
        identity,
        dailyReminder,
        nonNegotiables: valores.split('\n').map((v) => v.trim()).filter(Boolean),
      });
      setEditando(false);
      setRecienGuardado(true);
      setTimeout(() => setRecienGuardado(false), 3000);
    } catch (e) {
      // Sin esto el usuario perdía su Norte en silencio.
      logSilentError('norte.save', e);
      setSaveError('No se pudo guardar tu Norte. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const meta = (
    <View style={s.metaRow}>
      <View style={s.metaLeft}>
        <Pressable onPress={volver} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8} style={s.back}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={s.meta}>MI NORTE</Text>
      </View>
      {!editando && (
        <Pressable onPress={abrirEdicion} accessibilityRole="button" accessibilityLabel="Editar mi Norte" hitSlop={12} style={s.metaBtn}>
          <Text style={s.metaAction}>EDITAR</Text>
        </Pressable>
      )}
    </View>
  );

  const lectura = (
    <>
      <View style={s.star}>
        <PolarisLogo size={isDesktop ? 64 : 44} color={starColor} />
      </View>
      <Text style={s.what}>Lo que quieres lograr en estos 90 días.</Text>
      <Text accessibilityRole="header" style={[s.purpose, isDesktop && s.purposeDesk]}>
        {north.purpose.trim() || north.identity.trim()}
      </Text>
      {!!north.purpose.trim() && !!north.identity.trim() && (
        <Text style={[s.identity, isDesktop && s.identityDesk]}>{north.identity}</Text>
      )}
      {recienGuardado && <Text style={s.saved} accessibilityLiveRegion="polite">Norte guardado.</Text>}

      {(north.nonNegotiables.length > 0 || !!north.dailyReminder.trim()) && (
        <View style={[s.list, isDesktop && s.listDesk]}>
          {north.nonNegotiables.map((v, i) => (
            <View key={`${v}-${i}`} style={[s.item, i === 0 && s.itemFirst]}>
              <View style={s.dash} />
              <Text style={s.itemText}>{v}</Text>
            </View>
          ))}
          {!!north.dailyReminder.trim() && (
            <View style={[s.item, north.nonNegotiables.length === 0 && s.itemFirst]}>
              <Text style={s.itemLabel}>CADA MAÑANA</Text>
              <Text style={[s.itemText, s.itemReminder]}>{north.dailyReminder}</Text>
            </View>
          )}
        </View>
      )}
    </>
  );

  const edicion = (
    <>
      <Text accessibilityRole="header" style={[s.editTitle, isDesktop && s.editTitleDesk]}>
        {vacio ? '¿Hacia dónde\nvas?' : 'Tu Norte.'}
      </Text>
      <Text style={s.editSub}>
        Lo que escribas aquí es lo que Norman te recuerda cuando dudas.
      </Text>
      <View style={s.fields}>
        <AccessField
          label="EN 90 DÍAS HABRÁ VALIDO LA PENA SI…"
          value={purpose}
          onChangeText={setPurpose}
          multiline
          placeholder="Describe el resultado, no la intención"
        />
        <AccessField
          label="QUIÉN ERES"
          value={identity}
          onChangeText={setIdentity}
          placeholder="Soy el tipo de persona que…"
        />
        <AccessField
          label="TUS VALORES · UNO POR LÍNEA"
          value={valores}
          onChangeText={setValores}
          multiline
          placeholder={'Verdad\nConstancia'}
        />
        <AccessField
          label="LA FRASE DE CADA MAÑANA"
          value={dailyReminder}
          onChangeText={setDailyReminder}
          multiline
          placeholder="La frase que te ancla"
        />
        {!!saveError && <AccessNotice tone="error">{saveError}</AccessNotice>}
      </View>
      <View style={s.actions}>
        <PrimaryButton
          label={saving ? 'GUARDANDO…' : 'GUARDAR MI NORTE'}
          icon="arrow-forward"
          onPress={save}
          disabled={saving || (!purpose.trim() && !identity.trim())}
        />
        {!vacio && (
          <Pressable onPress={() => setEditando(false)} accessibilityRole="button" style={s.cancel}>
            <Text style={s.cancelText}>Cancelar</Text>
          </Pressable>
        )}
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          isDesktop ? s.contentDesk : { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 96 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Animated.View key={editando ? 'edit' : 'read'} entering={reduced ? undefined : FadeIn.duration(200)} style={[s.inner, isDesktop && s.innerDesk]}>
          {meta}
          {editando ? edicion : lectura}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg },
  contentDesk: { paddingHorizontal: 72, paddingTop: 48, paddingBottom: 96 },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  innerDesk: { maxWidth: 1128 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  metaBtn: { minHeight: 44, justifyContent: 'center' },
  metaLeft: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },
  metaAction: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },
  what: { marginTop: 24, fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
  // Raya, no estrella: cinco estrellas de viñeta diluían la estrella oficial.
  dash: { width: 12, height: 2, backgroundColor: palette.smoke },

  star: { marginTop: 32, marginLeft: -2 },
  purpose: {
    marginTop: 12, fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 29, lineHeight: 34,
    color: palette.ivory, maxWidth: 820,
  },
  purposeDesk: { fontSize: 48, lineHeight: 55 },
  identity: { marginTop: 20, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 26, color: palette.ash, maxWidth: 560 },
  identityDesk: { fontSize: 18, lineHeight: 28 },
  saved: { marginTop: 16, fontFamily: Fonts.sans, fontSize: 15, color: palette.goldText },

  list: { marginTop: 48, maxWidth: 560 },
  listDesk: { marginTop: 72 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.line, flexWrap: 'wrap',
  },
  itemFirst: { borderTopWidth: 1, borderTopColor: palette.line },
  itemText: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory, flexShrink: 1 },
  itemLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  itemReminder: { color: palette.ash },

  editTitle: {
    marginTop: 40, fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 34, lineHeight: 37, color: palette.ivory,
  },
  editTitleDesk: { fontSize: 56, lineHeight: 60 },
  editSub: { marginTop: 16, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 26, color: palette.ash, maxWidth: 420 },
  fields: { marginTop: 40, gap: spacing.lg, maxWidth: 560 },
  actions: { marginTop: 40, gap: spacing.xs, maxWidth: 560 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
});
