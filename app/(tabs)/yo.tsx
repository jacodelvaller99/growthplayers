import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { PrimaryButton } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { useStaffRole } from '@/hooks/useIsAdmin';
import { MyMentorCard } from '@/components/MyMentorCard';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Fila, Pantalla } from '@/components/pantalla';
import { AccessField } from '@/components/auth/AccessFrame';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { protocolSnapshot } from '@/lib/protocolSnapshot';
import { useSubscription } from '@/hooks/useSubscription';
import {
  requestNotificationPermissions,
  scheduleCheckinReminder,
  cancelReminders,
} from '@/services/notifications';

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







export default function YoScreen() {
  const router = useRouter();
  const {
    state,
    updateProfile,
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
  const [notificationsOn, setNotificationsOn] = useState(false);
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


  // Tu cuenta, en la misma gramática que el resto: etiqueta pequeña, campos
  // sobre una línea, filas. Mi Norte ya no se edita aquí — tiene su pantalla.
  const ajustesBlock = (
    <View style={styles.cuenta}>
      <Text style={styles.cuentaLabel}>TU PERFIL</Text>
      <AccessField label="NOMBRE" value={name} onChangeText={setName} returnKeyType="next" />
      <AccessField label="QUÉ HACES" value={role} onChangeText={setRole} placeholder="Fundadora, abogado…" returnKeyType="done" />
      <PrimaryButton
        label={savingProfile ? 'GUARDANDO…' : 'GUARDAR PERFIL'}
        onPress={handleSaveProfile}
        disabled={savingProfile}
      />

      <Text style={[styles.cuentaLabel, styles.cuentaGap]}>AVISOS Y DATOS</Text>
      <View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Recordarme el check-in</Text>
            <Text style={styles.toggleMeta}>Cada día a las 7:00</Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={toggleNotifications}
            trackColor={{ false: palette.charcoal, true: palette.gold }}
            thumbColor={notificationsOn ? palette.ink : palette.ash}
            {...SWITCH_WEB}
            accessibilityLabel="Recordarme el check-in"
          />
        </View>
        <View style={[styles.toggleRow, styles.toggleRowLast]}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Usar mis datos para mejorar</Text>
            <Text style={styles.toggleMeta}>Personaliza lo que Polaris te recomienda. Tus datos nunca se venden.</Text>
          </View>
          <Switch
            value={mlConsent}
            onValueChange={handleMlConsentToggle}
            trackColor={{ false: palette.charcoal, true: palette.gold }}
            thumbColor={mlConsent ? palette.ink : palette.ash}
            {...SWITCH_WEB}
            accessibilityLabel="Usar mis datos para mejorar"
          />
        </View>
      </View>

      <View style={styles.cuentaGap}>
        <Fila label="MI NORTE" value="Editar" onPress={() => router.push('/(tabs)/norte' as never)} />
        <Fila
          label="MIS DATOS"
          value={exporting ? 'Preparando…' : 'Descargar todo'}
          onPress={exporting ? undefined : handleExport}
        />
        {LEGAL_LINKS.map((link) => (
          <Fila
            key={link.route}
            label={link.title.toUpperCase()}
            value="Leer"
            onPress={() => router.push(link.route as never)}
          />
        ))}
        {isStaff && (
          <Fila label="EQUIPO" value={staffBtnLabel} onPress={() => router.push('/admin' as never)} />
        )}
        <Fila label="SESIÓN" value="Cerrar sesión" onPress={handleSignOut} last />
      </View>

      <View style={styles.cuentaQuiet}>
        <Pressable onPress={resetOnboarding} accessibilityRole="button" style={styles.quietLink}>
          <Text style={styles.quietText}>Repetir la bienvenida</Text>
        </Pressable>
        <Pressable onPress={clear} accessibilityRole="button" style={styles.quietLink}>
          <Text style={styles.quietText}>Borrar los datos de este dispositivo</Text>
        </Pressable>
        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Eliminar mi cuenta y todos mis datos"
          style={styles.quietLink}>
          <Text style={styles.dangerText}>{deleting ? 'Eliminando…' : 'Eliminar mi cuenta'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Pantalla
      meta="YO"
      metaRight={`DÍA ${protocolDay} / 90`}
      title={`${(state.profile.name || 'Tú').split(' ')[0]}.`}
      sub={state.profile.role || undefined}
      footer={<Text style={styles.versionText}>Polaris OS v{appVersion}</Text>}>
      {/* Staff: el cambio de modo va arriba, a la vista. Antes vivía al final
          de Hoy y dentro de Ajustes — nadie lo encontraba. */}
      {isStaff && <ModeSwitch current="client" style={styles.modeSwitch} />}
      <Fila
        label="TU PLAN"
        value={subscription.tierInfo.name}
        onPress={subscription.tier === 'free' ? () => router.push('/pricing' as never) : undefined}
      />
      <Fila label="TU PROGRAMA" value="Módulos y lecciones" onPress={() => router.push('/(tabs)/programas' as never)} />
      <Fila label="MENTORÍA" value="Tu proceso semanal" onPress={() => router.push('/mentoria' as never)} />
      <Fila label="BIENESTAR" value="Respirar, meditar, escribir" onPress={() => router.push('/bienestar' as never)} />
      <Fila label="TU RELOJ" value="Conectar dispositivos" onPress={() => router.push('/perfil/wearables' as never)} />
      <Fila label="APARIENCIA" value="Claro u oscuro" onPress={() => router.push('/perfil/apariencia' as never)} last />
      <View style={styles.mentorWrap}>
        <MyMentorCard />
      </View>
      <View style={styles.ajustes}>{ajustesBlock}</View>
    </Pantalla>
  );
}



// react-native-web ignora thumbColor cuando está encendido y pinta su teal
// por defecto (#009688): activeThumbColor es su prop para ese estado.
const SWITCH_WEB = { activeThumbColor: palette.ink, activeTrackColor: palette.gold } as object;

const styles = StyleSheet.create({
  modeSwitch: { marginBottom: 24 },
  cuenta: { gap: spacing.lg },
  cuentaLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },
  cuentaGap: { marginTop: spacing.lg },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: palette.line,
  },
  toggleRowLast: { borderBottomWidth: 1, borderBottomColor: palette.line },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontFamily: Fonts.sans, fontSize: 16, color: palette.ivory },
  toggleMeta: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: palette.smoke },
  cuentaQuiet: { marginTop: spacing.md, alignItems: 'flex-start' },
  quietLink: { minHeight: 44, justifyContent: 'center' },
  quietText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
  dangerText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.dangerText },
  ajustes: { marginTop: spacing.lg },
  mentorWrap: { marginTop: spacing.xl },






  // Achievements









  // Version
  versionText: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    opacity: 0.5,
  },

});



