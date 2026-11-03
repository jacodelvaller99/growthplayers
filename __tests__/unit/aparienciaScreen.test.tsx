import { fireEvent, render, screen } from '@testing-library/react-native';

const mockSetMode = jest.fn();
let mockCanToggle = true;
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({ mode: 'dark', setMode: mockSetMode, signal: 'oro', setSignal: jest.fn(), canToggle: mockCanToggle }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    GoldDivider: () => R.createElement(RN.View),
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/hooks/use-app-mode', () => ({
  APP_MODES: [{ id: 'especifico', label: 'Específico', description: 'Todo el detalle' }],
  useAppMode: () => ({ mode: 'especifico', setMode: jest.fn() }),
}));

import AparienciaScreen from '@/app/perfil/apariencia';

describe('Apariencia — pocas decisiones a la vista', () => {
  it('web: claro/oscuro arriba, las paletas plegadas hasta pedirlas', () => {
    mockCanToggle = true;
    render(<AparienciaScreen />);
    fireEvent.press(screen.getByLabelText('Claro'));
    expect(mockSetMode).toHaveBeenCalledWith('light');
    expect(screen.queryByText('Pizarra')).toBeNull();
    fireEvent.press(screen.getByText('Más paletas'));
    expect(screen.getByText('Pizarra')).toBeTruthy();
  });

  it('app nativa: no muestra controles de color que no funcionan', () => {
    mockCanToggle = false;
    render(<AparienciaScreen />);
    expect(screen.queryByLabelText('Claro')).toBeNull();
    expect(screen.queryByText('Más paletas')).toBeNull();
    expect(screen.getByText(/el color es fijo/)).toBeTruthy();
  });
});
