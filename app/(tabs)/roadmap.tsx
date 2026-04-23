import { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function RoadmapScreen() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/(tabs)/academia')
  }, [])
  return null
}
