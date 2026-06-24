/**
 * app/mentoria/index.tsx — Mentoría Inteligente
 *
 * El dashboard del journey de mentoría: dónde estás en el programa, qué trabajar
 * esta semana, el plan de acción que Norman construye desde las notas de sesión
 * del Navegador, y el registro de notas semana a semana.
 *
 * Sigue la línea de diseño Polaris (GrandisExtended, oro, tokens themeables).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  GoldAccentCard,
  GoldDivider,
  PremiumCard,
  StatusPill,
  useScreen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { PlaudImport } from '@/components/PlaudImport';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useMentorship, type SessionNote, type ActionItem, type SessionDraft } from '@/hooks/use-mentorship';
import {
  MENTORSHIP_PROGRAM,
  TOTAL_WEEKS,
  currentWeek,
  currentWeekNumber,
  formatWeekRange,
  weekDateRange,
  weekStatus,
  type MentorshipWeek,
} from '@/data/mentorship';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

// ── Espejo: temas que Norman trabajó, derivados del texto real de la nota ──────
// No inventa contenido — solo etiqueta lo que YA está escrito. Si nada matchea,
// no se muestran tags. Cada tema tiene su palabra-señal (ES) por dominio Polaris.
const THEME_TAGS: { label: string; cues: string[] }[] = [
  { label: 'ENFOQUE',       cues: ['enfoque', 'foco', 'prioridad', 'distrac', 'claridad'] },
  { label: 'DISCIPLINA',    cues: ['disciplina', 'hábito', 'habito', 'rutina', 'consisten', 'compromiso'] },
  { label: 'ENERGÍA',       cues: ['energía', 'energia', 'sueño', 'sueno', 'descanso', 'fatiga', 'recuper'] },
  { label: 'DECISIÓN',      cues: ['decisión', 'decision', 'decidir', 'elección', 'eleccion', 'rumbo'] },
  { label: 'EJECUCIÓN',     cues: ['ejecu', 'avanc', 'acción', 'accion', 'entreg', 'resultado'] },
  { label: 'MIEDO',         cues: ['miedo', 'duda', 'inseg', 'ansiedad', 'bloqueo', 'resist'] },
  { label: 'RELACIONES',    cues: ['relación', 'relacion', 'pareja', 'familia', 'equipo', 'conflicto'] },
  { label: 'PROPÓSITO',     cues: ['propósito', 'proposito', 'sentido', 'norte', 'visión', 'vision', 'legado'] },
];

/** Devuelve los temas presentes en el texto de la nota (máx 3). Pura. */
function deriveThemes(text: string): string[] {
  const hay = text.toLowerCase();
  const hits: string[] = [];
  for (const t of THEME_TAGS) {
    if (t.cues.some((c) => hay.includes(c))) hits.push(t.label);
    if (hits.length >= 3) break;
  }
  return hits;
}

/** Etiqueta del rango de fechas de una semana, a partir del inicio del protocolo. */
function weekRangeLabel(week: number, protocolStartDate: string): string {
  return formatWeekRange(weekDateRange(week, protocolStartDate));
}

export default function MentoriaScreen() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, protocolDay, userId } = useLifeFlow();
  const m = useMentorship();

  const weekNum = currentWeekNumber(protocolDay);
  const week = currentWeek(protocolDay);
  const startDate = useMemo(() => fmtDate(state.protocolStartDate), [state.protocolStartDate]);
  const currentRange = useMemo(
    () => weekRangeLabel(weekNum, state.protocolStartDate),
    [weekNum, state.protocolStartDate],
  );

  const [noteText, setNoteText] = useState('');
  const [noteWeek, setNoteWeek] = useState(weekNum);
  const [manualText, setManualText] = useState('');

  const pendingCount = m.plan.filter((it) => !it.done).length;
  const isRecording = m.recordingPhase === 'recording';
  const isProcessing =
    m.recordingPhase === 'uploading' ||
    m.recordingPhase === 'transcribing' ||
    m.recordingPhase === 'summarizing';

  // ── Consentimiento + arranque de grabación ─────────────────────────────────
  const beginRecording = () => {
    Alert.alert(
      'Grabar esta sesión',
      'Vas a grabar el audio de tu sesión de mentoría. Se subirá de forma privada a ' +
        'tu espacio cifrado, se transcribirá y Norman redactará tus notas y plan de acción. ' +
        'Solo tú (y tu Navegador) podrán verlo. ¿Autorizas la grabación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Autorizo y grabar', onPress: () => { void m.startRecording(); } },
      ],
    );
  };

  const recLabel: Record<string, string> = {
    uploading: 'SUBIENDO AUDIO…',
    transcribing: 'TRANSCRIBIENDO…',
    summarizing: 'NORMAN REDACTA…',
  };

  // ── Hero: dónde estás ──────────────────────────────────────────────────────
  const hero = (
    <GoldAccentCard style={styles.hero}>
      <View style={styles.heroTop}>
        <StatusPill label={`SEMANA ${weekNum} DE ${TOTAL_WEEKS}`} dot />
        <Text style={styles.heroStart}>INICIO · {startDate}</Text>
      </View>
      <Text style={styles.heroPhase}>{week.phase}</Text>
      <View style={styles.heroDateRow}>
        <MaterialIcons name="event" size={13} color={palette.goldText} />
        <Text style={styles.heroDate}>{currentRange}</Text>
      </View>
      <Text style={styles.heroFocus}>{week.focus}</Text>
      <View style={styles.heroBar}>
        <View style={[styles.heroBarFill, { width: `${Math.round((weekNum / TOTAL_WEEKS) * 100)}%` as unknown as number }]} />
      </View>
      <Text style={styles.heroMeta}>
        {pendingCount > 0
          ? `${pendingCount} ${pendingCount === 1 ? 'acción pendiente' : 'acciones pendientes'} esta semana`
          : 'Sin acciones pendientes — define tu plan'}
      </Text>
    </GoldAccentCard>
  );

  // ── Plan de acción ─────────────────────────────────────────────────────────
  const planSection = (
    <PremiumCard style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>PLAN DE ACCIÓN</Text>
        <Pressable
          onPress={m.generatePlan}
          disabled={m.generating || m.notes.length === 0}
          style={[styles.aiBtn, (m.generating || m.notes.length === 0) && styles.aiBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Generar plan con Norman"
        >
          {m.generating ? (
            <ActivityIndicator size="small" color={palette.ink} />
          ) : (
            <MaterialIcons name="auto-awesome" size={15} color={palette.ink} />
          )}
          <Text style={styles.aiBtnText}>
            {m.generating ? 'NORMAN…' : 'GENERAR CON NORMAN'}
          </Text>
        </Pressable>
      </View>

      {m.notes.length === 0 && (
        <Text style={styles.hint}>
          Registra las notas de tu sesión abajo y Norman construirá tu plan de acción.
        </Text>
      )}

      {m.plan.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="checklist" size={22} color={palette.smoke} />
          <Text style={styles.emptyText}>Aún no hay acciones. Genera tu plan o agrega una.</Text>
        </View>
      ) : (
        <View style={styles.itemList}>
          {m.plan.map((it) => (
            <ActionRow key={it.id} item={it} onToggle={() => m.toggleItem(it.id)} onRemove={() => m.removeItem(it.id)} />
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          value={manualText}
          onChangeText={setManualText}
          placeholder="Agregar una acción manual…"
          placeholderTextColor={palette.smoke}
          selectionColor={palette.gold}
          style={styles.addInput}
          onSubmitEditing={() => { m.addManualItem(manualText); setManualText(''); }}
          returnKeyType="done"
        />
        <Pressable
          onPress={() => { m.addManualItem(manualText); setManualText(''); }}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Agregar acción"
        >
          <MaterialIcons name="add" size={20} color={palette.goldText} />
        </Pressable>
      </View>
    </PremiumCard>
  );

  // ── Journey timeline ───────────────────────────────────────────────────────
  const timelineSection = (
    <PremiumCard style={styles.section}>
      <Text style={styles.sectionTitle}>RUTA DE LA MENTORÍA</Text>
      <View style={styles.timeline}>
        {MENTORSHIP_PROGRAM.map((w) => (
          <WeekRow
            key={w.week}
            w={w}
            status={weekStatus(w.week, protocolDay)}
            dateRange={weekRangeLabel(w.week, state.protocolStartDate)}
            onPickForNote={() => setNoteWeek(w.week)}
            selectedForNote={noteWeek === w.week}
          />
        ))}
      </View>
    </PremiumCard>
  );

  // ── Notas de sesión ────────────────────────────────────────────────────────
  const notesSection = (
    <PremiumCard style={styles.section}>
      <Text style={styles.sectionTitle}>NOTAS DE SESIÓN</Text>
      <Text style={styles.notesSub}>
        Tu Navegador registra aquí cada sesión; Norman convierte las notas en tu plan de acción.
      </Text>

      {/* ── Grabar sesión → IA ─────────────────────────────────────────────── */}
      {m.draft ? (
        <DraftEditor
          draft={m.draft}
          weekRange={weekRangeLabel(m.draft.week, state.protocolStartDate)}
          onChangeNotes={(t) => m.updateDraft({ notes: t })}
          onChangeAction={(i, t) => {
            const next = m.draft!.actions.slice();
            next[i] = t;
            m.updateDraft({ actions: next });
          }}
          onRemoveAction={(i) => {
            const next = m.draft!.actions.slice();
            next.splice(i, 1);
            m.updateDraft({ actions: next });
          }}
          onAddAction={() => m.updateDraft({ actions: [...m.draft!.actions, ''] })}
          onConfirm={() => { void m.confirmDraft(); }}
          onDiscard={m.discardDraft}
        />
      ) : (
        <View style={styles.recordBox}>
          {!m.audioAvailable ? (
            <Text style={styles.recordUnavailable}>
              {Platform.OS === 'web'
                ? 'La grabación con IA está disponible en la app móvil (iOS / Android).'
                : 'La grabación no está disponible en este dispositivo.'}
            </Text>
          ) : isProcessing ? (
            <View style={styles.recordProcessing}>
              <ActivityIndicator size="small" color={palette.goldText} />
              <Text style={styles.recordProcessingText}>
                {recLabel[m.recordingPhase] ?? 'PROCESANDO…'}
              </Text>
            </View>
          ) : isRecording ? (
            <View style={styles.recordActive}>
              <View style={styles.recRow}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>GRABANDO SESIÓN · SEM {noteWeek}</Text>
              </View>
              <View style={styles.recBtns}>
                <Pressable
                  onPress={() => m.cancelRecording()}
                  style={styles.recCancel}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar grabación"
                >
                  <MaterialIcons name="close" size={16} color={palette.smoke} />
                  <Text style={styles.recCancelText}>CANCELAR</Text>
                </Pressable>
                <Pressable
                  onPress={() => { void m.stopRecordingAndProcess(noteWeek); }}
                  style={styles.recStop}
                  accessibilityRole="button"
                  accessibilityLabel="Detener y procesar"
                >
                  <MaterialIcons name="stop" size={16} color={palette.ink} />
                  <Text style={styles.recStopText}>DETENER Y PROCESAR</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={beginRecording}
              style={styles.recStart}
              accessibilityRole="button"
              accessibilityLabel="Grabar sesión"
            >
              <MaterialIcons name="mic" size={18} color={palette.ink} />
              <Text style={styles.recStartText}>GRABAR SESIÓN</Text>
            </Pressable>
          )}
          {m.recordingError && <Text style={styles.recError}>{m.recordingError}</Text>}
        </View>
      )}

      <View style={styles.noteComposer}>
        <View style={styles.noteWeekRow}>
          <Text style={styles.noteWeekLabel}>SESIÓN DE LA</Text>
          <View style={styles.weekChips}>
            {[weekNum - 1, weekNum, weekNum + 1]
              .filter((w) => w >= 1 && w <= TOTAL_WEEKS)
              .map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setNoteWeek(w)}
                  style={[styles.weekChip, noteWeek === w && styles.weekChipOn]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.weekChipText, noteWeek === w && styles.weekChipTextOn]}>
                    SEM {w}
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>
        <TextInput
          value={noteText}
          onChangeText={setNoteText}
          placeholder="¿Qué se trabajó? ¿Qué quedó pendiente? ¿Qué observaste?"
          placeholderTextColor={palette.smoke}
          selectionColor={palette.gold}
          style={styles.noteInput}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          onPress={() => { m.addNote(noteWeek, noteText); setNoteText(''); }}
          disabled={!noteText.trim()}
          style={[styles.saveNote, !noteText.trim() && styles.saveNoteDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Guardar nota"
        >
          <MaterialIcons name="save" size={16} color={palette.ink} />
          <Text style={styles.saveNoteText}>GUARDAR NOTA</Text>
        </Pressable>
      </View>

      {m.notes.length > 0 && (
        <>
          <GoldDivider />
          <View style={styles.mirrorIntro}>
            <Text style={styles.mirrorIntroTitle}>EL ESPEJO DE TU PROCESO</Text>
            <Text style={styles.mirrorIntroText}>
              Cada sesión queda registrada. Léelas en orden y verás el arco: dónde
              empezaste, qué se movió, hacia dónde vas.
            </Text>
          </View>
          <View style={styles.noteList}>
            {m.notes.map((n) => (
              <NoteCard
                key={n.id}
                n={n}
                weekRange={weekRangeLabel(n.week, state.protocolStartDate)}
                onRemove={() => m.removeNote(n.id)}
              />
            ))}
          </View>
        </>
      )}
    </PremiumCard>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        contentContainerStyle={[
          isDesktop ? styles.contentDesktop : { ...sc.content, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader title="MENTORÍA" />
        {hero}

        {isDesktop ? (
          <View style={styles.grid}>
            <View style={styles.colLeft}>{timelineSection}</View>
            <View style={styles.colRight}>
              {planSection}
              {notesSection}
              <PlaudImport userId={userId ?? null} userName={state.profile.name} />
            </View>
          </View>
        ) : (
          <>
            {planSection}
            {timelineSection}
            {notesSection}
            <PlaudImport userId={userId ?? null} userName={state.profile.name} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActionRow({ item, onToggle, onRemove }: { item: ActionItem; onToggle: () => void; onRemove: () => void }) {
  return (
    <View style={styles.itemRow}>
      <Pressable onPress={onToggle} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}>
        <View style={[styles.checkBox, item.done && styles.checkBoxOn]}>
          {item.done && <MaterialIcons name="check" size={14} color={palette.ink} />}
        </View>
      </Pressable>
      <Text style={[styles.itemText, item.done && styles.itemTextDone]}>{item.text}</Text>
      {item.source === 'ia' && <MaterialIcons name="auto-awesome" size={13} color={palette.goldText} style={{ marginRight: 4 }} />}
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Eliminar acción">
        <MaterialIcons name="close" size={15} color={palette.smoke} />
      </Pressable>
    </View>
  );
}

function WeekRow({
  w, status, dateRange, onPickForNote, selectedForNote,
}: { w: MentorshipWeek; status: ReturnType<typeof weekStatus>; dateRange: string; onPickForNote: () => void; selectedForNote: boolean }) {
  const [open, setOpen] = useState(status === 'actual');
  const dot =
    status === 'completada' ? <MaterialIcons name="check" size={13} color={palette.ink} />
    : status === 'actual' ? <View style={styles.dotPulse} />
    : null;
  return (
    <View style={styles.weekRow}>
      <View style={styles.weekRail}>
        <View style={[
          styles.weekDot,
          status === 'completada' && styles.weekDotDone,
          status === 'actual' && styles.weekDotActive,
        ]}>{dot}</View>
        {w.week < TOTAL_WEEKS && <View style={styles.weekLine} />}
      </View>
      <Pressable style={styles.weekBody} onPress={() => setOpen(!open)} accessibilityRole="button">
        <View style={styles.weekHead}>
          <Text style={[styles.weekNum, status === 'actual' && styles.weekNumActive]}>SEMANA {w.week}</Text>
          <Text style={[styles.weekRange, status === 'actual' && styles.weekRangeActive]}>{dateRange}</Text>
          {status === 'actual' && <StatusPill label="AHORA" />}
        </View>
        <Text style={[styles.weekPhase, status === 'proxima' && styles.weekPhaseDim]}>{w.phase}</Text>
        {open && (
          <View style={styles.weekDetail}>
            <Text style={styles.weekFocus}>{w.focus}</Text>
            {w.tasks.map((t, i) => (
              <View key={i} style={styles.taskRow}>
                <MaterialIcons name="radio-button-unchecked" size={13} color={palette.smoke} />
                <Text style={styles.taskText}>{t}</Text>
              </View>
            ))}
            <Pressable onPress={onPickForNote} style={styles.noteLink} accessibilityRole="button">
              <MaterialIcons name="edit-note" size={15} color={palette.goldText} />
              <Text style={styles.noteLinkText}>{selectedForNote ? 'SELECCIONADA PARA NOTA' : 'TOMAR NOTA DE ESTA SEMANA'}</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function NoteCard({ n, weekRange, onRemove }: { n: SessionNote; weekRange: string; onRemove: () => void }) {
  // Espejo: la síntesis es lo que Norman REGISTRÓ; los temas se derivan del texto
  // real, sin inventar. Si la nota nació de una grabación, el encuadre es "lo que
  // Norman vio en tu sesión"; si es manual, es tu propio registro.
  const themes = useMemo(() => deriveThemes(n.notes ?? ''), [n.notes]);
  const fromVoice = !!n.transcript || !!n.audioUrl;
  return (
    <View style={styles.noteCard}>
      <View style={styles.noteCardHead}>
        <View style={styles.noteCardTag}>
          <MaterialIcons name={fromVoice ? 'auto-awesome' : 'edit-note'} size={11} color={palette.goldText} />
          <Text style={styles.noteCardTagText}>
            {fromVoice ? 'LO QUE NORMAN VIO' : 'TU REGISTRO'}
          </Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Eliminar nota">
          <MaterialIcons name="close" size={14} color={palette.smoke} />
        </Pressable>
      </View>
      <Text style={styles.noteCardText}>{n.notes}</Text>
      {themes.length > 0 && (
        <View style={styles.themeRow}>
          {themes.map((t) => (
            <View key={t} style={styles.themeTag}>
              <Text style={styles.themeTagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
      {n.audioUrl && (
        <View style={styles.audioRow}>
          <MaterialIcons name="play-circle-outline" size={15} color={palette.goldText} />
          <Text style={styles.audioText}>Grabación de sesión</Text>
        </View>
      )}
      {/* Fecha/semana ABAJO de la nota (pedido de la reunión). */}
      <View style={styles.noteCardFooter}>
        <MaterialIcons name="event" size={12} color={palette.smoke} />
        <Text style={styles.noteCardFooterText}>
          SEMANA {n.week} · {weekRange} · {fmtDate(n.date)}
        </Text>
      </View>
    </View>
  );
}

function DraftEditor({
  draft, weekRange, onChangeNotes, onChangeAction, onRemoveAction, onAddAction, onConfirm, onDiscard,
}: {
  draft: SessionDraft;
  weekRange: string;
  onChangeNotes: (t: string) => void;
  onChangeAction: (i: number, t: string) => void;
  onRemoveAction: (i: number) => void;
  onAddAction: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  return (
    <View style={styles.draftBox}>
      <View style={styles.draftHead}>
        <MaterialIcons
          name={draft.transcriptionFailed ? 'edit-note' : 'auto-awesome'}
          size={15}
          color={palette.goldText}
        />
        <Text style={styles.draftTitle}>
          {draft.transcriptionFailed ? 'ESCRIBE TUS NOTAS' : 'NORMAN REDACTÓ TU SESIÓN'}
        </Text>
      </View>
      <Text style={styles.draftSub}>
        {draft.transcriptionFailed
          ? `No pudimos transcribir el audio (se guardó igual). Escribe las notas a mano · SEMANA ${draft.week} · ${weekRange}`
          : `Revisa y edita las notas y el plan antes de guardar · SEMANA ${draft.week} · ${weekRange}`}
      </Text>

      <Text style={styles.draftLabel}>NOTAS DE SESIÓN</Text>
      <TextInput
        value={draft.notes}
        onChangeText={onChangeNotes}
        placeholder="Notas de la sesión…"
        placeholderTextColor={palette.smoke}
        selectionColor={palette.gold}
        style={styles.draftNotes}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.draftLabel}>PLAN DE ACCIÓN</Text>
      {draft.actions.map((a, i) => (
        <View key={i} style={styles.draftActionRow}>
          <MaterialIcons name="chevron-right" size={16} color={palette.goldText} />
          <TextInput
            value={a}
            onChangeText={(t) => onChangeAction(i, t)}
            placeholder="Acción…"
            placeholderTextColor={palette.smoke}
            selectionColor={palette.gold}
            style={styles.draftActionInput}
          />
          <Pressable onPress={() => onRemoveAction(i)} hitSlop={8} accessibilityLabel="Quitar acción">
            <MaterialIcons name="close" size={15} color={palette.smoke} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={onAddAction} style={styles.draftAddAction} accessibilityRole="button">
        <MaterialIcons name="add" size={16} color={palette.goldText} />
        <Text style={styles.draftAddActionText}>AGREGAR ACCIÓN</Text>
      </Pressable>

      <View style={styles.draftBtns}>
        <Pressable onPress={onDiscard} style={styles.draftDiscard} accessibilityRole="button">
          <Text style={styles.draftDiscardText}>DESCARTAR</Text>
        </Pressable>
        <Pressable onPress={onConfirm} style={styles.draftConfirm} accessibilityRole="button">
          <MaterialIcons name="check" size={16} color={palette.ink} />
          <Text style={styles.draftConfirmText}>GUARDAR SESIÓN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentDesktop: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 80,
    gap: spacing.xl,
  },
  grid: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  colLeft: { flex: 1.1 },
  colRight: { flex: 1, gap: spacing.xl },

  // Hero
  hero: { gap: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStart: { ...typography.mono, fontSize: 10, color: palette.smoke, letterSpacing: 1 },
  heroPhase: {
    fontFamily: Fonts.display, fontWeight: '700', fontSize: 26, color: palette.ivory,
    letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4,
  },
  heroDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  heroDate: { ...typography.mono, fontSize: 11, color: palette.goldText, letterSpacing: 0.5 },
  heroFocus: { ...typography.body, color: palette.ash, fontSize: 14, lineHeight: 21 },
  heroBar: { height: 4, borderRadius: 2, backgroundColor: palette.charcoal, overflow: 'hidden', marginTop: 6 },
  heroBarFill: { height: '100%', backgroundColor: palette.gold, borderRadius: 2 },
  heroMeta: { ...typography.mono, fontSize: 11, color: palette.goldText, letterSpacing: 0.5 },

  // Section
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, color: palette.ivory, letterSpacing: 2, textTransform: 'uppercase' },
  hint: { ...typography.body, fontSize: 13, color: palette.smoke, lineHeight: 19 },
  notesSub: { ...typography.body, fontSize: 12.5, color: palette.smoke, lineHeight: 18 },

  // AI button
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: palette.gold, borderRadius: 8, paddingHorizontal: 12, minHeight: 36,
  },
  aiBtnDisabled: { opacity: 0.4 },
  aiBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 10, color: palette.ink, letterSpacing: 1 },

  // Items
  empty: { alignItems: 'center', gap: 8, paddingVertical: spacing.lg },
  emptyText: { ...typography.body, fontSize: 12.5, color: palette.smoke, textAlign: 'center' },
  itemList: { gap: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, minHeight: 44 },
  check: { padding: 2 },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: palette.lineHard, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  itemText: { flex: 1, ...typography.body, fontSize: 13.5, color: palette.ivory, lineHeight: 19 },
  itemTextDone: { color: palette.smoke, textDecorationLine: 'line-through' },

  // Add row
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addInput: {
    flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphiteLight,
    color: palette.ivory, fontFamily: Fonts.sans, fontSize: 13,
  },
  addBtn: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: palette.lineGold, alignItems: 'center', justifyContent: 'center' },

  // Timeline
  timeline: { gap: 0 },
  weekRow: { flexDirection: 'row', gap: 12 },
  weekRail: { alignItems: 'center', width: 24 },
  weekDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: palette.lineHard,
    alignItems: 'center', justifyContent: 'center', backgroundColor: palette.graphite,
  },
  weekDotDone: { backgroundColor: palette.gold, borderColor: palette.gold },
  weekDotActive: { borderColor: palette.gold },
  dotPulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.gold },
  weekLine: { flex: 1, width: 1.5, backgroundColor: palette.line, marginVertical: 2 },
  weekBody: { flex: 1, paddingBottom: spacing.lg },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekNum: { ...typography.mono, fontSize: 10, color: palette.smoke, letterSpacing: 1.5 },
  weekNumActive: { color: palette.goldText },
  weekRange: { ...typography.mono, fontSize: 9.5, color: palette.smoke, letterSpacing: 0.3, flex: 1 },
  weekRangeActive: { color: palette.goldMuted },
  weekPhase: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14.5, color: palette.ivory, marginTop: 3, letterSpacing: 0.3 },
  weekPhaseDim: { color: palette.ash },
  weekDetail: { gap: 7, marginTop: 8 },
  weekFocus: { ...typography.body, fontSize: 12.5, color: palette.ash, lineHeight: 18 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskText: { ...typography.body, fontSize: 12.5, color: palette.smoke, flex: 1 },
  noteLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, minHeight: 36 },
  noteLinkText: { fontFamily: Fonts.mono, fontSize: 9.5, color: palette.goldText, letterSpacing: 1 },

  // Note composer
  noteComposer: { gap: 10 },
  noteWeekRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  noteWeekLabel: { ...typography.mono, fontSize: 10, color: palette.smoke, letterSpacing: 1 },
  weekChips: { flexDirection: 'row', gap: 6 },
  weekChip: { paddingHorizontal: 12, minHeight: 32, borderRadius: 999, borderWidth: 1, borderColor: palette.lineGoldSubtle, backgroundColor: palette.goldGlow, alignItems: 'center', justifyContent: 'center' },
  weekChipOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  weekChipText: { fontFamily: Fonts.mono, fontSize: 10, color: palette.goldMuted, letterSpacing: 0.5 },
  weekChipTextOn: { color: palette.ink, fontWeight: '700' },
  noteInput: {
    minHeight: 96, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.line,
    backgroundColor: palette.graphiteLight, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 13.5, lineHeight: 20,
  },
  saveNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: palette.gold, borderRadius: 10, minHeight: 44,
  },
  saveNoteDisabled: { opacity: 0.4 },
  saveNoteText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12, color: palette.ink, letterSpacing: 1.5 },

  // Note list
  mirrorIntro: { gap: 4 },
  mirrorIntroTitle: { fontFamily: Fonts.mono, fontSize: 10, color: palette.goldText, letterSpacing: 2 },
  mirrorIntroText: { ...typography.body, fontSize: 12.5, color: palette.smoke, lineHeight: 18 },
  noteList: { gap: 10 },
  noteCard: { borderRadius: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphiteLight, padding: 12, gap: 6 },
  noteCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteCardTag: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteCardTagText: { ...typography.mono, fontSize: 9, color: palette.goldText, letterSpacing: 1 },
  noteCardText: { ...typography.body, fontSize: 13, color: palette.ivory, lineHeight: 19 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  themeTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: palette.lineGoldSubtle, backgroundColor: palette.goldGlow },
  themeTagText: { fontFamily: Fonts.mono, fontSize: 9, color: palette.goldText, letterSpacing: 1 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  audioText: { ...typography.mono, fontSize: 10, color: palette.goldText, letterSpacing: 0.5 },
  noteCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.line },
  noteCardFooterText: { ...typography.mono, fontSize: 9.5, color: palette.smoke, letterSpacing: 0.3 },

  // Grabar sesión → IA
  recordBox: { gap: 8 },
  recStart: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: palette.gold, borderRadius: 10, minHeight: 48,
  },
  recStartText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12.5, color: palette.ink, letterSpacing: 1.5 },
  recordUnavailable: { ...typography.body, fontSize: 12, color: palette.smoke, lineHeight: 18, textAlign: 'center', paddingVertical: 8 },
  recordProcessing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 },
  recordProcessingText: { fontFamily: Fonts.mono, fontSize: 11, color: palette.goldText, letterSpacing: 1 },
  recordActive: {
    gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.lineGold, backgroundColor: palette.goldGlow,
  },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.danger },
  recText: { fontFamily: Fonts.mono, fontSize: 11, color: palette.ivory, letterSpacing: 1 },
  recBtns: { flexDirection: 'row', gap: 8 },
  recCancel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: palette.line,
  },
  recCancelText: { fontFamily: Fonts.mono, fontSize: 10, color: palette.smoke, letterSpacing: 1 },
  recStop: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, borderRadius: 8, backgroundColor: palette.gold,
  },
  recStopText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, color: palette.ink, letterSpacing: 1 },
  recError: { ...typography.mono, fontSize: 10.5, color: palette.danger, letterSpacing: 0.3 },

  // Borrador de Norman (editable antes de confirmar)
  draftBox: {
    gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: palette.lineGold, backgroundColor: palette.goldGlow,
  },
  draftHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  draftTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12, color: palette.ivory, letterSpacing: 1.5 },
  draftSub: { ...typography.body, fontSize: 12, color: palette.ash, lineHeight: 17 },
  draftLabel: { ...typography.mono, fontSize: 10, color: palette.goldText, letterSpacing: 1.5, marginTop: 2 },
  draftNotes: {
    minHeight: 110, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: palette.line,
    backgroundColor: palette.graphiteLight, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 13.5, lineHeight: 20,
  },
  draftActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  draftActionInput: {
    flex: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: palette.line,
    backgroundColor: palette.graphiteLight, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 13,
  },
  draftAddAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  draftAddActionText: { fontFamily: Fonts.mono, fontSize: 9.5, color: palette.goldText, letterSpacing: 1 },
  draftBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  draftDiscard: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: palette.line,
    alignItems: 'center', justifyContent: 'center',
  },
  draftDiscardText: { fontFamily: Fonts.mono, fontSize: 10.5, color: palette.smoke, letterSpacing: 1 },
  draftConfirm: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, borderRadius: 10, backgroundColor: palette.gold,
  },
  draftConfirmText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12, color: palette.ink, letterSpacing: 1.5 },
});
