/**
 * Generador de sesiones semanales Norman
 * Usa streamMentorResponse con el contexto del usuario para generar
 * un mensaje personal semanal. Guarda en weekly_sessions (IF NOT EXISTS).
 */

import { streamMentorResponse, type MentorContext } from './mentor';
import { db2 } from './supabase';
import { db } from './supabase';

export interface WeeklySession {
  id?: string;
  week_number: number;
  ai_message: string;
  generated_at?: string;
}

/**
 * Genera (o recupera) la sesión semanal del Protocolo Soberano.
 * Si ya existe para esta semana → la devuelve sin regenerar.
 */
export const generateWeeklySessionIfNeeded = async (
  userId: string,
  protocolDay: number,
  profile: { full_name?: string; name?: string; role?: string; current_module?: string; sovereign_score?: number },
): Promise<WeeklySession | null> => {
  if (!userId || !protocolDay) return null;

  const weekNumber = Math.max(1, Math.ceil(protocolDay / 7));

  // Verificar si ya existe la sesión de esta semana
  try {
    const { data: existing } = await db2.weeklySessions()
      .select('id, week_number, ai_message, generated_at')
      .eq('user_id', userId)
      .eq('week_number', weekNumber)
      .maybeSingle();

    if (existing?.ai_message) {
      return existing as WeeklySession;
    }
  } catch {
    // Si la tabla no existe aún, continuar sin error
  }

  // Recopilar check-ins de los últimos 7 días
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let avgEnergy = 5;
  let avgStress  = 5;
  let avgClarity = 5;

  try {
    const { data: checkins } = await db.checkins()
      .select('energy, stress, clarity')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo);

    if (checkins?.length) {
      const sum = (key: 'energy' | 'stress' | 'clarity') =>
        checkins.reduce((s, c) => s + ((c[key] as number) ?? 5), 0) / checkins.length;
      avgEnergy  = sum('energy');
      avgStress  = sum('stress');
      avgClarity = sum('clarity');
    }
  } catch {
    // Usar valores por defecto
  }

  const userName = profile.full_name ?? profile.name ?? 'Guerrero';
  const activeModule = profile.current_module ?? 'Módulo 1 - Guerrero Mentalidad';
  const sovereignScore = profile.sovereign_score ?? 0;

  // Construir MentorContext mínimo para la llamada
  const ctx: MentorContext = {
    userName,
    role: profile.role ?? 'Empresario',
    totalDays: protocolDay,
    streak: 0,
    sovereignScore,
    tier: sovereignScore >= 750 ? 'Maestro' : sovereignScore >= 500 ? 'Soberano' : sovereignScore >= 200 ? 'Mercader' : 'Explorador',
    activeModuleTitle: activeModule,
    activeModuleProgress: 0,
    northStar: { purpose: '', identity: '', nonNegotiables: [], dailyReminder: '' },
    todayCheckIn: null,
    messageCount: 0,
  };

  const weeklyPrompt = `Semana ${weekNumber} del Protocolo Soberano — despacho directo para ${userName}.

DATOS REALES DE LA SEMANA:
· Energía promedio: ${avgEnergy.toFixed(1)}/10
· Claridad promedio: ${avgClarity.toFixed(1)}/10
· Estrés promedio: ${avgStress.toFixed(1)}/10
· Módulo activo: ${activeModule}
· Día del protocolo: ${protocolDay}

VOZ Y TONO:
Eres Norman — mentor directo, sin motivación vacía. Usas datos como espejo, no como juicio. Nunca dices "sigue así" o "excelente progreso". Hablas en presente y con especificidad quirúrgica. Máximo 4 oraciones.

ESTRUCTURA:
1. Una observación honesta sobre los datos de esta semana (nómbrala sin suavizarla)
2. El foco táctico más importante para los próximos 7 días — uno solo
3. Una práctica concreta del Método Polaris que este usuario debería activar esta semana
4. Cierra con una pregunta que genere incomodidad productiva — no confort

REGLA: Sin frases genéricas. Sin aplausos vacíos. Sin "vas muy bien". Cada palabra debe ganarse su lugar.`;

  let fullResponse = '';

  try {
    fullResponse = await streamMentorResponse(
      ctx,
      weeklyPrompt,
      [],
      (delta) => { fullResponse += delta; },
    );
  } catch {
    return null;
  }

  if (!fullResponse.trim()) return null;

  const session: WeeklySession = {
    week_number: weekNumber,
    ai_message: fullResponse.trim(),
  };

  // Guardar en Supabase (best-effort)
  try {
    const { data: saved } = await db2.weeklySessions()
      .upsert(
        { user_id: userId, week_number: weekNumber, ai_message: fullResponse.trim(), focus_areas: [activeModule] },
        { onConflict: 'user_id,week_number' },
      )
      .select('id, week_number, ai_message, generated_at')
      .maybeSingle();

    if (saved) return saved as WeeklySession;
  } catch {
    // Tabla no existe aún — devolver el resultado sin persistir
  }

  return session;
};
