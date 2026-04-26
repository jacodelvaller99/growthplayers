import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, PremiumCard, ProgressCard, SectionHeader, StatusPill, screen } from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { palette, spacing, typography } from '@/constants/theme';

function statusTone(status: string) {
  if (status === 'active') return 'gold';
  if (status === 'completed') return 'success';
  return 'muted';
}

export default function ProgramasScreen() {
  const router = useRouter();

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title="PROGRAMA" />
      <SectionHeader title="Protocolo Soberano" meta="90 DIAS" />
      <ProgressCard label="Avance total" value="62%" progress={62} />

      <View style={styles.list}>
        {POLARIS_MODULES.map((module) => (
          <Pressable key={module.id} onPress={() => router.push({ pathname: '/module/[id]', params: { id: module.id } })}>
            <PremiumCard style={[styles.moduleCard, module.status === 'active' && styles.activeModule]}>
              <View style={styles.moduleTop}>
                <Text style={styles.moduleNumber}>0{module.number}</Text>
                <StatusPill label={module.status === 'completed' ? 'COMPLETADO' : module.status === 'active' ? 'ACTIVO' : 'BLOQUEADO'} tone={statusTone(module.status)} />
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
              <View style={styles.moduleFooter}>
                <View style={styles.line}>
                  <View style={[styles.lineFill, { width: `${module.progress}%` }]} />
                </View>
                <MaterialIcons name="chevron-right" size={22} color={palette.gold} />
              </View>
            </PremiumCard>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  moduleCard: {
    gap: spacing.md,
  },
  activeModule: {
    borderColor: palette.gold,
  },
  moduleTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moduleNumber: {
    ...typography.mono,
    color: palette.gold,
  },
  moduleTitle: {
    ...typography.title,
    color: palette.ivory,
  },
  moduleSubtitle: {
    ...typography.body,
    color: palette.ash,
  },
  moduleFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  line: {
    backgroundColor: palette.charcoal,
    flex: 1,
    height: 4,
  },
  lineFill: {
    backgroundColor: palette.gold,
    height: '100%',
  },
});
