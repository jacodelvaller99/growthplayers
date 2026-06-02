import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── Privacy policy content ──────────────────────────────────────────────────
// Summarized faithfully from docs/launch/legal/PRIVACY_POLICY_DRAFT.md.
// [PLACEHOLDERS] are intentionally visible so the team fills them before launch.

interface Section {
  heading: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    heading: '1. Quiénes somos y alcance',
    body: [
      'Polaris Growth Institute opera la aplicación LifeFlow / Polaris ("la App"), disponible en iOS, Android y web (PWA), para acompañamiento de alto rendimiento personal. Incluye un programa de 90 días ("Protocolo Soberano"), un mentor de inteligencia artificial llamado "Norman", herramientas de bienestar y seguimiento de métricas biométricas y de hábitos.',
      'Esta política aplica a todas las personas usuarias. Al crear una cuenta y usar la App, usted acepta el tratamiento de sus datos descrito aquí.',
      'La App está dirigida a personas mayores de edad. No está dirigida a menores de [18] años.',
    ],
  },
  {
    heading: '2. Datos que recolectamos',
    body: [
      'Datos de cuenta e identidad: correo electrónico, nombre, rol u ocupación declarada, foto de avatar (opcional), zona horaria, token de notificaciones push y la sesión de autenticación.',
      'Contenido que usted genera: su Norte (propósito, identidad, no negociables, recordatorio diario), check-ins diarios (energía, claridad, estrés, sueño y texto libre), diario personal, respuestas reflexivas a las lecciones, conversaciones con el mentor "Norman" y publicaciones de comunidad.',
      'Datos de salud y biométricos: peso, estatura e IMC, perfil nutricional (incluidas restricciones y alergias), suplementación, ayuno intermitente y hábitos, además de los datos sincronizados desde wearables (sueño, recuperación, HRV, frecuencia cardíaca en reposo, SpO₂, temperatura, actividad).',
      'Datos de uso y analítica: eventos de comportamiento (vistas de pantalla, uso de herramientas, envíos de chat, check-ins, impactos de paywall), sesiones de bienestar y lecciones completadas.',
      'Datos inferidos por IA (perfilado): puntuación de engagement, riesgo de abandono, "ADN de comportamiento", afinidades de contenido, detección de anomalías, asignación a cohortes y memoria episódica del mentor con embeddings vectoriales.',
      'Datos de suscripción: nivel de suscripción, fecha de expiración y códigos de acceso usados. Los pagos y datos de tarjeta NO se procesan ni se almacenan en nuestros servidores.',
    ],
  },
  {
    heading: '3. Para qué usamos sus datos y base legal',
    body: [
      'Prestar el servicio (cuenta, progreso, programa): ejecución del contrato.',
      'Personalizar el mentor IA y las recomendaciones, y sincronizar métricas de wearables: ejecución del contrato y consentimiento explícito para los datos de salud.',
      'Análisis de comportamiento, ML y prevención de abandono, y notificaciones inteligentes: consentimiento (indicador ml_consent) o interés legítimo, según corresponda.',
      'Seguridad, prevención de fraude y cumplimiento legal: interés legítimo y obligación legal.',
      'El tratamiento de datos de salud / biométricos y la elaboración de perfiles de salud se basa en su consentimiento explícito, que puede retirar en cualquier momento.',
    ],
  },
  {
    heading: '4. Dispositivos wearables (Oura / WHOOP)',
    body: [
      'Si conecta un dispositivo Oura Ring o WHOOP, autoriza a la App, mediante OAuth, a importar sus datos biométricos y a guardar los tokens de acceso para sincronizar periódicamente. Estos datos provienen originalmente de Oura Health Oy y/o WHOOP, Inc., y su recolección se rige adicionalmente por las políticas de privacidad de esos proveedores.',
      'Puede desconectar un wearable en cualquier momento desde la App. La desconexión detiene futuras sincronizaciones; para eliminar los datos ya almacenados, ver la sección de Conservación y eliminación.',
    ],
  },
  {
    heading: '5. Con quién compartimos sus datos',
    body: [
      'No vendemos sus datos personales. Los compartimos con proveedores que actúan como encargados del tratamiento estrictamente para operar la App: Supabase (base de datos y backend), Vercel (hosting web), NVIDIA, Groq y OpenAI (modelos de IA del mentor y embeddings), Oura / WHOOP (origen de datos de wearable), RevenueCat (gestión de suscripciones), Apple App Store / Google Play (pagos y distribución) y Expo (notificaciones push).',
      'Para personalizar las respuestas, el sistema envía a los proveedores de IA un "prompt" que incluye su Norte, sus check-ins recientes, sus tareas reflexivas, inferencias de ML y una versión humanizada de sus señales biométricas, con el fin de generar la respuesta del mentor.',
      'También podremos divulgar datos cuando lo exija la ley, una autoridad competente, o para proteger derechos, seguridad o integridad de las personas o del servicio.',
    ],
  },
  {
    heading: '6. Transferencias internacionales',
    body: [
      'Algunos proveedores pueden procesar datos fuera de [PAÍS / JURISDICCIÓN del usuario], incluidos Estados Unidos. Cuando esto ocurra, nos apoyaremos en los mecanismos de transferencia aplicables (p. ej. cláusulas contractuales tipo) según corresponda.',
    ],
  },
  {
    heading: '7. Sus derechos',
    body: [
      'Según su jurisdicción (p. ej. RGPD/GDPR en la UE, Ley 1581 de 2012 en Colombia, CCPA/CPRA en California), usted puede tener derecho a: acceso, rectificación, supresión ("derecho al olvido"), portabilidad / exportación, oposición y limitación del tratamiento (incluido el perfilado, desactivando ml_consent), y a retirar el consentimiento para datos de salud y desconectar wearables en cualquier momento.',
      'Usted tiene derecho a no ser objeto de decisiones exclusivamente automatizadas con efectos jurídicos significativos. Las inferencias del mentor IA y las recomendaciones de bienestar son orientativas y no producen efectos jurídicos.',
      'Para ejercer estos derechos, escriba a [EMAIL LEGAL] o use las opciones de la App ("Perfil → Privacidad y Datos"). Responderemos en los plazos legales aplicables.',
    ],
  },
  {
    heading: '8. Conservación y eliminación',
    body: [
      'Los datos de cuenta y contenido se conservan mientras su cuenta esté activa. Puede solicitar la eliminación desde la App ("Eliminar cuenta") o por correo; los datos biométricos se eliminan junto con la cuenta.',
      'Los datos pueden persistir en copias de seguridad cifradas durante un periodo limitado [DEFINIR, p. ej. hasta 30 días] hasta su rotación.',
    ],
  },
  {
    heading: '9. Seguridad',
    body: [
      'Aplicamos medidas técnicas y organizativas razonables: Row-Level Security en Supabase (cada usuario solo accede a sus propias filas), autenticación basada en tokens, almacenamiento seguro de la sesión (SecureStore en nativo), cifrado en tránsito (HTTPS/TLS) y operaciones administrativas mediante el rol de servicio.',
      'Cuentas con rol de administrador pueden acceder a datos individuales, incluidos biométricos, a través del panel interno, para soporte y análisis de la plataforma. Ninguna medida de seguridad es infalible; no podemos garantizar seguridad absoluta.',
    ],
  },
  {
    heading: '10. Inteligencia artificial — transparencia',
    body: [
      'El mentor "Norman" es un sistema de inteligencia artificial generativa, no una persona real ni un profesional licenciado. Sus respuestas se generan con modelos de terceros y pueden contener errores. Ver el Descargo de Salud y Bienestar.',
      'Realizamos elaboración de perfiles automatizada (engagement, riesgo de abandono, anomalías, cohortes, afinidades) para personalizar la experiencia. Puede oponerse desactivando ml_consent. Mantenemos una memoria de fragmentos de sus interacciones que se elimina al eliminar la cuenta.',
    ],
  },
  {
    heading: '11. Menores de edad',
    body: [
      'La App no está dirigida a menores de [18] años y no recopilamos conscientemente sus datos. Si detectamos una cuenta de un menor, la eliminaremos.',
    ],
  },
  {
    heading: '12. Cambios a esta política',
    body: [
      'Podremos actualizar esta política. Notificaremos cambios materiales por la App o por correo. La fecha de "Última actualización" indica la versión vigente.',
    ],
  },
  {
    heading: '13. Contacto',
    body: [
      '[RAZÓN SOCIAL]',
      'Privacidad / Protección de Datos: [EMAIL LEGAL]',
      'Dirección: [DIRECCIÓN]',
      '[Autoridad de control competente — completar según jurisdicción, p. ej. SIC en Colombia / AEPD en España.]',
    ],
  },
];

export default function PrivacidadScreen() {
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
        <Text style={styles.title}>PRIVACIDAD</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.eyebrow}>POLÍTICA DE PRIVACIDAD</Text>
      <Text style={styles.lead}>
        Cómo Polaris Growth Institute recolecta, usa y protege sus datos personales en la App LifeFlow / Polaris.
      </Text>

      {/* Meta block */}
      <View style={styles.metaCard}>
        <Text style={styles.metaLine}>Responsable del tratamiento: [RAZÓN SOCIAL]</Text>
        <Text style={styles.metaLine}>Domicilio: [DIRECCIÓN FISCAL]</Text>
        <Text style={styles.metaLine}>Contacto de privacidad: [EMAIL LEGAL]</Text>
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
