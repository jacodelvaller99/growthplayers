/**
 * app/perfil/index.tsx
 *
 * Perfil Soberano — Hub page for the /perfil route.
 *
 * Fixes the 404 at growthplayers.vercel.app/perfil.
 * Renders the Score Soberano as a luxury shareable card,
 * protocol progress, earned archetypes, and links to wearables.
 *
 * Design direction: Luxury / Refined — Score as architectural hero.
 * Surgical scope: this file only (Karpathy simplicity principle).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GoldDivider,
  ProgressCard,
  SovereignDeltaTag,
  useScreen,
} from '@/components/polaris';
import { HeroPanel, HeroRule, StatStack } from '@/components/focus-deck';
import { buildHistoria } from '@/lib/narrativeLogic';
import { POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { calcSovereignScore, calcSovereignBaseline, calcSovereignDelta, computeStreak } from '@/lib/utils';

// ─── Score tier helpers ───────────────────────────────────────────────────────

function scoreTierLabel(score: number): string {
  if (score >= 900) return 'ÉLITE';
  if (score >= 700) return 'AVANZADO';
  if (score >= 500) return 'EN PROGRESO';
  return 'INICIANDO';
}

// goldText (no gold): este color es principalmente TEXTO (número de 80px + tier label).
// palette.gold (#FFC804) como texto es ilegible sobre superficie clara; goldText es
// theme-aware. También se usa como fill (dot/barra), donde goldText funciona igual.
function scoreTierColor(score: number): string {
  if (score >= 900) return palette.goldText;
  if (score >= 700) return palette.success;
  if (score >= 500) return palette.goldText;
  return palette.smoke;
}

// ─── Share text builder ───────────────────────────────────────────────────────

function buildShareText(params: {
  name: string;
  protocolDay: number;
  score: number;
  protocolProgress: number;
  earnedArchetypes: string[];
}): string {
  const { name, protocolDay, score, protocolProgress, earnedArchetypes } = params;
  const tier = scoreTierLabel(score);
  const archetypeText =
    earnedArchetypes.length > 0
      ? `\nArquetipos conquistados: ${earnedArchetypes.join(' · ')}`
      : '';

  return [
    `🏛 POLARIS — SCORE SOBERANO`,
    ``,
    `${name.toUpperCase()}`,
    `Día ${protocolDay} de 90 · ${tier}`,
    `Score: ${score}/1000  ·  Avance: ${protocolProgress}%`,
    archetypeText,
    ``,
    `Protocolo Soberano · growthplayers.vercel.app`,
  ]
    .filter((l) => l !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PerfilSoberanoScreen() {
  const sc = useScreen();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, protocolDay, averages } = useLifeFlow();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const wellnessSessions = state.wellnessSessions ?? [];
  const wellnessMeditation = wellnessSessions.filter((s) => s.type === 'meditation').length;
  const wellnessBreathing  = wellnessSessions.filter((s) => s.type === 'breathing').length;
  const wellnessBinaural   = wellnessSessions.filter((s) => s.type === 'binaural').length;

  // Racha real: el bonus de racha del score premia días CONSECUTIVOS, no el
  // total histórico de check-ins (que nunca decrece). Se reusa en StatStack.
  const streak = computeStreak(state.checkIns);

  const score = calcSovereignScore({
    energy:           averages.energy ?? 0,
    clarity:          averages.clarity ?? 0,
    stress:           averages.stress ?? 5,
    sleep:            averages.sleep ?? 0,
    streak,
    completedLessons: (state.completedLessons ?? []).length,
    completedTasks:   Object.keys(state.completedTasks ?? {}).length,
    wellnessMeditation,
    wellnessBreathing,
    wellnessBinaural,
  });

  const protocolProgress = Math.min(Math.round((protocolDay / 90) * 100), 100);

  // Sovereign delta — progreso vs línea base, como subtítulo del score absoluto.
  const sovereignDelta = useMemo(() => calcSovereignDelta(state.checkIns), [state.checkIns]);
  const baselineDay = useMemo(() => {
    if (calcSovereignBaseline(state.checkIns).ready) return 7;
    if (!state.checkIns.length) return 1;
    const oldest = Math.min(...state.checkIns.map((c) => new Date(c.date).getTime()));
    return Math.min(Math.max(Math.floor((Date.now() - oldest) / 86400000) + 1, 1), 7);
  }, [state.checkIns]);

  const earnedArchetypes = useMemo(() => {
    const completed = state.completedLessons ?? [];
    return POLARIS_MODULES
      .filter((m) => m.arquetipo)
      .filter((m) => {
        const total = m.lessons.length;
        const done  = m.lessons.filter((l) => completed.includes(l.id)).length;
        return total > 0 && done >= total;
      })
      .map((m) => m.arquetipo!.toUpperCase());
  }, [state.completedLessons]);

  const tier       = scoreTierLabel(score);
  const tierColor  = scoreTierColor(score);
  const firstName  = state.profile.name.split(' ')[0] ?? state.profile.name;

  // La historia completa — misma fuente que Progreso (buildHistoria).
  const historia = useMemo(() => buildHistoria({
    protocolDay,
    painPoint: state.profile.painPoint,
    purpose: state.northStar.purpose,
    identity: state.northStar.identity,
    completedLessonCount: (state.completedLessons ?? []).length,
    taskCount: Object.keys(state.completedTasks ?? {}).length,
    checkInsCount: state.checkIns.length,
    avgEnergy: averages.energy ?? 0,
    archetypesEarned: earnedArchetypes,
  }), [protocolDay, state.profile.painPoint, state.northStar.purpose, state.northStar.identity, state.completedLessons, state.completedTasks, state.checkIns.length, averages.energy, earnedArchetypes]);

  // ── Share handler ───────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const text = buildShareText({
      name:            state.profile.name,
      protocolDay,
      score,
      protocolProgress,
      earnedArchetypes,
    });

    try {
      if (Platform.OS === 'web') {
        const nav = (typeof navigator !== 'undefined' ? navigator : null) as { share?: (d: unknown) => Promise<void>; clipboard?: { writeText?: (t: string) => Promise<void> } } | null;
        if (nav?.share) {
          await nav.share({ title: 'Mi Score Soberano — Polaris', text });
        } else if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      } else {
        await Share.share({ message: text, title: 'Mi Score Soberano — Polaris' });
      }
    } catch {
      // User cancelled or share not supported — silent fail
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never">

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.headerTitle}>PERFIL SOBERANO</Text>
        <Pressable
          style={[styles.shareIconBtn, sharing && { opacity: 0.5 }]}
          onPress={handleShare}
          disabled={sharing}
          accessibilityRole="button"
          accessibilityState={{ disabled: sharing }}
          accessibilityLabel="Compartir Score Soberano">
          <MaterialIcons name="share" size={20} color={palette.goldText} />
        </Pressable>
      </View>

      {/* ── Héroe consolidado: avatar + nombre + día + score en UNA superficie
          (antes tres tarjetas apiladas — identidad, score, stats — cada una con
          su propio marco para el mismo bloque de "quién eres hoy"). ── */}
      <HeroPanel>
        <View style={styles.avatarRow}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {state.profile.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{state.profile.name.toUpperCase()}</Text>
            <Text style={styles.heroMeta}>
              DÍA {protocolDay}/90 · <Text style={{ color: tierColor }}>{tier}</Text>
            </Text>
          </View>
        </View>

        <HeroRule />

        <View style={styles.heroScoreBlock}>
          <View style={styles.scoreNumRow}>
            <Text style={[styles.scoreNum, { color: tierColor }]}>{score}</Text>
            <Text style={styles.scoreMax}>/1000 SCORE SOBERANO</Text>
          </View>
          {/* Score bar — no concatenar alpha sobre tierColor: puede ser un token
              cv() 'var(--c-*)' y 'var(...)55' es CSS inválido. */}
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                {
                  width: `${Math.round((score / 1000) * 100)}%` as unknown as number,
                  backgroundColor: tierColor,
                },
              ]}
            />
          </View>
          <Text style={styles.scoreHint}>
            {score >= 900
              ? `${firstName}, eso no es un número — es evidencia de quién eres.`
              : score >= 700
                ? `${firstName}, ya estás en el cuartil superior. Sigue.`
                : score >= 500
                  ? `El sistema está registrando cada acción, ${firstName}.`
                  : `Cada check-in mueve el número, ${firstName}. El sistema responde.`}
          </Text>
          <View style={styles.scoreDeltaRow}>
            <SovereignDeltaTag delta={sovereignDelta} baselineDay={baselineDay} />
          </View>
        </View>
      </HeroPanel>

      {/* Declaración de identidad — solo si está definida, fuera del héroe para
          no anidar su propio marco dentro del de HeroPanel. */}
      {state.northStar.identity ? (
        <View style={styles.declaration}>
          <Text style={styles.declarationLabel}>DECLARACIÓN DE IDENTIDAD</Text>
          <Text style={styles.declarationText}>
            “{state.northStar.identity.slice(0, 140)}”
          </Text>
        </View>
      ) : null}

      {/* ── Protocol Progress ── */}
      <ProgressCard
        label="Protocolo Soberano · 90 Días"
        value={`${protocolProgress}% · Día ${protocolDay}/90`}
        progress={protocolProgress}
      />

      {/* ── Tres números ── */}
      <StatStack
        stats={[
          { name: 'RACHA', value: streak > 0 ? `${streak}d` : '—' },
          { name: 'LECCIONES', value: `${(state.completedLessons ?? []).length}` },
          { name: 'PRÁCTICAS', value: `${wellnessMeditation + wellnessBreathing + wellnessBinaural}` },
        ]}
      />

      {/* ── Tu historia — la voz única de lib/narrativeLogic (buildHistoria),
          la misma que Progreso y el perfil de cliente. Capítulo a capítulo:
          umbral → declaración → arco → evidencia → hoy. Solo aparecen los
          capítulos con dato real: una historia corta es verdad, no defecto. */}
      <GoldDivider inset label="TU HISTORIA" />
      <View style={styles.historiaWrap}>
        {historia.map((c) => (
          <View key={c.label} style={styles.historiaChapter}>
            <Text style={styles.historiaLabel}>{c.label}</Text>
            <Text style={styles.historiaText}>{c.text}</Text>
          </View>
        ))}
      </View>

      {/* ── Earned archetypes ── */}
      {earnedArchetypes.length > 0 && (
        <>
          <GoldDivider inset label="ARQUETIPOS CONQUISTADOS" />
          <View style={styles.archetypeGrid}>
            {earnedArchetypes.map((arch) => (
              <View key={arch} style={styles.archetypeChip}>
                <MaterialIcons name="military-tech" size={11} color={palette.goldText} />
                <Text style={styles.archetypeChipText}>{arch}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Navigation: Mi Memoria ── */}
      <GoldDivider inset label="MI PROCESO" />
      <Pressable
        style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/perfil/cliente' as never)}
        accessibilityRole="button"
        accessibilityLabel="Ver mi memoria">
        <View style={styles.navIcon}>
          <MaterialIcons name="auto-stories" size={22} color={palette.goldText} />
        </View>
        <View style={styles.navCopy}>
          <Text style={styles.navTitle}>MI MEMORIA</Text>
          <Text style={styles.navSub}>Tu resumen, compromisos y avances</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
      </Pressable>

      {/* ── Navigation: Wearables ── */}
      <GoldDivider inset label="INTEGRACIONES" />
      <Pressable
        style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/perfil/wearables' as never)}
        accessibilityRole="button"
        accessibilityLabel="Ver dispositivos wearables">
        <View style={styles.navIcon}>
          <MaterialIcons name="monitor-heart" size={22} color={palette.goldText} />
        </View>
        <View style={styles.navCopy}>
          <Text style={styles.navTitle}>DISPOSITIVOS WEARABLES</Text>
          <Text style={styles.navSub}>WHOOP · Oura Ring — biometría en tiempo real</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
      </Pressable>

      {/* ── Navigation: Apariencia ── */}
      <GoldDivider inset label="AJUSTES" />
      <Pressable
        style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/perfil/apariencia' as never)}
        accessibilityRole="button"
        accessibilityLabel="Cambiar la apariencia de la app">
        <View style={styles.navIcon}>
          <MaterialIcons name="palette" size={22} color={palette.goldText} />
        </View>
        <View style={styles.navCopy}>
          <Text style={styles.navTitle}>APARIENCIA</Text>
          <Text style={styles.navSub}>Fondo y color — 30 combinaciones</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
      </Pressable>

      {/* ── Full profile link ── */}
      <Pressable
        style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/(tabs)/progreso' as never)}
        accessibilityRole="button"
        accessibilityLabel="Ver perfil completo">
        <View style={styles.navIcon}>
          <MaterialIcons name="bar-chart" size={22} color={palette.ash} />
        </View>
        <View style={styles.navCopy}>
          <Text style={styles.navTitle}>VER PERFIL COMPLETO</Text>
          <Text style={styles.navSub}>Métricas, logros, arquetipos, configuración</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
      </Pressable>

      {/* ── Share CTA ── */}
      <Pressable
        style={[styles.shareCTA, (sharing || copied) && { opacity: 0.75 }]}
        onPress={handleShare}
        disabled={sharing}
        accessibilityRole="button"
        accessibilityState={{ disabled: sharing }}
        accessibilityLabel="Compartir Score Soberano">
        <MaterialIcons
          name={copied ? 'check' : 'share'}
          size={18}
          color={palette.ink}
        />
        <Text style={styles.shareCTAText}>
          {sharing
            ? 'COMPARTIENDO...'
            : copied
              ? 'COPIADO AL PORTAPAPELES'
              : 'COMPARTIR SCORE SOBERANO'}
        </Text>
      </Pressable>

      {/* ── Tagline ── */}
      <Text style={styles.tagline}>
        Polaris OS · Protocolo Soberano
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  shareIconBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  // Hero identity row (dentro de HeroPanel)
  avatarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatarRing: {
    borderColor: palette.gold,
    borderRadius: radii.xs,
    borderWidth: 2,
    flexShrink: 0,
    padding: 3,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  avatarInitials: {
    color: palette.ink,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  heroName: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 24,
  },
  heroMeta: {
    color: palette.ash,
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Identity declaration
  declaration: {
    borderColor: palette.lineSoft,
    borderLeftColor: palette.gold,
    borderLeftWidth: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  declarationLabel: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 8,
    letterSpacing: 2,
  },
  declarationText: {
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Score — dentro del HeroPanel, sin marco propio (un solo borde ya lo dibuja el panel)
  heroScoreBlock: {
    gap: spacing.sm,
  },
  scoreNumRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  scoreNum: {
    ...typography.numeric,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  scoreMax: {
    color: palette.smoke,
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
  },
  scoreBar: {
    backgroundColor: palette.charcoal,
    borderRadius: 3,
    height: 4,
    overflow: 'hidden',
    width: '100%',
  },
  scoreBarFill: {
    borderRadius: 3,
    height: 4,
  },
  scoreHint: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  scoreDeltaRow: {
    alignItems: 'center',
    marginTop: 2,
  },

  // Archetypes
  // Tu historia
  historiaWrap: { gap: spacing.lg },
  historiaChapter: { gap: 4 },
  historiaLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: palette.goldText,
    textTransform: 'uppercase',
  },
  historiaText: { ...typography.body, color: palette.ivory, fontSize: 14, lineHeight: 21 },

  archetypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  archetypeChip: {
    alignItems: 'center',
    backgroundColor: alpha(palette.gold, '14'),
    borderColor: alpha(palette.gold, '44'),
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  archetypeChipText: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
  },

  // Navigation rows
  navRow: {
    alignItems: 'center',
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navIcon: {
    alignItems: 'center',
    backgroundColor: alpha(palette.gold, '14'),
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  navCopy: {
    flex: 1,
    gap: 2,
  },
  navTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  navSub: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 10,
  },

  // Share CTA — full-width gold button
  shareCTA: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  shareCTAText: {
    color: palette.ink,
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Footer tagline
  tagline: {
    color: palette.smoke,
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    opacity: 0.5,
    paddingBottom: spacing.sm,
    textAlign: 'center',
  },
});
