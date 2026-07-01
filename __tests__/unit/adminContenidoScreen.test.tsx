/**
 * Render smoke test de Admin Contenido (loop de pulido, iteración 50).
 * Banner de privacidad + tabs (diarios/conversaciones) + JournalCard + ConvThread agrupado por usuario.
 * Monta con diarios y conversaciones poblados sin throw (libs admin mockeadas).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/lib/admin/queries', () => ({
  fetchJournalEntries: jest.fn().mockResolvedValue([
    { id: 'j1', user_id: 'user-abcd1234', user_name: 'Ana', content: 'Hoy medité 20 minutos y me sentí en calma.', mood: 8, entry_type: 'reflexion', created_at: '2026-06-30T10:00:00Z' },
  ]),
  fetchMentorConversations: jest.fn().mockResolvedValue([
    { id: 'c1', user_id: 'user-abcd1234', user_name: 'Ana', role: 'user', content: 'Norman, ¿cómo bajo el estrés?', created_at: '2026-06-30T11:00:00Z' },
    { id: 'c2', user_id: 'user-abcd1234', user_name: 'Ana', role: 'assistant', content: 'Empecemos por tu respiración...', created_at: '2026-06-30T11:01:00Z' },
  ]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ContenidoScreen = require('@/app/admin/contenido/index').default;

describe('ContenidoScreen (admin) — render smoke', () => {
  it('banner + tabs + diarios + conversaciones renderiza sin throw', () => {
    expect(() => render(<ContenidoScreen />)).not.toThrow();
  });
});
