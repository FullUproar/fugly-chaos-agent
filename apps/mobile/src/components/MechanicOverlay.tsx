import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';

// ── Types ──────────────────────────────────────────────────────────

interface MechanicInfo {
  id: string;
  name: string;
  description: string;
  reveal_text: string;
}

interface PlayerInfo {
  id: string;
  nickname: string;
}

interface Props {
  mechanic: MechanicInfo;
  mechanicData: Record<string, any>;
  isClaimant: boolean;
  myPlayerId: string;
  players: PlayerInfo[];
  onAction: (payload: {
    action: string;
    vote?: 'ACCEPT' | 'BULLSHIT';
    amount?: number;
    text?: string;
    rating?: number;
  }) => void;
}

// ── Main component ─────────────────────────────────────────────────

export function MechanicOverlay({
  mechanic,
  mechanicData,
  isClaimant,
  myPlayerId,
  players,
  onAction,
}: Props) {
  const [phase, setPhase] = useState<'reveal' | 'active'>('reveal');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const nameScale = useRef(new Animated.Value(0.3)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;

  // Reveal sequence: question -> pause -> mechanic name
  useEffect(() => {
    // Standard mechanic skips reveal
    if (mechanic.id === 'standard') {
      setPhase('active');
      return;
    }

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const revealTimer = setTimeout(() => {
      triggerHaptic('claimAlert');
      Animated.parallel([
        Animated.spring(nameScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    const activeTimer = setTimeout(() => {
      setPhase('active');
    }, 3000);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(activeTimer);
    };
  }, [mechanic.id, fadeIn, nameScale, nameOpacity]);

  if (mechanic.id === 'standard') return null;

  if (phase === 'reveal') {
    return (
      <Animated.View style={[styles.revealContainer, { opacity: fadeIn }]}>
        <Text style={styles.revealQuestion}>HOW WILL THIS BE JUDGED?</Text>
        <Animated.View
          style={{ opacity: nameOpacity, transform: [{ scale: nameScale }] }}
        >
          <Text style={styles.revealName}>{mechanic.name}</Text>
          <Text style={styles.revealDescription}>{mechanic.description}</Text>
        </Animated.View>
      </Animated.View>
    );
  }

  // Active phase — render mechanic-specific UI
  return (
    <View style={styles.activeContainer}>
      <Text style={styles.mechanicLabel}>{mechanic.name}</Text>
      <MechanicUI
        mechanic={mechanic}
        mechanicData={mechanicData}
        isClaimant={isClaimant}
        myPlayerId={myPlayerId}
        players={players}
        onAction={onAction}
      />
    </View>
  );
}

// ── Per-mechanic UI switcher ───────────────────────────────────────

function MechanicUI(props: Props) {
  switch (props.mechanic.id) {
    case 'dictator':
      return <DictatorUI {...props} />;
    case 'pitch_it':
      return <PitchItUI {...props} />;
    case 'volunteer_tribunal':
      return <VolunteerTribunalUI {...props} />;
    case 'reverse_psychology':
      return <ReversePsychologyUI {...props} />;
    case 'auction':
      return <AuctionUI {...props} />;
    case 'russian_roulette':
      return <RussianRouletteUI {...props} />;
    case 'alibi':
      return <AlibiUI {...props} />;
    case 'the_bribe':
      return <BribeUI {...props} />;
    case 'hot_seat':
      return <HotSeatUI {...props} />;
    case 'proxy_vote':
      return <ProxyVoteUI {...props} />;
    case 'unanimous_or_bust':
      return <UnanimousUI {...props} />;
    case 'points_gamble':
      return <PointsGambleUI {...props} />;
    case 'crowd_cheer':
      return <CrowdCheerUI {...props} />;
    case 'the_skeptic':
      return <SkepticUI {...props} />;
    default:
      return null;
  }
}

// ── Vote buttons (reusable) ────────────────────────────────────────

function VoteButtons({
  onAction,
  disabled,
}: {
  onAction: Props['onAction'];
  disabled?: boolean;
}) {
  return (
    <View style={styles.voteRow}>
      <TouchableOpacity
        style={[styles.legitBtn, disabled && styles.disabledBtn]}
        onPress={() => onAction({ action: 'vote', vote: 'ACCEPT' })}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.legitText}>LEGIT</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.bsBtn, disabled && styles.disabledBtn]}
        onPress={() => onAction({ action: 'vote', vote: 'BULLSHIT' })}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.bsText}>BULLSHIT</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── DICTATOR ───────────────────────────────────────────────────────

function DictatorUI({ mechanicData, myPlayerId, players, onAction }: Props) {
  const dictatorId = mechanicData.dictator_id;
  const isDictator = myPlayerId === dictatorId;
  const dictatorName =
    players.find((p) => p.id === dictatorId)?.nickname ?? 'Unknown';

  if (isDictator) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>YOU ARE THE DICTATOR</Text>
        <Text style={styles.mechanicHint}>Your word is law.</Text>
        <VoteButtons onAction={onAction} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.waitingText}>
        Waiting for{' '}
        <Text style={styles.playerNameInline}>{dictatorName}</Text> to decide...
      </Text>
    </View>
  );
}

// ── PITCH IT ───────────────────────────────────────────────────────

function PitchItUI({ mechanicData, isClaimant, onAction }: Props) {
  const [pitchText, setPitchText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timer, setTimer] = useState(15);
  const pitch = mechanicData.pitch;

  useEffect(() => {
    if (!isClaimant || submitted) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isClaimant, submitted]);

  const handleSubmit = useCallback(() => {
    if (!pitchText.trim()) return;
    setSubmitted(true);
    onAction({ action: 'pitch', text: pitchText.trim() });
  }, [pitchText, onAction]);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (timer === 0 && !submitted && isClaimant) {
      handleSubmit();
    }
  }, [timer, submitted, isClaimant, handleSubmit]);

  if (isClaimant && !pitch) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>MAKE YOUR CASE</Text>
        <Text style={styles.timerText}>{timer}s</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Why should they believe you?"
          placeholderTextColor={colors.textMuted}
          value={pitchText}
          onChangeText={setPitchText}
          multiline
          maxLength={200}
          editable={!submitted && timer > 0}
        />
        <TouchableOpacity
          style={[styles.submitBtn, submitted && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={submitted || timer === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>SUBMIT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!pitch) {
    return (
      <View>
        <Text style={styles.waitingText}>Waiting for defense...</Text>
      </View>
    );
  }

  // Pitch submitted — everyone votes
  return (
    <View>
      <View style={styles.pitchBubble}>
        <Text style={styles.pitchText}>"{pitch}"</Text>
      </View>
      {!isClaimant && <VoteButtons onAction={onAction} />}
    </View>
  );
}

// ── VOLUNTEER TRIBUNAL ─────────────────────────────────────────────

function VolunteerTribunalUI({ mechanicData, myPlayerId, players, onAction }: Props) {
  const volunteers: string[] = mechanicData.volunteers ?? [];
  const isVolunteer = volunteers.includes(myPlayerId);
  const isFull = volunteers.length >= 2;
  const [timer, setTimer] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const volunteerNames = volunteers
    .map((id) => players.find((p) => p.id === id)?.nickname ?? '?')
    .join(', ');

  // Volunteering phase
  if (!isFull && timer > 0) {
    return (
      <View>
        <Text style={styles.mechanicHint}>
          Volunteers needed! {volunteers.length}/2
        </Text>
        <Text style={styles.timerText}>{timer}s</Text>
        {volunteerNames ? (
          <Text style={styles.infoText}>Volunteered: {volunteerNames}</Text>
        ) : null}
        {!isVolunteer && (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => onAction({ action: 'volunteer' })}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>VOLUNTEER</Text>
          </TouchableOpacity>
        )}
        {isVolunteer && (
          <Text style={styles.waitingText}>
            You volunteered. Waiting for another...
          </Text>
        )}
      </View>
    );
  }

  // Voting phase (volunteers only, or timer expired)
  if (isVolunteer || (isFull && volunteers.includes(myPlayerId))) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>THE JURY HAS ASSEMBLED</Text>
        <VoteButtons onAction={onAction} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.waitingText}>
        The tribunal is deliberating...
      </Text>
      {volunteerNames ? (
        <Text style={styles.infoText}>Jurors: {volunteerNames}</Text>
      ) : null}
    </View>
  );
}

// ── REVERSE PSYCHOLOGY ─────────────────────────────────────────────

function ReversePsychologyUI({ onAction }: Props) {
  return (
    <View>
      <Text style={styles.mechanicHint}>
        Vote normally... or did we flip everything?{' '}
        <Text style={styles.hintQuestion}>?</Text>
      </Text>
      <VoteButtons onAction={onAction} />
    </View>
  );
}

// ── AUCTION ────────────────────────────────────────────────────────

function AuctionUI({ mechanicData, onAction }: Props) {
  const [bidAmount, setBidAmount] = useState('');
  const [hasBid, setHasBid] = useState(false);
  const bids: Array<{ player_id: string; amount: number }> =
    mechanicData.bids ?? [];
  const highestBid = bids.reduce(
    (max, b) => Math.max(max, b.amount),
    0,
  );

  const handleBid = () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    setHasBid(true);
    onAction({ action: 'bid', amount });
  };

  return (
    <View>
      <Text style={styles.mechanicHighlight}>
        {highestBid > 0
          ? `Current highest bid: ${highestBid} pts`
          : 'No bids yet'}
      </Text>
      {!hasBid ? (
        <View style={styles.bidRow}>
          <TextInput
            style={[styles.textInput, styles.bidInput]}
            placeholder="Your bid"
            placeholderTextColor={colors.textMuted}
            value={bidAmount}
            onChangeText={setBidAmount}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleBid}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>BID</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.waitingText}>Bid placed. Waiting for others...</Text>
      )}
    </View>
  );
}

// ── RUSSIAN ROULETTE ───────────────────────────────────────────────

function RussianRouletteUI({ mechanicData }: Props) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const result = mechanicData.result;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Stop after 2.5s
    const timer = setTimeout(() => {
      spinAnim.stopAnimation();
      triggerHaptic('claimAlert');
    }, 2500);

    return () => clearTimeout(timer);
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.centerContent}>
      <Animated.View
        style={[styles.rouletteWheel, { transform: [{ rotate: spin }] }]}
      >
        <Text style={styles.rouletteEmoji}>
          {result === undefined ? '\u{1F3B0}' : result ? '\u{2705}' : '\u{274C}'}
        </Text>
      </Animated.View>
      <Text style={styles.mechanicHint}>The chaos gods are deciding...</Text>
      {result !== undefined && (
        <Text
          style={[
            styles.mechanicHighlight,
            { color: result ? colors.success : colors.error },
          ]}
        >
          {result ? 'LEGIT!' : 'BULLSHIT!'}
        </Text>
      )}
    </View>
  );
}

// ── ALIBI ──────────────────────────────────────────────────────────

function AlibiUI({ mechanicData, isClaimant, myPlayerId, players, onAction }: Props) {
  const [storyText, setStoryText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const witnessId = mechanicData.witness_id;
  const isWitness = myPlayerId === witnessId;
  const witnessName =
    players.find((p) => p.id === witnessId)?.nickname ?? 'Unknown';
  const claimantStory = mechanicData.claimant_story;
  const witnessStory = mechanicData.witness_story;
  const bothSubmitted = !!claimantStory && !!witnessStory;

  const handleSubmit = () => {
    if (!storyText.trim()) return;
    setSubmitted(true);
    onAction({ action: 'alibi_story', text: storyText.trim() });
  };

  // Claimant or witness input
  if ((isClaimant || isWitness) && !bothSubmitted) {
    const myStory = isClaimant ? claimantStory : witnessStory;
    if (myStory || submitted) {
      return (
        <View>
          <Text style={styles.waitingText}>
            Your story is in. Waiting for the other side...
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.mechanicHighlight}>
          {isClaimant ? 'TELL YOUR STORY' : `YOU ARE THE WITNESS`}
        </Text>
        <Text style={styles.mechanicHint}>
          {isClaimant
            ? 'Describe what happened.'
            : `As ${witnessName}, describe what you saw.`}
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="What happened?"
          placeholderTextColor={colors.textMuted}
          value={storyText}
          onChangeText={setStoryText}
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>SUBMIT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Both submitted — show comparison
  if (bothSubmitted) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>THE STORIES</Text>
        <View style={styles.alibiCompare}>
          <View style={styles.alibiSide}>
            <Text style={styles.alibiLabel}>Claimant</Text>
            <Text style={styles.alibiStory}>"{claimantStory}"</Text>
          </View>
          <View style={styles.alibiDivider} />
          <View style={styles.alibiSide}>
            <Text style={styles.alibiLabel}>Witness</Text>
            <Text style={styles.alibiStory}>"{witnessStory}"</Text>
          </View>
        </View>
      </View>
    );
  }

  // Observer waiting
  return (
    <View>
      <Text style={styles.waitingText}>
        Waiting for stories from both sides...
      </Text>
    </View>
  );
}

// ── THE BRIBE ──────────────────────────────────────────────────────

function BribeUI({ mechanicData, isClaimant, onAction }: Props) {
  const [offer, setOffer] = useState(5);
  const [offered, setOffered] = useState(false);
  const offeredPoints = mechanicData.offered_points;

  if (isClaimant && !offeredPoints) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>NAME YOUR BRIBE</Text>
        <Text style={styles.mechanicHint}>
          Offer your own points to buy their silence.
        </Text>
        <View style={styles.sliderRow}>
          <TouchableOpacity
            onPress={() => setOffer(Math.max(1, offer - 1))}
            style={styles.sliderBtn}
          >
            <Text style={styles.sliderBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{offer} pts</Text>
          <TouchableOpacity
            onPress={() => setOffer(Math.min(50, offer + 1))}
            style={styles.sliderBtn}
          >
            <Text style={styles.sliderBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, offered && styles.disabledBtn]}
          onPress={() => {
            setOffered(true);
            onAction({ action: 'bribe_offer', amount: offer });
          }}
          disabled={offered}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>OFFER</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (offeredPoints) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>
          BRIBE OFFERED: {offeredPoints} pts
        </Text>
        <Text style={styles.mechanicHint}>Accept the bribe or reject it?</Text>
        {!isClaimant && (
          <View style={styles.voteRow}>
            <TouchableOpacity
              style={styles.legitBtn}
              onPress={() => onAction({ action: 'vote', vote: 'ACCEPT' })}
              activeOpacity={0.8}
            >
              <Text style={styles.legitText}>ACCEPT BRIBE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bsBtn}
              onPress={() => onAction({ action: 'vote', vote: 'BULLSHIT' })}
              activeOpacity={0.8}
            >
              <Text style={styles.bsText}>REJECT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.waitingText}>Waiting for bribe offer...</Text>
    </View>
  );
}

// ── HOT SEAT ───────────────────────────────────────────────────────

function HotSeatUI({ mechanicData, isClaimant, onAction }: Props) {
  const questions: string[] = mechanicData.questions ?? [];
  const answers: string[] = mechanicData.answers ?? [];
  const [currentQ, setCurrentQ] = useState(answers.length);
  const [timer, setTimer] = useState(3.3);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isClaimant || currentQ >= questions.length) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 0.1) {
          // Auto-answer NO on timeout
          onAction({ action: 'hot_seat_answer', text: 'NO' });
          setCurrentQ((q) => q + 1);
          return 3.3;
        }
        return t - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isClaimant, currentQ, questions.length, onAction, pulseAnim]);

  if (currentQ >= questions.length) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>HOT SEAT COMPLETE</Text>
        <Text style={styles.waitingText}>Answers are in. Resolving...</Text>
      </View>
    );
  }

  if (isClaimant) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>HOT SEAT</Text>
        <Text style={styles.timerText}>{timer.toFixed(1)}s</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.hotSeatQuestion}>{questions[currentQ]}</Text>
        </Animated.View>
        <View style={styles.voteRow}>
          <TouchableOpacity
            style={styles.legitBtn}
            onPress={() => {
              onAction({ action: 'hot_seat_answer', text: 'YES' });
              setCurrentQ((q) => q + 1);
              setTimer(3.3);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.legitText}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bsBtn}
            onPress={() => {
              onAction({ action: 'hot_seat_answer', text: 'NO' });
              setCurrentQ((q) => q + 1);
              setTimer(3.3);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.bsText}>NO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Observer
  return (
    <View>
      <Text style={styles.mechanicHighlight}>HOT SEAT</Text>
      <Text style={styles.hotSeatQuestion}>{questions[currentQ]}</Text>
      <Text style={styles.waitingText}>
        Watching the claimant sweat... ({currentQ + 1}/{questions.length})
      </Text>
    </View>
  );
}

// ── PROXY VOTE ─────────────────────────────────────────────────────

function ProxyVoteUI({ mechanicData, myPlayerId, players, onAction }: Props) {
  const proxyMap: Record<string, string> = mechanicData.proxy_map ?? {};
  const votingAsId = proxyMap[myPlayerId];
  const votingAsName =
    players.find((p) => p.id === votingAsId)?.nickname ?? 'Unknown';

  return (
    <View>
      <Text style={styles.mechanicHighlight}>
        You are voting as{' '}
        <Text style={styles.playerNameInline}>{votingAsName}</Text>
      </Text>
      <Text style={styles.mechanicHint}>Think like them. Vote like them.</Text>
      <VoteButtons onAction={onAction} />
    </View>
  );
}

// ── UNANIMOUS OR BUST ──────────────────────────────────────────────

function UnanimousUI({ onAction }: Props) {
  return (
    <View>
      <View style={styles.warningBanner}>
        <Text style={styles.warningBannerText}>
          ONE BS AND IT'S OVER
        </Text>
      </View>
      <VoteButtons onAction={onAction} />
    </View>
  );
}

// ── POINTS GAMBLE (Double or Nothing) ──────────────────────────────

function PointsGambleUI({ mechanicData }: Props) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const result = mechanicData.result;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flipAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [flipAnim]);

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.centerContent}>
      <Text style={styles.mechanicHighlight}>DOUBLE OR NOTHING</Text>
      <Animated.View
        style={[styles.coinContainer, { transform: [{ rotateY }] }]}
      >
        <Text style={styles.coinEmoji}>
          {result === undefined ? '\u{1FA99}' : result ? '\u{1F4B0}' : '\u{1F4A8}'}
        </Text>
      </Animated.View>
      {result !== undefined && (
        <Text
          style={[
            styles.mechanicHighlight,
            { color: result ? colors.success : colors.error },
          ]}
        >
          {result ? 'DOUBLE! Points x2!' : 'NOTHING! Points lost!'}
        </Text>
      )}
    </View>
  );
}

// ── CROWD CHEER ────────────────────────────────────────────────────

function CrowdCheerUI({ onAction }: Props) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (stars: number) => {
    if (submitted) return;
    setRating(stars);
    setSubmitted(true);
    triggerHaptic('signalSent');
    onAction({ action: 'rate', rating: stars });
  };

  return (
    <View>
      <Text style={styles.mechanicHighlight}>RATE THE PERFORMANCE</Text>
      <Text style={styles.mechanicHint}>Average above 3 to pass</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRate(star)}
            disabled={submitted}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.star,
                star <= rating && styles.starActive,
                submitted && styles.starSubmitted,
              ]}
            >
              {star <= rating ? '\u{2B50}' : '\u{2606}'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {submitted && (
        <Text style={styles.waitingText}>
          Rated {rating}/5. Waiting for others...
        </Text>
      )}
    </View>
  );
}

// ── THE SKEPTIC ────────────────────────────────────────────────────

function SkepticUI({ mechanicData, myPlayerId, players, onAction }: Props) {
  const skepticId = mechanicData.skeptic_id;
  const isSkeptic = myPlayerId === skepticId;
  const skepticName =
    players.find((p) => p.id === skepticId)?.nickname ?? 'Unknown';

  if (isSkeptic) {
    return (
      <View>
        <Text style={styles.mechanicHighlight}>YOUR VOTE COUNTS TRIPLE</Text>
        <Text style={styles.mechanicHint}>
          You are THE SKEPTIC. Choose wisely.
        </Text>
        <VoteButtons onAction={onAction} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.mechanicHint}>
        Someone among you is THE SKEPTIC. Their vote counts triple.
      </Text>
      <VoteButtons onAction={onAction} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Reveal phase
  revealContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  revealQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  revealName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.accent,
    textAlign: 'center',
    letterSpacing: 1,
  },
  revealDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },

  // Active phase
  activeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  mechanicLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  mechanicHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: 8,
  },
  mechanicHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  hintQuestion: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.warning,
  },

  // Vote buttons
  voteRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  legitBtn: {
    flex: 1,
    backgroundColor: '#0A1A0F',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
    minHeight: 48,
    justifyContent: 'center',
  },
  legitText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 2,
  },
  bsBtn: {
    flex: 1,
    backgroundColor: '#1A0A0A',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.error,
    minHeight: 48,
    justifyContent: 'center',
  },
  bsText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.error,
    letterSpacing: 2,
  },
  disabledBtn: {
    opacity: 0.4,
  },

  // Common
  waitingText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  playerNameInline: {
    fontWeight: '900',
    color: colors.accent,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.warning,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Input
  textInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    color: colors.text,
    fontSize: 14,
    padding: 12,
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 2,
  },

  // Auction
  bidRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bidInput: {
    flex: 1,
    minHeight: 48,
    textAlignVertical: 'center',
  },

  // Pitch
  pitchBubble: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pitchText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
  },

  // Alibi
  alibiCompare: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  alibiSide: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 10,
  },
  alibiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  alibiStory: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
  },
  alibiDivider: {
    width: 2,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 1,
  },

  // Bribe slider
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  sliderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.accent,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.warning,
    minWidth: 80,
    textAlign: 'center',
  },

  // Hot Seat
  hotSeatQuestion: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  // Russian Roulette
  centerContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  rouletteWheel: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rouletteEmoji: {
    fontSize: 36,
  },

  // Coin flip
  coinContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  coinEmoji: {
    fontSize: 36,
  },

  // Crowd cheer
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  star: {
    fontSize: 36,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.warning,
  },
  starSubmitted: {
    opacity: 0.7,
  },

  // Warning banner
  warningBanner: {
    backgroundColor: '#3D0A0A',
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  warningBannerText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.error,
    letterSpacing: 2,
  },
});
