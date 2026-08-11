/** Escaneo frontal interactivo sobre el asset exacto aprobado por el dueño. */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyFocusCard } from '@/components/body-focus-card';
import { BodyMap } from '@/components/body-map';
import { screen, useScreen } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import type { BodyZone } from '@/lib/bodyMapLogic';
import {
  joinBodyPointLabels,
  parseBodyPoints,
  toggleBodyPoint,
  zonesFromBodyPoints,
  type BodyPoint,
} from '@/lib/bodyPointLogic';
import { energyFocusForBodyPoint, needsChestSafety } from '@/lib/energyFocusLogic';

export default function EscaneoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useLifeFlow();
  const latestCheckIn = state.checkIns[0];
  const hydratedCheckInId = useRef<string | null>(null);
  const [scanPoints, setScanPoints] = useState<BodyPoint[]>([]);
  const [scanZones, setScanZones] = useState<BodyZone[]>([]);

  useEffect(() => {
    if (!latestCheckIn || hydratedCheckInId.current === latestCheckIn.id) return;
    hydratedCheckInId.current = latestCheckIn.id;
    const points = parseBodyPoints(latestCheckIn.bodyPoints);
    setScanPoints(points);
    setScanZones(points.length ? zonesFromBodyPoints(points) : latestCheckIn.zones ?? []);
  }, [latestCheckIn]);

  const activePoint = scanPoints.at(-1);
  const activeFocus = activePoint ? energyFocusForBodyPoint(activePoint) : null;
  const selectionLabel = joinBodyPointLabels(scanPoints);

  const handlePointToggle = (point: BodyPoint) => {
    const next = toggleBodyPoint(scanPoints, point);
    setScanPoints(next);
    setScanZones(zonesFromBodyPoints(next));
  };

  const handleZoneToggle = (zone: BodyZone) => {
    setScanZones((current) => current.includes(zone)
      ? current.filter((candidate) => candidate !== zone)
      : [...current, zone]);
  };

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

        <View style={styles.instruction} accessibilityLiveRegion="polite">
          <MaterialIcons name="touch-app" size={18} color={palette.goldText} />
          <Text style={styles.instructionText}>
            {selectionLabel ? `SEÑALADO · ${selectionLabel.toUpperCase()}` : 'TOCA EXACTAMENTE DONDE LO SIENTES'}
          </Text>
        </View>

        <BodyMap
          selected={scanZones}
          points={scanPoints}
          onToggle={handleZoneToggle}
          onPointToggle={handlePointToggle}
          maxBodyWidth={480}
        />

        {activeFocus ? (
          <View style={styles.focusCardWrap}>
            <BodyFocusCard
              focus={activeFocus}
              showChestSafety={scanPoints.some(needsChestSafety)}
            />
          </View>
        ) : null}

        <Text style={styles.caption}>
          Esta es la imagen frontal exacta del check-in, animada sin alterar su anatomía. Cada toque se
          representa como coordenada proporcional sobre la misma figura. La reflexión posterior es simbólica:
          no determina la causa del dolor, no diagnostica y no reemplaza atención médica.
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
  instruction: {
    alignItems: 'center',
    borderColor: palette.lineGold,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  instructionText: {
    color: palette.goldText,
    flexShrink: 1,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  focusCardWrap: {
    marginTop: spacing.lg,
  },
  caption: {
    ...typography.caption,
    color: palette.smoke,
    fontFamily: Fonts.sans,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
});
