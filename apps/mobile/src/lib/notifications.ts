import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { showToast } from '../components/Toast';

export type NotificationCategory =
  | 'CLAIM'
  | 'VERDICT'
  | 'FLASH_MISSION'
  | 'POLL'
  | 'NUDGE'
  | 'CHAT'
  | 'DM';

/** Whether push notifications were successfully registered */
let pushEnabled = false;

/** Callback to trigger an immediate poll when a push arrives */
let onPushReceived: (() => void) | null = null;

/**
 * Set the callback that fires when any push notification arrives.
 * Used by use-polling to trigger an immediate state refresh.
 */
export function setOnPushReceived(cb: (() => void) | null) {
  onPushReceived = cb;
}

/**
 * Returns whether push notifications are active for this session.
 */
export function isPushEnabled(): boolean {
  return pushEnabled;
}

/**
 * Configure how notifications behave when the app is foregrounded.
 * Show an in-app alert instead of a system notification.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // We handle foreground notifications ourselves
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

/**
 * Register for push notifications and save the token to the server.
 * Call this after the player joins a room.
 */
export async function registerForPushNotifications(roomId: string): Promise<boolean> {
  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return false;
    }

    // Check / request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return false;
    }

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Chaos Agent',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
      });
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenData.data;

    // Save to server
    await api.registerPushToken({ room_id: roomId, push_token: pushToken });

    pushEnabled = true;
    return true;
  } catch (err) {
    console.error('Push registration failed:', (err as Error).message);
    pushEnabled = false;
    return false;
  }
}

/**
 * Set up listeners for incoming notifications.
 * Call once at app startup (in _layout.tsx).
 * Returns a cleanup function.
 */
export function setupNotificationListeners(): () => void {
  // Foreground: notification received while app is open
  const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body } = notification.request.content;
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const category = data?.category as NotificationCategory | undefined;

    // Show as in-app toast instead of system notification
    const displayBody = body ?? '';

    switch (category) {
      case 'CLAIM':
        showToast(displayBody, 'info');
        break;
      case 'VERDICT':
        showToast(displayBody, 'info');
        break;
      case 'FLASH_MISSION':
        showToast(displayBody, 'info');
        break;
      case 'POLL':
        showToast(displayBody, 'info');
        break;
      case 'NUDGE':
        showToast(displayBody, 'info');
        break;
      case 'CHAT':
      case 'DM':
        showToast(displayBody, 'info');
        break;
      default:
        if (title || body) {
          showToast(displayBody || title || 'New notification', 'info');
        }
    }

    // Trigger an immediate poll to refresh game state
    onPushReceived?.();
  });

  // Background: user tapped on a notification to open the app
  const responseSub = Notifications.addNotificationResponseReceivedListener((_response) => {
    // Trigger a poll to refresh state when user opens via notification
    onPushReceived?.();
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}

/**
 * Unregister push state when leaving a room.
 */
export function clearPushState() {
  pushEnabled = false;
  onPushReceived = null;
}
