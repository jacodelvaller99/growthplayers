import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/polaris';
import { Colors, Fonts, spacing } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { AI_PROVIDERS_LABEL, acceptAiConsent, isAiConsentGranted, subscribeAiConsent } from '@/lib/aiConsent';

/** Apple 5.1.2(i): sin permiso explícito no se muestra la función de IA (ni sale ningún dato). */
export function AiConsentGate({ children }: { children: ReactNode }) {
  const { userId } = useLifeFlow();
  const router = useRouter();
  const [granted, setGranted] = useState(isAiConsentGranted());
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAiConsent(setGranted), []);

  if (granted) return <>{children}</>;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Antes de hablar con la IA</Text>
      <Text style={s.body}>
        Norman y el resto de funciones de IA envían tus mensajes y el contexto necesario (tu Norte, check-ins y
        datos de uso) a proveedores externos: {AI_PROVIDERS_LABEL}. Ellos procesan el texto para responderte.
      </Text>
      <Text style={s.body}>
        Solo ocurre si lo autorizas. Puedes retirar el permiso cuando quieras escribiendo a
        ncapuozzo@polarisgrowthinstitute.com. Detalle en la Política de Privacidad.
      </Text>
      <PrimaryButton
        label={busy ? 'GUARDANDO…' : 'AUTORIZO'}
        disabled={busy || !userId}
        onPress={async () => {
          if (!userId) return;
          setBusy(true);
          await acceptAiConsent(userId);
          setBusy(false);
        }}
      />
      <SecondaryButton label="Leer política de privacidad" onPress={() => router.push('/legal/privacidad')} />
      <SecondaryButton label="Ahora no" onPress={() => router.back()} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: spacing.xl, gap: spacing.lg, justifyContent: 'center', flexGrow: 1 },
  title: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 22, color: Colors.dark.text },
  body: { fontSize: 15, lineHeight: 22, color: Colors.dark.text },
});
