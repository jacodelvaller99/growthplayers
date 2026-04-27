// Manual mock for @shopify/react-native-skia
// This module uses native code that is unavailable in the Jest environment.

const mockPath = {
  moveTo: jest.fn(),
  cubicTo: jest.fn(),
  lineTo: jest.fn(),
  close: jest.fn(),
};

export const Skia = {
  Path: {
    Make: jest.fn(() => ({ ...mockPath })),
  },
};

export const Canvas = 'Canvas';
export const Path = 'Path';
export const LinearGradient = 'LinearGradient';
export const vec = (x: number, y: number) => ({ x, y });
export const usePathInterpolation = jest.fn(() => null);
export const useSharedValue = jest.fn((v: any) => ({ value: v }));
export const withTiming = jest.fn((v: any) => v);
export const useAnimatedReaction = jest.fn();
export const useAnimatedStyle = jest.fn(() => ({}));
export const runOnJS = jest.fn((fn: any) => fn);
export const withRepeat = jest.fn((v: any) => v);
