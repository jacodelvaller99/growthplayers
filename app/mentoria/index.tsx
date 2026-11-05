/**
 * app/mentoria/index.tsx — Mentoría
 *
 * Con la gramática de pantalla del rediseño (components/pantalla): dónde estás
 * (semana N de 12), un titular, UNA acción amarilla (escribir las notas de la
 * sesión) y filas para lo demás: el plan de acción, la próxima sesión, las
 * semanas y las sesiones guardadas.
 *
 * Toda la funcionalidad de antes sigue aquí — notas por semana, grabación con
 * consentimiento → transcripción → borrador de Norman editable, plan de acción
 * (generar con Norman, añadir, marcar, quitar). Lo que se fue es el sistema
 * visual anterior (tarjetas con borde, chips, Space Mono) y la ruta de 12
 * semanas duplicada de Programa, que ahora es una fila plegada.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { MyMentorCard } from '@/components/MyMentorCard';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useMentorship, type SessionNote, type ActionItem, type SessionDraft } from '@/hooks/use-mentorship';
import {
  MENTORSHIP_PROGRAM,
  TOTAL_WEEKS,
  effectiveWeekDateRange,
  effectiveWeekNumber,
  effectiveWeekStatus,
  formatWeekRange,
} from '@/data/mentorship';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function MentoriaScreen() {
  const router = useRouter();
  const { state, protocolDay } = useLifeFlow();
  const m = useMentorship();

  // La ruta avanza con la SESIÓN, no con el calendario: si una semana se
  // queda sin nota registrada, la ruta entera se corre — en vivo, apenas
  // se confirma una nota (m.notes cambia y esto recalcula solo).
  const completedWeeks = useMemo(() => new Set(m.notes.map((n) => n.week)), [m.notes]);
  const weekNum = effectiveWeekNumber(protocolDay, completedWeeks);
  const week = MENTORSHIP_PROGRAM[weekNum - 1];
  const weekRangeLabel = useCallback(
    (w: number) => formatWeekRange(effectiveWeekDateRange(w, state.protocolStartDate, protocolDay, completedWeeks)),
    [state.protocolStartDate, protocolDay, completedWeeks],
  );

  const [writing, setWriting] = useState(false);
  const [showWeeks, setShowWeeks] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteWeek, setNoteWeek] = useState(weekNum);
  const [manualText, setManualText] = useState('');

  const pendingCount = m.plan.filter((it) => !it.done).length;
  const isRecording = m.recordingPhase === 'recording';
  const isProcessing =
    m.recordingPhase === 'uploading' ||
    m.recordingPhase === 'transcribing' ||
    m.recordingPhase === 'summarizing';
  const busy = !!m.draft || isRecording || isProcessing;
  const canGenerate = !m.generating && m.notes.length > 0;

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/comando' as never));

  // ── Consentimiento + arranque de grabación ─────────────────────────────────
  const beginRecording = () => {
    Alert.alert(
      'Grabar esta sesión',
      // El audio se envía a OpenAI (Whisper) para transcribirse. Consentir algo
      // distinto de lo que ocurre no es consentimiento válido (RGPD).
      'Vas a grabar el audio de tu sesión de mentoría.\n\n' +
        'El audio se envía a OpenAI para transcribirse automáticamente; no se almacena ' +
        'en Polaris. Lo que sí guardamos es la transcripción y las notas que Norman ' +
        'redacta a partir de ella, visibles solo para ti y tu mentor.\n\n' +
        '¿Autorizas la grabación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Autorizo y grabar', onPress: () => { void m.startRecording(); } },
      ],
    );
  };

  const recLabel: Record<string, string> = {
    uploading: 'Subiendo el audio…',
    transcribing: 'Transcribiendo…',
    summarizing: 'Norman está redactando…',
  };

  const saveNote = () => {
    m.addNote(noteWeek, noteText);
    setNoteText('');
    setWriting(false);
  };
  const addItem = () => {
    m.addManualItem(manualText);
    setManualText('');
  };

  // ── Bloque de trabajo: borrador, grabación o notas a mano ───────────────────
  let work: React.ReactNode = null;
  if (m.draft) {
    work = (
      <DraftEditor
        draft={m.draft}
        weekRange={weekRangeLabel(m.draft.week)}
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
    );
  } else if (isProcessing) {
    work = (
      <View style={s.block}>
        <View style={s.inline}>
          <ActivityIndicator size="small" color={palette.goldText} />
          <Text style={s.body}>{recLabel[m.recordingPhase] ?? 'Procesando…'}</Text>
        </View>
      </View>
    );
  } else if (isRecording) {
    work = (
      <View style={s.block}>
        <View style={s.inline}>
          <View style={s.recDot} />
          <Text style={s.body}>Grabando la sesión de la semana {noteWeek}</Text>
        </View>
        <Boton label="DETENER Y PROCESAR" onPress={() => { void m.stopRecordingAndProcess(noteWeek); }} />
        <Enlace label="Cancelar la grabación" onPress={() => m.cancelRecording()} />
      </View>
    );
  } else if (writing) {
    work = (
      <View style={s.block}>
        <Text style={s.label}>SESIÓN DE LA SEMANA</Text>
        <View style={s.weekPick}>
          {[weekNum - 1, weekNum, weekNum + 1]
            .filter((w) => w >= 1 && w <= TOTAL_WEEKS)
            .map((w) => (
              <Pressable
                key={w}
                onPress={() => setNoteWeek(w)}
                style={s.weekOpt}
                accessibilityRole="radio"
                accessibilityLabel={`Semana ${w}`}
                accessibilityState={{ checked: noteWeek === w }}>
                <Text style={[s.weekOptText, noteWeek === w && s.weekOptOn]}>{w}</Text>
              </Pressable>
            ))}
        </View>
        <TextInput
          value={noteText}
          onChangeText={setNoteText}
          placeholder="¿Qué se trabajó? ¿Qué quedó pendiente? ¿Qué observaste?"
          placeholderTextColor={palette.smoke}
          selectionColor={palette.gold}
          style={s.input}
          multiline
          textAlignVertical="top"
          autoFocus
        />
        <Boton label="GUARDAR NOTA" onPress={saveNote} disabled={!noteText.trim()} />
        <Enlace label="Cancelar" onPress={() => { setWriting(false); setNoteText(''); }} />
        {m.audioAvailable ? (
          <Enlace label="Prefiero grabar la sesión (audio)" onPress={beginRecording} />
        ) : (
          <Text style={s.note}>
            {Platform.OS === 'web'
              ? 'Grabar la sesión en audio se hace desde la app del teléfono.'
              : 'La grabación no está disponible en este dispositivo.'}
          </Text>
        )}
      </View>
    );
  }

  const siguiente = weekNum < TOTAL_WEEKS ? weekNum + 1 : null;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <Pantalla
        onBack={volver}
        meta="MENTORÍA"
        metaRight={`SEMANA ${weekNum} DE ${TOTAL_WEEKS}`}
        title={'Tu sesión de\nesta semana.'}
        sub={week.focus}
        hero={busy || writing ? undefined : (
          <TarjetaOro
            meta={week.phase === 'Onboarding' ? 'EMPEZAR' : week.phase.toUpperCase()}
            metaRight={weekRangeLabel(weekNum)}
            title="Escribir notas de la sesión"
            onPress={() => { setNoteWeek(weekNum); setWriting(true); }}
          />
        )}
        footer={<MyMentorCard />}>
        {!!m.recordingError && <Text style={s.error}>{m.recordingError}</Text>}
        {work}

        {/* ── Plan de acción ── */}
        <Fila
          label="PLAN DE ACCIÓN"
          value={m.plan.length === 0
            ? 'Aún no hay acciones'
            : pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}` : 'Todo hecho'}
        />
        <View style={s.block}>
          {m.plan.map((it) => (
            <ActionRow key={it.id} item={it} onToggle={() => m.toggleItem(it.id)} onRemove={() => m.removeItem(it.id)} />
          ))}
          <Text style={s.note}>Una acción concreta que tú te comprometes a hacer esta semana.</Text>
          <View style={s.inline}>
            <TextInput
              value={manualText}
              onChangeText={setManualText}
              placeholder="Ej: Terminar el reporte antes del jueves"
              placeholderTextColor={palette.smoke}
              selectionColor={palette.gold}
              style={[s.input, s.inputLine]}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <Pressable onPress={addItem} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Agregar acción">
              <MaterialIcons name="add" size={22} color={palette.ivory} />
            </Pressable>
          </View>
          <Pressable
            onPress={m.generatePlan}
            disabled={!canGenerate}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGenerate }}
            style={s.link}>
            {m.generating && <ActivityIndicator size="small" color={palette.ash} />}
            <Text style={[s.linkText, !canGenerate && s.linkOff]}>
              {m.generating ? 'Norman está armando tu plan…' : 'Que Norman arme el plan con tus notas'}
            </Text>
          </Pressable>
          {m.notes.length === 0 && <Text style={s.note}>Escribe una nota primero.</Text>}
        </View>

        {/* ── Próxima sesión y semanas ── */}
        {siguiente && (
          <Fila label="PRÓXIMA SESIÓN" value={`Semana ${siguiente} · ${weekRangeLabel(siguiente)}`} />
        )}
        <Fila
          label="SEMANAS"
          value={showWeeks ? 'Ocultar' : `${completedWeeks.size} de ${TOTAL_WEEKS} con nota`}
          onPress={() => setShowWeeks((v) => !v)}
        />
        {showWeeks && (
          <View style={s.block}>
            {MENTORSHIP_PROGRAM.map((w) => {
              const status = effectiveWeekStatus(w.week, protocolDay, completedWeeks);
              return (
                <View key={w.week} style={s.weekRow}>
                  <Text style={[s.weekRowTitle, status === 'actual' && s.weekRowNow]}>
                    Semana {w.week}{status === 'actual' ? ' · ahora' : status === 'completada' ? ' · con nota' : ''}
                  </Text>
                  <Text style={s.weekRowSub}>{weekRangeLabel(w.week)}</Text>
                </View>
              );
            })}
          </View>
        )}
        <Fila
          label="TU PROGRAMA"
          value="Módulos y lecciones"
          onPress={() => router.push('/(tabs)/programas' as never)}
          last={m.notes.length === 0}
        />

        {/* ── Sesiones guardadas ── */}
        {m.notes.length > 0 && (
          <>
            <Fila label="TUS SESIONES" value={`${m.notes.length} ${m.notes.length === 1 ? 'nota' : 'notas'}`} last />
            <View style={s.block}>
              {m.notes.map((n) => (
                <NoteRow key={n.id} n={n} weekRange={weekRangeLabel(n.week)} onRemove={() => m.removeNote(n.id)} />
              ))}
            </View>
          </>
        )}
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

// ─── Piezas ────────────────────────────────────────────────────────────────────

/** Botón principal dentro de un bloque. Deshabilitado = neutro, nunca oro pálido. */
function Boton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [s.btn, disabled && s.btnOff, pressed && !disabled && s.pressed]}>
      <Text style={[s.btnText, disabled && s.btnTextOff]}>{label}</Text>
    </Pressable>
  );
}

function Enlace({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.link}>
      <Text style={s.linkText}>{label}</Text>
    </Pressable>
  );
}

function ActionRow({ item, onToggle, onRemove }: { item: ActionItem; onToggle: () => void; onRemove: () => void }) {
  return (
    <View style={s.itemRow}>
      <Pressable
        onPress={onToggle}
        style={s.iconBtn}
        accessibilityRole="checkbox"
        accessibilityLabel={item.text}
        accessibilityState={{ checked: item.done }}>
        <View style={[s.checkBox, item.done && s.checkBoxOn]}>
          {item.done && <MaterialIcons name="check" size={14} color={palette.ink} />}
        </View>
      </Pressable>
      <Text style={[s.itemText, item.done && s.itemTextDone]}>
        {item.text}{item.source === 'ia' ? ' · de Norman' : ''}
      </Text>
      <Pressable onPress={onRemove} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Eliminar acción">
        <MaterialIcons name="close" size={16} color={palette.smoke} />
      </Pressable>
    </View>
  );
}

function NoteRow({ n, weekRange, onRemove }: { n: SessionNote; weekRange: string; onRemove: () => void }) {
  const fromVoice = !!n.transcript || !!n.audioUrl;
  return (
    <View style={s.noteRow}>
      <View style={s.noteHead}>
        <Text style={s.label}>
          SEMANA {n.week} · {fmtDate(n.date)}{fromVoice ? ' · DE LA GRABACIÓN' : ''}
        </Text>
        <Pressable onPress={onRemove} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Eliminar nota">
          <MaterialIcons name="close" size={16} color={palette.smoke} />
        </Pressable>
      </View>
      <Text style={s.body}>{n.notes}</Text>
      <Text style={s.note}>{weekRange}</Text>
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
    <View style={s.block}>
      <Text style={s.title}>
        {draft.transcriptionFailed ? 'Escribe tus notas.' : 'Norman redactó tu sesión.'}
      </Text>
      <Text style={s.note}>
        {draft.transcriptionFailed
          ? `No pudimos transcribir el audio (se guardó igual). Escribe las notas a mano · Semana ${draft.week} · ${weekRange}`
          : `Revisa y edita las notas y el plan antes de guardar · Semana ${draft.week} · ${weekRange}`}
      </Text>

      <Text style={s.label}>NOTAS DE LA SESIÓN</Text>
      <TextInput
        value={draft.notes}
        onChangeText={onChangeNotes}
        placeholder="Notas de la sesión…"
        placeholderTextColor={palette.smoke}
        selectionColor={palette.gold}
        style={s.input}
        multiline
        textAlignVertical="top"
      />

      <Text style={s.label}>PLAN DE ACCIÓN</Text>
      {draft.actions.map((a, i) => (
        <View key={i} style={s.inline}>
          <TextInput
            value={a}
            onChangeText={(t) => onChangeAction(i, t)}
            placeholder="Ej: Llamar a Juan el lunes"
            placeholderTextColor={palette.smoke}
            selectionColor={palette.gold}
            style={[s.input, s.inputLine]}
          />
          <Pressable onPress={() => onRemoveAction(i)} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Quitar acción">
            <MaterialIcons name="close" size={16} color={palette.smoke} />
          </Pressable>
        </View>
      ))}
      <Enlace label="Agregar otra acción" onPress={onAddAction} />

      <Boton label="GUARDAR SESIÓN" onPress={onConfirm} />
      <Enlace label="Descartar" onPress={onDiscard} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  block: { gap: spacing.md, paddingVertical: spacing.lg },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  title: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 24, lineHeight: 28, color: palette.ivory },
  label: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, flexShrink: 1 },
  body: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: palette.ivory, flexShrink: 1 },
  note: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ash },
  error: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.dangerText, paddingVertical: spacing.sm },

  input: {
    minHeight: 112, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineHard,
    color: palette.ivory, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24,
  },
  inputLine: { flex: 1, minHeight: 44 },

  weekPick: { flexDirection: 'row', gap: spacing.sm },
  weekOpt: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekOptText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 16, color: palette.smoke },
  weekOptOn: { color: palette.ivory, textDecorationLine: 'underline' },

  btn: {
    minHeight: 52, borderRadius: 10, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center',
  },
  btnOff: { backgroundColor: palette.charcoal },
  btnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, letterSpacing: 1, color: palette.ink },
  btnTextOff: { color: palette.smoke },
  pressed: { opacity: 0.85 },

  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory, textDecorationLine: 'underline' },
  linkOff: { color: palette.smoke, textDecorationLine: 'none' },

  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.danger },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: palette.smoke,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  itemText: { flex: 1, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  itemTextDone: { color: palette.smoke, textDecorationLine: 'line-through' },

  weekRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.line, gap: 2 },
  weekRowTitle: { fontFamily: Fonts.sans, fontSize: 16, color: palette.ash },
  weekRowNow: { color: palette.ivory, fontWeight: '600' },
  weekRowSub: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke },

  noteRow: { gap: spacing.xs, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.line },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
