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
const FullPanelContext = createContext(false);

export function AdminRoleProvider({
  role, fullPanel = false, children,
}: { role: AdminRole; fullPanel?: boolean; children: ReactNode }) {
  return (
    <AdminRoleContext.Provider value={role}>
      <FullPanelContext.Provider value={fullPanel}>{children}</FullPanelContext.Provider>
    </AdminRoleContext.Provider>
  );
}

/** 'admin' = acceso completo. 'mentor' = restringido a sus propios clientes. */
export function useAdminRole(): AdminRole {
  return useContext(AdminRoleContext);
}

/** true = ve el panel completo (profiles.full_admin_panel). El resto, admin o
 * mentor, trabaja en la vista simple de mentorías. Es interfaz, no permisos. */
export function useFullPanel(): boolean {
  return useContext(FullPanelContext);
}
