import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, radii } from '@/constants/theme';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>SYSTEM MODAL</ThemedText>
      <ThemedText style={styles.subtitle}>Advanced operations panel</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText style={styles.linkText}>← RETURN TO COMMAND</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.icon,
    marginTop: 8,
  },
  link: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  linkText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.dark.tint,
    fontWeight: '600',
  },
});
