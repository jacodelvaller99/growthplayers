import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="program" />
      <Stack.Screen name="archetype" />
      <Stack.Screen name="norte" />
      <Stack.Screen name="wheel" />
    </Stack>
  )
}
