import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store'
import { useProgramStore } from '../store/programStore'
import { getTodayCheckin, createCheckin, upsertProfile, type CheckinRow } from '../lib/database'

export function useCheckin() {
  const { session } = useAuthStore()
  const userId = session?.user?.id as string | undefined
  const { streak, incrementStreak } = useProgramStore()

  const [todayCheckin, setTodayCheckin] = useState<CheckinRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) { setIsLoading(false); return }
    const checkin = await getTodayCheckin(userId)
    setTodayCheckin(checkin)
    setIsLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const submitCheckin = useCallback(
    async (data: {
      energy: number
      focus: number
      mood: number
      intention?: string
      reflection?: string
    }): Promise<boolean> => {
      if (!userId) return false
      const result = await createCheckin(userId, data)
      if (!result) return false

      setTodayCheckin(result)
      incrementStreak()

      const newStreak = streak + 1
      await upsertProfile(userId, {
        streak: newStreak,
        last_checkin_at: new Date().toISOString(),
        total_days: newStreak,
      })

      return true
    },
    [userId, streak, incrementStreak]
  )

  return {
    todayCheckin,
    hasCheckedIn: todayCheckin !== null,
    isLoading,
    submitCheckin,
    reload: load,
  }
}
