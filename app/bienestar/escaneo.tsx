/**
 * El escaneo biométrico completo — las 6 vistas del cuerpo de partículas,
 * calcadas de la referencia del dueño. Reporte, no widget: el toque directo
 * sigue viviendo en el check-in (`BodyMap3D`); aquí se mira, no se toca.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyScanReport } from '@/components/body-scan-report';
import { screen, useScreen } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';

export default function EscaneoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={sc.root}>
      <ScrollView
        contentContainerStyle={[screen.content, { paddingTop: insets.top + 16, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={styles.title}>ESCANEO BIOMÉTRICO</Text>
          <View style={{ width: 36 }} />
        </View>

        {Platform.OS === 'web' ? (
          <BodyScanReport />
        ) : (
          <View style={styles.nativeNotice}>
            <MaterialIcons name="desktop-windows" size={22} color={palette.smoke} />
            <Text style={styles.nativeNoticeText}>
              El reporte de 6 vistas está disponible en la versión web por ahora — sigue el mismo motor
              que el mapa corporal del check-in, que aquí en la app sí puedes tocar.
            </Text>
          </View>
        )}

        <Text style={styles.caption}>
          Cada vista es el mismo cuerpo de partículas — la zona en oro es la que señalaste en tu último
          check-in. Nada de esto reemplaza un diagnóstico médico: es una lectura de coaching, no clínica.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 15,
    letterSpacing: 1,
  },
  nativeNotice: {
    alignItems: 'flex-start',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  nativeNoticeText: {
    ...typography.caption,
    color: palette.ash,
    flex: 1,
    lineHeight: 20,
  },
  caption: {
    ...typography.caption,
    color: palette.smoke,
    fontFamily: Fonts.sans,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
});
