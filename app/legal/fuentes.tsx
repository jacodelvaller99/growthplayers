/**
 * Fuentes médicas — todas las citas de la información de salud de la app, por
 * tema, con enlace (App Review 1.4.1). Pública, como el resto de /legal.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreen } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { MEDICAL_SOURCES, TOPIC_LABEL, type SourceTopic } from '@/data/medicalSources';

export default function FuentesScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topics = Object.keys(MEDICAL_SOURCES) as SourceTopic[];

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
      showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as never))} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">FUENTES MÉDICAS</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={s.lead}>
        La información de salud de Polaris se basa en estas fuentes. Cada pantalla de bienestar muestra las suyas
        en «Fuentes». Es información educativa: no sustituye la consulta con un profesional de la salud.
      </Text>
      <Pressable onPress={() => router.push('/legal/salud' as never)} style={s.link} accessibilityRole="link">
        <Text style={s.linkText}>Leer el aviso de salud y bienestar →</Text>
      </Pressable>

      {topics.map((t) => (
        <View key={t} style={s.group}>
          <Text style={s.groupTitle}>{TOPIC_LABEL[t].toUpperCase()}</Text>
          {MEDICAL_SOURCES[t].map((src) => (
            <Pressable
              key={src.url}
              onPress={() => { void Linking.openURL(src.url); }}
              style={s.item}
              accessibilityRole="link"
              accessibilityLabel={`${src.title}, ${src.org}. Abrir fuente`}>
              <Text style={s.itemTitle}>{src.title}</Text>
              <Text style={s.org}>{src.org} ↗</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  lead: { ...typography.body, color: palette.ash, lineHeight: 22, maxWidth: 640 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.goldText },
  group: { gap: spacing.xs, marginTop: spacing.lg, maxWidth: 720 },
  groupTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },
  item: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.line },
  itemTitle: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, color: palette.ivory, textDecorationLine: 'underline' },
  org: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, marginTop: 2 },
});
