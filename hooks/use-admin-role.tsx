/**
 * use-admin-role.tsx — quién está mirando el panel admin.
 *
 * `app/admin/_layout.tsx` ya resuelve `is_admin`/`is_mentor` UNA vez (es el
 * guard: tiene que saberlo para decidir si deja pasar). Sin este contexto,
 * cada pantalla hija (Focus Desk, Espacio del Mentor) repetiría la misma
 * consulta solo para decidir qué mostrarle a un mentor restringido.
 */
import { createContext, useContext, type ReactNode } from 'react';

export type AdminRole = 'admin' | 'mentor' | null;

const AdminRoleContext = createContext<AdminRole>(null);

export function AdminRoleProvider({ role, children }: { role: AdminRole; children: ReactNode }) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

/** 'admin' = acceso completo. 'mentor' = restringido a sus propios clientes. */
export function useAdminRole(): AdminRole {
  return useContext(AdminRoleContext);
}
