import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, palette } from '@/constants/theme';
import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { modulosNumerados, modulosTerminados } from '@/lib/modulosCuenta';
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

  const ordenados = [...state.checkIns].sort((a, b) => (a.date < b.date ? 1 : -1));
  const media = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const ultimos = ordenados.slice(0, 7);
  const anteriores = ordenados.slice(7, 14);
  const coma = (n: number) => n.toFixed(1).replace('.', ',').replace(',0', '');
  // El check-in pregunta de 1 a 5 y guarda ×2. Aquí se muestra en la escala
  // que el usuario USÓ: nunca eligió un «10».
  const cifra = (key: 'energy' | 'clarity') => {
    const ahora = media(ultimos.map((c) => c[key] / 2));
    const antes = media(anteriores.map((c) => c[key] / 2));
    if (ahora === null) return 'Sin check-ins aún';
    const base = `${coma(ahora)} de 5`;
    if (antes === null) return base;
    const d = ahora - antes;
    if (Math.abs(d) < 0.05) return `${base} · igual que la semana pasada`;
    return `${base} · ${coma(Math.abs(d))} ${d > 0 ? 'más' : 'menos'} que la semana pasada`;
  };
  // La misma cuenta que Programa («Módulo 1 de 9»): lib/modulosCuenta.
  const modulosHechos = modulosTerminados(state.completedLessons ?? []);
  const modulosTotal = modulosNumerados().length;
  const hoyClave = claveDia(new Date());
  const hechoHoy = state.checkIns.some((c) => c.date.slice(0, 10) === hoyClave);
  const calendario = <Calendario checkIns={state.checkIns} />;

  return (
    <Pantalla
      meta="PROGRESO"
      metaRight={`DÍA ${protocolDay} / 90`}
      title={checkinStreak > 0
        ? `${checkinStreak} ${checkinStreak === 1 ? 'día' : 'días'}\nseguido${checkinStreak === 1 ? '' : 's'}.`
        : 'Hoy\ncuenta.'}
      sub="Cada cuadro amarillo es un día que hiciste tu check-in."
      // La única acción de la pantalla: el check-in de hoy, si falta.
      hero={hechoHoy ? calendario : (
        <TarjetaOro
          meta="CHECK-IN"
          metaRight="2 MIN"
          title="Hacer mi check-in"
          onPress={() => router.push('/checkin' as never)}
        />
      )}>
      {!hechoHoy && <View style={styles.calRows}>{calendario}</View>}
      <Fila label="ENERGÍA" value={cifra('energy')} />
      <Fila label="CLARIDAD" value={cifra('clarity')} />
      <Fila
        label="MÓDULOS"
        value={`${modulosHechos} de ${modulosTotal} terminados`}
        onPress={() => router.push('/(tabs)/programas' as never)}
        last
      />
    </Pantalla>
  );
}

const claveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Seis semanas de check-ins, de lunes a domingo. Hoy lleva contorno. */
function Calendario({ checkIns }: { checkIns: { date: string }[] }) {
  const dias = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 35);
    const hechos = new Set(checkIns.map((c) => c.date.slice(0, 10)));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return { key: claveDia(d), on: hechos.has(claveDia(d)), hoy: +d === +hoy, futuro: d > hoy };
    });
  }, [checkIns]);
  const hechos30 = dias.filter((d) => d.on).length;
  return (
    <View
      accessible
      accessibilityLabel={`Calendario de las últimas seis semanas: ${hechos30} días con check-in`}>
      <View style={styles.cal}>
        {DIAS_SEMANA.map((l, i) => (
          <View key={`${l}${i}`} style={styles.calCell}>
            <Text style={styles.calHead}>{l}</Text>
          </View>
        ))}
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
      <Text style={styles.calNote}>El cuadro con borde es hoy.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  calRows: { marginBottom: 32 },
  cal: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, maxWidth: 380 },
  calCell: { width: '14.2857%', padding: 3 },
  calHead: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, color: palette.smoke, textAlign: 'center' },
  // Vacío con contorno `smoke`: en claro el relleno solo (#EFEFEF sobre
  // #E9E9E9) era invisible — el contorno pasa 3:1 (WCAG 1.4.11) en ambos temas.
  calDay: { aspectRatio: 1, borderRadius: 4, backgroundColor: palette.charcoal, borderWidth: 1, borderColor: palette.smoke },
  calDayOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  calDayFuture: { opacity: 0.35 },
  calDayToday: { borderWidth: 2, borderColor: palette.ivory },
  calNote: { marginTop: 8, fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },
});
