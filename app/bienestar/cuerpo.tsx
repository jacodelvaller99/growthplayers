import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { db2 } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { Fonts, palette, radii, spacing } from '@/constants/theme';
import { Fila, Pantalla } from '@/components/pantalla';

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
// Placeholder = solo la unidad: un número de ejemplo parecía un dato ya cargado.
const EXTRA_FIELDS = [
  { key: 'waist_cm',         label: 'CINTURA',      unit: 'cm' },
  { key: 'chest_cm',         label: 'PECHO',        unit: 'cm' },
  { key: 'hip_cm',           label: 'CADERA',       unit: 'cm' },
  { key: 'thigh_cm',         label: 'MUSLO',        unit: 'cm' },
  { key: 'arm_cm',           label: 'BRAZO',        unit: 'cm' },
  { key: 'body_fat_percent', label: 'GRASA',        unit: '%'  },
  { key: 'muscle_mass_kg',   label: 'MASA MUSCULAR', unit: 'kg' },
] as const;

type ExtraKey = typeof EXTRA_FIELDS[number]['key'];
const EMPTY_EXTRAS: Record<ExtraKey, string> = {
  waist_cm: '', chest_cm: '', hip_cm: '', thigh_cm: '', arm_cm: '',
  body_fat_percent: '', muscle_mass_kg: '',
};

function calcBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const hm = height / 100;
  return Math.round((weight / (hm * hm)) * 10) / 10;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function Plegable({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        style={styles.antes}>
        <Text style={styles.antesLabel}>{label.toUpperCase()}</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={palette.smoke} />
      </Pressable>
      {open && <View style={styles.plegado}>{children}</View>}
    </View>
  );
}

function Campo({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.campo}>
      {/* La unidad vive en la etiqueta: el placeholder desaparece al escribir. */}
      <Text style={styles.inputLabel}>{label} ({unit.toUpperCase()})</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={unit}
        placeholderTextColor={palette.smoke}
        accessibilityLabel={`${label.toLowerCase()} en ${unit}`}
      />
    </View>
  );
}

export default function CuerpoScreen() {
  const { userId } = useLifeFlow();

  const [weight, setWeight]   = useState('');
  const [height, setHeight]   = useState('');
  const [extras, setExtras]   = useState<Record<ExtraKey, string>>(EMPTY_EXTRAS);
  const [history, setHistory] = useState<Measurement[]>([]);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setExtra = (key: ExtraKey, val: string) =>
    setExtras(prev => ({ ...prev, [key]: val }));

  const weightNum = parseFloat(weight) || 0;
  const heightNum = parseFloat(height) || 0;
  const bmi       = calcBMI(weightNum, heightNum);
  const canSave   = !saving && !!weightNum && !!heightNum;

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
    if (!userId) { setSaveError('No hay una sesión abierta: inicia sesión para guardar.'); return; }
    setSaving(true);
    setSaveError(null);
    // numérico o null para cada medida opcional
    const num = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };
    try {
      const { error } = await db2.bodyMeasurements().insert({
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
      if (error) throw error;
      setWeight('');
      setHeight('');
      setExtras(EMPTY_EXTRAS);
      loadHistory();
    } catch (e) {
      logSilentError('medidas.save', e);
      setSaveError('No se pudo guardar. Inténtalo de nuevo.');
    }
    setSaving(false);
  };

  const last = history[0];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla
        meta="BIENESTAR · CUERPO"
        metaRight={last?.created_at ? `ÚLTIMO ${formatDate(last.created_at)}` : undefined}
        title="Medidas"
        sub="Peso y medidas, sin juicio. Solo para ver cómo cambias."
        hero={
          // La única acción amarilla: registrar hoy, con lo mínimo (peso y altura).
          <View style={styles.oro}>
            <Text style={styles.oroMeta}>REGISTRAR HOY</Text>
            <View style={styles.oroRow}>
              <View style={styles.campo}>
                <Text style={styles.oroLabel}>PESO (KG)</Text>
                <TextInput
                  style={styles.oroInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Peso en kilogramos"
                />
              </View>
              <View style={styles.campo}>
                <Text style={styles.oroLabel}>ALTURA (CM)</Text>
                <TextInput
                  style={styles.oroInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Altura en centímetros"
                />
              </View>
            </View>
            <Pressable
              onPress={saveMeasurement}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Guardar medición"
              accessibilityState={{ disabled: !canSave }}
              style={[styles.oroBtn, !canSave && styles.oroBtnOff]}>
              <Text style={[styles.oroBtnText, !canSave && styles.oroBtnTextOff]}>{saving ? 'GUARDANDO…' : 'GUARDAR'}</Text>
            </Pressable>
            {saveError ? (
              <Text style={styles.oroHint} accessibilityRole="alert">{saveError}</Text>
            ) : !weightNum || !heightNum ? (
              <Text style={styles.oroHint}>Escribe peso y altura para guardar.</Text>
            ) : null}
          </View>
        }>
        {/* IMC: un dato neutro, sin zonas ni rojo. */}
        <Fila label="ÍNDICE DE MASA CORPORAL (IMC)" value={bmi > 0 ? bmi.toFixed(1) : last?.bmi ? String(last.bmi) : '—'} />

        <Plegable label="Más medidas">
          <View style={styles.grid}>
            {EXTRA_FIELDS.map(f => (
              <Campo key={f.key} label={f.label} unit={f.unit} value={extras[f.key]} onChange={(v) => setExtra(f.key, v)} />
            ))}
          </View>
          <Text style={styles.hint}>Se guardan junto con el peso y la altura.</Text>
        </Plegable>

        <View style={styles.historial}>
          <Text style={styles.antesLabel}>REGISTROS</Text>
          {history.length === 0 ? (
            <Text style={styles.hint}>Aún no hay registros. Empieza con tu peso y altura.</Text>
          ) : (
            history.map((m, i) => {
              // medidas extra presentes → línea compacta de detalle
              const extraParts: string[] = [];
              if (m.waist_cm != null)         extraParts.push(`Cintura ${m.waist_cm}`);
              if (m.chest_cm != null)         extraParts.push(`Pecho ${m.chest_cm}`);
              if (m.hip_cm != null)           extraParts.push(`Cadera ${m.hip_cm}`);
              if (m.thigh_cm != null)         extraParts.push(`Muslo ${m.thigh_cm}`);
              if (m.arm_cm != null)           extraParts.push(`Brazo ${m.arm_cm}`);
              if (m.body_fat_percent != null) extraParts.push(`Grasa ${m.body_fat_percent}%`);
              if (m.muscle_mass_kg != null)   extraParts.push(`Músculo ${m.muscle_mass_kg} kg`);
              return (
                <Fila
                  key={m.id ?? i}
                  label={m.created_at ? formatDate(m.created_at) : `#${i + 1}`}
                  value={`${m.weight_kg} kg · IMC ${m.bmi}` + (extraParts.length ? ` · ${extraParts.join(' · ')}` : '')}
                  last={i === history.length - 1}
                />
              );
            })
          )}
        </View>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: palette.black },

  oro:        { borderRadius: 8, backgroundColor: palette.gold, padding: 22, gap: 16 },
  oroMeta:    { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink },
  oroRow:     { flexDirection: 'row', gap: spacing.md },
  oroLabel:   { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink, marginBottom: 6 },
  oroInput:   { minHeight: 52, borderBottomWidth: 2, borderBottomColor: palette.ink, color: palette.ink, fontFamily: Fonts.displayRegular, fontSize: 28 },
  oroBtn:     { minHeight: 52, borderRadius: radii.sm, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  // Deshabilitado: contorno y texto de tinta al 40 % — se lee apagado, no activo.
  oroBtnOff:  { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.ink, opacity: 0.4 },
  oroBtnTextOff: { color: palette.ink },
  oroBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 2, color: palette.gold },
  oroHint:    { fontFamily: Fonts.sans, fontSize: 14, color: palette.ink },

  campo:      { flex: 1, minWidth: 130 },
  inputLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, marginBottom: 6 },
  input:      { minHeight: 44, borderBottomWidth: 1, borderBottomColor: palette.lineHard, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 17 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  hint:       { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash, marginTop: spacing.sm },

  antes:      { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  plegado:    { paddingBottom: 16 },

  historial:  { marginTop: 32, gap: 8 },

});
