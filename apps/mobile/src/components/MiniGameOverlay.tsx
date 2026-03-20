import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { showToast } from './Toast';
import { DrawingCanvas } from './DrawingCanvas';
import { colors } from '@/theme/colors';

interface MiniGameState {
  active: boolean;
  game?: {
    id: string;
    game_type: string;
    prompt: string;
    status: string;
    points: number;
    phase_ends_at: string | null;
    winner_nickname: string | null;
  };
  submissions?: Array<{ id: string; content: string; room_player_id?: string }>;
  submission_nicknames?: Record<string, string>;
  votes?: Array<{ room_player_id: string; voted_for_submission_id: string }>;
  my_submission?: string | null;
  my_vote?: string | null;
}

interface Props {
  roomId: string;
  visible: boolean;
  onDismiss: () => void;
}

const GAME_TYPE_LABELS: Record<string, string> = {
  drawing: 'DRAW IT',
  caption: 'CAPTION THIS',
  hot_take: 'HOT TAKE',
  lie_detector: 'LIE DETECTOR',
};

export function MiniGameOverlay({ roomId, visible, onDismiss }: Props) {
  const [state, setState] = useState<MiniGameState | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const insets = useSafeAreaInsets();

  // Poll mini-game state
  const fetchState = useCallback(async () => {
    try {
      const s = await api.getMiniGameState(roomId) as unknown as MiniGameState;
      setState(s);
      if (!s.active) onDismiss();
    } catch { /* ignore */ }
  }, [roomId, onDismiss]);

  useEffect(() => {
    if (!visible) return;
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [visible, fetchState]);

  // Countdown timer
  useEffect(() => {
    if (!state?.game?.phase_ends_at) return;
    const tick = () => {
      const diff = new Date(state.game!.phase_ends_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('0');
        return;
      }
      setTimeLeft(String(Math.ceil(diff / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state?.game?.phase_ends_at]);

  if (!visible || !state?.active || !state.game) return null;

  const { game, submissions, my_submission, my_vote, submission_nicknames, votes } = state;

  const handleSubmitCaption = async () => {
    if (!captionInput.trim() || !game) return;
    setSubmitting(true);
    try {
      await api.submitMiniGame(game.id, captionInput.trim());
      setCaptionInput('');
      fetchState();
    } catch { showToast('Submit failed.'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitDrawing = async (drawing: string) => {
    if (!game) return;
    setSubmitting(true);
    try {
      await api.submitMiniGame(game.id, drawing);
      fetchState();
    } catch { showToast('Submit failed.'); }
    finally { setSubmitting(false); }
  };

  const handleHotTakeVote = async (opinion: 'agree' | 'disagree') => {
    if (!game || submitting) return;
    setSubmitting(true);
    try {
      await api.submitMiniGame(game.id, opinion);
      fetchState();
    } catch { showToast('Vote failed.'); }
    finally { setSubmitting(false); }
  };

  const handleVoteSubmission = async (submissionId: string) => {
    if (!game) return;
    try {
      await api.voteMiniGame(game.id, submissionId);
      fetchState();
    } catch { showToast('Vote failed.'); }
  };

  const handleLieDetectorVote = async (verdict: 'truth' | 'bluff') => {
    if (!game || submitting) return;
    setSubmitting(true);
    try {
      await api.submitMiniGame(game.id, verdict);
      fetchState();
    } catch { showToast('Submit failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={styles.overlay}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.gameType}>
          {GAME_TYPE_LABELS[game.game_type] ?? game.game_type.toUpperCase()}
        </Text>
        <Text style={styles.points}>{game.points} pts</Text>
      </View>

      <Text style={styles.prompt}>{game.prompt}</Text>

      {timeLeft && game.status !== 'RESULTS' && (
        <Text style={styles.timer}>{timeLeft}s</Text>
      )}

      {/* SUBMITTING phase */}
      {game.status === 'SUBMITTING' && !my_submission && (
        <View style={styles.submitArea}>
          {game.game_type === 'drawing' && (
            <DrawingCanvas onSubmit={handleSubmitDrawing} disabled={submitting} />
          )}

          {game.game_type === 'caption' && (
            <View style={styles.captionArea}>
              <TextInput
                style={styles.captionInput}
                placeholder="Type your caption..."
                placeholderTextColor={colors.textMuted}
                value={captionInput}
                onChangeText={setCaptionInput}
                maxLength={150}
                multiline
              />
              <TouchableOpacity
                style={[styles.submitButton, (!captionInput.trim() || submitting) && styles.buttonDisabled]}
                onPress={handleSubmitCaption}
                disabled={!captionInput.trim() || submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>{submitting ? 'SENDING...' : 'SUBMIT'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {game.game_type === 'hot_take' && (
            <View style={styles.hotTakeButtons}>
              <TouchableOpacity
                style={[styles.agreeButton, submitting && styles.buttonDisabled]}
                onPress={() => handleHotTakeVote('agree')}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.agreeText}>AGREE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.disagreeButton, submitting && styles.buttonDisabled]}
                onPress={() => handleHotTakeVote('disagree')}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.disagreeText}>DISAGREE</Text>
              </TouchableOpacity>
            </View>
          )}

          {game.game_type === 'lie_detector' && (
            <View style={styles.captionArea}>
              <TextInput
                style={styles.captionInput}
                placeholder="Tell your story... (truth or lie, you decide)"
                placeholderTextColor={colors.textMuted}
                value={captionInput}
                onChangeText={setCaptionInput}
                maxLength={300}
                multiline
              />
              <TouchableOpacity
                style={[styles.submitButton, (!captionInput.trim() || submitting) && styles.buttonDisabled]}
                onPress={handleSubmitCaption}
                disabled={!captionInput.trim() || submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>SUBMIT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Already submitted, waiting */}
      {game.status === 'SUBMITTING' && my_submission && (
        <View style={styles.waitingArea}>
          <Text style={styles.waitingText}>Submitted! Waiting for others...</Text>
        </View>
      )}

      {/* VOTING phase */}
      {game.status === 'VOTING' && (
        <FlatList
          data={submissions ?? []}
          keyExtractor={(item) => item.id}
          style={styles.voteList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.voteCard,
                my_vote === item.id && styles.voteCardSelected,
              ]}
              onPress={() => handleVoteSubmission(item.id)}
              disabled={!!my_vote}
              activeOpacity={0.8}
            >
              <Text style={styles.voteContent}>{item.content}</Text>
              {my_vote === item.id && <Text style={styles.votedBadge}>YOUR VOTE</Text>}
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <Text style={styles.voteHeader}>
              {my_vote ? 'Vote cast! Waiting for others...' : 'Vote for your favorite:'}
            </Text>
          }
        />
      )}

      {/* RESULTS phase */}
      {game.status === 'RESULTS' && (
        <View style={styles.resultsArea}>
          {game.winner_nickname && (
            <View style={styles.winnerCard}>
              <Text style={styles.winnerLabel}>WINNER</Text>
              <Text style={styles.winnerName}>{game.winner_nickname}</Text>
              <Text style={styles.winnerPoints}>+{game.points} pts</Text>
            </View>
          )}

          {game.game_type === 'hot_take' && (
            <View style={styles.hotTakeResults}>
              <Text style={styles.hotTakeLabel}>Minority wins!</Text>
              {(submissions ?? []).map((s, i) => (
                <Text key={i} style={styles.hotTakeResult}>
                  {submission_nicknames?.[s.room_player_id ?? ''] ?? '???'}: {s.content?.toUpperCase()}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.dismissText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.97)',
    padding: 24,
    paddingTop: 60,
    zIndex: 90,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  gameType: {
    fontSize: 14, fontWeight: '900', color: colors.accent, letterSpacing: 3,
  },
  points: { fontSize: 16, fontWeight: '800', color: colors.highlight },
  prompt: {
    fontSize: 22, fontWeight: '700', color: colors.text, lineHeight: 30,
    marginBottom: 16,
  },
  timer: { fontSize: 18, fontWeight: '700', color: colors.warning, marginBottom: 12 },

  // Submit area
  submitArea: { flex: 1 },
  captionArea: { flex: 1, gap: 12 },
  captionInput: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    color: colors.text, fontSize: 18, borderWidth: 1, borderColor: colors.surfaceBorder,
    minHeight: 100, textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', minHeight: 52,
  },
  submitButtonText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  buttonDisabled: { opacity: 0.5 },

  // Hot takes
  hotTakeButtons: { flexDirection: 'row', gap: 16, marginTop: 24 },
  agreeButton: {
    flex: 1, backgroundColor: '#064e3b', paddingVertical: 24, borderRadius: 50,
    alignItems: 'center', borderWidth: 2, borderColor: colors.success, minHeight: 60,
  },
  agreeText: { fontSize: 18, fontWeight: '900', color: colors.success, letterSpacing: 2 },
  disagreeButton: {
    flex: 1, backgroundColor: '#7f1d1d', paddingVertical: 24, borderRadius: 50,
    alignItems: 'center', borderWidth: 2, borderColor: colors.error, minHeight: 60,
  },
  disagreeText: { fontSize: 18, fontWeight: '900', color: colors.error, letterSpacing: 2 },

  // Waiting
  waitingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingText: { fontSize: 18, color: colors.textSecondary, fontStyle: 'italic' },

  // Voting
  voteList: { flex: 1, marginTop: 8 },
  voteHeader: { fontSize: 15, color: colors.textSecondary, marginBottom: 12 },
  voteCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: colors.surfaceBorder,
  },
  voteCardSelected: { borderColor: colors.accent },
  voteContent: { fontSize: 16, color: colors.text, lineHeight: 22 },
  votedBadge: { fontSize: 11, fontWeight: '900', color: colors.accent, marginTop: 8, letterSpacing: 1 },

  // Results
  resultsArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  winnerCard: {
    backgroundColor: colors.accentBg, borderRadius: 16, padding: 32,
    borderWidth: 2, borderColor: colors.accent, alignItems: 'center', marginBottom: 24,
    width: '100%',
  },
  winnerLabel: { fontSize: 12, fontWeight: '900', color: colors.accent, letterSpacing: 3, marginBottom: 8 },
  winnerName: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 4 },
  winnerPoints: { fontSize: 20, fontWeight: '800', color: colors.highlight },
  hotTakeResults: { marginBottom: 24, width: '100%' },
  hotTakeLabel: { fontSize: 16, fontWeight: '700', color: colors.highlight, marginBottom: 12, textAlign: 'center' },
  hotTakeResult: { fontSize: 15, color: colors.textSecondary, marginBottom: 4 },
  dismissButton: {
    backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 50, minHeight: 52,
  },
  dismissText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
