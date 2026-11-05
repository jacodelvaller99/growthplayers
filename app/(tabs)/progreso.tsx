/**
 * Progreso — como el canvas: la racha en cifra gigante y, debajo, tu mes de
 * un vistazo (el mismo calendario que ve tu mentor, estilo Traineeks):
 * cinco indicadores y cada día con lo que hiciste. Sin trofeos de juguete:
 * el único premio es la racha de 7 días seguidos.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TrackingCalendar, type TrackingData } from '@/components/admin/TrackingCalendar';
import { Fila, Pantalla } from '@/components/pantalla';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { modulosNumerados, modulosTerminados } from '@/lib/modulosCuenta';
import { protocolSnapshot } from '@/lib/protocolSnapshot';

export default function ProgresoScreen() {
  const router = useRouter();
  const { state } = useLifeFlow();

  const wellness = useMemo(() => state.wellnessSessions ?? [], [state.wellnessSessions]);
  const count = (t: string) => wellness.filter((s) => s.type === t).length;

  // Día y racha: la MISMA función que Hoy (lib/protocolSnapshot).
  const snap = useMemo(() => protocolSnapshot({
    protocolStartDate: state.protocolStartDate,
    checkIns: state.checkIns,
    completedLessons: (state.completedLessons ?? []).length,
    completedTasks: Object.keys(state.completedTasks ?? {}).length,
    wellness: { meditation: count('meditation'), breathing: count('breathing'), binaural: count('binaural') },
    now: new Date(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state.protocolStartDate, state.checkIns, state.completedLessons, state.completedTasks, wellness]);

  // Tus datos, en el formato del calendario. Las lecciones no guardan fecha
  // en el estado local: el calendario del cliente muestra check-ins,
  // prácticas y Norman.
  const data: TrackingData = useMemo(() => ({
    checkins: state.checkIns.map((c) => ({ date: c.date.slice(0, 10), energy: c.energy, clarity: c.clarity, stress: c.stress, sleep: c.sleep })),
    lessons: [],
    practices: wellness.map((w) => ({ at: w.completedAt, seconds: w.durationSeconds })),
    norman: (state.mentorMessages ?? []).filter((m) => m.role === 'user').map((m) => ({ at: m.createdAt })),
    sessions: [],
    videos: [],
  }), [state.checkIns, wellness, state.mentorMessages]);

  const hoy = new Date();
  const hoyClave = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const hechoHoy = state.checkIns.some((c) => c.date.slice(0, 10) === hoyClave);
  const racha = snap.streak;

  return (
    <Pantalla
      meta="PROGRESO"
      metaRight={`DÍA ${snap.protocolDay} / 90`}
      title={`${racha} ${racha === 1 ? 'día seguido' : 'días seguidos'}`}
      cifra={{ n: String(racha), label: racha === 1 ? 'día\nseguido' : 'días\nseguidos' }}
      sub={hechoHoy ? 'Hoy ya cuenta. Así va tu mes:' : 'Haz tu check-in de hoy para no cortar la racha.'}>
      {!hechoHoy && (
        <View style={styles.pendiente}>
          <Fila label="HOY" value="Hacer mi check-in · 2 min" tone="warn" onPress={() => router.push('/checkin' as never)} last />
        </View>
      )}
      <TrackingCalendar local={data} />
      <View style={styles.filas}>
        <Fila
          label="MÓDULOS"
          value={`${modulosTerminados(state.completedLessons ?? [])} de ${modulosNumerados().length} terminados`}
          onPress={() => router.push('/(tabs)/programas' as never)}
          last
        />
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  pendiente: { marginBottom: 32 },
  filas: { marginTop: 40 },
});
