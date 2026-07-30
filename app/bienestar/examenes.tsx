/**
 * Bienestar — Exámenes médicos (Cluster B, parte PHI).
 *
 * El usuario sube/lista/borra sus exámenes (PDF/JPG/PNG). Almacenamiento
 * privado por user_id (bucket RLS). Opcional: toggle de "compartir con mi
 * coach" — si NO está activado, ni siquiera el admin ve estos archivos.
 *
 * Subida en AMBAS plataformas: web usa <input type=file>, nativo usa
 * expo-document-picker. Los dos caminos terminan en el mismo `uploadExam`.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { RECOMMENDED_EXAM_PANEL } from '@/data/internistKnowledge';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';
import {
  deleteExam,
  getExamSignedUrl,
  listMyExams,
  uploadExam,
  type MedicalExamRecord,
  type UploadExamInput,
} from '@/lib/medicalExams';

const supa = supabase as unknown as {
  from: (table: string) => { select: (cols: string) => { eq: (col: string, v: string) => { maybeSingle: () => Promise<{ data: { consents?: Record<string, unknown> } | null }> } }; update: (patch: Record<string, unknown>) => { eq: (col: string, v: string) => Promise<unknown> } };
};

function bytes(n: number | null): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExamenesScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [exams, setExams] = useState<MedicalExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [share, setShare] = useState<boolean | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setExams(await listMyExams());
    setLoading(false);
  }, []);

  // ── Cargar exámenes + estado del toggle ─────────────────────────────────────
  useEffect(() => { void loadExams(); }, [loadExams]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supa
          .from('profiles')
          .select('consents')
          .eq('id', userId)
          .maybeSingle();
        const consents = (data as { consents?: Record<string, unknown> } | null)?.consents ?? {};
        setShare(consents.share_exams_with_coach === true);
      } catch (e) {
        logSilentError('examenes.loadConsent', e);
        setShare(false);
      }
    })();
  }, [userId]);

  const toggleShare = useCallback(async () => {
    if (share === null || !userId) return;
    const next = !share;
    setShare(next);
    try {
      // Lee consents actuales y mergea (no pisa otros consents).
      const { data } = await supa
        .from('profiles')
        .select('consents')
        .eq('id', userId)
        .maybeSingle();
      const prev = (data as { consents?: Record<string, unknown> } | null)?.consents ?? {};
      await supa
        .from('profiles')
        .update({ consents: { ...prev, share_exams_with_coach: next } })
        .eq('id', userId);
    } catch (e) {
      logSilentError('examenes.toggleShare', e);
      setShare(!next); // revierte UI
    }
  }, [share, userId]);

  // ── Subida ─────────────────────────────────────────────────────────────────
  // Web usa un <input type=file>; nativo usa expo-document-picker. Ambos acaban
  // en el mismo uploadExam, que solo necesita {name, type, size, arrayBuffer()}.
  //
  // Antes esto era solo-web: una app móvil donde subir tus exámenes médicos
  // exigía abrir el navegador. Era el peor dead-end del producto, porque es PHI
  // en el flujo del internista.
  const applyUpload = useCallback(async (file: UploadExamInput['file']) => {
    setUploading(true);
    setUploadMsg(null);
    const result = await uploadExam({ file });
    if (result.ok && result.exam) {
      setExams((prev) => [result.exam!, ...prev]);
      setUploadMsg('Examen guardado.');
      setTimeout(() => setUploadMsg(null), 3000);
    } else {
      setUploadMsg(result.error ?? 'No se pudo subir.');
    }
    setUploading(false);
  }, []);

  const handleWebUpload = useCallback(() => {
    if (typeof document === 'undefined') return;
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = 'application/pdf,image/jpeg,image/png';
    inputEl.onchange = () => {
      const file = inputEl.files?.[0];
      if (file) void applyUpload(file);
    };
    inputEl.click();
  }, [applyUpload]);

  const handleNativeUpload = useCallback(async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;

      // uploadExam solo pide arrayBuffer(); el blob del uri local lo da.
      const blob = await fetch(asset.uri).then((r) => r.blob());
      await applyUpload({
        name: asset.name,
        type: asset.mimeType ?? blob.type,
        size: asset.size ?? blob.size,
        arrayBuffer: () => blob.arrayBuffer(),
      });
    } catch (e) {
      logSilentError('examenes.nativeUpload', e);
      setUploadMsg('No se pudo abrir el selector de archivos.');
      setUploading(false);
    }
  }, [applyUpload]);

  const handleUpload = useCallback(() => {
    if (Platform.OS === 'web') handleWebUpload();
    else void handleNativeUpload();
  }, [handleWebUpload, handleNativeUpload]);

  const openExam = useCallback(async (exam: MedicalExamRecord) => {
    const url = await getExamSignedUrl(exam);
    if (!url) {
      setUploadMsg('No se pudo abrir el archivo.');
      return;
    }
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      logSilentError('examenes.open', e);
    }
  }, []);

  const handleDelete = useCallback((exam: MedicalExamRecord) => {
    // Borrado de PHI = irreversible → confirmar antes.
    const proceed = async () => {
      const ok = await deleteExam(exam);
      if (ok) setExams((prev) => prev.filter((e) => e.id !== exam.id));
      else setUploadMsg('No se pudo borrar el examen.');
    };
    const msg = `¿Borrar "${exam.file_name}"? Esta acción no se puede deshacer.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(msg)) void proceed();
      return;
    }
    Alert.alert('Borrar examen', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => { void proceed(); } },
    ]);
  }, []);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>EXÁMENES MÉDICOS</Text>
        <View style={{ width: 36 }} />
      </View>
      {/*
        NO prometer que el internista "lee" los archivos: no los abre nunca.
        `fetchPatientContext` (lib/internist.ts) arma el contexto con perfil +
        `medical_lab_values` + wearable_daily, y jamás consulta `medical_exams`.
        Además `medical_lab_values` está vacía para todo el mundo: su único
        escritor, `recordLabValue`, no tiene llamador porque la captura de
        marcadores no está construida. Decir "los lee" era falso dos veces.
      */}
      <Text style={s.intro}>
        Tus exámenes viven en almacenamiento privado. Solo tú los ves por defecto.
        Se guardan para que los consultes y los compartas si quieres: el internista
        no abre los archivos. Si quieres que te explique un valor, escríbeselo en el chat.
      </Text>

      {/* ── Orden de Exámenes recomendada ───────────────────────────────────── */}
      <GoldDivider label="QUÉ EXÁMENES HACERTE" />
      <PremiumCard style={{ gap: spacing.sm }}>
        <View style={s.panelHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle}>{RECOMMENDED_EXAM_PANEL.title}</Text>
            <Text style={s.panelPhysician}>
              {RECOMMENDED_EXAM_PANEL.physician} · {RECOMMENDED_EXAM_PANEL.specialty}
            </Text>
          </View>
          <MaterialIcons name="assignment" size={20} color={palette.goldText} />
        </View>
        <Text style={s.panelDisclaimer}>{RECOMMENDED_EXAM_PANEL.disclaimer}</Text>

        <Pressable
          onPress={() => setPanelOpen((o) => !o)}
          style={s.panelToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: panelOpen }}
          accessibilityLabel={panelOpen ? 'Ocultar panel de exámenes' : 'Ver panel de exámenes completo'}>
          <Text style={s.panelToggleText}>{panelOpen ? 'OCULTAR PANEL' : 'VER PANEL COMPLETO'}</Text>
          <MaterialIcons name={panelOpen ? 'expand-less' : 'expand-more'} size={18} color={palette.goldText} />
        </Pressable>

        {panelOpen && (
          <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
            {RECOMMENDED_EXAM_PANEL.groups.map((g) => (
              <View key={g.panel} style={s.panelGroup}>
                <Text style={s.panelGroupName}>{g.panel}</Text>
                <Text style={s.panelGroupPurpose}>{g.purpose}</Text>
                <View style={s.panelItems}>
                  {g.items.map((it) => (
                    <View key={it.label} style={s.panelItem}>
                      <View style={s.panelDot} />
                      <Text style={s.panelItemLabel}>{it.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Pressable
              onPress={() => router.push('/bienestar/internista' as never)}
              style={s.panelAskBtn}
              accessibilityRole="button"
              accessibilityLabel="Preguntar al internista qué significan estos exámenes">
              <MaterialIcons name="health-and-safety" size={16} color={palette.ink} />
              <Text style={s.panelAskText}>PREGÚNTALE AL INTERNISTA</Text>
            </Pressable>
          </View>
        )}
      </PremiumCard>

      {/* ── Compartir con coach ─────────────────────────────────────────────── */}
      <GoldDivider label="PRIVACIDAD" />
      <PremiumCard style={s.shareCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.shareTitle}>Compartir exámenes con mi coach</Text>
          <Text style={s.shareSub}>
            Si activas esto, tus coaches admin podrán ver los metadatos y abrir los archivos.
            Sin activar, solo tú los ves.
          </Text>
        </View>
        {share === null ? (
          <ActivityIndicator color={palette.gold} />
        ) : (
          <Pressable
            onPress={toggleShare}
            style={[s.toggle, share && s.toggleOn]}
            accessibilityRole="switch"
            accessibilityState={{ checked: share }}>
            <View style={[s.toggleKnob, share && s.toggleKnobOn]} />
          </Pressable>
        )}
      </PremiumCard>

      {/* ── Subir nuevo examen ──────────────────────────────────────────────── */}
      <GoldDivider label="SUBIR NUEVO" />
      <PremiumCard style={{ gap: spacing.md }}>
        <Text style={s.shareSub}>Acepta PDF, JPG o PNG hasta 20 MB.</Text>
        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          style={[s.uploadBtn, uploading && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Subir un examen">
          {uploading
            ? <ActivityIndicator size="small" color={palette.ink} />
            : <>
                <MaterialIcons name="upload-file" size={18} color={palette.ink} />
                <Text style={s.uploadBtnText}>SELECCIONAR ARCHIVO</Text>
              </>}
        </Pressable>
        {uploadMsg && <Text style={s.uploadMsg}>{uploadMsg}</Text>}
      </PremiumCard>

      {/* ── Lista ───────────────────────────────────────────────────────────── */}
      <GoldDivider label={`${exams.length} EXÁMENES`} />
      {loading ? (
        <ActivityIndicator color={palette.gold} style={{ marginTop: spacing.lg }} />
      ) : exams.length === 0 ? (
        <PremiumCard>
          <Text style={s.emptyText}>Aún no has subido ningún examen.</Text>
        </PremiumCard>
      ) : (
        <PremiumCard style={{ gap: 0 }}>
          {exams.map((e) => (
            <View key={e.id} style={s.examRow}>
              <MaterialIcons
                name={(e.mime_type ?? '').startsWith('image/') ? 'image' : 'picture-as-pdf'}
                size={20}
                color={palette.goldText}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.examName} numberOfLines={1}>{e.file_name}</Text>
                <Text style={s.examMeta}>
                  {e.exam_date ?? e.created_at.slice(0, 10)} · {bytes(e.file_size)}
                </Text>
              </View>
              <Pressable
                onPress={() => openExam(e)}
                style={s.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Abrir examen"
                hitSlop={6}>
                <MaterialIcons name="visibility" size={18} color={palette.ash} />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(e)}
                style={s.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Borrar examen"
                hitSlop={6}>
                <MaterialIcons name="delete-outline" size={18} color={palette.danger} />
              </Pressable>
            </View>
          ))}
        </PremiumCard>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },

  // ── Orden de Exámenes recomendada ──────────────────────────────────────────
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  panelTitle: { ...typography.section, color: palette.ivory, fontSize: 14, letterSpacing: 0.4 },
  panelPhysician: { ...typography.caption, color: palette.goldText, fontSize: 11, marginTop: 2 },
  panelDisclaimer: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  panelToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, marginTop: spacing.xs, minHeight: 44,
    borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineGold,
    backgroundColor: palette.goldGlow,
  },
  panelToggleText: { fontFamily: Fonts.display, color: palette.goldText, fontSize: 11, letterSpacing: 1 },
  panelGroup: { gap: 4 },
  panelGroupName: { ...typography.label, color: palette.ivory, fontSize: 12, letterSpacing: 0.6 },
  panelGroupPurpose: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16 },
  panelItems: { gap: 4, marginTop: 4 },
  panelItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.goldText },
  panelItemLabel: { ...typography.body, color: palette.ash, fontSize: 12.5 },
  panelAskBtn: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.gold, paddingVertical: spacing.sm, borderRadius: radii.sm,
    minHeight: 44, marginTop: spacing.xs,
  },
  panelAskText: { fontFamily: Fonts.display, color: palette.ink, fontSize: 11, letterSpacing: 1 },

  shareCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shareTitle: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.5 },
  shareSub: { ...typography.caption, color: palette.smoke, fontSize: 12, lineHeight: 18, marginTop: 2 },

  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: palette.charcoal, borderWidth: 1, borderColor: palette.line,
    padding: 2, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: palette.goldLight, borderColor: palette.lineGold },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: palette.smoke,
  },
  toggleKnobOn: {
    backgroundColor: palette.gold,
    transform: [{ translateX: 18 }],
  },

  uploadBtn: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.gold, paddingVertical: spacing.md,
    borderRadius: radii.sm, minHeight: 44,
  },
  uploadBtnText: { fontFamily: Fonts.display, color: palette.ink, fontSize: 12, letterSpacing: 1.2 },
  uploadMsg: { ...typography.caption, color: palette.ash, fontSize: 12, textAlign: 'center' },

  emptyText: { ...typography.caption, color: palette.smoke, fontStyle: 'italic', fontSize: 12 },

  examRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.line,
  },
  examName: { ...typography.section, color: palette.ivory, fontSize: 12, letterSpacing: 0.3 },
  examMeta: { ...typography.caption, color: palette.smoke, fontSize: 10, marginTop: 1 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
