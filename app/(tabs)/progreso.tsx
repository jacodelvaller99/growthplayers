import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, MetricCard, PremiumCard, PremiumInput, PrimaryButton, ProgressCard, SecondaryButton, screen } from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

export default function ProgresoScreen() {
  const { state, protocolDay, averages, updateProfile, resetOnboarding, clearData } = useLifeFlow();
  const [name, setName] = useState(state.profile.name);
  const [role, setRole] = useState(state.profile.role);
  const protocolProgress = Math.min(Math.round((protocolDay / 90) * 100), 100);

  const clear = () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Limpiar datos locales de LifeFlow?');
      if (ok) clearData();
      return;
    }
    Alert.alert('Limpiar datos', 'Esto reinicia LifeFlow en este dispositivo.', [{ text: 'Cancelar' }, { text: 'Limpiar', onPress: clearData }]);
  };

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title="PERFIL" />

      <PremiumCard style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{state.profile.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{state.profile.name}</Text>
          <Text style={styles.role}>{state.profile.role} · DIA {protocolDay}</Text>
        </View>
      </PremiumCard>

      <ProgressCard label="Progreso protocolo soberano" value={`${protocolProgress}%`} progress={protocolProgress} />

      <View style={styles.grid}>
        <MetricCard label="Racha" value={`${Math.max(protocolDay, state.checkIns.length)}`} meta="dias" icon="local-fire-department" />
        <MetricCard label="Energia" value={averages.energy ? `${averages.energy}/10` : '--'} meta="promedio" icon="bolt" />
        <MetricCard label="Claridad" value={averages.clarity ? `${averages.clarity}/10` : '--'} meta="promedio" icon="center-focus-strong" />
        <MetricCard label="Check-ins" value={`${state.checkIns.length}`} meta="completados" icon="fact-check" />
      </View>

      <PremiumCard style={styles.form}>
        <Text style={styles.formTitle}>EDITAR PERFIL</Text>
        <PremiumInput value={name} onChangeText={setName} placeholder="NOMBRE" />
        <PremiumInput value={role} onChangeText={setRole} placeholder="ROL" />
        <PrimaryButton label="GUARDAR PERFIL" icon="check" onPress={() => updateProfile({ name, role })} />
      </PremiumCard>

      <PremiumCard style={styles.systemCard}>
        <Text style={styles.formTitle}>SISTEMA LOCAL</Text>
        <Text style={styles.systemText}>Programa activo: Protocolo Soberano · Modulo {ACTIVE_MODULE.number} · {ACTIVE_MODULE.title}</Text>
        <SecondaryButton label="REINICIAR ONBOARDING" icon="restart-alt" onPress={resetOnboarding} />
        <SecondaryButton label="LIMPIAR DATOS LOCALES" icon="delete-outline" onPress={clear} />
      </PremiumCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: palette.black,
    fontFamily: Fonts.display,
    fontSize: 18,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  name: {
    ...typography.section,
    color: palette.ivory,
  },
  role: {
    ...typography.mono,
    color: palette.ash,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  formTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  systemCard: {
    gap: spacing.md,
  },
  systemText: {
    ...typography.body,
    color: palette.ash,
  },
});
