import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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

import { GoldDivider, PremiumCard, screen, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { ACTIVE_MODULE } from '@/data/modules';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { insertSummary } from '@/lib/memory';
import { streamMentorResponse, type MentorContext } from '@/lib/mentor';
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
  const { state, userId, todayCheckIn, protocolDay, averages } = useLifeFlow();
  const [type, setType]       = useState<EntryType>('reflection');
  const [text, setText]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // La entrada que se acaba de guardar — `text` ya se vació para el siguiente
  // renglón, así que "Reflexionar con Norman" necesita su propia copia.
  const [lastSaved, setLastSaved] = useState<{ text: string; type: EntryType } | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [reflection, setReflection] = useState('');
  const reflectAbortRef = useRef<AbortController | null>(null);

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
      setLastSaved({ text: text.trim(), type });
      setReflection('');
      setText('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('[Diario] Error al guardar entrada:', err);
      setSaveError('No se pudo guardar tu entrada. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [text, type, saving]);

  // El diario era invisible para la memoria de Norman: se guardaba en
  // journal_entries y ahí se quedaba, sin que ningún flujo de mentor lo leyera
  // ni lo recordara. Este botón cierra ese hueco — arma un MentorContext
  // reducido (sin intelligence/biometric/memoria — no hace falta para una
  // reflexión puntual) en modo 'reflection' (sin confrontación, sin tareas
  // nuevas: solo espejo) y persiste entrada + respuesta a memory_summaries.
  const reflect = useCallback(async () => {
    if (!lastSaved || !userId || reflecting) return;
    setReflecting(true);
    setReflection('');
    const controller = new AbortController();
    reflectAbortRef.current = controller;

    // Mismo cálculo que app/(tabs)/mentor.tsx — Norman cita estas cifras en
    // el bloque de contexto sea cual sea el modo; que la reflexión diga un
    // score o racha distintos a los del chat principal sería una mentira.
    const streak = computeStreak(state.checkIns);
    const sovereignScore = Math.round(
      (averages.energy + averages.clarity + (10 - averages.stress) + averages.sleep) / 4 * 100,
    );
    const tier =
      sovereignScore >= 750 ? 'Maestro'
      : sovereignScore >= 500 ? 'Soberano'
      : sovereignScore >= 200 ? 'Mercader'
      : 'Explorador';
    const activeModLessons = ACTIVE_MODULE.lessons.length;
    const activeModCompleted = ACTIVE_MODULE.lessons.filter(
      (l) => (state.completedLessons ?? []).includes(l.id),
    ).length;
    const activeModuleProgress = activeModLessons > 0
      ? Math.round((activeModCompleted / activeModLessons) * 100)
      : 0;

    const ctx: MentorContext = {
      userName:             state.profile.name,
      role:                 state.profile.role,
      totalDays:            protocolDay,
      streak,
      sovereignScore,
      tier,
      activeModuleTitle:    ACTIVE_MODULE.title,
      activeModuleProgress,
      northStar:            state.northStar,
      todayCheckIn,
      messageCount:         0,
      mode:                 'reflection',
    };

    const typeLabel = ENTRY_TYPES.find((t) => t.id === lastSaved.type)?.label.toLowerCase() ?? 'entrada';
    const prompt = `Acabo de escribir esto en mi diario (${typeLabel}):\n\n"${lastSaved.text}"\n\nReflexiona conmigo sobre esto.`;

    let full = '';
    try {
      await streamMentorResponse(ctx, prompt, [], (delta) => {
        full += delta;
        setReflection(full);
      }, controller.signal);
    } catch {/* abort o error de proveedor: se conserva el parcial ya pintado */}

    setReflecting(false);
    reflectAbortRef.current = null;

    if (full.trim()) {
      void insertSummary({
        user_id:              userId,
        source_type:          'wellness',
        summary:              `[Diario · ${typeLabel}] ${lastSaved.text}\n\nReflexión de Norman: ${full.trim()}`.slice(0, 800),
        key_topics:           [lastSaved.type],
        commitments:          [],
        unresolved_questions: [],
        emotional_tone:       '',
        suggested_next_focus: '',
      });
    }
  }, [lastSaved, userId, reflecting, state, averages, todayCheckIn, protocolDay]);

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

        {/* Reflexionar con Norman — aparece tras guardar, se calla si empiezas otra entrada */}
        {lastSaved && (
          <>
            <GoldDivider label="NORMAN" />
            <PremiumCard style={styles.reflectCard}>
              {!reflecting && !reflection ? (
                <Pressable
                  style={styles.reflectBtn}
                  onPress={reflect}
                  accessibilityRole="button"
                  accessibilityLabel="Reflexionar con Norman">
                  <MaterialIcons name="psychology" size={18} color={palette.ink} />
                  <Text style={styles.reflectBtnText}>REFLEXIONAR CON NORMAN</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={styles.reflectLabel}>NORMAN</Text>
                  <Text style={styles.reflectText}>{reflection || '…'}</Text>
                  {reflecting && (
                    <Pressable
                      style={styles.reflectStopBtn}
                      onPress={() => reflectAbortRef.current?.abort()}
                      accessibilityRole="button"
                      accessibilityLabel="Detener reflexión">
                      <MaterialIcons name="stop" size={14} color={palette.ash} />
                      <Text style={styles.reflectStopText}>DETENER</Text>
                    </Pressable>
                  )}
                </>
              )}
            </PremiumCard>
          </>
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

  reflectCard: { gap: spacing.md },
  reflectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  reflectBtnText: { ...typography.label, color: palette.ink, fontWeight: '700' },
  reflectLabel: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  reflectText: { ...typography.body, color: palette.ivory, fontSize: 14, lineHeight: 21 },
  reflectStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  reflectStopText: { ...typography.label, color: palette.ash, fontSize: 11 },
});
