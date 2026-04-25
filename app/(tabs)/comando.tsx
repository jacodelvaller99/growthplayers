import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useProgramStore, getModulesForProgram } from '../../store/programStore'
import { useProfile } from '../../hooks/useProfile'
import { useCheckin } from '../../hooks/useCheckin'

const C = {
  bg: '#0A0A0A', surface: '#141414', surface2: '#1C1C1C',
  mint: '#EDBA01', mintMuted: 'rgba(237,186,1,0.10)',
  mintBorder: 'rgba(237,186,1,0.20)', mintFaint: 'rgba(237,186,1,0.35)',
  gold: '#EDBA01', goldMuted: 'rgba(237,186,1,0.12)', goldBorder: 'rgba(237,186,1,0.20)',
  text: '#FFFFFF', textMuted: '#C0C0C0', textFaint: 'rgba(237,186,1,0.35)',
  divider: 'rgba(255,255,255,0.08)',
}

const PILAR_COLORS: Record<string, string> = {
  fe: '#7c3aed', finanzas: '#059669', salud: '#dc2626', familia: '#f97316',
  mente: '#06b6d4', negocio: '#8b5cf6', impacto: '#0ea5e9', legado: '#64748b',
}
const PILAR_LABELS: Record<string, string> = {
  fe: 'Fe', finanzas: 'Finanzas', salud: 'Salud', familia: 'Familia',
  mente: 'Mente', negocio: 'Negocio', impacto: 'Impacto', legado: 'Legado',
}

const SkeletonBar = ({ width = '60%', height = 16 }: { width?: string | number, height?: number }) => (
  <View style={{
    height, borderRadius: 6,
    backgroundColor: C.surface2,
    width: width as any,
    opacity: 0.7,
  }} />
)

export default function ComandoScreen() {
  const router = useRouter()
  const { programType, currentModuleId, streak } = useProgramStore()
  const { profile, pilares, sovereigntyScore, isLoading, reload: reloadProfile } = useProfile()
  const { hasCheckedIn, reload: reloadCheckin } = useCheckin()
  const [refreshing, setRefreshing] = useState(false)

  const modules = getModulesForProgram(programType)
  const currentModule = modules.find((m) => m.id === currentModuleId) ?? modules[0]
  const completedCount = modules.filter((_, i) => i < (parseInt(currentModuleId?.split('_')[1] ?? '1') - 1)).length
  const totalModules = modules.length
  const moduleProgress = currentModuleId
    ? Math.round((completedCount / totalModules) * 100)
    : 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([reloadProfile(), reloadCheckin()])
    setRefreshing(false)
  }, [reloadProfile, reloadCheckin])

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoTitle}>LIFEFLOW</Text>
          <Text style={styles.logoSub}>× {programType === 'polaris' ? 'POLARIS' : 'GROWTH PLAYERS'}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/avatar')} style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {(profile?.full_name ?? 'U').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.mint} />}
      >
        {/* GREETING */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.greetingCard}>
          <View style={{ flex: 1, gap: 6 }}>
            {isLoading && profile === null ? (
              <>
                <SkeletonBar width="50%" height={22} />
                <SkeletonBar width="70%" height={14} />
              </>
            ) : (
              <>
                <Text style={styles.greetingName}>{greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Líder'}</Text>
                <Text style={styles.greetingSub}>Día {profile?.total_days ?? 0} del Protocolo Soberano</Text>
              </>
            )}
          </View>
          {isLoading && profile === null ? (
            <SkeletonBar width={52} height={52} />
          ) : (
            <Text style={styles.greetingDeco}>{profile?.total_days ?? 0}</Text>
          )}
        </Animated.View>

        {/* STATS ROW */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>días racha</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⚡</Text>
            {isLoading && profile === null ? (
              <SkeletonBar width={32} height={20} />
            ) : (
              <Text style={styles.statValue}>{sovereigntyScore}</Text>
            )}
            <Text style={styles.statLabel}>Soberanía</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statIcon, { color: C.mint }]}>✓</Text>
            <Text style={styles.statValue}>{completedCount}/{totalModules}</Text>
            <Text style={styles.statLabel}>Módulos</Text>
          </View>
        </Animated.View>

        {/* MÓDULO ACTIVO */}
        {currentModule && (
          <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.moduloCard}>
            <View style={styles.moduloPill}>
              <Text style={styles.moduloPillText}>MÓDULO ACTUAL</Text>
            </View>
            <View style={styles.moduloHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduloTitle}>{currentModule.title}</Text>
                <Text style={styles.moduloSub}>{currentModule.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="compass" size={24} color={C.gold} />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${moduleProgress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{moduleProgress}% completado</Text>
          </Animated.View>
        )}

        {/* ACCIONES */}
        <Text style={styles.sectionLabel}>Acciones de hoy</Text>
        <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.actionsCol}>
          <Pressable
            style={[styles.btnPrimary, hasCheckedIn && styles.btnDone]}
            onPress={() => router.push('/checkin')}
          >
            <Text style={styles.btnPrimaryIcon}>{hasCheckedIn ? '✓' : '☐'}</Text>
            <Text style={styles.btnPrimaryText}>
              {hasCheckedIn ? 'Check-in completado' : 'Registrar Check-in'}
            </Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => router.push('/(tabs)/mentor')}>
            <MaterialCommunityIcons name="brain" size={18} color={C.mint} />
            <Text style={styles.btnSecondaryText}>Hablar con Mentor</Text>
          </Pressable>
        </Animated.View>

        {/* PILARES GRID */}
        <Text style={styles.sectionLabel}>Rueda de la Vida</Text>
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.pilaresGrid}>
          {Object.entries(PILAR_LABELS).map(([key, label]) => (
            <View key={key} style={styles.pilarItem}>
              <View style={[styles.pilarCircle, { backgroundColor: PILAR_COLORS[key] }]}>
                <Text style={styles.pilarScore}>{(pilares as any)[key] ?? 5}</Text>
              </View>
              <Text style={styles.pilarLabel}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  logoTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.mint },
  logoSub: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11, color: C.gold, letterSpacing: 1 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.mintBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: C.mint },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  greetingCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.mintBorder,
    borderRadius: 14, padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden',
  },
  greetingName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: C.text },
  greetingSub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.textMuted, marginTop: 4 },
  greetingDeco: {
    fontFamily: 'SpaceGrotesk_700Bold', fontSize: 52, color: C.mint,
    opacity: 0.10, lineHeight: 56,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 12,
    alignItems: 'flex-start', gap: 2,
  },
  statIcon: { fontSize: 16 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, color: C.mint },
  statLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: C.textMuted },
  moduloCard: {
    backgroundColor: C.surface, borderLeftWidth: 3, borderLeftColor: C.gold,
    borderRadius: 14, padding: 16,
  },
  moduloPill: {
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  moduloPillText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 10, color: C.gold, letterSpacing: 0.8, textTransform: 'uppercase' },
  moduloHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  moduloTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: C.text },
  moduloSub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.textMuted, marginTop: 2 },
  progressTrack: { height: 4, backgroundColor: C.surface2, borderRadius: 999, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: C.gold, borderRadius: 999 },
  progressLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: C.textFaint, textAlign: 'right' },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, color: C.textFaint,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  actionsCol: { gap: 8 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: C.mint, borderRadius: 12,
  },
  btnDone: { backgroundColor: 'rgba(237,186,1,0.12)', borderWidth: 1, borderColor: C.mintBorder },
  btnPrimaryIcon: { fontSize: 18, color: '#0A0A0A' },
  btnPrimaryText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#0A0A0A' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderWidth: 1, borderColor: C.mintBorder, borderRadius: 12,
  },
  btnSecondaryText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: C.mint },
  pilaresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pilarItem: { width: '22%', alignItems: 'center', gap: 4 },
  pilarCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  pilarScore: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#fff' },
  pilarLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 10, color: C.textMuted, textAlign: 'center' },
})
