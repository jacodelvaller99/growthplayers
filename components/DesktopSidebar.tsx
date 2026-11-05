import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, Fonts } from '@/constants/theme';
import { HoverCard } from '@/components/polaris';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useAppTheme, type ThemeMode } from '@/hooks/use-app-theme';
import { PolarisLogo } from '@/components/PolarisLogo';
import { ModeSwitch } from '@/components/ModeSwitch';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavItem {
  label: string;
  icon: IconName;
  route: string;
  match: string;
}

// ─── Navegación: las MISMAS 4 pestañas del teléfono (Hoy · Norman · Progreso ·
// Yo) + Check-in, sin rótulos de grupo. Antes eran 9 destinos en 4 "dominios"
// (COMANDO, PROTOCOLO…): jerga, y una arquitectura distinta según el tamaño de
// la ventana. Norte, Programa, Mentoría y Bienestar se abren desde Hoy y Yo;
// cuando estás en una de ellas se marca YO.
const NAV_ITEMS: (NavItem & { also?: string[] })[] = [
  { label: 'HOY',      icon: 'radar',               route: '/(tabs)/comando',  match: 'comando'  },
  { label: 'CHECK-IN', icon: 'monitor-heart',       route: '/checkin',         match: 'checkin'  },
  { label: 'NORMAN',   icon: 'chat-bubble-outline', route: '/(tabs)/mentor',   match: 'mentor'   },
  { label: 'PROGRESO', icon: 'insights',            route: '/(tabs)/progreso', match: 'progreso' },
  { label: 'YO',       icon: 'person-outline',      route: '/(tabs)/yo',       match: 'yo',
    also: ['norte', 'programas', 'mentoria', 'bienestar', 'perfil', 'module', 'lesson'] },
];

// subscription_tier → etiqueta mostrada en la tarjeta de usuario
const TIER_LABEL: Record<string, string> = {
  free:         'Plan gratis',
  premium:      'Plan Pro',
  premium_plus: 'Plan Elite',
};

export function DesktopSidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { state } = useLifeFlow();
  const { mode, setMode, canToggle } = useAppTheme();

  // `?? 'U'` no atrapa `''` (perfil sin nombre aún, string vacío no es nullish):
  // `''[0]` da `undefined` y `.toUpperCase()` revienta el sidebar entero antes
  // de montar nada. Mismo patrón defensivo que ya usa `Avatar.tsx`.
  const initial  = (state.profile.name?.trim()?.charAt(0) || 'U').toUpperCase();
  const tier     = TIER_LABEL[state.subscriptionTier] ?? TIER_LABEL.free;

  // Match by path segment (not substring) so '/mentoria' no activa 'mentor'.
  const segments = (pathname ?? '').split('/').filter(Boolean);
  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = [item.match, ...(item.also ?? [])].some((m) => segments.includes(m));
    return (
      <HoverCard
        key={item.route}
        onPress={() => router.push(item.route as never)}
        style={[styles.navItem, isActive && styles.navItemActive]}
        hoverStyle={styles.navItemHover}
        accessibilityRole="menuitem"
        accessibilityLabel={item.label}
      >
        {isActive && <View style={styles.activeBar} />}
        <MaterialIcons
          name={item.icon}
          size={20}
          color={isActive ? palette.goldText : palette.ash}
        />
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {item.label}
        </Text>
      </HoverCard>
    );
  };

  return (
    <View style={styles.sidebar}>
      {/* Fondo sólido del tema. Aquí había un BlurView de expo-blur: en web
          pinta un rgba FIJO por `tint` (no variable CSS) entre el fondo y las
          etiquetas → velo gris oscuro en tema claro. */}
      {/* ── Logo oficial — Manual de Marca Polaris (Orgánico Studio 2024) ── */}
      <View style={styles.logoArea}>
        <PolarisLogo variant="star" size={28} color={mode === 'light' ? palette.starOnLight : palette.gold} />
        <View>
          <Text style={styles.logoText}>POLARIS</Text>
          <Text style={styles.logoSub}>GROWTH INSTITUTE</Text>
        </View>
      </View>
      <ModeSwitch current="client" style={styles.modeSwitch} />

      {/* ── Navegación agrupada + tema + usuario — TODO scrollable: si el
          contenido no cabe en la altura del viewport (ventanas bajas,
          zoom, muchos dominios), antes quedaba recortado sin forma de
          llegar a la tarjeta de usuario. Ahora siempre es alcanzable. ── */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.navList}>{NAV_ITEMS.map(renderItem)}</View>

        <View>
          {/* ── Toggle de tema OSCURO/CLARO (solo web) ── */}
          {canToggle && (
            <View style={styles.themeToggle}>
              {(['tinta', 'light'] as ThemeMode[]).map((m) => {
                const on = m === 'light' ? mode === 'light' : mode !== 'light';
                return (
                  <HoverCard
                    key={m}
                    onPress={() => setMode(m)}
                    style={[styles.themeBtn, on && styles.themeBtnOn]}
                    hoverStyle={on ? styles.themeBtnOn : styles.navItemHover}
                    accessibilityRole="button"
                    accessibilityLabel={m === 'light' ? 'Tema claro' : 'Tema oscuro'}
                  >
                    <MaterialIcons
                      name={m === 'light' ? 'light-mode' : 'dark-mode'}
                      size={14}
                      color={on ? palette.ivory : palette.smoke}
                    />
                    <Text style={[styles.themeBtnText, on && styles.themeBtnTextOn]}>
                      {m === 'light' ? 'CLARO' : 'OSCURO'}
                    </Text>
                  </HoverCard>
                );
              })}
            </View>
          )}

          {/* ── Tarjeta de usuario (abajo) ── */}
          <HoverCard
            style={styles.userCard}
            onPress={() => router.push('/(tabs)/yo' as never)}
            accessibilityRole="button"
            accessibilityLabel="Ver tu cuenta"
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {state.profile.name || 'Tu cuenta'}
              </Text>
              <Text style={styles.userTier}>{tier}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
          </HoverCard>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%',
    backgroundColor: palette.graphite,
    borderRightWidth: 1,
    borderRightColor: palette.lineSoft,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'column',
    overflow: 'hidden',
  },

  modeSwitch: { marginTop: -6, marginBottom: 16 },

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
    fontSize: 11,
    color: palette.muted,
    fontFamily: Fonts.displayLight,  // GrandisExtended-Light
    letterSpacing: 2.5,
    marginTop: 2,
  },

  // Nav — ScrollView: mantiene tema+usuario alcanzables aunque el contenido
  // (dominios + racha) no quepa en la altura disponible.
  navScroll: { flex: 1 },
  navScrollContent: { flexGrow: 1, justifyContent: 'space-between', paddingTop: 8 },
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
    backgroundColor: palette.charcoal,
  },
  // Hover suave para nav/toggles (sin lift — es navegación, no una card)
  navItemHover: {
    backgroundColor: palette.charcoal,
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
    fontSize: 12,
    color: palette.ash,
    letterSpacing: 1.5,
    fontFamily: Fonts.displayMedium,  // GrandisExtended-Medium
    fontWeight: '500',
  },
  navLabelActive: { color: palette.goldText },


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
    // 44 y no 30: es el único control de la barra lateral que bajaba del mínimo
    // táctil. En escritorio se pulsa con ratón, pero la PWA se instala también
    // en tablet, donde 30px es un objetivo que se falla.
    minHeight: 44,
    borderRadius: 999,
    paddingVertical: 6,
  },
  themeBtnOn: { backgroundColor: palette.charcoal },

  themeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    color: palette.smoke,
  },
  themeBtnTextOn: { color: palette.ivory, fontWeight: '700' },

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
    backgroundColor: palette.charcoal,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: palette.ivory, fontWeight: '800', fontSize: 15, fontFamily: Fonts.display },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: palette.ivoryWarm, fontSize: 12.5, fontWeight: '600', marginBottom: 2 },
  userTier: {
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: Fonts.display,
  },
});
