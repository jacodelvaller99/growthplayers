/**
 * app/(auth)/welcome.tsx — primera pantalla para quien no tiene sesión.
 *
 * Diseño "Entrar" del canvas: una frase, una acción. La estrella grande queda
 * de fondo; en escritorio la lleva el panel amarillo de AccessFrame.
 * Polaris es solo para clientes: no hay registro libre ni demo.
 *   ENTRAR                       → entrar
 *   Tengo un código de mi coach  → crear cuenta (código obligatorio)
 */
import { useRouter } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { AccessFrame, AccessLink } from '@/components/auth/AccessFrame';
import { PrimaryButton } from '@/components/polaris';
import { fitDisplaySize, spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isDesktop } = useBreakpoint();
  // "Encuentra" (9 letras) es la palabra más larga: en 390 px a 52 no cabía.
  const titleSize = isDesktop ? 52 : fitDisplaySize(width - spacing.lg * 2, 9, 52);

  const goRegister = () =>
    router.replace({ pathname: '/(auth)', params: { mode: 'register' } } as never);
  const goLogin = () => router.replace('/(auth)' as never);

  return (
    <AccessFrame
      meta="POLARIS"
      metaRight="90 DÍAS"
      backdropStar
      title={'Encuentra\ntu Norte.'}
      titleSize={titleSize}
      sub={'Persigue el estado, no el resultado.\nSolo para clientes de Polaris Growth Institute.'}
      bottom={
        <>
          <PrimaryButton label="ENTRAR" icon="arrow-forward" onPress={goLogin} />
          <AccessLink label="Tengo un código de mi coach" onPress={goRegister} />
        </>
      }
    />
  );
}
