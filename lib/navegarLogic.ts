/**
 * lib/navegarLogic.ts — lógica pura de Navegar Polaris (video-guías de la app). Sin IO, testeada.
 *
 * El catálogo vive en el bucket privado `navegar` (<rol>/catalogo.json); el servidor decide qué rol
 * puede leer cada carpeta (migración 20261116000000_navegar_polaris.sql). Aquí solo se valida la forma.
 */

export const ROLES_GUIA = ['cliente', 'admin'] as const;
export type RolGuia = typeof ROLES_GUIA[number];

export const NOMBRE_ROL_GUIA: Record<RolGuia, string> = { cliente: 'Cliente', admin: 'Administración' };

export interface Guia {
  id: string;        // TPC00, TPC01…, TPA01…
  n: string;         // "01"
  rol: RolGuia;
  titulo: string;
  meta: string;      // "48 segundos"
  pasos: string[];   // texto de cada paso (paso-1.jpg … paso-N.jpg)
  tips: string[];    // caja "¿Y si…?"
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Normaliza un catalogo.json; descarta filas sin la forma esperada o con un id que no sirve de carpeta. */
export function leerCatalogo(json: unknown, rol: RolGuia): Guia[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((r: Record<string, unknown>) =>
    r && typeof r.id === 'string' && /^[A-Z0-9]+$/.test(r.id) && typeof r.titulo === 'string'
      ? [{ id: r.id, n: String(r.n ?? ''), rol, titulo: r.titulo, meta: String(r.meta ?? ''), pasos: strs(r.pasos), tips: strs(r.tips) }]
      : [])
    .sort((a, b) => a.n.localeCompare(b.n));
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda sin tildes ni mayúsculas en título, rol, pasos y tips; deben aparecer todas las palabras. */
export function filtrarGuias(lista: Guia[], consulta: string): Guia[] {
  const palabras = sinTildes(consulta).split(/\s+/).filter(Boolean);
  if (!palabras.length) return lista;
  return lista.filter((g) => {
    const texto = sinTildes([g.titulo, NOMBRE_ROL_GUIA[g.rol], ...g.pasos, ...g.tips].join(' '));
    return palabras.every((p) => texto.includes(p));
  });
}

/** Subtítulo: desde/hasta en segundos + texto. Viene de <rol>/<id>/subtitulos.json. */
export interface Cue { d: number; h: number; t: string }

/** Normaliza subtitulos.json; descarta filas mal formadas y las ordena por inicio. */
export function leerSubtitulos(json: unknown): Cue[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((c: any) => c && typeof c.t === 'string' && Number.isFinite(c.d) && Number.isFinite(c.h) && c.h > c.d)
    .map((c: any) => ({ d: c.d, h: c.h, t: c.t }))
    .sort((a, b) => a.d - b.d);
}

/** El subtítulo que toca en el segundo `t` (o null entre frases). */
export function cueEn(cues: Cue[], t: number): string | null {
  return cues.find((c) => t >= c.d && t < c.h)?.t ?? null;
}

const marca = (s: number) => {
  const ms = Math.round(s * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};

/** WebVTT para la pista <track> del navegador (Safari la muestra también en pantalla completa). */
export function aVtt(cues: Cue[]): string {
  return 'WEBVTT\n\n' + cues.map((c) => `${marca(c.d)} --> ${marca(c.h)}\n${c.t}`).join('\n\n') + '\n';
}

/** Carpeta de una guía dentro del bucket (los ids vienen del catálogo; se validan igual). */
export function carpetaGuia(g: Pick<Guia, 'rol' | 'id'>): string {
  if (!ROLES_GUIA.includes(g.rol) || !/^[A-Z0-9]+$/.test(g.id)) throw new Error('Ruta de guía inválida');
  return `${g.rol}/${g.id}`;
}
