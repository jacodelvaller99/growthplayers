import React, { useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native'
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, withDelay, withSpring, useAnimatedProps,
} from 'react-native-reanimated'
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg'
import { useProfile } from '../../hooks/useProfile'
import { useProgramStore } from '../../store/programStore'

const C = {
  bg: '#01191D', surface: '#0D2B30', surface2: '#0F3640',
  mint: '#AEFEF0', mintMuted: 'rgba(174,254,240,0.12)',
  mintBorder: 'rgba(174,254,240,0.20)', mintFaint: 'rgba(174,254,240,0.40)',
  gold: '#EDBA01', goldMuted: 'rgba(237,186,1,0.12)', goldBorder: 'rgba(237,186,1,0.20)',
  text: '#FFFFFF', textMuted: '#86C6B3',
  divider: 'rgba(174,254,240,0.08)',
}

const PILARES = [
  { key: 'fe',       label: 'Fe',       color: '#7c3aed' },
  { key: 'finanzas', label: 'Finanzas', color: '#059669' },
  { key: 'salud',    label: 'Salud',    color: '#dc2626' },
  { key: 'familia',  label: 'Familia',  color: '#f97316' },
  { key: 'mente',    label: 'Mente',    color: '#06b6d4' },
  { key: 'negocio',  label: 'Negocio',  color: '#8b5cf6' },
  { key: 'impacto',  label: 'Impacto',  color: '#0ea5e9' },
  { key: 'legado',   label: 'Legado',   color: '#64748b' },
]

const ARCHETYPE_LABELS: Record<string, string> = {
  guerrero: 'Guerrero', pontifice: 'Pontífice',
  mercader: 'Mercader', guardian: 'Guardián',
}

function RadarChart({ pilares }: { pilares: Record<string, number> }) {
  const cx = 120; const cy = 120; const maxR = 90; const n = 8

  const getPoint = (i: number, score: number) => {
    const angle = (i * (2 * Math.PI)) / n - Math.PI / 2
    const r = (score / 10) * maxR
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const getAxisEnd = (i: number) => {
    const angle = (i * (2 * Math.PI)) / n - Math.PI / 2
    return {
      x: cx + maxR * Math.cos(angle),
      y: cy + maxR * Math.sin(angle),
    }
  }

  const getLabelPos = (i: number) => {
    const angle = (i * (2 * Math.PI)) / n - Math.PI / 2
    const r = maxR + 18
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const pMap = pilares as unknown as Record<string, number>
  const dataPoints = PILARES.map((p, i) => getPoint(i, pMap[p.key] ?? 5))
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const bgLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  return (
    <Svg width={240} height={240} viewBox="-20 -20 280 280">
      {/* BG rings */}
      {bgLevels.map((l) => {
        const pts = Array.from({ length: n }).map((_, i) => {
          const angle = (i * (2 * Math.PI)) / n - Math.PI / 2
          const r = maxR * l
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
        }).join(' ')
        return <Polygon key={l} points={pts} fill="none" stroke={C.mint} strokeWidth="0.5" opacity={0.12} />
      })}

      {/* Axis lines */}
      {PILARES.map((_, i) => {
        const end = getAxisEnd(i)
        return <Line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={C.mint} strokeWidth="0.5" opacity={0.2} />
      })}

      {/* Data polygon */}
      <Polygon
        points={dataPolygon}
        fill={C.mint}
        fillOpacity={0.12}
        stroke={C.mint}
        strokeWidth="1.5"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={PILARES[i].color} />
      ))}

      {/* Labels */}
      {PILARES.map((pilar, i) => {
        const pos = getLabelPos(i)
        return (
          <SvgText
            key={i}
            x={pos.x}
            y={pos.y}
            fill={PILARES[i].color}
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {pilar.label}
          </SvgText>
        )
      })}
    </Svg>
  )
}

export default function AvatarScreen() {
  const { profile, pilares, isLoading, sovereigntyScore } = useProfile()
  const { streak } = useProgramStore()

  const name = profile?.full_name || 'Tú'
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  const archetype = ARCHETYPE_LABELS[profile?.archetype_id ?? ''] ?? '—'
  const norte = profile?.norte || ''

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.mint} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials || '?'}</Text>
          </View>
          <Text style={styles.heroName}>{name}</Text>
          {profile?.archetype_id && (
            <View style={styles.archetypePill}>
              <Text style={styles.archetypePillText}>Arquetipo: {archetype}</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Día {profile?.total_days ?? 0}</Text>
              <Text style={styles.statLabel}>Protocolo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streak}🔥</Text>
              <Text style={styles.statLabel}>Racha</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sovereigntyScore}/10</Text>
              <Text style={styles.statLabel}>Soberanía</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {/* MI NORTE */}
          {norte ? (
            <Animated.View entering={FadeInDown.delay(150).duration(600)}>
              <Text style={styles.sectionLabel}>MI NORTE</Text>
              <View style={styles.norteCard}>
                <Text style={styles.norteIcon}>★</Text>
                <Text style={styles.norteText}>"{norte}"</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* RADAR CHART */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <Text style={styles.sectionLabel}>RUEDA DE LA VIDA</Text>
            <View style={styles.radarWrap}>
              <RadarChart pilares={pilares as unknown as Record<string, number>} />
            </View>
          </Animated.View>

          {/* PILARES BARS */}
          <Animated.View entering={FadeInDown.delay(450).duration(600)} style={styles.pilaresWrap}>
            {PILARES.map((p) => {
              const pVal = (pilares as unknown as Record<string, number>)[p.key] ?? 5
              return (
                <View key={p.key} style={styles.pilarRow}>
                  <Text style={styles.pilarName}>{p.label}</Text>
                  <View style={styles.pilarBarWrap}>
                    <View style={[styles.pilarBarFill, { width: `${(pVal / 10) * 100}%` as any, backgroundColor: p.color }]} />
                  </View>
                  <Text style={[styles.pilarScore, { color: p.color }]}>{pVal}/10</Text>
                </View>
              )
            })}
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  hero: {
    backgroundColor: C.surface2,
    paddingVertical: 32, paddingHorizontal: 20,
    alignItems: 'center', gap: 12,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.surface, borderWidth: 2, borderColor: C.mint,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.mint, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  avatarInitials: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, color: C.mint },
  heroName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: C.text },
  archetypePill: {
    backgroundColor: C.goldMuted, borderWidth: 1, borderColor: C.goldBorder,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 5,
  },
  archetypePillText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 12, color: C.gold },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.mintMuted, borderWidth: 1, borderColor: C.mintBorder,
    borderRadius: 12, overflow: 'hidden', marginTop: 4, width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: C.mint },
  statLabel: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: C.textMuted },
  statDivider: { width: 1, height: 32, backgroundColor: C.divider },
  content: { padding: 16, gap: 24 },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 11,
    color: C.mintFaint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },
  norteCard: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.mintBorder,
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 10,
  },
  norteIcon: { fontSize: 24, color: C.gold },
  norteText: {
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 15, color: C.text,
    fontStyle: 'italic', textAlign: 'center', lineHeight: 24,
  },
  radarWrap: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, paddingVertical: 16 },
  pilaresWrap: { gap: 10 },
  pilarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pilarName: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.text, width: 60 },
  pilarBarWrap: { flex: 1, height: 6, backgroundColor: C.surface2, borderRadius: 999, overflow: 'hidden' },
  pilarBarFill: { height: '100%', borderRadius: 999 },
  pilarScore: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, width: 36, textAlign: 'right' },
})
