/**
 * Render smoke test de Restablecer Contraseña web (loop de pulido, iteración 43).
 * Detecta sesión de recuperación (PASSWORD_RECOVERY) → nueva contraseña + confirmar.
 * Monta la rama inicial (sin sesión → estado "abre desde el enlace") sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    PolarisMark: () => R.createElement(RN.View),
    PremiumInput: (p: object) => R.createElement(RN.TextInput, p),
    PrimaryButton: Btn, SecondaryButton: Btn,
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
      updateUser: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ResetPasswordScreen = require('@/app/(auth)/reset-password').default;

describe('ResetPasswordScreen — render smoke', () => {
  it('rama inicial (sin sesión de recuperación) renderiza sin throw', () => {
    expect(() => render(<ResetPasswordScreen />)).not.toThrow();
  });
});
