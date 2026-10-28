/**
 * Paywall + Pricing en iOS SIN compras (default: EXPO_PUBLIC_IOS_PURCHASES_ENABLED
 * no definido). Regla 3.1.1 de App Store: ni precios, ni botón de compra, ni
 * "restaurar", ni vía de pago externa. Solo el canje del código del Navegador.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform, Text } from 'react-native';

(Platform as { OS: string }).OS = 'ios';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: mockPush }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'l', Medium: 'm' }, NotificationFeedbackType: { Success: 's', Error: 'e' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AppHeader: () => R.createElement(RN.View), GoldDivider: () => R.createElement(RN.View),
    PremiumCard: V, PrimaryButton: Btn, SecondaryButton: Btn,
    PressableScale: RN.Pressable, SkeletonBar: V,
    screen: {}, useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/data/testimonials', () => ({ TESTIMONIALS: [], VERIFIED_TESTIMONIALS: [] }));
jest.mock('@/lib/webLeads', () => ({ captureWebLead: jest.fn(), isValidEmail: () => true }));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ state: { subscriptionTier: 'free' }, userId: 'u-test', refreshTier: jest.fn() }),
}));
jest.mock('@/lib/admin/actions', () => ({ redeemAccessCode: jest.fn() }));
const mockGetOfferings = jest.fn().mockResolvedValue({
  current: { availablePackages: [{ packageType: 'ANNUAL', product: { priceString: '$99.99', title: 'Anual' } }] },
});
jest.mock('@/services/revenuecat', () => ({
  getOfferings: (...a: unknown[]) => mockGetOfferings(...a),
  purchasePackage: jest.fn(), restorePurchases: jest.fn(), checkSubscription: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PaywallScreen = require('@/app/paywall').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PricingScreen = require('@/app/pricing').default;

function allText(tree: ReturnType<typeof render>): string {
  return tree.root.findAllByType(Text).flatMap((n) =>
    Array.isArray(n.props.children) ? n.props.children : [n.props.children],
  ).filter((c): c is string => typeof c === 'string').join(' ');
}

const FORBIDDEN = [/SUSCRIB/i, /Restaurar/i, /PRECIO/i, /\$\d/, /Apple ID/, /App Store/, /A medida/, /ASESOR/];

describe('iOS sin compras (regla 3.1.1)', () => {
  it('paywall: sin compra, sin restaurar, sin precios; ofrece el código', () => {
    const tree = render(<PaywallScreen />);
    const text = allText(tree);
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
    expect(text).toContain('INGRESAR MI CÓDIGO');
    expect(mockGetOfferings).not.toHaveBeenCalled();
    tree.getByText('INGRESAR MI CÓDIGO').props.onPress();
    expect(mockPush).toHaveBeenCalledWith('/pricing');
  });

  it('pricing: sin planes con precio ni CTA comercial; queda el canje', () => {
    const tree = render(<PricingScreen />);
    const text = allText(tree);
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
    expect(text).toContain('TU ACCESO');
    expect(text).toContain('CANJEAR');
    expect(mockGetOfferings).not.toHaveBeenCalled();
  });
});
