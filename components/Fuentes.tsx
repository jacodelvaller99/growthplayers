/**
 * «Fuentes» — citas con enlace de la información de salud de cada pantalla
 * (App Review 1.4.1). Plegado por defecto para no sumar ruido; un toque y se
 * ven los enlaces. Siempre lleva a la página completa /legal/fuentes.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, spacing } from '@/constants/theme';
import { MEDICAL_SOURCES, type SourceTopic } from '@/data/medicalSources';

export function Fuentes({ topics, note }: { topics: SourceTopic[]; note?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const sources = topics.flatMap((t) => MEDICAL_SOURCES[t]);

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={s.head}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Fuentes de esta información, ${sources.length}`}>
        <MaterialIcons name="menu-book" size={16} color={palette.goldText} />
        <Text style={s.headText}>FUENTES ({sources.length})</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={18} color={palette.smoke} />
      </Pressable>
      {open && (
        <View style={s.list}>
          {note ? <Text style={s.note}>{note}</Text> : null}
          {sources.map((src) => (
            <Pressable
              key={src.url}
              onPress={() => { void Linking.openURL(src.url); }}
              style={s.item}
              accessibilityRole="link"
              accessibilityLabel={`${src.title}, ${src.org}. Abrir fuente`}>
              <Text style={s.title}>{src.title}</Text>
              <Text style={s.org}>{src.org} ↗</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/legal/fuentes' as never)} style={s.item} accessibilityRole="link">
            <Text style={s.all}>Todas las fuentes médicas de Polaris →</Text>
          </Pressable>
          <Text style={s.note}>Información educativa. No sustituye la consulta con un profesional de la salud.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
  headText: { flex: 1, fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },
  list: { gap: spacing.xs, paddingBottom: spacing.md },
  item: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.xs },
  title: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, color: palette.ivory, textDecorationLine: 'underline' },
  org: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, marginTop: 2 },
  all: { fontFamily: Fonts.sans, fontSize: 15, color: palette.goldText },
  note: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: palette.smoke },
});
