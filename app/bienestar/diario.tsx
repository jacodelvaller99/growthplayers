import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type EntryType = 'reflection' | 'gratitude' | 'intention';

const ENTRY_TYPES: { id: EntryType; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; placeholder: string }[] = [
  { id: 'reflection', label: 'REFLEXIÓN',  icon: 'psychology',   placeholder: '¿Qué aprendiste o qué te preguntó la vida hoy?' },
  { id: 'gratitude',  label: 'GRATITUD',   icon: 'favorite',     placeholder: 'Tres cosas por las que estoy agradecido hoy...' },
  { id: 'intention',  label: 'INTENCIÓN',  icon: 'flag',         placeholder: 'Mi intención para las próximas horas es...' },
];

export default function DiarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [type, setType]       = useState<EntryType>('reflection');
  const [text, setText]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const current = ENTRY_TYPES.find((t) => t.id === type)!;

  const save = useCallback(async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('journal_entries').insert({
          user_id:    user.id,
          content:    text.trim(),
          entry_type: type,
        });
      }
      setText('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // best effort
    } finally {
      setSaving(false);
    }
  }, [text, type, saving]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={screen.root}
        contentContainerStyle={[screen.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
          </Pressable>
          <Text style={styles.title}>DIARIO</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.intro}>
          Escribe sin filtros. Tu diario es privado y solo tuyo.
        </Text>

        {/* Entry type selector */}
        <GoldDivider label="TIPO" />
        <View style={styles.typeRow}>
          {ENTRY_TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setType(t.id)}
              style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}>
              <MaterialIcons
                name={t.icon}
                size={16}
                color={type === t.id ? palette.black : palette.ash}
              />
              <Text style={[styles.typeBtnText, type === t.id && styles.typeBtnTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Input */}
        <GoldDivider label="ENTRADA" />
        <PremiumCard style={styles.inputCard}>
          <TextInput
            style={styles.input}
            multiline
            value={text}
            onChangeText={setText}
            placeholder={current.placeholder}
            placeholderTextColor={palette.smoke}
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.saveBtn, (!text.trim() || saving) && { opacity: 0.4 }]}
            onPress={save}
            disabled={!text.trim() || saving}>
            {saving ? (
              <ActivityIndicator size="small" color={palette.black} />
            ) : saved ? (
              <>
                <MaterialIcons name="check" size={16} color={palette.black} />
                <Text style={styles.saveBtnText}>GUARDADO</Text>
              </>
            ) : (
              <Text style={styles.saveBtnText}>GUARDAR ENTRADA</Text>
            )}
          </Pressable>
        </PremiumCard>

        {saved && (
          <View style={styles.savedBanner}>
            <MaterialIcons name="check-circle" size={16} color={palette.success} />
            <Text style={styles.savedText}>Entrada guardada correctamente.</Text>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.lg },

  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  typeBtnActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  typeBtnText: { ...typography.label, color: palette.ash },
  typeBtnTextActive: { color: palette.black },

  inputCard: { gap: spacing.md },
  input: {
    ...typography.body,
    color: palette.ivory,
    minHeight: 160,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    padding: spacing.md,
    backgroundColor: palette.graphite,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  saveBtnText: { ...typography.label, color: palette.black, fontWeight: '700' },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  savedText: { ...typography.body, color: palette.success, fontSize: 13 },
});
