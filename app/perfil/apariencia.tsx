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
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { SIGNAL_VARS, THEME_VARS, type BackdropId, type SignalId } from '@/constants/themeColors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { APP_MODES, useAppMode, type AppMode } from '@/hooks/use-app-mode';

// ─── Catálogo ─────────────────────────────────────────────────────────────────
// Cada nota dice qué DECIDE la opción o para quién es, no cómo se ve: el cómo se
// ve ya está en pantalla al pulsarla.

const BACKDROPS: { id: BackdropId; name: string; note: string }[] = [
  { id: 'dark',    name: 'Smoky',   note: 'El anterior. Negro suave con neutros grises.' },
  { id: 'carbon',  name: 'Carbón',  note: 'El neutro se sesga al oro: menos quirófano, más cuero.' },
  { id: 'aura',    name: 'Aura',    note: 'Negro profundo con un resplandor detrás. Atmósfera.' },
  { id: 'tinta',   name: 'Tinta',   note: 'El original. Negro real del manual; en OLED el píxel se apaga.' },
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
  const { mode: appMode, setMode: setAppMode } = useAppMode();
  const [showMore, setShowMore] = useState(false);

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

      {/* Dos decisiones a la vista; las 99 combinaciones de paleta, plegadas.
          Antes eran 4 modos + 11 fondos + 9 señales + una muestra a la vez:
          "mucho ruido visual y cosas desgastantes para evaluar". */}
      {canToggle ? (
        <>
          <GoldDivider label="CLARO U OSCURO" />
          <View style={s.pair} accessibilityRole="radiogroup">
            {([['tinta', 'Oscuro', 'dark-mode'], ['light', 'Claro', 'light-mode']] as const).map(([id, name, icon]) => {
              const on = mode === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setMode(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={name}
                  style={({ pressed }) => [s.pairBtn, on && s.optOn, pressed && { opacity: 0.85 }]}>
                  <MaterialIcons name={icon} size={22} color={on ? palette.goldText : palette.ash} />
                  <Text style={[s.pairName, on && { color: palette.goldText }]}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <View style={s.scopeNote}>
          <MaterialIcons name="info-outline" size={15} color={palette.smoke} />
          <Text style={s.scopeText}>En la app del teléfono el color es fijo (oscuro). Desde el navegador puedes elegir claro u oscuro.</Text>
        </View>
      )}

      <GoldDivider label="CUÁNTO SE MUESTRA" />
      <View style={s.grid} accessibilityRole="radiogroup">
        {APP_MODES.map((m: { id: AppMode; label: string; description: string }) => (
          <OptionCard
            key={m.id}
            name={m.label}
            note={m.description}
            active={appMode === m.id}
            onPress={() => setAppMode(m.id)}>
            <View />
          </OptionCard>
        ))}
      </View>

      {canToggle && (
        <Pressable
          onPress={() => setShowMore((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
          style={s.moreBtn}>
          <MaterialIcons name={showMore ? 'expand-less' : 'expand-more'} size={18} color={palette.smoke} />
          <Text style={s.moreText}>{showMore ? 'Ocultar más paletas' : 'Más paletas'}</Text>
        </Pressable>
      )}

      {canToggle && showMore && (
        <>
          <GoldDivider label="FONDO" />
          <View style={s.grid} accessibilityRole="radiogroup">
            {BACKDROPS.map((b) => (
              <OptionCard key={b.id} name={b.name} note={b.note} active={mode === b.id} onPress={() => setMode(b.id)}>
                <Swatches vars={THEME_VARS[b.id]} keys={['--c-bg', '--c-surface', '--c-surface-3', '--c-text']} />
              </OptionCard>
            ))}
          </View>

          <GoldDivider label="COLOR DE ACENTO" />
          <View style={s.grid} accessibilityRole="radiogroup">
            {SIGNALS.map((sig) => (
              <OptionCard key={sig.id} name={sig.name} note={sig.note} active={signal === sig.id} onPress={() => setSignal(sig.id)}>
                <Swatches vars={SIGNAL_VARS[sig.id]} keys={['--c-gold', '--c-success', '--c-warning', '--c-danger']} />
              </OptionCard>
            ))}
          </View>

          <Pressable
            style={s.resetBtn}
            onPress={() => { setMode('tinta'); setSignal('oro'); }}
            accessibilityRole="button"
            accessibilityLabel="Volver a la paleta original">
            <MaterialIcons name="restart-alt" size={16} color={palette.smoke} />
            <Text style={s.resetText}>Volver a la original (Tinta · Oro)</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 18, fontWeight: '800', color: palette.ivory, letterSpacing: 2 },

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

  pair: { flexDirection: 'row', gap: spacing.md },
  pairBtn: {
    flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderRadius: radii.md,
  },
  pairName: { ...typography.section, color: palette.ivory, fontSize: 14 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, marginTop: spacing.md },
  moreText: { ...typography.caption, color: palette.smoke, fontSize: 13 },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.lg, minHeight: 44,
  },
  resetText: { ...typography.caption, color: palette.smoke, fontSize: 12 },
});
