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

import { JornadaCierre } from '@/components/jornada';
import { GoldDivider, PremiumCard, screen, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { logJornadaStep, useJornada } from '@/hooks/use-jornada';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { withStepDone, type Jornada } from '@/lib/jornadaLogic';
import { checkMilestone } from '@/lib/milestoneCheck';
import { arcForDay, deltaSince, type Milestone } from '@/lib/narrativeLogic';
import { supabase } from '@/lib/supabase';
import { computeStreak } from '@/lib/utils';

type EntryType = 'reflection' | 'gratitude' | 'intention';

const ENTRY_TYPES: { id: EntryType; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; placeholder: string }[] = [
  { id: 'reflection', label: 'REFLEXIÓN',  icon: 'psychology',   placeholder: '¿Qué aprendiste o qué te preguntó la vida hoy?' },
  { id: 'gratitude',  label: 'GRATITUD',   icon: 'favorite',     placeholder: 'Tres cosas por las que estoy agradecido hoy...' },
  { id: 'intention',  label: 'INTENCIÓN',  icon: 'flag',         placeholder: 'Mi intención para las próximas horas es...' },
];

export default function DiarioScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, todayCheckIn, protocolDay } = useLifeFlow();
  const jornada = useJornada();
  const [type, setType]       = useState<EntryType>('reflection');
  const [text, setText]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // El fin de jornada: guardar la nota CIERRA el día. El diario era el
  // sumidero del loop — todas las prácticas terminaban aquí y esta pantalla
  // no devolvía nada. Ahora devuelve el cierre: pasos hechos, delta del día,
  // frase del arco, y una sola salida al Comando.
  const [cierre, setCierre] = useState<{ jornada: Jornada; milestone: Milestone | null } | null>(null);

  const current = ENTRY_TYPES.find((t) => t.id === type)!;

  const save = useCallback(async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('journal_entries').insert({
          user_id:    user.id,
          content:    text.trim(),
          entry_type: type,
        });
        if (error) throw error;
      }
      setText('');
      // SOLO en éxito: un guardado fallido no cierra nada.
      void logJornadaStep('cierra');
      if (jornada) {
        const milestone = await checkMilestone(
          { streak: computeStreak(state.checkIns), protocolDay },
          { painPoint: state.profile.painPoint, purpose: state.northStar.purpose },
        );
        setCierre({ jornada: withStepDone(jornada, 'cierra'), milestone });
      } else {
        // Log local sin cargar (raro): el acuse clásico, nunca un hueco.
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error('[Diario] Error al guardar entrada:', err);
      setSaveError('No se pudo guardar tu entrada. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [text, type, saving, jornada, state.checkIns, state.profile.painPoint, state.northStar.purpose, protocolDay]);

  // El delta del día y la frase del arco para el cierre.
  const prevCheckIn = state.checkIns.find((c) => c.id !== todayCheckIn?.id) ?? null;
  const deltaDia = todayCheckIn
    ? deltaSince(
        { energy: todayCheckIn.energy, clarity: todayCheckIn.clarity, stress: todayCheckIn.stress, sleep: todayCheckIn.sleep },
        prevCheckIn,
      )
    : null;
  const arcPhrase = arcForDay(protocolDay, {
    painPoint: state.profile.painPoint,
    purpose: state.northStar.purpose,
    identity: state.northStar.identity,
  }).line;

  if (cierre) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 24, paddingBottom: 80 }]}>
        <JornadaCierre
          jornada={cierre.jornada}
          delta={deltaDia}
          arcPhrase={arcPhrase}
          milestone={cierre.milestone}
          onVolver={() => router.replace('/(tabs)/comando')}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
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
              accessibilityRole="button"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: type === t.id }}
              style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}>
              <MaterialIcons
                name={t.icon}
                size={16}
                color={type === t.id ? palette.ink : palette.ash}
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
            accessibilityLabel={`Entrada de ${current.label.toLowerCase()}`}
          />
          <Pressable
            style={[styles.saveBtn, (!text.trim() || saving) && { opacity: 0.4 }]}
            onPress={save}
            disabled={!text.trim() || saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar entrada"
            accessibilityState={{ disabled: !text.trim() || saving }}>
            {saving ? (
              <ActivityIndicator size="small" color={palette.ink} />
            ) : saved ? (
              <>
                <MaterialIcons name="check" size={16} color={palette.ink} />
                <Text style={styles.saveBtnText}>GUARDADO</Text>
              </>
            ) : (
              <Text style={styles.saveBtnText}>GUARDAR ENTRADA</Text>
            )}
          </Pressable>
        </PremiumCard>

        {saved && (
          <View style={styles.savedBanner} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <MaterialIcons name="check-circle" size={16} color={palette.success} />
            <Text style={styles.savedText}>Entrada guardada correctamente.</Text>
          </View>
        )}

        {saveError && (
          <View style={styles.errorBanner} accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <MaterialIcons name="error-outline" size={16} color={palette.danger} />
            <Text style={styles.errorText}>{saveError}</Text>
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.lg },

  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  typeBtn: { flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line, minHeight: 44, justifyContent: 'center' },
  typeBtnActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  typeBtnText: { ...typography.label, color: palette.ash },
  typeBtnTextActive: { color: palette.ink },

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
  saveBtnText: { ...typography.label, color: palette.ink, fontWeight: '700' },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  savedText: { ...typography.body, color: palette.success, fontSize: 13 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  errorText: { ...typography.body, color: palette.danger, fontSize: 13 },
});
