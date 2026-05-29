import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette, Fonts } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { PolarisLogo } from '@/components/PolarisLogo';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const NAV_ITEMS: { label: string; icon: IconName; route: string; match: string }[] = [
  { label: 'INICIO',    icon: 'home',               route: '/(tabs)/comando',   match: 'comando'   },
  { label: 'PROGRAMA',  icon: 'menu-book',           route: '/(tabs)/programas', match: 'programas' },
  { label: 'MENTOR',    icon: 'chat-bubble-outline', route: '/(tabs)/mentor',    match: 'mentor'    },
  { label: 'BIENESTAR', icon: 'spa',                 route: '/bienestar',        match: 'bienestar' },
  { label: 'NORTE',     icon: 'explore',             route: '/(tabs)/norte',     match: 'norte'     },
  { label: 'PERFIL',    icon: 'person-outline',      route: '/(tabs)/progreso',  match: 'progreso'  },
];

export function DesktopSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { state, protocolDay } = useLifeFlow();

  const progress = Math.min(Math.round((protocolDay / 90) * 100), 100);
  const initial  = (state.profile.name ?? 'U')[0].toUpperCase();

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

      {/* ── Perfil + progreso ── */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {state.profile.name ?? 'Usuario'}
            </Text>
            <Text style={styles.profileDay}>DÍA {protocolDay} DE 90</Text>
          </View>
        </View>
        {/* Protocol progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as unknown as number }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressPct}>{progress}% completado</Text>
          <Text style={styles.progressDays}>{90 - protocolDay}d restantes</Text>
        </View>
      </View>

      {/* ── Navegación ── */}
      <View style={styles.navList}>
        {NAV_ITEMS.map(item => {
          const isActive = !!pathname?.includes(item.match);
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as never)}
              style={[styles.navItem, isActive && styles.navItemActive]}
              accessibilityRole="menuitem"
            >
              {isActive && <View style={styles.activeBar} />}
              <MaterialIcons
                name={item.icon}
                size={18}
                color={isActive ? palette.gold : '#3A3A3A'}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerName}>Norman Capuozzo</Text>
        <Text style={styles.footerTagline}>Método Polaris · Protocolo Soberano</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'column',
  },

  // Logo — usa SVG oficial del Manual de Marca
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logoText: {
    fontSize: 14,
    color: '#F4F0E8',
    fontFamily: Fonts.display,       // GrandisExtended-Bold
    fontWeight: '700',
    letterSpacing: 3.5,
    lineHeight: 17,
  },
  logoSub: {
    fontSize: 7,
    color: '#444444',
    fontFamily: Fonts.displayLight,  // GrandisExtended-Light
    letterSpacing: 2.5,
    marginTop: 2,
  },

  // Profile card
  profileCard: {
    backgroundColor: '#111111',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.gold,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText:  { color: '#0A0A0A', fontWeight: '800', fontSize: 15 },
  profileInfo: { flex: 1 },
  profileName: { color: '#F4F0E8', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  profileDay:  { color: '#3A3A3A', fontSize: 9, letterSpacing: 1 },

  // Progress
  progressTrack: {
    height: 3,
    backgroundColor: '#1E1E1E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.gold,
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressPct:  { color: palette.gold, fontSize: 9, letterSpacing: 0.5 },
  progressDays: { color: '#3A3A3A', fontSize: 9 },

  // Nav
  navList: { flex: 1, gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
  },
  navItemActive:  { backgroundColor: 'rgba(237,186,1,0.07)' },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 2,
    backgroundColor: palette.gold,
    borderRadius: 1,
  },
  navLabel: {
    fontSize: 10,
    color: '#3A3A3A',
    letterSpacing: 1.8,
    fontFamily: Fonts.displayMedium,  // GrandisExtended-Medium
    fontWeight: '500',
  },
  navLabelActive: { color: '#F4F0E8' },

  // Footer
  footer:        { gap: 5 },
  footerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 14 },
  footerName:    { color: '#2A2A2A', fontSize: 10, letterSpacing: 0.5, fontFamily: Fonts.displayMedium, fontWeight: '500' },
  footerTagline: { color: '#1A1A1A', fontSize: 8, letterSpacing: 1.2, fontFamily: Fonts.displayLight },
});
