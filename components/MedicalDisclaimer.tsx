/**
 * MedicalDisclaimer — dismissable one-time banner
 *
 * Shows a single banner stating that biometric data is not medical advice.
 * Dismissed state is persisted via readLocal/writeLocal so it only shows once.
 *
 * Usage:
 *   <MedicalDisclaimer />
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/constants/theme';
import { readLocal, writeLocal } from '@/storage/local';

const STORAGE_KEY = 'medical_disclaimer_dismissed';

export default function MedicalDisclaimer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    readLocal<boolean>(STORAGE_KEY).then((dismissed) => {
      if (!dismissed) setVisible(true);
    });
  }, []);

  const dismiss = async () => {
    setVisible(false);
    await writeLocal(STORAGE_KEY, true);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <MaterialIcons name="info-outline" size={16} color={palette.smoke} style={styles.icon} />
      <Text style={styles.text}>
        Los datos biométricos mostrados son informativos y no constituyen diagnóstico
        ni consejo médico. Consulta a un profesional de salud antes de tomar decisiones
        basadas en estos datos.
      </Text>
      <Pressable onPress={dismiss} style={styles.closeBtn} accessibilityLabel="Cerrar aviso">
        <MaterialIcons name="close" size={14} color={palette.smoke} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    marginTop: 1,
    flexShrink: 0,
  },
  text: {
    ...typography.caption,
    color: palette.smoke,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 2,
    flexShrink: 0,
  },
});
