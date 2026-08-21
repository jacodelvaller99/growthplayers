import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';
import { HeroPanel, RowList } from '@/components/focus-deck';

interface Measurement {
  id?: string;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  waist_cm?: number | null;
  chest_cm?: number | null;
  hip_cm?: number | null;
  thigh_cm?: number | null;
  arm_cm?: number | null;
  body_fat_percent?: number | null;
  muscle_mass_kg?: number | null;
  created_at?: string;
}

// Medidas corporales opcionales (columnas nuevas de body_measurements).
const EXTRA_FIELDS = [
  { key: 'waist_cm',         label: 'CINTURA (cm)',   placeholder: '80'   },
  { key: 'chest_cm',         label: 'PECHO (cm)',     placeholder: '100'  },
  { key: 'hip_cm',           label: 'CADERA (cm)',    placeholder: '95'   },
  { key: 'thigh_cm',         label: 'MUSLO (cm)',     placeholder: '55'   },
  { key: 'arm_cm',           label: 'BRAZO (cm)',     placeholder: '35'   },
  { key: 'body_fat_percent', label: '% GRASA',        placeholder: '15'   },
  { key: 'muscle_mass_kg',   label: 'M. MUSCULAR (kg)', placeholder: '35' },
] as const;

type ExtraKey = typeof EXTRA_FIELDS[number]['key'];

function calcBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const hm = height / 100;
  return Math.round((weight / (hm * hm)) * 10) / 10;
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi <= 0)   return { label: '—',          color: palette.ash };
  // Tokens, no hex: este color es a la vez el relleno del segmento Y el TEXTO de
  // la categoría. Un hex constante no puede pasar AA en claro y oscuro a la vez
  // (sobre #111111 exige luminancia >= 0.201; sobre blanco <= 0.183), así que la
  // escala tenía que ser tematizable o quedarse ilegible en uno de los dos.
  if (bmi < 18.5) return { label: 'Bajo peso',  color: palette.info };
  if (bmi < 25)   return { label: 'Normal',      color: palette.success };
  if (bmi < 30)   return { label: 'Sobrepeso',   color: palette.warning };
  return              { label: 'Obesidad',    color: palette.danger };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function CuerpoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [weight, setWeight]   = useState('');
  const [height, setHeight]   = useState('');
  const [extras, setExtras]   = useState<Record<ExtraKey, string>>({
    waist_cm: '', chest_cm: '', hip_cm: '', thigh_cm: '', arm_cm: '',
    body_fat_percent: '', muscle_mass_kg: '',
  });
  const [history, setHistory] = useState<Measurement[]>([]);
  const [saving, setSaving]   = useState(false);

  const setExtra = (key: ExtraKey, val: string) =>
    setExtras(prev => ({ ...prev, [key]: val }));

  const weightNum = parseFloat(weight) || 0;
  const heightNum = parseFloat(height) || 0;
  const bmi       = calcBMI(weightNum, heightNum);
  const category  = bmiCategory(bmi);

  const loadHistory = async () => {
    if (!userId) return;
    try {
      const { data } = await db2.bodyMeasurements()
        .select('id, weight_kg, height_cm, bmi, waist_cm, chest_cm, hip_cm, thigh_cm, arm_cm, body_fat_percent, muscle_mass_kg, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8);
      if (data) setHistory(data as Measurement[]);
    } catch {
      // columnas nuevas pueden no existir aún → reintenta con el set mínimo
      try {
        const { data } = await db2.bodyMeasurements()
          .select('id, weight_kg, height_cm, bmi, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(8);
        if (data) setHistory(data as Measurement[]);
      } catch { /* tabla puede no existir */ }
    }
  };

  useEffect(() => { loadHistory(); }, [userId]);

  const saveMeasurement = async () => {
    if (!weightNum || !heightNum) return;
    setSaving(true);
    // numérico o null para cada medida opcional
    const num = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    try {
      await db2.bodyMeasurements().insert({
        user_id:          userId,
        weight_kg:        weightNum,
        height_cm:        heightNum,
        bmi,
        waist_cm:         num(extras.waist_cm),
        chest_cm:         num(extras.chest_cm),
        hip_cm:           num(extras.hip_cm),
        thigh_cm:         num(extras.thigh_cm),
        arm_cm:           num(extras.arm_cm),
        body_fat_percent: num(extras.body_fat_percent),
        muscle_mass_kg:   num(extras.muscle_mass_kg),
      });
      setWeight('');
      setHeight('');
      setExtras({ waist_cm: '', chest_cm: '', hip_cm: '', thigh_cm: '', arm_cm: '', body_fat_percent: '', muscle_mass_kg: '' });
      loadHistory();
    } catch { /* tabla/columna puede no existir aún */ }
    setSaving(false);
  };

  // Últimas 8 mediciones como sparkline (índice inverso para mostrar cronológico)
  const sparkData = [...history].reverse();
  const maxW = sparkData.length ? Math.max(...sparkData.map(m => m.weight_kg)) : 1;
  const minW = sparkData.length ? Math.min(...sparkData.map(m => m.weight_kg)) : 0;
  const range = maxW - minW || 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
          <Text style={styles.title}>CUERPO</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* IMC en tiempo real */}
          <View style={styles.heroSpacer}>
            <HeroPanel>
              <View style={styles.bmiCard}>
                <Text style={styles.bmiLabel}>ÍNDICE DE MASA CORPORAL</Text>
                <Text style={[styles.bmiValue, { color: category.color }]}>
                  {bmi > 0 ? bmi.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.bmiCategory, { color: category.color }]}>{category.label}</Text>
                {/* Barra visual IMC */}
                <View style={styles.bmiBar}>
                  <View style={[styles.bmiSegment, { flex: 1, backgroundColor: palette.info }]} />
                  <View style={[styles.bmiSegment, { flex: 2, backgroundColor: palette.success }]} />
                  <View style={[styles.bmiSegment, { flex: 1.5, backgroundColor: palette.warning }]} />
                  <View style={[styles.bmiSegment, { flex: 1.5, backgroundColor: palette.danger }]} />
                </View>
                <View style={styles.bmiBarLabels}>
                  <Text style={styles.bmiBarTick}>18.5</Text>
                  <Text style={styles.bmiBarTick}>25</Text>
                  <Text style={styles.bmiBarTick}>30</Text>
                </View>
                {bmi > 0 && (
                  <View style={[styles.bmiPointer, { left: `${Math.min(Math.max((bmi - 15) / 20, 0), 1) * 100}%` as any }]} />
                )}
              </View>
            </HeroPanel>
          </View>

          {/* Formulario */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NUEVO REGISTRO</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PESO (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="75.0"
                  placeholderTextColor={palette.smoke}
                  accessibilityLabel="Peso en kilogramos"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ALTURA (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="175"
                  placeholderTextColor={palette.smoke}
                  accessibilityLabel="Altura en centímetros"
                />
              </View>
            </View>

            {/* Medidas corporales (opcionales) */}
            <Text style={styles.subLabel}>MEDIDAS (OPCIONAL)</Text>
            <View style={styles.measureGrid}>
              {EXTRA_FIELDS.map(f => (
                <View key={f.key} style={styles.measureGroup}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.measureInput}
                    value={extras[f.key]}
                    onChangeText={(v) => setExtra(f.key, v)}
                    keyboardType="decimal-pad"
                    placeholder={f.placeholder}
                    placeholderTextColor={palette.smoke}
                    accessibilityLabel={f.label}
                  />
                </View>
              ))}
            </View>

            <Pressable
              onPress={saveMeasurement}
              disabled={saving || !weightNum || !heightNum}
              accessibilityRole="button"
              accessibilityLabel="Guardar medición"
              accessibilityState={{ disabled: saving || !weightNum || !heightNum }}
              style={[styles.saveBtn, (saving || !weightNum || !heightNum) && styles.saveBtnDisabled]}
            >
              <Text style={[styles.saveBtnText, (saving || !weightNum || !heightNum) && { color: palette.ash }]}>
                {saving ? 'GUARDANDO…' : 'GUARDAR MEDICIÓN'}
              </Text>
            </Pressable>
          </View>

          {/* Sparkline histórico */}
          {sparkData.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HISTORIAL (últimas {sparkData.length})</Text>
              <View style={styles.sparklineContainer}>
                {sparkData.map((m, i) => {
                  const heightPct = ((m.weight_kg - minW) / range) * 60 + 20;
                  return (
                    <View key={i} style={styles.sparkColumn}>
                      <View style={[styles.sparkBar, { height: heightPct }]} />
                      <Text style={styles.sparkLabel}>{formatDate(m.created_at ?? '')}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.sparkRange}>
                <Text style={styles.sparkRangeText}>{minW} kg</Text>
                <Text style={styles.sparkRangeText}>{maxW} kg</Text>
              </View>
            </View>
          )}

          {/* Lista histórico */}
          {history.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>REGISTROS</Text>
              <RowList
                rows={history.map((m, i) => {
                  const cat = bmiCategory(m.bmi);
                  // medidas extra presentes → línea compacta de detalle
                  const extraParts: string[] = [];
                  if (m.waist_cm != null)         extraParts.push(`Cintura ${m.waist_cm}`);
                  if (m.chest_cm != null)         extraParts.push(`Pecho ${m.chest_cm}`);
                  if (m.hip_cm != null)           extraParts.push(`Cadera ${m.hip_cm}`);
                  if (m.thigh_cm != null)         extraParts.push(`Muslo ${m.thigh_cm}`);
                  if (m.arm_cm != null)           extraParts.push(`Brazo ${m.arm_cm}`);
                  if (m.body_fat_percent != null) extraParts.push(`Grasa ${m.body_fat_percent}%`);
                  if (m.muscle_mass_kg != null)   extraParts.push(`Músculo ${m.muscle_mass_kg}kg`);
                  const value = `${m.weight_kg}kg · IMC ${m.bmi} · ${cat.label}` +
                    (extraParts.length > 0 ? ` · ${extraParts.join(' · ')}` : '');
                  return {
                    label: m.created_at ? formatDate(m.created_at) : `#${i + 1}`,
                    value,
                  };
                })}
              />
            </View>
          )}

          {history.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="monitor-weight" size={48} color={palette.line} />
              <Text style={styles.emptyText}>Sin registros aún</Text>
              <Text style={styles.emptySubtext}>Ingresa tu peso y altura para comenzar</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: palette.black },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:            { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title:              { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  content:            { paddingHorizontal: spacing.md, paddingBottom: 40 },

  bmiCard:            { alignItems: 'center', gap: 4 },
  heroSpacer:         { marginBottom: spacing.lg },
  bmiLabel:           { ...typography.label, color: palette.goldText },
  bmiValue:           { fontFamily: Fonts.display, fontSize: 56, lineHeight: 64 },
  bmiCategory:        { fontFamily: Fonts.sans, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  bmiBar:             { flexDirection: 'row', width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  bmiSegment:         { height: '100%' },
  bmiBarLabels:       { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  bmiBarTick:         { fontSize: 10, color: palette.smoke },
  bmiPointer:         { position: 'absolute', bottom: 52, width: 3, height: 10, backgroundColor: palette.ivory, borderRadius: 1 },

  section:            { marginBottom: spacing.lg },
  sectionLabel:       { ...typography.label, color: palette.goldText, marginBottom: spacing.sm },

  inputRow:           { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  inputGroup:         { flex: 1 },
  inputLabel:         { ...typography.label, color: palette.ash, fontSize: 10, marginBottom: 6 },
  input:              { backgroundColor: palette.graphite, borderRadius: radii.sm, paddingHorizontal: spacing.sm, minHeight: 44, color: palette.ivory, fontFamily: Fonts.mono, fontSize: 18, borderWidth: 1, borderColor: palette.line },

  subLabel:           { ...typography.label, color: palette.smoke, fontSize: 9, marginBottom: spacing.sm },
  measureGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  measureGroup:       { width: '47%', flexGrow: 1 },
  measureInput:       { backgroundColor: palette.graphite, borderRadius: radii.sm, paddingHorizontal: spacing.sm, minHeight: 44, color: palette.ivory, fontFamily: Fonts.mono, fontSize: 15, borderWidth: 1, borderColor: palette.line },

  saveBtn:            { backgroundColor: palette.gold, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', minHeight: 44, justifyContent: 'center',
  },
  saveBtnDisabled:    { backgroundColor: palette.graphite },
  saveBtnText:        { fontFamily: Fonts.display, fontSize: 13, color: palette.ink, letterSpacing: 2 },

  sparklineContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm },
  sparkColumn:        { flex: 1, alignItems: 'center', gap: 4 },
  sparkBar:           { width: '100%', backgroundColor: palette.gold, borderRadius: 2, opacity: 0.8 },
  sparkLabel:         { fontSize: 9, color: palette.smoke },
  sparkRange:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sparkRangeText:     { fontSize: 10, color: palette.smoke },

  emptyState:         { alignItems: 'center', paddingVertical: spacing.xl, gap: 8 },
  emptyText:          { fontFamily: Fonts.display, fontSize: 16, color: palette.ash },
  emptySubtext:       { ...typography.caption, color: palette.smoke, textAlign: 'center' },
});
