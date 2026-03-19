import { Stack } from 'expo-router';
import { colors } from '@/theme/colors';

export default function RoomLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerBackVisible: false,
        headerTitle: '',
      }}
    >
      <Stack.Screen name="lobby" options={{ headerTitle: 'Lobby' }} />
      <Stack.Screen name="setup" options={{ headerTitle: 'Setup' }} />
      <Stack.Screen name="play" options={{ headerTitle: 'CHAOS AGENT', headerTitleStyle: { fontWeight: '800', color: colors.accent } }} />
      <Stack.Screen name="results" options={{ headerTitle: 'Results' }} />
    </Stack>
  );
}
