/**
 * Admin CMI Layout
 *
 * Wraps all /admin/* screens with:
 * - is_admin guard (redirects non-admins to /(tabs)/comando)
 * - Persistent sidebar navigation (web) / bottom nav (mobile)
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
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
import { alpha } from '@/constants/themeColors';
import { PressableScale } from '@/components/polaris';
import { ModeSwitch } from '@/components/ModeSwitch';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { AdminRoleProvider } from '@/hooks/use-admin-role';
import { intel } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavItem {
  route: string;
  label: string;
  icon: IconName;
  group?: NavGroupKey;
}

// Tres grupos por lo que la persona VIENE A HACER, no por cómo está construido:
// atender clientes (todos los días), administrar el negocio (de vez en cuando),
// leer datos (cuando hay una pregunta). Antes eran 16 entradas en dos listas
// sin nombre, con "Mission Control" y "Membresías" mezclados en la primera.
type NavGroupKey = 'work' | 'business' | 'data';
const NAV_GROUP_LABEL: Record<NavGroupKey, string> = {
  work: 'CLIENTES',
  business: 'NEGOCIO',
  data: 'DATOS',
};

const NAV_ITEMS: NavItem[] = [
  { route: '/admin',               label: 'Hoy',              icon: 'today',          group: 'work' },
  { route: '/admin/usuarios',      label: 'Clientes',         icon: 'people',         group: 'work' },
  { route: '/admin/copilot',       label: 'Copiloto IA',      icon: 'smart-toy',      group: 'work' },
  { route: '/admin/plaud',         label: 'Grabaciones Plaud', icon: 'mic',           group: 'work' },
  { route: '/admin/membresias',    label: 'Membresías',       icon: 'credit-card',    group: 'business' },
  { route: '/admin/codigos',       label: 'Códigos de acceso', icon: 'vpn-key',       group: 'business' },
  { route: '/admin/cursos',        label: 'Cursos',           icon: 'school',         group: 'business' },
  { route: '/admin/contenido',     label: 'Contenido',        icon: 'article',        group: 'business' },
  { route: '/admin/comunidad',     label: 'Moderación',       icon: 'flag',           group: 'business' },
  { route: '/admin/mission-control', label: 'Retención',      icon: 'insights',       group: 'data' },
  { route: '/admin/mentores/ejecucion', label: 'Ejecución',   icon: 'task-alt',       group: 'data' },
  { route: '/admin/biometria',     label: 'Biométricos',      icon: 'monitor-heart',  group: 'data' },
  { route: '/admin/memoria',       label: 'Memoria',          icon: 'memory',         group: 'data' },
  { route: '/admin/inteligencia',  label: 'Inteligencia ML',  icon: 'psychology',     group: 'data' },
  { route: '/admin/ranking',       label: 'Ranking',          icon: 'leaderboard',    group: 'data' },
  { route: '/admin/auditoria',     label: 'Auditoría',        icon: 'history',        group: 'data' },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useAppTheme();

  const isActive = (route: string) => {
    if (route === '/admin') return pathname === '/admin';
    return pathname.startsWith(route);
  };

  const groups = (Object.keys(NAV_GROUP_LABEL) as NavGroupKey[]).map((key) => ({
    key,
    items: NAV_ITEMS.filter((i) => i.group === key),
  }));

  return (
    <View style={[
      s.sidebar,
      collapsed ? s.sidebarCollapsed : s.sidebarExpanded,
      { paddingTop: insets.top + spacing.md },
    ]}>
      {/* Chrome estructural, no un botón — blur pesado igual que el sidebar
          de la app cliente (audit "Fluidez Polaris" §Fase 5, commit 41e060d).
          El admin no heredaba nada de eso; ahora reusa el mismo patrón. */}
      <BlurView intensity={100} tint={mode === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />

      {/* Logo / toggle */}
      <Pressable
        style={s.sidebarLogo}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expandir menú' : 'Contraer menú'}>
        <MaterialIcons name="dashboard-customize" size={20} color={palette.goldText} />
        {!collapsed && <Text style={s.sidebarTitle}>POLARIS · PANEL</Text>}
      </Pressable>
      {!collapsed && <View style={s.sidebarSwitch}><ModeSwitch current="staff" /></View>}

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {groups.map(group => (
          <View key={group.key} style={s.navGroup}>
            {!collapsed && <Text style={s.navGroupLabel}>{NAV_GROUP_LABEL[group.key]}</Text>}
            {group.items.map(item => {
              const active = isActive(item.route);
              return (
                <PressableScale
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
                </PressableScale>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Personalizar — mismo atajo que ya tiene DesktopSidebar del cliente
          (commit 985c859). El operador ajusta fondo/señal sin salir del
          panel; aplica en vivo porque el eje de tema es global
          (<html data-theme/data-signal>), no hace falta recargar. */}
      <PressableScale
        style={s.navItem}
        onPress={() => router.push('/perfil/apariencia' as never)}
        accessibilityRole="button"
        accessibilityLabel="Personalizar la app — modo, fondo y color">
        <MaterialIcons name="tune" size={18} color={palette.goldText} />
        {!collapsed && <Text style={s.navLabel}>Personalizar</Text>}
      </PressableScale>
      {/* "Volver a la App" se fue: el interruptor CLIENTE | ADMIN de arriba
          hace eso mismo y es el mismo control que hay del lado del cliente. */}
    </View>
  );
}

// ─── Barra inferior fija (móvil) ──────────────────────────────────────────────
// El admin en móvil no tenía navegación persistente. 4 destinos clave + "Más"
// (abre una hoja con todas las secciones). Bottom nav ≤5 ítems con label+icono.
const BOTTOM_TABS: NavItem[] = [
  { route: '/admin',                  label: 'Hoy',        icon: 'today' },
  { route: '/admin/usuarios',         label: 'Clientes',   icon: 'people' },
  { route: '/admin/membresias',       label: 'Membresías', icon: 'credit-card' },
  { route: '/admin/mission-control',  label: 'Retención',  icon: 'insights' },
];

function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);
  const { mode } = useAppTheme();

  const isActive = (route: string) =>
    route === '/admin' ? pathname === '/admin' : pathname.startsWith(route);
  const onMainTab = BOTTOM_TABS.some((t) => isActive(t.route));

  return (
    <>
      <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        <BlurView intensity={80} tint={mode === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
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

/** Barra superior liviana: el mentor restringido (sin sidebar — solo tiene
 * 2 destinos reales, Hoy y el Espacio de cada cliente) y el admin en el
 * teléfono. Lleva el mismo interruptor CLIENTE | MENTOR que la app cliente. */
function StaffTopBar({ topInset, simple = false }: { topInset: number; simple?: boolean }) {
  const { mode } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const onClients = pathname === '/admin/clientes';
  return (
    <View style={[s.mentorBar, { paddingTop: topInset + spacing.sm }]}>
      <BlurView intensity={80} tint={mode === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      {simple ? (
        // Vista simple: solo dos destinos, Mentorías y Clientes. Nada más.
        <View style={s.simpleNav}>
          {([['/admin', 'Mentorías', !onClients], ['/admin/clientes', 'Clientes', onClients]] as const).map(([route, label, on]) => (
            <Pressable
              key={route}
              onPress={() => router.replace(route as never)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={s.simpleTab}>
              <Text style={[s.simpleTabText, on && s.simpleTabTextOn]}>{label}</Text>
              {on && <View style={s.simpleTabRule} />}
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <MaterialIcons name="dashboard-customize" size={18} color={palette.goldText} />
          <Text style={s.mentorBarTitle}>POLARIS · PANEL</Text>
        </>
      )}
      <ModeSwitch current="staff" />
    </View>
  );
}

// 'admin' = panel completo (profiles.full_admin_panel); 'simple' = admin sin
// el flag, trabaja como mentor (vista de mentorías) con permisos de admin.
type GateState = 'loading' | 'denied' | 'admin' | 'simple' | 'mentor';

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
        .select('is_admin, is_mentor, full_admin_panel')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        logSilentError('admin._layout.role', error);
        if (attempt < 1) setTimeout(() => { if (!cancelled) check(attempt + 1); }, 1200);
        return; // mantener loading; nunca conceder acceso ante error
      }
      const row = data as { is_admin?: boolean; is_mentor?: boolean; full_admin_panel?: boolean } | null;
      if (row?.is_admin === true) { setGate(row.full_admin_panel === true ? 'admin' : 'simple'); return; }
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
    if (gate !== 'mentor' && gate !== 'simple') return;
    // Vista simple (mentores y admins sin panel completo): Mentorías y Clientes.
    const allowed = pathname === '/admin' || pathname === '/admin/clientes' || pathname.startsWith('/admin/mentor/');
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

  if (gate === 'mentor' || gate === 'simple') {
    return (
      <AdminRoleProvider role={gate === 'simple' ? 'admin' : 'mentor'}>
        <View style={s.mobileRoot}>
          <StaffTopBar topInset={insets.top} simple />
          <View style={s.mobileContent}>
            <Slot />
          </View>
        </View>
      </AdminRoleProvider>
    );
  }

  if (showSidebar) {
    return (
      <AdminRoleProvider role="admin" fullPanel>
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
    <AdminRoleProvider role="admin" fullPanel>
      <View style={s.mobileRoot}>
        <StaffTopBar topInset={insets.top} />
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
    backgroundColor: alpha(palette.graphite, 'cc'),
    borderRightWidth: 1,
    borderRightColor: palette.line,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
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
    backgroundColor: alpha(palette.graphite, '99'),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
    overflow: 'hidden',
  },
  mentorBarTitle: { ...typography.label, color: palette.ivory, fontSize: 11, flex: 1 },
  simpleNav: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  simpleTab: { minHeight: 44, justifyContent: 'center' },
  simpleTabText: { ...typography.body, fontSize: 15, color: palette.ash },
  simpleTabTextOn: { color: palette.ivory, fontWeight: '600' },
  simpleTabRule: { position: 'absolute', left: 0, right: 0, bottom: 4, height: 2, borderRadius: 1, backgroundColor: palette.gold },
  sidebarSwitch: { paddingHorizontal: spacing.xs, marginBottom: spacing.md },
  navGroup: { marginBottom: spacing.md },
  navGroupLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 10,
    letterSpacing: 1.6,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: alpha(palette.graphite, '99'),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    paddingTop: spacing.xs,
    overflow: 'hidden',
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
});
