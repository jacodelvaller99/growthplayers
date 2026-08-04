/**
 * BodyMap — señala dónde lo sientes.
 *
 * El check-in pregunta cuánto (energía, claridad, tensión, sueño) y nunca
 * dónde. "Tensión 8" no distingue una mandíbula apretada de un estómago
 * cerrado, y se regulan distinto. Tocar la silueta toma dos segundos y da una
 * señal que ningún deslizador da.
 *
 * El significado vive en `lib/bodyMapLogic.ts` (puro, testeado, con el filtro
 * anti-lenguaje-clínico). Aquí solo vive la silueta y el tacto.
 *
 * Deliberadamente NO es un SVG anatómico: una silueta reconocible construida
 * con Views redondeadas pesa cero, se tinta con los tokens del tema y no
 * necesita assets. La precisión anatómica sería falsa precisión — son 7 zonas.
 */
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { BODY_ZONES, ZONE_LABEL, type BodyZone } from '@/lib/bodyMapLogic';

export interface BodyMapProps {
  selected: BodyZone[];
  onToggle: (zone: BodyZone) => void;
}

/**
 * Geometría de la silueta, en porcentajes del contenedor.
 *
 * Una versión anterior de este comentario afirmaba que cada zona era un área
 * táctil de 44pt. Era falso: con el canvas fijo de 200×260, la garganta medía
 * 28×18pt. El área táctil real la da `hitSlop` en el Pressable, más el chip
 * equivalente de la leyenda (que sí es de 44pt de alto) — dos formas de tocar
 * la misma zona, para dedo grande y para dedo fino.
 */
const ZONE_BOX: Record<BodyZone, { top: string; left: string; width: string; height: string; radius: number }> = {
  cabeza:    { top: '3%',  left: '38%', width: '24%', height: '13%', radius: 999 },
  // Mas altas de lo que parecen necesarias a proposito: react-native-web NO
  // implementa `hitSlop` en `Pressable` (comprobado en node_modules), y la PWA
  // es lo unico desplegado hoy. Con 5% y 6% de altura salian 21 y 25pt de area
  // real — la mitad del minimo tactil. La caja ES el area en web.
  mandibula: { top: '16%', left: '40%', width: '20%', height: '8%',  radius: 8 },
  garganta:  { top: '24%', left: '43%', width: '14%', height: '7%',  radius: 6 },
  // left 34%, no 38%: con width 32% el centro cae en 50%, el mismo del torso
  // (22%-78%) y el de cabeza/mandibula/garganta. A 38% centraban en 54% y las
  // dos zonas mas grandes de la silueta iban 14px corridas a la derecha.
  pecho:     { top: '31%', left: '34%', width: '32%', height: '16%', radius: 14 },
  estomago:  { top: '47%', left: '34%', width: '32%', height: '14%', radius: 12 },
  // espalda y manos estaban en left 12% y 73% contra un torso que va de 22% a
  // 78%: flotaban AL LADO del cuerpo, sin brazos que las conectaran. Ahora la
  // espalda es la banda izquierda del torso y las manos van a la cadera.
  // width 10%, no 13%: llegaba al 37% contra un pecho que empieza en el 34%.
  // Tres puntos de solape, y como `espalda` se renderiza DESPUES gana el
  // hit-test: tocabas el borde izquierdo de tu pecho y la app encendia tu
  // espalda — y te mandaba a la practica equivocada.
  espalda:   { top: '31%', left: '24%', width: '10%', height: '28%', radius: 12 },
  manos:     { top: '62%', left: '24%', width: '10%', height: '10%', radius: 999 },
};

/** Zonas que se apilan verticalmente: su hitSlop no puede crecer hacia
 *  arriba ni abajo sin robarle el toque a la vecina. */
const STACKED = new Set<BodyZone>(['cabeza', 'mandibula', 'garganta', 'pecho', 'estomago']);

export function BodyMap({ selected, onToggle }: BodyMapProps) {
  return (
    <View style={s.root}>
      <View style={s.canvas} accessibilityRole="none">
        {/* Silueta de referencia — puramente decorativa, no se toca. */}
        <View pointerEvents="none" style={s.torso} />
        <View pointerEvents="none" style={s.head} />

        {BODY_ZONES.map((zone) => {
          const box = ZONE_BOX[zone];
          const on = selected.includes(zone);
          return (
            <Pressable
              key={zone}
              onPress={() => {
                // El gesto más corporal de la app era el único sin háptica,
                // mientras el resto de la pantalla vibra. Tocarte y que el
                // teléfono no responda rompe justo la sensación que buscamos.
                if (Platform.OS !== 'web') {
                  // Apagar no se siente igual que encender.
                  if (on) Haptics.selectionAsync();
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onToggle(zone);
              }}
              // hitSlop SOLO lateral en las zonas apiladas. Un slop vertical
              // uniforme hacía que garganta —renderizada después— ganara el
              // hit-test y se comiera media mandíbula: el usuario tocaba su
              // mandíbula y la app encendía su garganta, y le ofrecía otra
              // práctica. En las zonas aisladas el slop libre sí ayuda.
              // Nunca hacia el centro del cuerpo. Las apiladas no crecen en
              // vertical (garganta se comia la mandibula); las del flanco
              // izquierdo —espalda y manos— no crecen hacia la derecha, que es
              // donde esta el pecho.
              hitSlop={
                STACKED.has(zone)
                  ? { top: 0, bottom: 0, left: 16, right: 16 }
                  : { top: 14, bottom: 14, left: 14, right: 0 }
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={ZONE_LABEL[zone]}
              // La silueta y la lista repiten las 7 zonas: sin esto, un lector
              // de pantalla lee catorce casillas con el mismo nombre.
              accessibilityHint="En la silueta"
              style={({ pressed }) => [
                s.zone,
                {
                  top: box.top as never,
                  left: box.left as never,
                  width: box.width as never,
                  height: box.height as never,
                  borderRadius: box.radius,
                },
                on && s.zoneOn,
                // La primera tocada manda: `readBody` enruta por `zones[0]`.
                // Pintarlas todas igual escondia la unica jerarquia que el
                // gesto tiene — y deseleccionar y volver a tocar cambiaba la
                // practica en silencio.
                on && selected[0] === zone && s.zonePrimary,
                // Encender, no desvanecer. `opacity: 0.7` sobre un borde blanco
                // hacia que la zona se APAGARA bajo el dedo -- y en web es el
                // unico feedback, porque la haptica se salta por plataforma.
                // Senalar donde te duele y ver que se apaga es lo contrario de
                // lo que el gesto quiere decir.
                pressed && s.zonePressed,
              ]}
            />
          );
        })}
      </View>

      {/* Las etiquetas viven fuera de la silueta: dentro competirían con el
          gesto y obligarían a tipografía de 8px sobre un área táctil. */}
      <View style={s.legend}>
        {BODY_ZONES.map((zone) => {
          const on = selected.includes(zone);
          return (
            <Pressable
              key={zone}
              onPress={() => {
                // El chip hace exactamente lo mismo que la silueta; que uno
                // vibre y el otro no es la clase de inconsistencia que se nota
                // sin saber nombrarla.
                if (Platform.OS !== 'web') {
                  if (on) Haptics.selectionAsync();
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onToggle(zone);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={ZONE_LABEL[zone]}
              accessibilityHint="En la lista"
              style={[s.chip, on && s.chipOn, on && selected[0] === zone && s.chipPrimary]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>
                {ZONE_LABEL[zone].replace(/^(La|El|Las|Los) /, '')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  // Antes era 200x260 FIJO en cualquier dispositivo: diminuto en un teléfono
  // grande y apretado en uno pequeño. Con aspectRatio escala con el ancho real.
  canvas: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.72,
    position: 'relative',
  },
  // Silueta: hombros anchos que se estrechan. Sugiere un cuerpo sin dibujarlo.
  torso: {
    position: 'absolute',
    // 19%, no 25%: entre la cabeza (acaba en 16%) y el torso habia un hueco
    // de 9% del canvas donde flotaban mandibula y garganta sin nada detras.
    top: '19%',
    left: '22%',
    right: '22%',
    // 54%: llega al 73%, por debajo de las manos (acaban en 72%). Con 48% el
    // torso terminaba en 67% y las manos colgaban fuera del cuerpo.
    height: '54%',
    borderRadius: 28,
    // graphiteLight #181818 sobre la tarjeta #111111 daba 1.06:1 — WCAG 1.4.11
    // exige 3:1 para graficos esenciales. Se veian los bordes de zona y NO el
    // cuerpo: lo unico legible eran 7 rectangulos flotando.
    backgroundColor: palette.silhouette,
    opacity: 0.55,
  },
  head: {
    position: 'absolute',
    top: '2%',
    left: '38%',
    width: '24%',
    height: '14%',
    borderRadius: 999,
    backgroundColor: palette.silhouette,
    opacity: 0.55,
  },
  zone: {
    position: 'absolute',
    borderWidth: 1,
    // `line` (alfa 0.07) sobre la silueta era invisible: no se veía que
    // hubiera regiones tocables hasta tocarlas. `lineHard` las declara.
    // Al 20% daba 1.84:1 contra el relleno de la silueta. WCAG 1.4.11 pide 3:1
    // para graficos esenciales, y estas regiones son EL control de la pantalla.
    borderColor: palette.zoneBorder,
    backgroundColor: 'transparent',
  },
  // El oro marca lo señalado. Es el acento ganado de la marca: aquí lo gana el
  // usuario al decir dónde le duele.
  zoneOn: {
    backgroundColor: palette.goldLight,
    borderColor: palette.gold,
  },
  zonePressed: {
    backgroundColor: palette.goldGlow,
    borderColor: palette.gold,
  },
  // La que manda. Borde doble, no otro color: sigue siendo oro, solo pesa más.
  zonePrimary: {
    borderWidth: 2,
  },
  chipPrimary: {
    borderWidth: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipOn: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  chipText: { ...typography.caption, color: palette.ash },
  chipTextOn: { color: palette.goldText, fontFamily: Fonts.displayMedium },
});
