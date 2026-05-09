/**
 * CMI LifeFlow — Global Toast System
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast('Guardado con éxito', 'success');
 *   showToast('No se pudo conectar', 'error');
 *
 * Provider: wrap _layout.tsx with <ToastProvider>
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ─── Single Toast item ────────────────────────────────────────────────────────

const TOAST_DURATION = 3000;
const ANIM_DURATION  = 220;

const TONE_COLORS: Record<ToastType, string> = {
  success: palette.success,
  error:   palette.danger,
  warning: palette.warning,
  info:    palette.gold,
};

const TONE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'i',
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: ANIM_DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => dismiss(), TOAST_DURATION);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: ANIM_DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: ANIM_DURATION, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  const accentColor = TONE_COLORS[toast.type];

  return (
    <Animated.View style={[s.toast, { transform: [{ translateY }], opacity }]}>
      <Pressable onPress={dismiss} style={s.toastInner} accessibilityRole="alert">
        <View style={[s.toastAccent, { backgroundColor: accentColor }]} />
        <View style={[s.toastIcon, { backgroundColor: accentColor + '22' }]}>
          <Text style={[s.toastIconText, { color: accentColor }]}>
            {TONE_ICONS[toast.type]}
          </Text>
        </View>
        <Text style={s.toastMessage} numberOfLines={2}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Container (renders above everything) ────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[s.container, { top: insets.top + (Platform.OS === 'web' ? 12 : 8) }]}
      pointerEvents="box-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let _idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++_idCounter}`;
    setToasts(prev => [...prev.slice(-2), { id, message, type }]); // max 3 visible
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    gap: spacing.sm,
    alignItems: 'center',
    pointerEvents: 'box-none',
  } as any,

  toast: {
    width: '100%',
    maxWidth: 420,
    shadowColor: palette.blackDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.graphiteLight,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    minHeight: 52,
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  toastAccent: {
    width: 3,
    alignSelf: 'stretch',
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  toastIconText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
  },
  toastMessage: {
    ...typography.body,
    color: palette.ivory,
    flex: 1,
    fontSize: 13,
  },
});
