/**
 * showAlert — drop-in replacement for RN's Alert.alert.
 * Alert.alert() is a no-op on react-native-web (no native dialog exists there),
 * so every confirm/info dialog silently did nothing on web. This branches to
 * window.confirm/window.alert on web, Alert.alert elsewhere.
 */
import { Alert, Platform } from 'react-native';

type AlertButton = { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const full = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length <= 1) {
      window.alert(full);
      buttons?.[0]?.onPress?.();
      return;
    }
    const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
    if (window.confirm(full)) confirmBtn.onPress?.();
    return;
  }
  Alert.alert(title, message, buttons);
}
