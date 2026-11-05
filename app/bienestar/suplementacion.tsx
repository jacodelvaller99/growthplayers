import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
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
import { Pantalla } from '@/components/pantalla';
import { Fonts, palette, radii, spacing } from '@/constants/theme';

// Los ids se quedan como están: son la columna `goal` de supplement_stacks.
type Tab = 'energia' | 'sueno' | 'cognitivo';

// Catálogo SIN dosis: la dosis es la que indica el médico, no la app.
// Cada línea dice en llano para qué se usa y qué tan firme es la evidencia.
interface Supplement { name: string; what: string }

// Entrada estructurada persistida en supplement_stacks.supplements (jsonb).
interface StackItem {
  name:     string;
  dose:     string;
  timing:   string;
  category: Tab;
}

const SUPPLEMENTS: Record<Tab, Supplement[]> = {
  energia: [
    { name: 'Vitamina D3',  what: 'Sirve si un análisis muestra que te falta.' },
    { name: 'Complejo B',   what: 'Vitaminas B. Sirven si te faltan; si no, no suman energía.' },
    { name: 'Hierro',       what: 'Solo si un análisis de sangre muestra que te falta.' },
    { name: 'Ashwagandha',  what: 'Planta estudiada para el estrés. La evidencia aún es limitada.' },
    { name: 'CoQ10',        what: 'Se estudia para la energía. En personas sanas, la evidencia es débil.' },
  ],
  sueno: [
    { name: 'Magnesio',     what: 'Mineral. Algunos estudios pequeños lo relacionan con mejor descanso.' },
    { name: 'Melatonina',   what: 'Útil para el desfase horario. Para uso corto; consúltalo.' },
    { name: 'L-teanina',    what: 'Componente del té. Evidencia preliminar para relajarte.' },
    { name: 'Glicina',      what: 'Aminoácido. Evidencia preliminar para dormir.' },
  ],
  cognitivo: [
    { name: 'Omega-3',          what: 'Grasas del pescado. Importantes para el corazón y el cerebro.' },
    { name: 'Rhodiola',         what: 'Planta estudiada para el cansancio. Evidencia limitada.' },
    { name: 'Bacopa',           what: 'Planta. Efecto leve en memoria tras semanas, según algunos estudios.' },
    { name: 'Melena de león',   what: 'Hongo. La evidencia en personas es muy preliminar.' },
  ],
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'energia',   label: 'ENERGÍA' },
  { id: 'sueno',     label: 'SUEÑO' },
  { id: 'cognitivo', label: 'CONCENTRACIÓN' },
];

type Mine = Record<string, { dose: string; timing: string }>;
const key = (tab: Tab, name: string) => `${tab}:${name}`;

export default function SuplementacionScreen() {
  const { userId } = useLifeFlow();

  const [activeTab, setActiveTab] = useState<Tab>('energia');
  // Lo que TÚ tomas: presencia en el mapa = lo tomas. Sin dosis precargadas.
  const [mine, setMine] = useState<Mine>({});
  // idle = sin cambios desde lo cargado; dirty = hay algo sin guardar.
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saved' | 'error' | 'nosession'>('idle');
  const [saving, setSaving] = useState(false);

  // Carga lo guardado (estructurado).
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data, error } = await db2.supplements()
          .select('goal, supplements')
          .eq('user_id', userId);
        if (error) throw error;
        if (!Array.isArray(data)) return;
        const next: Mine = {};
        for (const row of data as any[]) {
          const goal = row.goal as Tab;
          const items = row.supplements;
          if (!Array.isArray(items)) continue;
          for (const it of items) {
            if (it && typeof it === 'object' && it.name) {
              next[key(goal, it.name)] = { dose: it.dose ?? '', timing: it.timing ?? '' };
            }
          }
        }
        if (Object.keys(next).length) setMine(prev => ({ ...next, ...prev }));
      } catch (e) { logSilentError('suplementos.load', e); }
    })();
  }, [userId]);

  const toggle = (name: string) => {
    setMine(prev => {
      const k = key(activeTab, name);
      if (prev[k]) {
        const rest = { ...prev };
        delete rest[k];
        return rest;
      }
      return { ...prev, [k]: { dose: '', timing: '' } };
    });
    setStatus('dirty');
  };

  const setField = (name: string, field: 'dose' | 'timing', value: string) => {
    setMine(prev => {
      const k = key(activeTab, name);
      return { ...prev, [k]: { ...(prev[k] ?? { dose: '', timing: '' }), [field]: value } };
    });
    setStatus('dirty');
  };

  const saveStack = async () => {
    if (!userId) { setStatus('nosession'); return; }
    // Las tres pestañas en una sola escritura; desmarcar todo y guardar = quitarlos.
    const now = new Date().toISOString();
    const rows = TABS.map(({ id }) => {
      const structured: StackItem[] = SUPPLEMENTS[id]
        .filter(s => mine[key(id, s.name)])
        .map(s => ({ name: s.name, ...mine[key(id, s.name)], category: id }));
      return {
        user_id:     userId,
        goal:        id,
        supplements: structured,
        // legacy: mantiene el array de nombres por compatibilidad con lecturas viejas
        stack:       structured.map(s => s.name),
        updated_at:  now,
      };
    });
    setSaving(true);
    try {
      const { error } = await db2.supplements().upsert(rows, { onConflict: 'user_id,goal' });
      if (error) throw error;
      setStatus('saved');
    } catch (e) {
      logSilentError('suplementos.save', e);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const total = TABS.reduce((n, { id }) => n + SUPPLEMENTS[id].filter(s => mine[key(id, s.name)]).length, 0);
  const off = saving || status === 'idle' || status === 'saved';
  const label = saving ? 'GUARDANDO…'
    : status === 'saved' ? 'GUARDADO'
    : total === 0 ? 'GUARDAR (NINGUNO)'
    : `GUARDAR ${total} ${total === 1 ? 'SUPLEMENTO' : 'SUPLEMENTOS'}`;
  const hint = status === 'saved' ? `Guardado. ${total === 0 ? 'Ninguno marcado.' : `${total} en total.`}`
    : status === 'error' ? 'No se pudo guardar. Inténtalo de nuevo.'
    : status === 'nosession' ? 'No hay una sesión abierta: inicia sesión para guardar.'
    : 'Tu dosis: la que te indicó tu médico.';
  const alerta = status === 'error' || status === 'nosession';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla
        meta="BIENESTAR · SALUD"
        title="Suplementos"
        sub="Marca lo que ya tomas y cuándo. Para tenerlo claro, no para empezar algo nuevo."
        hero={
          // La única acción amarilla, arriba: guarda las tres listas a la vez.
          <View>
            <Pressable
              onPress={saveStack}
              disabled={off}
              style={[styles.saveBtn, off && styles.saveOff]}
              accessibilityRole="button"
              accessibilityLabel={label.toLowerCase()}
              accessibilityState={{ disabled: off }}>
              <Text style={[styles.saveText, off && styles.saveTextOff]}>{label}</Text>
            </Pressable>
            <Text
              style={[styles.hint, alerta && styles.hintAlert]}
              accessibilityRole={alerta ? 'alert' : undefined}
              accessibilityLiveRegion="polite">
              {hint}
            </Text>
          </View>
        }>
        <Text style={styles.note}>
          Solo información educativa. Consulta a tu médico antes de tomar cualquier suplemento.
        </Text>

        {/* Pestañas: texto subrayado, sin relleno amarillo. */}
        <View style={styles.tabRow} accessibilityRole="tablist">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, active && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Suplementos para ${tab.label.toLowerCase()}`}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {SUPPLEMENTS[activeTab].map((s, i) => {
          const entry = mine[key(activeTab, s.name)];
          const on = !!entry;
          return (
            <View key={s.name} style={[styles.row, i === SUPPLEMENTS[activeTab].length - 1 && styles.rowLast]}>
              <Pressable
                onPress={() => toggle(s.name)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Lo tomo: ${s.name}`}
                style={styles.rowHead}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.what}>{s.what}</Text>
                  {on && !!entry.timing && <Text style={styles.timing}>{entry.timing}</Text>}
                </View>
                <MaterialIcons
                  name={on ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={on ? palette.goldText : palette.smoke}
                />
              </Pressable>
              {on && (
                <View style={styles.edit}>
                  <Text style={styles.inputLabel}>TU DOSIS</Text>
                  <TextInput
                    style={styles.input}
                    value={entry.dose}
                    onChangeText={(v) => setField(s.name, 'dose', v)}
                    placeholder="La que te indicó tu médico"
                    placeholderTextColor={palette.smoke}
                    accessibilityLabel={`Tu dosis de ${s.name}, la que te indicó tu médico`}
                  />
                  <Text style={styles.inputLabel}>CUÁNDO</Text>
                  <TextInput
                    style={styles.input}
                    value={entry.timing}
                    onChangeText={(v) => setField(s.name, 'timing', v)}
                    placeholder="Por ejemplo: con el desayuno"
                    placeholderTextColor={palette.smoke}
                    accessibilityLabel={`Cuándo tomas ${s.name}`}
                  />
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footnote}>
          Fuente: Oficina de Suplementos Dietéticos de los NIH (ods.od.nih.gov) y estudios en humanos publicados en PubMed.
        </Text>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: palette.black },

  note:          { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash, marginBottom: spacing.lg },

  tabRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.sm },
  tab:           { minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: palette.ivory },
  tabText:       { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  tabTextActive: { color: palette.ivory },

  row:           { borderTopWidth: 1, borderTopColor: palette.line },
  rowLast:       { borderBottomWidth: 1, borderBottomColor: palette.line },
  rowHead:       { minHeight: 56, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText:       { flex: 1, gap: 2 },
  name:          { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  what:          { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash },
  timing:        { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, color: palette.ash },

  edit:          { paddingBottom: spacing.md, gap: 4 },
  inputLabel:    { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, marginTop: spacing.sm },
  input:         { minHeight: 44, borderBottomWidth: 1, borderBottomColor: palette.lineHard, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 16 },

  saveBtn:       { minHeight: 52, borderRadius: radii.sm, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  // Deshabilitado: contorno gris y texto apagado (mismo patrón que Tu calma y Diario).
  saveOff:       { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.lineHard },
  saveTextOff:   { color: palette.smoke },
  hintAlert:     { color: palette.dangerText },
  saveText:      { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 2, color: palette.ink },
  hint:          { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash, marginTop: spacing.sm },

  footnote:      { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, color: palette.smoke, marginTop: spacing.xl },

});
