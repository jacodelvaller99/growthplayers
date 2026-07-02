/**
 * EL CÍRCULO — Crear espacio.
 * Nombre + descripción + emoji (chips, sin dependencias nativas). El contenido
 * pasa el filtro de moderación ANTES de insertar (App Store 1.2).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENV } from '@/app/config/env';
import { CircleDisabled } from '@/components/circle';
import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { createSpace } from '@/lib/circle';
import { validateSpaceInput } from '@/lib/circleLogic';

const EMOJI_OPTIONS = ['🔥', '💪', '🧠', '🏔️', '🌅', '📚', '💼', '🏃', '🧘', '⚡', '🛠️', '🎯'];

export default function CrearEspacioScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState<string | null>('🔥');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const handleCreate = async () => {
    if (!userId || saving) return;
    const check = validateSpaceInput(name, description);
    if (!check.ok) { setError(check.error ?? 'Revisa los datos.'); return; }
    setError(null);
    setSaving(true);
    const res = await createSpace(userId, name, description, emoji);
    setSaving(false);
    if (res.success && res.id) {
      router.replace(`/comunidad/espacios/${res.id}` as never);
    } else {
      setError(res.error ?? 'No se pudo crear el espacio.');
    }
  };

  return (
    <KeyboardAvoidingView style={sc.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={s.title}>NUEVO ESPACIO</Text>
        </View>
        <Text style={s.intro}>Funda un círculo por tema. Tú lo lideras; la hermandad se une.</Text>

        <GoldDivider label="IDENTIDAD DEL ESPACIO" />

        <View style={s.form}>
          <Text style={s.fieldLabel}>NOMBRE *</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Fuerza 5AM"
            placeholderTextColor={palette.smoke}
            value={name}
            onChangeText={setName}
            maxLength={60}
            accessibilityLabel="Nombre del espacio"
          />

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DESCRIPCIÓN</Text>
          <TextInput
            style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="¿De qué se trata este círculo? ¿Para quién es?"
            placeholderTextColor={palette.smoke}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={280}
            accessibilityLabel="Descripción del espacio"
          />

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>ICONO</Text>
          <View style={s.emojiGrid}>
            {EMOJI_OPTIONS.map((e) => (
              <Pressable
                key={e}
                style={[s.emojiChip, emoji === e && s.emojiChipActive]}
                onPress={() => setEmoji(e)}
                accessibilityRole="radio"
                accessibilityState={{ selected: emoji === e }}
                accessibilityLabel={`Icono ${e}`}>
                <Text style={s.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>

          {error && (
            <Text style={s.error} accessibilityLiveRegion="polite" role="alert">{error}</Text>
          )}

          <Pressable
            style={[s.submitBtn, (saving || !name.trim()) && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={saving || !name.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving || !name.trim() }}
            accessibilityLabel="Fundar el espacio">
            {saving ? (
              <ActivityIndicator color={palette.ink} size="small" />
            ) : (
              <Text style={s.submitText}>FUNDAR ESPACIO</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  intro: { ...typography.caption, color: palette.smoke, paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: 12 },
  form: { paddingHorizontal: spacing.lg },
  fieldLabel: { ...typography.label, color: palette.smoke, marginBottom: spacing.xs, fontSize: 9 },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiChip: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphite },
  emojiChipActive: { borderColor: palette.gold, backgroundColor: palette.goldLight },
  emojiText: { fontSize: 20 },
  error: { ...typography.caption, color: palette.danger, marginTop: spacing.md, fontSize: 12 },
  submitBtn: { backgroundColor: palette.gold, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg, minHeight: 52, justifyContent: 'center' },
  submitText: { ...typography.section, color: palette.ink },
});
