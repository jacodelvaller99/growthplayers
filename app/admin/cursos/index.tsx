/**
 * Admin CMI — Gestión de Cursos
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { grantCourseAccess, revokeCourseAccess } from '@/lib/admin/actions';
import { fetchCourseAccess, searchUsers } from '@/lib/admin/queries';
import { COURSE_LABELS, type AdminUser, type CourseId, type UserCourseAccess } from '@/lib/admin/types';

const COURSES: Array<{ id: CourseId; modules: number; desc: string }> = [
  { id: 'polaris',           modules: 9,  desc: '9 módulos · 27+ lecciones' },
  { id: 'growthplayers',     modules: 6,  desc: '6 módulos · 18+ lecciones' },
  { id: 'lifeflow_bienestar',modules: 3,  desc: '3 módulos · bienestar integral' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CursosScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();

  const [selectedCourse, setSelectedCourse] = useState<CourseId>('polaris');
  const [access, setAccess] = useState<UserCourseAccess[]>([]);
  const [loading, setLoading] = useState(true);

  // Grant form
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchCourseAccess(selectedCourse);
    setAccess(data);
    setLoading(false);
  }, [selectedCourse]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (userQuery.trim().length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchUsers(userQuery);
      setUserResults(results);
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  const handleGrant = async () => {
    if (!adminId || !selectedUser) return;
    setSaving(true);
    const result = await grantCourseAccess({ adminId, userId: selectedUser.id, courseId: selectedCourse });
    setSaving(false);
    if (result.success) {
      Alert.alert('✅', `Acceso a ${COURSE_LABELS[selectedCourse]} otorgado a ${selectedUser.name}`);
      setSelectedUser(null);
      setUserQuery('');
      load();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleRevoke = (ca: UserCourseAccess) => {
    if (!adminId) return;
    Alert.alert('Revocar acceso', `¿Revocar acceso de este usuario a ${COURSE_LABELS[selectedCourse]}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revocar', style: 'destructive',
        onPress: async () => {
          await revokeCourseAccess({ adminId, accessId: ca.id, userId: ca.user_id });
          load();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>CURSOS</Text>
      </View>

      {/* Course cards */}
      <GoldDivider label="CURSOS DISPONIBLES" />
      <View style={s.courseGrid}>
        {COURSES.map(c => (
          <Pressable
            key={c.id}
            style={[s.courseCard, selectedCourse === c.id && s.courseCardActive]}
            onPress={() => setSelectedCourse(c.id)}>
            <Text style={[s.courseCardName, selectedCourse === c.id && { color: palette.goldText }]}>
              {COURSE_LABELS[c.id]}
            </Text>
            <Text style={s.courseCardMeta}>{c.desc}</Text>
            <Text style={s.courseCardCount}>
              {access.filter(a => a.course_id === c.id).length} usuarios
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Grant access form */}
      <GoldDivider label={`DAR ACCESO A ${COURSE_LABELS[selectedCourse].toUpperCase()}`} />
      <PremiumCard style={s.card}>
        <Text style={s.fieldLabel}>BUSCAR USUARIO</Text>
        {selectedUser ? (
          <View style={s.selectedUser}>
            <Text style={s.selectedName}>{selectedUser.name}</Text>
            <Pressable onPress={() => setSelectedUser(null)}>
              <MaterialIcons name="close" size={18} color={palette.smoke} />
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={s.input}
              placeholder="Nombre del usuario..."
              placeholderTextColor={palette.smoke}
              value={userQuery}
              onChangeText={setUserQuery}
            />
            {userResults.length > 0 && (
              <View style={s.dropdown}>
                {userResults.map(u => (
                  <Pressable key={u.id} style={s.dropdownItem} onPress={() => { setSelectedUser(u); setUserResults([]); setUserQuery(''); }}>
                    <Text style={s.dropdownName}>{u.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
        <Pressable
          style={[s.grantBtn, (!selectedUser || saving) && { opacity: 0.4 }]}
          onPress={handleGrant}
          disabled={!selectedUser || saving}>
          {saving ? (
            <ActivityIndicator color={palette.ink} size="small" />
          ) : (
            <Text style={s.grantBtnText}>DAR ACCESO</Text>
          )}
        </Pressable>
      </PremiumCard>

      {/* Users with access */}
      <GoldDivider label={`USUARIOS CON ACCESO (${access.length})`} />
      <PremiumCard style={s.card}>
        {loading ? (
          <ActivityIndicator color={palette.goldText} style={{ padding: spacing.xl }} />
        ) : access.length === 0 ? (
          <Text style={s.emptyText}>Sin usuarios con acceso a este curso</Text>
        ) : (
          access.map(ca => (
            <View key={ca.id} style={s.accessRow}>
              <View style={s.accessDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.accessUserId}>{ca.user_id.substring(0, 8)}…</Text>
                <Text style={s.accessMeta}>
                  Otorgado {formatDate(ca.granted_at)}
                  {ca.expires_at ? ` · Expira ${formatDate(ca.expires_at)}` : ''}
                </Text>
              </View>
              <Pressable style={s.revokeBtn} onPress={() => handleRevoke(ca)}>
                <Text style={s.revokeText}>REVOCAR</Text>
              </Pressable>
            </View>
          ))
        )}
      </PremiumCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  courseCard: { flex: 1, minWidth: 140, backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  courseCardActive: { borderColor: palette.gold, backgroundColor: palette.goldLight },
  courseCardName: { fontFamily: Fonts.display, fontSize: 11, color: palette.ivory, letterSpacing: 1, marginBottom: spacing.xs },
  courseCardMeta: { ...typography.caption, color: palette.smoke, fontSize: 10 },
  courseCardCount: { ...typography.mono, color: palette.goldText, fontSize: 11, marginTop: spacing.xs },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg },
  fieldLabel: { ...typography.label, color: palette.smoke, marginBottom: spacing.xs, fontSize: 9 },
  input: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  selectedUser: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.goldLight, borderRadius: radii.md, borderWidth: 1, borderColor: palette.lineGold, padding: spacing.md },
  selectedName: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 14, color: palette.ivory },
  dropdown: { backgroundColor: palette.graphiteLight, borderColor: palette.lineHard, borderWidth: 1, borderRadius: radii.md, marginTop: 2 },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  dropdownName: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  grantBtn: { backgroundColor: palette.gold, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  grantBtnText: { ...typography.section, color: palette.ink },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.md },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  accessDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.success },
  accessUserId: { fontFamily: Fonts.mono, fontSize: 12, color: palette.ivory },
  accessMeta: { ...typography.caption, color: palette.smoke, fontSize: 10, marginTop: 2 },
  revokeBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.xs, borderWidth: 1, borderColor: palette.danger },
  revokeText: { ...typography.label, color: palette.danger, fontSize: 8 },
});
