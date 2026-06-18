/**
 * userRanking — IO degradable del ranking ponderado (Cluster A2).
 *
 * Ensambla las señales BARATAS cross-user (sin Coach Intelligence por usuario,
 * que sería N×queries): sovereign (user_progress) + engagement/churn
 * (user_intelligence) + bienestar (daily_checkins recientes). executionMomentum
 * y relationalDepth quedan null por ahora (la lógica re-normaliza los pesos sobre
 * lo disponible). Cada fuente degrada a vacío vía logSilentError.
 */

import { supabase, intel } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';
import { fetchUsers } from '@/lib/admin/queries';
import { wellbeingScore } from '@/lib/wellbeingLogic';
import {
  rankUsers,
  type RankableUser,
  type RankedUser,
  type RankingWeights,
} from '@/lib/userRankingLogic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

export async function fetchRankableUsers(): Promise<RankableUser[]> {
  const users = await fetchUsers();
  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);

  // engagement + churn (user_intelligence)
  const intelMap: Record<string, { engagement?: number; churn?: number }> = {};
  try {
    const { data } = await intel.intelligence()
      .select('user_id,engagement_score,churn_risk')
      .in('user_id', ids);
    for (const r of (data ?? []) as Array<{ user_id: string; engagement_score?: number; churn_risk?: number }>) {
      intelMap[r.user_id] = { engagement: r.engagement_score, churn: r.churn_risk };
    }
  } catch (e) { logSilentError('ranking.intel', e); }

  // bienestar (promedio de los últimos check-ins por usuario)
  const wbMap: Record<string, number> = {};
  try {
    const { data } = await supa.from('daily_checkins')
      .select('user_id,energy,clarity,stress,sleep,date')
      .in('user_id', ids)
      .order('date', { ascending: false })
      .limit(600);
    const byUser: Record<string, number[]> = {};
    for (const r of (data ?? []) as Array<{ user_id: string; energy?: number; clarity?: number; stress?: number; sleep?: number; date: string }>) {
      const s = wellbeingScore({ date: r.date, energy: r.energy, clarity: r.clarity, stress: r.stress, sleep: r.sleep });
      if (s === null) continue;
      const arr = (byUser[r.user_id] ??= []);
      if (arr.length < 5) arr.push(s); // los más recientes (orden desc)
    }
    for (const [uid, arr] of Object.entries(byUser)) {
      wbMap[uid] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
  } catch (e) { logSilentError('ranking.wellbeing', e); }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    sovereign: u.sovereign_score ?? null,
    engagement: intelMap[u.id]?.engagement ?? null,
    churnRisk: intelMap[u.id]?.churn ?? null,
    wellbeing: wbMap[u.id] ?? null,
    executionMomentum: null, // enriquecimiento futuro (caro por-usuario)
    relationalDepth: null,
  }));
}

export async function fetchUserRanking(weights?: RankingWeights): Promise<RankedUser[]> {
  const rankable = await fetchRankableUsers();
  return rankUsers(rankable, weights);
}
