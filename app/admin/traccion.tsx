/**
 * Admin — Tracción. ¿Polaris engancha? Activos, pegajosidad, activación y
 * qué hace la gente, con datos reales de los últimos 30 días.
 * Lenguaje de la landing: la cifra que importa, enorme, sobre amarillo.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fila, Pantalla } from '@/components/pantalla';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { fetchTraction, type Traction } from '@/lib/admin/traction';

const TIER: Record<string, string> = {
  free: 'Gratis', premium: 'Premium', premium_plus: 'Premium Plus', polaris: 'Polaris', growthplayers: 'Growth Players',
};
const pct = (v: number | null) => (v == null ? '—' : `${v}%`);
const fecha = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

export default function TraccionScreen() {
  const { isDesktop } = useBreakpoint();
  const [t, setT] = useState<Traction | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetchTraction().then(setT).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  if (!t) {
    return (
      <Pantalla meta="TRACCIÓN" title={'¿Polaris\nengancha?'} sub="Últimos 30 días, con datos reales.">
        {error ? (
          <Pressable onPress={load} accessibilityRole="button" style={s.retry}>
            <Text style={s.body}>No se pudieron cargar los datos. Tocar para reintentar.</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={palette.goldText} />
        )}
      </Pantalla>
    );
  }

  const max = Math.max(1, ...t.daily.map((d) => d.active));
  return (
    <Pantalla
      meta="TRACCIÓN"
      metaRight="ÚLTIMOS 30 DÍAS"
      title={`${t.wau} ${t.wau === 1 ? 'persona\nactiva' : 'personas\nactivas'}.`}
      sub={`Esta semana, de ${t.totalUsers} en la app. Activo = hizo check-in, le escribió a Norman, terminó una lección o hizo una práctica.`}
      hero={
        <View style={[s.band, isDesktop && s.bandDesk]}>
          <Big n={t.dau} label="HOY" />
          <Big n={t.wau} label="ESTA SEMANA" />
          <Big n={t.mau} label="ESTE MES" />
          <Big n={pct(t.stickiness)} label="VUELVEN A DIARIO" hint="Activos hoy ÷ activos del mes" />
        </View>
      }>
      <View style={s.section}>
        <Text style={s.label}>ACTIVOS POR DÍA</Text>
        <View style={s.chart} accessible accessibilityLabel={`Activos por día, máximo ${max}`}>
          {t.daily.map((d, i) => (
            <View key={d.day} style={s.col}>
              <View style={[s.bar, { height: `${(d.active / max) * 100}%` }, i === t.daily.length - 1 && s.barToday]} />
            </View>
          ))}
        </View>
        <View style={s.axis}>
          <Text style={s.note}>{fecha(t.daily[0]!.day)}</Text>
          <Text style={s.note}>máx. {max} en un día</Text>
          <Text style={s.note}>hoy</Text>
        </View>
      </View>

      <View style={[s.grid, isDesktop && s.gridDesk]}>
        <Tile n={t.signups30} label="ALTAS NUEVAS" />
        <Tile n={pct(t.activation)} label="HICIERON SU 1.ER CHECK-IN" />
        <Tile n={t.checkins30} label="CHECK-INS" />
        <Tile n={t.normanMsgs30} label="MENSAJES A NORMAN" />
        <Tile n={t.lessons30} label="LECCIONES TERMINADAS" />
        <Tile n={t.practices30} label="PRÁCTICAS DE BIENESTAR" />
      </View>

      <View style={s.section}>
        <Text style={s.label}>PLANES · {t.paying} DE PAGO</Text>
      </View>
      {t.tiers.map((x, i) => (
        <Fila key={x.tier} label={(TIER[x.tier] ?? x.tier).toUpperCase()} value={`${x.count}`} last={i === t.tiers.length - 1} />
      ))}
    </Pantalla>
  );
}

function Big({ n, label, hint }: { n: number | string; label: string; hint?: string }) {
  return (
    <View style={s.big}>
      <Text style={s.bigNum}>{n}</Text>
      <Text style={s.bigLabel}>{label}</Text>
      {!!hint && <Text style={s.bigHint}>{hint}</Text>}
    </View>
  );
}

function Tile({ n, label }: { n: number | string; label: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileNum}>{n}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  band: {
    backgroundColor: palette.gold, borderRadius: 8, padding: 24,
    flexDirection: 'row', flexWrap: 'wrap', rowGap: 28, columnGap: 16,
  },
  bandDesk: { paddingHorizontal: 56, paddingVertical: 48, flexWrap: 'nowrap', justifyContent: 'space-between' },
  big: { minWidth: 130, flexGrow: 1, flexBasis: '40%', gap: 6 },
  bigNum: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 56, lineHeight: 60, letterSpacing: -1, color: palette.ink },
  bigLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1.2, color: palette.ink },
  bigHint: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ink },

  section: { paddingTop: 48, paddingBottom: spacing.md, gap: spacing.md },
  label: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1.2, color: palette.smoke },
  chart: { height: 160, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { backgroundColor: palette.gold, borderRadius: 2, minHeight: 2, opacity: 0.55 },
  barToday: { opacity: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  note: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: palette.line, marginTop: 40, borderWidth: 1, borderColor: palette.line },
  gridDesk: {},
  tile: { flexGrow: 1, flexBasis: '45%', minWidth: 150, backgroundColor: palette.black, padding: 20, gap: 8 },
  tileNum: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 40, lineHeight: 44, color: palette.ivory },

  body: { fontFamily: Fonts.sans, fontSize: 16, color: palette.ivory },
  retry: { minHeight: 44, justifyContent: 'center' },
});
