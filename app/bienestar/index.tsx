import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useWearableConnections, useWearableDaily, recoveryLabel } from '@/lib/wearables';

// ─── Daily phrases (stoic / logotherapy) ─────────────────────────────────────
const DAILY_PHRASES = [
  '"La mente ansiosa por el futuro es miserable." — Séneca',
  '"No podemos elegir circunstancias, sí nuestra respuesta." — Epicteto',
  '"El obstáculo es el camino." — Marco Aurelio',
  '"Sufrir es inevitable. Ser víctima es opcional." — Viktor Frankl',
  '"Perder el tiempo es la única pérdida real." — Marco Aurelio',
  '"La vida no examinada no vale vivirse." — Sócrates',
  '"Te perturban tus opiniones, no los hechos." — Epicteto',
  '"Actúa bien hoy. Mañana también será hoy." — Séneca',
  '"El propósito es la fuente de toda energía." — Viktor Frankl',
  '"Eres lo que haces, no lo que dices que harás." — Aristóteles',
  '"La disciplina es recordar lo que quieres." — D. Campbell',
  '"Ningún viento es favorable sin destino." — Séneca',
  '"Primero decide quién quieres ser." — Epicteto',
  '"No busques que lo que ocurre sea como quieres." — Epicteto',
  '"El significado no se encuentra, se construye." — Viktor Frankl',
  '"Lo que haces hoy es lo que más importa." — Buda',
  '"La mente lo es todo. En lo que piensas, te conviertes." — Marco Aurelio',
  '"Nada es tuyo excepto tu voluntad." — Epicteto',
  '"El descanso no es ocio. Es combustible." — Séneca',
  '"Sé el amo de tu atención o serás esclavo del ruido." — Marco Aurelio',
  '"Actúa como si importara. Importa." — William James',
  '"El miedo no detiene la muerte. Solo detiene la vida." — Paulo Coelho',
  '"Tus valores son lo que haces cuando nadie te ve." — Epicteto',
  '"Cada acción es un voto por quien quieres ser." — James Clear',
  '"Disciplina = Libertad." — Jocko Willink',
  '"El sufrimiento sin sentido es desesperación." — Viktor Frankl',
  '"La gravedad de tu norte calibra el tamaño de tu esfuerzo." — Polaris',
  '"Lo urgente ocupa el lugar de lo importante." — Eisenhower',
  '"El guerrero más peligroso es el que tiene propósito." — Polaris',
  '"Duerme temprano. El que conquista la noche conquista el día." — Polaris',
  '"No esperes a estar listo. La acción crea la claridad." — Polaris',
  '"Si está en tu poder, hazlo. Si no, suéltalo." — Epicteto',
  '"La mejor venganza es no parecerte a quien te hirió." — Marco Aurelio',
  '"Comienza de inmediato a ser quien te propusiste." — Epicteto',
  '"No es que tengamos poco tiempo, es que perdemos mucho." — Séneca',
  '"Quien teme a la muerte nunca vivirá libre." — Séneca',
  '"El hombre vale tanto como las cosas que persigue." — Marco Aurelio',
  '"La suerte es lo que pasa cuando la preparación encuentra la oportunidad." — Séneca',
  '"Ningún día sin una línea." — Plinio el Viejo',
  '"Conócete a ti mismo y conocerás el universo." — Sócrates',
  '"El que tiene un porqué soporta casi cualquier cómo." — Viktor Frankl',
  '"Entre el estímulo y la respuesta hay un espacio: ahí vive tu libertad." — Viktor Frankl',
  '"Lo que se hace fácil de decir es difícil de vivir." — Polaris',
  '"Tu calma es tu ventaja competitiva." — Polaris',
  '"El criterio se entrena en silencio, no en el ruido." — Polaris',
  '"Decide desde quien quieres ser, no desde quien fuiste." — Polaris',
  '"No administres el miedo. Administra la acción." — Polaris',
  '"El operador no reacciona: responde." — Polaris',
  '"Un objetivo claro vale más que diez intenciones." — Polaris',
  '"Lo que no agendas, no existe." — Polaris',
  '"La constancia gana a la intensidad." — Polaris',
  '"Mide lo que importa o medirás lo que distrae." — Polaris',
  '"El cuerpo es el primer sistema que debes gobernar." — Polaris',
  '"Lo difícil de hoy es la base de lo fácil de mañana." — Polaris',
  '"No negocies con el ruido. Manda desde el norte." — Polaris',
  '"El descanso es parte del trabajo, no su ausencia." — Polaris',
  '"La energía se protege, no se gasta en todo." — Polaris',
  '"Haz menos cosas, pero termínalas." — Polaris',
  '"La disciplina pesa kilos; el arrepentimiento, toneladas." — Jim Rohn',
  '"No puedes cambiar el viento, pero sí ajustar las velas." — Aristóteles',
  '"La calidad no es un acto, es un hábito." — Aristóteles',
  '"Somos lo que hacemos repetidamente." — Aristóteles',
  '"La paciencia es amarga, pero su fruto es dulce." — Aristóteles',
  '"El primer paso es no saber adónde vas; el segundo, ir." — Polaris',
  '"Naciste para algo más grande que tu zona de confort." — Polaris',
  '"El que domina su mañana domina su vida." — Polaris',
  '"La libertad empieza donde termina la excusa." — Polaris',
  '"Tu palabra contigo mismo es el contrato más importante." — Polaris',
  '"El que cumple consigo confía en sí." — Polaris',
  '"Vence primero a tu yo de ayer." — Polaris',
  '"La grandeza es una suma de días bien ejecutados." — Polaris',
  '"No controlas el resultado, controlas el estándar." — Polaris',
  '"Persigue el estado, no el resultado." — Polaris',
  '"El silencio también es una respuesta del soberano." — Polaris',
  '"Quien se conoce no necesita probar nada." — Polaris',
  '"Donde pones tu atención, pones tu vida." — Polaris',
  '"La incomodidad es la moneda del crecimiento." — Polaris',
  '"Lo que evitas, te dirige. Lo que enfrentas, te libera." — Polaris',
  '"El que decide rápido y corrige rápido, gana." — Polaris',
  '"Tus hábitos son tu destino en miniatura." — Polaris',
  '"No subas el volumen del mundo; baja el del ruido interno." — Polaris',
  '"El foco es decir no a mil cosas buenas." — Steve Jobs',
  '"Cuídate de la esterilidad de una vida ocupada." — Sócrates',
  '"La adversidad revela al hombre; la prosperidad lo oculta." — Horacio',
  '"Hazte cargo. Nadie viene a salvarte." — Polaris',
  '"La maestría es paciencia con propósito." — Polaris',
  '"Cada amanecer es un protocolo que empieza de nuevo." — Polaris',
  '"El norte no se siente: se decide y se sigue." — Polaris',
  '"Construye una vida de la que no necesites escapar." — Polaris',
];

function getTodayPhrase(): string {
  const day = new Date().getDate();
  return DAILY_PHRASES[day % DAILY_PHRASES.length];
}

// ─── Quick-access blocks ──────────────────────────────────────────────────────
type Block = {
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  color: string;
  type: 'meditation' | 'breathing' | 'binaural' | 'sleep' | 'library' | 'journal';
};

// Monochrome — spec: "Sin colores por categoría (todo monocromo excepto el gold CTA)"
const BLOCKS: Block[] = [
  { route: '/bienestar/binaurales',  icon: 'graphic-eq',      label: 'BINAURALES',  color: palette.ash, type: 'binaural'   },
  { route: '/bienestar/respiracion', icon: 'air',              label: 'RESPIRACIÓN', color: palette.ash, type: 'breathing'  },
  { route: '/bienestar/meditacion',  icon: 'self-improvement', label: 'MEDITACIÓN',  color: palette.ash, type: 'meditation' },
  { route: '/bienestar/sueno',       icon: 'bedtime',          label: 'SUEÑO',       color: palette.ash, type: 'sleep'      },
  { route: '/bienestar/biblioteca',  icon: 'local-library',    label: 'BIBLIOTECA',  color: palette.ash, type: 'library'    },
  { route: '/bienestar/diario',      icon: 'edit-note',        label: 'DIARIO',      color: palette.ash, type: 'journal'    },
];

const BLOCKS_EXTENDED = [
  { id: 'habitos',     icon: 'checklist' as const,      label: 'HÁBITOS',     route: '/bienestar/habitos' },
  { id: 'ayuno',       icon: 'schedule' as const,       label: 'AYUNO',       route: '/bienestar/ayuno' },
  { id: 'nutricion',   icon: 'restaurant' as const,     label: 'NUTRICIÓN',   route: '/bienestar/nutricion' },
  { id: 'cuerpo',      icon: 'fitness-center' as const, label: 'CUERPO',      route: '/bienestar/cuerpo' },
  { id: 'suplementos', icon: 'medication' as const,     label: 'SUPLEMENTOS', route: '/bienestar/suplementacion' },
  { id: 'comunidad',   icon: 'groups' as const,         label: 'COMUNIDAD',   route: '/bienestar/comunidad' },
];

// Herramientas emocionales del curso (Docs 3.2, 3.4 y 4.3)
const BLOCKS_EMOCIONAL = [
  { id: 'grito',       icon: 'campaign' as const,        label: 'GRITO',       route: '/bienestar/grito' },
  { id: 'tapping',     icon: 'touch-app' as const,       label: 'TAPPING',     route: '/bienestar/tapping' },
  { id: 'consciencia', icon: 'psychology-alt' as const,  label: 'CONSCIENCIA', route: '/bienestar/consciencia' },
];

function getWeekDots(sessions: { completedAt: string }[]): boolean[] {
  const now = new Date();
  // 0 = Monday
  const dayOfWeek = (now.getDay() + 6) % 7;
  const dots: boolean[] = Array(7).fill(false);
  sessions.forEach(({ completedAt }) => {
    const d = new Date(completedAt);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff < 7) {
      const dotIdx = (dayOfWeek - diff + 7) % 7;
      dots[dotIdx] = true;
    }
  });
  return dots;
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Wearable Card (inline) ───────────────────────────────────────────────────
function WearableCard({ router }: { router: ReturnType<typeof useRouter> }) {
  const { connections } = useWearableConnections();
  const { today } = useWearableDaily(1);

  if (!connections.length) {
    // Show subtle "connect" prompt
    return (
      <Pressable
        onPress={() => router.push('/bienestar/biometrics' as never)}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
        <PremiumCard style={wearableCardStyles.container}>
          <MaterialIcons name="monitor-heart" size={20} color={palette.goldMuted} />
          <View style={wearableCardStyles.body}>
            <Text style={wearableCardStyles.title}>MI CUERPO HOY</Text>
            <Text style={wearableCardStyles.sub}>Conecta Oura o WHOOP →</Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
        </PremiumCard>
      </Pressable>
    );
  }

  const score = today?.recovery_score ?? null;
  const label = score != null ? recoveryLabel(score) : 'Sin datos';
  const color = score == null ? palette.smoke
    : score >= 70 ? palette.success
    : score >= 50 ? palette.gold
    : score >= 30 ? palette.warning
    : palette.danger;

  return (
    <Pressable
      onPress={() => router.push('/bienestar/biometrics' as never)}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
      <PremiumCard style={wearableCardStyles.container}>
        <MaterialIcons name="monitor-heart" size={20} color={color} />
        <View style={wearableCardStyles.body}>
          <Text style={wearableCardStyles.title}>MI CUERPO HOY</Text>
          <Text style={[wearableCardStyles.sub, { color }]}>
            Recuperación: {score ?? '–'}/100 · {label}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
      </PremiumCard>
    </Pressable>
  );
}
const wearableCardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  body:  { flex: 1 },
  title: { ...typography.label, color: palette.ivory, letterSpacing: 1.5 },
  sub:   { ...typography.caption, color: palette.smoke, marginTop: 2 },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BienestarHub() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useLifeFlow();

  const [journalText, setJournalText] = useState('');
  const [saving, setSaving] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);

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

  const weekDots = useMemo(() => getWeekDots(sessions), [sessions]);

  // Wellness streak: consecutive days back from today with at least one session
  const streak = useMemo(() => {
    const now = new Date();
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      const hasSession = sessions.some((s) => s.completedAt.slice(0, 10) === dayStr);
      if (hasSession) count++;
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const saveJournal = useCallback(async () => {
    if (!journalText.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('journal_entries').insert({
          user_id:    user.id,
          content:    journalText.trim(),
          entry_type: 'reflection',
        });
      }
      setJournalText('');
      setJournalSaved(true);
      setTimeout(() => setJournalSaved(false), 2000);
    } catch {
      // Silent fail — journal is best-effort
    } finally {
      setSaving(false);
    }
  }, [journalText]);

  const phrase = useMemo(() => getTodayPhrase(), []);

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={desktopStyles.contentWrap}>

          {/* ── Header row ── */}
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
            </Pressable>
            <Text style={styles.screenTitle}>BIENESTAR</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={desktopStyles.row}>

            {/* ──────────────── LEFT COLUMN ──────────────── */}
            <View style={desktopStyles.left}>

              {/* Wearable card */}
              <WearableCard router={router} />

              {/* PRÁCTICA grid */}
              <GoldDivider label="PRÁCTICA" />
              <View style={desktopStyles.blocksGrid}>
                {BLOCKS.map((block) => (
                  <Pressable
                    key={block.route}
                    onPress={() => router.push(block.route as never)}
                    style={({ pressed }) => [desktopStyles.gridCard, pressed && { opacity: 0.75 }]}>
                    <MaterialIcons name={block.icon} size={28} color={palette.ash} />
                    <Text style={desktopStyles.gridLabel}>{block.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* SISTEMA INTEGRAL grid */}
              <GoldDivider label="SISTEMA INTEGRAL" />
              <View style={desktopStyles.blocksGrid}>
                {BLOCKS_EXTENDED.map((block) => (
                  <Pressable
                    key={block.route}
                    onPress={() => router.push(block.route as never)}
                    style={({ pressed }) => [desktopStyles.gridCard, pressed && { opacity: 0.75 }]}>
                    <MaterialIcons name={block.icon} size={28} color={palette.ash} />
                    <Text style={desktopStyles.gridLabel}>{block.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* LIBERACIÓN EMOCIONAL grid */}
              <GoldDivider label="LIBERACIÓN EMOCIONAL" />
              <View style={desktopStyles.blocksGrid}>
                {BLOCKS_EMOCIONAL.map((block) => (
                  <Pressable
                    key={block.route}
                    onPress={() => router.push(block.route as never)}
                    style={({ pressed }) => [desktopStyles.gridCard, pressed && { opacity: 0.75 }]}>
                    <MaterialIcons name={block.icon} size={28} color={palette.ash} />
                    <Text style={desktopStyles.gridLabel}>{block.label}</Text>
                  </Pressable>
                ))}
              </View>

            </View>
            {/* ──────────────── RIGHT COLUMN ──────────────── */}
            <View style={desktopStyles.right}>

              {/* Stats card */}
              <PremiumCard>
                <Text style={[styles.chipsLabel, { marginBottom: spacing.md }]}>ESTA SEMANA</Text>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{stats.weekSessions}</Text>
                    <Text style={styles.statLabel}>SESIONES</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{stats.weekMinutes}</Text>
                    <Text style={styles.statLabel}>MINUTOS</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{streak}</Text>
                    <Text style={styles.statLabel}>DÍAS/SEM</Text>
                  </View>
                </View>

                {/* Week dots */}
                <View style={[styles.dotRow, { justifyContent: 'center', marginTop: spacing.md }]}>
                  {DAY_LABELS.map((label, i) => (
                    <View key={label} style={styles.dotItem}>
                      <View style={[styles.dot, weekDots[i] && styles.dotActive]} />
                      <Text style={styles.dotLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </PremiumCard>

              {/* Journal rápido */}
              <GoldDivider label="DIARIO RÁPIDO" />
              <PremiumCard style={{ gap: spacing.md }}>
                <TextInput
                  style={styles.journalInput}
                  multiline
                  value={journalText}
                  onChangeText={setJournalText}
                  placeholder="Escribe tu reflexión de hoy..."
                  placeholderTextColor={palette.smoke}
                  textAlignVertical="top"
                  returnKeyType="default"
                />
                <Pressable
                  style={[styles.journalBtn, (!journalText.trim() || saving) && styles.journalBtnDisabled]}
                  onPress={saveJournal}
                  disabled={!journalText.trim() || saving}>
                  {saving
                    ? <ActivityIndicator size="small" color={palette.ink} />
                    : journalSaved
                      ? <MaterialIcons name="check" size={18} color={palette.ink} />
                      : <Text style={styles.journalBtnText}>GUARDAR</Text>
                  }
                </Pressable>
              </PremiumCard>

              {/* Frase del día */}
              <PremiumCard style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <MaterialIcons name="format-quote" size={20} color={palette.goldMuted} />
                <Text style={styles.phraseText}>{phrase}</Text>
              </PremiumCard>

            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>BIENESTAR</Text>
        <Text style={styles.headerSub}>El cuerpo es el primer sistema de armas.</Text>
      </View>

      {/* ── Quick stats: sessions · minutes + week activity dots ── */}
      <PremiumCard style={styles.statsCard}>
        <View style={styles.statsLeft}>
          <View style={styles.statsHeadline}>
            <Text style={styles.statsNumber}>{stats.weekSessions}</Text>
            <Text style={styles.statsUnit}>sesiones</Text>
          </View>
          <Text style={styles.statsMeta}>{stats.weekMinutes} MIN · ESTA SEMANA</Text>
        </View>
        <View style={styles.dotRow}>
          {DAY_LABELS.map((label, i) => (
            <View key={label} style={styles.dotItem}>
              <View style={[styles.dot, weekDots[i] && styles.dotActive]} />
              <Text style={styles.dotLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </PremiumCard>

      {/* ── PRÁCTICA grid ── */}
      <GoldDivider label="PRÁCTICA" />
      <View style={styles.grid}>
        {BLOCKS.map((b) => (
          <HubTile key={b.route} icon={b.icon} label={b.label} onPress={() => router.push(b.route as never)} />
        ))}
      </View>

      {/* ── SISTEMA INTEGRAL grid ── */}
      <GoldDivider label="SISTEMA INTEGRAL" />
      <View style={styles.grid}>
        {BLOCKS_EXTENDED.map((b) => (
          <HubTile key={b.id} icon={b.icon} label={b.label} onPress={() => router.push(b.route as never)} />
        ))}
      </View>

      {/* ── LIBERACIÓN EMOCIONAL grid (gold-accented tiles) ── */}
      <GoldDivider label="LIBERACIÓN EMOCIONAL" />
      <View style={styles.grid}>
        {BLOCKS_EMOCIONAL.map((b) => (
          <HubTile key={b.id} icon={b.icon} label={b.label} gold onPress={() => router.push(b.route as never)} />
        ))}
      </View>

      {/* ── Wearable card (real biometrics — shown if connected, else connect prompt) ── */}
      <WearableCard router={router} />

      {/* ── Frase del día ── */}
      <Text style={styles.phraseQuote}>{phrase}</Text>

    </ScrollView>
  );
}

// ─── Hub Tile — square card with large icon (design: PRÁCTICA / SISTEMA / LIBERACIÓN) ──
function HubTile({
  icon,
  label,
  gold,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  gold?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        gold && styles.gridCardGold,
        pressed && { opacity: 0.75 },
      ]}>
      <MaterialIcons name={icon} size={28} color={gold ? palette.goldText : palette.ivory} />
      <Text style={[styles.gridLabel, gold && styles.gridLabelGold]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { ...typography.title, color: palette.ivory, fontSize: 21 },

  // Header (design: title + body subtitle)
  header: { gap: 6, marginBottom: spacing.sm },
  headerSub: { ...typography.body, color: palette.ash, fontSize: 13 },

  // Week activity dots (shared mobile + desktop)
  dotRow: { flexDirection: 'row', gap: 6 },
  dotItem: { alignItems: 'center', gap: 6 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: palette.charcoal,
  },
  dotActive: { backgroundColor: palette.gold },
  dotLabel: { ...typography.label, color: palette.smoke, fontSize: 8, letterSpacing: 0.4 },

  // Quick-stats card — sessions headline + week dots (design)
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsLeft: { gap: spacing.xs },
  statsHeadline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statsNumber: { fontFamily: Fonts.display, color: palette.goldText, fontSize: 26, letterSpacing: 0.5 },
  statsUnit: { ...typography.mono, color: palette.ash },
  statsMeta: { ...typography.mono, color: palette.smoke, fontSize: 10, letterSpacing: 1 },

  // Desktop stats row (kept for desktop branch)
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 28, letterSpacing: 1 },
  statLabel: { ...typography.label, color: palette.smoke, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: palette.line },
  chipsLabel: { ...typography.label, color: palette.ash },

  // Tile grid (3 columns of square cards)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridCard: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minWidth: 92,
  },
  gridCardGold: {
    borderColor: palette.lineGold,
    backgroundColor: palette.goldGlow,
  },
  gridLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  gridLabelGold: { color: palette.goldText },

  // Frase del día (italic, centered)
  phraseQuote: {
    ...typography.body,
    color: palette.ash,
    fontStyle: 'italic',
    fontSize: 13.5,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  // Desktop phrase text (kept for desktop branch)
  phraseText: { ...typography.body, color: palette.ash, fontStyle: 'italic', lineHeight: 22 },

  journalInput: {
    ...typography.body,
    color: palette.ivory,
    minHeight: 80,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.graphite,
  },
  journalBtn: {
    backgroundColor: palette.gold,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  journalBtnDisabled: { opacity: 0.4 },
  journalBtnText: { ...typography.label, color: palette.ink, fontWeight: '700' },
});

// ─── Desktop-only styles ──────────────────────────────────────────────────────
const desktopStyles = StyleSheet.create({
  contentWrap: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
  },
  row: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-start',
  },
  left: {
    flex: 3,
    gap: 16,
  },
  right: {
    flex: 2,
    gap: 16,
  },
  blocksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '31%',
    aspectRatio: 1.2,
    backgroundColor: palette.graphite,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gridLabel: {
    ...typography.label,
    color: palette.ivory,
    fontSize: 10,
    textAlign: 'center',
  },
});
