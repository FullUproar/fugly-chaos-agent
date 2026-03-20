import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import type { ClaimWithContext, VoteType } from '@chaos-agent/shared';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';

interface Props {
  claim: ClaimWithContext;
  onVote: (claimId: string, vote: VoteType) => void;
  onDismiss: () => void;
  /** When true, vote buttons are hidden and NUDGE button is shown instead */
  hasVoted?: boolean;
  onNudge?: (claimId: string) => void;
  nudgeMessage?: string | null;
}

const VOTE_WINDOW_SECONDS = 180;

const ALERT_MESSAGES = [
  'thinks they pulled it off...',
  'is claiming victory!',
  'says they nailed it!',
  'wants credit!',
  'is feeling bold!',
  'made a move!',
  'is testing their luck...',
  'just dropped a claim!',
  'swears it happened!',
  'dares you to challenge...',
];

export function ClaimAlert({ claim, onVote, onDismiss, hasVoted, onNudge, nudgeMessage }: Props) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const barWidth = useRef(new Animated.Value(1)).current;
  const [timeLeft, setTimeLeft] = useState(VOTE_WINDOW_SECONDS);

  // Cycle message every 10 seconds, no repeats
  const [messageIndex, setMessageIndex] = useState(() =>
    Math.floor(Math.random() * ALERT_MESSAGES.length)
  );
  const message = ALERT_MESSAGES[messageIndex % ALERT_MESSAGES.length];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ALERT_MESSAGES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animate bar decay smoothly over full duration
  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: 0,
      duration: VOTE_WINDOW_SECONDS * 1000,
      useNativeDriver: false,
    }).start();
  }, [barWidth]);

  useEffect(() => {
    triggerHaptic('claimAlert');
    playSound('CLAIM_ALERT');

    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(onDismiss, 30000);
    return () => clearTimeout(timeout);
  }, [slideAnim, onDismiss]);

  const handleVote = (vote: VoteType) => {
    triggerHaptic('signalSent');
    onVote(claim.claim.id, vote);
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  const isUrgent = timeLeft <= 30;
  const barColor = hasVoted ? colors.textMuted : (isUrgent ? colors.error : colors.accent);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.card}>
        {/* Header: name/quote left, mission/points right */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.claimantName}>{claim.claimant_nickname}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.missionTitle}>{claim.mission_title}</Text>
            <Text style={styles.points}>{claim.mission_points} pts</Text>
          </View>
        </View>

        {/* Vote buttons OR Nudge button */}
        {!hasVoted ? (
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleVote('ACCEPT')}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptText}>LEGIT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bsButton}
              onPress={() => handleVote('BULLSHIT')}
              activeOpacity={0.8}
            >
              <Text style={styles.bsText}>BULLSHIT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nudgeRow}>
            <Text style={styles.waitingText}>Waiting for others...</Text>
            {onNudge && (
              <TouchableOpacity
                style={styles.nudgeButton}
                onPress={() => onNudge(claim.claim.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.nudgeButtonText}>NUDGE</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Nudge message toast */}
        {nudgeMessage && (
          <View style={styles.nudgeMessageContainer}>
            <Text style={styles.nudgeMessageText}>{nudgeMessage}</Text>
          </View>
        )}

        {/* Decay bar at bottom */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, {
            backgroundColor: barColor,
            width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: 12,
    paddingTop: 60,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.warning,
    elevation: 8,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.surfaceBorder,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end', flex: 1 },
  claimantName: { fontSize: 20, fontWeight: '900', color: colors.accent },
  message: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 4 },
  missionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'right' },
  points: { fontSize: 18, fontWeight: '800', color: colors.warning, marginTop: 2 },
  buttons: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  acceptButton: {
    flex: 1, backgroundColor: '#0A1A0F', paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 2, borderColor: colors.success, minHeight: 52,
  },
  acceptText: { fontSize: 16, fontWeight: '900', color: colors.success, letterSpacing: 2 },
  bsButton: {
    flex: 1, backgroundColor: '#1A0A0A', paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 2, borderColor: colors.error, minHeight: 52,
  },
  bsText: { fontSize: 16, fontWeight: '900', color: colors.error, letterSpacing: 2 },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  waitingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  nudgeButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  nudgeButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.warning,
    letterSpacing: 2,
  },
  nudgeMessageContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  nudgeMessageText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.highlight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
