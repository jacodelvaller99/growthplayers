/**
 * Admin — Claves del servidor (IA, correo, relojes).
 *
 * Lista cada clave con su estado; «Cambiar» guarda la nueva cifrada en Vault
 * (edge function `admin-keys`, solo is_admin) y las funciones la usan en ≤30 s.
 * Nunca se muestra una clave completa: solo sus últimos 4 caracteres.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type KeyRow = {
  name: string; label: string; group: string; usedBy: string;
  source: 'panel' | 'supabase' | 'none'; last4: string | null; updatedAt: string | null;
};
const TESTABLE = new Set(['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'RESEND_API_KEY']);

async function call<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-keys', { body });
  if (error) {
    // El cuerpo del error trae el mensaje real de la función.
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(msg ?? error.message);
  }
  return data as T;
}

function estado(k: KeyRow): string {
  if (k.source === 'none') return 'Falta';
  const where = k.source === 'panel' ? 'Guardada aquí' : 'En Supabase';
  const when = k.updatedAt ? ` · ${new Date(k.updatedAt).toLocaleDateString('es')}` : '';
  return `${where} · ${k.last4}${when}`;
}

function KeyItem({ k, onSaved }: { k: KeyRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy('save'); setMsg(null);
    try {
      await call({ action: 'set', name: k.name, value });
      setEditing(false); setValue('');
      setMsg({ ok: true, text: 'Guardada. Se usa en menos de 30 segundos.' });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo guardar.' });
    }
    setBusy(null);
  };

  const test = async () => {
    setBusy('test'); setMsg(null);
    try {
      const r = await call<{ ok: boolean; detail: string }>({ action: 'test', name: k.name });
      setMsg({ ok: r.ok, text: r.detail });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo probar.' });
    }
    setBusy(null);
  };

  return (
    <View style={s.item}>
      <View style={s.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{k.label}</Text>
          <Text style={s.usedBy}>{k.usedBy}</Text>
          <Text style={[s.state, k.source === 'none' && { color: palette.dangerText }]}>{estado(k)}</Text>
        </View>
        {!editing && (
          <View style={s.actions}>
            {TESTABLE.has(k.name) && k.source !== 'none' && (
              <Pressable onPress={test} disabled={!!busy} style={s.btnLine} accessibilityRole="button" accessibilityLabel={`Probar ${k.label}`}>
                {busy === 'test' ? <ActivityIndicator color={palette.ivory} /> : <Text style={s.btnLineText}>Probar</Text>}
              </Pressable>
            )}
            <Pressable onPress={() => { setEditing(true); setMsg(null); }} style={s.btnLine} accessibilityRole="button" accessibilityLabel={`Cambiar ${k.label}`}>
              <Text style={s.btnLineText}>{k.source === 'none' ? 'Agregar' : 'Cambiar'}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {editing && (
        <View style={s.editRow}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Pega la clave nueva"
            placeholderTextColor={palette.smoke}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
            accessibilityLabel={`Nueva clave para ${k.label}`}
          />
          <Pressable onPress={save} disabled={!!busy || value.trim().length < 8} style={[s.btnGold, (busy || value.trim().length < 8) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="Guardar clave">
            {busy === 'save' ? <ActivityIndicator color={palette.ink} /> : <Text style={s.btnGoldText}>GUARDAR</Text>}
          </Pressable>
          <Pressable onPress={() => { setEditing(false); setValue(''); }} style={s.btnLine} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={s.btnLineText}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      {msg && (
        <Text style={[s.msg, { color: msg.ok ? palette.success : palette.dangerText }]} accessibilityLiveRegion="polite">
          {msg.text}
        </Text>
      )}
    </View>
  );
}

export default function AdminClavesScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await call<{ keys: KeyRow[] }>({ action: 'list' });
      setKeys(r.keys); setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las claves.');
      setKeys([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = [...new Set((keys ?? []).map((k) => k.group))];

  return (
    <ScrollView style={sc.root} contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>
      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>CLAVES</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={s.intro}>
        Las claves que usa el servidor. Al cambiar una, se guarda cifrada y reemplaza a la anterior en menos de 30 segundos.
        Por seguridad solo se ven los últimos 4 caracteres.
      </Text>

      {keys === null ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : error ? (
        <Text style={[s.msg, { color: palette.dangerText }]}>{error}</Text>
      ) : (
        groups.map((g) => (
          <View key={g} style={s.group}>
            <Text style={s.groupTitle}>{g.toUpperCase()}</Text>
            {keys.filter((k) => k.group === g).map((k) => <KeyItem key={k.name} k={k} onSaved={load} />)}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.lg, maxWidth: 640 },
  group: { marginBottom: spacing.xl, maxWidth: 760 },
  groupTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText, marginBottom: spacing.xs },
  item: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.line, gap: spacing.sm },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  label: { fontFamily: Fonts.sans, fontSize: 16, color: palette.ivory },
  usedBy: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, marginTop: 2 },
  state: { fontFamily: Fonts.mono, fontSize: 13, color: palette.ash, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  input: {
    flex: 1, minWidth: 220, height: 44, paddingHorizontal: spacing.md, borderRadius: radii.sm,
    borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphite,
    color: palette.ivory, fontFamily: Fonts.mono, fontSize: 14,
  },
  btnLine: { minHeight: 44, minWidth: 88, paddingHorizontal: spacing.md, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  btnLineText: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  btnGold: { minHeight: 44, minWidth: 104, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  btnGoldText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1.2, color: palette.ink },
  msg: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
});
