import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── Health disclaimer content ───────────────────────────────────────────────
// Texto legal final provisto por el dueño — POLARIS GROWTH INSTITUTE CORP.

interface Section {
  heading: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    heading: '1. Es para bienestar y educación, no atención médica',
    body: [
      'La aplicación LifeFlow / Polaris y todo su contenido (programa, mentor de IA, herramientas de bienestar, interpretaciones de datos biométricos, seguimiento de hábitos, ayuno, suplementación y mediciones) tienen una finalidad exclusivamente informativa, educativa y de desarrollo personal.',
      'La App NO es un dispositivo médico, no presta servicios de salud, no realiza diagnósticos y no sustituye la consulta, el examen, el diagnóstico ni el tratamiento de un profesional de la salud cualificado.',
    ],
  },
  {
    heading: '2. "Norman" es una IA, no un profesional',
    body: [
      'El mentor "Norman" es un sistema de inteligencia artificial generativa. Aunque adopta una voz y una persona, en la App no es una persona real respondiéndole, ni un médico, psicólogo, terapeuta, coach licenciado, nutricionista ni asesor financiero. No se establece ninguna relación profesional-paciente, terapéutica ni de asesoría.',
      'La IA puede equivocarse. Puede generar afirmaciones inexactas, incompletas, desactualizadas o inadecuadas para su situación; sus respuestas no han sido validadas individualmente por un profesional. Sus sugerencias (incluida la "acción para las próximas 24 horas" o herramientas como respiración, escritura terapéutica o tapping) son propuestas generales de bienestar, no indicaciones clínicas.',
    ],
  },
  {
    heading: '3. Los datos biométricos no son diagnósticos',
    body: [
      'Las métricas de wearables (HRV, frecuencia cardíaca en reposo, sueño, recuperación, SpO₂, temperatura, etc.) y las interpretaciones que la App o el mentor hacen de ellas (p. ej. "recuperación baja", "sistema nervioso en conservación", "estrés biométrico") son informativas y orientativas.',
      'No constituyen un diagnóstico médico ni una valoración clínica de su estado de salud. La exactitud depende de dispositivos y APIs de terceros y no está garantizada. No tome decisiones de salud basándose únicamente en estos datos o en su interpretación dentro de la App.',
    ],
  },
  {
    heading: '4. No use la App en emergencias',
    body: [
      'La App no está diseñada para emergencias y no monitoriza ni responde a crisis en tiempo real.',
      'Si usted o alguien más experimenta una emergencia médica, una crisis de salud mental, pensamientos de autolesión o suicidio, o cualquier situación de riesgo vital, deje de usar la App y contacte de inmediato a los servicios de emergencia locales o a una línea de crisis / prevención del suicidio de su localidad.',
      'Recursos de emergencia y crisis:',
      '🇺🇸 Estados Unidos: 911 (emergencias) / 988 (Línea de Prevención del Suicidio y Crisis)',
      '🇲🇽 México: 911 (emergencias) / 800-290-0024 (Línea de la Vida)',
      '🇨🇴 Colombia: 123 (emergencias) / 106 (Línea de Salud Mental)',
      '🇦🇷 Argentina: 911 (emergencias) / 135 o 0800-345-1435 (Centro de Asistencia al Suicida)',
      '🇨🇱 Chile: 131 (emergencias) / *4141 (Salud Responde, línea de salud mental)',
      '🇵🇪 Perú: 106 (línea de salud mental del MINSA)',
      '🇪🇸 España: 112 (emergencias) / 024 (Línea de atención a la conducta suicida)',
      '🇪🇨 Ecuador: 911 (emergencias)',
      'Si su país no aparece en esta lista, contacte a los servicios de emergencia locales marcando el número de emergencia de su país, o busque "línea de prevención del suicidio" junto con el nombre de su país.',
    ],
  },
  {
    heading: '5. Consulte a un profesional antes de actuar',
    body: [
      'Consulte siempre a un médico u otro profesional de la salud cualificado antes de: iniciar, modificar o suspender cualquier tratamiento o medicación; cambiar su dieta, iniciar ayuno intermitente o tomar suplementos; comenzar un nuevo régimen de ejercicio o una práctica intensa de respiración/meditación; o tomar decisiones basadas en sus datos biométricos o en las recomendaciones del mentor.',
      'Esto es especialmente importante si está embarazada o en lactancia, es menor de edad, tiene condiciones cardíacas, respiratorias, metabólicas o psiquiátricas, o toma medicación. Algunas técnicas (p. ej. ciertos ejercicios de respiración o el ayuno) no son adecuadas para todas las personas.',
    ],
  },
  {
    heading: '6. Sin promesa de resultados',
    body: [
      'No garantizamos ningún resultado específico de salud, bienestar, rendimiento, emocional o financiero derivado del uso de la App, del programa o del mentor. Los resultados varían según la persona.',
    ],
  },
  {
    heading: '7. Su responsabilidad',
    body: [
      'El uso que haga de la información de la App es bajo su propia responsabilidad y criterio. En la máxima medida permitida por la ley, POLARIS GROWTH INSTITUTE CORP no será responsable de decisiones tomadas o acciones realizadas con base en el contenido de la App, conforme a la limitación de responsabilidad de los Términos y Condiciones.',
    ],
  },
  {
    heading: '8. Contacto',
    body: [
      'Dudas sobre este descargo: info@polarisgrowthinstitute.com — POLARIS GROWTH INSTITUTE CORP.',
    ],
  },
];

export default function SaludScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">SALUD</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.eyebrow}>DESCARGO DE SALUD Y BIENESTAR</Text>
      <Text style={styles.lead}>
        Este descargo forma parte integrante de los Términos y Condiciones. Léalo con atención antes de usar el mentor IA y las herramientas de salud.
      </Text>

      {/* Emergency callout — info de seguridad crítica, agrupada como un solo nodo accesible. */}
      <View
        style={styles.alertCard}
        accessible
        accessibilityLabel="Advertencia: La App no es para emergencias. Ante una crisis médica o de salud mental, contacte de inmediato a los servicios de emergencia locales.">
        <MaterialIcons name="warning-amber" size={18} color={palette.danger} />
        <Text style={styles.alertText}>
          La App no es para emergencias. Ante una crisis médica o de salud mental, contacte de inmediato a los servicios de emergencia locales.
        </Text>
      </View>

      {/* Meta block */}
      <View style={styles.metaCard}>
        <Text style={styles.metaLine}>Titular: POLARIS GROWTH INSTITUTE CORP</Text>
        <Text style={styles.metaLine}>Contacto: info@polarisgrowthinstitute.com</Text>
        <Text style={styles.metaLine}>Última actualización: 22 de julio de 2026</Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <GoldDivider />
          <Text style={styles.heading} accessibilityRole="header">{section.heading}</Text>
          {section.body.map((paragraph, i) => (
            <Text key={i} style={styles.paragraph}>{paragraph}</Text>
          ))}
        </View>
      ))}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },

  eyebrow: { ...typography.label, color: palette.goldText },
  lead: { ...typography.body, color: palette.ash, lineHeight: 22 },

  alertCard: {
    alignItems: 'center',
    backgroundColor: palette.dangerMuted,
    borderColor: palette.danger + '55',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  alertText: { ...typography.body, color: palette.ivory, flex: 1, fontSize: 13, lineHeight: 19 },

  metaCard: {
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  metaLine: { ...typography.mono, color: palette.smoke, fontSize: 11, lineHeight: 17 },

  section: { gap: spacing.sm },
  heading: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  paragraph: { ...typography.body, color: palette.ash, lineHeight: 22 },
});
