import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { selectTurno } from '@/lib/turnoLogic';



// ─── Quick-access blocks ──────────────────────────────────────────────────────
type Block = {
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  sub: string;
  color: string;
  type: 'meditation' | 'breathing' | 'binaural' | 'sleep' | 'library' | 'journal' | 'movement';
};

// Monochrome — spec: "Sin colores por categoría (todo monocromo excepto el gold CTA)"
const BLOCKS: Block[] = [
  { route: '/bienestar/binaurales',  icon: 'graphic-eq',      label: 'SONIDOS',     sub: 'para concentrarte o calmarte', color: palette.ash, type: 'binaural'   },
  { route: '/bienestar/respiracion', icon: 'air',              label: 'RESPIRACIÓN', sub: 'baja el ritmo en 5 minutos',    color: palette.ash, type: 'breathing'  },
  { route: '/bienestar/movimiento',  icon: 'directions-walk',  label: 'MOVIMIENTO',  sub: 'rutinas cortas para moverte',    color: palette.ash, type: 'movement'   },
  { route: '/bienestar/meditacion',  icon: 'self-improvement', label: 'MEDITACIÓN',  sub: 'calma la mente',       color: palette.ash, type: 'meditation' },
  { route: '/bienestar/sueno',       icon: 'bedtime',          label: 'SUEÑO',       sub: 'descansa mejor',       color: palette.ash, type: 'sleep'      },
  { route: '/bienestar/biblioteca',  icon: 'local-library',    label: 'BIBLIOTECA',  sub: 'audios y lecturas',    color: palette.ash, type: 'library'    },
  { route: '/bienestar/diario',      icon: 'edit-note',        label: 'DIARIO',      sub: 'procesa el día',       color: palette.ash, type: 'journal'    },
];

// Cuatro grupos, de lo más respaldado por evidencia a lo complementario.
// Antes eran tres lentes con nombres internos (PRÁCTICA / SISTEMA /
// EMOCIONAL) y GRITO/TAPPING al mismo nivel que respiración y sueño.
type HubItem = Pick<Block, 'route' | 'icon' | 'label' | 'sub'>;
const fromBlock = (route: string): HubItem => BLOCKS.find((b) => b.route === route)!;

const GROUPS: { id: string; label: string; items: HubItem[] }[] = [
  { id: 'calma', label: 'CALMA', items: [
    fromBlock('/bienestar/respiracion'),
    fromBlock('/bienestar/meditacion'),
    fromBlock('/bienestar/sueno'),
    fromBlock('/bienestar/binaurales'),
  ] },
  { id: 'cuerpo', label: 'CUERPO', items: [
    fromBlock('/bienestar/movimiento'),
    { route: '/bienestar/habitos',   icon: 'checklist',      label: 'HÁBITOS',   sub: 'rutina de mañana y noche' },
    { route: '/bienestar/nutricion', icon: 'restaurant',     label: 'NUTRICIÓN', sub: 'tu plan de comidas' },
    { route: '/bienestar/cuerpo',    icon: 'fitness-center', label: 'MEDIDAS',   sub: 'peso y medidas' },
  ] },
  { id: 'salud', label: 'SALUD', items: [
    { route: '/bienestar/internista',     icon: 'medical-services', label: 'TU SALUD',    sub: 'pregunta qué significan tus exámenes' },
    { route: '/bienestar/ayuno',          icon: 'schedule',         label: 'AYUNO',       sub: 'temporizador y guía' },
    { route: '/bienestar/suplementacion', icon: 'medication',       label: 'SUPLEMENTOS', sub: 'lo que tomas y cuándo' },
  ] },
  { id: 'mente', label: 'MENTE', items: [
    fromBlock('/bienestar/diario'),
    fromBlock('/bienestar/biblioteca'),
    { route: '/bienestar/consciencia', icon: 'psychology-alt', label: 'TU CALMA',    sub: 'cómo te sentiste esta semana' },
    { route: '/bienestar/comunidad',   icon: 'groups',         label: 'COMUNIDAD',   sub: 'el grupo del protocolo' },
    // Complementarias: menos evidencia — al final y dichas como tal.
    { route: '/bienestar/tapping', icon: 'touch-app', label: 'TAPPING', sub: 'golpecitos para soltar tensión · opcional' },
    { route: '/bienestar/grito',   icon: 'campaign',  label: 'GRITO',   sub: 'suelta lo que cargas · opcional' },
  ] },
];



// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BienestarHub() {
  const router = useRouter();
  const { state, todayCheckIn } = useLifeFlow();


  const sessions = state.wellnessSessions ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const thisWeek = sessions.filter((s) => {
      const diff = (now.getTime() - new Date(s.completedAt).getTime()) / 86400000;
      return diff < 7;
    });
    const minutes = Math.round(thisWeek.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);
    return { weekMinutes: minutes, weekSessions: thisWeek.length, total: sessions.length };
  }, [sessions]);





  // "HOY" — antes era SOLO el reloj de pared: `new Date().getHours()` y tres
  // ramas fijas, con `useMemo(…, [])`. Cero señal del usuario. Daba lo mismo
  // venir reventado de estrés que en tu mejor día: el hub proponía lo mismo.
  //
  // Ahora pregunta primero al turno (lib/turnoLogic.ts), que es la única
  // opinión de la app. Si el turno apunta a una práctica de este hub, esa es
  // LA propuesta — una sola, con su porqué real. Si apunta a otro sitio
  // (check-in, Norman, protocolo), no lo forzamos aquí: el reloj vuelve como
  // punto de partida honesto, que es lo que siempre fue.
  const turno = useMemo(() => selectTurno({
    narrative: null,
    kind: null,
    todayCheckIn: todayCheckIn
      ? { energy: todayCheckIn.energy, clarity: todayCheckIn.clarity, stress: todayCheckIn.stress, sleep: todayCheckIn.sleep }
      : null,
    daysSinceLastCheckIn: todayCheckIn ? 0 : null,
  }), [todayCheckIn]);

  const turnoBlock = useMemo(
    () => BLOCKS.find((b) => b.route === turno.route) ?? null,
    [turno.route],
  );

  const todayPicks = useMemo<Block[]>(() => {
    if (turnoBlock) return [turnoBlock];
    const hour = new Date().getHours();
    const byType = (t: Block['type']) => BLOCKS.find((b) => b.type === t);
    const order: Block['type'][] =
      hour < 11 ? ['breathing', 'binaural']
      : hour >= 20 ? ['sleep', 'meditation']
      : ['meditation', 'breathing'];
    return order.map(byType).filter((b): b is Block => Boolean(b));
  }, [turnoBlock]);

  /** El porqué real cuando el turno manda; si no, el texto de siempre. */
  const todayHint = turnoBlock ? turno.why : 'Para tu momento del día. Empieza por aquí.';

  // ── BIENESTAR (rediseño) ───────────────────────────────────────────────────
  // Una práctica propuesta en grande (la que pide tu día) y, debajo, todo el
  // catálogo como filas agrupadas — de lo más respaldado a lo complementario.
  const propuesta = todayPicks[0];
  const capital = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

  return (
    <Pantalla
      meta="BIENESTAR"
      metaRight={stats.weekMinutes > 0 ? `${stats.weekMinutes} MIN ESTA SEMANA` : undefined}
      title={'Tu cuerpo,\ntu mente.'}
      sub="Elige una. Diez minutos bastan."
      hero={propuesta ? (
        <TarjetaOro
          meta="PARA HOY"
          title={capital(propuesta.label)}
          detail={todayHint}
          onPress={() => router.push(propuesta.route as never)}
        />
      ) : undefined}>
      <Fila label="TU RELOJ" value="Cómo dormiste y cómo estás" onPress={() => router.push('/bienestar/biometrics' as never)} last />
      {GROUPS.map((g) => (
        <View key={g.id} style={styles.group}>
          <Text style={styles.groupLabel}>{g.label}</Text>
          {g.items.map((b, i) => (
            <Fila
              key={b.route}
              label={b.label}
              value={b.sub.charAt(0).toUpperCase() + b.sub.slice(1)}
              onPress={() => router.push(b.route as never)}
              last={i === g.items.length - 1}
            />
          ))}
        </View>
      ))}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 32 },
  groupLabel: {
    fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash, marginBottom: 8,
  },
});
