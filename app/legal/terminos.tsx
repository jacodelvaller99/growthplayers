import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── Terms of service content ────────────────────────────────────────────────
// Summarized faithfully from docs/launch/legal/TERMS_OF_SERVICE_DRAFT.md.
// [PLACEHOLDERS] are intentionally visible so the team fills them before launch.

interface Section {
  heading: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    heading: '1. Objeto del servicio',
    body: [
      'La App es una herramienta de acompañamiento de alto rendimiento personal, educación y bienestar. Incluye un programa estructurado ("Protocolo Soberano"), un mentor de inteligencia artificial ("Norman"), herramientas de bienestar (meditación, respiración, binaurales, diario, tapping, etc.), seguimiento de hábitos y de métricas biométricas, y una comunidad.',
      'La App no es un producto sanitario, ni un dispositivo médico, ni un servicio de atención de salud, psicológica o de emergencia. Ver la sección 4 y el Descargo de Salud y Bienestar.',
    ],
  },
  {
    heading: '2. Elegibilidad y cuenta',
    body: [
      'Debe ser mayor de [18] años y tener capacidad legal para contratar.',
      'Usted es responsable de la veracidad de los datos que proporciona y de mantener la confidencialidad de sus credenciales. Toda actividad realizada desde su cuenta se le atribuye.',
      'Algunas funciones pueden requerir un código de acceso o invitación. El uso indebido o la distribución no autorizada de códigos puede conllevar la suspensión.',
    ],
  },
  {
    heading: '3. Licencia de uso',
    body: [
      'Le concedemos una licencia limitada, personal, no exclusiva, intransferible y revocable para usar la App para fines personales y no comerciales, conforme a estos Términos.',
      'No podrá: copiar, modificar o realizar ingeniería inversa de la App; revender, sublicenciar o explotar comercialmente el contenido o el método; extraer datos masivamente (scraping); eludir medidas de seguridad, límites de uso o muros de pago; ni usar la App para fines ilícitos o que infrinjan derechos de terceros.',
    ],
  },
  {
    heading: '4. NO es consejo médico ni profesional',
    body: [
      'El mentor "Norman" es un sistema de inteligencia artificial, no una persona real, ni un médico, psicólogo, terapeuta, nutricionista, entrenador licenciado ni profesional de la salud o financiero. No existe relación profesional-paciente ni profesional-cliente.',
      'Todo el contenido —incluidas las respuestas del mentor IA, las recomendaciones de bienestar, las interpretaciones de datos biométricos y las "próximas acciones" sugeridas— tiene carácter exclusivamente informativo y educativo. No constituye diagnóstico, tratamiento, prescripción ni consejo médico, psicológico, nutricional, financiero ni legal.',
      'No use la App para emergencias. Si usted o un tercero está en una situación de riesgo, crisis de salud mental, ideación suicida o emergencia médica, contacte de inmediato a los servicios de emergencia locales o a una línea de crisis.',
      'Consulte siempre a un profesional cualificado antes de tomar decisiones de salud, iniciar o suspender tratamientos, cambiar su dieta, suplementación o régimen de ayuno, o tomar decisiones financieras.',
    ],
  },
  {
    heading: '5. Inteligencia artificial — exactitud no garantizada',
    body: [
      'Las respuestas del mentor se generan mediante modelos de IA de terceros (NVIDIA, Groq, OpenAI). La IA puede producir información incorrecta, incompleta, desactualizada o inapropiada ("alucinaciones").',
      'Usted es el único responsable de evaluar y verificar la idoneidad de cualquier sugerencia antes de actuar. No garantizamos la exactitud, fiabilidad ni resultados derivados del uso del mentor IA ni del programa.',
      'La App genera perfiles e inferencias automatizadas (engagement, riesgo de abandono, anomalías, cohortes). Son estimaciones estadísticas, no juicios definitivos sobre usted. Puede oponerse conforme a la Política de Privacidad.',
    ],
  },
  {
    heading: '6. Datos de wearables y biométricos',
    body: [
      'Si conecta un wearable (Oura Ring, WHOOP), autoriza la importación y el tratamiento de sus datos biométricos según la Política de Privacidad.',
      'Los datos biométricos provienen de dispositivos y APIs de terceros. No garantizamos su exactitud, disponibilidad ni continuidad. Las interpretaciones que la App o el mentor hacen de ellos son orientativas y no diagnósticas.',
    ],
  },
  {
    heading: '7. Suscripciones, pagos y cancelación',
    body: [
      'La App ofrece un nivel gratuito con funciones limitadas y uno o más niveles de pago con funciones ampliadas.',
      'Procesamiento de pagos: las suscripciones se contratan y cobran a través de las tiendas de aplicaciones (Apple App Store / Google Play) y se gestionan mediante RevenueCat. No recibimos ni almacenamos los datos de su tarjeta. El cargo, la moneda y los impuestos se rigen por su tienda.',
      'Renovación automática: salvo indicación en contrario, las suscripciones se renuevan automáticamente al final de cada periodo, al precio vigente, salvo que las cancele al menos 24 horas antes de la renovación.',
      'Cancelación: puede cancelar la renovación en cualquier momento desde la configuración de suscripciones de su cuenta de la tienda (Apple / Google). La cancelación surte efecto al final del periodo ya pagado; conservará el acceso hasta esa fecha.',
      'Reembolsos: las solicitudes de reembolso se rigen por las políticas de la tienda correspondiente (Apple / Google).',
      'Cambios de precio: podremos modificar precios y planes; los cambios se comunicarán y aplicarán a periodos de renovación posteriores.',
    ],
  },
  {
    heading: '8. Contenido del usuario y comunidad',
    body: [
      'Usted conserva la titularidad del contenido que crea (diario, tareas, publicaciones de comunidad, mensajes). Nos concede una licencia limitada para almacenar y procesar dicho contenido con el fin de prestar el servicio (incluida la personalización y la memoria del mentor IA), conforme a la Política de Privacidad.',
      'El contenido que publique en la comunidad puede ser visible para otras personas usuarias de la App. No publique información que no desee compartir. Es responsable del contenido que publica.',
      'No publicará contenido ilegal, difamatorio, que incite al odio o la violencia, que acose, que infrinja derechos de terceros, que contenga datos personales de otros sin permiso, ni spam. Podemos moderar, ocultar o eliminar contenido y restringir funciones de comunidad.',
    ],
  },
  {
    heading: '9. Uso aceptable y suspensión',
    body: [
      'Nos reservamos el derecho de suspender o terminar su cuenta, con o sin previo aviso, si: incumple estos Términos; hace un uso abusivo, fraudulento o que comprometa la seguridad o el rendimiento del servicio o de otros usuarios; abusa del mentor IA (p. ej. manipulación, extracción de prompts, volumen anómalo); o lo exige la ley.',
      'Tras la terminación, su licencia cesa. Las disposiciones que por su naturaleza deban sobrevivir (propiedad intelectual, limitación de responsabilidad, ley aplicable) continuarán vigentes.',
    ],
  },
  {
    heading: '10. Propiedad intelectual',
    body: [
      'La App, su marca, el Método Polaris, los módulos, lecciones, textos, diseño, la voz y persona del mentor, y demás materiales son propiedad de [RAZÓN SOCIAL] o de sus licenciantes, y están protegidos por derechos de propiedad intelectual.',
      'Estos Términos no le transfieren ningún derecho de propiedad sobre la App ni el contenido, salvo la licencia limitada de la sección 3. Las marcas y contenidos de terceros pertenecen a sus respectivos titulares.',
    ],
  },
  {
    heading: '11. Privacidad y datos',
    body: [
      'El tratamiento de sus datos personales se rige por la Política de Privacidad, que forma parte de estos Términos, e incluye el tratamiento de datos sensibles/biométricos y la elaboración de perfiles mediante IA. Puede solicitar la eliminación de su cuenta desde la App o por correo.',
    ],
  },
  {
    heading: '12. Disponibilidad y cambios del servicio',
    body: [
      'La App se ofrece "tal cual" y "según disponibilidad". Podemos modificar, suspender o discontinuar funciones (incluido el mentor IA, integraciones de wearables o módulos) en cualquier momento.',
      'No garantizamos disponibilidad ininterrumpida ni ausencia de errores. Podemos realizar mantenimientos que afecten temporalmente el servicio.',
    ],
  },
  {
    heading: '13. Exención de garantías',
    body: [
      'En la máxima medida permitida por la ley, la App y todo su contenido se proporcionan sin garantías de ningún tipo, expresas o implícitas, incluidas las de comerciabilidad, idoneidad para un fin particular, exactitud y no infracción. No garantizamos que la App, el mentor IA o el programa produzcan resultados específicos (de salud, bienestar, rendimiento o financieros).',
    ],
  },
  {
    heading: '14. Limitación de responsabilidad',
    body: [
      'En la máxima medida permitida por la ley, [RAZÓN SOCIAL] y sus directivos, empleados y proveedores no serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos, ni por pérdida de datos o beneficios, derivados del uso o la imposibilidad de uso de la App, del mentor IA, de la inexactitud de datos biométricos de terceros, o de decisiones que usted tome basándose en el contenido.',
      'En la medida permitida, nuestra responsabilidad agregada se limitará al importe que usted haya pagado en los [12] meses anteriores al hecho que origina la reclamación, o a [IMPORTE, p. ej. USD 100], lo que sea menor. Nada excluye responsabilidades que no puedan excluirse legalmente.',
    ],
  },
  {
    heading: '15. Indemnidad',
    body: [
      'Usted acepta mantener indemne a [RAZÓN SOCIAL] frente a reclamaciones de terceros derivadas de su uso indebido de la App, su contenido publicado o su incumplimiento de estos Términos, en la medida permitida por la ley.',
    ],
  },
  {
    heading: '16. Ley aplicable y disputas',
    body: [
      'Estos Términos se rigen por las leyes de [JURISDICCIÓN / PAÍS], sin atención a sus normas de conflicto de leyes.',
      'Las disputas se someterán a los tribunales competentes de [CIUDAD, PAÍS] o, si así se acuerda, a arbitraje administrado por [INSTITUCIÓN ARBITRAL] en [SEDE], en idioma [español]. Ciertas cláusulas pueden ser inaplicables frente a consumidores según el derecho imperativo de cada jurisdicción.',
    ],
  },
  {
    heading: '17. Cambios y misceláneos',
    body: [
      'Podremos modificar estos Términos. Notificaremos cambios materiales por la App o por correo. El uso continuado tras la entrada en vigor implica aceptación.',
      'Si alguna cláusula se declara inválida, el resto seguirá vigente. Estos Términos, junto con la Política de Privacidad, el Descargo de Salud y demás documentos, constituyen el acuerdo completo entre usted y nosotros respecto de la App.',
    ],
  },
  {
    heading: '18. Contacto',
    body: [
      '[RAZÓN SOCIAL]',
      'Legal: [EMAIL LEGAL]',
      'Dirección: [DIRECCIÓN]',
    ],
  },
];

export default function TerminosScreen() {
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
        <Text style={styles.title}>TÉRMINOS</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.eyebrow}>TÉRMINOS Y CONDICIONES DE USO</Text>
      <Text style={styles.lead}>
        Al crear una cuenta o usar la App LifeFlow / Polaris, usted acepta estos Términos. Si no está de acuerdo, no use la App.
      </Text>

      {/* Meta block */}
      <View style={styles.metaCard}>
        <Text style={styles.metaLine}>Titular del servicio: [RAZÓN SOCIAL]</Text>
        <Text style={styles.metaLine}>Domicilio: [DIRECCIÓN FISCAL]</Text>
        <Text style={styles.metaLine}>Contacto legal: [EMAIL LEGAL]</Text>
        <Text style={styles.metaLine}>Última actualización: [FECHA]</Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <GoldDivider />
          <Text style={styles.heading}>{section.heading}</Text>
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

  eyebrow: { ...typography.label, color: palette.gold },
  lead: { ...typography.body, color: palette.ash, lineHeight: 22 },

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
