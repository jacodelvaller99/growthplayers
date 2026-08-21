/**
 * deskLogic — arma el estado del Focus Desk desde fuentes ya cargadas
 * (fetchExecutionDashboard, fetchMentorAssignments, fetchMentorsList,
 * fetchUsers). Cero IO. Shapes estructurales — no importa tipos de
 * mentorExecution para no acoplar las dos libs.
 */

export interface DeskSourceRow {
  user_id: string;
  name: string;
  attention: number;
  momentum: string;
  openTasks: number;
  overdue: number;
  topReason: string | null;
  severity: string | null;
}

export interface DeskRosterEntry {
  user_id: string;
  name: string;
  is_admin: boolean;
}

export interface DeskAssignmentEntry {
  user_id: string;
  mentor_id: string;
}

export interface DeskMentor {
  id: string;
  name: string;
}

export interface DeskClient extends DeskSourceRow {
  mentorId: string | null;
}

export interface DeskMentorGroup {
  mentor: DeskMentor;
  clients: number;
  inAttention: number;
}

export interface Desk {
  /** Universo completo, orden atención desc, empate por nombre. */
  clients: DeskClient[];
  needsIntervention: number;
  topUrgent: DeskClient | null;
  unassigned: number;
  overdueTotal: number;
  momentumRisk: number;
  mine: DeskClient[];
  byMentor: DeskMentorGroup[];
}

const MOMENTUM_RISK = new Set(['fragile', 'declining', 'critical']);
const SEVERITY_URGENT = new Set(['high', 'critical']);

export function buildDesk(input: {
  rows: DeskSourceRow[];
  roster: DeskRosterEntry[];
  assignments: DeskAssignmentEntry[];
  mentors: DeskMentor[];
  myId: string;
}): Desk {
  const { rows, roster, assignments, mentors, myId } = input;

  const mentorIds = new Set(mentors.map((m) => m.id));
  const assignedTo = new Map(assignments.map((a) => [a.user_id, a.mentor_id]));
  const rowByUser = new Map(rows.map((r) => [r.user_id, r]));
  const nameByUser = new Map(roster.map((p) => [p.user_id, p.name]));

  // Universo = roster sin admins NI mentores dedicados ∪ filas de ejecución cuyo
  // user_id no sea un mentor (cubre el caso de una tarea huérfana de un usuario
  // que ya no está en el roster). Un mentor no-admin (is_admin=false) tenía que
  // excluirse igual que un admin — sin el segundo chequeo se colaba como "cliente".
  const universeIds = new Set<string>();
  for (const p of roster) if (!p.is_admin && !mentorIds.has(p.user_id)) universeIds.add(p.user_id);
  for (const r of rows) if (!mentorIds.has(r.user_id)) universeIds.add(r.user_id);

  const clients: DeskClient[] = [...universeIds].map((user_id) => {
    const row = rowByUser.get(user_id);
    const rawMentorId = assignedTo.get(user_id) ?? null;
    // mentorId apuntando a alguien que ya no es admin (revocado) cuenta como
    // sin-asignar — no aparece en `mine` ni en `byMentor` de nadie.
    // ponytail: no limpia la fila huérfana en mentor_assignments, solo la trata
    // como sin-asignar en el desk; borrarla es un paso de mantenimiento aparte.
    const mentorId = rawMentorId && mentorIds.has(rawMentorId) ? rawMentorId : null;
    return {
      user_id,
      name: row?.name ?? nameByUser.get(user_id) ?? 'Usuario',
      attention: row?.attention ?? 0,
      momentum: row?.momentum ?? 'stable',
      openTasks: row?.openTasks ?? 0,
      overdue: row?.overdue ?? 0,
      topReason: row?.topReason ?? null,
      severity: row?.severity ?? null,
      mentorId,
    };
  });

  clients.sort((a, b) => b.attention - a.attention || a.name.localeCompare(b.name, 'es'));

  const needsIntervention = clients.filter((c) => c.severity && SEVERITY_URGENT.has(c.severity)).length;
  const unassigned = clients.filter((c) => c.mentorId === null).length;
  const overdueTotal = clients.reduce((sum, c) => sum + c.overdue, 0);
  const momentumRisk = clients.filter((c) => MOMENTUM_RISK.has(c.momentum)).length;

  const top = clients[0];
  const topUrgent = top && (top.attention > 0 || top.overdue > 0) ? top : null;

  const mine = clients.filter((c) => c.mentorId === myId);

  const byMentor: DeskMentorGroup[] = mentors.map((mentor) => {
    const assigned = clients.filter((c) => c.mentorId === mentor.id);
    return { mentor, clients: assigned.length, inAttention: assigned.filter((c) => c.attention > 0).length };
  });

  return { clients, needsIntervention, topUrgent, unassigned, overdueTotal, momentumRisk, mine, byMentor };
}
