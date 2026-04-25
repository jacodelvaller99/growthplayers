import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Platform, RefreshControl, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useProgramStore, getModulesForProgram } from '../../store/programStore'
import { useProfile } from '../../hooks/useProfile'
import { useCheckin } from '../../hooks/useCheckin'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:           '#0A0A0A',
  surface:      '#111111',
  surface2:     '#181818',
  surfaceRaise: '#1E1E1E',
  gold:         '#EDBA01',
  goldMid:      'rgba(237,186,1,0.18)',
  goldBorder:   'rgba(237,186,1,0.22)',
  goldFaint:    'rgba(237,186,1,0.08)',
  goldGlow:     'rgba(237,186,1,0.06)',
  text:         '#FFFFFF',
  textMid:      '#A8A8A8',
  textDim:      '#666666',
  divider:      'rgba(255,255,255,0.07)',
  danger:       '#EF4444',
  success:      '#22C55E',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'BUENOS DÍAS'
  if (h < 18) return 'BUENAS TARDES'
  return 'BUENAS NOCHES'
}

function firstName(fullName?: string | null) {
  return (fullName ?? '').split(' ')[0]?.toUpperCase() || 'LÍDER'
}

function initials(fullName?: string | null) {
  return (fullName ?? 'U').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

// ─── Mini sparkline bars (streak visualization) ───────────────────────────────
const MiniBarChart = ({ value, max = 30 }: { value: number; max?: number }) => {
  const bars = 7
  const fill = Math.ceil((value / max) * bars)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 20 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            height: 4 + (i / (bars - 1)) * 14,
            backgroundColor: i < fill ? T.gold : T.surface2,
            opacity: i < fill ? 1 : 0.4,
          }}
        />
      ))}
    </View>
  )
}

// ─── Mini trend line (sovereignty score) ─────────────────────────────────────
const TrendLine = ({ score = 0 }: { score: number }) => {
  const pct = Math.min(Math.max(score / 100, 0), 1)
  const filled = Math.round(pct * 12)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, height: 14 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 3, height: i < filled ? 10 + (i % 3 === 0 ? 3 : 0) : 4,
            borderRadius: 1.5,
            backgroundColor: i < filled ? T.gold : T.surfaceRaise,
            opacity: i < filled ? 0.7 + (i / 12) * 0.3 : 0.3,
          }}
        />
      ))}
    </View>
  )
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
const Skel = ({ w = '60%', h = 14 }: { w?: string | number; h?: number }) => (
  <View style={{ height: h, width: w as any, backgroundColor: T.surface2, borderRadius: 4, opacity: 0.5 }} />
)

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: string
  chart?: React.ReactNode
  onPress?: () => void
  highlight?: boolean
}
const KpiCard = ({ label, value, sub, icon, chart, onPress, highlight }: KpiCardProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.kpiCard,
      highlight && styles.kpiCardHighlight,
      pressed && { opacity: 0.85 },
    ]}
  >
    <View style={styles.kpiTop}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <MaterialCommunityIcons name={icon as any} size={15} color={T.gold} style={{ opacity: 0.6 }} />
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    {chart && <View style={{ marginTop: 8 }}>{chart}</View>}
    {sub && <Text style={styles.kpiSub}>{sub}</Text>}
  </Pressable>
)

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ComandoScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { programType, currentModuleId, streak } = useProgramStore()
  const { profile, pilares, sovereigntyScore, isLoading, reload: reloadProfile } = useProfile()
  const { hasCheckedIn, reload: reloadCheckin } = useCheckin()
  const [refreshing, setRefreshing] = useState(false)

  const modules = getModulesForProgram(programType)
  const currentModule = modules.find(m => m.id === currentModuleId) ?? modules[0]
  const completedCount = modules.filter((_, i) => i < (parseInt(currentModuleId?.split('_')[1] ?? '1') - 1)).length
  const totalModules = modules.length
  const moduleProgress = currentModuleId ? Math.round((completedCount / totalModules) * 100) : 0

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([reloadProfile(), reloadCheckin()])
    setRefreshing(false)
  }, [reloadProfile, reloadCheckin])

  const headerPadding = insets.top + 12

  return (
    <View style={styles.container}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[styles.header, { paddingTop: headerPadding }]}
      >
        <View>
          <Text style={styles.logoMark}>LIFEFLOW</Text>
          <Text style={styles.programBadge}>
            {programType === 'polaris' ? '× POLARIS PROTOCOL™' : '× GROWTH PLAYERS™'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/avatar')}
          style={styles.avatarBtn}
          accessibilityLabel="Ir a perfil"
        >
          <Text style={styles.avatarInitials}>
            {isLoading ? '…' : initials(profile?.full_name)}
          </Text>
        </Pressable>
      </Animated.View>

      {/* ── SCROLL CONTENT ─────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} />
        }
      >

        {/* ── MASSIVE GREETING ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(60).duration(550)} style={styles.greetingBlock}>
          <Text style={styles.greetingTime}>{greeting()},</Text>
          {isLoading && !profile ? (
            <Skel w="55%" h={48} />
          ) : (
            <Text style={styles.greetingName} numberOfLines={1} adjustsFontSizeToFit>
              {firstName(profile?.full_name)}
            </Text>
          )}
          <Text style={styles.greetingDay}>
            DÍA {profile?.total_days ?? 0} · PROTOCOLO SOBERANO
          </Text>
        </Animated.View>

        {/* ── DIVIDER ────────────────────────────────────────────── */}
        <View style={styles.sectionDivider} />

        {/* ── KPI GRID ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.kpiGrid}>
          {/* RACHA */}
          <KpiCard
            label="RACHA"
            value={isLoading ? '—' : `${streak}`}
            sub="días consecutivos"
            icon="fire"
            chart={<MiniBarChart value={streak} max={30} />}
          />
          {/* SOBERANÍA */}
          <KpiCard
            label="SOBERANÍA"
            value={isLoading ? '—' : `${sovereigntyScore ?? 0}`}
            sub="puntos"
            icon="lightning-bolt"
            chart={<TrendLine score={sovereigntyScore ?? 0} />}
          />
          {/* MÓDULO */}
          <KpiCard
            label="MÓDULO"
            value={`${completedCount}/${totalModules}`}
            sub={`${moduleProgress}% completado`}
            icon="layers-triple-outline"
            onPress={() => router.push('/(tabs)/academia')}
          />
          {/* CHECK-IN */}
          <KpiCard
            label="CHECK-IN"
            value={hasCheckedIn ? '✓' : '—'}
            sub={hasCheckedIn ? 'completado hoy' : 'pendiente'}
            icon="checkbox-marked-circle-outline"
            highlight={!hasCheckedIn}
            onPress={() => router.push('/checkin')}
          />
        </Animated.View>

        {/* ── MÓDULO ACTIVO ──────────────────────────────────────── */}
        {currentModule && (
          <Animated.View entering={FadeInDown.delay(280).duration(500)}>
            <Pressable
              style={styles.moduleCard}
              onPress={() => router.push('/(tabs)/academia')}
            >
              {/* accent line */}
              <View style={styles.moduleAccentLine} />
              <View style={styles.moduleInner}>
                <View style={styles.moduleTopRow}>
                  <Text style={styles.modulePill}>MÓDULO ACTIVO</Text>
                  <MaterialCommunityIcons name="arrow-right" size={14} color={T.gold} style={{ opacity: 0.5 }} />
                </View>
                <Text style={styles.moduleTitle}>{currentModule.title}</Text>
                <Text style={styles.moduleSub}>{currentModule.subtitle}</Text>
                {/* progress track */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${moduleProgress}%` }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={styles.progressLabel}>Progreso</Text>
                  <Text style={[styles.progressLabel, { color: T.gold }]}>{moduleProgress}%</Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ── MI NORTE ───────────────────────────────────────────── */}
        {profile?.norte && (
          <Animated.View entering={FadeInDown.delay(360).duration(500)}>
            <Pressable
              style={styles.norteCard}
              onPress={() => router.push('/(tabs)/bitacora')}
            >
              <View style={styles.norteHeader}>
                <MaterialCommunityIcons name="compass-rose" size={18} color={T.gold} />
                <Text style={styles.norteLabel}>MI NORTE</Text>
              </View>
              <Text style={styles.norteText} numberOfLines={3}>{profile.norte}</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── ACCIONES ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(440).duration(500)} style={styles.actionsBlock}>
          <Text style={styles.sectionLabel}>ACCIONES DE HOY</Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionBtn, hasCheckedIn ? styles.actionBtnDone : styles.actionBtnPrimary]}
              onPress={() => router.push('/checkin')}
            >
              <MaterialCommunityIcons
                name={hasCheckedIn ? 'check-circle' : 'circle-outline'}
                size={20}
                color={hasCheckedIn ? T.gold : T.bg}
              />
              <Text style={[styles.actionBtnText, hasCheckedIn && { color: T.gold }]}>
                {hasCheckedIn ? 'CHECK-IN LISTO' : 'HACER CHECK-IN'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionBtnSecondary}
              onPress={() => router.push('/(tabs)/mentor')}
            >
              <MaterialCommunityIcons name="brain" size={20} color={T.gold} />
              <Text style={[styles.actionBtnText, { color: T.gold }]}>MENTOR IA</Text>
            </Pressable>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  logoMark: {
    fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.gold, letterSpacing: 3,
  },
  programBadge: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: 'rgba(237,186,1,0.45)', letterSpacing: 1.5, marginTop: 1,
  },
  avatarBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: T.goldMid, borderWidth: 1.5, borderColor: T.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: T.gold },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 28, gap: 20 },

  // Greeting — editorial / massive
  greetingBlock: { gap: 6 },
  greetingTime: {
    fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.textMid, letterSpacing: 2, textTransform: 'uppercase',
  },
  greetingName: {
    fontSize: 48, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.text, lineHeight: 52, letterSpacing: -1,
  },
  greetingDay: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: T.gold, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 4,
  },

  // Section divider
  sectionDivider: {
    height: 1, backgroundColor: T.divider, marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: T.textDim, letterSpacing: 2.5, textTransform: 'uppercase',
    marginBottom: 10,
  },

  // KPI Grid — 2×2
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  kpiCard: {
    width: (SCREEN_W - 20 * 2 - 10) / 2,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.divider,
    borderRadius: 14, padding: 14,
  },
  kpiCardHighlight: {
    borderColor: T.goldBorder, backgroundColor: T.goldFaint,
  },
  kpiTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_600SemiBold',
    color: T.textDim, letterSpacing: 2, textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.text, lineHeight: 34,
  },
  kpiSub: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.textMid, marginTop: 4,
  },

  // Module card
  moduleCard: {
    backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.divider,
    overflow: 'hidden',
  },
  moduleAccentLine: {
    height: 3, backgroundColor: T.gold,
    width: '100%',
  },
  moduleInner: { padding: 18, gap: 4 },
  moduleTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  modulePill: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.gold, letterSpacing: 2.5, textTransform: 'uppercase',
  },
  moduleTitle: {
    fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.text, lineHeight: 28,
  },
  moduleSub: {
    fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.textMid, lineHeight: 19, marginBottom: 12,
  },
  progressTrack: {
    height: 3, backgroundColor: T.surfaceRaise, borderRadius: 999, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: T.gold, borderRadius: 999 },
  progressLabel: {
    fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular', color: T.textDim,
  },

  // Norte card
  norteCard: {
    backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.goldBorder,
    padding: 18,
  },
  norteHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  norteLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.gold, letterSpacing: 2.5, textTransform: 'uppercase',
  },
  norteText: {
    fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.text, lineHeight: 22, fontStyle: 'italic',
  },

  // Actions
  actionsBlock: { gap: 0 },
  actionsRow: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, borderRadius: 12,
  },
  actionBtnPrimary: { backgroundColor: T.gold },
  actionBtnDone: {
    backgroundColor: T.goldFaint, borderWidth: 1.5, borderColor: T.goldBorder,
  },
  actionBtnSecondary: {
    backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.goldBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.bg, letterSpacing: 1.5,
  },
})
