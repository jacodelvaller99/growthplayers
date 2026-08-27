import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ComandoModeProps } from '@/components/comando-modes/types';
import { HeroPanel } from '@/components/focus-deck';
import { PrimaryButton } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';

export default function EsencialMode(props: ComandoModeProps) {
  return (
    <HeroPanel>
      <View style={s.wrap}>
        <Text style={s.eyebrow}>{props.eyebrow}</Text>
        <Text style={s.statement}>{props.directiveReason || props.statement}</Text>
        <View style={s.buttonWrap}>
          <PrimaryButton label={props.directiveTitle} onPress={props.onDirective} />
        </View>
        <Pressable style={s.link} onPress={props.onOpenNorman}>
          <Text style={s.linkText}>o habla con Norman IA</Text>
        </Pressable>
      </View>
    </HeroPanel>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  eyebrow: {
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: palette.goldText,
    textAlign: 'center',
  },
  statement: {
    fontFamily: Fonts.display,
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 34,
    color: palette.ivory,
    textAlign: 'center',
  },
  // PrimaryButton no acepta `style`: el wrapper es lo que lo estira a todo
  // el ancho del héroe (antes era `alignSelf: 'stretch'` en el Pressable a mano).
  buttonWrap: {
    alignSelf: 'stretch',
  },
  link: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  linkText: {
    ...typography.caption,
    color: palette.smoke,
    textDecorationLine: 'underline',
  },
});
