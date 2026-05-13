import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';

const FASTING_STAGES = [
  { h: [0,  4],  name: 'Digestión activa',   info: 'El cuerpo procesa los nutrientes. Insulina elevada.',           color: '#555' },
  { h: [4,  8],  name: 'Post-absorción',      info: 'Glucosa se normaliza. El cuerpo empieza a usar glucógeno.',     color: '#666' },
  { h: [8,  12], name: 'Estado de ayuno',     info: 'Glucógeno casi agotado. Transición hacia grasas.',             color: '#EDBA01' },
  { h: [12, 16], name: 'Cetosis temprana',    info: 'Producción de cetonas. Claridad mental aumenta notablemente.', color: '#E8A000' },
  { h: [16, 20], name: 'Autofagia activa',    info: 'Reciclaje celular profundo. Premio Nobel Medicina 2016.',      color: '#D4AF37' },
  { h: [20, 24], name: 'Regeneración máx.',   info: 'HGH aumenta hasta 5×. Reducción de inflamación sistémica.',   color: '#C8A020' },
];

const PROTOCOLS = [
  { label: '16:8',  targetHours: 16, description: 'El más popular. Ayuna 16h, come en ventana de 8h.' },
  { label: '18:6',  targetHours: 18, description: 'Intermedio. Mayor autofagia y quema de grasa.' },
  { label: '20:4',  targetHours: 20, description: 'Avanzado. Para quienes dominan el 18:6.' },
  { label: '24h',   targetHours: 24, description: 'Un día completo. Solo para practicantes experimentados.' },
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
    setStartedAt(null);
    if (userId && sessionId) {
      try {
        await db2.fasting().update({
          ended_at:     now.toISOString(),
          completed:    actualHours >= selectedProtocol.targetHours,
          actual_hours: Math.round(actualHours * 10) / 10,
        }).eq('id', sessionId);
      } catch { /* silencioso */ }
    }
    setSessionId(null);
    setElapsed(0);
  };

  const isActive = !!startedAt;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.title}>AYUNO</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timer central */}
        <View style={styles.timerCard}>
          {isActive ? (
            <>
              <Text style={styles.timerLabel}>TIEMPO ACTIVO</Text>
              <Text style={styles.timerDisplay}>{formatDuration(elapsed)}</Text>
              <Text style={styles.timerProtocol}>
                Meta: {selectedProtocol.targetHours}h · {(progress * 100).toFixed(0)}%
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              {/* Etapa actual */}
              <View style={[styles.stageChip, { borderColor: currentStage.color }]}>
                <Text style={[styles.stageName, { color: currentStage.color }]}>{currentStage.name}</Text>
              </View>
              <Text style={styles.stageInfo}>{currentStage.info}</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="timer" size={48} color={palette.gold} />
              <Text style={styles.timerIdleText}>Sin ayuno activo</Text>
              <Text style={styles.timerSub}>Selecciona un protocolo e inicia</Text>
            </>
          )}
        </View>

        {/* Protocolo selector */}
        {!isActive && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROTOCOLO</Text>
            {PROTOCOLS.map(p => (
              <Pressable
                key={p.label}
                onPress={() => setSelectedProtocol(p)}
                style={[styles.protocolRow, selectedProtocol.label === p.label && styles.protocolRowActive]}
              >
                <View style={styles.protocolLeft}>
                  <Text style={[styles.protocolLabel, selectedProtocol.label === p.label && { color: palette.black }]}>
                    {p.label}
                  </Text>
                </View>
                <Text style={[styles.protocolDesc, selectedProtocol.label === p.label && { color: palette.black }]}>
                  {p.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Etapas científicas */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ETAPAS DEL AYUNO</Text>
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

        {/* Botón de acción */}
        <Pressable
          onPress={isActive ? endFast : () => setShowDisclaimer(true)}
          style={[styles.ctaBtn, isActive && styles.ctaBtnEnd]}
        >
          <Text style={styles.ctaBtnText}>
            {isActive ? 'TERMINAR AYUNO' : 'INICIAR AYUNO'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Disclaimer modal — no omitible */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <MaterialIcons name="warning" size={32} color={palette.gold} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>AVISO MÉDICO</Text>
            <Text style={styles.modalBody}>
              El ayuno intermitente puede no ser adecuado para todas las personas.
              {'\n\n'}Consulta con un profesional de la salud antes de iniciar si tienes diabetes, embarazo, trastornos alimentarios, estás bajo medicación, o tienes cualquier condición médica.
              {'\n\n'}Este protocolo es solo para adultos sanos. No es consejo médico.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowDisclaimer(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={startFast} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>ENTENDIDO · INICIAR</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: palette.black },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:          { padding: 8 },
  title:            { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  content:          { paddingHorizontal: spacing.md, paddingBottom: 40 },

  timerCard:        { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg, gap: 8 },
  timerLabel:       { ...typography.label, color: palette.gold },
  timerDisplay:     { fontFamily: Fonts.mono, fontSize: 48, color: palette.ivory, letterSpacing: 4 },
  timerProtocol:    { ...typography.caption, color: palette.ash },
  progressBar:      { width: '100%', height: 3, backgroundColor: palette.line, borderRadius: 2, overflow: 'hidden', marginVertical: 4 },
  progressFill:     { height: '100%', backgroundColor: palette.gold, borderRadius: 2 },
  stageChip:        { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  stageName:        { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '600' },
  stageInfo:        { ...typography.caption, color: palette.ash, textAlign: 'center' },
  timerIdleText:    { fontFamily: Fonts.display, fontSize: 22, color: palette.ivory, letterSpacing: 1 },
  timerSub:         { ...typography.caption, color: palette.ash },

  section:          { marginBottom: spacing.lg },
  sectionLabel:     { ...typography.label, color: palette.gold, marginBottom: spacing.sm },

  protocolRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, marginBottom: 8, gap: spacing.sm },
  protocolRowActive:{ backgroundColor: palette.gold },
  protocolLeft:     { width: 44, alignItems: 'center' },
  protocolLabel:    { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory },
  protocolDesc:     { flex: 1, fontSize: 12, color: palette.ash },

  stageRow:         { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stageDot:         { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  stageContent:     { flex: 1 },
  stageRowName:     { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash, fontWeight: '600' },
  stageRowInfo:     { fontSize: 12, color: palette.smoke, marginTop: 2 },

  ctaBtn:           { backgroundColor: palette.gold, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: 8 },
  ctaBtnEnd:        { backgroundColor: 'rgba(212,175,55,0.2)', borderWidth: 1, borderColor: palette.gold },
  ctaBtnText:       { fontFamily: Fonts.display, fontSize: 14, color: palette.black, letterSpacing: 2 },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalBox:         { backgroundColor: '#111111', borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: palette.gold, maxWidth: 440, width: '100%', alignItems: 'center' },
  modalTitle:       { fontFamily: Fonts.display, fontSize: 16, color: palette.gold, letterSpacing: 2, marginBottom: 12 },
  modalBody:        { fontSize: 14, color: palette.ash, lineHeight: 22, textAlign: 'center' },
  modalActions:     { flexDirection: 'row', gap: 12, marginTop: spacing.lg, width: '100%' },
  modalCancel:      { flex: 1, padding: 12, backgroundColor: palette.graphite, borderRadius: radii.sm, alignItems: 'center' },
  modalCancelText:  { color: palette.ash, fontSize: 13 },
  modalConfirm:     { flex: 2, padding: 12, backgroundColor: palette.gold, borderRadius: radii.sm, alignItems: 'center' },
  modalConfirmText: { fontFamily: Fonts.display, color: palette.black, fontSize: 12, letterSpacing: 1 },
});
