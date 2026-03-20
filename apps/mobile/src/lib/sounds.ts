import { Audio } from 'expo-av';

export type SoundEvent =
  | 'CLAIM_ALERT'
  | 'VERDICT_LEGIT'
  | 'VERDICT_BULLSHIT'
  | 'FLASH_MISSION'
  | 'POLL'
  | 'NUDGE_RECEIVED'
  | 'SIGNAL_SENT';

// Frequency and duration configs for programmatic tone generation
// These will be replaced with real sound files later
const TONE_CONFIGS: Record<SoundEvent, { frequency: number; durationMs: number; volume: number }> = {
  CLAIM_ALERT:     { frequency: 880,  durationMs: 200, volume: 0.6 },
  VERDICT_LEGIT:   { frequency: 1047, durationMs: 300, volume: 0.7 },
  VERDICT_BULLSHIT:{ frequency: 220,  durationMs: 400, volume: 0.7 },
  FLASH_MISSION:   { frequency: 660,  durationMs: 250, volume: 0.8 },
  POLL:            { frequency: 523,  durationMs: 200, volume: 0.5 },
  NUDGE_RECEIVED:  { frequency: 740,  durationMs: 150, volume: 0.5 },
  SIGNAL_SENT:     { frequency: 440,  durationMs: 100, volume: 0.4 },
};

// Sound file mapping — drop real assets into assets/sounds/ and update paths here.
// When a file exists for an event, it will be used instead of the silence placeholder.
const SOUND_FILES: Partial<Record<SoundEvent, number>> = {
  // Example: CLAIM_ALERT: require('../../assets/sounds/claim-alert.wav'),
};

let audioReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioReady = true;
  } catch {
    // Audio not available — sounds silently disabled
  }
}

/**
 * Play a sound effect for the given event.
 * Currently uses silence placeholders; swap in real assets via SOUND_FILES above.
 */
export async function playSound(event: SoundEvent): Promise<void> {
  try {
    await ensureAudioMode();

    const file = SOUND_FILES[event];
    if (file) {
      // Play real sound asset
      const { sound } = await Audio.Sound.createAsync(file, {
        shouldPlay: true,
        volume: TONE_CONFIGS[event].volume,
      });
      // Unload after playback to free resources
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
      return;
    }

    // No sound file yet — this is the placeholder path.
    // When real files are added to SOUND_FILES, this branch won't execute.
    // For now, we rely on haptics for feedback since we can't generate
    // tones programmatically without a WAV buffer or native module.
    // The wiring is complete — just drop in the assets.
  } catch {
    // Sound playback failed — silently ignore
  }
}
