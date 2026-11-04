import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { POLARIS_MODULES } from '@/data/modules';
import { palette } from '@/constants/theme';
import { Fila, Pantalla } from '@/components/pantalla';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { protocolSnapshot } from '@/lib/protocolSnapshot';

export default function ProgresoScreen() {
  const router = useRouter();
  const { state } = useLifeFlow();

  // Wellness session counts for score
  const wellnessSessions = state.wellnessSessions ?? [];
  const wellnessMeditation = wellnessSessions.filter((s) => s.type === 'meditation').length;
  const wellnessBreathing  = wellnessSessions.filter((s) => s.type === 'breathing').length;
  const wellnessBinaural   = wellnessSessions.filter((s) => s.type === 'binaural').length;

  // Día, racha, score y línea base: la MISMA función que Comando
  // (lib/protocolSnapshot) — antes cada pantalla daba su propio número.
  const snap = useMemo(() => protocolSnapshot({
    protocolStartDate: state.protocolStartDate,
    checkIns: state.checkIns,
    completedLessons: (state.completedLessons ?? []).length,
    completedTasks: Object.keys(state.completedTasks ?? {}).length,
    wellness: { meditation: wellnessMeditation, breathing: wellnessBreathing, binaural: wellnessBinaural },
    now: new Date(),
  }), [state.protocolStartDate, state.checkIns, state.completedLessons, state.completedTasks, wellnessMeditation, wellnessBreathing, wellnessBinaural]);
  const protocolDay = snap.protocolDay;
  const checkinStreak = snap.streak;
  /** Sin lecturas el score no mide nada — ver el comentario en su render. */
  const sinLecturas = !snap.hasReadings;

  // SIN VITRINA DE TROFEOS. Aqui vivia un array de ocho fichas de 22% de ancho
  // que se rellenaban de oro macizo al ganarse, con iconos de copa, estrellas y
  // medalla, y etiquetas "ELITE 800" / "SOBERANO 90D".
  //
  // Es, literal, la anti-referencia que PRODUCT.md nombra: "badge-as-toy
  // mechanics". Y rompia el principio del oro —se gana, no decora— de la forma
  // mas directa posible: el oro como ficha-premio. El propio repo ya lo sabia:
  // `components/narrative.tsx` quito UN icono `military-tech` del hito citando
  // esta misma regla, mientras a dos archivos de distancia seguia el estante
  // entero.
  //
  // El coste narrativo era el peor: la app contaba dos historias incompatibles
  // sobre que es un logro. En el check-in, "hace una semana dijiste que lo que
  // se interponia era X, y llevas siete dias apareciendo". En Progreso, una
  // copa dorada que dice ELITE 800. La segunda le quita autoridad a la primera.
  //
  // Lo que queda ya cubre "donde estoy": el score soberano, el delta, y la
  // tarjeta TU HISTORIA. Y el cruce de un hito lo reconoce `MilestoneToast`,
  // que es sobrio y cita las palabras del usuario.

  // Archetype badges — earned by completing all lessons in a module with an arquetipo
  const archetypes = useMemo(() => {
    const completed = state.completedLessons ?? [];
    return POLARIS_MODULES
      .filter((m) => m.arquetipo)
      .map((m) => {
        const totalLessons = m.lessons.length;
        const completedCount = m.lessons.filter((l) => completed.includes(l.id)).length;
        const earned = totalLessons > 0 && completedCount >= totalLessons;
        return {
          id: m.id,
          name: (m.arquetipo ?? '').toUpperCase(),
          order: m.order,
          earned,
          completedCount,
          totalLessons,
        };
      });
  }, [state.completedLessons]);

  const ordenados = [...state.checkIns].sort((a, b) => (a.date < b.date ? 1 : -1));
  const media = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const ultimos = ordenados.slice(0, 7);
  const anteriores = ordenados.slice(7, 14);
  const cifra = (key: 'energy' | 'clarity') => {
    const ahora = media(ultimos.map((c) => c[key]));
    const antes = media(anteriores.map((c) => c[key]));
    if (ahora === null) return 'Sin lecturas aún';
    const base = `${ahora.toFixed(1).replace('.', ',')} de 10`;
    if (antes === null) return base;
    const d = ahora - antes;
    if (Math.abs(d) < 0.05) return `${base} · igual`;
    return `${base} · ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1).replace('.', ',')}`;
  };
  const modulosHechos = archetypes.filter((a) => a.earned).length;

  return (
    <Pantalla
      meta="PROGRESO"
      metaRight={`DÍA ${protocolDay} / 90`}
      title={checkinStreak > 0
        ? `${checkinStreak} ${checkinStreak === 1 ? 'día' : 'días'}\nseguido${checkinStreak === 1 ? '' : 's'}.`
        : state.checkIns.length ? 'Retoma\nhoy.' : 'Tu racha\nempieza hoy.'}
      sub={checkinStreak > 0 || state.checkIns.length
        ? 'Cada cuadro amarillo es un día que apareciste.'
        : 'Haz tu check-in y aparece el primer cuadro.'}
      hero={<Calendario checkIns={state.checkIns} />}>
      <Fila label="ENERGÍA" value={cifra('energy')} />
      <Fila label="CLARIDAD" value={cifra('clarity')} />
      <Fila
        label="PUNTAJE"
        value={sinLecturas ? 'Aparece con tu primer check-in' : `${snap.score} · ${snap.tier}`}
        onPress={() => router.push('/perfil' as never)}
      />
      <Fila
        label="ARQUETIPOS"
        value={`${modulosHechos} de ${archetypes.length} desbloqueados`}
        onPress={() => router.push('/(tabs)/programas' as never)}
        last
      />
    </Pantalla>
  );
}

/** Seis semanas de check-ins, de lunes a domingo. Hoy lleva contorno. */
function Calendario({ checkIns }: { checkIns: { date: string }[] }) {
  const dias = useMemo(() => {
    const clave = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 35);
    const hechos = new Set(checkIns.map((c) => c.date.slice(0, 10)));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return { key: clave(d), on: hechos.has(clave(d)), hoy: +d === +hoy, futuro: d > hoy };
    });
  }, [checkIns]);
  const hechos30 = dias.filter((d) => d.on).length;
  return (
    <View
      style={styles.cal}
      accessible
      accessibilityLabel={`Calendario de las últimas seis semanas: ${hechos30} días con check-in`}>
      {dias.map((d) => (
        <View key={d.key} style={styles.calCell}>
          <View
            style={[
              styles.calDay,
              d.on && styles.calDayOn,
              d.futuro && styles.calDayFuture,
              d.hoy && styles.calDayToday,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Rediseño ──
  cal: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, maxWidth: 380 },
  calCell: { width: '14.2857%', padding: 3 },
  calDay: { aspectRatio: 1, borderRadius: 4, backgroundColor: palette.charcoal },
  calDayOn: { backgroundColor: palette.gold },
  calDayFuture: { opacity: 0.35 },
  calDayToday: { borderWidth: 2, borderColor: palette.ivory },

  // Achievements


});

