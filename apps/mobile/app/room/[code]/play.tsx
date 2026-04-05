import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, Animated, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import type { Mission, ClaimWithContext, VoteType, SignalType, MomentType } from '@chaos-agent/shared';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { usePolling } from '@/hooks/use-polling';
import { FlashMissionOverlay } from '@/components/FlashMissionOverlay';
import { MiniGameOverlay } from '@/components/MiniGameOverlay';
import { PollOverlay } from '@/components/PollOverlay';
import { SignalPanel } from '@/components/SignalPanel';
import { VerdictOverlay } from '@/components/VerdictOverlay';
import { ClaimAlert } from '@/components/ClaimAlert';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';

type Tab = 'missions' | 'activity' | 'leaderboard';

const CLAIM_MESSAGES = [
  'Claimed!',
  'Got it!',
  'Nice one!',
  'Points incoming!',
  'Chaos delivered!',
  'Boom!',
];

export default function PlayScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('missions');
  const [signalOpen, setSignalOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [claimToast, setClaimToast] = useState<{ message: string; points: number } | null>(null);
  const [nudgeToast, setNudgeToast] = useState<string | null>(null);
  const nudgeToastOpacity = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const {
    roomId, isHost, room, standingMissions, activeFlash, activePoll, myPollVote,
    activeClaims, allClaims, scores, roomPlayerId, players,
    flashDismissed, pollDismissed, miniGameDismissed,
    dismissFlash, dismissPoll, dismissMiniGame,
    activeMiniGame, gameContext,
  } = useSessionStore();

  // Moment capture state
  const [showCapturePanel, setShowCapturePanel] = useState(false);
  const [captureType, setCaptureType] = useState<MomentType>('funny_quote');
  const [captureText, setCaptureText] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const captureToastOpacity = useRef(new Animated.Value(0)).current;

  // REC indicator pulse animation
  const recPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(recPulse, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(recPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [recPulse]);

  const handleCaptureMoment = async () => {
    if (!roomId || capturing) return;
    setCapturing(true);
    try {
      await api.captureMoment({
        room_id: roomId,
        moment_type: captureType,
        description: captureText || `${captureType.replace(/_/g, ' ')} moment`,
      });
      setCaptureToast('Moment captured!');
      captureToastOpacity.setValue(1);
      Animated.timing(captureToastOpacity, {
        toValue: 0,
        duration: 2000,
        delay: 800,
        useNativeDriver: true,
      }).start(() => setCaptureToast(null));
      setShowCapturePanel(false);
      setCaptureText('');
    } catch {
      setCaptureToast('Failed to capture');
      captureToastOpacity.setValue(1);
      Animated.timing(captureToastOpacity, {
        toValue: 0,
        duration: 1500,
        delay: 800,
        useNativeDriver: true,
      }).start(() => setCaptureToast(null));
    } finally {
      setCapturing(false);
    }
  };

  // Auto-break suggestion state
  const [breakSuggested, setBreakSuggested] = useState(false);
  const breakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gameContext?.autoBreakEnabled && gameContext.autoBreakAfterMinutes > 0 && !breakSuggested) {
      breakTimerRef.current = setTimeout(() => {
        setBreakSuggested(true);
      }, gameContext.autoBreakAfterMinutes * 60_000);
    }
    return () => {
      if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
    };
  }, [gameContext?.autoBreakEnabled, gameContext?.autoBreakAfterMinutes, breakSuggested]);
  usePolling(roomId);

  useEffect(() => {
    if (room?.status === 'ENDED') {
      router.replace(`/room/${code}/results`);
    }
  }, [room?.status, code]);

  const showClaimToast = useCallback((points: number) => {
    const msg = CLAIM_MESSAGES[Math.floor(Math.random() * CLAIM_MESSAGES.length)];
    setClaimToast({ message: msg, points });
    toastOpacity.setValue(1);
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 2000,
      delay: 800,
      useNativeDriver: true,
    }).start(() => setClaimToast(null));
  }, [toastOpacity]);

  // --- Nudge handler ---
  const handleNudge = useCallback(async (claimId: string) => {
    try {
      const result = await api.nudgeVoters({ claim_id: claimId });
      triggerHaptic('signalSent');
      setNudgeToast(result.message);
      nudgeToastOpacity.setValue(1);
      Animated.timing(nudgeToastOpacity, {
        toValue: 0,
        duration: 2500,
        delay: 1200,
        useNativeDriver: true,
      }).start(() => setNudgeToast(null));
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Cooldown')) {
        setNudgeToast('Easy there... cooldown active');
        nudgeToastOpacity.setValue(1);
        Animated.timing(nudgeToastOpacity, {
          toValue: 0,
          duration: 1500,
          delay: 800,
          useNativeDriver: true,
        }).start(() => setNudgeToast(null));
      }
    }
  }, [nudgeToastOpacity]);

  const handleEndGame = async () => {
    if (!roomId) return;
    setShowEndConfirm(false);
    try {
      await api.endSession({ room_id: roomId });
    } catch (e) {
      console.warn('End game error:', (e as Error).message);
    }
  };

  const handleClaimFlash = async () => {
    if (!activeFlash) return;
    try {
      await api.claimMission({ mission_id: activeFlash.id });
      showClaimToast(activeFlash.points);
    } catch { /* polling */ }
  };

  const handlePollVote = async (answer: string) => {
    if (!activePoll) return;
    try {
      await api.submitPollVote({ poll_id: activePoll.id, answer });
    } catch { /* polling */ }
  };

  const handleSignal = async (signalType: SignalType, targetPlayerId?: string) => {
    if (!roomId) return;
    try {
      await api.sendSignal({ room_id: roomId, signal_type: signalType, target_player_id: targetPlayerId });
    } catch { /* ignore */ }
  };

  // --- Verdict detection ---
  const [verdict, setVerdict] = useState<{
    missionTitle: string;
    claimantNickname: string;
    votes: Array<{ nickname: string; vote: 'ACCEPT' | 'BULLSHIT' }>;
    passed: boolean;
    pointsAwarded: number;
  } | null>(null);
  const prevClaimIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const prevActive = prevClaimIdsRef.current;
    const currentActiveIds = new Set(activeClaims.map((c) => c.claim.id));

    for (const claim of allClaims) {
      const wasActive = prevActive.has(claim.claim.id);
      const isResolved = claim.claim.status === 'VOTE_PASSED' || claim.claim.status === 'VOTE_FAILED';

      if (wasActive && isResolved && !verdict) {
        const voteReveals = claim.votes.map((v) => {
          const player = players.find((p) => p.id === v.room_player_id);
          return { nickname: player?.nickname ?? '???', vote: v.vote as 'ACCEPT' | 'BULLSHIT' };
        });

        setVerdict({
          missionTitle: claim.mission_title,
          claimantNickname: claim.claimant_nickname,
          votes: voteReveals,
          passed: claim.claim.status === 'VOTE_PASSED',
          pointsAwarded: claim.claim.points_awarded,
        });
        break;
      }
    }

    prevClaimIdsRef.current = currentActiveIds;
  }, [activeClaims, allClaims, players, verdict]);

  // Track local votes so buttons don't flicker between polls
  const [localVotes, setLocalVotes] = useState<Record<string, VoteType>>({});
  const trackLocalVote = useCallback((claimId: string, vote: VoteType) => {
    setLocalVotes((prev) => ({ ...prev, [claimId]: vote }));
  }, []);

  // --- Claim alert (new claims from others) ---
  const [claimAlert, setClaimAlert] = useState<ClaimWithContext | null>(null);
  const seenClaimIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const claim of activeClaims) {
      const isNew = !seenClaimIdsRef.current.has(claim.claim.id);
      const isOther = claim.claim.room_player_id !== roomPlayerId;
      const noVoteYet = !claim.my_vote && !localVotes[claim.claim.id];

      if (isNew && isOther && noVoteYet && !claimAlert && !verdict) {
        setClaimAlert(claim);
      }
      seenClaimIdsRef.current.add(claim.claim.id);
    }
  }, [activeClaims, roomPlayerId, localVotes, claimAlert, verdict]);

  const handleAlertVote = (claimId: string, vote: VoteType) => {
    trackLocalVote(claimId, vote);
    api.voteClaim({ claim_id: claimId, vote }).catch(() => {});
  };

  const flashEnabled = gameContext?.flashEnabled !== false;
  const showFlash = flashEnabled && activeFlash && !flashDismissed && activeFlash.status === 'REVEALED';
  const showMiniGame = activeMiniGame && !miniGameDismissed;
  const showPoll = activePoll && !pollDismissed;
  const bottomPad = insets.bottom + 80;

  return (
    <View style={styles.container}>
      {/* Header with room name, REC indicator, and end game for host */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {room?.room_name ? (
            <Text style={styles.roomNameHeader}>{room.room_name}</Text>
          ) : <View />}
          {/* REC indicator — reminds players moments are being captured */}
          <Animated.View style={[styles.recBadge, { opacity: recPulse }]}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC</Text>
          </Animated.View>
        </View>
        {isHost && (
          <TouchableOpacity onPress={() => setShowEndConfirm(true)} activeOpacity={0.7}>
            <Text style={styles.endGameLink}>End Game</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Auto-break suggestion */}
      {breakSuggested && (
        <View style={styles.breakBar}>
          <Text style={styles.breakText}>Been at it for a while. Take a break?</Text>
          <TouchableOpacity onPress={() => setBreakSuggested(false)} activeOpacity={0.7}>
            <Text style={styles.breakDismiss}>DISMISS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* End game confirmation */}
      {showEndConfirm && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>End the game for everyone?</Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.confirmYes} onPress={handleEndGame} activeOpacity={0.7}>
              <Text style={styles.confirmYesText}>END IT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmNo} onPress={() => setShowEndConfirm(false)} activeOpacity={0.7}>
              <Text style={styles.confirmNoText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['missions', 'activity', 'leaderboard'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
            {tab === 'activity' && activeClaims.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeClaims.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'missions' && (
        <StandingMissionsTab
          missions={standingMissions}
          onClaimed={showClaimToast}
          bottomPad={bottomPad}
          hasPendingClaim={activeClaims.some((c) => c.claim.room_player_id === roomPlayerId)}
          activeClaims={activeClaims}
          myRoomPlayerId={roomPlayerId}
          localVotes={localVotes}
          onVoted={trackLocalVote}
        />
      )}
      {activeTab === 'activity' && (
        <ActivityTab
          claims={allClaims}
          activeClaims={activeClaims}
          myRoomPlayerId={roomPlayerId}
          bottomPad={bottomPad}
          localVotes={localVotes}
          onVoted={trackLocalVote}
          players={players}
          onNudge={handleNudge}
        />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardTab bottomPad={bottomPad} />
      )}

      {/* Claim toast */}
      {claimToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, bottom: 90 + insets.bottom }]}>
          <Text style={styles.toastText}>{claimToast.message}</Text>
          <Text style={styles.toastPoints}>+{claimToast.points}</Text>
        </Animated.View>
      )}

      {/* Nudge toast */}
      {nudgeToast && (
        <Animated.View style={[styles.nudgeToast, { opacity: nudgeToastOpacity, bottom: 90 + insets.bottom }]}>
          <Text style={styles.nudgeToastText}>{nudgeToast}</Text>
        </Animated.View>
      )}

      {/* Capture toast */}
      {captureToast && (
        <Animated.View style={[styles.captureToast, { opacity: captureToastOpacity, bottom: 90 + insets.bottom }]}>
          <Text style={styles.captureToastText}>{captureToast}</Text>
        </Animated.View>
      )}

      {/* Capture moment mini-FAB */}
      <TouchableOpacity
        style={[styles.captureFab, { bottom: 78 + insets.bottom }]}
        onPress={() => setShowCapturePanel(!showCapturePanel)}
        activeOpacity={0.7}
      >
        <Text style={styles.captureFabText}>CAP</Text>
      </TouchableOpacity>

      {/* Quick capture panel */}
      {showCapturePanel && (
        <View style={[styles.capturePanel, { bottom: 130 + insets.bottom }]}>
          <Text style={styles.capturePanelTitle}>CAPTURE MOMENT</Text>
          <View style={styles.captureTypeRow}>
            {(['funny_quote', 'epic_claim', 'custom'] as MomentType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.captureTypeChip, captureType === t && styles.captureTypeChipActive]}
                onPress={() => setCaptureType(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.captureTypeChipText, captureType === t && styles.captureTypeChipTextActive]}>
                  {t === 'funny_quote' ? 'QUOTE' : t === 'epic_claim' ? 'EPIC' : 'OTHER'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.captureSubmitButton, capturing && styles.buttonDisabled]}
            onPress={handleCaptureMoment}
            disabled={capturing}
            activeOpacity={0.7}
          >
            <Text style={styles.captureSubmitText}>{capturing ? 'SAVING...' : 'CAPTURE'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Signal FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={() => setSignalOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>SIGNAL</Text>
      </TouchableOpacity>

      {showMiniGame && !verdict && roomId && (
        <MiniGameOverlay roomId={roomId} visible={true} onDismiss={dismissMiniGame} />
      )}
      {showFlash && !verdict && !showMiniGame && (
        <FlashMissionOverlay mission={activeFlash} onClaim={handleClaimFlash} onDismiss={dismissFlash} />
      )}
      {showPoll && !verdict && !showMiniGame && (
        <PollOverlay poll={activePoll} myVote={myPollVote} onVote={handlePollVote} onDismiss={dismissPoll} />
      )}
      <SignalPanel
        visible={signalOpen}
        players={players}
        myRoomPlayerId={roomPlayerId}
        onSend={handleSignal}
        onClose={() => setSignalOpen(false)}
      />

      {/* Claim alert — steals focus when someone else claims */}
      {claimAlert && !verdict && !showMiniGame && (
        <ClaimAlert
          claim={claimAlert}
          onVote={handleAlertVote}
          onDismiss={() => setClaimAlert(null)}
        />
      )}

      {/* Verdict reveal */}
      {verdict && (
        <VerdictOverlay
          visible={true}
          missionTitle={verdict.missionTitle}
          claimantNickname={verdict.claimantNickname}
          votes={verdict.votes}
          passed={verdict.passed}
          pointsAwarded={verdict.pointsAwarded}
          onDone={() => setVerdict(null)}
        />
      )}
    </View>
  );
}

// --- Standing Missions Tab ---
function StandingMissionsTab({ missions, onClaimed, bottomPad, hasPendingClaim, activeClaims, myRoomPlayerId, localVotes, onVoted }: {
  missions: Mission[];
  onClaimed: (pts: number) => void;
  bottomPad: number;
  hasPendingClaim: boolean;
  activeClaims: ClaimWithContext[];
  myRoomPlayerId: string | null;
  localVotes: Record<string, VoteType>;
  onVoted: (claimId: string, vote: VoteType) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);

  const handleClaim = async (mission: Mission) => {
    setClaiming(mission.id);
    try {
      await api.claimMission({ mission_id: mission.id });
      onClaimed(mission.points);
    } catch { /* polling */ }
    finally { setClaiming(null); }
  };

  const handleVote = async (claimId: string, vote: VoteType) => {
    setVoting(claimId);
    onVoted(claimId, vote);
    try {
      await api.voteClaim({ claim_id: claimId, vote });
    } catch { /* polling */ }
    finally { setVoting(null); }
  };

  const claimByMission: Record<string, ClaimWithContext> = {};
  for (const c of activeClaims) {
    if (c.claim.mission_id) {
      claimByMission[c.claim.mission_id] = c;
    }
  }

  if (missions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator color={colors.textSecondary} />
        <Text style={styles.emptyText}>Loading missions...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}>
      <Text style={styles.sectionHeader}>ACTIVE RULES ({missions.length})</Text>
      <Text style={styles.sectionSubtext}>Tap a rule to see details and claim</Text>

      {missions.map((item) => {
        const isExpanded = expanded === item.id;
        const lockClaim = claimByMission[item.id];
        const isLocked = !!lockClaim;
        const isMyClaim = lockClaim?.claim.room_player_id === myRoomPlayerId;
        const acceptCount = lockClaim?.votes.filter((v) => v.vote === 'ACCEPT').length ?? 0;
        const bsCount = lockClaim?.votes.filter((v) => v.vote === 'BULLSHIT').length ?? 0;
        const serverVote = lockClaim?.my_vote;
        const myVote = lockClaim ? (localVotes[lockClaim.claim.id] ?? serverVote) : null;
        const isVotingThis = voting === lockClaim?.claim.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.compactMission, isLocked && styles.compactMissionLocked]}
            onPress={() => setExpanded(isExpanded ? null : item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle} numberOfLines={isExpanded ? undefined : 1}>
                {item.title}
              </Text>
              {!isLocked && <Text style={styles.compactPoints}>{item.points}</Text>}
              {isLocked && <Text style={styles.lockedBadge}>CLAIMED</Text>}
            </View>

            {isLocked && (
              <View style={styles.expandedContent}>
                <Text style={styles.compactDesc}>{item.description}</Text>
                <Text style={styles.lockedBy}>
                  {isMyClaim ? 'You claimed this \u2014 waiting for votes' : `${lockClaim.claimant_nickname} claims this`}
                </Text>

                {(acceptCount > 0 || bsCount > 0) && (
                  <Text style={styles.voteCount}>{acceptCount} Accept / {bsCount} BS</Text>
                )}

                {!isMyClaim && !myVote && (
                  <View style={styles.voteButtons}>
                    <TouchableOpacity
                      style={[styles.acceptButton, isVotingThis && styles.buttonDisabled]}
                      onPress={() => handleVote(lockClaim.claim.id, 'ACCEPT')}
                      disabled={isVotingThis}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptButtonText}>{isVotingThis ? 'VOTING...' : 'ACCEPT'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bsButton, isVotingThis && styles.buttonDisabled]}
                      onPress={() => handleVote(lockClaim.claim.id, 'BULLSHIT')}
                      disabled={isVotingThis}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bsButtonText}>{isVotingThis ? '...' : 'BULLSHIT'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isMyClaim && myVote && (
                  <Text style={styles.votedText}>You voted: {myVote}</Text>
                )}
              </View>
            )}

            {!isLocked && isExpanded && (
              <View style={styles.expandedContent}>
                <Text style={styles.compactDesc}>{item.description}</Text>
                <TouchableOpacity
                  style={[styles.compactClaimButton, (hasPendingClaim || claiming === item.id) && styles.buttonDisabled]}
                  onPress={() => handleClaim(item)}
                  disabled={hasPendingClaim || claiming === item.id}
                  activeOpacity={0.7}
                >
                  {claiming === item.id ? (
                    <ActivityIndicator color={colors.accentText} size="small" />
                  ) : hasPendingClaim ? (
                    <Text style={styles.compactClaimText}>CLAIM PENDING...</Text>
                  ) : (
                    <Text style={styles.compactClaimText}>CLAIM</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.waitingCard}>
        <Text style={styles.waitingTitle}>WAITING FOR CHAOS...</Text>
        <Text style={styles.waitingSubtext}>Flash missions will interrupt at random. Stay alert.</Text>
      </View>
    </ScrollView>
  );
}

// --- Activity Tab ---
function ActivityTab({
  claims, activeClaims, myRoomPlayerId, bottomPad, localVotes, onVoted, players, onNudge,
}: {
  claims: ClaimWithContext[];
  activeClaims: ClaimWithContext[];
  myRoomPlayerId: string | null;
  bottomPad: number;
  localVotes: Record<string, VoteType>;
  onVoted: (claimId: string, vote: VoteType) => void;
  players: Array<{ id: string; nickname: string }>;
  onNudge: (claimId: string) => void;
}) {
  const activeIds = new Set(activeClaims.map((c) => c.claim.id));
  const [voting, setVoting] = useState<string | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  const handleVote = async (claimId: string, vote: VoteType) => {
    setVoting(claimId);
    onVoted(claimId, vote);
    try {
      await api.voteClaim({ claim_id: claimId, vote });
    } catch { /* polling */ }
    finally { setVoting(null); }
  };

  if (claims.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No claims yet</Text>
        <Text style={styles.emptySubtext}>Claims appear when players complete missions</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={claims}
      keyExtractor={(c) => c.claim.id}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
      renderItem={({ item }) => {
        const isMine = item.claim.room_player_id === myRoomPlayerId;
        const isActive = activeIds.has(item.claim.id);
        const acceptCount = item.votes.filter((v) => v.vote === 'ACCEPT').length;
        const bsCount = item.votes.filter((v) => v.vote === 'BULLSHIT').length;
        const totalVotes = item.votes.length;
        const eligibleVoters = Math.max(1, players.length - 1);
        const passed = item.claim.status === 'VOTE_PASSED' || item.claim.status === 'ACCEPTED';
        const failed = item.claim.status === 'VOTE_FAILED';
        const isExpanded = expandedClaim === item.claim.id;
        const isVoting = voting === item.claim.id;

        return (
          <TouchableOpacity
            style={[styles.claimCard, !isActive && styles.claimCardResolved]}
            onPress={() => setExpandedClaim(isExpanded ? null : item.claim.id)}
            activeOpacity={0.7}
          >
            <View style={styles.claimHeader}>
              <Text style={styles.claimantName}>{item.claimant_nickname}</Text>
              {passed && <Text style={styles.statusVerified}>+{item.claim.points_awarded} pts</Text>}
              {failed && <Text style={styles.statusFailed}>BULLSHIT</Text>}
              {isActive && <Text style={styles.claimPoints}>{item.mission_points} pts</Text>}
            </View>
            <Text style={styles.claimMissionTitle}>{item.mission_title}</Text>

            {(acceptCount > 0 || bsCount > 0) && (
              <Text style={styles.voteCount}>{acceptCount} Accept / {bsCount} BS</Text>
            )}

            {(() => {
              const myVote = localVotes[item.claim.id] ?? item.my_vote;
              const hasActed = !!myVote || isMine;

              return (
                <>
                  {/* Active claim, not mine, haven't voted: orange bar + vote buttons */}
                  {isActive && !isMine && !myVote && (
                    <View>
                      <View style={styles.voteButtons}>
                        <TouchableOpacity
                          style={[styles.acceptButton, isVoting && styles.buttonDisabled]}
                          onPress={() => handleVote(item.claim.id, 'ACCEPT')}
                          disabled={isVoting}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.acceptButtonText}>{isVoting ? 'VOTING...' : 'ACCEPT'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.bsButton, isVoting && styles.buttonDisabled]}
                          onPress={() => handleVote(item.claim.id, 'BULLSHIT')}
                          disabled={isVoting}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.bsButtonText}>{isVoting ? '...' : 'BULLSHIT'}</Text>
                        </TouchableOpacity>
                      </View>
                      <WaitingBar claimedAt={item.claim.claimed_at} durationSeconds={180} muted={false} />
                    </View>
                  )}

                  {/* Active claim, voted or is mine: grey bar + vote tally + nudge */}
                  {isActive && hasActed && (
                    <View>
                      <View style={styles.waitingInfoRow}>
                        <Text style={styles.votedText}>
                          {isMine ? 'Your claim \u2014 waiting for votes' : `You voted: ${myVote}`}
                        </Text>
                        <Text style={styles.voteTally}>
                          {totalVotes}/{eligibleVoters} voted
                        </Text>
                      </View>
                      <WaitingBar claimedAt={item.claim.claimed_at} durationSeconds={180} muted={true} />
                      <TouchableOpacity
                        style={styles.nudgeButtonInline}
                        onPress={() => onNudge(item.claim.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.nudgeButtonInlineText}>NUDGE</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
          </TouchableOpacity>
        );
      }}
    />
  );
}

// --- Leaderboard Tab ---
function LeaderboardTab({ bottomPad }: { bottomPad: number }) {
  const scores = useSessionStore((s) => s.scores);

  if (scores.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Scores will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={scores}
      keyExtractor={(s) => s.room_player_id}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
      renderItem={({ item, index }) => (
        <View style={[styles.scoreRow, index === 0 && styles.scoreRowFirst]}>
          <Text style={[styles.scoreRank, index === 0 && styles.scoreRankFirst]}>
            {index + 1}
          </Text>
          <Text style={[styles.scoreNickname, index === 0 && styles.scoreNicknameFirst]}>
            {item.nickname}
          </Text>
          <Text style={[styles.scoreValue, index === 0 && styles.scoreValueFirst]}>
            {item.score}
          </Text>
        </View>
      )}
    />
  );
}

// --- Waiting Bar (decay bar for claims -- grey when muted, orange when active) ---
function WaitingBar({ claimedAt, durationSeconds, muted }: { claimedAt: string; durationSeconds: number; muted: boolean }) {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const start = new Date(claimedAt).getTime();
    const end = start + durationSeconds * 1000;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, (end - now) / (durationSeconds * 1000));
      setProgress(remaining);
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [claimedAt, durationSeconds]);

  return (
    <View style={styles.waitingBarContainer}>
      <View style={[
        muted ? styles.waitingBarFillMuted : styles.waitingBarFillActive,
        { width: `${progress * 100}%` },
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  roomNameHeader: {
    fontSize: 16, fontWeight: '800', color: colors.accent, letterSpacing: 1,
  },
  endGameTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  endGameLink: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  // Auto-break suggestion
  breakBar: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  breakText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  breakDismiss: { fontSize: 13, color: colors.accent, fontWeight: '700', paddingHorizontal: 8 },

  // End game confirmation
  confirmBar: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  confirmText: { fontSize: 15, color: colors.text, fontWeight: '600', flex: 1 },
  confirmButtons: { flexDirection: 'row', gap: 8 },
  confirmYes: {
    backgroundColor: colors.error, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50,
    minHeight: 44, justifyContent: 'center',
  },
  confirmYesText: { fontSize: 14, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  confirmNo: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50,
    borderWidth: 1, borderColor: colors.surfaceBorder, minHeight: 44, justifyContent: 'center',
  },
  confirmNoText: { fontSize: 14, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, minHeight: 48 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  tabTextActive: { color: colors.accent },
  badge: {
    backgroundColor: colors.accent, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.accentText },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyText: { color: colors.textSecondary, fontSize: 18, marginTop: 12 },
  emptySubtext: { color: colors.textMuted, fontSize: 15, marginTop: 4, textAlign: 'center' },

  // Section headers
  sectionHeader: { fontSize: 13, fontWeight: '900', color: colors.textMuted, letterSpacing: 2, marginBottom: 2 },
  sectionSubtext: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },

  // Compact standing mission
  compactMission: {
    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.surfaceBorder, minHeight: 52,
  },
  compactMissionLocked: { borderColor: colors.warning },
  compactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  compactPoints: { fontSize: 16, fontWeight: '800', color: colors.warning },
  expandedContent: { marginTop: 10 },
  compactDesc: { fontSize: 15, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  lockedBadge: { fontSize: 12, fontWeight: '900', color: colors.warning, letterSpacing: 1 },
  lockedBy: { fontSize: 14, color: colors.warning, fontWeight: '600', marginBottom: 8 },
  compactClaimButton: {
    backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 50, alignItems: 'center',
    minHeight: 48,
  },
  compactClaimText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },

  // Waiting card
  waitingCard: {
    marginTop: 16, padding: 24, borderRadius: 12,
    borderWidth: 1, borderColor: colors.surfaceBorder, borderStyle: 'dashed',
    alignItems: 'center',
  },
  waitingTitle: { fontSize: 15, fontWeight: '900', color: colors.accent, letterSpacing: 2, marginBottom: 4 },
  waitingSubtext: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  // Toast
  toast: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: colors.accent, borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 6,
  },
  toastText: { fontSize: 18, fontWeight: '900', color: colors.accentText },
  toastPoints: { fontSize: 20, fontWeight: '900', color: colors.accentText },

  // Nudge toast
  nudgeToast: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: colors.surface, borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24,
    borderWidth: 2, borderColor: colors.warning,
    alignItems: 'center',
    elevation: 6,
  },
  nudgeToastText: { fontSize: 16, fontWeight: '900', color: colors.highlight, letterSpacing: 1 },

  // Claim/vote card
  claimCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  claimCardResolved: { opacity: 0.7 },
  claimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  claimantName: { fontSize: 17, fontWeight: '700', color: colors.text },
  claimPoints: { fontSize: 16, fontWeight: '700', color: colors.warning },
  claimMissionTitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 10 },
  voteCount: { fontSize: 14, color: colors.textMuted, marginBottom: 10 },
  voteButtons: { flexDirection: 'row', gap: 12 },
  acceptButton: {
    flex: 1, backgroundColor: '#0A1A0F', paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 1, borderColor: colors.success, minHeight: 52,
  },
  acceptButtonText: { fontSize: 16, fontWeight: '700', color: colors.success, letterSpacing: 1 },
  bsButton: {
    flex: 1, backgroundColor: colors.accentBg, paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 1, borderColor: colors.accent, minHeight: 52,
  },
  bsButtonText: { fontSize: 16, fontWeight: '700', color: colors.accent, letterSpacing: 1 },
  buttonDisabled: { opacity: 0.5 },
  votedText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  statusVerified: { fontSize: 14, fontWeight: '700', color: colors.success, letterSpacing: 1 },
  statusFailed: { fontSize: 14, fontWeight: '700', color: colors.error, letterSpacing: 1 },

  // Waiting info row (vote tally + status)
  waitingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  voteTally: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },

  // Inline nudge button (Activity tab)
  nudgeButtonInline: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.warning,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  nudgeButtonInlineText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.warning,
    letterSpacing: 2,
  },

  // Leaderboard
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 8, minHeight: 56,
  },
  scoreRowFirst: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accent },
  scoreRank: { fontSize: 20, fontWeight: '800', color: colors.textMuted, width: 32 },
  scoreRankFirst: { color: colors.accent },
  scoreNickname: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
  scoreNicknameFirst: { color: colors.accent },
  scoreValue: { fontSize: 22, fontWeight: '800', color: colors.textSecondary },
  scoreValueFirst: { color: colors.accent },

  // Header left group
  headerLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },

  // REC indicator
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,0,0,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  recDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF0000',
  },
  recText: {
    fontSize: 10, fontWeight: '900', color: '#FF0000', letterSpacing: 2,
  },

  // Capture moment mini-FAB
  captureFab: {
    position: 'absolute', right: 20,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.warning,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3, minWidth: 52, minHeight: 40,
  },
  captureFabText: {
    fontSize: 11, fontWeight: '900', color: colors.warning, letterSpacing: 1,
  },

  // Capture panel
  capturePanel: {
    position: 'absolute', right: 20,
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, width: 220,
    elevation: 5,
  },
  capturePanelTitle: {
    fontSize: 11, fontWeight: '900', color: colors.textSecondary,
    letterSpacing: 2, marginBottom: 10, textAlign: 'center',
  },
  captureTypeRow: {
    flexDirection: 'row', gap: 6, marginBottom: 10, justifyContent: 'center',
  },
  captureTypeChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  captureTypeChipActive: {
    backgroundColor: colors.warning, borderColor: colors.warning,
  },
  captureTypeChipText: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1,
  },
  captureTypeChipTextActive: {
    color: colors.bg,
  },
  captureSubmitButton: {
    backgroundColor: colors.warning, paddingVertical: 10, borderRadius: 50,
    alignItems: 'center', minHeight: 40,
  },
  captureSubmitText: {
    fontSize: 12, fontWeight: '900', color: colors.bg, letterSpacing: 2,
  },

  // Capture toast
  captureToast: {
    position: 'absolute', left: 20, right: 100,
    backgroundColor: colors.warning, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center',
  },
  captureToastText: {
    fontSize: 13, fontWeight: '800', color: colors.bg, letterSpacing: 1,
  },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    paddingHorizontal: 20, paddingVertical: 16, borderRadius: 50,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 4, minWidth: 90, minHeight: 48,
  },
  fabText: { fontSize: 14, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },

  // Waiting bar
  waitingBarContainer: {
    height: 4, backgroundColor: colors.surfaceBorder, borderRadius: 2,
    marginTop: 10, overflow: 'hidden',
  },
  waitingBarFillMuted: {
    height: '100%', backgroundColor: colors.textMuted, borderRadius: 2,
  },
  waitingBarFillActive: {
    height: '100%', backgroundColor: colors.accent, borderRadius: 2,
  },
});
