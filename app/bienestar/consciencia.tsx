/**
 * Tu calma — una mirada semanal a las emociones que te habitaron.
 *
 * Antes era la "Escala de consciencia" de Hawkins con números en "Hz" (no son
 * hercios: era un dato falso con apariencia científica), una barra roja de
 * FUERZA contra PODER y emociones calificadas de 20 a 700. Eso es culpa
 * explícita. Ahora la acción es marcar lo que sentiste; sin escala ni nota.
 *
 * El `hz` de cada emoción queda SOLO como identificador interno: es lo que ya
 * está guardado en `consciencia:weekly` y no se muestra en ningún sitio.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fila, Pantalla } from '@/components/pantalla';
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

const EMOTIONS: Emotion[] = [
  { hz: 20,  name: 'Vergüenza',   advice: 'Habla con alguien de confianza. Un gesto amable contigo: luz, movimiento, aire libre.' },
  { hz: 30,  name: 'Culpa',       advice: 'Quédate con lo que aprendiste y suelta el resto. Trátate como tratarías a un amigo.' },
  { hz: 50,  name: 'Apatía',      advice: 'Una sola acción mínima. Sal del espacio donde estás. Conecta con algo vivo.' },
  { hz: 75,  name: 'Pena',        advice: 'Permite sentirla sin pelear con ella. Escribir ayuda.' },
  { hz: 100, name: 'Miedo',       advice: 'Respira lento unos minutos. Nombra el miedo exacto. Da un paso pequeño.' },
  { hz: 125, name: 'Deseo',       advice: 'Distingue lo que quieres de lo que necesitas. Agradece lo que ya tienes.' },
  { hz: 150, name: 'Ira',         advice: 'Muévete fuerte un rato. La ira trae información: ¿qué límite se cruzó?' },
  { hz: 175, name: 'Orgullo',     advice: 'Escucha otra mirada con curiosidad, sin defenderte.' },
  { hz: 200, name: 'Valentía',    advice: 'Aprovéchala: da un paso concreto hacia lo que te importa.' },
  { hz: 250, name: 'Neutralidad', advice: 'Buen punto de partida. Desde aquí decides con claridad.' },
  { hz: 310, name: 'Disposición', advice: 'Tienes ganas de hacer. Elige una cosa y muévete.' },
  { hz: 350, name: 'Aceptación',  advice: 'Buen momento para el trabajo profundo y para conectar.' },
  { hz: 400, name: 'Razón',       advice: 'Comparte lo que entiendes: enseña, escribe, diseña.' },
  { hz: 500, name: 'Amor',        advice: 'Cuida con quién y en qué pones esta energía.' },
  { hz: 540, name: 'Alegría',     advice: 'Compártela. Dar las gracias la sostiene.' },
  { hz: 600, name: 'Paz',         advice: 'Quédate un rato aquí. No hace falta resolver nada.' },
  { hz: 700, name: 'Plenitud',    advice: 'Nada que alcanzar. Solo estar.' },
];

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
  const router = useRouter();
  const thisWeek = isoWeekId();
  const [marked, setMarked] = useState<number[]>([]);
  const [last, setLast] = useState<Emotion | null>(null);
  const [saved, setSaved] = useState<WeeklyCalibration | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await readLocal<WeeklyCalibration>(WEEKLY_KEY);
      if (stored && stored.week === thisWeek) {
        setSaved(stored);
        setMarked(stored.hz ?? []);
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
                <Text style={[s.cellText, on && s.cellTextOn]} numberOfLines={2}>{e.name}</Text>
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
      <Fila label="VOLVER" value="Bienestar" onPress={() => router.back()} last />
    </Pantalla>
  );
}

const s = StyleSheet.create({
  antes: { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },

  // 3 columnas fijas: mismo ancho en todas las celdas, nada desalineado.
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cellWrap: { width: '33.333%', padding: 4 },
  cell: {
    minHeight: 52, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineHard,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 8,
  },
  // Marcada: borde fuerte + superficie + negrita, legible en los dos temas. El amarillo
  // queda para el botón de guardar.
  cellOn: { backgroundColor: palette.charcoal, borderColor: palette.ivory, borderWidth: 2 },
  pressed: { opacity: 0.8 },
  cellText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 18, color: palette.ivory, textAlign: 'center' },
  cellTextOn: { fontWeight: '700' },

  advice: { marginTop: spacing.lg, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },

  btn: { marginTop: spacing.xl, height: 52, borderRadius: radii.sm, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  btnOff: { backgroundColor: palette.charcoal },
  btnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1.5, color: palette.ink },
  btnTextOff: { color: palette.ash },
  hint: { marginTop: spacing.sm, marginBottom: spacing.xl, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.smoke },
});
