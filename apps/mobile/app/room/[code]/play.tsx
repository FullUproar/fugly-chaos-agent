import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, FlatList, ScrollView,
  ActivityIndicator, Animated, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import type { Mission, ClaimWithContext, VoteType, SignalType } from '@chaos-agent/shared';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { usePolling } from '@/hooks/use-polling';
import { FlashMissionOverlay } from '@/components/FlashMissionOverlay';
import { PollOverlay } from '@/components/PollOverlay';
import { SignalPanel } from '@/components/SignalPanel';
import { VerdictOverlay } from '@/components/VerdictOverlay';
import { ClaimAlert } from '@/components/ClaimAlert';
import { colors } from '@/theme/colors';

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
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const {
    roomId, isHost, room, standingMissions, activeFlash, activePoll, myPollVote,
    activeClaims, allClaims, scores, roomPlayerId, players,
    flashDismissed, pollDismissed, dismissFlash, dismissPoll,
  } = useSessionStore();
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
    // Track which claims were active last poll
    const prevActive = prevClaimIdsRef.current;
    const currentActiveIds = new Set(activeClaims.map((c) => c.claim.id));

    // Find claims that were active but are now resolved
    for (const claim of allClaims) {
      const wasActive = prevActive.has(claim.claim.id);
      const isResolved = claim.claim.status === 'VOTE_PASSED' || claim.claim.status === 'VOTE_FAILED';

      if (wasActive && isResolved && !verdict) {
        // Build vote reveal data with nicknames
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

  const showFlash = activeFlash && !flashDismissed && activeFlash.status === 'REVEALED';
  const showPoll = activePoll && !pollDismissed;
  const bottomPad = insets.bottom + 80;

  return (
    <View style={styles.container}>
      {/* Header with end game for host */}
      {isHost && (
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => setShowEndConfirm(true)} activeOpacity={0.7}>
            <Text style={styles.endGameLink}>End Game</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* End game confirmation */}
      {showEndConfirm && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>End the game for everyone?</Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.confirmYes} onPress={handleEndGame} activeOpacity={0.8}>
              <Text style={styles.confirmYesText}>END IT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmNo} onPress={() => setShowEndConfirm(false)} activeOpacity={0.8}>
              <Text style={styles.confirmNoText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['missions', 'activity', 'leaderboard'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
            {tab === 'activity' && activeClaims.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeClaims.length}</Text>
              </View>
            )}
          </Pressable>
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
        <ActivityTab claims={allClaims} activeClaims={activeClaims} myRoomPlayerId={roomPlayerId} bottomPad={bottomPad} localVotes={localVotes} onVoted={trackLocalVote} />
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

      {/* Signal FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={() => setSignalOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>SIGNAL</Text>
      </TouchableOpacity>

      {showFlash && (
        <FlashMissionOverlay mission={activeFlash} onClaim={handleClaimFlash} onDismiss={dismissFlash} />
      )}
      {showPoll && (
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
      {claimAlert && !verdict && (
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

  // Build a map of mission_id → active claim (if locked)
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
          <Pressable
            key={item.id}
            style={[styles.compactMission, isLocked && styles.compactMissionLocked]}
            onPress={() => setExpanded(isExpanded ? null : item.id)}
          >
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle} numberOfLines={isExpanded ? undefined : 1}>
                {item.title}
              </Text>
              {!isLocked && <Text style={styles.compactPoints}>{item.points}</Text>}
              {isLocked && <Text style={styles.lockedBadge}>CLAIMED</Text>}
            </View>

            {/* Locked state: show who claimed + inline voting */}
            {isLocked && (
              <View style={styles.expandedContent}>
                <Text style={styles.compactDesc}>{item.description}</Text>
                <Text style={styles.lockedBy}>
                  {isMyClaim ? 'You claimed this — waiting for votes' : `${lockClaim.claimant_nickname} claims this`}
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
                      activeOpacity={0.8}
                    >
                      <Text style={styles.acceptButtonText}>{isVotingThis ? 'VOTING...' : 'ACCEPT'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bsButton, isVotingThis && styles.buttonDisabled]}
                      onPress={() => handleVote(lockClaim.claim.id, 'BULLSHIT')}
                      disabled={isVotingThis}
                      activeOpacity={0.8}
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

            {/* Normal state: expandable with claim button */}
            {!isLocked && isExpanded && (
              <View style={styles.expandedContent}>
                <Text style={styles.compactDesc}>{item.description}</Text>
                <TouchableOpacity
                  style={[styles.compactClaimButton, (hasPendingClaim || claiming === item.id) && styles.buttonDisabled]}
                  onPress={() => handleClaim(item)}
                  disabled={hasPendingClaim || claiming === item.id}
                  activeOpacity={0.8}
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
          </Pressable>
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
  claims, activeClaims, myRoomPlayerId, bottomPad, localVotes, onVoted,
}: {
  claims: ClaimWithContext[];
  activeClaims: ClaimWithContext[];
  myRoomPlayerId: string | null;
  bottomPad: number;
  localVotes: Record<string, VoteType>;
  onVoted: (claimId: string, vote: VoteType) => void;
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
        const passed = item.claim.status === 'VOTE_PASSED' || item.claim.status === 'ACCEPTED';
        const failed = item.claim.status === 'VOTE_FAILED';
        const isExpanded = expandedClaim === item.claim.id;
        const isVoting = voting === item.claim.id;

        return (
          <Pressable
            style={[styles.claimCard, !isActive && styles.claimCardResolved]}
            onPress={() => setExpandedClaim(isExpanded ? null : item.claim.id)}
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
              return (
                <>
                  {isActive && !isMine && !myVote && (
                    <View style={styles.voteButtons}>
                      <TouchableOpacity
                        style={[styles.acceptButton, isVoting && styles.buttonDisabled]}
                        onPress={() => handleVote(item.claim.id, 'ACCEPT')}
                        disabled={isVoting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.acceptButtonText}>{isVoting ? 'VOTING...' : 'ACCEPT'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.bsButton, isVoting && styles.buttonDisabled]}
                        onPress={() => handleVote(item.claim.id, 'BULLSHIT')}
                        disabled={isVoting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.bsButtonText}>{isVoting ? '...' : 'BULLSHIT'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isActive && myVote && !isMine && (
                    <View>
                      <Text style={styles.votedText}>You voted: {myVote}</Text>
                      <WaitingBar claimedAt={item.claim.claimed_at} durationSeconds={180} />
                    </View>
                  )}

                  {isActive && isMine && (
                    <View>
                      <Text style={styles.votedText}>Your claim — waiting for votes</Text>
                      <WaitingBar claimedAt={item.claim.claimed_at} durationSeconds={180} />
                    </View>
                  )}
                </>
              );
            })()}
          </Pressable>
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

// --- Waiting Bar (grey decay bar for claims you've acted on) ---
function WaitingBar({ claimedAt, durationSeconds }: { claimedAt: string; durationSeconds: number }) {
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
      <View style={[styles.waitingBarFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  headerBar: {
    flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8,
  },
  endGameLink: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  // End game confirmation
  confirmBar: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  confirmText: { fontSize: 15, color: colors.text, fontWeight: '600', flex: 1 },
  confirmButtons: { flexDirection: 'row', gap: 8 },
  confirmYes: {
    backgroundColor: colors.error, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50,
  },
  confirmYesText: { fontSize: 13, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  confirmNo: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  confirmNoText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
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
    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.surfaceBorder,
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
    backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 50, alignItems: 'center',
  },
  compactClaimText: { fontSize: 15, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },

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
    alignItems: 'center', borderWidth: 1, borderColor: colors.success,
  },
  acceptButtonText: { fontSize: 15, fontWeight: '700', color: colors.success, letterSpacing: 1 },
  bsButton: {
    flex: 1, backgroundColor: colors.accentBg, paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 1, borderColor: colors.accent,
  },
  bsButtonText: { fontSize: 15, fontWeight: '700', color: colors.accent, letterSpacing: 1 },
  buttonDisabled: { opacity: 0.5 },
  votedText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  statusVerified: { fontSize: 14, fontWeight: '700', color: colors.success, letterSpacing: 1 },
  statusFailed: { fontSize: 14, fontWeight: '700', color: colors.error, letterSpacing: 1 },

  // Leaderboard
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 8,
  },
  scoreRowFirst: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accent },
  scoreRank: { fontSize: 20, fontWeight: '800', color: colors.textMuted, width: 32 },
  scoreRankFirst: { color: colors.accent },
  scoreNickname: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
  scoreNicknameFirst: { color: colors.accent },
  scoreValue: { fontSize: 22, fontWeight: '800', color: colors.textSecondary },
  scoreValueFirst: { color: colors.accent },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 50,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  fabText: { fontSize: 13, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },

  // Waiting bar
  waitingBarContainer: {
    height: 4, backgroundColor: colors.surfaceBorder, borderRadius: 2,
    marginTop: 10, overflow: 'hidden',
  },
  waitingBarFill: {
    height: '100%', backgroundColor: colors.textMuted, borderRadius: 2,
  },
});
