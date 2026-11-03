/**
 * Polaris y LifeFlow comparten cuentas (mismo proyecto Supabase). Una cuenta
 * solo de LifeFlow que inicia sesión aquí cae en esta pantalla y en ninguna
 * otra: `MainStack` (app/_layout.tsx) le cierra onboarding y rutas privadas.
 * Regla en lib/accountScopeLogic.ts.
 */
import { Redirect } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { PolarisLogo } from '@/components/PolarisLogo';
import { PrimaryButton, SecondaryButton } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

const LIFEFLOW_URL = 'https://lifeflowapp.vercel.app';

export default function CuentaLifeFlow() {
  const { isLifeFlowOnly, signOut } = useLifeFlow();

  // Sin sesión, o cuenta de Polaris: esta pantalla no es para ti. Tras
  // "Cerrar sesión" esto también lleva de vuelta a la bienvenida.
  if (isLifeFlowOnly !== true) return <Redirect href={'/' as never} />;

  return (
    <View style={s.screen}>
      <View style={s.content}>
        <PolarisLogo size={40} color={palette.gold} />
        <Text style={s.title} accessibilityRole="header">Esta cuenta es de LifeFlow</Text>
        <Text style={s.body}>
          Iniciaste sesión con una cuenta de LifeFlow. Polaris es un programa aparte y esta cuenta no tiene acceso a él.
        </Text>
        <Text style={s.body}>
          Tu progreso en LifeFlow sigue intacto. Si eres cliente de Polaris y crees que es un error, escríbele a tu mentor.
        </Text>
        <View style={s.actions}>
          <PrimaryButton label="IR A LIFEFLOW" icon="open-in-new" onPress={() => { void Linking.openURL(LIFEFLOW_URL); }} />
          <SecondaryButton label="CERRAR SESIÓN" icon="logout" onPress={() => { void signOut(); }} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    fontFamily: Fonts.display,
    color: palette.ivory,
  },
  body: {
    ...typography.body,
    color: palette.ivoryDim,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
