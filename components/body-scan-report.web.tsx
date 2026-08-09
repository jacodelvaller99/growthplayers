/**
 * BodyScanReport — el reporte de 6 vistas, calcado de la referencia que
 * mandó el dueño: mismo rótulo, misma leyenda con los hex literales, mismos
 * corchetes de esquina, mismas 6 vistas etiquetadas "01. VISTA FRONTAL" …
 * "06. 3/4 DERECHO". Es un REPORTE — estático, sin órbita ni toque — no el
 * widget interactivo del check-in (`BodyMap3D`, que sigue siendo el que se
 * toca).
 *
 * ponytail: sin animación (ni shimmer, ni auto-rotate). Un reporte es un
 * frame fijo — la referencia misma es una composición estática.
 *
 * El cuerpo pintado es el modelo 3D REAL del dueño (`particleBodyViewer.ts`,
 * `public/models/cuerpo-particulas.glb`) con ~250k partículas en 3 capas y
 * bloom. Las 6 vistas se renderizan de UNA en un solo renderer offscreen y
 * llegan aquí como ImageBitmaps — sin 6 contextos WebGL vivos, que es lo que
 * permite esta densidad. `pickZone`/toque siguen en `BodyMap3D` sobre la
 * nube sintética (picking sobre malla real es trabajo aparte).
 */
import { Fragment, useEffect, useRef, useState } from 'react';

import { Fonts, palette } from '@/constants/theme';
import type { BodyZone } from '@/lib/bodyMapLogic';
import { VIEW_PRESETS } from '@/lib/humanFigure3DLogic';
import { renderAllViews } from '@/lib/particleBodyViewer';

export interface BodyScanReportProps {
  /** Zona que arde en oro — default 'pecho', la misma concentración que la
   *  referencia (chest/columna alta). Reservado: el gradiente vive en
   *  `particleBodyGradient.ts` y hoy no varía por zona. */
  primaryZone?: BodyZone;
}

const CAM_ZOOM = 1.05; // el cuerpo llena la columna, como en la referencia.
const COL_W = 220; // px CSS — la referencia respira; 150 apretaba el detalle.
const RENDER_SCALE = 2.5; // supersample: el bloom y las fibras necesitan pixeles.
const ASPECT = 300 / 486;

/** Regleta de medición vertical — el detalle del HUD de la referencia entre
 *  vista y vista. Decorativa: `aria-hidden`. */
function Ruler() {
  return (
    <div
      aria-hidden
      style={{
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: '0 0 auto',
        width: 10,
        paddingBottom: 26,
      }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          style={{
            height: 1,
            width: i % 4 === 0 ? 10 : 5,
            background: i % 4 === 0 ? palette.lineGold : palette.line,
          }}
        />
      ))}
    </div>
  );
}

function ScanColumn({ preset, bitmap }: { preset: (typeof VIEW_PRESETS)[number]; bitmap: ImageBitmap | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '0 0 auto', width: COL_W }}>
      <div style={{ width: '100%', aspectRatio: '300 / 486', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
      <div style={{ fontFamily: Fonts.display, fontSize: 10, letterSpacing: 1, color: palette.smoke, whiteSpace: 'nowrap' }}>
        {preset.id}. {preset.label}
      </div>
    </div>
  );
}

export function BodyScanReport({ primaryZone: _primaryZone = 'pecho' }: BodyScanReportProps) {
  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);

  useEffect(() => {
    let cancelled = false;
    let produced: ImageBitmap[] = [];
    const w = Math.round(COL_W * RENDER_SCALE);
    const h = Math.round(w / ASPECT);
    renderAllViews(VIEW_PRESETS, w, h, CAM_ZOOM)
      .then((bmps) => {
        produced = bmps;
        if (cancelled) {
          bmps.forEach((b) => b.close());
          return;
        }
        setBitmaps(bmps);
      })
      .catch((err) => {
        // ponytail: sin fallback visual a propósito — un canvas vacío en
        // devtools ya es la señal (mismo criterio que las verificaciones por
        // píxel de este componente).
        console.error('[BodyScanReport] modelo 3D no cargó:', err);
      });
    return () => {
      cancelled = true;
      produced.forEach((b) => b.close());
    };
  }, []);

  return (
    <div
      style={{
        background: palette.black,
        border: `1px solid ${palette.line}`,
        borderRadius: 4,
        padding: 20,
        position: 'relative',
      }}>
      {/* ── Cabecera: rótulo + título + leyenda ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: palette.goldText, fontSize: 12 }}>◆</span>
            <span style={{ fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: palette.goldText }}>
              ESCANEO BIOMÉTRICO
            </span>
          </div>
          <div style={{ fontFamily: Fonts.display, fontWeight: 800, fontSize: 26, letterSpacing: 1, color: palette.ivory, marginTop: 4 }}>
            CUERPO DE PARTÍCULAS
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: Fonts.mono, fontSize: 11, color: palette.smoke }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: palette.gold, display: 'inline-block' }} />
            #FFC804 · ZONA ACTIVADA
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: Fonts.mono, fontSize: 11, color: palette.smoke }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: '#B4B4B8', display: 'inline-block' }} />
            #B4B4B8 · PLATA FRÍA
          </span>
        </div>
      </div>

      {/* ── Corchetes de esquina — el mismo lenguaje del widget interactivo ── */}
      {[
        { top: 8, left: 8, borders: 'top left' },
        { top: 8, right: 8, borders: 'top right' },
        { bottom: 8, left: 8, borders: 'bottom left' },
        { bottom: 8, right: 8, borders: 'bottom right' },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', width: 16, height: 16, pointerEvents: 'none',
            top: c.top, left: c.left, right: c.right, bottom: c.bottom,
            borderTop: c.borders.includes('top') ? `1px solid ${palette.lineGold}` : undefined,
            borderBottom: c.borders.includes('bottom') ? `1px solid ${palette.lineGold}` : undefined,
            borderLeft: c.borders.includes('left') ? `1px solid ${palette.lineGold}` : undefined,
            borderRight: c.borders.includes('right') ? `1px solid ${palette.lineGold}` : undefined,
          }}
        />
      ))}

      {/* ── Las 6 vistas — scroll horizontal en pantallas angostas ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, alignItems: 'stretch' }}>
        {VIEW_PRESETS.map((preset, i) => (
          <Fragment key={preset.id}>
            {i > 0 ? <Ruler /> : null}
            <ScanColumn preset={preset} bitmap={bitmaps[i] ?? null} />
          </Fragment>
        ))}
      </div>

      {/* ── Pie ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 }}>
        <span style={{ fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1, color: palette.smoke }}>
          MODELO 3D · ESCANEO BIOMÉTRICO · CUERPO DE PARTÍCULAS
        </span>
        <span style={{ color: palette.smoke, fontSize: 12 }}>＋</span>
      </div>
    </div>
  );
}
