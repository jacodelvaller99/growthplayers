/**
 * BodyScanReport — el reporte de 6 vistas. Calcado de la referencia original
 * del dueño (rótulo, leyenda con hex literales, corchetes de esquina) y
 * AHORA TAMBIÉN de la referencia nueva (video generado por IA, "loop
 * animado en vivo" — decisión explícita del dueño, ver plan
 * `ESCANEO VIVO`): pulso del pecho, red de líneas entre articulaciones con
 * retículas, fondo grid+starfield, insignia "ESCANEO COMPLETO", HUD con
 * datos REALES del pipeline (no cifras inventadas — ver honestidad abajo).
 *
 * Lo que NO se intenta replicar, a propósito: piel fotoreal con reflejos
 * (necesita un motor PBR, no es un ajuste), una malla 3D literal de corazón
 * anatómico (no hay ese asset — se aproxima con densidad/calidez de
 * partículas vía `heartClusterColor`), o un fondo que cambia de estilo
 * (grilla → nebulosa → matrix rain) como el video de referencia — ahí no
 * hay una escena 3D coherente detrás, es un artefacto de generación por IA.
 * Un solo fondo, consistente.
 *
 * Es el REPORTE visual del `BodyMap`: el check-in conserva el punto anatómico
 * continuo y estas seis vistas permiten recorrer siete focos contemplativos
 * proyectados sobre la misma cámara. No son puntos clínicos ni diagnósticos.
 *
 * Animación: TODA vía CSS (`@keyframes` + `prefers-reduced-motion`), no un
 * loop de `requestAnimationFrame` en JS — nada que cancelar al desmontar,
 * nada que recalcule en cada frame. Es la misma razón por la que no se
 * re-renderiza la escena de three.js por frame (costaría 6 cámaras × ~156k
 * partículas × 60fps — ya congeló la pestaña una vez en el muestreo). El
 * cuerpo 3D sigue siendo UN batch estático (`renderAllViews`, sin cambios);
 * el pulso/las líneas/el fondo son overlays 2D baratos encima.
 *
 * Honestidad: las tiras "waveform" del pie son decorativas (chrome visual,
 * igual que los corchetes de esquina) — CERO cifras ni unidades inventadas
 * (nada de "72 BPM"). Los ÚNICOS números que se muestran son reales del
 * propio pipeline: partículas totales (`PARTICLE_TOTAL`) y vistas cargadas.
 * Mismo principio que ya se aplicó en "Honestidad" al filtro de
 * testimonios verificados — no fabricar datos que no existen.
 *
 * El cuerpo pintado es el modelo 3D REAL del dueño (`particleBodyViewer.ts`,
 * `public/models/cuerpo-particulas.glb`). Las 6 vistas se renderizan de UNA
 * en un solo renderer offscreen y llegan aquí como ImageBitmaps — sin 6
 * contextos WebGL vivos, que es lo que permite esta densidad.
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { Fonts, palette } from '@/constants/theme';
import type { BodyZone } from '@/lib/bodyMapLogic';
import { energyFocusById, type EnergyFocusId } from '@/lib/energyFocusLogic';
import { VIEW_PRESETS } from '@/lib/humanFigure3DLogic';
import {
  PARTICLE_TOTAL,
  projectChestCenter,
  projectEnergyFociForView,
  projectJointsForView,
  renderAllViews,
  type ProjectedJoint,
} from '@/lib/particleBodyViewer';

export interface BodyScanReportProps {
  /** Zona que arde en oro — default 'pecho', la misma concentración que la
   *  referencia (chest/columna alta). Reservado: el gradiente vive en
   *  `particleBodyGradient.ts` y hoy no varía por zona. */
  primaryZone?: BodyZone;
  /** Foco contemplativo activo, compartido con el punto exacto del check-in. */
  activeFocus?: EnergyFocusId;
  /** Convierte las anclas proyectadas de las seis vistas en controles reales. */
  onFocusSelect?: (focus: EnergyFocusId) => void;
}

const CAM_ZOOM = 1.05; // el cuerpo llena la columna, como en la referencia.
const COL_W = 220; // px CSS — la referencia respira; 150 apretaba el detalle.
// Probado 2.5 -> 3.2 para darle margen al bloom (ver particleBodyViewer.ts):
// el tamaño de partícula está en unidades de mundo, no en píxeles, así que
// subir solo la resolución hizo que el polvo se viera MÁS ralo (cobertura
// 68% -> 12-52%, medido), no más sólido. Revertido — hace falta re-tunear
// tamaño de partícula junto con el bloom, no uno solo.
const RENDER_SCALE = 2.5; // supersample: el bloom y las fibras necesitan pixeles.
const ASPECT = 300 / 486;

/** Pares de articulaciones que se conectan con una línea — el "esqueleto"
 *  de la red del HUD. Incluye dos líneas al pecho para atar el pulso al
 *  resto de la red (como en la referencia: el brillo del pecho se conecta
 *  a los hombros). */
const JOINT_LINKS: readonly [string, string][] = [
  ['shoulderL', 'shoulderR'],
  ['shoulderL', 'elbowL'],
  ['shoulderR', 'elbowR'],
  ['shoulderL', 'hipL'],
  ['shoulderR', 'hipR'],
  ['hipL', 'hipR'],
  ['hipL', 'kneeL'],
  ['hipR', 'kneeR'],
  ['chest', 'shoulderL'],
  ['chest', 'shoulderR'],
];

let stylesInjected = false;
/** Inyecta las animaciones CSS una sola vez (mismo patrón que
 *  `injectThemeVars` en `constants/themeColors.ts`). Todo vía `@keyframes` +
 *  `prefers-reduced-motion` — nada de `requestAnimationFrame` en JS. */
function injectScanAnimationStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;
  if (document.getElementById('polaris-scan-anim')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'polaris-scan-anim';
  style.textContent = `
    @keyframes polarisScanPulse {
      0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.88); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.14); }
    }
    @keyframes polarisScanReticle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.85; }
    }
    @keyframes polarisScanLine {
      0%, 100% { opacity: 0.25; }
      50% { opacity: 0.65; }
    }
    @keyframes polarisScanDash {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -32; }
    }
    @keyframes polarisScanDrift {
      from { background-position: 0 0; }
      to { background-position: -120px -120px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .polaris-scan-pulse, .polaris-scan-reticle, .polaris-scan-line,
      .polaris-scan-waveform, .polaris-scan-starfield { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

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

/** Insignia de estado — mismo lenguaje visual que `StatusPill` de
 *  `components/polaris.tsx`, reimplementada en `<div>` plano porque este
 *  archivo es puro HTML/CSS-in-JS (sin componentes RN) por rendimiento del
 *  compositing del canvas; mezclar paradigmas ahí sí sería inconsistente. */
function ScanBadge({ complete }: { complete: boolean }) {
  const color = complete ? palette.success : palette.smoke;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        border: `1px solid ${color}`, borderRadius: 999, padding: '3px 10px',
        fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1, color,
      }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />
      {complete ? 'ESCANEO COMPLETO' : 'ESCANEANDO…'}
    </span>
  );
}

/** Retícula circular en una articulación — anillo delgado + punto central,
 *  el lenguaje visual de la referencia. */
function JointReticle({ joint, delay }: { joint: ProjectedJoint; delay: number }) {
  const cx = joint.x * 100;
  const cy = joint.y * 100;
  return (
    <g className="polaris-scan-reticle" style={{ animation: `polarisScanReticle 2.8s ease-in-out ${delay}s infinite` }}>
      <circle cx={cx} cy={cy} r={1.8} fill="none" stroke={palette.goldText} strokeWidth={0.25} />
      <circle cx={cx} cy={cy} r={0.5} fill={palette.goldText} />
    </g>
  );
}

/** Overlay SVG de la red de articulaciones + el pulso del pecho, superpuesto
 *  al canvas del cuerpo. `viewBox` en porcentaje (0-100) para no depender
 *  del tamaño en píxeles de la columna. */
function JointNetworkOverlay({ preset }: { preset: (typeof VIEW_PRESETS)[number] }) {
  const joints = useMemo(
    () => projectJointsForView(preset.yaw, preset.pitch, CAM_ZOOM, ASPECT),
    [preset],
  );
  const chest = useMemo(
    () => projectChestCenter(preset.yaw, preset.pitch, CAM_ZOOM, ASPECT),
    [preset],
  );
  const byId = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>(joints.map((j) => [j.id, j]));
    map.set('chest', chest);
    return map;
  }, [joints, chest]);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {JOINT_LINKS.map(([fromId, toId], i) => {
        const a = byId.get(fromId);
        const b = byId.get(toId);
        if (!a || !b) return null;
        return (
          <line
            key={`${fromId}-${toId}`}
            className="polaris-scan-line"
            x1={a.x * 100} y1={a.y * 100} x2={b.x * 100} y2={b.y * 100}
            stroke={palette.lineGold} strokeWidth={0.3}
            strokeDasharray="2.5 1.5"
            style={{ animation: `polarisScanLine 3.2s ease-in-out ${i * 0.12}s infinite, polarisScanDash 6s linear infinite` }}
          />
        );
      })}
      {joints.map((j, i) => (
        <JointReticle key={j.id} joint={j} delay={i * 0.15} />
      ))}
    </svg>
  );
}

/** Siete anclas contemplativas proyectadas con la misma cámara que el GLB.
 * Son controles de atención/meditación; no representan anatomía clínica. */
function EnergyFocusOverlay({
  preset,
  activeFocus,
  onFocusSelect,
}: {
  preset: (typeof VIEW_PRESETS)[number];
  activeFocus: EnergyFocusId;
  onFocusSelect?: (focus: EnergyFocusId) => void;
}) {
  const projected = useMemo(
    () => projectEnergyFociForView(preset.yaw, preset.pitch, CAM_ZOOM, ASPECT),
    [preset],
  );

  return (
    <div
      role="group"
      aria-label={`Focos de atención en ${preset.label}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {projected.map((candidate) => {
        const focus = energyFocusById(candidate.id);
        const active = candidate.id === activeFocus;
        return (
          <button
            key={candidate.id}
            type="button"
            aria-label={`Seleccionar ${focus.label} en ${preset.label}`}
            aria-pressed={active}
            onClick={() => onFocusSelect?.(candidate.id)}
            title={focus.label}
            style={{
              appearance: 'none',
              background: active ? 'rgba(255,200,4,0.16)' : 'rgba(180,180,184,0.05)',
              border: `1px solid ${active ? palette.goldText : 'rgba(180,180,184,0.48)'}`,
              borderRadius: '50%',
              boxShadow: active
                ? '0 0 8px rgba(255,200,4,0.95), 0 0 20px rgba(255,200,4,0.45)'
                : '0 0 5px rgba(180,180,184,0.28)',
              cursor: onFocusSelect ? 'pointer' : 'default',
              height: active ? 30 : 22,
              left: `${candidate.x * 100}%`,
              padding: 0,
              pointerEvents: 'auto',
              position: 'absolute',
              top: `${candidate.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'height 160ms ease, width 160ms ease, border-color 160ms ease',
              width: active ? 30 : 22,
              zIndex: 3,
            }}>
            <span
              aria-hidden
              style={{
                background: active ? palette.goldText : '#B4B4B8',
                borderRadius: '50%',
                display: 'block',
                height: active ? 6 : 4,
                margin: 'auto',
                width: active ? 6 : 4,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ScanColumn({
  preset,
  bitmap,
  activeFocus,
  onFocusSelect,
}: {
  preset: (typeof VIEW_PRESETS)[number];
  bitmap: ImageBitmap | null;
  activeFocus: EnergyFocusId;
  onFocusSelect?: (focus: EnergyFocusId) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  const chest = useMemo(
    () => projectChestCenter(preset.yaw, preset.pitch, CAM_ZOOM, ASPECT),
    [preset],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '0 0 auto', width: COL_W }}>
      <div style={{ width: '100%', aspectRatio: '300 / 486', position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        {bitmap ? (
          <>
            {/* Pulso del pecho — radial-gradient sobre la posición proyectada
                real del pecho (mismo CHEST_Y que colorea las partículas),
                mixBlendMode 'screen' para que se funda con el brillo del
                canvas de abajo en vez de taparlo con un círculo plano. */}
            <div
              aria-hidden
              className="polaris-scan-pulse"
              style={{
                position: 'absolute',
                left: `${chest.x * 100}%`,
                top: `${chest.y * 100}%`,
                width: '38%',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${palette.goldText} 0%, rgba(255,200,4,0.35) 45%, transparent 72%)`,
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                animation: 'polarisScanPulse 2.4s ease-in-out infinite',
              }}
            />
            <JointNetworkOverlay preset={preset} />
            <EnergyFocusOverlay
              preset={preset}
              activeFocus={activeFocus}
              onFocusSelect={onFocusSelect}
            />
          </>
        ) : null}
      </div>
      <div style={{ fontFamily: Fonts.display, fontSize: 10, letterSpacing: 1, color: palette.smoke, whiteSpace: 'nowrap' }}>
        {preset.id}. {preset.label}
      </div>
    </div>
  );
}

/** Tira "waveform" decorativa — trazo SVG determinístico (mismo patrón de
 *  ruido shader-like que `humanFigure3DLogic.hash`, copiado aquí porque esa
 *  función no está exportada), animado por `stroke-dashoffset`. Puro chrome
 *  visual: SIN cifras ni unidades — no pretende ser un dato biométrico real. */
function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

function Waveform({ seed }: { seed: number }) {
  const points = useMemo(() => {
    const n = 28;
    return Array.from({ length: n }, (_, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 50 + (hash(seed + i * 12.9898) - 0.5) * 70;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [seed]);
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 28, display: 'block' }}>
      <polyline
        className="polaris-scan-waveform"
        points={points}
        fill="none"
        stroke={palette.goldText}
        strokeWidth={2}
        strokeDasharray="6 4"
        style={{ animation: 'polarisScanDash 3.4s linear infinite', opacity: 0.55 }}
      />
    </svg>
  );
}

/** Barra de progreso simple — reusa el lenguaje visual de `StateMeter`
 *  (`components/polaris.tsx`) en `<div>` plano por el mismo motivo que
 *  `ScanBadge`. `value` es una fracción real [0,1], no una cifra inventada. */
function HudGauge({ label, value }: { label: string; value: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: Fonts.mono, fontSize: 8, letterSpacing: 0.5, color: palette.smoke }}>
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: palette.lineSoft, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: palette.gold, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export function BodyScanReport({
  primaryZone: _primaryZone = 'pecho',
  activeFocus = 'pecho',
  onFocusSelect,
}: BodyScanReportProps) {
  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);

  useEffect(() => {
    injectScanAnimationStyles();
  }, []);

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

  const loaded = bitmaps.length === VIEW_PRESETS.length;

  return (
    <div
      style={{
        background: `${palette.black} linear-gradient(${palette.line} 1px, transparent 1px), linear-gradient(90deg, ${palette.line} 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 28px 28px, 28px 28px',
        border: `1px solid ${palette.line}`,
        borderRadius: 4,
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Starfield sutil — un solo fondo consistente, no tres estilos como
          en el video de referencia (grilla → nebulosa → matrix rain: eso es
          un artefacto de generación por IA, no una escena 3D coherente). */}
      <div
        aria-hidden
        className="polaris-scan-starfield"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.18,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1.5px)',
          backgroundSize: '46px 46px',
          animation: 'polarisScanDrift 70s linear infinite',
        }}
      />

      {/* ── Cabecera: rótulo + título + leyenda + insignia de estado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20, position: 'relative' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: palette.goldText, fontSize: 12 }}>◆</span>
            <span style={{ fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: palette.goldText }}>
              ESCANEO BIOMÉTRICO
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ fontFamily: Fonts.display, fontWeight: 800, fontSize: 26, letterSpacing: 1, color: palette.ivory }}>
              CUERPO DE PARTÍCULAS
            </span>
            <ScanBadge complete={loaded} />
          </div>
          <div style={{ fontFamily: Fonts.mono, fontSize: 10, letterSpacing: 1.2, color: palette.goldText, marginTop: 8 }}>
            TOCA UN FOCO · {energyFocusById(activeFocus).label.toUpperCase()}
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
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, alignItems: 'stretch', position: 'relative' }}>
        {VIEW_PRESETS.map((preset, i) => (
          <Fragment key={preset.id}>
            {i > 0 ? <Ruler /> : null}
            <ScanColumn
              preset={preset}
              bitmap={bitmaps[i] ?? null}
              activeFocus={activeFocus}
              onFocusSelect={onFocusSelect}
            />
          </Fragment>
        ))}
      </div>

      {/* ── Pie: HUD con datos reales del pipeline + waveforms decorativos ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 16, flexWrap: 'wrap', position: 'relative' }}>
        <span style={{ fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 1, color: palette.smoke }}>
          MODELO 3D · ESCANEO BIOMÉTRICO · CUERPO DE PARTÍCULAS · {PARTICLE_TOTAL.toLocaleString('es')} PARTÍCULAS
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <HudGauge label="VISTAS" value={bitmaps.length / VIEW_PRESETS.length} />
          <div style={{ width: 70 }}><Waveform seed={3.7} /></div>
          <div style={{ width: 70 }}><Waveform seed={11.2} /></div>
          <span style={{ color: palette.smoke, fontSize: 12 }}>＋</span>
        </div>
      </div>
    </div>
  );
}
