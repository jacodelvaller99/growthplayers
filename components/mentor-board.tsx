/**
 * MentorBoard — "Hoy" del mentor, con el patrón de LifeFlow.
 *
 * Arriba la tarea ("N clientes te esperan" + Empezar por …), debajo las
 * etapas como columnas que filtran, y la lista en orden de prioridad. En
 * escritorio, tocar un cliente abre su Espacio del Mentor en un panel a la
 * derecha sin perder la lista, con SIGUIENTE para pasar al próximo. En el
 * teléfono abre la pantalla completa.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useAdminRole } from '@/hooks/use-admin-role';
import {
  buildBoard, STAGE_COPY, STAGE_ORDER,
  type BoardClient, type BoardSignals, type BoardSourceClient, type BoardStage,
} from '@/lib/admin/boardLogic';
import { setDeskQueue } from '@/lib/admin/deskLogic';
import { fetchMentorBoard } from '@/lib/admin/queries';
import { fetchExecutionDashboard } from '@/lib/mentorExecution';
import { MentorSpace } from '@/app/admin/mentor/[id]';

type Scope = 'mine' | 'all';

export function MentorBoard({ footer, view = 'today' }: { footer?: React.ReactNode; view?: 'today' | 'clients' }) {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const isAdmin = useAdminRole() === 'admin';

  const [source, setSource] = useState<BoardSourceClient[]>([]);
  const [signals, setSignals] = useState<Map<string, BoardSignals>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope | null>(null);
  const [stage, setStage] = useState<BoardStage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const isClients = view === 'clients';

  const load = useCallback(async () => {
    const [clientsRes, execRes] = await Promise.allSettled([fetchMentorBoard(), fetchExecutionDashboard()]);
    if (clientsRes.status === 'fulfilled') setSource(clientsRes.value);
    if (execRes.status === 'fulfilled') {
      setSignals(new Map(execRes.value.map((r) => [r.user_id, { attention: r.attention, overdue: r.overdue, topReason: r.topReason }])));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Un admin arranca en "Míos" si tiene clientes asignados; si no, en "Todos".
  // Un mentor solo recibe los suyos (la RPC ya filtra), no necesita el filtro.
  const hasMine = source.some((c) => c.mentor_id === userId);
  const effectiveScope: Scope = !isAdmin ? 'all' : scope ?? (hasMine ? 'mine' : 'all');
  const scoped = useMemo(
    () => (effectiveScope === 'mine' ? source.filter((c) => c.mentor_id === userId) : source),
    [source, effectiveScope, userId],
  );
  const board = useMemo(() => buildBoard(scoped, signals), [scoped, signals]);
  // Clientes: todos, por nombre, con búsqueda. Hoy: por prioridad, filtrable por etapa.
  const q = query.trim().toLowerCase();
  const list = isClients
    ? [...board.clients].sort((a, b) => a.name.localeCompare(b.name, 'es')).filter((c) => !q || c.name.toLowerCase().includes(q))
    : stage ? board.clients.filter((c) => c.stage === stage) : board.clients;
  const waiting = board.counts.review + board.counts.new;
  const first = board.clients[0];

  const split = sc.isDesktop && !!selected;

  const open = (id: string) => {
    if (sc.isDesktop) { setSelected(id); return; }
    setDeskQueue(list.map((c) => c.user_id));
    router.push(`/admin/mentor/${id}` as never);
  };
  const nextOf = (id: string) => {
    const i = list.findIndex((c) => c.user_id === id);
    return i >= 0 && i + 1 < list.length ? list[i + 1].user_id : null;
  };

  if (loading) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} size="large" />
        <Text style={s.muted}>Cargando tus clientes...</Text>
      </View>
    );
  }

  const header = (
    <View style={s.header}>
      <Text style={s.title}>{isClients ? 'Clientes' : 'Hoy'}</Text>
      <Text style={s.muted}>
        {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (ch) => ch.toUpperCase())}
      </Text>
    </View>
  );

  const banner = (
    <View style={s.banner}>
      <Text style={s.bannerText}>
        {waiting > 0
          ? `${waiting} cliente${waiting === 1 ? '' : 's'} te espera${waiting === 1 ? '' : 'n'}.`
          : board.clients.length > 0 ? 'Nadie te espera ahora.' : 'Aún no tienes clientes.'}
      </Text>
      {first && waiting > 0 && (
        <Pressable
          onPress={() => open(first.user_id)}
          style={({ pressed }) => [s.startCard, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`Empezar por ${first.name}`}>
          <Avatar name={first.name} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.startTitle} numberOfLines={1}>Empezar por {first.name}</Text>
            <Text style={s.startSub} numberOfLines={1}>{first.reason}</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color={palette.ink} />
        </Pressable>
      )}
    </View>
  );

  const filters = isAdmin ? (
    <View style={s.chipRow} accessibilityRole="tablist">
      {(['mine', 'all'] as Scope[]).map((k) => {
        const on = effectiveScope === k;
        return (
          <Pressable
            key={k}
            onPress={() => { setScope(k); setSelected(null); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipText, on && s.chipTextOn]}>{k === 'mine' ? 'Míos' : 'Todos'}</Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const search = (
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Buscar cliente"
      placeholderTextColor={palette.ash}
      style={s.search}
      accessibilityLabel="Buscar cliente por nombre"
    />
  );

  const columns = (
    <View style={[s.columns, !sc.isDesktop && s.columnsWrap]}>
      {STAGE_ORDER.map((st) => {
        const on = stage === st;
        const preview = board.clients.find((c) => c.stage === st);
        return (
          <Pressable
            key={st}
            onPress={() => setStage(on ? null : st)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${STAGE_COPY[st].title}: ${board.counts[st]}. ${on ? 'Quitar filtro' : 'Filtrar'}`}
            style={({ pressed }) => [s.column, !sc.isDesktop && s.columnHalf, on && s.columnOn, pressed && { opacity: 0.85 }]}>
            <Text style={[s.columnCount, board.counts[st] === 0 && s.columnCountZero]}>{board.counts[st]}</Text>
            <Text style={s.columnTitle}>{STAGE_COPY[st].title}</Text>
            <Text style={s.columnHint}>{STAGE_COPY[st].hint}</Text>
            {sc.isDesktop && preview && (
              <View style={s.columnPreview}>
                <Text style={s.previewName} numberOfLines={1}>{preview.name}</Text>
                <Text style={s.previewSub} numberOfLines={2}>{preview.reason}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const rows = (
    <View style={{ gap: spacing.xs }}>
      <Text style={s.listTitle}>
        {isClients ? 'Todos tus clientes' : stage ? STAGE_COPY[stage].title : 'Necesitan atención primero'}
        <Text style={s.muted}>  ·  {list.length}</Text>
      </Text>
      {list.length === 0 ? (
        <Text style={s.empty}>
          {isClients && q ? 'Nadie con ese nombre.' : stage ? 'Nadie en esta etapa.' : isAdmin && effectiveScope === 'mine'
            ? 'No tienes clientes asignados. Mira "Todos".'
            : 'Cuando te asignen clientes, aparecen aquí.'}
        </Text>
      ) : list.map((c) => (
        <ClientRow key={c.user_id} client={c} active={selected === c.user_id} onPress={() => open(c.user_id)} />
      ))}
    </View>
  );

  if (split && selected) {
    const next = nextOf(selected);
    return (
      <View style={[sc.root, s.splitRoot]}>
        <ScrollView style={s.splitList} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
          {header}
          {filters}
          {isClients && search}
          {rows}
        </ScrollView>
        <View style={s.splitPanel}>
          <MentorSpace
            key={selected}
            userId={selected}
            embedded
            onClose={() => { setSelected(null); load(); }}
            onNext={next ? () => setSelected(next) : undefined}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, sc.isDesktop && { maxWidth: 1180 }, { paddingTop: insets.top + spacing.lg, gap: spacing.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.gold} />}>
      {header}
      {isClients ? (
        <View style={{ gap: spacing.md }}>
          {filters}
          {search}
        </View>
      ) : (
        <>
          {banner}
          <View style={{ gap: spacing.md }}>
            {filters}
            {columns}
          </View>
        </>
      )}
      {rows}
      {footer}
      <View style={{ height: insets.bottom + spacing.xxl }} />
    </ScrollView>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={s.avatar}>
      <Text style={s.avatarText}>{name.trim().charAt(0).toUpperCase() || '·'}</Text>
    </View>
  );
}

const STAGE_TONE: Record<BoardStage, string> = {
  review: palette.goldText,
  new: palette.ivory,
  silent: palette.ash,
  onPlan: palette.smoke,
};

function ClientRow({ client, active, onPress }: { client: BoardClient; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${client.name}. ${STAGE_COPY[client.stage].title}. ${client.reason}`}
      style={({ pressed }) => [s.row, active && s.rowActive, pressed && { opacity: 0.85 }]}>
      <Avatar name={client.name} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowName} numberOfLines={1}>{client.name}</Text>
        <Text style={s.rowReason} numberOfLines={1}>
          <Text style={{ color: STAGE_TONE[client.stage] }}>{STAGE_COPY[client.stage].title}</Text>
          {'  ·  '}{client.reason}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
    </Pressable>
  );
}

const AV = 36;

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { ...typography.caption, color: palette.ash },

  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  title: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 28, letterSpacing: 0.4, color: palette.ivory },

  banner: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.lineGold,
    backgroundColor: palette.graphite,
  },
  bannerText: { ...typography.statement, color: palette.ivory },
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'flex-start',
    maxWidth: 440,
    width: '100%',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.gold,
  },
  startTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, color: palette.ink },
  startSub: { ...typography.caption, color: palette.ink, opacity: 0.75 },

  chipRow: { flexDirection: 'row', gap: spacing.xs },
  search: {
    ...typography.body,
    color: palette.ivory,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.graphite,
  },
  chip: {
    minHeight: 36, paddingHorizontal: spacing.lg, borderRadius: 999,
    borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center',
  },
  chipOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  chipText: { ...typography.body, fontSize: 13, color: palette.ash },
  chipTextOn: { color: palette.ink, fontWeight: '600' },

  columns: { flexDirection: 'row', gap: spacing.md },
  columnsWrap: { flexWrap: 'wrap' },
  column: {
    flex: 1,
    minHeight: 132,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.graphite,
    gap: 2,
  },
  columnHalf: { flexBasis: '46%', minHeight: 112 },
  columnOn: { borderColor: palette.gold },
  columnCount: { fontFamily: Fonts.display, fontWeight: '300', fontSize: 34, lineHeight: 40, color: palette.ivory },
  columnCountZero: { color: palette.smoke },
  columnTitle: { ...typography.body, fontWeight: '600', color: palette.ivory, marginTop: spacing.xs },
  columnHint: { ...typography.caption, color: palette.ash },
  columnPreview: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: palette.black,
  },
  previewName: { ...typography.caption, color: palette.ivory, fontWeight: '600' },
  previewSub: { ...typography.caption, color: palette.smoke, fontSize: 11 },

  listTitle: { ...typography.body, fontWeight: '600', color: palette.ivory, marginBottom: spacing.xs },
  empty: { ...typography.caption, color: palette.smoke, paddingVertical: spacing.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.lineSoft,
  },
  rowActive: { borderColor: palette.lineGold, backgroundColor: palette.graphite },
  rowName: { ...typography.body, fontWeight: '600', color: palette.ivory },
  rowReason: { ...typography.caption, color: palette.ash },

  avatar: {
    width: AV, height: AV, borderRadius: AV / 2,
    borderWidth: 1, borderColor: palette.line,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.black,
  },
  avatarText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, color: palette.ivory },

  splitRoot: { flexDirection: 'row' },
  splitList: { width: 400, flexGrow: 0, borderRightWidth: 1, borderRightColor: palette.line },
  splitPanel: { flex: 1 },
});
