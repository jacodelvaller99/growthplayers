/**
 * Admin CMI — Códigos de Acceso
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { createAccessCode, deactivateAccessCode } from '@/lib/admin/actions';
import { fetchAccessCodes } from '@/lib/admin/queries';
import { CODE_TYPE_LABELS, type AccessCode, type AccessCodeType } from '@/lib/admin/types';

const CODE_TYPES: AccessCodeType[] = ['beta', 'premium', 'premium_plus', 'polaris', 'growthplayers', 'full_access'];
const MAX_USES_OPTS = [1, 5, 10, 25, -1];

function maxUsesLabel(n: number) {
  return n === -1 ? '∞' : String(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CodeRow({ code, onCopy, onDeactivate }: { code: AccessCode; onCopy: () => void; onDeactivate: () => void }) {
  const pctUsed = code.max_uses === -1 ? 0 : (code.uses_count / code.max_uses) * 100;
  return (
    <View style={[cr.row, !code.is_active && { opacity: 0.5 }]}>
      <View style={{ flex: 1 }}>
        <View style={cr.topRow}>
          <Text style={cr.code}>{code.code}</Text>
          <View style={[cr.typePill, { borderColor: palette.gold }]}>
            <Text style={cr.typeText}>{CODE_TYPE_LABELS[code.type as AccessCodeType] ?? code.type}</Text>
          </View>
        </View>
        <Text style={cr.meta}>
          {code.uses_count}/{maxUsesLabel(code.max_uses)} usos
          {code.expires_at ? ` · Expira ${formatDate(code.expires_at)}` : ''}
          {!code.is_active ? ' · DESACTIVADO' : ''}
        </Text>
        {code.label && <Text style={cr.label}>{code.label}</Text>}
        {code.max_uses !== -1 && (
          <View style={cr.track}>
            <View style={[cr.fill, { width: `${pctUsed}%` as unknown as number }]} />
          </View>
        )}
      </View>
      <View style={cr.actions}>
        <Pressable style={cr.copyBtn} onPress={onCopy}>
          <MaterialIcons name="content-copy" size={14} color={palette.gold} />
        </Pressable>
        {code.is_active && (
          <Pressable style={cr.deactivateBtn} onPress={onDeactivate}>
            <MaterialIcons name="block" size={14} color={palette.smoke} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function CodigosScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Form
  const [codeType, setCodeType] = useState<AccessCodeType>('beta');
  const [maxUses, setMaxUses] = useState(1);
  const [customCode, setCustomCode] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const data = await fetchAccessCodes();
    setCodes(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!adminId) return;
    setSaving(true);
    const result = await createAccessCode({
      adminId,
      type: codeType,
      maxUses,
      notes: notes || undefined,
      label: label || undefined,
      customCode: customCode || undefined,
    });
    setSaving(false);
    if (result.success && result.code) {
      setLastGenerated(result.code);
      setCustomCode('');
      setLabel('');
      setNotes('');
      load();
      Alert.alert('✅ Código generado', `Código: ${result.code}\nTipo: ${CODE_TYPE_LABELS[codeType]}`);
    } else {
      Alert.alert('Error', result.error ?? 'No se pudo crear el código');
    }
  };

  const handleCopy = async (code: string) => {
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(code); } catch (_) { /* ignore */ }
    }
    Alert.alert('✅ Código', `${code}\n\nCopia este código manualmente.`);
  };

  const handleDeactivate = (code: AccessCode) => {
    if (!adminId) return;
    Alert.alert('Desactivar código', `¿Desactivar "${code.code}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          await deactivateAccessCode({ adminId, codeId: code.id, code: code.code });
          load();
        },
      },
    ]);
  };

  const activeCodes = codes.filter(c => c.is_active);
  const inactiveCodes = codes.filter(c => !c.is_active);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>CÓDIGOS DE ACCESO</Text>
      </View>

      {/* Last generated */}
      {lastGenerated && (
        <Pressable style={s.lastGenCard} onPress={() => handleCopy(lastGenerated)}>
          <Text style={s.lastGenLabel}>ÚLTIMO GENERADO (toca para copiar)</Text>
          <Text style={s.lastGenCode}>{lastGenerated}</Text>
        </Pressable>
      )}

      {/* ── Create form ── */}
      <GoldDivider label="CREAR CÓDIGO NUEVO" />
      <PremiumCard style={s.card}>
        {/* Type */}
        <Text style={s.fieldLabel}>TIPO DE ACCESO</Text>
        <View style={s.optGrid}>
          {CODE_TYPES.map(t => (
            <Pressable
              key={t}
              style={[s.optChip, codeType === t && s.optChipActive]}
              onPress={() => setCodeType(t)}>
              <Text style={[s.optText, codeType === t && s.optTextActive]}>
                {CODE_TYPE_LABELS[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Max uses */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>USOS MÁXIMOS</Text>
        <View style={s.optGrid}>
          {MAX_USES_OPTS.map(n => (
            <Pressable
              key={n}
              style={[s.optChip, maxUses === n && s.optChipActive]}
              onPress={() => setMaxUses(n)}>
              <Text style={[s.optText, maxUses === n && s.optTextActive]}>{maxUsesLabel(n)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Custom code */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>CÓDIGO PERSONALIZADO (opcional)</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: BATMAN2026 (dejar vacío para auto-generar)"
          placeholderTextColor={palette.smoke}
          autoCapitalize="characters"
          value={customCode}
          onChangeText={setCustomCode}
        />

        {/* Label */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>ETIQUETA INTERNA</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Cliente Juan Pérez"
          placeholderTextColor={palette.smoke}
          value={label}
          onChangeText={setLabel}
        />

        {/* Notes */}
        <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>NOTAS</Text>
        <TextInput
          style={[s.input, { minHeight: 50, textAlignVertical: 'top' }]}
          placeholder="Notas internas..."
          placeholderTextColor={palette.smoke}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <Pressable
          style={[s.submitBtn, saving && { opacity: 0.5 }]}
          onPress={handleCreate}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color={palette.ink} size="small" />
          ) : (
            <Text style={s.submitText}>GENERAR CÓDIGO</Text>
          )}
        </Pressable>
      </PremiumCard>

      {/* ── Active codes ── */}
      <GoldDivider label={`CÓDIGOS ACTIVOS (${activeCodes.length})`} />
      <PremiumCard style={s.card}>
        {loading ? (
          <ActivityIndicator color={palette.gold} style={{ padding: spacing.xl }} />
        ) : activeCodes.length === 0 ? (
          <Text style={s.emptyText}>Sin códigos activos</Text>
        ) : (
          activeCodes.map(c => (
            <CodeRow
              key={c.id}
              code={c}
              onCopy={() => handleCopy(c.code)}
              onDeactivate={() => handleDeactivate(c)}
            />
          ))
        )}
      </PremiumCard>

      {/* ── Inactive codes ── */}
      {inactiveCodes.length > 0 && (
        <>
          <GoldDivider label={`DESACTIVADOS (${inactiveCodes.length})`} />
          <PremiumCard style={s.card}>
            {inactiveCodes.map(c => (
              <CodeRow key={c.id} code={c} onCopy={() => handleCopy(c.code)} onDeactivate={() => {}} />
            ))}
          </PremiumCard>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  lastGenCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: palette.goldLight, borderColor: palette.gold, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' },
  lastGenLabel: { ...typography.label, color: palette.gold, marginBottom: spacing.xs },
  lastGenCode: { fontFamily: Fonts.mono, fontSize: 20, color: palette.ivory, letterSpacing: 4 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg },
  fieldLabel: { ...typography.label, color: palette.smoke, marginBottom: spacing.xs, fontSize: 9 },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.line },
  optChipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  optText: { ...typography.caption, color: palette.ash, fontSize: 11 },
  optTextActive: { color: palette.gold },
  submitBtn: { backgroundColor: palette.gold, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  submitText: { ...typography.section, color: palette.ink },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.md },
});

const cr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  code: { fontFamily: Fonts.mono, fontSize: 14, color: palette.ivory, letterSpacing: 2 },
  typePill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: radii.pill, borderWidth: 1 },
  typeText: { ...typography.label, color: palette.gold, fontSize: 8 },
  meta: { ...typography.caption, color: palette.smoke, fontSize: 10, marginTop: 2 },
  label: { ...typography.mono, color: palette.ash, fontSize: 10, marginTop: 1 },
  track: { height: 3, backgroundColor: palette.charcoal, borderRadius: 2, marginTop: spacing.xs },
  fill: { height: 3, borderRadius: 2, backgroundColor: palette.gold },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  copyBtn: { padding: spacing.xs, backgroundColor: palette.goldLight, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.lineGold },
  deactivateBtn: { padding: spacing.xs, backgroundColor: palette.graphiteLight, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.line },
});
