/**
 * UsoDeLaApp — qué hizo esta persona en la app, sesión por sesión: pantallas
 * (con el tiempo en cada una) y toques. Lee user_events (RLS admin).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { buildUsage, type UsageEvent, type UsageSession } from '@/lib/admin/usageLogic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as any;

const hace = (iso: string | null) => {
  if (!iso) return 'Nunca';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 2) return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
};
const dur = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function UsoDeLaApp({ userId }: { userId: string }) {
  const [events, setEvents] = useState<UsageEvent[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    supa.from('user_events')
      .select('event_type, screen, metadata, session_id, created_at')
      .eq('user_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(3000)
      .then((r: { data: UsageEvent[] | null }) => { if (alive) setEvents(r.data ?? []); })
      .catch(() => { if (alive) setEvents([]); });
    return () => { alive = false; };
  }, [userId]);

  const u = useMemo(() => (events ? buildUsage(events, new Date()) : null), [events]);
  if (!u) return <ActivityIndicator color={palette.goldText} style={{ paddingVertical: 24 }} />;

  return (
    <View style={s.wrap}>
      <View style={s.kpis}>
        <Kpi big={hace(u.lastSeen)} label="Último uso" on={!u.lastSeen || Date.now() - new Date(u.lastSeen).getTime() > 3 * 86_400_000} />
        <Kpi big={String(u.sessions7d)} label="Sesiones · 7 días" />
        <Kpi big={`${u.minutes7d} min`} label="Tiempo · 7 días" />
        <Kpi big={String(u.taps7d)} label="Toques · 7 días" />
      </View>

      {u.topScreens.length > 0 && (
        <View style={s.block}>
          <Text style={s.label}>DÓNDE PASA EL TIEMPO</Text>
          {u.topScreens.map((t) => (
            <View key={t.label} style={s.row}>
              <Text style={s.rowText}>{t.label}</Text>
              <Text style={s.rowValue}>{t.minutes} min · {t.visits} {t.visits === 1 ? 'visita' : 'visitas'}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.block}>
        <Text style={s.label}>SESIONES</Text>
        {u.sessions.length === 0 && (
          <Text style={s.empty}>Todavía no hay uso registrado. Se mide desde el 5 de noviembre de 2026.</Text>
        )}
        {u.sessions.slice(0, 15).map((ss) => (
          <Sesion key={ss.id} ss={ss} open={open === ss.id} onToggle={() => setOpen(open === ss.id ? null : ss.id)} />
        ))}
      </View>
    </View>
  );
}

function Sesion({ ss, open, onToggle }: { ss: UsageSession; open: boolean; onToggle: () => void }) {
  return (
    <View style={s.session}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={s.sessionHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowText}>{fechaHora(ss.start)}</Text>
          <Text style={s.meta}>{dur(ss.durationMs)} · {ss.screens} pantallas · {ss.taps} toques</Text>
        </View>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={palette.ash} />
      </Pressable>
      {open && (
        <View style={s.steps}>
          {ss.steps.map((st, i) => (
            <View key={`${st.at}${i}`} style={s.step}>
              <MaterialIcons name={st.kind === 'pantalla' ? 'crop-portrait' : 'touch-app'} size={16} color={st.kind === 'pantalla' ? palette.goldText : palette.smoke} />
              <Text style={[s.stepText, st.kind === 'toque' && s.stepTap]} numberOfLines={1}>{st.label}</Text>
              {st.dwellMs != null && <Text style={s.meta}>{dur(st.dwellMs)}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Kpi({ big, label, on }: { big: string; label: string; on?: boolean }) {
  return (
    <View style={[s.kpi, on && s.kpiOn]}>
      <Text style={[s.kpiBig, on && s.ink]}>{big}</Text>
      <Text style={[s.kpiLabel, on && s.ink]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.lg },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpi: { flexGrow: 1, flexBasis: 140, padding: spacing.md, gap: 4, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.charcoal },
  kpiOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  kpiBig: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 18, color: palette.ivory },
  kpiLabel: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },
  ink: { color: palette.ink },
  block: { gap: 2 },
  label: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1.2, color: palette.smoke, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: palette.line },
  rowText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory, flexShrink: 1 },
  rowValue: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash },
  empty: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash },
  session: { borderTopWidth: 1, borderTopColor: palette.line },
  sessionHead: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8 },
  meta: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },
  steps: { paddingLeft: 4, paddingBottom: spacing.md, gap: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  stepTap: { color: palette.ash },
});
