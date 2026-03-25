import { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';

interface VoteReveal {
  nickname: string;
  vote: 'ACCEPT' | 'BULLSHIT';
}

interface Props {
  visible: boolean;
  missionTitle: string;
  claimantNickname: string;
  votes: VoteReveal[];
  passed: boolean;
  pointsAwarded: number;
  onDone: () => void;
}

const PASSED_MESSAGES = [
  'LEGIT!',
  'CLEAN!',
  'RESPECT.',
  'EARNED IT!',
  'NO CAP!',
  'VALID!',
  'SMOOTH OPERATOR!',
  'STONE COLD LEGIT!',
  'CERTIFIED CHAOS!',
  'THE PEOPLE HAVE SPOKEN!',
  'YOU MAY PROCEED.',
  'ABSOLUTELY DISGUSTING... LY GOOD!',
  'FLAWLESS EXECUTION!',
  'CHAOS APPROVED!',
  'THE COUNCIL ACCEPTS!',
  'UNDENIABLE!',
  'TOO CLEAN!',
  'SURGICAL!',
  'RESPECT THE HUSTLE!',
  'THE AUDACITY... PAID OFF!',
  'CHAOS AGENT SALUTES YOU!',
  'LEGENDARY!',
  'COLD BLOODED!',
  'MINT!',
  'CHEF\'S KISS!',
  'SUGOI! (\u3059\u3054\u3044!)',
  'MAGNIFIQUE!',
  'BRAVO!',
  'OL\u00c9!',
  'WUNDERBAR!',
  'THE RECEIPTS CHECK OUT!',
  'CASE CLOSED!',
  'PROSECUTION RESTS!',
  'ABSOLUTE UNIT!',
  'GIGACHAD MOVE!',
  'BUILT DIFFERENT!',
  'MAIN CHARACTER ENERGY!',
  'CHAOS ROYALTY!',
  'THE CROWD GOES WILD!',
];

const FAILED_MESSAGES = [
  'BULLSHIT!',
  'BUSTED!',
  'CAUGHT!',
  'DENIED!',
  'LIES!',
  'FRAUD!',
  'SIT DOWN!',
  'NOT TODAY!',
  'NICE TRY!',
  'THE AUDACITY!',
  'EXPOSED!',
  'YOU THOUGHT!',
  'ABSOLUTELY NOT!',
  'THE COUNCIL HAS SPOKEN!',
  'FUMBLED!',
  'REJECTED!',
  'SHAME!',
  'CAP DETECTED!',
  'CHAOS AGENT SEES ALL!',
  'AMATEUR HOUR!',
  'BACK TO THE BENCH!',
  'OVERRULED!',
  'OBJECTION SUSTAINED!',
  'THAT DOG WON\'T HUNT!',
  'SWING AND A MISS!',
  'USO DA! (\u5618\u3060!)',
  'MENTIRA!',
  'QUATSCH!',
  'CONNERIES!',
  'BAKA!',
  'NEIN NEIN NEIN!',
  'MALARKEY!',
  'POPPYCOCK!',
  'HOGWASH!',
  'BALDERDASH!',
  'CODSWALLOP!',
  'HORSE FEATHERS!',
  'SHENANIGANS!',
  'TOMFOOLERY DETECTED!',
  'THE LIE DETECTOR DETERMINED... THAT WAS A LIE!',
  'MAURY SAYS NO!',
  'X DOUBT',
  'PRESS F FOR THAT CLAIM!',
  'HAHAHA... NO.',
  'DELETE THIS!',
  'SUS!',
  'IMPOSTER!',
  'VOTED OFF THE ISLAND!',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function VerdictOverlay({ visible, missionTitle, claimantNickname, votes, passed, pointsAwarded, onDone }: Props) {
  const [phase, setPhase] = useState<'intro' | 'votes' | 'reveal' | 'result'>('intro');
  const [revealedVotes, setRevealedVotes] = useState<number>(0);
  const [flavorIndex, setFlavorIndex] = useState(0);
  const [flavorDone, setFlavorDone] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleReveal = useRef(new Animated.Value(0.3)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setPhase('intro');
      setRevealedVotes(0);
      setFlavorIndex(0);
      setFlavorDone(false);
      fadeIn.setValue(0);
      scaleReveal.setValue(0.3);
      shakeX.setValue(0);
      pointsAnim.setValue(0);
      return;
    }

    // Phase 1: Intro — "VOTES ARE IN..." (exactly 2000ms)
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const introTimer = setTimeout(() => {
      setPhase('votes');
    }, 2000);

    return () => clearTimeout(introTimer);
  }, [visible, fadeIn]);

  // Phase 2: Reveal votes one by one
  useEffect(() => {
    if (phase !== 'votes') return;

    if (revealedVotes < votes.length) {
      const timer = setTimeout(() => {
        setRevealedVotes((prev) => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }

    // All votes shown — move to reveal
    const timer = setTimeout(() => setPhase('reveal'), 1000);
    return () => clearTimeout(timer);
  }, [phase, revealedVotes, votes.length]);

  // Phase 3: "IT IS..." dramatic pause then result
  useEffect(() => {
    if (phase !== 'reveal') return;

    // "IT IS..." holds for exactly 1500ms, then instant result (0ms delay)
    const timer = setTimeout(() => {
      setPhase('result');

      // Haptic + sound on reveal — instant
      if (!passed) {
        triggerHaptic('verdictBullshit');
        playSound('VERDICT_BULLSHIT');
      } else {
        triggerHaptic('verdictReveal');
        playSound('VERDICT_LEGIT');
      }

      // Instant scale-in for result (no spring delay)
      scaleReveal.setValue(1);

      // Screen shake for BULLSHIT
      if (!passed) {
        Animated.sequence([
          Animated.timing(shakeX, { toValue: 15, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -15, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 12, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -12, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }

      // Points animation
      Animated.timing(pointsAnim, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }).start();

      // Auto-dismiss
      setTimeout(onDone, 3500);
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase, passed, scaleReveal, shakeX, pointsAnim, onDone]);

  // Flavor text cycling: 400ms per word, 5 cycles, then land on final
  const flavorPool = passed ? PASSED_MESSAGES : FAILED_MESSAGES;
  const finalIndex = useRef(Math.floor(Math.random() * flavorPool.length)).current;

  useEffect(() => {
    if (phase !== 'result' || flavorDone) return;
    if (flavorIndex >= 5) {
      setFlavorDone(true);
      return;
    }
    const timer = setTimeout(() => {
      setFlavorIndex((prev) => prev + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, flavorIndex, flavorDone]);

  if (!visible) return null;

  const verdictMessage = flavorDone
    ? flavorPool[finalIndex]
    : flavorPool[(finalIndex + flavorIndex) % flavorPool.length];

  const verdictColor = passed ? colors.success : colors.error;

  return (
    <Modal transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeIn, transform: [{ translateX: shakeX }] }]}>

        {/* Intro phase */}
        {phase === 'intro' && (
          <View style={styles.center}>
            <Text style={styles.missionLabel}>{claimantNickname} claimed</Text>
            <Text style={styles.missionName}>{missionTitle}</Text>
            <Text style={styles.votesAreIn}>VOTES ARE IN...</Text>
          </View>
        )}

        {/* Vote reveal phase */}
        {phase === 'votes' && (
          <View style={styles.center}>
            <Text style={styles.missionLabel}>{missionTitle}</Text>
            <View style={styles.voteCards}>
              {votes.map((v, i) => {
                const isRevealed = i < revealedVotes;
                return (
                  <Animated.View
                    key={v.nickname}
                    style={[
                      styles.voteCard,
                      isRevealed && (v.vote === 'ACCEPT' ? styles.voteCardAccept : styles.voteCardBS),
                      !isRevealed && styles.voteCardHidden,
                    ]}
                  >
                    <Text style={styles.voterName}>{v.nickname}</Text>
                    {isRevealed ? (
                      <Text style={[
                        styles.voteLabel,
                        v.vote === 'ACCEPT' ? styles.voteLabelAccept : styles.voteLabelBS,
                      ]}>
                        {v.vote === 'ACCEPT' ? 'ACCEPT' : 'BS'}
                      </Text>
                    ) : (
                      <Text style={styles.voteHidden}>?</Text>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

        {/* Dramatic pause */}
        {phase === 'reveal' && (
          <View style={styles.center}>
            <Text style={styles.itIs}>IT IS...</Text>
          </View>
        )}

        {/* Result */}
        {phase === 'result' && (
          <View style={styles.center}>
            <Animated.Text style={[
              styles.verdict,
              { color: verdictColor, transform: [{ scale: scaleReveal }] },
            ]}>
              {verdictMessage}
            </Animated.Text>
            <Animated.Text style={[
              styles.pointsResult,
              {
                color: passed ? colors.success : colors.error,
                opacity: pointsAnim,
                transform: [{ translateY: pointsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              },
            ]}>
              {passed ? `+${pointsAwarded} pts` : `-5 pts`}
            </Animated.Text>
            <Animated.Text style={[styles.targetPlayer, { opacity: pointsAnim }]}>
              {claimantNickname}
            </Animated.Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  center: { alignItems: 'center', width: '100%' },

  // Intro
  missionLabel: { fontSize: 16, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  missionName: { fontSize: 22, color: colors.text, fontWeight: '900', textAlign: 'center', marginBottom: 32 },
  votesAreIn: {
    fontSize: 28, fontWeight: '900', color: colors.highlight, letterSpacing: 4,
  },

  // Vote cards
  voteCards: { gap: 10, width: '100%', paddingHorizontal: 20 },
  voteCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12,
    borderWidth: 2,
  },
  voteCardHidden: {
    backgroundColor: colors.surface, borderColor: colors.surfaceBorder,
  },
  voteCardAccept: {
    backgroundColor: '#0A1A0F', borderColor: colors.success,
  },
  voteCardBS: {
    backgroundColor: '#1A0A0A', borderColor: colors.error,
  },
  voterName: { fontSize: 18, fontWeight: '700', color: colors.text },
  voteLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  voteLabelAccept: { color: colors.success },
  voteLabelBS: { color: colors.error },
  voteHidden: { fontSize: 24, fontWeight: '900', color: colors.textMuted },

  // Dramatic pause
  itIs: {
    fontSize: 36, fontWeight: '900', color: colors.highlight, letterSpacing: 6,
  },

  // Result
  verdict: {
    fontSize: 52, fontWeight: '900', letterSpacing: 4, textAlign: 'center',
  },
  pointsResult: {
    fontSize: 28, fontWeight: '900', marginTop: 12, letterSpacing: 2,
  },
  targetPlayer: {
    fontSize: 18, color: colors.textMuted, fontWeight: '600', marginTop: 8,
  },
});
