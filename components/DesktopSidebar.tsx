import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, Fonts } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useAppTheme, type ThemeMode } from '@/hooks/use-app-theme';
import { PolarisLogo } from '@/components/PolarisLogo';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavItem {
  label: string;
  icon: IconName;
  route: string;
  match: string;
}

// ─── Nav grouping (espejo del diseño desktop de Claude Design) ─────────────────
// OPERACIÓN = núcleo del día a día · ACCESO RÁPIDO = prácticas puntuales
const NAV_OPERACION: NavItem[] = [
  { label: 'INICIO',    icon: 'radar',               route: '/(tabs)/comando',   match: 'comando'   },
  { label: 'PROGRAMA',  icon: 'view-module',         route: '/(tabs)/programas', match: 'programas' },
  { label: 'MENTOR',    icon: 'chat-bubble-outline', route: '/(tabs)/mentor',    match: 'mentor'    },
  { label: 'PROGRESO',  icon: 'insights',            route: '/(tabs)/progreso',  match: 'progreso'  },
  { label: 'BIENESTAR', icon: 'spa',                 route: '/bienestar',        match: 'bienestar' },
];
const NAV_RAPIDO: NavItem[] = [
  { label: 'CHECK-IN',  icon: 'monitor-heart',       route: '/checkin',          match: 'checkin'   },
  { label: 'MI NORTE',  icon: 'explore',             route: '/(tabs)/norte',     match: 'norte'     },
];

// subscription_tier → etiqueta mostrada en la tarjeta de usuario
const TIER_LABEL: Record<string, string> = {
  free:         'OPERADOR',
  premium:      'SOBERANO · PRO',
  premium_plus: 'SOBERANO · ELITE',
};

export function DesktopSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { state, protocolDay } = useLifeFlow();
  const { mode, setMode, canToggle } = useAppTheme();

  const streak   = Math.max(state.checkIns.length, protocolDay);
  const initial  = (state.profile.name ?? 'U')[0].toUpperCase();
  const tier     = TIER_LABEL[state.subscriptionTier] ?? 'OPERADOR';

  const renderItem = (item: NavItem) => {
    const isActive = !!pathname?.includes(item.match);
    return (
      <TouchableOpacity
        key={item.route}
        onPress={() => router.push(item.route as never)}
        style={[styles.navItem, isActive && styles.navItemActive]}
        accessibilityRole="menuitem"
        accessibilityLabel={item.label}
      >
        {isActive && <View style={styles.activeBar} />}
        <MaterialIcons
          name={item.icon}
          size={20}
          color={isActive ? palette.gold : palette.muted}
        />
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>

      {/* ── Logo oficial — Manual de Marca Polaris (Orgánico Studio 2024) ── */}
      <View style={styles.logoArea}>
        <PolarisLogo variant="star" size={28} color={palette.gold} />
        <View>
          <Text style={styles.logoText}>POLARIS</Text>
          <Text style={styles.logoSub}>GROWTH INSTITUTE</Text>
        </View>
      </View>

      {/* ── Navegación agrupada ── */}
      <View style={styles.navScroll}>
        <Text style={styles.navGroupLabel}>OPERACIÓN</Text>
        <View style={styles.navList}>{NAV_OPERACION.map(renderItem)}</View>

        <Text style={styles.navGroupLabel}>ACCESO RÁPIDO</Text>
        <View style={styles.navList}>{NAV_RAPIDO.map(renderItem)}</View>

        {/* ── Streak card (gradiente oro) — datos reales ── */}
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <MaterialIcons name="local-fire-department" size={20} color={palette.gold} />
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakUnit}>DÍAS</Text>
          </View>
          <Text style={styles.streakMeta}>RACHA · DÍA {protocolDay} DE PROTOCOLO</Text>
        </View>
      </View>

      {/* ── Toggle de tema OSCURO/CLARO (solo web) ── */}
      {canToggle && (
        <View style={styles.themeToggle}>
          {(['dark', 'light'] as ThemeMode[]).map((m) => {
            const on = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.themeBtn, on && styles.themeBtnOn]}
                accessibilityRole="button"
                accessibilityLabel={m === 'dark' ? 'Tema oscuro' : 'Tema claro'}
              >
                <MaterialIcons
                  name={m === 'dark' ? 'dark-mode' : 'light-mode'}
                  size={14}
                  color={on ? '#0A0A0A' : palette.smoke}
                />
                <Text style={[styles.themeBtnText, on && styles.themeBtnTextOn]}>
                  {m === 'dark' ? 'OSCURO' : 'CLARO'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Tarjeta de usuario (abajo) ── */}
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => router.push('/(tabs)/progreso' as never)}
        accessibilityRole="button"
        accessibilityLabel="Ver perfil"
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {state.profile.name ?? 'Operador'}
          </Text>
          <Text style={styles.userTier}>{tier}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: palette.graphite,
    borderRightWidth: 1,
    borderRightColor: palette.lineSoft,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'column',
  },

  // Logo — usa SVG oficial del Manual de Marca
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 20,
    paddingBottom: 22,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineSoft,
  },
  logoText: {
    fontSize: 14,
    color: palette.ivoryWarm,
    fontFamily: Fonts.display,       // GrandisExtended-Bold
    fontWeight: '700',
    letterSpacing: 3,
    lineHeight: 17,
  },
  logoSub: {
    fontSize: 7,
    color: palette.muted,
    fontFamily: Fonts.displayLight,  // GrandisExtended-Light
    letterSpacing: 2.5,
    marginTop: 2,
  },

  // Nav
  navScroll: { flex: 1 },
  navGroupLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9.5,
    letterSpacing: 2,
    color: palette.muted,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 8,
  },
  navList: { gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,200,4,0.07)',
    borderColor: 'rgba(255,200,4,0.18)',
  },
  activeBar: {
    position: 'absolute',
    left: -16,
    top: '50%',
    marginTop: -10,
    width: 3,
    height: 20,
    backgroundColor: palette.gold,
    borderRadius: 999,
  },
  navLabel: {
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 1.5,
    fontFamily: Fonts.displayMedium,  // GrandisExtended-Medium
    fontWeight: '500',
  },
  navLabelActive: { color: palette.gold },

  // Streak card
  streakCard: {
    marginTop: 18,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,200,4,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,4,0.18)',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakNum: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: palette.gold,
  },
  streakUnit: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: palette.ash,
    letterSpacing: 1.5,
    marginLeft: 'auto',
  },
  streakMeta: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: palette.ash,
    letterSpacing: 1,
    marginTop: 8,
  },

  // Theme toggle (OSCURO/CLARO)
  themeToggle: {
    flexDirection: 'row',
    marginTop: 14,
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.graphite,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 30,
    borderRadius: 999,
    paddingVertical: 6,
  },
  themeBtnOn: { backgroundColor: palette.gold },
  themeBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: palette.smoke,
  },
  themeBtnTextOn: { color: '#0A0A0A', fontWeight: '700' },

  // User card
  userCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.charcoal,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gold,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#0A0A0A', fontWeight: '800', fontSize: 15, fontFamily: Fonts.display },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: palette.ivoryWarm, fontSize: 12.5, fontWeight: '600', marginBottom: 2 },
  userTier: {
    color: palette.gold,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
});
