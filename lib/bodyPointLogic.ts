/**
 * Coordenadas precisas sobre el escaneo frontal del check-in.
 *
 * El bitmap da la fidelidad visual; esta geometría pequeña da significado al
 * gesto. Guardamos porcentajes normalizados para que el mismo punto sobreviva
 * a pantallas distintas sin almacenar píxeles ni datos clínicos.
 */
import type { BodyZone } from '@/lib/bodyMapLogic';

export type BodySide = 'izquierda' | 'centro' | 'derecha';

export type BodyRegion =
  | 'cabeza'
  | 'frente'
  | 'mandibula'
  | 'garganta'
  | 'hombro'
  | 'pecho'
  | 'abdomen'
  | 'brazo_superior'
  | 'codo'
  | 'antebrazo'
  | 'muneca'
  | 'mano'
  | 'cadera'
  | 'muslo'
  | 'rodilla'
  | 'pantorrilla'
  | 'tobillo'
  | 'pie';

export interface BodyPoint {
  /** 0..1 dentro de la imagen frontal, no píxeles de pantalla. */
  x: number;
  y: number;
  region: BodyRegion;
  side: BodySide;
  /** Zona semántica amplia para recomendaciones y patrones históricos. */
  zone: BodyZone;
}

interface Point {
  x: number;
  y: number;
}

const REGION_ZONE: Record<BodyRegion, BodyZone> = {
  cabeza: 'cabeza',
  frente: 'cabeza',
  mandibula: 'mandibula',
  garganta: 'garganta',
  hombro: 'hombros',
  pecho: 'pecho',
  abdomen: 'estomago',
  brazo_superior: 'brazos',
  codo: 'brazos',
  antebrazo: 'brazos',
  muneca: 'brazos',
  mano: 'manos',
  cadera: 'cadera',
  muslo: 'piernas',
  rodilla: 'piernas',
  pantorrilla: 'piernas',
  tobillo: 'piernas',
  pie: 'pies',
};

const REGION_LABEL: Record<BodyRegion, string> = {
  cabeza: 'cabeza',
  frente: 'frente',
  mandibula: 'mandíbula',
  garganta: 'garganta',
  hombro: 'hombro',
  pecho: 'pecho',
  abdomen: 'abdomen',
  brazo_superior: 'brazo',
  codo: 'codo',
  antebrazo: 'antebrazo',
  muneca: 'muñeca',
  mano: 'mano',
  cadera: 'cadera',
  muslo: 'muslo',
  rodilla: 'rodilla',
  pantorrilla: 'pantorrilla',
  tobillo: 'tobillo',
  pie: 'pie',
};

const PAIRED_REGIONS = new Set<BodyRegion>([
  'hombro', 'brazo_superior', 'codo', 'antebrazo', 'muneca', 'mano',
  'cadera', 'muslo', 'rodilla', 'pantorrilla', 'tobillo', 'pie',
]);

const FEMININE_REGIONS = new Set<BodyRegion>(['muneca', 'mano', 'cadera', 'rodilla', 'pantorrilla']);

function inEllipse(point: Point, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const wx = point.x - from.x;
  const wy = point.y - from.y;
  const lengthSquared = vx * vx + vy * vy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lengthSquared));
  return Math.hypot(point.x - (from.x + t * vx), point.y - (from.y + t * vy));
}

function inCapsule(point: Point, from: Point, to: Point, radius: number): boolean {
  return distanceToSegment(point, from, to) <= radius;
}

function paired(point: Point, left: Point, right: Point, rx: number, ry: number): boolean {
  return inEllipse(point, left.x, left.y, rx, ry) || inEllipse(point, right.x, right.y, rx, ry);
}

/** Región anatómica visible en la imagen. Devuelve null sobre el fondo negro. */
export function bodyRegionAt(x: number, y: number): BodyRegion | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return null;
  const point = { x, y };

  if (inEllipse(point, 0.5, 0.075, 0.05, 0.026)) return 'frente';
  if (inEllipse(point, 0.5, 0.085, 0.075, 0.065) && y < 0.135) return 'cabeza';
  if (inEllipse(point, 0.5, 0.145, 0.068, 0.043)) return 'mandibula';
  if (x >= 0.445 && x <= 0.555 && y >= 0.165 && y <= 0.225) return 'garganta';

  if (paired(point, { x: 0.205, y: 0.535 }, { x: 0.795, y: 0.535 }, 0.055, 0.075)) return 'mano';
  if (paired(point, { x: 0.3, y: 0.255 }, { x: 0.7, y: 0.255 }, 0.09, 0.065)) return 'hombro';

  if (
    inCapsule(point, { x: 0.345, y: 0.275 }, { x: 0.285, y: 0.415 }, 0.052)
    || inCapsule(point, { x: 0.655, y: 0.275 }, { x: 0.715, y: 0.415 }, 0.052)
  ) return 'brazo_superior';
  if (paired(point, { x: 0.275, y: 0.435 }, { x: 0.725, y: 0.435 }, 0.05, 0.045)) return 'codo';
  if (
    inCapsule(point, { x: 0.275, y: 0.445 }, { x: 0.225, y: 0.515 }, 0.043)
    || inCapsule(point, { x: 0.725, y: 0.445 }, { x: 0.775, y: 0.515 }, 0.043)
  ) return 'antebrazo';
  if (paired(point, { x: 0.22, y: 0.515 }, { x: 0.78, y: 0.515 }, 0.04, 0.035)) return 'muneca';

  // Elipse del torso superior limitada antes del abdomen. Sin este corte, el
  // solapamiento visual clasificaba el plexo/abdomen como pecho y disparaba
  // una alerta torácica donde no correspondía.
  if (inEllipse(point, 0.5, 0.31, 0.185, 0.125) && y < 0.385) return 'pecho';
  if (inEllipse(point, 0.5, 0.43, 0.14, 0.14)) return 'abdomen';
  if (inEllipse(point, 0.5, 0.545, 0.145, 0.09)) return 'cadera';

  if (paired(point, { x: 0.4, y: 0.735 }, { x: 0.6, y: 0.735 }, 0.055, 0.047)) return 'rodilla';
  if (
    inCapsule(point, { x: 0.43, y: 0.575 }, { x: 0.405, y: 0.705 }, 0.066)
    || inCapsule(point, { x: 0.57, y: 0.575 }, { x: 0.595, y: 0.705 }, 0.066)
  ) return 'muslo';
  if (paired(point, { x: 0.39, y: 0.95 }, { x: 0.61, y: 0.95 }, 0.072, 0.035)) return 'pie';
  if (
    inCapsule(point, { x: 0.4, y: 0.77 }, { x: 0.39, y: 0.885 }, 0.052)
    || inCapsule(point, { x: 0.6, y: 0.77 }, { x: 0.61, y: 0.885 }, 0.052)
  ) return 'pantorrilla';
  if (paired(point, { x: 0.39, y: 0.905 }, { x: 0.61, y: 0.905 }, 0.038, 0.046)) return 'tobillo';

  return null;
}

function sideAt(x: number): BodySide {
  if (x < 0.465) return 'izquierda';
  if (x > 0.535) return 'derecha';
  return 'centro';
}

function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function bodyPointAt(x: number, y: number): BodyPoint | null {
  const region = bodyRegionAt(x, y);
  if (!region) return null;
  return {
    x: roundCoordinate(x),
    y: roundCoordinate(y),
    region,
    side: sideAt(x),
    zone: REGION_ZONE[region],
  };
}

export function bodyPointLabel(point: BodyPoint): string {
  const label = REGION_LABEL[point.region];
  if (!PAIRED_REGIONS.has(point.region) || point.side === 'centro') return label;
  const feminine = FEMININE_REGIONS.has(point.region);
  const ending = point.side === 'izquierda'
    ? (feminine ? 'izquierda' : 'izquierdo')
    : (feminine ? 'derecha' : 'derecho');
  return `${label} ${ending}`;
}

export function joinBodyPointLabels(points: readonly BodyPoint[]): string {
  const labels = [...new Set(points.map(bodyPointLabel))];
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length > 3) return `${labels.slice(0, 3).join(', ')} y ${labels.length - 3} más`;
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

/** Tocar cerca de un marcador lo quita; un toque nuevo se agrega. */
export function toggleBodyPoint(
  current: readonly BodyPoint[],
  next: BodyPoint,
  maxPoints = 6,
): BodyPoint[] {
  const nearIndex = current.findIndex((point) => {
    // Corrige la proporción alta del bitmap: 4% vertical no equivale a 4% horizontal.
    const dx = (point.x - next.x) * (1024 / 1536);
    const dy = point.y - next.y;
    return Math.hypot(dx, dy) <= 0.032;
  });
  if (nearIndex >= 0) return current.filter((_, index) => index !== nearIndex);
  return [...current, next].slice(-maxPoints);
}

export function zonesFromBodyPoints(points: readonly BodyPoint[]): BodyZone[] {
  return [...new Set(points.map((point) => point.zone))];
}

/** Frontera de datos para JSON local/Supabase: registros antiguos o
 * manipulados no deben llegar al render como coordenadas arbitrarias. */
export function parseBodyPoints(value: unknown): BodyPoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is BodyPoint => {
    if (!candidate || typeof candidate !== 'object') return false;
    const point = candidate as Partial<BodyPoint>;
    if (typeof point.x !== 'number' || typeof point.y !== 'number') return false;
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return false;
    if (point.side !== 'izquierda' && point.side !== 'centro' && point.side !== 'derecha') return false;
    if (!point.region || !Object.prototype.hasOwnProperty.call(REGION_ZONE, point.region)) return false;
    return REGION_ZONE[point.region] === point.zone;
  }).slice(0, 6);
}
