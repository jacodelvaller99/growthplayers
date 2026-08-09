/**
 * BodyMap3D (web) — la nube de partículas con volumen y órbita, SIN three.js.
 *
 * La cadena three/react-three-fiber acumuló tres fallos de integración con
 * Metro/Expo Web en una sola sesión (el `import.meta` de zustand vía el barrel
 * de drei, dos copias de three empaquetadas a la vez, y aun tras arreglar
 * ambas el canvas seguía vacío en el navegador real del dueño). Para una nube
 * de puntos no hace falta el motor: la MISMA proyección en perspectiva que
 * three.js aplicaría por dentro vive ahora en `projectPoint`
 * (lib/humanFigure3DLogic.ts, pura y testeada) y aquí solo se dibuja con
 * canvas 2D. Es el render exacto del visor con el que se validó visualmente
 * la figura — 793 puntos, órbita con arrastre, zoom con rueda, oro por zona.
 *
 * Anatomía y profundidad vienen de `generateFigure3D` — misma semilla, mismo
 * cuerpo testeado que el SVG nativo. La zona se elige con el legend de
 * `body-map.tsx` (igual que con three.js: sin picking por partícula).
 *
 * ponytail: sin inercia de arrastre ni picking 3D. Si algún día se quieren,
 * el punto de entrada es este mismo draw(): la cámara ya vive en refs.
 */
import { useEffect, useRef } from 'react';

import { palette } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { BodyZone } from '@/lib/bodyMapLogic';
import { generateFigure3D, projectPoint, type Camera } from '@/lib/humanFigure3DLogic';
import { VIEWBOX } from '@/lib/humanFigureLogic';

/** Semilla fija — el mismo activo de marca en cada sesión, como en 2D. */
const FIGURE_3D = generateFigure3D({ seed: 90417 });

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

export interface BodyMap3DProps {
  selected: BodyZone[];
}

export function BodyMap3D({ selected }: BodyMap3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  // La cámara vive en refs: orbitar no debe re-renderizar React por frame.
  const camRef = useRef({ yaw: 0.35, pitch: -0.05, zoom: 1 });
  const selectedRef = useRef<BodyZone[]>(selected);
  selectedRef.current = selected;
  const interactedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

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

    // Resplandor tras la zona primaria: UN gradiente grande y tenue debajo de
    // todo — no shadowBlur por punto, que arrodilla el frame rate.
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
        const radio = 62 * centro.scale;
        const glow = ctx.createRadialGradient(centro.sx, centro.sy, 0, centro.sx, centro.sy, radio);
        glow.addColorStop(0, 'rgba(255, 200, 4, 0.14)');
        glow.addColorStop(1, 'rgba(255, 200, 4, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centro.sx, centro.sy, radio, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Proyectar, ordenar de atrás hacia adelante (pintor) y dibujar.
    const projected = WORLD.map((d) => {
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

  // Tamaño reactivo + auto-rotación (hasta el primer gesto; nunca con
  // reduce-motion — WCAG 2.3.3, mismo criterio que el resto de la app).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(wrap);

    let raf = 0;
    if (!reducedMotion) {
      const tick = () => {
        if (!interactedRef.current) {
          camRef.current.yaw += AUTO_ROTATE_SPEED;
          drawRef.current();
        }
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

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'grab' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Cuerpo de partículas — arrastra para orbitar"
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
        onPointerDown={(e) => {
          interactedRef.current = true;
          dragRef.current = { x: e.clientX, y: e.clientY };
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag) return;
          const dx = e.clientX - drag.x;
          const dy = e.clientY - drag.y;
          dragRef.current = { x: e.clientX, y: e.clientY };
          const c = camRef.current;
          c.yaw += dx * 0.008;
          c.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, c.pitch - dy * 0.008));
          drawRef.current();
        }}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      />
    </div>
  );
}
