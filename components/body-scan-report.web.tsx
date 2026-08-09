/**
 * BodyScanReport — el reporte de 6 vistas, calcado de la referencia que
 * mandó el dueño: mismo rótulo, misma leyenda con los hex literales, mismos
 * corchetes de esquina, mismas 6 vistas etiquetadas "01. VISTA FRONTAL" …
 * "06. 3/4 DERECHO". Es un REPORTE — estático, sin órbita ni toque — no el
 * widget interactivo del check-in (`BodyMap3D`, que sigue siendo el que se
 * toca). Comparten la misma nube de puntos y el mismo pintor
 * (`bodyScanWorld`/`bodyScanRender`) para que sea el MISMO cuerpo, no una
 * segunda figura que puede desalinearse.
 *
 * ponytail: sin animación (ni shimmer, ni auto-rotate). Un reporte es un
 * frame fijo — la referencia misma es una composición estática. Si más
 * adelante se pide vivo, `drawBodyScan` ya acepta `nowSec`/`reducedMotion`;
 * solo hay que envolver esta columna en el mismo rAF que ya tiene
 * `BodyMap3D`.
 */
import { useEffect, useRef } from 'react';

import { Fonts, palette } from '@/constants/theme';
import type { BodyZone } from '@/lib/bodyMapLogic';
import { drawBodyScan } from '@/lib/bodyScanRender';
import { VIEW_PRESETS, type Camera } from '@/lib/humanFigure3DLogic';

export interface BodyScanReportProps {
  /** Zona que arde en oro — default 'pecho', la misma concentración que la
   *  referencia (chest/columna alta). */
  primaryZone?: BodyZone;
}

const CAM_ZOOM = 1.15; // el cuerpo llena la columna, como en la referencia.

function ScanColumn({ preset, selected }: { preset: (typeof VIEW_PRESETS)[number]; selected: BodyZone[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const cam: Camera = { yaw: preset.yaw, pitch: preset.pitch, zoom: CAM_ZOOM, w, h };
      // Estático a propósito — un reporte no titila. `nowSec: 0` +
      // `reducedMotion: true` da el mismo frame siempre, verificable.
      drawBodyScan(ctx, w, h, cam, { selected, reducedMotion: true });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [preset, selected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '0 0 auto', width: 150 }}>
      <div ref={wrapRef} style={{ width: '100%', aspectRatio: '300 / 486', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
      <div style={{ fontFamily: Fonts.display, fontSize: 10, letterSpacing: 1, color: palette.smoke, whiteSpace: 'nowrap' }}>
        {preset.id}. {preset.label}
      </div>
    </div>
  );
}

export function BodyScanReport({ primaryZone = 'pecho' }: BodyScanReportProps) {
  const selected: BodyZone[] = [primaryZone];

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
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {VIEW_PRESETS.map((preset) => (
          <ScanColumn key={preset.id} preset={preset} selected={selected} />
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
