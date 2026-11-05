/**
 * TrackingCalendar — el mes del cliente de un vistazo, para el mentor.
 * Arriba, cinco indicadores (el que pide atención va en amarillo); abajo, el
 * calendario: cada día muestra lo que el cliente HIZO. Lógica pura en
 * lib/admin/trackingLogic.ts; aquí solo se lee y se pinta.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { supabase } from '@/lib/supabase';
import { buildTracking, type CheckinRow, type EventRow, type PracticeRow, type TrackingDay } from '@/lib/admin/trackingLogic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as any;
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTO = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Data = { checkins: CheckinRow[]; lessons: EventRow[]; practices: PracticeRow[]; norman: EventRow[]; sessions: EventRow[]; videos: EventRow[] };

async function q<T>(p: Promise<{ data: T[] | null }>): Promise<T[]> {
  try { return (await p).data ?? []; } catch { return []; }
}

async function fetchMonth(userId: string, year: number, month: number): Promise<Data> {
  // Una semana de margen a cada lado (la grilla muestra días vecinos y la racha mira atrás).
  const from = new Date(year, month, 1 - 14), to = new Date(year, month + 1, 8);
  const f = from.toISOString(), t = to.toISOString();
  const fd = f.slice(0, 10), td = t.slice(0, 10);
  const [checkins, lessons, practices, norman, sessions, videos] = await Promise.all([
    q<CheckinRow>(supa.from('daily_checkins').select('date, energy, clarity, stress, sleep').eq('user_id', userId).gte('date', fd).lte('date', td)),
    q<{ completed_at: string | null }>(supa.from('completed_lessons').select('completed_at').eq('user_id', userId).gte('completed_at', f).lte('completed_at', t)),
    q<{ completed_at: string | null; duration_seconds: number | null }>(supa.from('wellness_sessions').select('completed_at, duration_seconds').eq('user_id', userId).gte('completed_at', f).lte('completed_at', t)),
    q<{ created_at: string | null }>(supa.from('mentor_messages').select('created_at').eq('user_id', userId).eq('role', 'user').gte('created_at', f).lte('created_at', t)),
    q<{ session_date: string | null; created_at: string | null }>(supa.from('mentorship_sessions').select('session_date, created_at').eq('user_id', userId).gte('created_at', f).lte('created_at', t)),
    q<{ completed_at: string | null }>(supa.from('video_progress').select('completed_at').eq('user_id', userId).eq('completed', true).gte('completed_at', f).lte('completed_at', t)),
  ]);
  return {
    checkins,
    lessons: lessons.map((r) => ({ at: r.completed_at })),
    practices: practices.map((r) => ({ at: r.completed_at, seconds: r.duration_seconds })),
    norman: norman.map((r) => ({ at: r.created_at })),
    sessions: sessions.map((r) => ({ at: r.session_date ?? r.created_at })),
    videos: videos.map((r) => ({ at: r.completed_at })),
  };
}

const ANIMO = (v: number | null) => (v == null ? '—' : v >= 4 ? 'BIEN' : v >= 3 ? 'MEDIA' : 'BAJA');
const fmt = (v: number | null, suf = '') => (v == null ? '—' : `${String(v).replace('.', ',')}${suf}`);

export function TrackingCalendar({ userId }: { userId: string }) {
  const { isDesktop } = useBreakpoint();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    fetchMonth(userId, ym.y, ym.m).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [userId, ym.y, ym.m]);

  const built = useMemo(
    () => (data ? buildTracking({ year: ym.y, month: ym.m, today: new Date(), ...data }) : null),
    [data, ym.y, ym.m],
  );
  const move = (delta: number) => setYm(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const k = built?.kpis;
  // Lo que pide atención va en amarillo: presión alta o poco registro.
  const alerta = k ? ((k.stress ?? 0) >= 3.5 ? 'stress' : (k.trackingPct ?? 100) < 50 ? 'tracking' : null) : null;

  return (
    <View style={s.wrap}>
      <View style={s.kpis}>
        <Kpi icon="sentiment-satisfied" big={ANIMO(k?.energy ?? null)} label={`Energía media ${fmt(k?.energy ?? null, '/5')}`} />
        <Kpi icon="speed" big={fmt(k?.stress ?? null, '/5')} label="Presión media" on={alerta === 'stress'} />
        <Kpi icon="event-available" big={String(k?.daysTracked ?? '—')} label="Días registrados" />
        <Kpi icon="timer" big={k?.practiceMin != null ? `${k.practiceMin} min` : '—'} label="Práctica media" />
        <Kpi icon="donut-large" big={fmt(k?.trackingPct ?? null, '%')} label="% de seguimiento" on={alerta === 'tracking'} />
      </View>

      <View style={s.monthRow}>
        <Pressable onPress={() => move(-1)} style={s.navBtn} accessibilityRole="button" accessibilityLabel="Mes anterior">
          <MaterialIcons name="chevron-left" size={24} color={palette.ivory} />
        </Pressable>
        <Text style={s.month}>{MESES[ym.m]} {ym.y}</Text>
        <Pressable onPress={() => move(1)} style={s.navBtn} accessibilityRole="button" accessibilityLabel="Mes siguiente">
          <MaterialIcons name="chevron-right" size={24} color={palette.ivory} />
        </Pressable>
      </View>

      <View style={s.grid}>
        {(isDesktop ? DIAS : DIAS_CORTO).map((d, i) => (
          <View key={`${d}${i}`} style={s.cell}><Text style={s.head}>{d}</Text></View>
        ))}
        {!built ? (
          <View style={s.loading}><ActivityIndicator color={palette.goldText} /></View>
        ) : built.days.map((d) => <Dia key={d.key} d={d} desk={isDesktop} />)}
      </View>

      <View style={s.legend}>
        <Leyenda swatch={<View style={[s.chip, s.chipGold]}><Text style={s.chipGoldText}>4</Text></View>} text="Check-in (energía de 1 a 5)" />
        <Leyenda swatch={<Text style={s.mark}>V</Text>} text="Vio un video completo" />
        <Leyenda swatch={<Text style={s.mark}>L</Text>} text="Lección" />
        <Leyenda swatch={<Text style={s.mark}>P</Text>} text="Práctica" />
        <Leyenda swatch={<Text style={s.mark}>N</Text>} text="Habló con Norman" />
        <Leyenda swatch={<Text style={s.mark}>S</Text>} text="Sesión de mentoría" />
        <Leyenda swatch={<MaterialIcons name="emoji-events" size={14} color={palette.goldText} />} text="7 días seguidos" />
      </View>
    </View>
  );
}

function Kpi({ icon, big, label, on }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; big: string; label: string; on?: boolean }) {
  return (
    <View style={[s.kpi, on && s.kpiOn]}>
      <View style={s.kpiTop}>
        <MaterialIcons name={icon} size={18} color={on ? palette.ink : palette.goldText} />
        <Text style={[s.kpiBig, on && s.kpiInk]}>{big}</Text>
      </View>
      <Text style={[s.kpiLabel, on && s.kpiInk]}>{label}</Text>
    </View>
  );
}

function Dia({ d, desk }: { d: TrackingDay; desk: boolean }) {
  const marks = [d.videos && 'V', d.lessons && 'L', d.practices && 'P', d.norman && 'N', d.session && 'S'].filter(Boolean) as string[];
  const vacio = d.inMonth && d.past && d.energy == null && marks.length === 0;
  const label = `${d.day}: ${d.energy != null ? `energía ${d.energy} de 5` : 'sin check-in'}${marks.length ? `, ${marks.length} actividades` : ''}${d.trophy ? ', 7 días seguidos' : ''}`;
  return (
    <View style={s.cell}>
      <View
        accessible
        accessibilityLabel={label}
        style={[s.day, desk && s.dayDesk, !d.inMonth && s.dayOut, vacio && s.dayEmpty, d.isToday && s.dayToday]}>
        <View style={s.dayTop}>
          <Text style={[s.dayNum, !d.inMonth && s.dayNumOut]}>{d.day}</Text>
          {d.trophy && <MaterialIcons name="emoji-events" size={desk ? 16 : 12} color={palette.goldText} />}
        </View>
        {d.energy != null && (
          <View style={[s.chip, s.chipGold, !desk && s.chipSmall]}>
            <Text style={s.chipGoldText}>{String(d.energy).replace('.', ',')}</Text>
          </View>
        )}
        {marks.length > 0 && <Text style={s.mark} numberOfLines={1}>{marks.join(desk ? ' · ' : '')}</Text>}
      </View>
    </View>
  );
}

function Leyenda({ swatch, text }: { swatch: React.ReactNode; text: string }) {
  return <View style={s.legendItem}>{swatch}<Text style={s.legendText}>{text}</Text></View>;
}

const s = StyleSheet.create({
  wrap: { gap: spacing.lg },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpi: {
    flexGrow: 1, flexBasis: 150, minHeight: 84, padding: spacing.md, gap: 6, borderRadius: 14,
    borderWidth: 1, borderColor: palette.line, backgroundColor: palette.charcoal, justifyContent: 'center',
  },
  kpiOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiBig: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 20, color: palette.ivory },
  kpiLabel: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },
  kpiInk: { color: palette.ink },

  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 22, color: palette.ivory, minWidth: 130, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: '14.2857%', padding: 3 },
  head: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash, textAlign: 'center', paddingBottom: 4 },
  loading: { width: '100%', paddingVertical: 48, alignItems: 'center' },

  day: {
    minHeight: 64, borderRadius: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.black,
    padding: 6, gap: 4,
  },
  dayDesk: { minHeight: 104, borderRadius: 14, padding: 10, gap: 8 },
  dayOut: { opacity: 0.35 },
  dayEmpty: { backgroundColor: palette.charcoal },
  dayToday: { borderColor: palette.ivory, borderWidth: 2 },
  dayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayNum: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, color: palette.ivory },
  dayNumOut: { color: palette.smoke },

  chip: { alignSelf: 'flex-start', minWidth: 28, height: 22, borderRadius: 6, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  chipSmall: { minWidth: 22, height: 18, paddingHorizontal: 4 },
  chipGold: { backgroundColor: palette.gold },
  chipGoldText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, color: palette.ink },
  mark: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 0.5, color: palette.goldText },

  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },
});
