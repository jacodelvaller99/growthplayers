/**
 * NovedadesNorman — la tarjeta de "qué hay de nuevo", en la voz de Norman IA.
 *
 * Reglas de la casa que respeta a propósito:
 * - TARJETA, no modal: el modal de bienvenida ya demostró que un overlay se
 *   traga los toques de toda la pantalla. Esto informa sin secuestrar.
 * - Una sola vez POR VERSIÓN: al descartarla se persiste la versión vista
 *   (storage/local, web y nativo). Subir NOVEDADES_VERSION la re-abre.
 * - Voz de la Biblia: Norman IA se presenta como IA, habla del estado, cita
 *   lo concreto y cierra con UNA directiva (abrir Personalizar).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoldAccentCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { readLocal, writeLocal } from '@/storage/local';

/** Subir esto cuando haya novedades nuevas que anunciar. */
export const NOVEDADES_VERSION = '2026-08-24';

const STORAGE_KEY = 'novedades:seen';

const LINEAS = [
  'La app ahora se adapta a cómo operas tú: seis modos de composición, once fondos y nueve señales — todo en Personalizar.',
  'Tus relojes cuentan la verdad: el ayuno es un reloj circular, Calma respira alrededor de tu recuperación y Guiado espeja tu Jornada real del día.',
  'La ruta de mentoría avanza con tu sesión registrada, no con el calendario: lo que no se termina, se corre.',
  'Tus lecciones traen sus guías prácticas, y tu perfil ya cuenta tu historia completa — con lo que hiciste, no con opiniones.',
];

export function NovedadesNorman() {
  const router = useRouter();
  // null = todavía leyendo lo persistido; no parpadear la tarjeta mientras tanto.
  const [seenVersion, setSeenVersion] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    readLocal<string>(STORAGE_KEY).then((v) => { if (alive) setSeenVersion(v); });
    return () => { alive = false; };
  }, []);

  if (seenVersion === undefined || seenVersion === NOVEDADES_VERSION) return null;

  const dismiss = () => {
    setSeenVersion(NOVEDADES_VERSION);
    writeLocal(STORAGE_KEY, NOVEDADES_VERSION).catch(() => { /* sin storage: queda en memoria */ });
  };

  return (
    <GoldAccentCard style={s.card}>
      <View style={s.head}>
        <MaterialIcons name="campaign" size={16} color={palette.goldText} />
        <Text style={s.eyebrow}>NOVEDADES · TE HABLA NORMAN IA</Text>
      </View>
      {LINEAS.map((l) => (
        <View key={l.slice(0, 24)} style={s.lineRow}>
          <Text style={s.bullet}>·</Text>
          <Text style={s.line}>{l}</Text>
        </View>
      ))}
      <View style={s.actions}>
        <Pressable
          onPress={() => { dismiss(); router.push('/perfil/apariencia' as never); }}
          accessibilityRole="button"
          accessibilityLabel="Abrir Personalizar"
          style={({ pressed }) => [s.cta, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
          <Text style={s.ctaText}>ABRIR PERSONALIZAR</Text>
          <MaterialIcons name="arrow-forward" size={16} color={palette.ink} />
        </Pressable>
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Entendido, cerrar novedades"
          style={({ pressed }) => [s.dismiss, pressed && { opacity: 0.7 }]}>
          <Text style={s.dismissText}>ENTENDIDO</Text>
        </Pressable>
      </View>
    </GoldAccentCard>
  );
}

const s = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: palette.goldText,
    textTransform: 'uppercase',
  },
  lineRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { color: palette.goldText, fontSize: 14, lineHeight: 19 },
  line: { ...typography.body, color: palette.ivory, fontSize: 13, lineHeight: 19, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 44, paddingHorizontal: spacing.lg,
    backgroundColor: palette.gold, borderRadius: radii.sm,
  },
  ctaText: {
    fontFamily: Fonts.display, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.4, color: palette.ink,
  },
  dismiss: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  dismissText: { ...typography.caption, color: palette.smoke, fontSize: 11, letterSpacing: 1 },
});
