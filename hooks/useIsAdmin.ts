/**
 * useIsAdmin — flag de administrador robusto y cacheado.
 *
 * Lee `profiles.is_admin` (nunca hardcoded). Antes este chequeo vivía inline en
 * varias pantallas con `.single()` y SIN manejo de error: un hiccup de red o una
 * carrera dejaba el flag en `false` esa sesión, y el botón "Cuadro de Mando"
 * (app/(tabs)/progreso.tsx) aparecía/desaparecía de forma intermitente.
 *
 * Aquí se cierra esa fragilidad:
 *  - `.maybeSingle()` no lanza si hay 0 filas (a diferencia de `.single()`).
 *  - Ante error, CONSERVA el último valor conocido (no degrada a `false`) y lo
 *    registra vía logSilentError — un fallo transitorio nunca oculta el botón a
 *    un admin confirmado.
 *  - Cache por `userId` a nivel de módulo: los remounts no parpadean a `false`
 *    mientras la query vuela.
 *
 * Es solo UX: la autorización real la imponen RLS (servidor) + el guard de
 * `app/admin/_layout.tsx`. Mostrar el botón nunca concede acceso por sí mismo.
 */
import { useEffect, useState } from 'react';

import { useLifeFlow } from '@/hooks/use-lifeflow';
import { intel } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

const adminCache = new Map<string, boolean>();

export function useIsAdmin(): boolean {
  const { userId } = useLifeFlow();
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () => (userId ? adminCache.get(userId) ?? false : false),
  );

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    // Siembra inmediata desde cache (evita parpadeo en remount).
    const cached = adminCache.get(userId);
    if (cached !== undefined) setIsAdmin(cached);

    let cancelled = false;
    intel.profiles()
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: { data: any; error: any }) => {
        if (cancelled) return;
        if (error) {
          // Conserva el valor previo (cache/estado). No degradar a false por un
          // fallo transitorio — esa era justo la causa del botón intermitente.
          logSilentError('useIsAdmin', error);
          return;
        }
        const admin = data?.is_admin === true;
        adminCache.set(userId, admin);
        setIsAdmin(admin);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}
