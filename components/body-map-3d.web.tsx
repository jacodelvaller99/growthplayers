/**
 * BodyMap3D (web) — el "escaneo biométrico": nube de partículas densa, con
 * volumen, shimmer, glow aditivo y toque directo — SIN three.js.
 *
 * La referencia del dueño (captura de 6 vistas HUD, "ESCANEO BIOMÉTRICO")
 * marcó el objetivo: no una silueta plana de 800 puntos, sino algo que se
 * sienta escaneado. La cadena three/react-three-fiber acumuló tres fallos de
 * integración con Metro/Expo Web; para una nube de puntos no hace falta el
 * motor entero — la MISMA proyección en perspectiva que three.js aplicaría
 * por dentro vive en `projectPoint` (lib/humanFigure3DLogic.ts, pura y
 * testeada) y aquí solo se dibuja con canvas 2D.
 *
 * Sobre la versión anterior (793 puntos, sin picking):
 *   · densidad ×7 (cell:3, ~5.5k puntos) — misma anatomía testeada.
 *   · shimmer: brillo por punto oscila con una fase determinista por
 *     coordenada (mismo patrón de hash que ya usa `humanFigure3DLogic`).
 *   · glow de 3 pasadas aditivas (`globalCompositeOperation: 'lighter'`)
 *     tras la zona primaria — más denso que un único gradiente.
 *   · TOQUE DIRECTO: un tap corto (<8px, <350ms) sobre el cuerpo hace
 *     picking (`pickZone`, puro) sobre los puntos ya proyectados del frame.
 *   · 6 vistas preset con tween de yaw/pitch (`shortestYawDelta`, puro) —
 *     instantáneo con reduce-motion.
 *   · HUD: rótulo, esquinas, leyenda oro/plata y chips de vista — divs
 *     superpuestos al canvas (no hace falta React Native aquí; es un
 *     archivo `.web.tsx`, nunca corre en nativo).
 *
 * Anatomía y profundidad vienen de `generateFigure3D` — misma semilla, mismo
 * cuerpo testeado que el SVG nativo. Nativo sigue en SVG 2D (handoff aparte).
 */
import { useEffect, useRef, useState } from 'react';

import { Fonts, palette } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { BodyZone } from '@/lib/bodyMapLogic';
import {
  generateFigure3D,
  pickZone,
  projectPoint,
  shortestYawDelta,
  VIEW_PRESETS,
  type Camera,
  type ViewPreset,
  type ZoneCandidate,
} from '@/lib/humanFigure3DLogic';
import { VIEWBOX } from '@/lib/humanFigureLogic';

/** Semilla fija — el mismo activo de marca en cada sesión. `cell: 3` es el
 *  "escaneo biométrico": ~5.5k puntos, la densidad de la referencia. */
const FIGURE_3D = generateFigure3D({ seed: 90417, cell: 3 });

/** Los puntos en coordenadas de MUNDO (centrados, +y hacia arriba), listos
 *  para `projectPoint`. Se calcula una vez a nivel de módulo. */
const WORLD = FIGURE_3D.map((d) => ({
  x: d.x - VIEWBOX.w / 2,
  y: -(d.y - VIEWBOX.h / 2),
  z: d.z,
  r: d.r,
  zone: d.zone,
  edge: d.edge,
}));

/** Fase de shimmer por punto — determinista, calculada una vez. El brillo de
 *  cada partícula oscila con esta fase (no con su índice de dibujo, que
 *  cambiaría cada frame por el orden del pintor). */
function hash01(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}
const PHASE = WORLD.map((d, i) => hash01(d.x * 12.9898 + d.y * 78.233 + i * 0.0013) * Math.PI * 2);

/**
 * En web `cv()` (constants/themeColors.ts) devuelve strings `var(--c-*)` para
 * los tokens tematizables — y `canvas.fillStyle` NO entiende `var()`: pintaría
 * negro en silencio. Se resuelve la variable real del documento, con el hex
 * de fallback si aún no se inyectó el <style> del tema.
 */
function cssColor(value: string, fallback: string): string {
  if (!value.startsWith('var(')) return value;
  const name = value.slice(4, -1).trim();
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return resolved || fallback;
}

const AUTO_ROTATE_SPEED = 0.0022;
const PITCH_MAX = 0.9;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.2;
/** Tap vs. drag: por debajo de esta distancia y este tiempo, es un toque. */
const TAP_MAX_DIST = 8;
const TAP_MAX_MS = 350;
/** Radio de picking en píxeles CSS — más generoso que el punto en sí, como
 *  el resto de la app (objetivo táctil > gráfico). */
const PICK_RADIUS = 16;
const TWEEN_MS = 550;

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export interface BodyMap3DProps {
  selected: BodyZone[];
  /** Toque directo sobre una partícula del cuerpo — el gesto que pidió el
   *  dueño explícitamente. Opcional: sin esta prop, el cuerpo sigue siendo
   *  puramente decorativo (el legend de `body-map.tsx` sigue funcionando). */
  onToggleZone?: (zone: BodyZone) => void;
}

export function BodyMap3D({ selected, onToggleZone }: BodyMap3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [activeView, setActiveView] = useState<string | null>('01');

  // La cámara vive en refs: orbitar no debe re-renderizar React por frame.
  const camRef = useRef({ yaw: 0.35, pitch: -0.05, zoom: 1 });
  const selectedRef = useRef<BodyZone[]>(selected);
  selectedRef.current = selected;
  const interactedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const tweenRef = useRef<{ fromYaw: number; toYaw: number; fromPitch: number; toPitch: number; start: number } | null>(null);

  const goToView = (preset: ViewPreset) => {
    interactedRef.current = true;
    setActiveView(preset.id);
    const cam = camRef.current;
    if (reducedMotion) {
      cam.yaw += shortestYawDelta(cam.yaw, preset.yaw);
      cam.pitch = preset.pitch;
      drawRef.current();
      return;
    }
    tweenRef.current = {
      fromYaw: cam.yaw,
      toYaw: cam.yaw + shortestYawDelta(cam.yaw, preset.yaw),
      fromPitch: cam.pitch,
      toPitch: preset.pitch,
      start: performance.now(),
    };
  };

  const drawRef = useRef<() => void>(() => {});
  drawRef.current = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

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
    ctx.clearRect(0, 0, w, h);

    const sel = selectedRef.current;
    const gold = palette.gold; // hex constante de marca — directo.
    const goldDim = cssColor(palette.goldText, '#FFC804');
    const silver = cssColor(palette.silhouette, '#5F5F5F');

    const cam: Camera = { ...camRef.current, w, h };
    const nowSec = performance.now() * 0.001;

    // Resplandor tras la zona primaria: 3 pasadas ADITIVAS (`lighter`) en vez
    // de un único gradiente — más densidad de "arde en oro" sin dibujar nada
    // por punto, que es lo que arrodilla el frame rate.
    const primary = sel[0];
    if (primary) {
      const pts = WORLD.filter((d) => d.zone === primary && !d.edge);
      if (pts.length) {
        let cx = 0, cy = 0, cz = 0;
        for (const d of pts) { cx += d.x; cy += d.y; cz += d.z; }
        const centro = projectPoint(
          { x: cx / pts.length, y: cy / pts.length, z: cz / pts.length },
          cam,
        );
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const pass of [
          { r: 92, a: 0.09 },
          { r: 62, a: 0.15 },
          { r: 32, a: 0.22 },
        ]) {
          const radio = pass.r * centro.scale;
          const glow = ctx.createRadialGradient(centro.sx, centro.sy, 0, centro.sx, centro.sy, radio);
          glow.addColorStop(0, `rgba(255, 200, 4, ${pass.a})`);
          glow.addColorStop(1, 'rgba(255, 200, 4, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(centro.sx, centro.sy, radio, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Proyectar, ordenar de atrás hacia adelante (pintor) y dibujar.
    const projected = WORLD.map((d, i) => {
      const p = projectPoint(d, cam);
      const idx = d.zone ? sel.indexOf(d.zone) : -1;
      // Misma semántica de color que el SVG 2D: la primera zona tocada manda.
      const color = idx === 0 ? gold : idx > 0 ? goldDim : silver;
      let alpha = idx === 0 ? (d.edge ? 0.55 : 1)
        : idx > 0 ? (d.edge ? 0.35 : 0.8)
        : d.edge ? 0.28 : 0.85;
      // Atenuación por profundidad — lo trasero más tenue es lo que vende el
      // volumen. depth ronda CAM_DIST(520) ± ~45.
      alpha *= Math.max(0.5, Math.min(1, 1 - (p.depth - 520) / 190));
      // Shimmer vivo: brillo por punto oscila con una fase propia. Quieto con
      // reduce-motion (WCAG 2.3.3) — el cuerpo sigue denso, solo no titila.
      if (!reducedMotion) alpha *= 0.82 + 0.18 * Math.sin(nowSec * 1.6 + PHASE[i]);
      return { p, color, alpha, r: Math.max(0.4, d.r * p.scale * 0.62) };
    });
    projected.sort((a, b) => b.p.depth - a.p.depth);

    for (const e of projected) {
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.p.sx, e.p.sy, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Primer frame SÍNCRONO al montar y redibujo en cada cambio de selección.
  // No se depende de requestAnimationFrame para existir: en pestañas o paneles
  // ocultos rAF no dispara y la figura debe estar pintada igual.
  useEffect(() => {
    drawRef.current();
  }, [selected]);

  // Tamaño reactivo + auto-rotación + shimmer + tween de vista. Un solo loop:
  // shimmer necesita frames continuos aunque ya hubo interacción, así que no
  // se apaga con `interactedRef` — solo el auto-rotate lo respeta.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(wrap);

    let raf = 0;
    if (!reducedMotion) {
      const tick = () => {
        const tw = tweenRef.current;
        if (tw) {
          const t = Math.min(1, (performance.now() - tw.start) / TWEEN_MS);
          const e = easeOutQuart(t);
          camRef.current.yaw = tw.fromYaw + (tw.toYaw - tw.fromYaw) * e;
          camRef.current.pitch = tw.fromPitch + (tw.toPitch - tw.fromPitch) * e;
          if (t >= 1) tweenRef.current = null;
        } else if (!interactedRef.current) {
          camRef.current.yaw += AUTO_ROTATE_SPEED;
        }
        drawRef.current();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  // Rueda = zoom. Listener manual porque React lo registra pasivo y aquí hay
  // que preventDefault para no hacer scroll de la página al acercar el cuerpo.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interactedRef.current = true;
      const c = camRef.current;
      c.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, c.zoom - e.deltaY * 0.001));
      drawRef.current();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const activeLabel = VIEW_PRESETS.find((v) => v.id === activeView)?.label ?? 'ÓRBITA LIBRE';

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'grab', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Escaneo biométrico — toca una zona o arrastra para orbitar"
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
        onPointerDown={(e) => {
          downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
          dragRef.current = { x: e.clientX, y: e.clientY };
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag) return;
          interactedRef.current = true;
          const dx = e.clientX - drag.x;
          const dy = e.clientY - drag.y;
          dragRef.current = { x: e.clientX, y: e.clientY };
          const c = camRef.current;
          c.yaw += dx * 0.008;
          c.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, c.pitch - dy * 0.008));
          setActiveView(null); // la órbita libre deja de calzar con un preset.
          drawRef.current();
        }}
        onPointerUp={(e) => {
          dragRef.current = null;
          const down = downRef.current;
          downRef.current = null;
          if (!down || !onToggleZone) return;
          const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
          const elapsed = performance.now() - down.t;
          // Un movimiento corto y rápido ES un toque, no el inicio de una
          // órbita — así "tocar la mandíbula" no exige inmovilidad perfecta.
          if (dist >= TAP_MAX_DIST || elapsed >= TAP_MAX_MS) return;
          const wrap = wrapRef.current;
          if (!wrap) return;
          const rect = wrap.getBoundingClientRect();
          const pickCam: Camera = { ...camRef.current, w: rect.width, h: rect.height };
          const candidates: ZoneCandidate[] = [];
          for (const d of WORLD) {
            if (!d.zone || d.edge) continue;
            const p = projectPoint(d, pickCam);
            candidates.push({ sx: p.sx, sy: p.sy, zone: d.zone });
          }
          const zone = pickZone(candidates, e.clientX - rect.left, e.clientY - rect.top, PICK_RADIUS);
          if (zone) onToggleZone(zone);
        }}
        onPointerCancel={() => { dragRef.current = null; downRef.current = null; }}
      />

      {/* ── HUD — "ESCANEO BIOMÉTRICO", esquinas, leyenda, vistas ── */}
      <div style={{ position: 'absolute', top: 8, left: 10, pointerEvents: 'none' }}>
        <div style={{ fontFamily: Fonts.display, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: palette.goldText }}>
          ESCANEO BIOMÉTRICO
        </div>
        <div style={{ fontFamily: Fonts.display, fontSize: 9, letterSpacing: 1, color: palette.smoke, marginTop: 2 }}>
          {activeLabel}
        </div>
      </div>

      {[
        { top: 6, left: 6, borders: 'top left' },
        { top: 6, right: 6, borders: 'top right' },
        { bottom: 6, left: 6, borders: 'bottom left' },
        { bottom: 6, right: 6, borders: 'bottom right' },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            pointerEvents: 'none',
            top: c.top,
            left: c.left,
            right: c.right,
            bottom: c.bottom,
            borderTop: c.borders.includes('top') ? `1px solid ${palette.lineGold}` : undefined,
            borderBottom: c.borders.includes('bottom') ? `1px solid ${palette.lineGold}` : undefined,
            borderLeft: c.borders.includes('left') ? `1px solid ${palette.lineGold}` : undefined,
            borderRight: c.borders.includes('right') ? `1px solid ${palette.lineGold}` : undefined,
          }}
        />
      ))}

      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', gap: 12, pointerEvents: 'none' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: Fonts.display, fontSize: 8, letterSpacing: 1, color: palette.smoke }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: palette.gold, display: 'inline-block' }} />
          ORO · ZONA ACTIVA
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: Fonts.display, fontSize: 8, letterSpacing: 1, color: palette.smoke }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: cssColor(palette.silhouette, '#5F5F5F'), display: 'inline-block' }} />
          PLATA · EN REPOSO
        </span>
      </div>

      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 92, justifyContent: 'flex-end' }}>
        {VIEW_PRESETS.map((v) => {
          const on = activeView === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => goToView(v)}
              aria-label={v.label}
              aria-pressed={on}
              style={{
                minWidth: 22,
                height: 22,
                padding: '0 4px',
                fontFamily: Fonts.display,
                fontSize: 9,
                letterSpacing: 0.5,
                color: on ? palette.ink : palette.smoke,
                background: on ? palette.gold : 'rgba(255,255,255,0.04)',
                border: `1px solid ${on ? palette.gold : palette.line}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}>
              {v.id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
