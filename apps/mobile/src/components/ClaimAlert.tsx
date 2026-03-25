import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import type { ClaimWithContext, VoteType } from '@chaos-agent/shared';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';
import { MechanicOverlay } from './MechanicOverlay';

// ── Mechanic metadata lookup (inlined for fast access) ──

const MECHANIC_META: Record<string, { name: string; description: string; reveal_text: string }> = {
  standard: { name: 'Standard Vote', description: 'Everyone votes LEGIT or BULLSHIT. Majority rules.', reveal_text: 'The people will decide your fate.' },
  dictator: { name: 'THE DICTATOR', description: 'One player has been chosen. Their word is law.', reveal_text: 'Democracy is overrated. ONE shall decide.' },
  pitch_it: { name: 'Pitch It', description: 'The claimant gets 15 seconds to make their case. Then you vote.', reveal_text: 'Convince us. You have 15 seconds.' },
  volunteer_tribunal: { name: 'Volunteer Tribunal', description: 'Who wants to judge? First volunteers become the jury.', reveal_text: 'We need volunteers. Step forward or stay silent.' },
  reverse_psychology: { name: 'Reverse Psychology', description: 'Vote normally... or did we flip everything?', reveal_text: "Cast your votes. Trust your instincts. Or don't." },
  auction: { name: 'The Auction', description: 'Bid your own points. Highest bidder decides the outcome.', reveal_text: 'How much is the truth worth to you?' },
  russian_roulette: { name: 'Russian Roulette', description: 'No vote. The chaos gods decide. 50/50.', reveal_text: "Votes? Where we're going, we don't need votes." },
  alibi: { name: 'The Alibi', description: 'Claimant and a random witness both tell the story. Do they match?', reveal_text: "Let's hear both sides. Separately." },
  the_bribe: { name: 'The Bribe', description: 'The claimant can offer their own points to buy your silence.', reveal_text: "Everyone has a price. What's yours?" },
  hot_seat: { name: 'Hot Seat', description: '3 rapid-fire questions. Answer them all in 10 seconds or fail.', reveal_text: 'Three questions. Ten seconds. No hesitation.' },
  proxy_vote: { name: 'Proxy Vote', description: 'You vote on behalf of the player to your LEFT. Think like them.', reveal_text: 'You are not yourself right now. Vote as your neighbor.' },
  unanimous_or_bust: { name: 'Unanimous or Bust', description: "ONE bullshit call and it's over. All or nothing.", reveal_text: 'This requires UNANIMOUS approval. One dissenter ends it.' },
  points_gamble: { name: 'Double or Nothing', description: 'No vote. Coin flip. Win double or lose it all.', reveal_text: 'Forget the vote. Let fate decide. Double or nothing.' },
  crowd_cheer: { name: 'Crowd Cheer', description: 'Rate it 1-5. Average above 3 and it passes.', reveal_text: 'Make some noise! Rate the performance.' },
  the_skeptic: { name: 'THE SKEPTIC', description: "One player's vote counts TRIPLE. Everyone else counts once.", reveal_text: 'One among you has been granted... extra authority.' },
};

interface Props {
  claim: ClaimWithContext;
  onVote: (claimId: string, vote: VoteType) => void;
  onMechanicAction?: (claimId: string, payload: {
    action: string;
    vote?: VoteType;
    amount?: number;
    text?: string;
    rating?: number;
  }) => void;
  onDismiss: () => void;
  /** When true, vote buttons are hidden and NUDGE button is shown instead */
  hasVoted?: boolean;
  onNudge?: (claimId: string) => void;
  nudgeMessage?: string | null;
  myPlayerId?: string;
  players?: Array<{ id: string; nickname: string }>;
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

export function ClaimAlert({
  claim,
  onVote,
  onMechanicAction,
  onDismiss,
  hasVoted,
  onNudge,
  nudgeMessage,
  myPlayerId,
  players,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const barWidth = useRef(new Animated.Value(1)).current;
  const [timeLeft, setTimeLeft] = useState(VOTE_WINDOW_SECONDS);
  const [expanded, setExpanded] = useState(false);
  const [showMechanicReveal, setShowMechanicReveal] = useState(true);

  const votingMechanic = claim.voting_mechanic || 'standard';
  const mechanicData = claim.mechanic_data || {};
  const mechanicMeta = MECHANIC_META[votingMechanic] || MECHANIC_META.standard;
  const isClaimant = myPlayerId === claim.claim.room_player_id;
  const isNonStandard = votingMechanic !== 'standard';

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

  // Auto-dismiss mechanic reveal after 3.5s
  useEffect(() => {
    if (!isNonStandard || !showMechanicReveal) return;
    const timer = setTimeout(() => setShowMechanicReveal(false), 3500);
    return () => clearTimeout(timer);
  }, [isNonStandard, showMechanicReveal]);

  const handleVote = (vote: VoteType) => {
    triggerHaptic('signalSent');
    onVote(claim.claim.id, vote);
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true,
    }).start(onDismiss);
  };

  const handleMechanicAction = (payload: {
    action: string;
    vote?: VoteType;
    amount?: number;
    text?: string;
    rating?: number;
  }) => {
    // If it's a vote action, route through the standard vote handler
    if (payload.action === 'vote' && payload.vote) {
      handleVote(payload.vote);
      return;
    }
    if (onMechanicAction) {
      onMechanicAction(claim.claim.id, payload);
    }
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
            <View style={styles.missionTitleRow}>
              <Text style={styles.missionTitle}>{claim.mission_title}</Text>
              <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.chevron}>{expanded ? '\u25B2' : '\u25BC'}</Text>
              </TouchableOpacity>
            </View>
            {expanded && claim.mission_description ? (
              <Text style={styles.missionDescription}>{claim.mission_description}</Text>
            ) : null}
            <Text style={styles.points}>{claim.mission_points} pts</Text>
          </View>
        </View>

        {/* Mechanic name badge (non-standard only) */}
        {isNonStandard && (
          <View style={styles.mechanicBadge}>
            <Text style={styles.mechanicBadgeText}>{mechanicMeta.name}</Text>
          </View>
        )}

        {/* Mechanic overlay — reveal animation then mechanic-specific UI */}
        {isNonStandard && (
          <View style={styles.mechanicSection}>
            <MechanicOverlay
              mechanic={{ id: votingMechanic, ...mechanicMeta }}
              mechanicData={mechanicData}
              isClaimant={isClaimant}
              myPlayerId={myPlayerId || ''}
              players={players || []}
              onAction={handleMechanicAction}
            />
          </View>
        )}

        {/* Standard vote buttons (only for standard mechanic) */}
        {!isNonStandard && !hasVoted && !isClaimant && (
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleVote('ACCEPT')}
              activeOpacity={0.7}
            >
              <Text style={styles.acceptText}>LEGIT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bsButton}
              onPress={() => handleVote('BULLSHIT')}
              activeOpacity={0.7}
            >
              <Text style={styles.bsText}>BULLSHIT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Waiting state for standard mechanic after voting */}
        {!isNonStandard && hasVoted && (
          <View style={styles.nudgeRow}>
            <Text style={styles.waitingText}>Waiting for others...</Text>
            {onNudge && (
              <TouchableOpacity
                style={styles.nudgeButton}
                onPress={() => onNudge(claim.claim.id)}
                activeOpacity={0.7}
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
  missionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  missionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'right', flexShrink: 1 },
  chevron: { fontSize: 12, color: colors.textMuted },
  missionDescription: { fontSize: 13, color: colors.textMuted, textAlign: 'right', marginTop: 4, lineHeight: 18 },
  points: { fontSize: 18, fontWeight: '800', color: colors.warning, marginTop: 2 },

  // Mechanic badge
  mechanicBadge: {
    alignSelf: 'center',
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 8,
  },
  mechanicBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Mechanic section
  mechanicSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Standard vote buttons
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
