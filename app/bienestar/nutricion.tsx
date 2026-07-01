import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';

const DIET_TYPES = [
  { id: 'omnivoro',     label: 'Omnívoro',     icon: 'restaurant',         desc: 'Como de todo: carne, verduras, granos.' },
  { id: 'vegetariano',  label: 'Vegetariano',  icon: 'eco',                desc: 'Sin carne. Incluye lácteos y huevos.' },
  { id: 'vegano',       label: 'Vegano',       icon: 'grass',              desc: 'Solo alimentos de origen vegetal.' },
  { id: 'keto',         label: 'Keto',         icon: 'whatshot',           desc: 'Alta en grasas, muy baja en carbohidratos.' },
  { id: 'carnivoro',    label: 'Carnívoro',    icon: 'set-meal',           desc: 'Solo carne, pescado y huevos.' },
  { id: 'mediterraneo', label: 'Mediterráneo', icon: 'local-dining',       desc: 'Aceite de oliva, pescado, vegetales, vino.' },
  { id: 'paleo',        label: 'Paleo',        icon: 'outdoor-grill',      desc: 'Sin procesados, lácteos ni granos.' },
];

const RESTRICTIONS = [
  { id: 'gluten',    label: 'Sin gluten' },
  { id: 'lactosa',   label: 'Sin lactosa' },
  { id: 'azucar',    label: 'Sin azúcar' },
  { id: 'sal',       label: 'Bajo en sal' },
  { id: 'ninguna',   label: 'Ninguna' },
];

const ALLERGIES = [
  { id: 'frutos_secos', label: 'Frutos secos' },
  { id: 'mariscos',     label: 'Mariscos' },
  { id: 'huevos',       label: 'Huevos' },
  { id: 'soja',         label: 'Soja' },
  { id: 'ninguna',      label: 'Ninguna' },
];

const GOALS = [
  { id: 'perder_grasa',    label: 'Perder grasa',      icon: 'trending-down' },
  { id: 'ganar_musculo',   label: 'Ganar músculo',     icon: 'fitness-center' },
  { id: 'energia',         label: 'Más energía',       icon: 'bolt' },
  { id: 'longevidad',      label: 'Longevidad',        icon: 'favorite' },
  { id: 'rendimiento',     label: 'Rendimiento',       icon: 'speed' },
  { id: 'mantenimiento',   label: 'Mantenimiento',     icon: 'balance' },
];

const CALORIE_RANGES = [
  { id: '1500', label: '~1500 kcal', desc: 'Déficit pronunciado' },
  { id: '1800', label: '~1800 kcal', desc: 'Déficit moderado' },
  { id: '2000', label: '~2000 kcal', desc: 'Mantenimiento bajo' },
  { id: '2200', label: '~2200 kcal', desc: 'Mantenimiento estándar' },
  { id: '2500', label: '~2500 kcal', desc: 'Superávit moderado' },
  { id: '3000', label: '3000+ kcal', desc: 'Superávit pronunciado' },
];

const TOTAL_STEPS = 5;

interface NutritionAnswers {
  dietType:      string | null;
  restrictions:  string[];
  allergies:     string[];
  goal:          string | null;
  calories:      string | null;
}

export default function NutricionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<NutritionAnswers>({
    dietType:     null,
    restrictions: [],
    allergies:    [],
    goal:         null,
    calories:     null,
  });

  // Plan de nutrición subido por el nutriólogo (columnas nuevas, cliente sin tipar)
  const [planUrl, setPlanUrl] = useState('');
  const [nutritionistName, setNutritionistName] = useState('');
  const [savedPlanUrl, setSavedPlanUrl] = useState<string | null>(null);
  const [savedNutritionist, setSavedNutritionist] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState(false);

  // Carga el plan ya guardado (si existe) para mostrarlo al volver a la pantalla.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await db2.nutritionProfiles()
          .select('plan_url, nutritionist_name')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          setSavedPlanUrl((data as any).plan_url ?? null);
          setSavedNutritionist((data as any).nutritionist_name ?? null);
          setPlanUrl((data as any).plan_url ?? '');
          setNutritionistName((data as any).nutritionist_name ?? '');
        }
      } catch { /* tabla/columna puede no existir aún */ }
    })();
  }, [userId]);

  const savePlan = async () => {
    const url = planUrl.trim();
    const name = nutritionistName.trim();
    if (!url) return;
    setPlanSaving(true);
    if (userId) {
      try {
        await db2.nutritionProfiles().upsert({
          user_id:           userId,
          plan_url:          url,
          nutritionist_name: name || null,
          updated_at:        new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch { /* tabla/columna puede no existir aún */ }
    }
    setSavedPlanUrl(url);
    setSavedNutritionist(name || null);
    setPlanSaving(false);
  };

  const openPlan = () => {
    if (savedPlanUrl) Linking.openURL(savedPlanUrl).catch(() => {});
  };

  const toggleMulti = (field: 'restrictions' | 'allergies', id: string) => {
    setAnswers(prev => {
      const current = prev[field];
      if (id === 'ninguna') return { ...prev, [field]: ['ninguna'] };
      const withoutNinguna = current.filter(x => x !== 'ninguna');
      if (withoutNinguna.includes(id)) {
        return { ...prev, [field]: withoutNinguna.filter(x => x !== id) };
      }
      return { ...prev, [field]: [...withoutNinguna, id] };
    });
  };

  const canNext = () => {
    switch (step) {
      case 1: return !!answers.dietType;
      case 2: return answers.restrictions.length > 0;
      case 3: return answers.allergies.length > 0;
      case 4: return !!answers.goal;
      case 5: return !!answers.calories;
      default: return false;
    }
  };

  const saveProfile = async () => {
    if (!userId) { setSaved(true); return; }
    try {
      await db2.nutritionProfiles().upsert({
        user_id:      userId,
        diet_type:    answers.dietType,
        restrictions: answers.restrictions,
        allergies:    answers.allergies,
        goal:         answers.goal,
        calories:     answers.calories ? parseInt(answers.calories) : null,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch { /* tabla puede no existir aún */ }
    setSaved(true);
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      await saveProfile();
    }
  };

  const progressPct = `${((step - 1) / TOTAL_STEPS) * 100}%` as any;

  // Sección reutilizable: plan de nutrición (subir/ver el plan del nutriólogo).
  const PlanSection = (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <MaterialIcons name="description" size={18} color={palette.goldText} />
        <Text style={styles.planTitle}>PLAN DE NUTRICIÓN</Text>
      </View>

      {savedPlanUrl ? (
        <Pressable onPress={openPlan} style={styles.planSaved} accessibilityRole="button" accessibilityLabel="Abrir plan de nutrición guardado">
          <MaterialIcons name="insert-drive-file" size={22} color={palette.goldText} />
          <View style={styles.planSavedText}>
            <Text style={styles.planSavedLabel} numberOfLines={1}>Plan guardado</Text>
            {!!savedNutritionist && (
              <Text style={styles.planSavedMeta} numberOfLines={1}>Por {savedNutritionist}</Text>
            )}
          </View>
          <MaterialIcons name="open-in-new" size={18} color={palette.ash} />
        </Pressable>
      ) : (
        <Text style={styles.planEmptyText}>
          Sube el plan que te entregó tu nutriólogo (enlace a un PDF o imagen) para tenerlo siempre a mano.
        </Text>
      )}

      <Text style={styles.planInputLabel}>ENLACE DEL PLAN (PDF / IMAGEN)</Text>
      <TextInput
        style={styles.planInput}
        value={planUrl}
        onChangeText={setPlanUrl}
        placeholder="https://…"
        placeholderTextColor={palette.smoke}
        autoCapitalize="none"
        keyboardType="url"
        accessibilityLabel="Enlace del plan de nutrición"
      />
      <Text style={styles.planInputLabel}>NUTRIÓLOGO (OPCIONAL)</Text>
      <TextInput
        style={styles.planInput}
        value={nutritionistName}
        onChangeText={setNutritionistName}
        placeholder="Nombre del profesional"
        placeholderTextColor={palette.smoke}
        accessibilityLabel="Nombre del nutriólogo (opcional)"
      />
      <Pressable
        onPress={savePlan}
        disabled={planSaving || !planUrl.trim()}
        accessibilityRole="button"
        accessibilityLabel={savedPlanUrl ? 'Actualizar plan de nutrición' : 'Agregar plan de nutrición'}
        accessibilityState={{ disabled: planSaving || !planUrl.trim() }}
        style={[styles.planSaveBtn, (planSaving || !planUrl.trim()) && styles.planSaveBtnDisabled]}
      >
        <MaterialIcons name="upload-file" size={16} color={(planSaving || !planUrl.trim()) ? palette.ash : palette.ink} />
        <Text style={[styles.planSaveBtnText, (planSaving || !planUrl.trim()) && { color: palette.ash }]}>
          {planSaving ? 'GUARDANDO…' : savedPlanUrl ? 'ACTUALIZAR PLAN' : 'AGREGAR PLAN DE NUTRICIÓN'}
        </Text>
      </Pressable>
    </View>
  );

  if (saved) {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
          <Text style={styles.title}>NUTRICIÓN</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successContainer}>
            <MaterialIcons name="check-circle" size={64} color={palette.goldText} />
            <Text style={styles.successTitle}>PERFIL GUARDADO</Text>
            <Text style={styles.successSub}>
              Tu perfil nutricional está configurado.{'\n'}
              Dieta {DIET_TYPES.find(d => d.id === answers.dietType)?.label ?? ''} ·{' '}
              {answers.calories} kcal/día
            </Text>
          </View>

          {PlanSection}

          <Pressable onPress={() => router.back()} style={styles.doneBtn} accessibilityRole="button" accessibilityLabel="Volver al hub">
            <Text style={styles.doneBtnText}>VOLVER AL HUB</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={step > 1 ? () => setStep(step - 1) : () => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={step > 1 ? 'Paso anterior' : 'Volver'}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.title}>NUTRICIÓN</Text>
        <Text style={styles.stepCounter}>{step}/{TOTAL_STEPS}</Text>
      </View>

      {/* Progress bar */}
      <View
        style={styles.progressBar}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Paso ${step} de ${TOTAL_STEPS}`}
        accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step }}>
        <View style={[styles.progressFill, { width: progressPct }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* PASO 1 — Tipo de dieta */}
        {step === 1 && (
          <View>
            <Text style={styles.questionTitle}>¿Cuál es tu tipo de alimentación?</Text>
            <Text style={styles.questionSub}>Selecciona el que mejor describe tu estilo actual.</Text>
            {DIET_TYPES.map(d => (
              <Pressable
                key={d.id}
                onPress={() => setAnswers(prev => ({ ...prev, dietType: d.id }))}
                accessibilityRole="radio"
                accessibilityLabel={`${d.label}: ${d.desc}`}
                accessibilityState={{ selected: answers.dietType === d.id }}
                style={[styles.optionRow, answers.dietType === d.id && styles.optionRowActive]}
              >
                <View style={[styles.optionIcon, answers.dietType === d.id && styles.optionIconActive]}>
                  <MaterialIcons name={d.icon as any} size={20} color={answers.dietType === d.id ? palette.ink : palette.goldText} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, answers.dietType === d.id && { color: palette.ink }]}>{d.label}</Text>
                  <Text style={[styles.optionDesc,  answers.dietType === d.id && { color: 'rgba(0,0,0,0.6)' }]}>{d.desc}</Text>
                </View>
                {answers.dietType === d.id && (
                  <MaterialIcons name="check-circle" size={20} color={palette.ink} />
                )}
              </Pressable>
            ))}

            {/* Plan de nutrición — accesible desde el inicio del wizard */}
            {PlanSection}
          </View>
        )}

        {/* PASO 2 — Restricciones */}
        {step === 2 && (
          <View>
            <Text style={styles.questionTitle}>¿Tienes restricciones alimenticias?</Text>
            <Text style={styles.questionSub}>Puedes seleccionar varias.</Text>
            <View style={styles.chipGrid}>
              {RESTRICTIONS.map(r => {
                const selected = answers.restrictions.includes(r.id);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => toggleMulti('restrictions', r.id)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={r.label}
                    accessibilityState={{ checked: selected }}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* PASO 3 — Alergias */}
        {step === 3 && (
          <View>
            <Text style={styles.questionTitle}>¿Tienes alergias alimentarias?</Text>
            <Text style={styles.questionSub}>Puedes seleccionar varias.</Text>
            <View style={styles.chipGrid}>
              {ALLERGIES.map(a => {
                const selected = answers.allergies.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => toggleMulti('allergies', a.id)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={a.label}
                    accessibilityState={{ checked: selected }}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* PASO 4 — Objetivo */}
        {step === 4 && (
          <View>
            <Text style={styles.questionTitle}>¿Cuál es tu objetivo principal?</Text>
            <Text style={styles.questionSub}>Define tu norte nutricional.</Text>
            <View style={styles.goalGrid}>
              {GOALS.map(g => {
                const selected = answers.goal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setAnswers(prev => ({ ...prev, goal: g.id }))}
                    accessibilityRole="radio"
                    accessibilityLabel={g.label}
                    accessibilityState={{ selected }}
                    style={[styles.goalCard, selected && styles.goalCardActive]}
                  >
                    <MaterialIcons name={g.icon as any} size={28} color={selected ? palette.ink : palette.goldText} />
                    <Text style={[styles.goalLabel, selected && { color: palette.ink }]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* PASO 5 — Calorías */}
        {step === 5 && (
          <View>
            <Text style={styles.questionTitle}>¿Cuántas calorías consumes al día?</Text>
            <Text style={styles.questionSub}>Una estimación aproximada es suficiente.</Text>
            {CALORIE_RANGES.map(c => (
              <Pressable
                key={c.id}
                onPress={() => setAnswers(prev => ({ ...prev, calories: c.id }))}
                accessibilityRole="radio"
                accessibilityLabel={`${c.label}: ${c.desc}`}
                accessibilityState={{ selected: answers.calories === c.id }}
                style={[styles.calRow, answers.calories === c.id && styles.calRowActive]}
              >
                <View style={styles.calLeft}>
                  <Text style={[styles.calLabel, answers.calories === c.id && { color: palette.ink }]}>{c.label}</Text>
                  <Text style={[styles.calDesc,  answers.calories === c.id && { color: 'rgba(0,0,0,0.6)' }]}>{c.desc}</Text>
                </View>
                {answers.calories === c.id && (
                  <MaterialIcons name="check-circle" size={20} color={palette.ink} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Botón siguiente */}
        <Pressable
          onPress={handleNext}
          disabled={!canNext()}
          accessibilityRole="button"
          accessibilityLabel={step === TOTAL_STEPS ? 'Guardar perfil' : 'Continuar'}
          accessibilityState={{ disabled: !canNext() }}
          style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
        >
          <Text style={[styles.nextBtnText, !canNext() && { color: palette.ash }]}>
            {step === TOTAL_STEPS ? 'GUARDAR PERFIL' : 'CONTINUAR'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: palette.black },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:          { padding: 8 },
  title:            { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },
  stepCounter:      { fontFamily: Fonts.mono, fontSize: 13, color: palette.goldText, width: 38, textAlign: 'right' },

  progressBar:      { height: 2, backgroundColor: palette.line, marginHorizontal: spacing.md },
  progressFill:     { height: '100%', backgroundColor: palette.gold },

  content:          { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40 },

  questionTitle:    { fontFamily: Fonts.display, fontSize: 20, color: palette.ivory, letterSpacing: 1, marginBottom: 8 },
  questionSub:      { ...typography.caption, color: palette.ash, marginBottom: spacing.lg },

  optionRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, marginBottom: 8, gap: spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  optionRowActive:  { backgroundColor: palette.gold, borderColor: palette.gold },
  optionIcon:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212,175,55,0.1)', alignItems: 'center', justifyContent: 'center' },
  optionIconActive: { backgroundColor: 'rgba(0,0,0,0.15)' },
  optionText:       { flex: 1 },
  optionLabel:      { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, fontWeight: '600' },
  optionDesc:       { fontSize: 11, color: palette.ash, marginTop: 2 },

  chipGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:             { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphite },
  chipActive:       { backgroundColor: palette.gold, borderColor: palette.gold },
  chipText:         { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },
  chipTextActive:   { color: palette.ink, fontWeight: '600' },

  goalGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard:         { width: '47%', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' },
  goalCardActive:   { backgroundColor: palette.gold, borderColor: palette.gold },
  goalLabel:        { fontFamily: Fonts.sans, fontSize: 12, color: palette.ivory, textAlign: 'center', fontWeight: '600' },

  calRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  calRowActive:     { backgroundColor: palette.gold, borderColor: palette.gold },
  calLeft:          { flex: 1 },
  calLabel:         { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory },
  calDesc:          { fontSize: 11, color: palette.ash, marginTop: 2 },

  nextBtn:          { backgroundColor: palette.gold, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  nextBtnDisabled:  { backgroundColor: palette.graphite },
  nextBtnText:      { fontFamily: Fonts.display, fontSize: 14, color: palette.ink, letterSpacing: 2 },

  successContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: 16 },
  successTitle:     { fontFamily: Fonts.display, fontSize: 22, color: palette.goldText, letterSpacing: 2 },
  successSub:       { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 22 },
  doneBtn:          { backgroundColor: palette.gold, borderRadius: radii.md, paddingVertical: 14, paddingHorizontal: 32, marginTop: spacing.lg, alignSelf: 'center' },
  doneBtnText:      { fontFamily: Fonts.display, fontSize: 14, color: palette.ink, letterSpacing: 2 },

  planCard:         { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: palette.lineGoldSubtle, gap: spacing.sm },
  planHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle:        { ...typography.label, color: palette.goldText, fontSize: 11 },
  planEmptyText:    { fontSize: 12, color: palette.ash, lineHeight: 18 },
  planSaved:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.goldLight, borderRadius: radii.sm, padding: spacing.sm, borderWidth: 1, borderColor: palette.lineGold },
  planSavedText:    { flex: 1 },
  planSavedLabel:   { fontFamily: Fonts.sans, fontSize: 13, color: palette.ivory, fontWeight: '600' },
  planSavedMeta:    { fontSize: 11, color: palette.ash, marginTop: 2 },
  planInputLabel:   { ...typography.label, color: palette.ash, fontSize: 9, marginTop: 4 },
  planInput:        { backgroundColor: palette.black, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line, padding: spacing.sm, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 13 },
  planSaveBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.gold, borderRadius: radii.sm, padding: spacing.sm, marginTop: 4 },
  planSaveBtnDisabled:{ backgroundColor: palette.charcoal },
  planSaveBtnText:  { fontFamily: Fonts.display, fontSize: 12, color: palette.ink, letterSpacing: 1 },
});
