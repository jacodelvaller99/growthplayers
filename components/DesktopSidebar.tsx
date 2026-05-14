import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { palette } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const NAV_ITEMS: { label: string; icon: IconName; route: string; match: string }[] = [
  { label: 'INICIO',     icon: 'home',                route: '/(tabs)/comando',   match: 'comando'   },
  { label: 'PROGRAMA',   icon: 'menu-book',            route: '/(tabs)/programas', match: 'programas' },
  { label: 'MENTOR',     icon: 'chat-bubble-outline',  route: '/(tabs)/mentor',    match: 'mentor'    },
  { label: 'BIENESTAR',  icon: 'spa',                  route: '/bienestar',        match: 'bienestar' },
  { label: 'NORTE',      icon: 'explore',              route: '/(tabs)/norte',     match: 'norte'     },
  { label: 'PERFIL',     icon: 'person-outline',       route: '/(tabs)/progreso',  match: 'progreso'  },
];

export function DesktopSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { state, protocolDay } = useLifeFlow();

  return (
    <View style={styles.sidebar}>

      {/* Logo */}
      <View style={styles.logoArea}>
        <View style={styles.logoMark}>
          <View style={styles.markNorth} />
          <View style={styles.markCross} />
        </View>
        <Text style={styles.logoText}>POLARIS</Text>
        <Text style={styles.logoSub}>GROWTH INSTITUTE</Text>
      </View>

      {/* Perfil */}
      <View style={styles.profileArea}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(state.profile.name ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {state.profile.name ?? 'Usuario'}
          </Text>
          <Text style={styles.profileDay}>DÍA {protocolDay} · PROTOCOLO</Text>
        </View>
      </View>

      {/* Navegación */}
      <View style={styles.navList}>
        {NAV_ITEMS.map(item => {
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
                size={18}
                color={isActive ? palette.gold : '#444'}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Método Polaris</Text>
        <Text style={styles.footerSub}>Norman Capuozzo</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: '#0D0D0D',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logoMark: {
    width: 32,
    height: 32,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markNorth: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 18,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.gold,
  },
  markCross: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: 14,
    backgroundColor: 'rgba(237,186,1,0.35)',
  },
  logoText: {
    fontSize: 15,
    color: '#F4F0E8',
    fontWeight: '800',
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 8,
    color: '#444',
    letterSpacing: 2,
    marginTop: 2,
  },

  // Perfil
  profileArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.gold,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText:   { color: '#0A0A0A', fontWeight: '800', fontSize: 15 },
  profileInfo:  { flex: 1, gap: 2 },
  profileName:  { color: '#F4F0E8', fontSize: 12, fontWeight: '600' },
  profileDay:   { color: '#444', fontSize: 9, letterSpacing: 1 },

  // Nav
  navList: { flex: 1, gap: 2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
  },
  navItemActive:  { backgroundColor: 'rgba(237,186,1,0.08)' },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 2,
    backgroundColor: palette.gold,
    borderRadius: 1,
  },
  navLabel: {
    fontSize: 10,
    color: '#444',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  navLabelActive: { color: '#F4F0E8' },

  // Footer
  footer:     { alignItems: 'center', gap: 3 },
  footerText: { color: '#2A2A2A', fontSize: 10, letterSpacing: 1 },
  footerSub:  { color: '#222', fontSize: 8, letterSpacing: 1 },
});
