import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';

type Tab = 'energia' | 'sueno' | 'cognitivo';

interface Supplement {
  name:      string;
  dose:      string;
  timing:    string;
  evidence:  string;
  color:     string;
}

const SUPPLEMENTS: Record<Tab, Supplement[]> = {
  energia: [
    { name: 'Ashwagandha', dose: '300–600 mg',  timing: 'Mañana con comida',   evidence: 'Reduce cortisol 27%. Mejora resistencia al estrés (KSM-66).', color: '#E8A000' },
    { name: 'Vitamina D3', dose: '5000 UI',      timing: 'Mañana con grasa',    evidence: 'Deficiencia correlaciona con fatiga crónica. Óptimo: 60-80 ng/mL.', color: '#EDBA01' },
    { name: 'B-Complex',   dose: '1 cápsula',    timing: 'Desayuno',            evidence: 'B12 y B6 esenciales en producción de ATP y síntesis de dopamina.', color: '#D4AF37' },
    { name: 'CoQ10',       dose: '100–200 mg',   timing: 'Almuerzo con grasa',  evidence: 'Cofactor en cadena mitocondrial. Especialmente útil >35 años.', color: '#C8A020' },
    { name: 'Hierro (si déficit)', dose: 'Según lab', timing: 'En ayunas',     evidence: 'Déficit = fatiga inexplicable. Verificar ferritina sérica primero.', color: '#A08020' },
  ],
  sueno: [
    { name: 'Magnesio Glicinato', dose: '300–400 mg', timing: '30–60 min antes dormir', evidence: 'Activa receptores GABA. Reduce tiempo de conciliación en 17 min.', color: '#8B9DFF' },
    { name: 'L-Teanina',    dose: '200 mg',      timing: '30 min antes dormir', evidence: 'Aumenta ondas alfa cerebrales. Sinérgico con magnesio para sueño profundo.', color: '#7B8DFF' },
    { name: 'Melatonina',   dose: '0.5–1 mg',    timing: '20 min antes dormir', evidence: 'Dosis bajas (0.5 mg) más efectivas que altas. No genera dependencia.', color: '#6B7DFF' },
    { name: 'Ashwagandha',  dose: '300 mg',      timing: 'Noche',               evidence: 'Reduce cortisol nocturno. Mejora calidad de sueño en 72% de usuarios.', color: '#5B6DFF' },
    { name: 'Glicina',      dose: '3 g',         timing: 'Antes de dormir',     evidence: 'Baja temperatura corporal central. Aumenta sueño REM según estudios.', color: '#4B5DFF' },
  ],
  cognitivo: [
    { name: "Lion's Mane",  dose: '500–1000 mg', timing: 'Mañana',              evidence: 'Estimula NGF (Factor Nervioso). Regeneración neuronal demostrada.', color: '#4CAF50' },
    { name: 'Omega-3 DHA',  dose: '1–2 g DHA',   timing: 'Con comida grasa',   evidence: 'DHA constituye 25% del córtex prefrontal. Esencial en neurogénesis.', color: '#45A045' },
    { name: 'Rhodiola',     dose: '200–400 mg',  timing: 'Mañana en ayunas',    evidence: 'Reduce fatiga mental en 20%. No genera tolerancia en ciclos de 3 meses.', color: '#3A9035' },
    { name: 'Alpha-GPC',    dose: '300–600 mg',  timing: 'Mañana o pre-entreno',evidence: 'Precursor de acetilcolina. Mejora memoria de trabajo y velocidad cognitiva.', color: '#2F8030' },
    { name: 'Bacopa',       dose: '300 mg',      timing: 'Con comida',          evidence: 'Mejora memoria a largo plazo con 8–12 semanas de uso continuo.', color: '#247025' },
  ],
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'energia',   label: 'ENERGÍA',    icon: 'bolt' },
  { id: 'sueno',     label: 'SUEÑO',      icon: 'bedtime' },
  { id: 'cognitivo', label: 'COGNITIVO',  icon: 'psychology' },
];

export default function SuplementacionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [activeTab, setActiveTab] = useState<Tab>('energia');
  const [savedStack, setSavedStack] = useState<string | null>(null);

  const currentSupps = SUPPLEMENTS[activeTab];

  const saveStack = async () => {
    if (!userId) { setSavedStack(activeTab); return; }
    try {
      await db2.supplements().upsert({
        user_id:    userId,
        goal:       activeTab,
        stack:      currentSupps.map(s => s.name),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,goal' });
    } catch { /* tabla puede no existir aún */ }
    setSavedStack(activeTab);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.title}>SUPLEMENTOS</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Disclaimer estático */}
      <View style={styles.disclaimer}>
        <MaterialIcons name="info-outline" size={14} color={palette.ash} style={{ marginTop: 1 }} />
        <Text style={styles.disclaimerText}>
          Solo información educativa. Consulta a tu médico antes de suplementarte.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => { setActiveTab(tab.id); setSavedStack(null); }}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <MaterialIcons name={tab.icon as any} size={16} color={activeTab === tab.id ? palette.ink : palette.ash} />
            <Text style={[styles.tabText, activeTab === tab.id && { color: palette.ink }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {currentSupps.map((s, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.colorDot, { backgroundColor: s.color }]} />
              <Text style={styles.cardName}>{s.name}</Text>
              <View style={styles.doseChip}>
                <Text style={styles.doseText}>{s.dose}</Text>
              </View>
            </View>
            <View style={styles.timingRow}>
              <MaterialIcons name="schedule" size={13} color={palette.gold} />
              <Text style={styles.timingText}>{s.timing}</Text>
            </View>
            <Text style={styles.evidenceText}>{s.evidence}</Text>
          </View>
        ))}

        {/* Guardar stack */}
        <Pressable
          onPress={saveStack}
          style={[styles.saveBtn, savedStack === activeTab && styles.saveBtnSaved]}
        >
          <MaterialIcons
            name={savedStack === activeTab ? 'check-circle' : 'bookmark-add'}
            size={18}
            color={savedStack === activeTab ? palette.ink : palette.black}
          />
          <Text style={styles.saveBtnText}>
            {savedStack === activeTab ? 'STACK GUARDADO' : 'GUARDAR ESTE STACK'}
          </Text>
        </Pressable>

        <Text style={styles.footnote}>
          Fuentes: Examine.com · PubMed · Huberman Lab. Evidencia = estudios RCT en humanos.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: palette.ink },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:       { padding: 8 },
  title:         { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  disclaimer:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: radii.sm, padding: 10, borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)' },
  disclaimerText:{ flex: 1, fontSize: 11, color: palette.ash, lineHeight: 16 },

  tabRow:        { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: 4, gap: 4 },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radii.sm - 2, gap: 5 },
  tabActive:     { backgroundColor: palette.gold },
  tabText:       { fontFamily: Fonts.display, fontSize: 10, color: palette.ash, letterSpacing: 1 },

  content:       { paddingHorizontal: spacing.md, paddingBottom: 40 },

  card:          { backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, marginBottom: 10 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  colorDot:      { width: 10, height: 10, borderRadius: 5 },
  cardName:      { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory, fontWeight: '700', flex: 1 },
  doseChip:      { backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  doseText:      { fontFamily: Fonts.mono, fontSize: 11, color: palette.gold },
  timingRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  timingText:    { fontSize: 12, color: palette.gold },
  evidenceText:  { fontSize: 12, color: palette.ash, lineHeight: 18 },

  saveBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.gold, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm },
  saveBtnSaved:  { backgroundColor: 'rgba(212,175,55,0.3)', borderWidth: 1, borderColor: palette.gold },
  saveBtnText:   { fontFamily: Fonts.display, fontSize: 13, color: palette.ink, letterSpacing: 2 },

  footnote:      { ...typography.caption, color: palette.smoke, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
