import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import type { Mission } from '@chaos-agent/shared';
import { HourglassTimer } from './HourglassTimer';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';

interface Props {
  mission: Mission;
  onClaim: () => unknown | Promise<unknown>;
  onDismiss: () => void;
}

const FLASH_TYPE_LABELS: Record<string, string> = {
  race: 'RACE',
  target: 'TARGET',
  group: 'GROUP',
};

export function FlashMissionOverlay({ mission, onClaim, onDismiss }: Props) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Heavy haptic burst + sound on flash arrival
    triggerHaptic('flashMission');
    playSound('FLASH_MISSION');
  }, []);

  useEffect(() => {
    if (!mission.expires_at) return;

    const expiresAt = new Date(mission.expires_at).getTime();
    const totalMs = expiresAt - new Date(mission.created_at).getTime();

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setExpired(true);
        setTimeLeft(0);
        clearInterval(interval);
        setTimeout(onDismiss, 1500);
      } else {
        setTimeLeft(Math.ceil(remaining / 1000));
        const progress = remaining / totalMs;
        progressAnim.setValue(progress);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [mission.expires_at, mission.created_at, onDismiss, progressAnim]);

  const isClaimed = mission.status === 'CLAIMED';

  return (
    <Modal transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Timer bar */}
          <View style={styles.timerBarBg}>
            <Animated.View
              style={[
                styles.timerBarFill,
                { transform: [{ scaleX: progressAnim }] },
              ]}
            />
          </View>

          {/* Badge */}
          <View style={styles.header}>
            <View style={styles.flashBadge}>
              <Text style={styles.flashBadgeText}>
                {FLASH_TYPE_LABELS[mission.flash_type ?? 'race'] ?? 'FLASH'}
              </Text>
            </View>
            <Text style={styles.points}>{mission.points} pts</Text>
          </View>

          {/* Content */}
          <Text style={styles.title}>{mission.title}</Text>
          <Text style={styles.description}>{mission.description}</Text>

          {/* Timer */}
          {expired ? (
            <Text style={styles.timerExpired}>EXPIRED</Text>
          ) : (
            <View style={styles.timerContainer}>
              <HourglassTimer
                seconds={timeLeft}
                totalSeconds={mission.expires_at ? Math.round((new Date(mission.expires_at).getTime() - new Date(mission.created_at).getTime()) / 1000) : 75}
                size={56}
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!expired && !isClaimed && mission.flash_type !== 'group' && (
              <TouchableOpacity
                style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
                onPress={async () => {
                  if (claiming) return;
                  setClaiming(true);
                  setClaimError(null);
                  try {
                    await onClaim();
                  } catch (e) {
                    setClaimError((e as Error).message || 'Claim failed');
                  } finally {
                    setClaiming(false);
                  }
                }}
                disabled={claiming}
                activeOpacity={0.7}
              >
                {claiming ? (
                  <ActivityIndicator color={colors.accentText} size="small" />
                ) : (
                  <Text style={styles.claimButtonText}>CLAIM</Text>
                )}
              </TouchableOpacity>
            )}
            {claimError && (
              <Text style={styles.claimErrorText}>{claimError}</Text>
            )}
            {isClaimed && (
              <Text style={styles.claimedText}>CLAIMED — PENDING VOTE</Text>
            )}
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.dismissButtonText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  timerBarBg: {
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    transformOrigin: 'left',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flashBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 50,
  },
  flashBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 2,
  },
  points: { fontSize: 18, fontWeight: '800', color: colors.warning },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 8 },
  description: { fontSize: 16, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  timerContainer: { alignItems: 'center', marginBottom: 16 },
  timerExpired: { fontSize: 28, fontWeight: '900', color: colors.error, textAlign: 'center', marginBottom: 16 },
  actions: { gap: 12 },
  claimButton: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: { fontSize: 20, fontWeight: '900', color: colors.accentText, letterSpacing: 3 },
  claimErrorText: { fontSize: 13, fontWeight: '600', color: colors.error, textAlign: 'center', marginTop: 4 },
  claimedText: { fontSize: 15, fontWeight: '700', color: colors.warning, textAlign: 'center', letterSpacing: 1 },
  dismissButton: {
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: 48,
    justifyContent: 'center',
  },
  dismissButtonText: { fontSize: 14, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
});
