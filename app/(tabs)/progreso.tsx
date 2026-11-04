import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';

import {
  DangerButton,
  GoldDivider,
  PremiumCard,
  PremiumInput,
  PrimaryButton,
  SecondaryButton,
} from '@/components/polaris';
import { ACTIVE_MODULE, POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useStaffRole } from '@/hooks/useIsAdmin';
import { MyMentorCard } from '@/components/MyMentorCard';
import { Fila, Pantalla } from '@/components/pantalla';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { protocolSnapshot } from '@/lib/protocolSnapshot';
import { useSubscription } from '@/hooks/useSubscription';
import {
  requestNotificationPermissions,
  scheduleCheckinReminder,
  cancelReminders,
} from '@/services/notifications';
import type { NorthStar } from '@/types/lifeflow';

// ─── Legal links (in-app policy screens) ───────────────────────────────────
const LEGAL_LINKS: {
  route: string;
  title: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  { route: '/legal/terminos',   title: 'TÉRMINOS DE USO',       meta: 'Condiciones del servicio y suscripciones', icon: 'gavel' },
  { route: '/legal/privacidad', title: 'POLÍTICA DE PRIVACIDAD', meta: 'Cómo tratamos y protegemos tus datos',      icon: 'privacy-tip' },
  { route: '/legal/salud',      title: 'DESCARGO DE SALUD',      meta: 'Bienestar y educación, no consejo médico',  icon: 'health-and-safety' },
];

// ─── Streak Calendar Component (42-day heatmap) ────────────────────────────







export default function ProgresoScreen() {
  const router = useRouter();
  const {
    state,
    updateProfile, updateNorthStar,
    resetOnboarding, clearData, signOut,
    deleteAccount, exportData,
  } = useLifeFlow();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const subscription = useSubscription();

  // ── Staff flags (robustos + cacheados — ver hooks/useIsAdmin) ───────────────
  // Antes era un .single() inline sin manejo de error: un hiccup de red dejaba el
  // botón "Cuadro de Mando" intermitente. useStaffRole conserva el valor ante
  // error. `isMentor` entra porque un mentor puro no tenía NINGÚN botón hacia su
  // Escritorio — solo llegaba escribiendo /admin a mano.
  const { isAdmin, isMentor } = useStaffRole();
  const isStaff = isAdmin || isMentor;
  const staffBtnLabel = isAdmin ? 'Cuadro de Mando →' : 'Escritorio del Mentor →';

  // ML Consent toggle
  const [mlConsent, setMlConsent] = useState(state.profile.mlConsent !== false);

  const handleMlConsentToggle = async (value: boolean) => {
    setMlConsent(value);
    await updateProfile({ ...state.profile, mlConsent: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };



  const [deleting, setDeleting]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const [north, setNorth] = useState<NorthStar>(state.northStar);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [savingNorth, setSavingNorth] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Check if notifications are already scheduled
  useEffect(() => {
    if (Platform.OS === 'web') return;
    import('expo-notifications').then((N) =>
      N.getAllScheduledNotificationsAsync().then((list) =>
        setNotificationsOn(list.length > 0),
      ),
    );
  }, []);

  // Wellness session counts for score
  const wellnessSessions = state.wellnessSessions ?? [];
  const wellnessMeditation = wellnessSessions.filter((s) => s.type === 'meditation').length;
  const wellnessBreathing  = wellnessSessions.filter((s) => s.type === 'breathing').length;
  const wellnessBinaural   = wellnessSessions.filter((s) => s.type === 'binaural').length;



  // Día, racha, score y línea base: la MISMA función que Comando
  // (lib/protocolSnapshot) — antes cada pantalla daba su propio número.
  const snap = useMemo(() => protocolSnapshot({
    protocolStartDate: state.protocolStartDate,
    checkIns: state.checkIns,
    completedLessons: (state.completedLessons ?? []).length,
    completedTasks: Object.keys(state.completedTasks ?? {}).length,
    wellness: { meditation: wellnessMeditation, breathing: wellnessBreathing, binaural: wellnessBinaural },
    now: new Date(),
  }), [state.protocolStartDate, state.checkIns, state.completedLessons, state.completedTasks, wellnessMeditation, wellnessBreathing, wellnessBinaural]);
  const protocolDay = snap.protocolDay;
  const checkinStreak = snap.streak;
  /** Sin lecturas el score no mide nada — ver el comentario en su render. */
  const sinLecturas = !snap.hasReadings;




  // SIN VITRINA DE TROFEOS. Aqui vivia un array de ocho fichas de 22% de ancho
  // que se rellenaban de oro macizo al ganarse, con iconos de copa, estrellas y
  // medalla, y etiquetas "ELITE 800" / "SOBERANO 90D".
  //
  // Es, literal, la anti-referencia que PRODUCT.md nombra: "badge-as-toy
  // mechanics". Y rompia el principio del oro —se gana, no decora— de la forma
  // mas directa posible: el oro como ficha-premio. El propio repo ya lo sabia:
  // `components/narrative.tsx` quito UN icono `military-tech` del hito citando
  // esta misma regla, mientras a dos archivos de distancia seguia el estante
  // entero.
  //
  // El coste narrativo era el peor: la app contaba dos historias incompatibles
  // sobre que es un logro. En el check-in, "hace una semana dijiste que lo que
  // se interponia era X, y llevas siete dias apareciendo". En Progreso, una
  // copa dorada que dice ELITE 800. La segunda le quita autoridad a la primera.
  //
  // Lo que queda ya cubre "donde estoy": el score soberano, el delta, y la
  // tarjeta TU HISTORIA. Y el cruce de un hito lo reconoce `MilestoneToast`,
  // que es sobrio y cita las palabras del usuario.

  // Archetype badges — earned by completing all lessons in a module with an arquetipo
  const archetypes = useMemo(() => {
    const completed = state.completedLessons ?? [];
    return POLARIS_MODULES
      .filter((m) => m.arquetipo)
      .map((m) => {
        const totalLessons = m.lessons.length;
        const completedCount = m.lessons.filter((l) => completed.includes(l.id)).length;
        const earned = totalLessons > 0 && completedCount >= totalLessons;
        return {
          id: m.id,
          name: (m.arquetipo ?? '').toUpperCase(),
          order: m.order,
          earned,
          completedCount,
          totalLessons,
        };
      });
  }, [state.completedLessons]);




  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert('Permisos requeridos', 'Activa las notificaciones en Configuración para recibir recordatorios.');
        return;
      }
      await scheduleCheckinReminder(protocolDay);
      setNotificationsOn(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await cancelReminders();
      setNotificationsOn(false);
    }
  };

  const saveNorth = async () => {
    setSavingNorth(true);
    await updateNorthStar(north);
    setSavingNorth(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Guard anti-doble-tap: updateProfile es async → evita doble submit del perfil.
  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await updateProfile({ name, role });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('¿Cerrar sesión? Puedes volver a ingresar cuando quieras.');
      if (ok) { signOut(); router.replace('/'); }
      return;
    }
    Alert.alert(
      'CERRAR SESIÓN',
      '¿Cerrar sesión? Puedes volver a ingresar cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await signOut(); router.replace('/'); } },
      ],
    );
  };

  const clear = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('¿Limpiar todos los datos de Polaris?');
      if (ok) clearData();
      return;
    }
    Alert.alert(
      'LIMPIAR DATOS',
      'Esto elimina todo el progreso local de Polaris. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: clearData },
      ],
    );
  };

  // GDPR: Export all personal data
  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportData();
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `polaris-datos-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: json,
          title:   'Mis datos de Polaris',
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al exportar';
      Alert.alert('Error', msg);
    } finally {
      setExporting(false);
    }
  };

  // GDPR: Delete account — 2-step confirmation
  // Borrar la cuenta NO cancela la suscripción de la tienda: Apple/Google la
  // siguen cobrando. Se avisa y se ofrece el enlace — y exportar antes —, sin
  // bloquear el borrado.
  const SUBS_URL = Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
  const SUBS_AVISO = 'Tu suscripción de Apple o Google NO se cancela sola al borrar la cuenta: gestiónala en la tienda.';

  const handleDeleteAccount = () => {
    const runDelete = async () => {
      setDeleting(true);
      try {
        await deleteAccount();
        router.replace('/');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al eliminar';
        Alert.alert('Error', `No se pudo eliminar la cuenta: ${msg}`);
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      // Alert.alert no existe en web: confirm nativo, mismo contenido.
      if (window.confirm(`¿Exportar tus datos antes de borrar la cuenta?\n\n${SUBS_AVISO}`)) {
        void handleExport();
        return;
      }
      if (window.confirm('Se eliminará tu cuenta y TODOS tus datos de Polaris de forma permanente. Esta acción NO SE PUEDE DESHACER.')) {
        void runDelete();
      }
      return;
    }

    Alert.alert(
      'ELIMINAR CUENTA',
      `¿Estás seguro? Esta acción eliminará tu cuenta y TODOS tus datos de Polaris de forma permanente e irreversible.\n\n${SUBS_AVISO}`,
      [
        { text: 'Exportar mis datos', onPress: () => { void handleExport(); } },
        // Android admite 3 botones: ahí el enlace a la tienda va en el aviso
        // de la confirmación final.
        ...(Platform.OS === 'ios'
          ? [{ text: 'Gestionar suscripción', onPress: () => { void Linking.openURL(SUBS_URL); } }]
          : []),
        { text: 'Cancelar', style: 'cancel' as const },
        {
          text: 'Continuar',
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert(
              'CONFIRMACIÓN FINAL',
              `Se eliminarán: historial de check-ins, conversaciones con Norman IA, progreso de lecciones y todos los datos biométricos. Esta acción NO SE PUEDE DESHACER.\n\n${SUBS_AVISO}`,
              [
                ...(Platform.OS === 'android'
                  ? [{ text: 'Gestionar suscripción', onPress: () => { void Linking.openURL(SUBS_URL); } }]
                  : []),
                { text: 'Cancelar', style: 'cancel' as const },
                { text: 'ELIMINAR MI CUENTA', style: 'destructive' as const, onPress: () => { void runDelete(); } },
              ],
            );
          },
        },
      ],
    );
  };

  // ── Desktop (≥1200px) layout ─────────────────────────────────────────────────
  // ── PROGRESO (rediseño) ─────────────────────────────────────────────────────
  // Una pregunta: ¿estoy apareciendo? La racha en grande, seis semanas de
  // check-ins y dos cifras que se mueven. Todo lo de la cuenta queda plegado
  // abajo, en el mismo sitio, con las mismas funciones.
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const ordenados = [...state.checkIns].sort((a, b) => (a.date < b.date ? 1 : -1));
  const media = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const ultimos = ordenados.slice(0, 7);
  const anteriores = ordenados.slice(7, 14);
  const cifra = (key: 'energy' | 'clarity') => {
    const ahora = media(ultimos.map((c) => c[key]));
    const antes = media(anteriores.map((c) => c[key]));
    if (ahora === null) return 'Sin lecturas aún';
    const base = `${ahora.toFixed(1).replace('.', ',')} de 10`;
    if (antes === null) return base;
    const d = ahora - antes;
    if (Math.abs(d) < 0.05) return `${base} · igual`;
    return `${base} · ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1).replace('.', ',')}`;
  };
  const modulosHechos = archetypes.filter((a) => a.earned).length;

  const ajustesBlock = (
    <>
      {/* ── Edit Profile ── */}
      <GoldDivider label="EDITAR PERFIL" />
      <PremiumCard style={styles.form}>
        <PremiumInput
          value={name}
          onChangeText={setName}
          placeholder="NOMBRE"
          accessibilityLabel="Nombre de perfil"
          returnKeyType="next"
        />
        <PremiumInput
          value={role}
          onChangeText={setRole}
          placeholder="ROL / TITULO"
          accessibilityLabel="Rol o título"
          returnKeyType="done"
        />
        <PrimaryButton
          label={savingProfile ? 'GUARDANDO...' : 'GUARDAR PERFIL'}
          icon="check"
          onPress={handleSaveProfile}
          disabled={savingProfile}
        />
      </PremiumCard>

      {/* ── Mi Norte ── */}
      <GoldDivider label="MI NORTE" />
      <PremiumCard style={styles.form}>
        <View style={styles.northField}>
          <Text style={styles.northLabel}>PROPÓSITO PRINCIPAL</Text>
          <PremiumInput
            value={north.purpose}
            onChangeText={(purpose) => setNorth({ ...north, purpose })}
            placeholder="¿Por qué operas a este nivel?"
            multiline
            style={styles.textarea}
            accessibilityLabel="Propósito principal"
          />
        </View>
        <View style={styles.northField}>
          <Text style={styles.northLabel}>DECLARACIÓN DE IDENTIDAD</Text>
          <PremiumInput
            value={north.identity}
            onChangeText={(identity) => setNorth({ ...north, identity })}
            placeholder="Soy alguien que..."
            multiline
            style={styles.textarea}
            accessibilityLabel="Declaración de identidad"
          />
        </View>
        <View style={styles.northField}>
          <Text style={styles.northLabel}>RECORDATORIO DIARIO</Text>
          <PremiumInput
            value={north.dailyReminder}
            onChangeText={(dailyReminder) => setNorth({ ...north, dailyReminder })}
            placeholder="La frase que te ancla cada mañana..."
            multiline
            style={styles.textarea}
            accessibilityLabel="Recordatorio diario"
          />
        </View>
        <PrimaryButton
          label={savingNorth ? 'GUARDANDO...' : 'GUARDAR NORTE'}
          icon="explore"
          onPress={saveNorth}
          disabled={savingNorth}
        />
      </PremiumCard>

      {/* ── Notificaciones ── */}
      <GoldDivider label="NOTIFICACIONES Y PRIVACIDAD" />
      <PremiumCard style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>RECORDATORIO DIARIO</Text>
            <Text style={styles.settingMeta}>Check-in a las 7:00 AM</Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={toggleNotifications}
            trackColor={{ false: palette.charcoal, true: palette.gold }}
            thumbColor={notificationsOn ? palette.ink : palette.ash}
          />
        </View>
        <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.md }]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>ANÁLISIS DE COMPORTAMIENTO</Text>
            <Text style={styles.settingMeta}>
              Permite a Polaris personalizar recomendaciones con IA. Tus datos nunca se venden.
            </Text>
          </View>
          <Switch
            value={mlConsent}
            onValueChange={handleMlConsentToggle}
            trackColor={{ false: palette.charcoal, true: palette.gold }}
            thumbColor={mlConsent ? palette.ink : palette.ash}
          />
        </View>
      </PremiumCard>

      {/* ── Privacidad y Datos (GDPR) ── */}
      <GoldDivider label="PRIVACIDAD Y DATOS" />
      <PremiumCard style={styles.gdprCard}>
        <Text style={styles.gdprIntro}>
          Tienes derecho a acceder, exportar y eliminar todos tus datos personales en cualquier momento (RGPD / GDPR).
        </Text>

        {/* Export */}
        <Pressable
          style={[styles.gdprBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
          accessibilityLabel="Exportar mis datos">
          <MaterialIcons name="download" size={18} color={palette.goldText} />
          <View style={styles.gdprBtnBody}>
            <Text style={styles.gdprBtnTitle}>{exporting ? 'EXPORTANDO...' : 'EXPORTAR MIS DATOS'}</Text>
            <Text style={styles.gdprBtnMeta}>JSON con todo tu historial · check-ins, conversaciones, lecciones</Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
        </Pressable>

        {/* Delete account */}
        <Pressable
          style={[styles.gdprDeleteBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          accessibilityLabel="Eliminar cuenta">
          <MaterialIcons name="delete-forever" size={18} color={palette.danger} />
          <View style={styles.gdprBtnBody}>
            <Text style={styles.gdprDeleteTitle}>{deleting ? 'ELIMINANDO...' : 'ELIMINAR CUENTA'}</Text>
            <Text style={styles.gdprBtnMeta}>Elimina tu cuenta y todos los datos de forma permanente</Text>
          </View>
        </Pressable>
      </PremiumCard>

      {/* ── Legal ── */}
      <GoldDivider label="LEGAL" />
      <PremiumCard style={styles.gdprCard}>
        {LEGAL_LINKS.map((link) => (
          <Pressable
            key={link.route}
            style={styles.gdprBtn}
            onPress={() => router.push(link.route as never)}
            accessibilityRole="button"
            accessibilityLabel={link.title}>
            <MaterialIcons name={link.icon} size={18} color={palette.goldText} />
            <View style={styles.gdprBtnBody}>
              <Text style={styles.gdprBtnTitle}>{link.title}</Text>
              <Text style={styles.gdprBtnMeta}>{link.meta}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
          </Pressable>
        ))}
      </PremiumCard>

      {/* ── Sistema ── */}
      <GoldDivider label="SISTEMA" />
      <PremiumCard style={styles.systemCard}>
        <View style={styles.systemInfo}>
          <Text style={styles.systemLabel}>PROGRAMA ACTIVO</Text>
          <Text style={styles.systemValue}>Protocolo Soberano</Text>
          <Text style={styles.systemMeta}>
            Módulo {ACTIVE_MODULE.order} — {ACTIVE_MODULE.title}
          </Text>
        </View>
        <SecondaryButton
          label="REINICIAR ONBOARDING"
          icon="restart-alt"
          onPress={resetOnboarding}
        />
        <Pressable
          onPress={handleSignOut}
          style={styles.signOutBtn}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión">
          <MaterialIcons name="logout" size={18} color={palette.danger} />
          <Text style={styles.signOutText}>CERRAR SESIÓN</Text>
        </Pressable>
        <DangerButton
          label="LIMPIAR DATOS LOCALES"
          icon="delete-outline"
          onPress={clear}
        />
      </PremiumCard>

      {/* ── Staff Access (admins Y mentores — read from profiles.is_admin/is_mentor) ── */}
      {isStaff && (
        <Pressable
          style={styles.adminBtn}
          onPress={() => router.push('/admin' as never)}
          accessibilityRole="button"
          accessibilityLabel={staffBtnLabel}>
          <MaterialIcons name="dashboard-customize" size={16} color={palette.goldText} />
          <Text style={styles.adminBtnText}>{staffBtnLabel}</Text>
        </Pressable>
      )}

    </>
  );

  return (
    <Pantalla
      meta="PROGRESO"
      metaRight={`DÍA ${protocolDay} / 90`}
      title={checkinStreak > 0
        ? `${checkinStreak} ${checkinStreak === 1 ? 'día' : 'días'}\nseguido${checkinStreak === 1 ? '' : 's'}.`
        : 'Tu racha\nempieza hoy.'}
      sub={checkinStreak > 0 ? 'Cada cuadro amarillo es un día que apareciste.' : 'Haz tu check-in y aparece el primer cuadro.'}
      hero={<Calendario checkIns={state.checkIns} />}
      footer={<Text style={styles.versionText}>Polaris OS v{appVersion}</Text>}>
      <Fila label="ENERGÍA" value={cifra('energy')} />
      <Fila label="CLARIDAD" value={cifra('clarity')} />
      <Fila
        label="PUNTAJE"
        value={sinLecturas ? 'Aparece con tu primer check-in' : `${snap.score} · ${snap.tier}`}
        onPress={() => router.push('/perfil' as never)}
      />
      <Fila
        label="ARQUETIPOS"
        value={`${modulosHechos} de ${archetypes.length} desbloqueados`}
        onPress={() => router.push('/(tabs)/programas' as never)}
      />
      <Fila
        label="TU PLAN"
        value={subscription.tierInfo.name}
        onPress={subscription.tier === 'free' ? () => router.push('/pricing' as never) : undefined}
      />
      <Fila
        label="TU CUENTA"
        value={ajustesAbiertos ? 'Ocultar' : 'Perfil, Norte, avisos y privacidad'}
        onPress={() => setAjustesAbiertos((v) => !v)}
        last
      />
      {ajustesAbiertos && <View style={styles.ajustes}>{ajustesBlock}</View>}
      <View style={styles.mentorWrap}>
        <MyMentorCard />
      </View>
    </Pantalla>
  );
}

/** Seis semanas de check-ins, de lunes a domingo. Hoy lleva contorno. */
function Calendario({ checkIns }: { checkIns: { date: string }[] }) {
  const dias = useMemo(() => {
    const clave = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 35);
    const hechos = new Set(checkIns.map((c) => c.date.slice(0, 10)));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      return { key: clave(d), on: hechos.has(clave(d)), hoy: +d === +hoy, futuro: d > hoy };
    });
  }, [checkIns]);
  const hechos30 = dias.filter((d) => d.on).length;
  return (
    <View
      style={styles.cal}
      accessible
      accessibilityLabel={`Calendario de las últimas seis semanas: ${hechos30} días con check-in`}>
      {dias.map((d) => (
        <View key={d.key} style={styles.calCell}>
          <View
            style={[
              styles.calDay,
              d.on && styles.calDayOn,
              d.futuro && styles.calDayFuture,
              d.hoy && styles.calDayToday,
            ]}
          />
        </View>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  // ── Rediseño ──
  cal: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, maxWidth: 528 },
  calCell: { width: '14.2857%', padding: 3 },
  calDay: { aspectRatio: 1, borderRadius: 4, backgroundColor: palette.charcoal },
  calDayOn: { backgroundColor: palette.gold },
  calDayFuture: { opacity: 0.35 },
  calDayToday: { borderWidth: 2, borderColor: palette.ivory },
  ajustes: { marginTop: spacing.lg },
  mentorWrap: { marginTop: spacing.xl },






  // Achievements


  // Form
  form: {
    gap: spacing.md,
  },

  // Norte fields
  northField: {
    gap: spacing.sm,
  },
  northLabel: {
    ...typography.label,
    color: palette.ash,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  textarea: {
    minHeight: 80,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },

  // Settings card
  settingsCard: {
    gap: spacing.md,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  settingInfo: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    ...typography.label,
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  settingMeta: {
    ...typography.mono,
    color: palette.smoke,
  },

  // Sign out
  signOutBtn: {
    alignItems: 'center',
    borderColor: palette.danger,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  signOutText: {
    ...typography.label,
    color: palette.danger,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 2,
  },



  // System
  systemCard: {
    gap: spacing.md,
  },
  systemInfo: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomColor: palette.lineSoft,
    borderBottomWidth: 1,
  },
  systemLabel: {
    ...typography.label,
    color: palette.ash,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  systemValue: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  systemMeta: {
    ...typography.mono,
    color: palette.smoke,
  },
  // GDPR section
  gdprCard: {
    gap: spacing.md,
  },
  gdprIntro: {
    ...typography.caption,
    color: palette.smoke,
    lineHeight: 18,
    fontSize: 11,
  },
  gdprBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  gdprBtnBody: {
    flex: 1,
    gap: 2,
  },
  gdprBtnTitle: {
    ...typography.label,
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  gdprBtnMeta: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
  },
  gdprDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: alpha(palette.danger, '55'),
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  gdprDeleteTitle: {
    ...typography.label,
    color: palette.danger,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Version
  versionText: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    opacity: 0.5,
  },

  // Admin access button — ghost style, only rendered when is_admin === true
  adminBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: 'rgba(255,200,4,0.25)',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  adminBtnText: {
    fontFamily: Fonts.sans,
    color: palette.goldText,
    fontSize: 12,
    letterSpacing: 1,
  },
});



