/**
 * useReducedMotion — preferencia de accesibilidad (Apple HIG · WCAG 2.3.3).
 *
 * Se testea porque su modo de fallo es silencioso: si el hook devolviera `true`
 * por defecto, TODA la app se quedaría sin animación y nadie lo notaría en
 * code review; si nunca escuchara cambios, quien active la preferencia con la
 * app abierta seguiría viendo bucles infinitos.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

describe('useReducedMotion', () => {
  let listener: ((v: boolean) => void) | null = null;
  const remove = jest.fn();

  beforeEach(() => {
    listener = null;
    remove.mockClear();
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_event: string, cb: (v: boolean) => void) => {
        listener = cb;
        return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it('arranca en false para no matar la animación antes de saber la preferencia', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('refleja la preferencia del sistema cuando está activada', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('reacciona si el usuario cambia la preferencia con la app abierta', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(listener).not.toBeNull());

    act(() => listener!(true));
    expect(result.current).toBe(true);
  });

  it('si la consulta falla, anima igual en vez de romper la pantalla', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('se desuscribe al desmontar', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { unmount } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(listener).not.toBeNull());
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
