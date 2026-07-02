/**
 * EL CÍRCULO — Convocar evento.
 * Fecha (próximos 14 días), hora y duración por CHIPS (sin dependencias
 * nativas). Virtual (link) o presencial (lugar), cupo opcional, espacio
 * opcional. Validación pura + filtro de moderación antes de insertar.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { ENV } from '@/app/config/env';
import { CircleDisabled } from '@/components/circle';
import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { createEvent, fetchMyMemberships, fetchSpaces } from '@/lib/circle';
import { validateEventInput, type LocationType, type Space } from '@/lib/circleLogic';

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const MINUTES = [0, 30];
const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 h', value: 60 },
  { label: '1.5 h', value: 90 },
  { label: '2 h', value: 120 },
];

function nextDays(count: number, from: Date): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i + 1); // desde mañana
    return d;
  });
}

function dayChipLabel(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

export default function CrearEventoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const days = useMemo(() => nextDays(14, new Date()), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number>(0);
  const [duration, setDuration] = useState(60);
  const [locationType, setLocationType] = useState<LocationType>('virtual');
  const [locationText, setLocationText] = useState('');
  const [capacity, setCapacity] = useState('');
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [mySpaces, setMySpaces] = useState<Space[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ENV.socialSpacesEnabled) return;
    (async () => {
      const [all, mine] = await Promise.all([fetchSpaces(), fetchMyMemberships(userId ?? null)]);
      const mineIds = new Set(mine.map((m) => m.space_id));
      setMySpaces(all.filter((sp) => mineIds.has(sp.id)));
    })();
  }, [userId]);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const startsAt = (): Date | null => {
    if (dayIdx == null || hour == null) return null;
    const d = new Date(days[dayIdx]);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const handleCreate = async () => {
    if (!userId || saving) return;
    const input = {
      title,
      description,
      startsAt: startsAt(),
      durationMinutes: duration,
      locationType,
      locationText,
      capacity: capacity.trim() ? parseInt(capacity, 10) : null,
    };
    const check = validateEventInput(input, new Date());
    if (!check.ok) { setError(check.error ?? 'Revisa los datos.'); return; }
    setError(null);
    setSaving(true);
    const res = await createEvent(userId, input, spaceId);
    setSaving(false);
    if (res.success && res.id) {
      router.replace(`/comunidad/eventos/${res.id}` as never);
    } else {
      setError(res.error ?? 'No se pudo crear el evento.');
    }
  };

  return (
    <KeyboardAvoidingView style={sc.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={s.title}>CONVOCAR EVENTO</Text>
        </View>
        <Text style={s.intro}>Un café, una caminata, una llamada de trabajo profundo. Tú convocas.</Text>

        <GoldDivider label="EL EVENTO" />
        <View style={s.form}>
          <Text style={s.fieldLabel}>TÍTULO *</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Caminata de fundadores"
            placeholderTextColor={palette.smoke}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            accessibilityLabel="Título del evento"
          />

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DESCRIPCIÓN</Text>
          <TextInput
            style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="¿Qué van a hacer? ¿Qué debe llevar quien asista?"
            placeholderTextColor={palette.smoke}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            accessibilityLabel="Descripción del evento"
          />

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DÍA *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {days.map((d, i) => (
              <Pressable
                key={d.toISOString()}
                style={[s.chip, dayIdx === i && s.chipActive]}
                onPress={() => setDayIdx(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected: dayIdx === i }}
                accessibilityLabel={`Día ${dayChipLabel(d)}`}>
                <Text style={[s.chipText, dayIdx === i && s.chipTextActive]}>{dayChipLabel(d)}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>HORA *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
            {HOURS.map((h) => (
              <Pressable
                key={h}
                style={[s.chip, hour === h && s.chipActive]}
                onPress={() => setHour(h)}
                accessibilityRole="radio"
                accessibilityState={{ selected: hour === h }}
                accessibilityLabel={`Hora ${h}`}>
                <Text style={[s.chipText, hour === h && s.chipTextActive]}>{`${h}:00`.padStart(5, '0')}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={[s.chipRow, { marginTop: spacing.xs }]}>
            {MINUTES.map((m) => (
              <Pressable
                key={m}
                style={[s.chip, minute === m && s.chipActive]}
                onPress={() => setMinute(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected: minute === m }}
                accessibilityLabel={`Minutos ${m === 0 ? 'en punto' : 'y media'}`}>
                <Text style={[s.chipText, minute === m && s.chipTextActive]}>:{String(m).padStart(2, '0')}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DURACIÓN</Text>
          <View style={s.chipRow}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d.value}
                style={[s.chip, duration === d.value && s.chipActive]}
                onPress={() => setDuration(d.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: duration === d.value }}
                accessibilityLabel={`Duración ${d.label}`}>
                <Text style={[s.chipText, duration === d.value && s.chipTextActive]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>DÓNDE *</Text>
          <View style={s.chipRow}>
            {(['virtual', 'in_person'] as LocationType[]).map((lt) => (
              <Pressable
                key={lt}
                style={[s.chip, locationType === lt && s.chipActive]}
                onPress={() => setLocationType(lt)}
                accessibilityRole="radio"
                accessibilityState={{ selected: locationType === lt }}
                accessibilityLabel={lt === 'virtual' ? 'Evento virtual' : 'Evento presencial'}>
                <Text style={[s.chipText, locationType === lt && s.chipTextActive]}>
                  {lt === 'virtual' ? 'VIRTUAL' : 'PRESENCIAL'}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[s.input, { marginTop: spacing.xs }]}
            placeholder={locationType === 'virtual' ? 'Link de la llamada (Zoom, Meet…)' : 'Lugar del encuentro'}
            placeholderTextColor={palette.smoke}
            value={locationText}
            onChangeText={setLocationText}
            maxLength={200}
            autoCapitalize="none"
            accessibilityLabel={locationType === 'virtual' ? 'Link de la llamada' : 'Lugar del encuentro'}
          />

          <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>CUPO (opcional)</Text>
          <TextInput
            style={s.input}
            placeholder="Sin límite"
            placeholderTextColor={palette.smoke}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="Cupo máximo de asistentes"
          />

          {mySpaces.length > 0 && (
            <>
              <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>ESPACIO (opcional)</Text>
              <View style={s.chipRow}>
                <Pressable
                  style={[s.chip, spaceId === null && s.chipActive]}
                  onPress={() => setSpaceId(null)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: spaceId === null }}
                  accessibilityLabel="Evento global, sin espacio">
                  <Text style={[s.chipText, spaceId === null && s.chipTextActive]}>GLOBAL</Text>
                </Pressable>
                {mySpaces.map((sp) => (
                  <Pressable
                    key={sp.id}
                    style={[s.chip, spaceId === sp.id && s.chipActive]}
                    onPress={() => setSpaceId(sp.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: spaceId === sp.id }}
                    accessibilityLabel={`Evento del espacio ${sp.name}`}>
                    <Text style={[s.chipText, spaceId === sp.id && s.chipTextActive]}>
                      {sp.emoji ?? ''} {sp.name.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {error && (
            <Text style={s.error} accessibilityLiveRegion="polite" role="alert">{error}</Text>
          )}

          <Pressable
            style={[s.submitBtn, (saving || !title.trim()) && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={saving || !title.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving || !title.trim() }}
            accessibilityLabel="Convocar el evento">
            {saving ? (
              <ActivityIndicator color={palette.ink} size="small" />
            ) : (
              <Text style={s.submitText}>CONVOCAR</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  intro: { ...typography.caption, color: palette.smoke, paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: 12 },
  form: { paddingHorizontal: spacing.lg },
  fieldLabel: { ...typography.label, color: palette.smoke, marginBottom: spacing.xs, fontSize: 9 },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.line, minHeight: 38, justifyContent: 'center' },
  chipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  chipText: { ...typography.caption, color: palette.ash, fontSize: 11 },
  chipTextActive: { color: palette.goldText },
  error: { ...typography.caption, color: palette.danger, marginTop: spacing.md, fontSize: 12 },
  submitBtn: { backgroundColor: palette.gold, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg, minHeight: 52, justifyContent: 'center' },
  submitText: { ...typography.section, color: palette.ink },
});
