/**
 * Historial de Mentor por días. El chat con Norman es UNA conversación continua
 * (mentor_messages); `mentor_threads` nunca se escribe, así que la lista de
 * "hilos" salía siempre vacía. Agrupar por día local da un índice real para
 * saltar a una fecha del mismo chat.
 */

export type ChatDay = { day: string; title: string; count: number };

/** YYYY-MM-DD en la zona local del dispositivo. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Filas de mentor_messages (cualquier orden) → días, del más reciente al más
 * antiguo. Título = primer mensaje del usuario de ese día.
 */
export function groupChatDays(
  rows: { role: string; content: string; created_at: string }[],
): ChatDay[] {
  const byDay = new Map<string, { first: { at: string; text: string } | null; count: number }>();
  for (const r of rows) {
    const day = localDay(r.created_at);
    const entry = byDay.get(day) ?? { first: null, count: 0 };
    entry.count += 1;
    if (r.role === 'user' && (!entry.first || r.created_at < entry.first.at)) {
      entry.first = { at: r.created_at, text: r.content };
    }
    byDay.set(day, entry);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, e]) => ({
      day,
      title: e.first?.text.trim().slice(0, 80) || 'Conversación con Norman',
      count: e.count,
    }));
}
