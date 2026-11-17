/**
 * lib/navegar.ts — IO de Navegar Polaris: catálogos y URLs firmadas del bucket PRIVADO `navegar`.
 *
 * Quién ve qué lo decide el SERVIDOR (políticas de storage.objects, migración 20261116000000_navegar_polaris.sql):
 * la app intenta leer el catálogo de cada rol y solo recibe los que su cuenta puede leer. Ningún texto de las
 * guías vive en el bundle. Todo degrada a vacío (el error se registra con logSilentError).
 */
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';
import { carpetaGuia, leerCatalogo, ROLES_GUIA, type Guia } from '@/lib/navegarLogic';

const BUCKET = 'navegar';
/** Un video dura < 1,5 min; al volver a abrir la guía se firman de nuevo. */
const TTL_S = 900;
const supa: any = supabase;

export interface MediosGuia { video: string | null; pasos: (string | null)[] }

/** Catálogos que esta cuenta puede leer (cliente para todos; admin solo para admins y mentores). */
export async function cargarGuias(): Promise<Guia[]> {
  const listas = await Promise.all(ROLES_GUIA.map(async (rol) => {
    try {
      const { data, error } = await supa.storage.from(BUCKET).download(`${rol}/catalogo.json`);
      if (error || !data) return [];          // sin permiso o sin catálogo: el rol simplemente no aparece
      return leerCatalogo(JSON.parse(await data.text()), rol);
    } catch (e) {
      logSilentError(`navegar.catalogo.${rol}`, e);
      return [];
    }
  }));
  return listas.flat();
}

/** URLs firmadas del video y de los pantallazos de una guía. */
export async function firmarMedios(g: Guia): Promise<MediosGuia> {
  const base = carpetaGuia(g);
  const rutas = [`${base}/video.mp4`, ...g.pasos.map((_, i) => `${base}/paso-${i + 1}.jpg`)];
  try {
    const { data, error } = await supa.storage.from(BUCKET).createSignedUrls(rutas, TTL_S);
    if (error) throw error;
    const urls = (data ?? []).map((d: { signedUrl?: string | null }) => d?.signedUrl ?? null);
    return { video: urls[0] ?? null, pasos: urls.slice(1) };
  } catch (e) {
    logSilentError('navegar.firmar', e);
    return { video: null, pasos: g.pasos.map(() => null) };
  }
}
