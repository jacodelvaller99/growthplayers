/**
 * useStaffRole / useIsAdmin — flags de staff robustos y cacheados.
 *
 * Lee `profiles.is_admin` + `profiles.is_mentor` (nunca hardcoded). Antes este
 * chequeo vivía inline en varias pantallas con `.single()` y SIN manejo de
 * error: un hiccup de red o una carrera dejaba el flag en `false` esa sesión,
 * y el botón "Cuadro de Mando" (app/(tabs)/progreso.tsx) aparecía/desaparecía
 * de forma intermitente.
 *
 * `is_mentor` se sumó después (audit Espacio del Mentor): un mentor puro
 * (is_mentor=true, is_admin=false) no tenía NINGÚN botón hacia su Escritorio —
 * los dos accesos a /admin en progreso.tsx estaban gateados solo por isAdmin,
 * así que solo llegaba escribiendo la URL a mano.
 *
 * Robustez:
 *  - `.maybeSingle()` no lanza si hay 0 filas (a diferencia de `.single()`).
 *  - Ante error, CONSERVA el último valor conocido (no degrada a `false`) y lo
 *    registra vía logSilentError — un fallo transitorio nunca oculta el botón a
 *    un staff confirmado.
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

export interface StaffRole {
  isAdmin: boolean;
  isMentor: boolean;
}

const NO_ROLE: StaffRole = { isAdmin: false, isMentor: false };
const staffCache = new Map<string, StaffRole>();

export function useStaffRole(): StaffRole {
  const { userId } = useLifeFlow();
  const [role, setRole] = useState<StaffRole>(
    () => (userId ? staffCache.get(userId) ?? NO_ROLE : NO_ROLE),
  );

  useEffect(() => {
    if (!userId) {
      setRole(NO_ROLE);
      return;
    }
    // Siembra inmediata desde cache (evita parpadeo en remount).
    const cached = staffCache.get(userId);
    if (cached !== undefined) setRole(cached);

    let cancelled = false;
    intel.profiles()
      .select('is_admin, is_mentor')
      .eq('id', userId)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: { data: any; error: any }) => {
        if (cancelled) return;
        if (error) {
          // Conserva el valor previo (cache/estado). No degradar a false por un
          // fallo transitorio — esa era justo la causa del botón intermitente.
          logSilentError('useStaffRole', error);
          return;
        }
        const next: StaffRole = {
          isAdmin: data?.is_admin === true,
          isMentor: data?.is_mentor === true,
        };
        staffCache.set(userId, next);
        setRole(next);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return role;
}

/** Wrapper de compatibilidad — los llamadores existentes no cambian. */
export function useIsAdmin(): boolean {
  return useStaffRole().isAdmin;
}
