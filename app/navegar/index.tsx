// Navegar Polaris — video-guías de la app: lista por rol + buscador; al abrir una: video, paso a paso con
// pantallazos y "¿Y si…?". Qué guías ve cada cuenta lo decide el servidor (bucket privado `navegar`, ver lib/navegar.ts).
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Fila, Pantalla } from '@/components/pantalla';
import { Fonts, palette } from '@/constants/theme';
import { cargarGuias, firmarMedios, type MediosGuia } from '@/lib/navegar';
import { aVtt, cueEn, filtrarGuias, NOMBRE_ROL_GUIA, ROLES_GUIA, type Cue, type Guia } from '@/lib/navegarLogic';

const etiqueta = (g: Guia) => `${g.rol === 'cliente' ? 'GUÍA' : 'ADMIN'} ${g.n}`;

/** Pista WebVTT como blob local (misma origen: Safari la acepta y la muestra también en pantalla completa). */
function useVttUrl(cues: Cue[]): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !cues.length) { setUrl(null); return; }
    const u = URL.createObjectURL(new Blob([aVtt(cues)], { type: 'text/vtt' }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [cues]);
  return url;
}

/** Video con subtítulos del guion real: <video> + <track> en web; expo-av + texto sincronizado en iOS/Android. */
function Reproductor({ src, titulo, cues }: { src: string; titulo: string; cues: Cue[] }) {
  const vtt = useVttUrl(cues);
  const [seg, setSeg] = useState(0);
  if (Platform.OS === 'web') {
    return React.createElement('video', {
      src, controls: true, playsInline: true, preload: 'metadata', controlsList: 'nodownload',
      'aria-label': `Video: ${titulo}`,
      style: { width: '100%', aspectRatio: '16 / 9', backgroundColor: palette.ink, borderRadius: 12, display: 'block' },
    }, vtt ? React.createElement('track', { key: vtt, kind: 'captions', srcLang: 'es', label: 'Español', src: vtt, default: true }) : null);
  }
  const texto = cueEn(cues, seg);
  return (
    <View>
      <Video source={{ uri: src }} useNativeControls resizeMode={ResizeMode.CONTAIN} style={s.videoNativo}
        accessibilityLabel={`Video: ${titulo}`} progressUpdateIntervalMillis={250}
        onPlaybackStatusUpdate={(st) => { if (st.isLoaded) setSeg(st.positionMillis / 1000); }} />
      {cues.length > 0 && (
        <Text style={s.subtitulo} accessibilityLiveRegion="polite">{texto ?? ' '}</Text>
      )}
    </View>
  );
}

/** Pantallazo del paso, a su proporción real. */
function Pantallazo({ uri, alt }: { uri: string; alt: string }) {
  const [ratio, setRatio] = useState(1.92);
  useEffect(() => { Image.getSize(uri, (w, h) => h && setRatio(w / h), () => {}); }, [uri]);
  return <Image source={{ uri }} accessibilityLabel={alt} resizeMode="contain" style={[s.pantallazo, { aspectRatio: ratio }]} />;
}

function Detalle({ g, onVolver }: { g: Guia; onVolver: () => void }) {
  const [medios, setMedios] = useState<MediosGuia | null>(null);
  useEffect(() => {
    let vivo = true;
    setMedios(null);
    firmarMedios(g).then((m) => { if (vivo) setMedios(m); });
    return () => { vivo = false; };
  }, [g]);

  const hero = !medios
    ? <View style={s.espera}><ActivityIndicator color={palette.gold} /><Text style={s.esperaTxt}>Cargando el video…</Text></View>
    : medios.video
      ? <Reproductor src={medios.video} titulo={g.titulo} cues={medios.subtitulos} />
      : <Text style={s.error} accessibilityRole="alert">No se pudo abrir esta guía. Sal y vuelve a entrar; si sigue igual, escríbele a tu mentor.</Text>;

  return (
    <Pantalla meta={`${etiqueta(g)} · ${NOMBRE_ROL_GUIA[g.rol].toUpperCase()}`} title={g.titulo}
      sub={`${g.pasos.length} pasos · ${g.meta}`} onBack={onVolver} hero={hero}>
      <Text accessibilityRole="header" style={s.h2}>PASO A PASO</Text>
      {g.pasos.map((texto, i) => (
        <View key={i} style={s.paso}>
          <View style={s.pasoFila}>
            <Text style={s.pasoN} aria-hidden>{i + 1}</Text>
            <Text style={s.pasoTxt}>{texto}</Text>
          </View>
          {!!medios?.pasos[i] && <Pantallazo uri={medios.pasos[i] as string} alt={`Pantallazo del paso ${i + 1}: ${texto}`} />}
        </View>
      ))}
      {g.tips.length > 0 && (
        <View style={s.tips}>
          <Text accessibilityRole="header" style={s.h2}>¿Y SI…?</Text>
          {g.tips.map((t, i) => <Text key={i} style={s.tip}>{t}</Text>)}
        </View>
      )}
    </Pantalla>
  );
}

export default function NavegarPolaris() {
  const router = useRouter();
  const { t } = useLocalSearchParams<{ t?: string }>();
  const [lista, setLista] = useState<Guia[] | null>(null);
  const [consulta, setConsulta] = useState('');

  useEffect(() => { cargarGuias().then(setLista); }, []);

  const abierta = useMemo(() => lista?.find((g) => g.id === t) ?? null, [lista, t]);
  const visibles = useMemo(() => filtrarGuias(lista ?? [], consulta), [lista, consulta]);

  if (abierta) return <Detalle g={abierta} onVolver={() => router.setParams({ t: undefined } as never)} />;

  return (
    <Pantalla meta="NAVEGAR POLARIS" title="Navegar Polaris." sub="Videos cortos con los pasos reales de la app. Ábrelos cuando tengas una duda.">
      <View style={s.buscar}>
        <MaterialIcons name="search" size={20} color={palette.smoke} />
        <TextInput style={s.buscarTxt} placeholder="Busca: check-in, Norman, reloj…" placeholderTextColor={palette.smoke}
          value={consulta} onChangeText={setConsulta} returnKeyType="search" accessibilityLabel="Buscar una guía" />
        {consulta.length > 0 && (
          <Pressable onPress={() => setConsulta('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" hitSlop={8}>
            <MaterialIcons name="close" size={18} color={palette.smoke} />
          </Pressable>
        )}
      </View>

      {lista === null && <View style={s.espera}><ActivityIndicator color={palette.gold} /><Text style={s.esperaTxt}>Cargando las guías…</Text></View>}
      {lista !== null && lista.length === 0 && (
        <Text style={s.error} accessibilityRole="alert">Las guías no están disponibles ahora. Recarga en un momento.</Text>
      )}
      {lista !== null && lista.length > 0 && visibles.length === 0 && (
        <Text style={s.vacio}>Ninguna guía coincide con «{consulta}».</Text>
      )}

      {ROLES_GUIA.map((rol) => {
        const del = visibles.filter((g) => g.rol === rol);
        if (!del.length) return null;
        return (
          <View key={rol} style={s.grupo}>
            <Text accessibilityRole="header" style={s.h2}>{NOMBRE_ROL_GUIA[rol].toUpperCase()} · {del.length}</Text>
            {del.map((g, i) => (
              <Fila key={g.id} label={etiqueta(g)} value={`${g.titulo} · ${g.meta}`}
                onPress={() => router.setParams({ t: g.id } as never)} last={i === del.length - 1} />
            ))}
          </View>
        );
      })}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  buscar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphite, marginBottom: 8 },
  buscarTxt: { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 16, paddingVertical: 10 },
  grupo: { marginTop: 24 },
  h2: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1.2, color: palette.goldText, marginBottom: 8 },
  espera: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24 },
  esperaTxt: { color: palette.ash, fontFamily: Fonts.sans, fontSize: 15 },
  error: { color: palette.ivory, fontFamily: Fonts.sans, fontSize: 15, paddingVertical: 16 },
  vacio: { color: palette.ash, fontFamily: Fonts.sans, fontSize: 15, paddingVertical: 16 },
  videoNativo: { width: '100%', aspectRatio: 16 / 9, backgroundColor: palette.ink, borderRadius: 12 },
  subtitulo: { minHeight: 48, marginTop: 8, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  paso: { marginBottom: 24 },
  pasoFila: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  pasoN: { fontFamily: Fonts.mono, fontSize: 15, color: palette.goldText, minWidth: 20 },
  pasoTxt: { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 23 },
  pantallazo: { width: '100%', borderRadius: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.graphite },
  tips: { marginTop: 8 },
  tip: { color: palette.ash, fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, marginBottom: 10 },
});
