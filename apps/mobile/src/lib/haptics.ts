let Haptics: typeof import('expo-haptics') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available in this build — haptics silently disabled
}

export type HapticPattern =
  | 'claimAlert'
  | 'verdictReveal'
  | 'verdictBullshit'
  | 'flashMission'
  | 'poll'
  | 'signalSent'
  | 'nudgeReceived';

export async function triggerHaptic(pattern: HapticPattern): Promise<void> {
  if (!Haptics) return;

  try {
    switch (pattern) {
      case 'claimAlert':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;

      case 'verdictReveal':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;

      case 'verdictBullshit':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;

      case 'flashMission':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;

      case 'poll':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;

      case 'signalSent':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;

      case 'nudgeReceived':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } catch {
    // Haptic not supported on this device — silently ignore
  }
}
