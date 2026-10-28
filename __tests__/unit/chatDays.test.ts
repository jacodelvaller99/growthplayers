import { groupChatDays, localDay } from '@/lib/chatDays';

const at = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString();

describe('groupChatDays', () => {
  it('agrupa por día local, más reciente primero, título = primer mensaje del usuario', () => {
    const days = groupChatDays([
      { role: 'assistant', content: 'hola', created_at: at(2026, 10, 1, 9) },
      { role: 'user', content: 'segundo', created_at: at(2026, 10, 1, 11) },
      { role: 'user', content: 'primero', created_at: at(2026, 10, 1, 10) },
      { role: 'user', content: 'otro día', created_at: at(2026, 10, 3, 8) },
    ]);
    expect(days).toEqual([
      { day: '2026-10-03', title: 'otro día', count: 1 },
      { day: '2026-10-01', title: 'primero', count: 3 },
    ]);
  });

  it('día sin mensaje del usuario usa título por defecto', () => {
    expect(groupChatDays([{ role: 'assistant', content: 'x', created_at: at(2026, 9, 5, 12) }])[0].title)
      .toBe('Conversación con Norman');
  });

  it('localDay usa la zona local', () => {
    expect(localDay(at(2026, 1, 2, 23))).toBe('2026-01-02');
  });
});
