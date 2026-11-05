import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, Fonts, radii } from '@/constants/theme';

// Etapas en palabras llanas. Solo lo establecido; nada de "autofagia",
// "Nobel" ni "recambio inmune" presentados como beneficio.
const FASTING_STAGES = [
  { h: [0,  4],  name: 'Digestión',          info: 'El cuerpo procesa lo que comiste.' },
  { h: [4,  8],  name: 'Después de comer',   info: 'El azúcar en sangre vuelve a su nivel de base.' },
  { h: [8,  12], name: 'En ayuno',           info: 'El cuerpo empieza a usar más grasa como energía.' },
  { h: [12, 16], name: 'Ayuno nocturno largo', info: 'Sigue usando grasa como energía. Cada persona lo siente distinto.' },
  { h: [16, 24], name: 'Ayuno largo',        info: 'Los beneficios extra en personas aún se estudian. Bebe agua.' },
  { h: [24, 72], name: 'Ayuno prolongado',   info: 'Solo con supervisión médica. Si te mareas o te sientes mal, rómpelo.' },
];

type Protocol = { label: string; targetHours: number; description: string };

const PROTOCOLS: Protocol[] = [
  { label: '16:8', targetHours: 16, description: 'Ayunas 16 h y comes en 8 h. El punto de partida.' },
  { label: '18:6', targetHours: 18, description: 'Ayunas 18 h y comes en 6 h.' },
  { label: '20:4', targetHours: 20, description: 'Ayunas 20 h y comes en 4 h. Cuando el 18:6 ya te es fácil.' },
];

// Ayunos largos: detrás de una fila plegada, no al nivel del 16:8.
const LONG_PROTOCOLS: Protocol[] = [
  { label: '24 h', targetHours: 24, description: 'Un día completo. Con supervisión.' },
  { label: '48 h', targetHours: 48, description: 'Solo con supervisión médica.' },
  { label: '72 h', targetHours: 72, description: 'Solo con supervisión médica y preparación.' },
];

// ── Guía: preparar, hidratar y romper el ayuno ───────────────────────────────
const GUIDE_SECTIONS = [
  {
    title: 'Antes',
    points: [
      'Reduce azúcares y ultraprocesados 1–2 días antes.',
      'Cena ligera la noche previa: proteína, vegetales y grasas buenas.',
      'En ayunos largos baja la intensidad del ejercicio y descansa bien.',
    ],
  },
  {
    title: 'Durante',
    points: [
      'Bebe agua durante todo el ayuno.',
      'Puedes tomar agua, café solo y té sin azúcar.',
      'Desde 24 h, añade electrolitos (sodio, potasio, magnesio) para evitar mareo.',
    ],
  },
  {
    title: 'Al romperlo',
    points: [
      'Rompe suave: caldo, proteína ligera o fruta baja en azúcar.',
      'Evita una comida muy grande o muy dulce de golpe.',
      'Come despacio y espera 30–60 min antes de una comida completa.',
      'Cuanto más largo el ayuno, más gradual la vuelta a comer.',
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

/** Fila que se despliega (etapas, guía, ayunos largos). */
function Plegable({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        style={styles.plegable}>
        <Text style={styles.plegableLabel}>{label.toUpperCase()}</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={palette.smoke} />
      </Pressable>
      {open && <View style={styles.plegableBody}>{children}</View>}
    </View>
  );
}

function ProtocolRow({ p, active, onPress }: { p: Protocol; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${p.label}: ${p.description}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.protocolRow, pressed && styles.pressed]}>
      <Text style={[styles.protocolLabel, active && styles.protocolLabelActive]}>{p.label}</Text>
      <Text style={styles.protocolDesc}>{p.description}</Text>
      <View style={styles.protocolCheck}>
        {active && <MaterialIcons name="check" size={20} color={palette.goldText} />}
      </View>
    </Pressable>
  );
}

export default function AyunoScreen() {
  const router = useRouter();
  const { userId } = useLifeFlow();

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakingFood, setBreakingFood] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>(PROTOCOLS[0]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // ms
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const elapsedHours = elapsed / 3_600_000;
  const progress = Math.min(elapsedHours / selectedProtocol.targetHours, 1);
  const currentStage = FASTING_STAGES.find(s => elapsedHours >= s.h[0] && elapsedHours < s.h[1]) ?? FASTING_STAGES[FASTING_STAGES.length - 1];
  const isLong = selectedProtocol.targetHours >= 24;

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

  // UNA acción arriba: empezar el protocolo elegido o, en curso, el reloj
  // grande que se toca para terminar.
  const hero = isActive ? (
    <TarjetaOro
      meta="EN CURSO"
      metaRight={`META ${selectedProtocol.targetHours} H · ${(progress * 100).toFixed(0)}%`}
      title={formatDuration(elapsed)}
      detail={`${currentStage.name}. Toca para terminar el ayuno.`}
      onPress={() => setShowBreakModal(true)}
      accessibilityLabel={`Ayuno en curso: ${formatDuration(elapsed)}. Terminar ayuno`}
    />
  ) : (
    <TarjetaOro
      meta="EMPEZAR"
      metaRight={selectedProtocol.label}
      title={`Ayuno ${selectedProtocol.label}`}
      detail={selectedProtocol.description}
      onPress={() => setShowDisclaimer(true)}
      accessibilityLabel={`Iniciar ayuno ${selectedProtocol.label}`}
    />
  );

  return (
    <>
      <Pantalla
        meta="BIENESTAR · SALUD"
        title="Ayuno"
        sub={isActive ? currentStage.info : 'Elige cuánto y empieza. Agua, café solo y té sin azúcar están permitidos.'}
        hero={hero}
        footer={<Fila label="VOLVER" value="Bienestar" onPress={() => router.back()} last />}>
        {!isActive && (
          <View accessibilityRole="radiogroup">
            {PROTOCOLS.map(p => (
              <ProtocolRow key={p.label} p={p} active={selectedProtocol.label === p.label} onPress={() => setSelectedProtocol(p)} />
            ))}
            <Plegable label="Ayunos largos (con supervisión)">
              {LONG_PROTOCOLS.map(p => (
                <ProtocolRow key={p.label} p={p} active={selectedProtocol.label === p.label} onPress={() => setSelectedProtocol(p)} />
              ))}
            </Plegable>
          </View>
        )}

        <Plegable label="Qué pasa en el cuerpo">
          {FASTING_STAGES.map((s) => {
            const current = isActive && s === currentStage;
            return (
              <View key={s.name} style={styles.item}>
                <Text style={[styles.itemTitle, current && styles.itemTitleCurrent]}>
                  {s.h[0]}–{s.h[1]} h · {s.name}
                </Text>
                <Text style={styles.itemText}>{s.info}</Text>
              </View>
            );
          })}
        </Plegable>

        <Plegable label="Antes, durante y al romperlo">
          {GUIDE_SECTIONS.map((g) => (
            <View key={g.title} style={styles.item}>
              <Text style={styles.itemTitle}>{g.title}</Text>
              {g.points.map((p) => (
                <Text key={p} style={styles.itemText}>· {p}</Text>
              ))}
            </View>
          ))}
        </Plegable>
        <View style={styles.lastLine} />
      </Pantalla>

      {/* Aviso médico — no omitible, antes de CUALQUIER ayuno */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>AVISO MÉDICO</Text>
            <Text style={styles.modalBody}>
              El ayuno intermitente puede no ser adecuado para todas las personas.
              {'\n\n'}Consulta con un profesional de la salud antes de iniciar si tienes diabetes, embarazo, trastornos alimentarios, estás bajo medicación, o tienes cualquier condición médica.
              {'\n\n'}Este protocolo es solo para adultos sanos. No es consejo médico.
              {isLong ? '\n\nUn ayuno de 24 horas o más solo debe hacerse con supervisión médica.' : ''}
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
            <Text style={styles.modalTitle}>TERMINAR EL AYUNO</Text>
            <Text style={styles.modalBody}>
              Rompe suave para cuidar tu digestión. ¿Con qué vas a romperlo?
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
                <Text style={styles.modalCancelText}>Seguir ayunando</Text>
              </Pressable>
              <Pressable onPress={endFast} style={styles.modalConfirm} accessibilityRole="button" accessibilityLabel="Confirmar romper ayuno">
                <Text style={styles.modalConfirmText}>TERMINAR</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pressed:          { opacity: 0.7 },

  protocolRow:      { minHeight: 56, paddingVertical: 12, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', gap: 16 },
  protocolLabel:    { width: 56, fontFamily: Fonts.display, fontWeight: '700', fontSize: 15, color: palette.ash },
  protocolLabelActive: { color: palette.ivory },
  protocolDesc:     { flex: 1, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, color: palette.ash },
  protocolCheck:    { width: 24, alignItems: 'center' },

  plegable:         { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plegableLabel:    { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  plegableBody:     { paddingBottom: 16 },
  lastLine:         { borderTopWidth: 1, borderTopColor: palette.line },

  item:             { paddingVertical: 8, gap: 4 },
  itemTitle:        { fontFamily: Fonts.sansBold, fontSize: 15, lineHeight: 21, color: palette.ivory },
  itemTitleCurrent: { color: palette.goldText },
  itemText:         { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalBox:         { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: palette.lineHard, maxWidth: 440, width: '100%' },
  modalTitle:       { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, color: palette.ivory, letterSpacing: 1, marginBottom: 12 },
  modalBody:        { fontFamily: Fonts.sans, fontSize: 15, color: palette.ash, lineHeight: 22 },
  modalActions:     { flexDirection: 'row', gap: 12, marginTop: spacing.lg, width: '100%' },
  modalCancel:      { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line, alignItems: 'center' },
  modalCancelText:  { fontFamily: Fonts.sans, color: palette.ash, fontSize: 14 },
  modalConfirm:     { flex: 2, minHeight: 44, justifyContent: 'center', backgroundColor: palette.gold, borderRadius: radii.sm, alignItems: 'center' },
  modalConfirmText: { fontFamily: Fonts.display, fontWeight: '700', color: palette.ink, fontSize: 12, letterSpacing: 1 },

  breakInput:       { width: '100%', backgroundColor: palette.black, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line, padding: spacing.sm, minHeight: 44, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 15, marginTop: spacing.md },
  breakChips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  breakChip:        { borderWidth: 1, borderColor: palette.line, borderRadius: radii.pill, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  breakChipText:    { fontSize: 13, color: palette.ash, fontFamily: Fonts.sans },
});
