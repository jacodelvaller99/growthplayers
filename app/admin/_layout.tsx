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
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing, typography, radii, Fonts } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { AdminRoleProvider } from '@/hooks/use-admin-role';
import { intel } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavItem {
  route: string;
  label: string;
  icon: IconName;
  group?: 'top' | 'data' | 'bottom';
}

const NAV_ITEMS: NavItem[] = [
  { route: '/admin',               label: 'Escritorio',       icon: 'dashboard',      group: 'top' },
  { route: '/admin/mission-control', label: 'Mission Control', icon: 'insights',      group: 'top' },
  { route: '/admin/usuarios',      label: 'Usuarios',         icon: 'people',         group: 'top' },
  { route: '/admin/ranking',       label: 'Ranking',          icon: 'leaderboard',    group: 'top' },
  { route: '/admin/copilot',       label: 'Copiloto IA',      icon: 'smart-toy',      group: 'top' },
  { route: '/admin/membresias',    label: 'Membresías',       icon: 'credit-card',    group: 'top' },
  { route: '/admin/cursos',        label: 'Cursos',           icon: 'school',         group: 'top' },
  { route: '/admin/codigos',       label: 'Códigos Acceso',   icon: 'vpn-key',        group: 'top' },
  { route: '/admin/inteligencia',  label: 'Inteligencia ML',  icon: 'psychology',     group: 'data' },
  { route: '/admin/memoria',       label: 'Memoria',          icon: 'memory',         group: 'data' },
  { route: '/admin/mentores/ejecucion', label: 'Ejecución',   icon: 'task-alt',       group: 'data' },
  { route: '/admin/biometria',     label: 'Biométricos',      icon: 'monitor-heart',  group: 'data' },
  { route: '/admin/contenido',     label: 'Contenido',        icon: 'article',        group: 'data' },
  { route: '/admin/plaud',         label: 'Plaud',            icon: 'mic',            group: 'data' },
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

// ─── Barra inferior fija (móvil) ──────────────────────────────────────────────
// El admin en móvil no tenía navegación persistente. 4 destinos clave + "Más"
// (abre una hoja con todas las secciones). Bottom nav ≤5 ítems con label+icono.
const BOTTOM_TABS: NavItem[] = [
  { route: '/admin',                  label: 'Inicio',     icon: 'dashboard' },
  { route: '/admin/usuarios',         label: 'Usuarios',   icon: 'people' },
  { route: '/admin/mission-control',  label: 'Control',    icon: 'insights' },
  { route: '/admin/membresias',       label: 'Membresías', icon: 'credit-card' },
];

function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (route: string) =>
    route === '/admin' ? pathname === '/admin' : pathname.startsWith(route);
  const onMainTab = BOTTOM_TABS.some((t) => isActive(t.route));

  return (
    <>
      <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        {BOTTOM_TABS.map((t) => {
          const active = isActive(t.route);
          return (
            <Pressable
              key={t.route}
              style={s.bottomTab}
              onPress={() => router.push(t.route as never)}
              accessibilityRole="button"
              accessibilityLabel={t.label}>
              <MaterialIcons name={t.icon} size={22} color={active ? palette.goldText : palette.smoke} />
              <Text style={[s.bottomTabLabel, active && s.bottomTabLabelActive]} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={s.bottomTab}
          onPress={() => setMoreOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Más secciones">
          <MaterialIcons name="apps" size={22} color={!onMainTab ? palette.goldText : palette.smoke} />
          <Text style={[s.bottomTabLabel, !onMainTab && s.bottomTabLabelActive]}>Más</Text>
        </Pressable>
      </View>

      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setMoreOpen(false)}>
          {/* onPress vacío absorbe el tap dentro de la hoja (no cierra) */}
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>SECCIONES DEL ADMIN</Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.route);
                return (
                  <Pressable
                    key={item.route}
                    style={[s.sheetRow, active && s.sheetRowActive]}
                    onPress={() => { setMoreOpen(false); router.push(item.route as never); }}>
                    <MaterialIcons name={item.icon} size={20} color={active ? palette.goldText : palette.ash} />
                    <Text style={[s.sheetRowLabel, active && s.bottomTabLabelActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={s.sheetRow}
                onPress={() => { setMoreOpen(false); router.replace('/(tabs)/comando' as never); }}>
                <MaterialIcons name="arrow-back" size={20} color={palette.smoke} />
                <Text style={[s.sheetRowLabel, { color: palette.smoke }]}>Volver a la App</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Estado honesto del portero: nunca una pantalla en negro sin explicacion. */
function AdminGateState({
  texto, detalle, accion,
}: {
  texto: string;
  detalle?: string;
  accion?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.gate}>
      <Text style={s.gateText}>{texto}</Text>
      {detalle ? <Text style={s.gateDetalle}>{detalle}</Text> : null}
      {accion ? (
        <Pressable
          onPress={accion.onPress}
          accessibilityRole="button"
          accessibilityLabel={accion.label}
          style={s.gateBtn}
        >
          <Text style={s.gateBtnText}>{accion.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Chrome liviano del mentor restringido — sin sidebar ni bottom nav de 16
 * secciones: el mentor solo tiene 2 destinos reales (su Escritorio y el
 * Espacio de cada cliente), ninguno necesita un menú. */
function MentorChrome({ topInset }: { topInset: number }) {
  const router = useRouter();
  return (
    <View style={[s.mentorBar, { paddingTop: topInset + spacing.sm }]}>
      <MaterialIcons name="dashboard-customize" size={18} color={palette.goldText} />
      <Text style={s.mentorBarTitle}>ESCRITORIO DEL MENTOR</Text>
      <Pressable
        onPress={() => router.replace('/(tabs)/comando' as never)}
        style={s.mentorBarExit}
        accessibilityRole="button"
        accessibilityLabel="Salir, volver a la app">
        <Text style={s.mentorBarExitText}>SALIR</Text>
      </Pressable>
    </View>
  );
}

type GateState = 'loading' | 'denied' | 'admin' | 'mentor';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { userId, isLoaded } = useLifeFlow();
  const [gate, setGate] = useState<GateState>('loading');
  // "Verificando" eterno es un callejon sin salida con mejor letra. Si a los
  // 12s no se resolvio -- token caducado, red caida, RLS mal aplicada -- hay
  // que DECIRLO y dar salida, no dejar a alguien mirando la misma linea.
  const [tardando, setTardando] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isDesktop } = useBreakpoint();
  const isWeb = Platform.OS === 'web';
  // Sidebar solo en web ancho; móvil (nativo o web angosto) usa barra inferior.
  // En web lee el ancho real (sincrónico) para evitar el flash del default 375 del hook.
  const showSidebar = isWeb && (typeof window !== 'undefined' ? window.innerWidth >= 1200 : isDesktop);

  useEffect(() => {
    let cancelled = false;
    // profiles.id = auth.uid() (standard Supabase pattern).
    // Robusto: maybeSingle (no lanza si 0 filas). Ante error NO expulsamos al
    // admin (era la causa de "a veces entro, a veces no" en un hiccup de red):
    // reintentamos una vez y, si sigue fallando, quedamos en loading (null →
    // no renderiza, pero tampoco rebota). El acceso SOLO se concede con
    // is_admin/is_mentor === true confirmado — sin regresión de seguridad (RLS manda).
    const check = async (attempt = 0): Promise<void> => {
      // "La sesion todavia no cargo" NO es "no eres admin".
      //
      // Sin esta distincion, entrar directo a cualquier URL de admin -- un
      // marcador, un enlace compartido, recargar la pagina -- rebotaba a
      // Comando: en carga fria `userId` aun no existe, el guard lo leia como
      // denegacion y hacia `router.replace`. Medido: /admin/membresias pintaba
      // una pantalla en negro con los nodos de Comando a altura cero.
      //
      // `isLoaded` es la senal que ya usa el guard de (tabs); aqui faltaba.
      if (!isLoaded) return;
      if (!userId) { if (!cancelled) setGate('denied'); return; }
      const { data, error } = await intel.profiles()
        .select('is_admin, is_mentor')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        logSilentError('admin._layout.role', error);
        if (attempt < 1) setTimeout(() => { if (!cancelled) check(attempt + 1); }, 1200);
        return; // mantener loading; nunca conceder acceso ante error
      }
      const row = data as { is_admin?: boolean; is_mentor?: boolean } | null;
      if (row?.is_admin === true) { setGate('admin'); return; }
      if (row?.is_mentor === true) { setGate('mentor'); return; }
      setGate('denied');
      router.replace('/(tabs)/comando' as never);
    };
    check();
    const reloj = setTimeout(() => { if (!cancelled) setTardando(true); }, 12000);
    return () => { cancelled = true; clearTimeout(reloj); };
  }, [userId, isLoaded, router]);

  // Un mentor restringido solo puede estar en su Escritorio o en el Espacio de
  // un cliente — cualquier otra ruta admin lo rebota de vuelta a /admin, no
  // fuera del todo. Efecto SEPARADO del de arriba: debe reaccionar a cada
  // cambio de `pathname`, no solo correr una vez al montar el layout (Expo
  // Router mantiene este _layout montado entre navegaciones hermanas bajo
  // /admin/*, solo cambia lo que pinta <Slot/>).
  useEffect(() => {
    if (gate !== 'mentor') return;
    const allowed = pathname === '/admin' || pathname.startsWith('/admin/mentor/');
    if (!allowed) router.replace('/admin' as never);
  }, [gate, pathname, router]);

  // Ni una ni otra puede ser una pantalla en negro.
  //
  // Eran dos `return null` mudos. Ante un fallo de red el codigo mantiene
  // `null` a proposito -- correcto, el acceso solo se concede con
  // is_admin === true confirmado -- pero eso dejaba al mentor mirando un
  // rectangulo negro sin saber si carga, si esta roto o si le denegaron.
  // La postura de seguridad no cambia; lo que cambia es que ahora se dice.
  if (gate === 'loading') {
    return tardando
      ? (
        <AdminGateState
          texto="NO PUDIMOS VERIFICAR TU ACCESO"
          detalle="Puede ser tu conexion o una sesion caducada. Vuelve a entrar."
          accion={{ label: 'IR A COMANDO', onPress: () => router.replace('/(tabs)/comando' as never) }}
        />
      )
      : <AdminGateState texto="VERIFICANDO ACCESO" />;
  }
  if (gate === 'denied') return <AdminGateState texto="SIN ACCESO · VOLVIENDO A COMANDO" />;

  if (gate === 'mentor') {
    return (
      <AdminRoleProvider role="mentor">
        <View style={s.mobileRoot}>
          <MentorChrome topInset={insets.top} />
          <View style={s.mobileContent}>
            <Slot />
          </View>
        </View>
      </AdminRoleProvider>
    );
  }

  if (showSidebar) {
    return (
      <AdminRoleProvider role="admin">
        <View style={s.webRoot}>
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
          <View style={s.webContent}>
            <Slot />
          </View>
        </View>
      </AdminRoleProvider>
    );
  }

  // Móvil (nativo o web angosto): contenido + barra inferior persistente.
  return (
    <AdminRoleProvider role="admin">
      <View style={s.mobileRoot}>
        <View style={s.mobileContent}>
          <Slot />
        </View>
        <AdminBottomNav />
      </View>
    </AdminRoleProvider>
  );
}

const SIDEBAR_W = 220;
const SIDEBAR_W_COLLAPSED = 56;

const s = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: palette.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  gateDetalle: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  gateBtn: {
    marginTop: spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.lineGold,
  },
  gateBtnText: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1.6 },
  gateText: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'center',
  },
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

  // ── Móvil: contenido + barra inferior ──
  mobileRoot: { flex: 1, backgroundColor: palette.black },
  mobileContent: { flex: 1, overflow: 'hidden' as const },

  // ── Chrome del mentor restringido ──
  mentorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: palette.graphite,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  mentorBarTitle: { ...typography.label, color: palette.ivory, fontSize: 11, flex: 1 },
  mentorBarExit: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
  mentorBarExitText: { ...typography.label, color: palette.smoke, fontSize: 10 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: palette.graphite,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: spacing.xs,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    paddingVertical: 4,
  },
  bottomTabLabel: { fontFamily: Fonts.sans, fontSize: 9.5, color: palette.smoke, letterSpacing: 0.2 },
  bottomTabLabelActive: { color: palette.goldText },

  // ── Hoja "Más" ──
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: palette.graphite,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.line, marginBottom: spacing.md },
  sheetTitle: { ...typography.section, color: palette.ivory, fontSize: 11, marginBottom: spacing.sm },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    minHeight: 48,
  },
  sheetRowActive: { backgroundColor: palette.goldLight },
  sheetRowLabel: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash },
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
