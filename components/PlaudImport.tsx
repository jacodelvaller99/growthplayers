/**
 * PlaudImport — importa una transcripción externa (Plaud / llamada) a la memoria.
 *
 * Pega el texto → Norman lo resume (memory_summaries source='plaud') y sintetiza el
 * perfil vivo. Reutiliza el mismo pipeline client-side que el chat y la mentoría.
 * Degrada en silencio; no bloquea nada si falla.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { makeMinimalContext, summarizeConversation, updateProfileFromSummary } from '@/lib/memorySummarizer';

export function PlaudImport({ userId, userName }: { userId: string | null; userName?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function process() {
    const t = text.trim();
    if (!userId || !t || busy) return;
    setBusy(true);
    setDone(false);
    try {
      const ctx = makeMinimalContext(userName);
      const parsed = await summarizeConversation(userId, ctx, [{ role: 'user', text: t }], 'plaud');
      if (parsed) void updateProfileFromSummary(userId, ctx, parsed);
      setText('');
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.openRow, pressed && { opacity: 0.8 }]}
        accessibilityLabel="Importar transcripción de una llamada">
        <MaterialIcons name="upload-file" size={20} color={palette.goldText} />
        <View style={{ flex: 1 }}>
          <Text style={s.openTitle}>IMPORTAR LLAMADA</Text>
          <Text style={s.openSub}>Pega una transcripción (Plaud, Zoom…) y Norman la suma a tu memoria</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
      </Pressable>
    );
  }

  return (
    <PremiumCard style={s.card}>
      <View style={s.head}>
        <Text style={s.label}>IMPORTAR TRANSCRIPCIÓN</Text>
        <Pressable onPress={() => setOpen(false)} accessibilityLabel="Cerrar">
          <MaterialIcons name="close" size={18} color={palette.smoke} />
        </Pressable>
      </View>
      <TextInput
        value={text}
        onChangeText={(v) => { setText(v); setDone(false); }}
        placeholder="Pega aquí la transcripción de la llamada o sesión…"
        placeholderTextColor={palette.smoke}
        style={s.input}
        multiline
        textAlignVertical="top"
      />
      {done && <Text style={s.done}>✓ Procesada y sumada a tu memoria.</Text>}
      <Pressable
        onPress={process}
        disabled={busy || !text.trim()}
        style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }, (busy || !text.trim()) && { opacity: 0.4 }]}>
        {busy
          ? <ActivityIndicator color={palette.ink} size="small" />
          : <Text style={s.btnText}>PROCESAR CON NORMAN</Text>}
      </Pressable>
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  openRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.graphite, borderColor: palette.lineGold, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md,
  },
  openTitle: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 1 },
  openSub: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },
  input: {
    ...typography.body, color: palette.ivory, fontSize: 13, backgroundColor: palette.charcoal,
    borderRadius: radii.sm, padding: spacing.md, minHeight: 120,
  },
  done: { ...typography.caption, color: palette.success, fontSize: 12 },
  btn: {
    backgroundColor: palette.gold, borderRadius: radii.sm, paddingVertical: spacing.md,
    alignItems: 'center', justifyContent: 'center', minHeight: 44,
  },
  btnText: { ...typography.label, color: palette.ink, fontSize: 13, letterSpacing: 1 },
});
