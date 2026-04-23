import { supabase } from './supabase'

// ─── PROFILE ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string | null
  archetype_id: string | null
  program_type: 'polaris' | 'growth_players' | null
  norte: string | null
  sovereignty_score: number
  current_module_id: number
  streak: number
  total_days: number
  last_checkin_at: string | null
  enrollment_date: string
  created_at: string
  updated_at: string
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data as Profile
}

export const upsertProfile = async (
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'enrollment_date'>>
): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) { console.error('upsertProfile error:', error); return null }
  return data as Profile
}

// ─── PILARES ───────────────────────────────────────────────────────────────

export interface Pilar {
  id: string
  user_id: string
  pilar: string
  score: number
  updated_at: string
}

export const getPilares = async (userId: string): Promise<Pilar[]> => {
  const { data, error } = await supabase
    .from('pilares')
    .select('*')
    .eq('user_id', userId)
  if (error) return []
  return (data || []) as Pilar[]
}

export const upsertPilar = async (
  userId: string,
  pilar: string,
  score: number
): Promise<void> => {
  const { error } = await supabase
    .from('pilares')
    .upsert(
      { user_id: userId, pilar, score, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,pilar' }
    )
  if (error) console.error('upsertPilar error:', error)
}

export const upsertAllPilares = async (
  userId: string,
  pilares: Record<string, number>
): Promise<void> => {
  const rows = Object.entries(pilares).map(([pilar, score]) => ({
    user_id: userId,
    pilar,
    score,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from('pilares')
    .upsert(rows, { onConflict: 'user_id,pilar' })
  if (error) console.error('upsertAllPilares error:', error)
}

// ─── MODULE PROGRESS ───────────────────────────────────────────────────────

export interface ModuleProgressRow {
  id: string
  user_id: string
  module_id: number
  program_type: string
  status: 'available' | 'in_progress' | 'completed'
  progress: number
  notes: string[]
  started_at: string | null
  completed_at: string | null
}

export const getModuleProgress = async (
  userId: string,
  programType: string
): Promise<ModuleProgressRow[]> => {
  const { data, error } = await supabase
    .from('module_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('program_type', programType)
    .order('module_id')
  if (error) return []
  return (data || []) as ModuleProgressRow[]
}

export const updateModuleProgress = async (
  userId: string,
  moduleId: number,
  programType: string,
  updates: Partial<Pick<ModuleProgressRow, 'status' | 'progress' | 'notes' | 'started_at' | 'completed_at'>>
): Promise<void> => {
  const { error } = await supabase
    .from('module_progress')
    .upsert(
      { user_id: userId, module_id: moduleId, program_type: programType, ...updates },
      { onConflict: 'user_id,module_id,program_type' }
    )
  if (error) console.error('updateModuleProgress error:', error)
}

// ─── BITÁCORA ──────────────────────────────────────────────────────────────

export interface BitacoraEntry {
  id: string
  user_id: string
  content: string
  mood: number | null
  energy: number | null
  tags: string[]
  created_at: string
}

export const getBitacora = async (userId: string, limit = 20): Promise<BitacoraEntry[]> => {
  const { data, error } = await supabase
    .from('bitacora')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data || []) as BitacoraEntry[]
}

export const createBitacoraEntry = async (
  userId: string,
  entry: { content: string; mood?: number; energy?: number; tags?: string[] }
): Promise<BitacoraEntry | null> => {
  const { data, error } = await supabase
    .from('bitacora')
    .insert({ user_id: userId, ...entry })
    .select()
    .single()
  if (error) { console.error('createBitacoraEntry error:', error); return null }
  return data as BitacoraEntry
}

// ─── CHECK-INS ─────────────────────────────────────────────────────────────

export interface CheckinRow {
  id: string
  user_id: string
  energy: number
  focus: number
  mood: number
  intention: string | null
  reflection: string | null
  created_at: string
}

export const getTodayCheckin = async (userId: string): Promise<CheckinRow | null> => {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today)
    .maybeSingle()
  return (data as CheckinRow) || null
}

export const createCheckin = async (
  userId: string,
  checkin: { energy: number; focus: number; mood: number; intention?: string; reflection?: string }
): Promise<CheckinRow | null> => {
  const { data, error } = await supabase
    .from('checkins')
    .insert({ user_id: userId, ...checkin })
    .select()
    .single()
  if (error) { console.error('createCheckin error:', error); return null }
  return data as CheckinRow
}

// ─── CHAT MESSAGES ─────────────────────────────────────────────────────────

export interface ChatMessageRow {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  module_context: number | null
  created_at: string
}

export const getChatMessages = async (userId: string, limit = 50): Promise<ChatMessageRow[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) return []
  return (data || []) as ChatMessageRow[]
}

export const saveChatMessage = async (
  userId: string,
  message: { role: 'user' | 'assistant'; content: string; module_context?: number }
): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, ...message })
  if (error) console.error('saveChatMessage error:', error)
}
