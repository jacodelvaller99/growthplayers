/**
 * Apariencia — el cliente elige cómo se ve su app.
 *
 * Claro u oscuro — Tinta o Luz, los dos fondos del manual de marca — y cuánto
 * se muestra. Vive en el perfil, no en admin, porque es del usuario — el admin
 * llega a la misma pantalla desde su panel.
 *
 * La preferencia se guarda en ESTE navegador. No toca la base de datos ni lo que
 * ven otras personas, y en la app nativa el color no re-tematiza (ahí va
 * compilado en hex); la pantalla lo dice en vez de fingir que funciona.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Pantalla } from '@/components/pantalla';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useAppTheme, type ThemeMode } from '@/hooks/use-app-theme';
import { APP_MODES, useAppMode, type AppMode } from '@/hooks/use-app-mode';

/** El fondo que de verdad se ve: `data-theme` en <html> (solo web). */
export function readShownTheme(): string | undefined {
  return Platform.OS === 'web' && typeof document !== 'undefined'
    ? document.documentElement.dataset.theme
    : undefined;
}

/** Qué opción marcar: el atributo manda si es uno de los dos fondos; si no, el contexto. */
export function shownToMode(shown: string | undefined, mode: ThemeMode): ThemeMode {
  return shown === 'light' || shown === 'tinta' ? shown : mode;
}

/** Fila de elección (radio): misma línea que `Fila`, con check en vez de flecha. */
function Opcion({
  name, note, active, onPress, last,
}: {
  name: string;
  note?: string;
  active: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      aria-checked={active}
      accessibilityLabel={note ? `${name}. ${note}` : name}
      style={({ pressed }) => [s.row, last && s.rowLast, pressed && { opacity: 0.7 }]}>
      <View style={s.rowText}>
        <Text style={s.rowName}>{name}</Text>
        {!!note && <Text style={s.rowNote}>{note}</Text>}
      </View>
      {active && <MaterialIcons name="check" size={20} color={palette.ivory} />}
    </Pressable>
  );
}

export default function AparienciaScreen() {
  const { mode, setMode, canToggle } = useAppTheme();
  const { mode: appMode, setMode: setAppMode } = useAppMode();

  // El tema que de verdad se ve es el atributo `data-theme` del documento. Si
  // alguien lo cambió por fuera (otra pestaña, extensión, el tour), el estado
  // del contexto quedaba diciendo "Oscuro" con la pantalla en claro.
  // Se lee al montar y se vigila: leerlo solo en el render dejaba el check
  // viejo si el atributo cambiaba sin re-render de esta pantalla.
  const [shown, setShown] = useState(readShownTheme);
  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    const obs = new MutationObserver(() => setShown(readShownTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const effective = shownToMode(shown, mode);
  useEffect(() => {
    if (effective !== mode) setMode(effective);
  }, [effective, mode, setMode]);
  // Al elegir, el check se mueve en el mismo render (sin esperar al observer).
  const pick = (m: ThemeMode) => { setShown(m); setMode(m); };

  return (
    <Pantalla
      meta="APARIENCIA"
      title="Cómo se ve tu app."
      sub={canToggle
        ? 'Se guarda en este navegador. No cambia lo que ven los demás.'
        : 'En la app del teléfono el color es fijo (oscuro). Desde el navegador puedes elegir claro u oscuro.'}>
      {/* Solo los dos fondos del manual de marca: Tinta (oscuro) y Luz (claro). */}
      {canToggle && (
        <View accessibilityRole="radiogroup" style={s.group}>
          <Text style={s.groupLabel}>CLARO U OSCURO</Text>
          <Opcion name="Oscuro" active={effective === 'tinta'} onPress={() => pick('tinta')} />
          <Opcion name="Claro" active={effective === 'light'} onPress={() => pick('light')} last />
        </View>
      )}

      <View accessibilityRole="radiogroup" style={s.group}>
        <Text style={s.groupLabel}>CUÁNTO SE MUESTRA</Text>
        {APP_MODES.map((m: { id: AppMode; label: string; description: string }, i) => (
          <Opcion
            key={m.id}
            name={m.label}
            note={m.description}
            active={appMode === m.id}
            onPress={() => setAppMode(m.id)}
            last={i === APP_MODES.length - 1}
          />
        ))}
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  group: { maxWidth: 680, marginBottom: spacing.xxl },
  groupLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56,
    paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: palette.line,
  },
  rowLast: { borderBottomWidth: 1, borderBottomColor: palette.line },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  rowNote: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.smoke },
});
