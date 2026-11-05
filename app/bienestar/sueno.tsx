import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette } from '@/constants/theme';
import { SLEEP_MUSIC } from '@/data/wellness';
import { getSleepScript, sleepSegmentsToPhases } from '@/data/sleep';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useBinauralEngine } from '@/hooks/useBinauralEngine';

// ─── Catálogo ────────────────────────────────────────────────────────────────
// Rediseño: cada sesión se nombra por para qué sirve (label) y luego por su
// título llano. Los `id` casan con los guiones de `data/sleep/` — no tocar.
interface SleepItem {
  id: string;
  /** Para qué sirve — palabra del usuario, no de la técnica. */
  label: string;
  title: string;
  minutes: number;
  /** Música de fondo: el descanso guiado usa su propia cama. */
  music: 'nidra' | 'descenso';
}

const SLEEP_ITEMS: SleepItem[] = [
  { id: 'sos-1',    label: 'SI NO PUEDES DORMIR',  title: 'Calma de emergencia',      minutes: 5,  music: 'descenso' },
  { id: 'sos-2',    label: 'RECORRE TU CUERPO',    title: 'Recorrido rápido',         minutes: 8,  music: 'descenso' },
  { id: 'relax-2',  label: 'RESPIRA LENTO',        title: 'Respiración para la noche', minutes: 10, music: 'descenso' },
  { id: 'relax-1',  label: 'SUELTA LA TENSIÓN',    title: 'Relajación muscular',      minutes: 15, music: 'descenso' },
  { id: 'nidra-1',  label: 'DESCANSO GUIADO',      title: 'Relajación guiada para empezar', minutes: 20, music: 'nidra' },
  { id: 'nidra-2',  label: 'DESCANSO LARGO',       title: 'Relajación guiada completa', minutes: 40, music: 'nidra' },
  // Historias: la etiqueta es su nombre (antes "UNA HISTORIA" tres veces).
  { id: 'story-1',  label: 'HISTORIA · EL BOSQUE',   title: 'El bosque de secuoyas',    minutes: 20, music: 'descenso' },
  { id: 'story-3',  label: 'HISTORIA · LA MONTAÑA',  title: 'Cabaña en las montañas',   minutes: 18, music: 'descenso' },
  { id: 'story-2',  label: 'HISTORIA · EL MAR',      title: 'La orilla del mar',        minutes: 25, music: 'descenso' },
];

function AntesDeEmpezar({ children }: { children: React.ReactNode }) {
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

export default function SuenoScreen() {
  const router = useRouter();
  const engine = useBinauralEngine();
  // La pantalla abre con TU lectura (y dice de dónde sale); sin lectura no se
  // inventa un dato.
  const { latestCheckIn } = useLifeFlow();
  const sleepReading = latestCheckIn?.sleep ?? null;

  // Propuesta: si dormiste mal o es de madrugada, lo corto; si no, el descanso guiado.
  const hour = new Date().getHours();
  const suggested = SLEEP_ITEMS.find((i) =>
    i.id === ((sleepReading !== null && sleepReading <= 4) || hour < 5 ? 'sos-1' : 'nidra-1'),
  )!;
  const rest = SLEEP_ITEMS.filter((i) => i.id !== suggested.id);

  const sub = sleepReading !== null
    ? `Anoche: ${sleepReading}/10 en tu check-in. Elige una, apaga la pantalla y escucha.`
    : 'Elige una, apaga la pantalla y escucha.';

  function handlePlay(item: SleepItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // `getSleepScript` casa por id; sin guión la sesión suena igual (cama + tono).
    const script = getSleepScript(item.id);
    const narration = script ? sleepSegmentsToPhases(script) : undefined;
    // Pista de sueño + tono suave debajo. El engine global maneja timer,
    // mini-player, stop y guardar la sesión.
    engine.start({
      carrierHz: 100,
      beatHz: 2,
      sessionName: item.title,
      targetSeconds: item.minutes * 60,
      waveVolume: 0.2,
      bgVolume: 0,
      musicUrl: SLEEP_MUSIC[item.music],
      narration,
    });
    // De vuelta al hub para que se vea el mini-player.
    router.back();
  }

  return (
    <Pantalla
      meta="BIENESTAR · CALMA"
      title="Sueño"
      sub={sub}
      hero={
        <TarjetaOro
          meta="PARA ESTA NOCHE"
          metaRight={`${suggested.minutes} MIN`}
          title={suggested.label.charAt(0) + suggested.label.slice(1).toLowerCase()}
          detail={`${suggested.title}, ${suggested.minutes}\u00A0min.`}
          onPress={() => handlePlay(suggested)}
          accessibilityLabel={`Empezar: ${suggested.title}, ${suggested.minutes} minutos`}
        />
      }>
      {rest.map((item) => (
        <Fila
          key={item.id}
          label={item.label}
          // Valor corto con espacio duro: en 390 px "5 min" no se parte.
          value={`${item.minutes}\u00A0min`}
          onPress={() => handlePlay(item)}
        />
      ))}
      <AntesDeEmpezar>
        <SafetyWarning
          body="Estas prácticas favorecen el descanso, pero no tratan el insomnio crónico, la apnea del sueño ni otros trastornos. Si tienes problemas de sueño persistentes, consulta a un profesional de la salud. No las uses mientras conduces u operas maquinaria."
        />
      </AntesDeEmpezar>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  antes: { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
});
