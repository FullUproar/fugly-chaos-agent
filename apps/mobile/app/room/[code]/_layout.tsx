import { Stack } from 'expo-router';

export default function RoomLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: '#0A0A0A' },
        headerBackVisible: false,
      }}
    />
  );
}
