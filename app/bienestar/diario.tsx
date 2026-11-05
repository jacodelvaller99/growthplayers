import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JornadaCierre } from '@/components/jornada';
import { Pantalla } from '@/components/pantalla';
import { useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, EASING_HOUSE, DURATION_HOUSE } from '@/constants/theme';
import { logJornadaStep, useJornada } from '@/hooks/use-jornada';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
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

// Selector de tipo: hoy es un corte seco (el fondo cambia de golpe al tocar).
// Un pequeño "pop" en el chip recién activado marca la transición sin animar
// color — interpolar `palette.gold`/`palette.ash` rompería en web, donde son
// `var(--c-*)` (ver themeVarInAnimation.test.ts).
function EntryTypeChip({ t, active, onPress }: { t: (typeof ENTRY_TYPES)[number]; active: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active && !reduced) {
      scale.value = withSequence(
        withTiming(1.05, { duration: DURATION_HOUSE.selection / 2, easing: Easing.bezier(...EASING_HOUSE) }),
        withTiming(1, { duration: DURATION_HOUSE.selection / 2, easing: Easing.bezier(...EASING_HOUSE) }),
      );
    }
  }, [active, reduced]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: active }}
        style={[styles.typeBtn, active && styles.typeBtnActive]}>
        <MaterialIcons
          name={t.icon}
          size={16}
          color={active ? palette.ivory : palette.smoke}
        />
        <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>
          {t.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

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
  const saveBtnScale = useSharedValue(1);
  const saveBtnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveBtnScale.value }] }));

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

  const empty = !text.trim();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pantalla
        meta="BIENESTAR · MENTE"
        title="Diario"
        sub="¿Qué te dejó el día? Es privado y solo tuyo.">
        <View style={styles.typeRow}>
          {ENTRY_TYPES.map((t) => (
            <EntryTypeChip key={t.id} t={t} active={type === t.id} onPress={() => setType(t.id)} />
          ))}
        </View>

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

        <Animated.View style={saveBtnAnimStyle}>
          <Pressable
            style={[styles.saveBtn, (empty || saving) && styles.saveBtnOff]}
            onPress={save}
            onPressIn={() => { saveBtnScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
            onPressOut={() => { saveBtnScale.value = withSpring(1, { damping: 12, stiffness: 250 }); }}
            disabled={empty || saving}
            accessibilityRole="button"
            accessibilityLabel="Guardar entrada"
            accessibilityHint={empty ? 'Escribe algo para guardar' : undefined}
            accessibilityState={{ disabled: empty || saving }}>
            {saving ? (
              <ActivityIndicator size="small" color={palette.ink} />
            ) : (
              <Text style={[styles.saveBtnText, empty && styles.saveBtnTextOff]}>{saved ? 'GUARDADO' : 'GUARDAR'}</Text>
            )}
          </Pressable>
        </Animated.View>

        {empty && !saved && <Text style={styles.helper}>Escribe algo para guardar.</Text>}

        {saved && (
          <Text style={styles.helper} accessibilityLiveRegion="polite" accessibilityRole="alert">
            Guardado.
          </Text>
        )}

        {saveError && (
          <Text style={styles.errorText} accessibilityLiveRegion="assertive" accessibilityRole="alert">
            {saveError}
          </Text>
        )}
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md,
    borderRadius: radii.pill, borderWidth: 1, borderColor: palette.line, minHeight: 44, justifyContent: 'center',
  },
  // Activo en tinta clara, no amarillo: el único amarillo es GUARDAR.
  typeBtnActive: { borderColor: palette.ivory },
  typeBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  typeBtnTextActive: { color: palette.ivory },

  input: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    lineHeight: 26,
    color: palette.ivory,
    minHeight: 200,
    textAlignVertical: 'top',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold,
    borderRadius: 8,
    minHeight: 52,
  },
  // Deshabilitado: contorno gris + texto apagado; el amarillo solo cuando se puede guardar.
  saveBtnOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.lineHard },
  saveBtnTextOff: { color: palette.smoke },
  saveBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1, color: palette.ink },
  helper: { fontFamily: Fonts.sans, fontSize: 14, color: palette.smoke, marginTop: spacing.sm },
  errorText: { fontFamily: Fonts.sans, fontSize: 14, color: palette.danger, marginTop: spacing.sm },
});
