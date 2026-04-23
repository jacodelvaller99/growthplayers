import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store'
import {
  getProfile,
  getPilares,
  upsertProfile,
  upsertPilar,
  upsertAllPilares,
  type Profile,
  type Pilar,
} from '../lib/database'

export interface PilaresMap {
  fe: number
  finanzas: number
  salud: number
  familia: number
  mente: number
  negocio: number
  impacto: number
  legado: number
}

const DEFAULT_PILARES: PilaresMap = {
  fe: 5, finanzas: 5, salud: 5, familia: 5,
  mente: 5, negocio: 5, impacto: 5, legado: 5,
}

export function calculateSovereigntyScore(pilares: PilaresMap): number {
  const values = Object.values(pilares)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return Math.round(avg * 10) / 10
}

export function useProfile() {
  const { session } = useAuthStore()
  const userId = session?.user?.id as string | undefined

  const [profile, setProfile] = useState<Profile | null>(null)
  const [pilares, setPilares] = useState<PilaresMap>(DEFAULT_PILARES)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setIsLoading(false); return }
    setIsLoading(true)
    const [prof, pils] = await Promise.all([
      getProfile(userId),
      getPilares(userId),
    ])
    setProfile(prof)
    if (pils.length > 0) {
      const map = { ...DEFAULT_PILARES }
      pils.forEach((p: Pilar) => {
        if (p.pilar in map) (map as any)[p.pilar] = p.score
      })
      setPilares(map)
    }
    setIsLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const updatePilar = useCallback(
    async (pilar: keyof PilaresMap, score: number) => {
      if (!userId) return
      const updated = { ...pilares, [pilar]: score }
      setPilares(updated)
      await upsertPilar(userId, pilar, score)
      const sovereignty = calculateSovereigntyScore(updated)
      await upsertProfile(userId, { sovereignty_score: sovereignty })
      setProfile((prev) => prev ? { ...prev, sovereignty_score: sovereignty } : prev)
    },
    [userId, pilares]
  )

  const updateAllPilares = useCallback(
    async (newPilares: PilaresMap) => {
      if (!userId) return
      setPilares(newPilares)
      await upsertAllPilares(userId, newPilares as unknown as Record<string, number>)
      const sovereignty = calculateSovereigntyScore(newPilares)
      await upsertProfile(userId, { sovereignty_score: sovereignty })
      setProfile((prev) => prev ? { ...prev, sovereignty_score: sovereignty } : prev)
    },
    [userId]
  )

  const updateNorte = useCallback(
    async (norte: string) => {
      if (!userId) return
      await upsertProfile(userId, { norte })
      setProfile((prev) => prev ? { ...prev, norte } : prev)
    },
    [userId]
  )

  const updateProfileField = useCallback(
    async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'enrollment_date'>>) => {
      if (!userId) return
      const result = await upsertProfile(userId, updates)
      if (result) setProfile(result)
    },
    [userId]
  )

  return {
    profile,
    pilares,
    isLoading,
    userId,
    reload: load,
    updatePilar,
    updateAllPilares,
    updateNorte,
    updateProfileField,
    sovereigntyScore: calculateSovereigntyScore(pilares),
  }
}
