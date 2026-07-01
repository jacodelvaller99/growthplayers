/**
 * Render smoke test de Admin Ranking (ponderación explicable de usuarios)
 * (loop de pulido, iteración 57). Chips de dimensión + filas con puesto/score/
 * percentil/driver dominante + barra de score. Tap → dossier.
 * Monta con filas pobladas sin throw (fetchUserRanking mockeado; la lógica pura
 * userRankingLogic se carga REAL — sin deps nativas).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
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
jest.mock('@/lib/userRanking', () => ({
  fetchUserRanking: jest.fn().mockResolvedValue([
    { id: 'u1', rank: 1, name: 'Ana', score: 82, percentile: 95, topDriver: { label: 'Bienestar' } },
    { id: 'u2', rank: 2, name: 'Beto', score: 60, percentile: 60, topDriver: null },
    { id: 'u3', rank: 3, name: 'Caro', score: 28, percentile: 10, topDriver: { label: 'Retención' } },
  ]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminRankingScreen = require('@/app/admin/ranking').default;

describe('AdminRankingScreen (admin) — render smoke', () => {
  it('chips de dimensión + filas rankeadas renderiza sin throw', async () => {
    render(<AdminRankingScreen />);
    // El sub "Lidera: Bienestar · percentil 95" solo aparece con el ranking cargado.
    await waitFor(() => expect(screen.getByText('Lidera: Bienestar · percentil 95')).toBeTruthy());
  });
});
