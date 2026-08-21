import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { Dial, DialValue, HeroPanel } from '@/components/focus-deck';
import { GoldDivider } from '@/components/polaris';

const FASTING_STAGES = [
  { h: [0,  4],  name: 'Digestión activa',   info: 'El cuerpo procesa los nutrientes. Insulina elevada.',           color: palette.smoke },
  { h: [4,  8],  name: 'Post-absorción',      info: 'Glucosa se normaliza. El cuerpo empieza a usar glucógeno.',     color: palette.smoke },
  // Gradiente de intensidad por opacidad sobre palette.gold — no un hex nuevo
  // por etapa. A mayor duración del ayuno, más opaco (más "profundo") el oro.
  { h: [8,  12], name: 'Estado de ayuno',     info: 'Glucógeno casi agotado. Transición hacia grasas.',             color: palette.goldDim },
  { h: [12, 16], name: 'Cetosis temprana',    info: 'Producción de cetonas. Muchos reportan más claridad mental.',  color: alpha(palette.gold, '99') },
  { h: [16, 20], name: 'Autofagia activa',    info: 'El reciclaje celular (autofagia) se intensifica. Mecanismo del Nobel 2016; evidencia en humanos aún en estudio.', color: alpha(palette.gold, 'B3') },
  { h: [20, 24], name: 'Cetosis profunda',    info: 'Estudios pequeños reportan más hormona de crecimiento y menos inflamación.', color: alpha(palette.gold, 'CC') },
  { h: [24, 48], name: 'Autofagia sostenida', info: 'Glucógeno agotado; el cuerpo recurre a la grasa. Autofagia sostenida (evidencia mayormente preclínica).', color: alpha(palette.gold, 'E6') },
  { h: [48, 72], name: 'Cambio metabólico',   info: 'Modelos preclínicos sugieren recambio inmune; en humanos no está confirmado. Solo con supervisión.', color: palette.gold },
];

const PROTOCOLS = [
  { label: '16:8',  targetHours: 16, description: 'El más popular. Ayuna 16h, come en ventana de 8h.' },
  { label: '18:6',  targetHours: 18, description: 'Intermedio. Mayor autofagia y quema de grasa.' },
  { label: '20:4',  targetHours: 20, description: 'Avanzado. Para quienes dominan el 18:6.' },
  { label: '24h',   targetHours: 24, description: 'Un día completo. Solo para practicantes experimentados.' },
  { label: '48h',   targetHours: 48, description: 'Ayuno prolongado. Autofagia profunda. Requiere experiencia.' },
  { label: '72h',   targetHours: 72, description: 'Ayuno extendido. Solo con supervisión médica y mucha preparación.' },
];

// ── Guía educativa: preparar, hidratar y romper el ayuno (refeeding) ──────────
const GUIDE_SECTIONS = [
  {
    icon: 'self-improvement' as const,
    title: 'Preparar el cuerpo',
    points: [
      'Reduce azúcares y ultraprocesados 1–2 días antes para suavizar la transición.',
      'Cena ligera la noche previa: proteína magra, vegetales y grasas buenas.',
      'En ayunos largos (48h+) baja la intensidad del ejercicio y descansa bien.',
    ],
  },
  {
    icon: 'water-drop' as const,
    title: 'Hidratación y electrolitos',
    points: [
      'Bebe agua de forma constante durante todo el ayuno.',
      'Permitido: agua, café solo y té sin azúcar (no rompen el ayuno).',
      'En 24h+ añade electrolitos (sodio, potasio, magnesio) para evitar mareo y fatiga.',
    ],
  },
  {
    icon: 'restaurant' as const,
    title: 'Cómo ROMPER el ayuno (refeeding)',
    points: [
      'Rompe suave: caldo de huesos, proteína ligera o fruta de bajo índice glucémico.',
      'Evita una comida copiosa o muy azucarada de golpe — puede causar malestar.',
      'Mastica despacio y espera 30–60 min antes de una comida completa.',
      'A mayor duración del ayuno, más gradual debe ser la reintroducción de alimentos.',
    ],
  },
];

// Sugerencias rápidas para el alimento con que se rompe el ayuno (breaking_food).
const BREAKING_FOOD_SUGGESTIONS = [
  'Caldo de huesos',
  'Proteína ligera',
  'Fruta baja en azúcar',
  'Aguacate',
  'Yogur / kéfir',
];

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AyunoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakingFood, setBreakingFood] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState(PROTOCOLS[0]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // ms
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const elapsedHours = elapsed / 3_600_000;
  const progress = Math.min(elapsedHours / selectedProtocol.targetHours, 1);
  const currentStage = FASTING_STAGES.find(s => elapsedHours >= s.h[0] && elapsedHours < s.h[1]) ?? FASTING_STAGES[0];

  useEffect(() => {
    if (startedAt) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startedAt.getTime());
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startedAt]);

  const startFast = async () => {
    setShowDisclaimer(false);
    const now = new Date();
    setStartedAt(now);
    setElapsed(0);
    if (!userId) return;
    try {
      const { data } = await db2.fasting().insert({
        user_id:       userId,
        type:          selectedProtocol.label,
        target_hours:  selectedProtocol.targetHours,
        started_at:    now.toISOString(),
      }).select('id').maybeSingle();
      if (data) setSessionId((data as any).id);
    } catch { /* tabla puede no existir aún */ }
  };

  const endFast = async () => {
    if (!startedAt) return;
    const now = new Date();
    const actualHours = (now.getTime() - startedAt.getTime()) / 3_600_000;
    const food = breakingFood.trim();
    setStartedAt(null);
    setShowBreakModal(false);
    if (userId && sessionId) {
      try {
        await db2.fasting().update({
          ended_at:      now.toISOString(),
          completed:     actualHours >= selectedProtocol.targetHours,
          actual_hours:  Math.round(actualHours * 10) / 10,
          // breaking_food: alimento con que se rompió el ayuno (columna nueva, cliente sin tipar)
          breaking_food: food || null,
        }).eq('id', sessionId);
      } catch { /* silencioso */ }
    }
    setSessionId(null);
    setElapsed(0);
    setBreakingFood('');
  };

  const isActive = !!startedAt;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.title}>AYUNO</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timer central — el temporizador ES el estado protagonista cuando hay ayuno activo. */}
        <HeroPanel>
          {isActive ? (
            <View style={styles.heroBody}>
              <Text style={styles.timerLabel}>TIEMPO ACTIVO</Text>
              {/* El reloj de ayuno — el Dial de la casa (mismo instrumento que
                  el score de Comando). El arco toma el color de la etapa: a
                  mayor profundidad del ayuno, más denso el oro. La barra
                  horizontal que había aquí decía lo mismo con menos verdad
                  visual: esto ES un temporizador circular. */}
              <Dial pct={progress} size={148} stroke={8} tint={currentStage.color}>
                <DialValue
                  value={formatDuration(elapsed)}
                  caption={`META ${selectedProtocol.targetHours}H · ${(progress * 100).toFixed(0)}%`}
                />
              </Dial>
              {/* Etapa actual */}
              <View style={[styles.stageChip, { borderColor: currentStage.color }]}>
                <Text style={[styles.stageName, { color: currentStage.color }]}>{currentStage.name}</Text>
              </View>
              <Text style={styles.stageInfo}>{currentStage.info}</Text>
            </View>
          ) : (
            <View style={styles.heroBody}>
              <Text style={styles.timerLabel}>AYUNO</Text>
              <Text style={styles.timerIdleText}>Sin ayuno activo</Text>
              <Text style={styles.timerSub}>Selecciona un protocolo e inicia</Text>
            </View>
          )}
        </HeroPanel>

        {/* Protocolo selector */}
        {!isActive && (
          <View style={styles.section}>
            <GoldDivider label="PROTOCOLO" />
            {PROTOCOLS.map(p => (
              <Pressable
                key={p.label}
                onPress={() => setSelectedProtocol(p)}
                accessibilityRole="button"
                accessibilityLabel={`Protocolo ${p.label}: ${p.description}`}
                accessibilityState={{ selected: selectedProtocol.label === p.label }}
                style={[styles.protocolRow, selectedProtocol.label === p.label && styles.protocolRowActive]}
              >
                <View style={styles.protocolLeft}>
                  <Text style={[styles.protocolLabel, selectedProtocol.label === p.label && { color: palette.ink }]}>
                    {p.label}
                  </Text>
                </View>
                <Text style={[styles.protocolDesc, selectedProtocol.label === p.label && { color: palette.ink }]}>
                  {p.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Etapas científicas */}
        <View style={styles.section}>
          <GoldDivider label="ETAPAS DEL AYUNO" />
          {FASTING_STAGES.map((s, i) => {
            const reached = elapsedHours >= s.h[0];
            return (
              <View key={i} style={styles.stageRow}>
                <View style={[styles.stageDot, { backgroundColor: reached ? s.color : palette.line }]} />
                <View style={styles.stageContent}>
                  <Text style={[styles.stageRowName, reached && { color: s.color }]}>
                    {s.h[0]}h–{s.h[1]}h · {s.name}
                  </Text>
                  <Text style={styles.stageRowInfo}>{s.info}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* GUÍA — preparar, hidratar y romper el ayuno */}
        <View style={styles.section}>
          <GoldDivider label="GUÍA" />
          {GUIDE_SECTIONS.map((g, i) => (
            <View key={i} style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <MaterialIcons name={g.icon} size={18} color={palette.goldText} />
                <Text style={styles.guideTitle}>{g.title}</Text>
              </View>
              {g.points.map((p, j) => (
                <View key={j} style={styles.guidePointRow}>
                  <View style={styles.guideBullet} />
                  <Text style={styles.guidePointText}>{p}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Botón de acción */}
        <Pressable
          onPress={isActive ? () => setShowBreakModal(true) : () => setShowDisclaimer(true)}
          accessibilityRole="button"
          accessibilityLabel={isActive ? 'Romper ayuno' : 'Iniciar ayuno'}
          style={[styles.ctaBtn, isActive && styles.ctaBtnEnd]}
        >
          <Text style={styles.ctaBtnText}>
            {isActive ? 'ROMPER AYUNO' : 'INICIAR AYUNO'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Disclaimer modal — no omitible */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <MaterialIcons name="warning" size={32} color={palette.goldText} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>AVISO MÉDICO</Text>
            <Text style={styles.modalBody}>
              El ayuno intermitente puede no ser adecuado para todas las personas.
              {'\n\n'}Consulta con un profesional de la salud antes de iniciar si tienes diabetes, embarazo, trastornos alimentarios, estás bajo medicación, o tienes cualquier condición médica.
              {'\n\n'}Este protocolo es solo para adultos sanos. No es consejo médico.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowDisclaimer(false)} style={styles.modalCancel} accessibilityRole="button" accessibilityLabel="Cancelar">
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={startFast} style={styles.modalConfirm} accessibilityRole="button" accessibilityLabel="Entendido, iniciar ayuno">
                <Text style={styles.modalConfirmText}>ENTENDIDO · INICIAR</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Romper ayuno (refeeding) — captura breaking_food */}
      <Modal visible={showBreakModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBox}>
            <MaterialIcons name="restaurant" size={32} color={palette.goldText} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>ROMPER EL AYUNO</Text>
            <Text style={styles.modalBody}>
              Rompe suave para cuidar tu digestión. ¿Con qué alimento vas a romper el ayuno?
            </Text>
            <TextInput
              style={styles.breakInput}
              value={breakingFood}
              onChangeText={setBreakingFood}
              placeholder="Ej: caldo de huesos"
              placeholderTextColor={palette.smoke}
              accessibilityLabel="Con qué alimento vas a romper el ayuno"
            />
            <View style={styles.breakChips}>
              {BREAKING_FOOD_SUGGESTIONS.map(s => (
                <Pressable key={s} onPress={() => setBreakingFood(s)} style={styles.breakChip} accessibilityRole="button" accessibilityLabel={`Usar: ${s}`}>
                  <Text style={styles.breakChipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowBreakModal(false)} style={styles.modalCancel} accessibilityRole="button" accessibilityLabel="Cancelar">
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={endFast} style={styles.modalConfirm} accessibilityRole="button" accessibilityLabel="Confirmar romper ayuno">
                <Text style={styles.modalConfirmText}>ROMPER AYUNO</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: palette.black },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:          { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title:            { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  content:          { paddingHorizontal: spacing.md, paddingBottom: 40 },

  heroBody:         { alignItems: 'center', gap: 8 },
  timerLabel:       { ...typography.label, color: palette.goldText },
  timerDisplay:     { fontFamily: Fonts.mono, fontSize: 48, color: palette.ivory, letterSpacing: 4 },
  timerProtocol:    { ...typography.caption, color: palette.ash },
  progressBar:      { width: '100%', height: 3, backgroundColor: palette.line, borderRadius: 2, overflow: 'hidden', marginVertical: 4 },
  progressFill:     { height: '100%', backgroundColor: palette.gold, borderRadius: 2 },
  stageChip:        { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 12, marginTop: 8, minHeight: 44, justifyContent: 'center' },
  stageName:        { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '600' },
  stageInfo:        { ...typography.caption, color: palette.ash, textAlign: 'center' },
  timerIdleText:    { fontFamily: Fonts.display, fontSize: 22, color: palette.ivory, letterSpacing: 1 },
  timerSub:         { ...typography.caption, color: palette.ash },

  section:          { marginBottom: spacing.lg },

  protocolRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, paddingHorizontal: spacing.md, minHeight: 44, marginBottom: 8, gap: spacing.sm },
  protocolRowActive:{ backgroundColor: palette.gold },
  protocolLeft:     { width: 44, alignItems: 'center' },
  protocolLabel:    { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory },
  protocolDesc:     { flex: 1, fontSize: 12, color: palette.ash },

  stageRow:         { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stageDot:         { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  stageContent:     { flex: 1 },
  stageRowName:     { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash, fontWeight: '600' },
  stageRowInfo:     { fontSize: 12, color: palette.smoke, marginTop: 2 },

  guideCard:        { backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: palette.gold },
  guideHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  guideTitle:       { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, fontWeight: '700', flex: 1 },
  guidePointRow:    { flexDirection: 'row', gap: 8, marginBottom: 6 },
  guideBullet:      { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.gold, marginTop: 7 },
  guidePointText:   { flex: 1, fontSize: 12, color: palette.ash, lineHeight: 18 },

  ctaBtn:           { backgroundColor: palette.gold, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', marginTop: 8, minHeight: 44, justifyContent: 'center' },
  ctaBtnEnd:        { backgroundColor: alpha(palette.gold, '33'), borderWidth: 1, borderColor: palette.gold },
  ctaBtnText:       { fontFamily: Fonts.display, fontSize: 14, color: palette.ink, letterSpacing: 2 },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalBox:         { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: palette.gold, maxWidth: 440, width: '100%', alignItems: 'center' },
  modalTitle:       { fontFamily: Fonts.display, fontSize: 16, color: palette.goldText, letterSpacing: 2, marginBottom: 12 },
  modalBody:        { fontSize: 14, color: palette.ash, lineHeight: 22, textAlign: 'center' },
  modalActions:     { flexDirection: 'row', gap: 12, marginTop: spacing.lg, width: '100%' },
  modalCancel:      { flex: 1, minHeight: 44, justifyContent: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, alignItems: 'center' },
  modalCancelText:  { color: palette.ash, fontSize: 13 },
  modalConfirm:     { flex: 2, minHeight: 44, justifyContent: 'center', backgroundColor: palette.gold, borderRadius: radii.sm, alignItems: 'center' },
  modalConfirmText: { fontFamily: Fonts.display, color: palette.ink, fontSize: 12, letterSpacing: 1 },

  breakInput:       { width: '100%', backgroundColor: palette.black, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line, padding: spacing.sm, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 14, marginTop: spacing.md },
  breakChips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm, justifyContent: 'center' },
  breakChip:        { borderWidth: 1, borderColor: palette.lineGold, borderRadius: radii.pill, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', backgroundColor: palette.goldLight },
  breakChipText:    { fontSize: 11, color: palette.goldText, fontFamily: Fonts.sans },
});
