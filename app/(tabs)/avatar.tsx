import React from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Svg, { Polygon, Circle, Line } from 'react-native-svg'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useProfile } from '../../hooks/useProfile'
import { useProgramStore } from '../../store/programStore'
import { useAuthStore } from '../../store'
import { supabase } from '../../lib/supabase'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:          '#0A0A0A',
  surface:     '#111111',
  surface2:    '#181818',
  gold:        '#EDBA01',
  goldMid:     'rgba(237,186,1,0.14)',
  goldBorder:  'rgba(237,186,1,0.22)',
  goldDim:     'rgba(237,186,1,0.45)',
  goldFaint:   'rgba(237,186,1,0.07)',
  text:        '#FFFFFF',
  textMid:     '#888888',
  textDim:     '#555555',
  divider:     'rgba(255,255,255,0.07)',
}

const PILARES = [
  { key: 'fe',       label: 'FE',       color: '#7C3AED' },
  { key: 'finanzas', label: 'FINANZAS', color: '#059669' },
  { key: 'salud',    label: 'SALUD',    color: '#DC2626' },
  { key: 'familia',  label: 'FAMILIA',  color: '#F97316' },
  { key: 'mente',    label: 'MENTE',    color: '#06B6D4' },
  { key: 'negocio',  label: 'NEGOCIO',  color: '#8B5CF6' },
  { key: 'impacto',  label: 'IMPACTO',  color: '#0EA5E9' },
  { key: 'legado',   label: 'LEGADO',   color: '#64748B' },
]

const ARCHETYPE_LABELS: Record<string, { label: string; desc: string }> = {
  guerrero:   { label: 'GUERRERO',   desc: 'Fortaleza & disciplina' },
  pontifice:  { label: 'PONTÍFICE',  desc: 'Sabiduría & propósito' },
  mercader:   { label: 'MERCADER',   desc: 'Visión & abundancia' },
  guardian:   { label: 'GUARDIÁN',   desc: 'Protección & familia' },
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────
function RadarChart({ pilares }: { pilares: Record<string, number> }) {
  const cx = 110; const cy = 110; const maxR = 82; const n = 8

  const getPoint = (i: number, score: number) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    const r = (score / 10) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const getAxisEnd = (i: number) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) }
  }

  const dataPoints = PILARES.map((p, i) => getPoint(i, pilares[p.key] ?? 5))
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <Svg width={220} height={220} viewBox="-10 -10 240 240">
      {[0.25, 0.5, 0.75, 1.0].map(l => {
        const pts = Array.from({ length: n }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / n - Math.PI / 2
          const r = maxR * l
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
        }).join(' ')
        return <Polygon key={l} points={pts} fill="none" stroke={T.gold} strokeWidth="0.8" opacity={0.10} />
      })}

      {PILARES.map((_, i) => {
        const end = getAxisEnd(i)
        return <Line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={T.gold} strokeWidth="0.8" opacity={0.18} />
      })}

      <Polygon points={dataPolygon} fill={T.gold} fillOpacity={0.10} stroke={T.gold} strokeWidth="1.5" />

      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill={PILARES[i].color} />
      ))}
    </Svg>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AvatarScreen() {
  const insets = useSafeAreaInsets()
  const { profile, pilares, isLoading, sovereigntyScore } = useProfile()
  const { streak } = useProgramStore()
  const { setSession } = useAuthStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const name = profile?.full_name || 'Sin nombre'
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const archetypeInfo = ARCHETYPE_LABELS[profile?.archetype_id ?? '']

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={T.gold} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
      >
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(500)} style={[styles.hero, { paddingTop: insets.top + 32 }]}>
          {/* Avatar circle */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials || '?'}</Text>
          </View>

          <Text style={styles.heroName}>{name.toUpperCase()}</Text>

          {archetypeInfo && (
            <View style={styles.archetypePill}>
              <MaterialCommunityIcons name="shield-outline" size={11} color={T.gold} />
              <Text style={styles.archetypeText}>{archetypeInfo.label} · {archetypeInfo.desc}</Text>
            </View>
          )}

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{profile?.total_days ?? 0}</Text>
              <Text style={styles.statLbl}>DÍAS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{streak}</Text>
              <Text style={styles.statLbl}>RACHA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{sovereigntyScore ?? 0}</Text>
              <Text style={styles.statLbl}>SOBERANÍA</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── MI NORTE ───────────────────────────────────────────────── */}
        {profile?.norte && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>MI NORTE</Text>
              <MaterialCommunityIcons name="compass-rose" size={14} color={T.goldDim} />
            </View>
            <View style={styles.norteCard}>
              <Text style={styles.norteQuote}>"{profile.norte}"</Text>
            </View>
          </Animated.View>
        )}

        {/* ── RADAR ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
          <Text style={styles.sectionLabel}>RUEDA DE LA VIDA</Text>
          <View style={styles.radarCard}>
            <RadarChart pilares={pilares as unknown as Record<string, number>} />
            {/* Legend */}
            <View style={styles.legendGrid}>
              {PILARES.map(p => (
                <View key={p.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                  <Text style={styles.legendLabel}>{p.label}</Text>
                  <Text style={[styles.legendVal, { color: p.color }]}>
                    {(pilares as any)[p.key] ?? 5}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── PILARES BAR LIST ───────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
          <Text style={styles.sectionLabel}>PILARES DETALLE</Text>
          <View style={styles.pilaresCard}>
            {PILARES.map((p, i) => {
              const val = (pilares as any)[p.key] ?? 5
              const pct = (val / 10) * 100
              return (
                <View key={p.key} style={[styles.pilarRow, i < PILARES.length - 1 && styles.pilarRowBorder]}>
                  <Text style={styles.pilarName}>{p.label}</Text>
                  <View style={styles.pilarBarTrack}>
                    <View style={[styles.pilarBarFill, { width: `${pct}%` as any, backgroundColor: p.color }]} />
                  </View>
                  <Text style={[styles.pilarVal, { color: p.color }]}>{val}</Text>
                </View>
              )
            })}
          </View>
        </Animated.View>

        {/* ── LOGOUT ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.section}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name="logout-variant" size={16} color={T.textMid} />
            <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
          </Pressable>
        </Animated.View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { gap: 0 },

  // Hero
  hero: {
    alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingBottom: 28,
    borderBottomWidth: 1, borderBottomColor: T.divider,
    backgroundColor: T.surface,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: T.goldMid, borderWidth: 2, borderColor: T.goldBorder,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.gold, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
  },
  avatarInitials: { fontSize: 32, fontFamily: 'SpaceGrotesk_700Bold', color: T.gold },
  heroName: { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: T.text, letterSpacing: 1.5 },
  archetypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.goldFaint, borderWidth: 1.5, borderColor: T.goldBorder,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6,
  },
  archetypeText: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: T.gold, letterSpacing: 1 },
  statsStrip: {
    flexDirection: 'row', borderWidth: 1, borderColor: T.goldBorder,
    borderRadius: 12, overflow: 'hidden', width: '100%', backgroundColor: T.goldFaint,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statVal: { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: T.gold },
  statLbl: { fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', color: T.goldDim, letterSpacing: 2, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: T.goldBorder },

  // Section
  section: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold',
    color: T.goldDim, letterSpacing: 3, textTransform: 'uppercase',
  },

  // Norte
  norteCard: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.goldBorder,
    borderRadius: 14, padding: 18,
  },
  norteQuote: {
    fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular',
    color: T.text, lineHeight: 24, fontStyle: 'italic', textAlign: 'center',
  },

  // Radar
  radarCard: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.divider,
    borderRadius: 14, padding: 16, alignItems: 'center', gap: 16,
  },
  legendGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%',
  },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5, width: '45%',
  },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: { fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold', color: T.textMid, flex: 1, letterSpacing: 0.5 },
  legendVal: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

  // Pilares bars
  pilaresCard: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.divider, borderRadius: 14,
  },
  pilarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  pilarRowBorder: { borderBottomWidth: 1, borderBottomColor: T.divider },
  pilarName: { width: 58, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', color: T.textMid, letterSpacing: 0.5 },
  pilarBarTrack: { flex: 1, height: 4, backgroundColor: T.surface2, borderRadius: 999, overflow: 'hidden' },
  pilarBarFill: { height: '100%', borderRadius: 999 },
  pilarVal: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', width: 24, textAlign: 'right' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: T.divider,
  },
  logoutText: {
    fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: T.textMid, letterSpacing: 2,
  },
})
