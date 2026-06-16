/**
 * Admin CMI Layout
 *
 * Wraps all /admin/* screens with:
 * - is_admin guard (redirects non-admins to /(tabs)/comando)
 * - Persistent sidebar navigation (web) / bottom nav (mobile)
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing, typography, radii, Fonts } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { intel } from '@/lib/supabase';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavItem {
  route: string;
  label: string;
  icon: IconName;
  group?: 'top' | 'data' | 'bottom';
}

const NAV_ITEMS: NavItem[] = [
  { route: '/admin',               label: 'Mission Control',  icon: 'dashboard',      group: 'top' },
  { route: '/admin/usuarios',      label: 'Usuarios',         icon: 'people',         group: 'top' },
  { route: '/admin/membresias',    label: 'Membresías',       icon: 'credit-card',    group: 'top' },
  { route: '/admin/cursos',        label: 'Cursos',           icon: 'school',         group: 'top' },
  { route: '/admin/codigos',       label: 'Códigos Acceso',   icon: 'vpn-key',        group: 'top' },
  { route: '/admin/inteligencia',  label: 'Inteligencia ML',  icon: 'psychology',     group: 'data' },
  { route: '/admin/memoria',       label: 'Memoria',          icon: 'memory',         group: 'data' },
  { route: '/admin/mentores/ejecucion', label: 'Ejecución',   icon: 'task-alt',       group: 'data' },
  { route: '/admin/biometria',     label: 'Biométricos',      icon: 'monitor-heart',  group: 'data' },
  { route: '/admin/contenido',     label: 'Contenido',        icon: 'article',        group: 'data' },
  { route: '/admin/comunidad',     label: 'Moderación',       icon: 'flag',           group: 'data' },
  { route: '/admin/auditoria',     label: 'Auditoría',        icon: 'history',        group: 'data' },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === '/admin') return pathname === '/admin';
    return pathname.startsWith(route);
  };

  const groups: Array<{ key: string; items: NavItem[] }> = [
    { key: 'top',    items: NAV_ITEMS.filter(i => i.group === 'top') },
    { key: 'data',   items: NAV_ITEMS.filter(i => i.group === 'data') },
  ];

  return (
    <View style={[
      s.sidebar,
      collapsed ? s.sidebarCollapsed : s.sidebarExpanded,
      { paddingTop: insets.top + spacing.md },
    ]}>
      {/* Logo / toggle */}
      <Pressable style={s.sidebarLogo} onPress={onToggle}>
        <MaterialIcons name="dashboard-customize" size={20} color={palette.goldText} />
        {!collapsed && <Text style={s.sidebarTitle}>CMI POLARIS</Text>}
      </Pressable>

      <View style={s.sidebarDivider} />

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {groups.map(group => (
          <View key={group.key}>
            {group.items.map(item => {
              const active = isActive(item.route);
              return (
                <Pressable
                  key={item.route}
                  style={[s.navItem, active && s.navItemActive]}
                  onPress={() => router.push(item.route as never)}>
                  <MaterialIcons
                    name={item.icon}
                    size={18}
                    color={active ? palette.goldText : palette.ash}
                  />
                  {!collapsed && (
                    <Text style={[s.navLabel, active && s.navLabelActive]}>
                      {item.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            <View style={s.sidebarDivider} />
          </View>
        ))}
      </ScrollView>

      {/* Back to app */}
      <Pressable
        style={s.navItem}
        onPress={() => router.replace('/(tabs)/comando' as never)}>
        <MaterialIcons name="arrow-back" size={18} color={palette.smoke} />
        {!collapsed && <Text style={s.navLabelMuted}>Volver a la App</Text>}
      </Pressable>
    </View>
  );
}

export default function AdminLayout() {
  const router = useRouter();
  const { userId } = useLifeFlow();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    const check = async () => {
      if (!userId) { setIsAdmin(false); return; }
      // profiles.id = auth.uid() (standard Supabase pattern)
      const { data, error } = await intel.profiles()
        .select('is_admin')
        .eq('id', userId)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = !error && (data as any)?.is_admin === true;
      setIsAdmin(admin);
      if (!admin) router.replace('/(tabs)/comando' as never);
    };
    check();
  }, [userId, router]);

  if (isAdmin === null) return null; // loading — no flash
  if (isAdmin === false) return null; // redirecting

  if (isWeb) {
    return (
      <View style={s.webRoot}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
        <View style={s.webContent}>
          <Slot />
        </View>
      </View>
    );
  }

  // Mobile: just render screens without sidebar (nav links are in-screen)
  return <Slot />;
}

const SIDEBAR_W = 220;
const SIDEBAR_W_COLLAPSED = 56;

const s = StyleSheet.create({
  webRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: palette.black,
  },
  sidebar: {
    backgroundColor: palette.graphite,
    borderRightWidth: 1,
    borderRightColor: palette.line,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sidebarExpanded: { width: SIDEBAR_W },
  sidebarCollapsed: { width: SIDEBAR_W_COLLAPSED },
  webContent: {
    flex: 1,
    overflow: 'hidden' as const,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  sidebarTitle: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 10,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: palette.line,
    marginVertical: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    marginVertical: 1,
  },
  navItemActive: {
    backgroundColor: palette.goldLight,
  },
  navLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: palette.ash,
  },
  navLabelActive: {
    color: palette.goldText,
  },
  navLabelMuted: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: palette.smoke,
  },
});
