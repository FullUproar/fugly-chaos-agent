import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ToastOverlay } from '@/components/Toast';
import { colors } from '@/theme/colors';
import { setupNotificationListeners } from '@/lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="create" options={{ title: 'Create Room' }} />
          <Stack.Screen name="join" options={{ title: 'Join Room' }} />
          <Stack.Screen name="plan" options={{ title: 'Plan a Night' }} />
          <Stack.Screen name="room/[code]" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        </Stack>
      </KeyboardAvoidingView>
      <ToastOverlay />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
});
