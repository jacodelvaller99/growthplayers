/**
 * WellnessMiniPlayer — botón PAUSA junto al STOP existente.
 *
 * POR QUÉ ESTE TEST: antes solo había un indicador de "reanudar" cuando la
 * sesión ya estaba pausada, pero NADA para pausarla desde el mini-player en
 * primer lugar — así que RESUME nunca tenía nada real que hacer para una
 * sesión de Sueño (`useBinauralEngine` no registraba pause/resume, solo
 * stop). Este test fija que el botón correcto aparece según el estado y llama
 * a la función del registro central, no a un estado local.
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { WellnessMiniPlayer } from '@/components/WellnessMiniPlayer';
import type { SessionType } from '@/store/wellnessStore';

let mockPlayer: {
  isPlaying: boolean;
  isPaused: boolean;
  type: SessionType;
  sessionName: string;
  elapsedSeconds: number;
  targetSeconds: number;
} = {
  isPlaying: true,
  isPaused: false,
  type: 'binaural',
  sessionName: 'Sesión de prueba',
  elapsedSeconds: 10,
  targetSeconds: 60,
};

const mockPause = jest.fn();
const mockResume = jest.fn();
const mockStop = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: <T,>(selector: (s: { player: typeof mockPlayer }) => T): T =>
    selector({ player: mockPlayer }),
}));
jest.mock('@/hooks/useBinauralEngine', () => ({
  pauseWellnessSession: () => mockPause(),
  resumeWellnessSession: () => mockResume(),
  stopWellnessSession: () => mockStop(),
}));

beforeEach(() => {
  mockPause.mockClear();
  mockResume.mockClear();
  mockStop.mockClear();
  mockPush.mockClear();
});

describe('WellnessMiniPlayer — controles', () => {
  it('sonando (no pausado): muestra PAUSA, no RESUME, y llama a pauseWellnessSession', () => {
    mockPlayer = { ...mockPlayer, isPlaying: true, isPaused: false };
    const { getByTestId, queryByTestId } = render(<WellnessMiniPlayer />);

    expect(queryByTestId('wellness-mini-resume')).toBeNull();
    fireEvent.press(getByTestId('wellness-mini-pause'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('pausado: muestra RESUME, no PAUSA, y llama a resumeWellnessSession', () => {
    mockPlayer = { ...mockPlayer, isPlaying: false, isPaused: true };
    const { getByTestId, queryByTestId } = render(<WellnessMiniPlayer />);

    expect(queryByTestId('wellness-mini-pause')).toBeNull();
    fireEvent.press(getByTestId('wellness-mini-resume'));
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('STOP siempre presente y llama a stopWellnessSession en cualquier estado', () => {
    mockPlayer = { ...mockPlayer, isPlaying: true, isPaused: false };
    const { getByTestId } = render(<WellnessMiniPlayer />);

    fireEvent.press(getByTestId('wellness-mini-stop'));
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it('sin sesión activa (ni playing ni paused), no renderiza nada', () => {
    mockPlayer = { ...mockPlayer, isPlaying: false, isPaused: false };
    const { queryByTestId } = render(<WellnessMiniPlayer />);

    expect(queryByTestId('wellness-mini-stop')).toBeNull();
  });

  it('sesión de sueño: no dice BINAURAL y navega a /bienestar/sueno, no a binaurales', () => {
    // Antes `useBinauralEngine` mandaba type:'binaural' para CUALQUIER sesión
    // que lanzara, incluida Sueño (su único llamador real) — el mini-player
    // mostraba "BINAURAL" y, al tocarlo, mandaba a /bienestar/binaurales
    // mientras sonaba una sesión de sueño.
    mockPlayer = { ...mockPlayer, isPlaying: true, isPaused: false, type: 'sleep' };
    const { getByText, getByTestId } = render(<WellnessMiniPlayer />);

    expect(getByText(/SLEEP/)).toBeTruthy();

    fireEvent.press(getByTestId('wellness-mini-card'));
    expect(mockPush).toHaveBeenCalledWith('/bienestar/sueno');
  });
});
