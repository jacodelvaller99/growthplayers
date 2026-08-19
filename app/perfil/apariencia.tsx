/**
 * Apariencia — el cliente elige cómo se ve su app.
 *
 * Dos ejes que se combinan (6 fondos × 5 señales = 30 paletas) sobre la app
 * REAL y sus datos reales, no sobre una previsualización aparte: al pulsar, todo
 * lo que hay detrás cambia. Vive en el perfil, no en admin, porque es del
 * usuario — el admin llega a la misma pantalla desde su panel.
 *
 * La preferencia se guarda en ESTE navegador. No toca la base de datos ni lo que
 * ven otras personas, y en la app nativa los ejes no re-tematizan (ahí el color
 * va compilado en hex); la pantalla lo dice en vez de fingir que funciona.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { SIGNAL_VARS, THEME_VARS, type BackdropId, type SignalId } from '@/constants/themeColors';
import { useAppTheme } from '@/hooks/use-app-theme';

// ─── Catálogo ─────────────────────────────────────────────────────────────────
// Cada nota dice qué DECIDE la opción o para quién es, no cómo se ve: el cómo se
// ve ya está en pantalla al pulsarla.

const BACKDROPS: { id: BackdropId; name: string; note: string }[] = [
  { id: 'dark',    name: 'Smoky',   note: 'El original. Negro del manual con neutros grises.' },
  { id: 'carbon',  name: 'Carbón',  note: 'El neutro se sesga al oro: menos quirófano, más cuero.' },
  { id: 'aura',    name: 'Aura',    note: 'Negro profundo con un resplandor detrás. Atmósfera.' },
  { id: 'tinta',   name: 'Tinta',   note: 'Negro real. En pantallas OLED el píxel se apaga.' },
  { id: 'pizarra', name: 'Pizarra', note: 'Frío, azulado. Baja la temperatura y el oro resalta.' },
  { id: 'bruma',   name: 'Bruma',   note: 'Negros levantados. Menos contraste: para sesiones largas y de noche.' },
  { id: 'bosque',  name: 'Bosque',  note: 'El neutro se sesga al verde. El unico fondo que no evoca una oficina.' },
  { id: 'vino',    name: 'Vino',    note: 'Granate profundo. Sube la temperatura sin encender la pantalla.' },
  { id: 'light',   name: 'Luz',     note: 'El día. Grises del manual y texto Smoky Black.' },
  { id: 'arena',   name: 'Arena',   note: 'El día, en cálido. El papel se sesga hacia el pergamino.' },
  { id: 'nieve',   name: 'Nieve',   note: 'El dia, en frio. Para quien no quiere la pantalla amarilleada.' },
];

const SIGNALS: { id: SignalId; name: string; note: string }[] = [
  { id: 'semaforo', name: 'Semáforo',  note: 'Verde, ámbar y rojo con significado: recuperado · medio · riesgo.' },
  { id: 'oro',      name: 'Oro',       note: 'Philippine Yellow para todo. El punto de partida.' },
  { id: 'ambar',    name: 'Ámbar',     note: 'El segundo oro del manual. Menos neón, más metal.' },
  { id: 'calma',    name: 'Dos voces', note: 'El oro exige, el azul restaura. Separa empuje de recuperación.' },
  { id: 'nitido',   name: 'Nítido',    note: 'Todo el acento sube de contraste. Para vista cansada o pantalla al sol.' },
  { id: 'sereno',   name: 'Sereno',    note: 'El acento baja de volumen. Para cuando la pantalla no debe gritarte.' },
  { id: 'vital',    name: 'Vital',     note: 'Verde y rojo más vivos. Para leer la app como un tablero.' },
  { id: 'respiro',  name: 'Respiro',   note: 'El registro callado: la alarma se vuelve arcilla. Parar no es un error.' },
  { id: 'seguro',   name: 'Seguro',    note: 'Azul y naranja en vez de rojo y verde. Legible con daltonismo.' },
];

/** Muestras leídas del registro — no repintadas a mano, así nunca mienten. */
function Swatches({ vars, keys }: { vars: Record<string, string>; keys: string[] }) {
  return (
    <View style={s.swatchRow}>
      {keys.map((k) => (
        <View key={k} style={[s.swatch, { backgroundColor: vars[k] }]} />
      ))}
    </View>
  );
}

function OptionCard({
  name, note, active, onPress, children,
}: {
  name: string;
  note: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${name}. ${note}`}
      style={({ pressed }) => [s.opt, active && s.optOn, pressed && { opacity: 0.85 }]}>
      <View style={s.optHead}>
        {children}
        {active && <MaterialIcons name="check-circle" size={16} color={palette.goldText} />}
      </View>
      <Text style={[s.optName, active && { color: palette.goldText }]}>{name}</Text>
      <Text style={s.optNote}>{note}</Text>
    </Pressable>
  );
}

export default function AparienciaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, setMode, signal, setSignal, canToggle } = useAppTheme();

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">APARIENCIA</Text>
        <View style={{ width: 40 }} />
      </View>

      <PremiumCard style={s.infoCard}>
        <MaterialIcons name="palette" size={26} color={palette.goldText} />
        <View style={{ flex: 1 }}>
          <Text style={s.infoTitle}>TU APP, TU COLOR</Text>
          <Text style={s.infoSub}>
            Dos decisiones que se combinan: la tinta del fondo y qué comunica el color.
            Se aplican al instante en toda la app, sobre tus datos reales.
          </Text>
        </View>
      </PremiumCard>

      {/* Honestidad de alcance: sin esto es fácil creer que ya cambió en el móvil. */}
      <View style={s.scopeNote}>
        <MaterialIcons name="info-outline" size={15} color={palette.smoke} />
        <Text style={s.scopeText}>
          {canToggle
            ? 'Tu elección se guarda en este navegador. Si entras desde otro equipo, arranca en el original.'
            : 'En la app del teléfono estos ajustes todavía no cambian el color: ahí va fijo en Smoky + Oro. Ábrela desde el escritorio o el navegador para elegir.'}
        </Text>
      </View>

      <GoldDivider label="FONDO · LA TINTA" />
      <View style={s.grid} accessibilityRole="radiogroup">
        {BACKDROPS.map((b) => (
          <OptionCard key={b.id} name={b.name} note={b.note} active={mode === b.id} onPress={() => setMode(b.id)}>
            <Swatches vars={THEME_VARS[b.id]} keys={['--c-bg', '--c-surface', '--c-surface-3', '--c-text']} />
          </OptionCard>
        ))}
      </View>

      <GoldDivider label="SEÑAL · QUÉ COMUNICA EL COLOR" />
      <View style={s.grid} accessibilityRole="radiogroup">
        {SIGNALS.map((sig) => (
          <OptionCard key={sig.id} name={sig.name} note={sig.note} active={signal === sig.id} onPress={() => setSignal(sig.id)}>
            <Swatches vars={SIGNAL_VARS[sig.id]} keys={['--c-gold', '--c-success', '--c-warning', '--c-danger']} />
          </OptionCard>
        ))}
      </View>

      <GoldDivider label="CÓMO SE VE" />
      {/* Muestra deliberada: una tarjeta elevada DENTRO de otra, para que se vea
          la rampa de elevación, y una línea dorada, que es lo que desaparecía en
          el tema claro antes de recalibrar el oro con alfa. */}
      <PremiumCard style={s.demoCard}>
        <Text style={s.demoLabel}>MUESTRA EN VIVO</Text>

        <View style={s.demoInner}>
          <Text style={s.demoInnerTitle}>Tarjeta elevada</Text>
          <Text style={s.demoInnerBody}>
            Si esto se lee como un hueco en vez de como algo por encima, la rampa
            de este fondo está mal.
          </Text>
          <View style={s.demoGoldLine} />
        </View>

        <View style={s.demoRow}>
          <View style={[s.demoPill, { backgroundColor: palette.gold }]}>
            <Text style={[s.demoPillText, { color: palette.ink }]}>ACCIÓN</Text>
          </View>
          <View style={[s.demoPill, s.demoPillOutline, { backgroundColor: palette.successMuted, borderColor: palette.success }]}>
            <Text style={[s.demoPillText, { color: palette.success }]}>ÓPTIMO</Text>
          </View>
          <View style={[s.demoPill, s.demoPillOutline, { backgroundColor: palette.goldLight, borderColor: palette.warning }]}>
            <Text style={[s.demoPillText, { color: palette.warning }]}>MEDIO</Text>
          </View>
          <View style={[s.demoPill, s.demoPillOutline, { backgroundColor: palette.dangerMuted, borderColor: palette.danger }]}>
            <Text style={[s.demoPillText, { color: palette.dangerText }]}>RIESGO</Text>
          </View>
        </View>

        <View style={[s.demoRecovery, { borderColor: palette.calm }]}>
          <MaterialIcons name="self-improvement" size={16} color={palette.calm} />
          <Text style={[s.demoRecoveryText, { color: palette.calm }]}>
            Recuperación — solo cambia de voz en “Dos voces”
          </Text>
        </View>

        <Text style={s.demoHint}>
          Estas muestras usan los mismos tokens que el resto de la app: lo que veas
          aquí es literalmente lo que verás en Comando y en Biometría.
        </Text>
      </PremiumCard>

      <Pressable
        style={s.resetBtn}
        onPress={() => { setMode('dark'); setSignal('oro'); }}
        accessibilityRole="button"
        accessibilityLabel="Volver a la paleta original">
        <MaterialIcons name="restart-alt" size={16} color={palette.smoke} />
        <Text style={s.resetText}>Volver a la original (Smoky · Oro)</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 18, fontWeight: '800', color: palette.ivory, letterSpacing: 2 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoTitle: { ...typography.section, color: palette.ivory, fontSize: 13, marginBottom: 6 },
  infoSub: { ...typography.body, color: palette.smoke, fontSize: 13, lineHeight: 20 },

  scopeNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginTop: spacing.md, paddingHorizontal: spacing.xs,
  },
  scopeText: { ...typography.caption, color: palette.smoke, flex: 1, fontSize: 12, lineHeight: 17 },

  // flexBasis 200 → una columna en móvil (375px), dos o tres en escritorio.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  opt: {
    flexGrow: 1, flexBasis: 200, minHeight: 44,
    backgroundColor: palette.graphite,
    borderWidth: 1, borderColor: palette.line, borderRadius: radii.md,
    padding: spacing.md, gap: 6,
  },
  optOn: { borderColor: palette.lineGold, backgroundColor: palette.goldGlow },
  optHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optName: { ...typography.section, color: palette.ivory, fontSize: 12 },
  optNote: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16 },

  swatchRow: { flexDirection: 'row', gap: 4 },
  swatch: { width: 22, height: 22, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.line },

  demoCard: { gap: spacing.md },
  demoLabel: { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 1.6 },
  demoInner: {
    backgroundColor: palette.charcoal, borderRadius: radii.sm,
    borderWidth: 1, borderColor: palette.line, padding: spacing.md, gap: 6,
  },
  demoInnerTitle: { ...typography.section, color: palette.ivory, fontSize: 11 },
  demoInnerBody: { ...typography.caption, color: palette.ash, fontSize: 11, lineHeight: 16 },
  demoGoldLine: { height: 1, backgroundColor: palette.lineGold, marginTop: 4 },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  demoPill: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.sm, minHeight: 34, justifyContent: 'center' },
  demoPillOutline: { borderWidth: 1 },
  demoPillText: { fontFamily: Fonts.display, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  demoRecovery: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  demoRecoveryText: { ...typography.caption, fontSize: 12, flex: 1 },
  demoHint: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16 },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.lg, minHeight: 44,
  },
  resetText: { ...typography.caption, color: palette.smoke, fontSize: 12 },
});
