/**
 * Hoy contado como historia: los 4 pasos de la jornada en orden, con su marca
 * de hecho y casi sin texto. El paso del video muestra la miniatura real de
 * Vimeo (oEmbed, público y con CORS) — el video va primero, no un párrafo.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, palette } from '@/constants/theme';
import type { Jornada, JornadaStep } from '@/lib/jornadaLogic';

type Paso = { step: JornadaStep; title: string; hint: string; route: string };

export function HistoriaDelDia({
  jornada, lesson, lessonRoute, onGo,
}: {
  jornada: Jornada | null;
  lesson?: { title: string; order?: number; vimeoId?: string };
  lessonRoute: string;
  onGo: (route: string) => void;
}) {
  const pasos: Paso[] = [
    { step: 'leete', title: 'Check-in', hint: '2 min', route: '/checkin' },
    { step: 'ejecuta', title: 'Tu video', hint: lesson ? `Lección ${lesson.order ?? ''}`.trim() : 'Lección', route: lessonRoute },
    { step: 'regula', title: 'Respira', hint: '5 min', route: '/bienestar/respiracion' },
    { step: 'cierra', title: 'Cierra el día', hint: '1 línea', route: '/bienestar/diario' },
  ];
  const estado = (st: JornadaStep) => jornada?.steps.find((x) => x.step === st)?.state ?? 'pending';
  const hechos = jornada?.doneCount ?? 0;

  return (
    <View style={s.root}>
      <Text style={s.meta}>{jornada?.complete ? 'TU DÍA · COMPLETO' : `TU DÍA · ${hechos} DE 4`}</Text>
      {pasos.map((p, i) => {
        const st = estado(p.step);
        const last = i === pasos.length - 1;
        return (
          <View key={p.step} style={s.paso}>
            <View style={s.rail}>
              <View style={[s.dot, st === 'done' && s.dotDone, st === 'current' && s.dotNow]}>
                {st === 'done'
                  ? <MaterialIcons name="check" size={22} color={palette.ink} />
                  : <Text style={[s.num, st === 'current' && s.numNow]}>{i + 1}</Text>}
              </View>
              {!last && <View style={[s.line, st === 'done' && s.lineDone]} />}
            </View>
            <View style={s.body}>
              <Pressable
                onPress={() => onGo(p.route)}
                accessibilityRole="link"
                accessibilityLabel={`Paso ${i + 1}: ${p.title}${st === 'done' ? ', hecho' : ''}`}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.row, (pressed || hovered) && s.pressed]}>
                <Text style={[s.title, st === 'pending' && s.titleDim, st === 'done' && s.titleDone]}>{p.title}</Text>
                <Text style={[s.hint, st === 'current' && s.hintNow]}>{st === 'done' ? 'Hecho' : p.hint}</Text>
              </Pressable>
              {p.step === 'ejecuta' && st !== 'done' && lesson && (
                <VideoCard title={lesson.title} vimeoId={lesson.vimeoId} onPress={() => onGo(p.route)} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function VideoCard({ title, vimeoId, onPress }: { title: string; vimeoId?: string; onPress: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (!vimeoId) return;
    let alive = true;
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${vimeoId}`)}&width=960`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j?.thumbnail_url) setThumb(j.thumbnail_url); })
      .catch(() => {}); // ponytail: sin miniatura queda el bloque oscuro con el play — no es un error para el cliente
    return () => { alive = false; };
  }, [vimeoId]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver video: ${title}`}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.video, (pressed || hovered) && s.pressed]}>
      {!!thumb && <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      <View style={s.videoShade} />
      <View style={s.play}><MaterialIcons name="play-arrow" size={36} color={palette.ink} /></View>
      <Text style={s.videoTitle} numberOfLines={2}>{title}</Text>
    </Pressable>
  );
}

const DOT = 44;
const s = StyleSheet.create({
  root: { marginTop: 8, marginBottom: 32 },
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText, marginBottom: 20 },
  paso: { flexDirection: 'row', gap: 16 },
  rail: { width: DOT, alignItems: 'center' },
  dot: {
    width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5, borderColor: palette.line,
    alignItems: 'center', justifyContent: 'center',
  },
  dotNow: { backgroundColor: palette.gold, borderColor: palette.gold },
  dotDone: { backgroundColor: palette.gold, borderColor: palette.gold, opacity: 0.55 },
  num: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 16, color: palette.smoke },
  numNow: { color: palette.ink },
  line: { flex: 1, width: 1.5, minHeight: 20, backgroundColor: palette.line },
  lineDone: { backgroundColor: palette.gold, opacity: 0.55 },
  body: { flex: 1, paddingBottom: 20 },
  row: { minHeight: DOT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pressed: { opacity: 0.8 },
  title: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 22, letterSpacing: -0.3, color: palette.ivory, flexShrink: 1 },
  titleDim: { color: palette.ash },
  titleDone: { color: palette.smoke },
  hint: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
  hintNow: { color: palette.goldText },
  video: {
    marginTop: 12, width: '100%', maxWidth: 560, aspectRatio: 16 / 9, borderRadius: 8, overflow: 'hidden',
    backgroundColor: palette.ink, justifyContent: 'flex-end', padding: 16,
  },
  videoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  play: {
    position: 'absolute', top: '50%', left: '50%', width: 64, height: 64, marginTop: -32, marginLeft: -32,
    borderRadius: 32, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center',
  },
  videoTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 16, lineHeight: 21, color: palette.paper },
});
