// ─── ErrorBoundary — captura de crashes de render a nivel raíz ────────────────
// Evita la "pantalla blanca de la muerte": si cualquier parte del árbol lanza
// durante el render, mostramos un fallback de marca + botón de reintento, y
// capturamos el error (consola siempre; analytics best-effort si hay consentimiento).
//
// El fallback NO depende de ningún contexto (tema, LifeFlow): usa solo tokens
// estáticos y primitivas de RN, así funciona aunque el crash venga de un provider.

import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette, radii, spacing } from '@/constants/theme';
import { analytics } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    // Captura fiable: siempre va a consola (la recogería cualquier crash reporter futuro).
    console.error('[ErrorBoundary] crash capturado:', message, stack, info?.componentStack);
    // Best-effort: si hay usuario + consentimiento ML, registra el crash. Nunca debe
    // romper el fallback, por eso va en try/catch.
    try {
      analytics.track('app_crash', {
        message,
        component_stack: (info?.componentStack ?? '').slice(0, 1000),
        platform: Platform.OS,
      });
    } catch {
      /* noop */
    }
  }

  handleReset = () => {
    // En web, recargar es la recuperación más limpia (re-monta todo el árbol).
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    // En nativo, limpiamos el estado de error para re-montar a los hijos.
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.mark}>POLARIS</Text>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.body}>
            Tuvimos un problema inesperado. Tus datos están a salvo. Puedes reintentar
            y continuar donde estabas.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
          >
            <Text style={styles.buttonText}>REINTENTAR</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.md,
  },
  mark: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 4,
    color: palette.gold,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: palette.ivory,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: palette.ash,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    height: 52,
    paddingHorizontal: spacing.xl,
    minWidth: 200,
    borderRadius: radii.md,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 2,
    color: palette.black,
  },
});
