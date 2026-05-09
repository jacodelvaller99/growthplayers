/**
 * CMI LifeFlow — ConfirmModal
 *
 * Cross-platform replacement for Alert.alert().
 * Renders as a centered modal overlay with title, body, confirm + cancel buttons.
 *
 * Usage:
 *   <ConfirmModal
 *     visible={confirmVisible}
 *     title="Cancelar membresía"
 *     body="¿Estás seguro de que quieres cancelar esta membresía? El usuario perderá acceso."
 *     confirmLabel="SÍ, CANCELAR"
 *     danger
 *     onConfirm={handleCancel}
 *     onCancel={() => setConfirmVisible(false)}
 *   />
 */

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { DangerButton, PrimaryButton, SecondaryButton } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button instead of gold */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel = 'CONFIRMAR',
  cancelLabel  = 'CANCELAR',
  danger       = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={onCancel}>
        {/* Panel — stops backdrop tap propagation */}
        <Pressable style={s.panel} onPress={e => e.stopPropagation()}>
          <View style={s.topAccent} />
          <View style={s.content}>
            <Text style={s.title}>{title}</Text>
            {body ? <Text style={s.body}>{body}</Text> : null}
            <View style={s.actions}>
              <View style={s.actionItem}>
                <SecondaryButton label={cancelLabel} onPress={onCancel} />
              </View>
              <View style={s.actionItem}>
                {danger ? (
                  <DangerButton label={confirmLabel} onPress={onConfirm} />
                ) : (
                  <PrimaryButton label={confirmLabel} onPress={onConfirm} />
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  panel: {
    backgroundColor: palette.graphiteLight,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: palette.blackDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
  },
  topAccent: {
    height: 3,
    backgroundColor: palette.gold,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: palette.ivory,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  body: {
    ...typography.body,
    color: palette.ash,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionItem: {
    flex: 1,
  },
});
