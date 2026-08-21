import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ComandoModeProps } from '@/components/comando-modes/types';
import { HeroPanel } from '@/components/focus-deck';
import { palette, radii, spacing, typography, Fonts } from '@/constants/theme';

export default function EsencialMode(props: ComandoModeProps) {
  return (
    <HeroPanel>
      <View style={s.wrap}>
        <Text style={s.eyebrow}>{props.eyebrow}</Text>
        <Text style={s.statement}>{props.directiveReason || props.statement}</Text>
        <Pressable style={s.button} onPress={props.onDirective}>
          <Text style={s.buttonText}>{props.directiveTitle}</Text>
        </Pressable>
        <Pressable style={s.link} onPress={props.onOpenNorman}>
          <Text style={s.linkText}>o habla con Norman</Text>
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
  button: {
    minHeight: 52,
    minWidth: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    color: palette.ink,
    textTransform: 'uppercase',
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
