import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { Fonts, palette, radii, spacing } from '@/constants/theme';

type Option = { id: string; label: string; desc?: string };

const DIET_TYPES: Option[] = [
  { id: 'omnivoro',     label: 'Omnívoro',     desc: 'Como de todo: carne, verduras, granos.' },
  { id: 'vegetariano',  label: 'Vegetariano',  desc: 'Sin carne. Incluye lácteos y huevos.' },
  { id: 'vegano',       label: 'Vegano',       desc: 'Solo alimentos de origen vegetal.' },
  { id: 'keto',         label: 'Keto',         desc: 'Alta en grasas, muy baja en carbohidratos.' },
  { id: 'carnivoro',    label: 'Carnívoro',    desc: 'Solo carne, pescado y huevos.' },
  { id: 'mediterraneo', label: 'Mediterráneo', desc: 'Aceite de oliva, pescado, vegetales, legumbres.' },
  { id: 'paleo',        label: 'Paleo',        desc: 'Sin procesados, lácteos ni granos.' },
];

const RESTRICTIONS: Option[] = [
  { id: 'gluten',    label: 'Sin gluten' },
  { id: 'lactosa',   label: 'Sin lactosa' },
  { id: 'azucar',    label: 'Sin azúcar' },
  { id: 'sal',       label: 'Bajo en sal' },
  { id: 'ninguna',   label: 'Ninguna' },
];

const ALLERGIES: Option[] = [
  { id: 'frutos_secos', label: 'Frutos secos' },
  { id: 'mariscos',     label: 'Mariscos' },
  { id: 'huevos',       label: 'Huevos' },
  { id: 'soja',         label: 'Soja' },
  { id: 'ninguna',      label: 'Ninguna' },
];

const GOALS: Option[] = [
  { id: 'perder_grasa',    label: 'Perder grasa' },
  { id: 'ganar_musculo',   label: 'Ganar músculo' },
  { id: 'energia',         label: 'Más energía' },
  { id: 'longevidad',      label: 'Vivir más y mejor' },
  { id: 'rendimiento',     label: 'Rendir más' },
  { id: 'mantenimiento',   label: 'Mantenerme como estoy' },
];

const CALORIE_RANGES: Option[] = [
  { id: '1500', label: '~1500 kcal', desc: 'Comer bastante menos' },
  { id: '1800', label: '~1800 kcal', desc: 'Comer algo menos' },
  { id: '2000', label: '~2000 kcal', desc: 'Lo justo, en bajo' },
  { id: '2200', label: '~2200 kcal', desc: 'Lo justo' },
  { id: '2500', label: '~2500 kcal', desc: 'Comer algo más' },
  { id: '3000', label: '3000+ kcal', desc: 'Comer bastante más' },
];

const TOTAL_STEPS = 5;

const STEPS: { q: string; sub: string; multi?: 'restrictions' | 'allergies'; single?: 'dietType' | 'goal' | 'calories'; options: Option[] }[] = [
  { q: '¿Cómo comes?',               sub: 'Elige la que más se parece a tu día.', single: 'dietType', options: DIET_TYPES },
  { q: '¿Evitas algo?',              sub: 'Puedes elegir varias.',                multi: 'restrictions', options: RESTRICTIONS },
  { q: '¿Tienes alergias?',          sub: 'Puedes elegir varias.',                multi: 'allergies', options: ALLERGIES },
  { q: '¿Qué buscas?',               sub: 'Elige una.',                           single: 'goal', options: GOALS },
  { q: '¿Cuánto comes al día?',      sub: 'Una idea aproximada basta.',           single: 'calories', options: CALORIE_RANGES },
];

interface NutritionAnswers {
  dietType:      string | null;
  restrictions:  string[];
  allergies:     string[];
  goal:          string | null;
  calories:      string | null;
}

export default function NutricionScreen() {
  const router = useRouter();
  const { userId } = useLifeFlow();

  // 0 = pantalla principal; 1..5 = paso de las preguntas.
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<NutritionAnswers>({
    dietType:     null,
    restrictions: [],
    allergies:    [],
    goal:         null,
    calories:     null,
  });
  const [savedProfile, setSavedProfile] = useState<{ diet: string | null; calories: number | null } | null>(null);

  // Plan de nutrición del nutriólogo: es un ENLACE (PDF o imagen), no una subida.
  const [planUrl, setPlanUrl] = useState('');
  const [nutritionistName, setNutritionistName] = useState('');
  const [savedPlanUrl, setSavedPlanUrl] = useState<string | null>(null);
  const [savedNutritionist, setSavedNutritionist] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  // Carga el plan y el perfil ya guardados (si existen).
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await db2.nutritionProfiles()
          .select('plan_url, nutritionist_name, diet_type, calories')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          const d = data as any;
          setSavedPlanUrl(d.plan_url ?? null);
          setSavedNutritionist(d.nutritionist_name ?? null);
          setPlanUrl(d.plan_url ?? '');
          setNutritionistName(d.nutritionist_name ?? '');
          if (d.diet_type) setSavedProfile({ diet: d.diet_type, calories: d.calories ?? null });
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
    setPlanOpen(false);
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
    if (userId) {
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
    }
    setSavedProfile({ diet: answers.dietType, calories: answers.calories ? parseInt(answers.calories) : null });
    setStep(0);
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else await saveProfile();
  };

  const backBtn = (
    <Pressable
      onPress={step > 0 ? () => setStep(step - 1) : () => router.back()}
      style={styles.backBtn}
      accessibilityRole="button"
      accessibilityLabel={step > 1 ? 'Paso anterior' : 'Volver'}>
      <MaterialIcons name="arrow-back" size={20} color={palette.ivory} />
      <Text style={styles.backText}>{step > 1 ? 'ANTERIOR' : 'VOLVER'}</Text>
    </Pressable>
  );

  // ── Preguntas: una por pantalla, un solo botón amarillo «Seguir». ──
  if (step > 0) {
    const cfg = STEPS[step - 1];
    const isSelected = (id: string) =>
      cfg.multi ? answers[cfg.multi].includes(id) : answers[cfg.single!] === id;
    const ok = canNext();
    return (
      <Pantalla
        meta="NUTRICIÓN"
        metaRight={`${step} DE ${TOTAL_STEPS}`}
        title={cfg.q}
        sub={cfg.sub}
        footer={backBtn}>
        {cfg.options.map((o, i) => {
          const sel = isSelected(o.id);
          return (
            <Pressable
              key={o.id}
              onPress={() => cfg.multi
                ? toggleMulti(cfg.multi, o.id)
                : setAnswers(prev => ({ ...prev, [cfg.single!]: o.id }))}
              accessibilityRole={cfg.multi ? 'checkbox' : 'radio'}
              accessibilityLabel={o.desc ? `${o.label}: ${o.desc}` : o.label}
              accessibilityState={cfg.multi ? { checked: sel } : { selected: sel }}
              style={[styles.option, i === cfg.options.length - 1 && styles.optionLast]}>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{o.label}</Text>
                {!!o.desc && <Text style={styles.optionDesc}>{o.desc}</Text>}
              </View>
              <MaterialIcons
                name={sel ? (cfg.multi ? 'check-box' : 'radio-button-checked') : (cfg.multi ? 'check-box-outline-blank' : 'radio-button-unchecked')}
                size={22}
                color={sel ? palette.goldText : palette.smoke}
              />
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleNext}
          disabled={!ok}
          accessibilityRole="button"
          accessibilityLabel={step === TOTAL_STEPS ? 'Guardar' : 'Seguir'}
          accessibilityState={{ disabled: !ok }}
          style={[styles.seguir, !ok && styles.seguirOff]}>
          <Text style={styles.seguirText}>{step === TOTAL_STEPS ? 'GUARDAR' : 'SEGUIR'}</Text>
        </Pressable>
        {!ok && <Text style={styles.hint}>Elige una opción para seguir.</Text>}
      </Pantalla>
    );
  }

  // ── Principal: una acción (abrir tu plan, o responder 5 preguntas) + filas. ──
  const dietLabel = DIET_TYPES.find(d => d.id === savedProfile?.diet)?.label;
  const profileValue = savedProfile
    ? `${dietLabel ?? 'Guardado'}${savedProfile.calories ? ` · ${savedProfile.calories} kcal` : ''}`
    : 'Responder 5 preguntas';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla
        meta="BIENESTAR · CUERPO"
        title="Nutrición"
        sub="Tu plan de comidas, en un solo lugar."
        hero={savedPlanUrl ? (
          <TarjetaOro
            meta="TU PLAN"
            title="Abrir tu plan"
            detail={savedNutritionist ? `De ${savedNutritionist}.` : 'El enlace que guardaste.'}
            onPress={openPlan}
          />
        ) : (
          <TarjetaOro
            meta="EMPIEZA AQUÍ"
            title={savedProfile ? 'Actualiza cómo comes' : 'Cuéntanos cómo comes'}
            detail="Cinco preguntas cortas. Menos de un minuto."
            onPress={() => setStep(1)}
          />
        )}
        footer={backBtn}>
        <Fila label="CÓMO COMES" value={profileValue} onPress={() => setStep(1)} />
        <Fila
          label="TU PLAN DEL NUTRIÓLOGO"
          value={savedPlanUrl ? (savedNutritionist ? `Guardado · ${savedNutritionist}` : 'Guardado') : 'Pega el enlace de tu plan'}
          onPress={() => setPlanOpen(o => !o)}
          last={!planOpen}
        />
        {planOpen && (
          <View style={styles.plan}>
            <Text style={styles.hint}>
              Pega el enlace de tu plan (un PDF o una imagen en Drive, Dropbox o similar) para tenerlo siempre a mano.
            </Text>
            <Text style={styles.inputLabel}>ENLACE DEL PLAN</Text>
            <TextInput
              style={styles.input}
              value={planUrl}
              onChangeText={setPlanUrl}
              placeholder="https://…"
              placeholderTextColor={palette.smoke}
              autoCapitalize="none"
              keyboardType="url"
              accessibilityLabel="Enlace del plan de nutrición"
            />
            <Text style={styles.inputLabel}>NUTRIÓLOGO (OPCIONAL)</Text>
            <TextInput
              style={styles.input}
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
              accessibilityLabel={savedPlanUrl ? 'Actualizar enlace del plan' : 'Guardar enlace del plan'}
              accessibilityState={{ disabled: planSaving || !planUrl.trim() }}
              style={[styles.secondary, (planSaving || !planUrl.trim()) && styles.seguirOff]}>
              <Text style={styles.secondaryText}>
                {planSaving ? 'GUARDANDO…' : savedPlanUrl ? 'ACTUALIZAR ENLACE' : 'GUARDAR ENLACE'}
              </Text>
            </Pressable>
          </View>
        )}
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: palette.black },

  option:        { minHeight: 56, paddingVertical: 14, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionLast:    { borderBottomWidth: 1, borderBottomColor: palette.line },
  optionText:    { flex: 1, gap: 2 },
  optionLabel:   { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  optionDesc:    { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash },

  seguir:        { marginTop: spacing.xl, minHeight: 52, borderRadius: radii.sm, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  seguirOff:     { opacity: 0.4 },
  seguirText:    { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 2, color: palette.ink },
  hint:          { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash, marginTop: spacing.sm },

  plan:          { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
  inputLabel:    { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, marginTop: spacing.sm },
  input:         { minHeight: 44, borderBottomWidth: 1, borderBottomColor: palette.lineHard, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 16 },
  secondary:     { marginTop: spacing.sm, minHeight: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineHard, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12, letterSpacing: 1, color: palette.ivory },

  backBtn:       { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText:      { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ivory },
});
