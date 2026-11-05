/**
 * Tu calma — una mirada semanal a las emociones que te habitaron.
 *
 * Antes era la "Escala de consciencia" de Hawkins con números en "Hz" (no son
 * hercios: era un dato falso con apariencia científica), una barra roja de
 * FUERZA contra PODER y emociones calificadas de 20 a 700. Eso es culpa
 * explícita. Ahora la acción es marcar lo que sentiste; sin escala ni nota.
 *
 * Ronda 2: la lista seguía siendo la escalera de Hawkins sin números (de
 * Vergüenza a Plenitud, con "Razón" o "Neutralidad", que nadie siente). Ahora
 * son emociones cotidianas en orden alfabético: nada se lee como ranking.
 *
 * El `hz` de cada emoción queda SOLO como identificador interno: es lo que ya
 * está guardado en `consciencia:weekly` y no se muestra en ningún sitio. Se
 * reusan los ids viejos donde la emoción es la misma, y `LEGACY` traduce el
 * resto al cargar, así una semana ya guardada no se pierde.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/pantalla';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing } from '@/constants/theme';
import { readLocal, writeLocal } from '@/storage/local';

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface Emotion {
  /** Identificador persistido (histórico). No se muestra. */
  hz: number;
  name: string;
  /** Algo concreto que puedes hacer si la reconoces. */
  advice: string;
}

// Ronda 3: sustantivos, no adjetivos en masculino. Mismos ids que antes (1:1),
// así que lo ya guardado se lee igual. Orden alfabético: nada es un ranking.
const EMOTIONS: Emotion[] = [
  { hz: 1002, name: 'Agobio',    advice: 'Escribe todo lo pendiente y elige solo una cosa para hoy.' },
  { hz: 540,  name: 'Alegría',   advice: 'Compártela. Fíjate qué la hizo posible.' },
  { hz: 100,  name: 'Ansiedad',  advice: 'Respira lento unos minutos. Nombra qué te preocupa. Da un paso pequeño.' },
  { hz: 600,  name: 'Calma',     advice: 'Quédate un rato aquí. No hace falta resolver nada.' },
  { hz: 50,   name: 'Cansancio', advice: 'Tu cuerpo pide pausa. Duerme antes hoy y baja el ritmo.' },
  { hz: 500,  name: 'Cariño',    advice: 'Dale las gracias a quien te hizo sentir así.' },
  { hz: 310,  name: 'Energía',   advice: 'Aprovéchala: elige una cosa que te importa y muévete.' },
  { hz: 400,  name: 'Enfoque',   advice: 'Protege ese rato: avisos fuera y una sola tarea.' },
  { hz: 150,  name: 'Enojo',     advice: 'Muévete fuerte un rato. El enojo avisa de algo: ¿qué límite se cruzó?' },
  { hz: 1001, name: 'Gratitud',  advice: 'Dilo en voz alta o escríbeselo a alguien. Así dura más.' },
  { hz: 200,  name: 'Seguridad', advice: 'Buen momento para decidir lo que venías aplazando.' },
  { hz: 1003, name: 'Soledad',   advice: 'Escríbele hoy a alguien de confianza. Un mensaje basta.' },
  { hz: 75,   name: 'Tristeza',  advice: 'Permite sentirla sin pelear con ella. Escribir ayuda.' },
];

/** Ids de la escala vieja → la emoción cotidiana más cercana (para semanas ya guardadas). */
const LEGACY: Record<number, number> = {
  20: 75, 30: 75, 125: 310, 175: 540, 250: 600, 350: 600, 700: 600,
};
/** Normaliza ids guardados: traduce los viejos y quita duplicados. */
export function migrateMarked(ids: number[]): number[] {
  return [...new Set(ids.map((h) => LEGACY[h] ?? h))].filter((h) => EMOTIONS.some((e) => e.hz === h));
}

// ─── Calibración semanal (local) ───────────────────────────────────────────────
const WEEKLY_KEY = 'consciencia:weekly';

interface WeeklyCalibration {
  week: string;     // 'YYYY-Www'
  hz: number[];     // ids de las emociones marcadas
  savedAt: string;  // ISO timestamp
}

// Identificador de semana ISO (estable, sin dependencias externas).
function isoWeekId(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function AntesDeEmpezar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Antes de empezar" style={s.antes}>
        <Text style={s.antesLabel}>ANTES DE EMPEZAR</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={palette.smoke} />
      </Pressable>
      {open && <View style={{ paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConscienciaScreen() {
  const thisWeek = isoWeekId();
  const [marked, setMarked] = useState<number[]>([]);
  const [last, setLast] = useState<Emotion | null>(null);
  const [saved, setSaved] = useState<WeeklyCalibration | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await readLocal<WeeklyCalibration>(WEEKLY_KEY);
      if (stored && stored.week === thisWeek) {
        setSaved(stored);
        setMarked(migrateMarked(stored.hz ?? []));
      }
    })();
  }, [thisWeek]);

  const toggle = useCallback((e: Emotion) => {
    haptic();
    setSaved(null);
    const on = marked.includes(e.hz);
    setLast(on ? null : e);
    setMarked(on ? marked.filter((h) => h !== e.hz) : [...marked, e.hz]);
  }, [marked]);

  const save = useCallback(async () => {
    const entry: WeeklyCalibration = {
      week: thisWeek,
      hz: [...marked].sort((a, b) => a - b),
      savedAt: new Date().toISOString(),
    };
    await writeLocal(WEEKLY_KEY, entry);
    setSaved(entry);
    haptic();
  }, [thisWeek, marked]);

  const empty = marked.length === 0;

  return (
    <Pantalla
      meta="BIENESTAR · MENTE"
      metaRight="ESTA SEMANA"
      title="Tu calma"
      sub="¿Qué sentiste esta semana? Marca lo que reconozcas. No es una nota: es una mirada honesta.">
      <View style={s.grid}>
        {EMOTIONS.map((e) => {
          const on = marked.includes(e.hz);
          return (
            <View key={e.hz} style={s.cellWrap}>
              <Pressable
                onPress={() => toggle(e)}
                style={({ pressed }) => [s.cell, on && s.cellOn, pressed && s.pressed]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={e.name}>
                <MaterialIcons name={on ? 'check-box' : 'check-box-outline-blank'} size={20} color={on ? palette.goldText : palette.smoke} />
                <Text style={[s.cellText, on && s.cellTextOn]} numberOfLines={1}>{e.name}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {last && <Text style={s.advice}>{last.name}: {last.advice}</Text>}

      <Pressable
        onPress={save}
        disabled={empty || !!saved}
        style={[s.btn, (empty || saved) && s.btnOff]}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Semana guardada' : 'Guardar mi semana'}
        accessibilityState={{ disabled: empty || !!saved }}>
        <Text style={[s.btnText, (empty || saved) && s.btnTextOff]}>
          {saved ? 'GUARDADO' : 'GUARDAR MI SEMANA'}
        </Text>
      </Pressable>
      <Text style={s.hint}>
        {saved
          ? `Marcaste ${saved.hz.length} esta semana. Puedes cambiarlo cuando quieras.`
          : empty ? 'Marca al menos una para guardar.' : `${marked.length} marcadas.`}
      </Text>

      <AntesDeEmpezar>
        <SafetyWarning
          title="HERRAMIENTA DE AUTOEXPLORACIÓN"
          body="Esta es una herramienta de autoexploración, no un diagnóstico ni tratamiento."
        />
      </AntesDeEmpezar>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  antes: { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },

  // 3 columnas fijas: mismo ancho en todas las celdas, nada desalineado.
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cellWrap: { width: '33.333%', padding: 4 },
  // Sin borde (ronda 3): casilla + palabra, como las filas de Suplementos.
  cell: {
    minHeight: 48, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 8,
  },
  // Marcada: superficie + casilla llena + negrita. El amarillo queda para guardar.
  cellOn: { backgroundColor: palette.charcoal },
  pressed: { opacity: 0.8 },
  cellText: { flexShrink: 1, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 20, color: palette.ivory },
  cellTextOn: { fontWeight: '700' },

  advice: { marginTop: spacing.lg, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },

  btn: { marginTop: spacing.xl, height: 52, borderRadius: radii.sm, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  // Deshabilitado: contorno gris y texto apagado; el amarillo solo cuando se puede guardar.
  btnOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.lineHard },
  btnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1.5, color: palette.ink },
  btnTextOff: { color: palette.smoke },
  hint: { marginTop: spacing.sm, marginBottom: spacing.xl, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.smoke },
});
