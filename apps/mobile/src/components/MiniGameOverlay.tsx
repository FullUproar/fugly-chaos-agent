import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { showToast } from './Toast';
import { DrawingCanvas } from './DrawingCanvas';
import { colors } from '@/theme/colors';
import type { MiniGameVariationId } from '@fugly-chaos/shared';

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
    variation: MiniGameVariationId;
    variation_data: Record<string, any>;
  };
  submissions?: Array<{ id: string; content: string; room_player_id?: string }>;
  submission_nicknames?: Record<string, string>;
  votes?: Array<{ room_player_id: string; voted_for_submission_id: string }>;
  my_submission?: string | null;
  my_vote?: string | null;
}

interface Props {
  roomId: string;
  roomPlayerId?: string;
  visible: boolean;
  onDismiss: () => void;
}

const GAME_TYPE_LABELS: Record<string, string> = {
  drawing: 'DRAW IT',
  caption: 'CAPTION THIS',
  hot_take: 'HOT TAKE',
  lie_detector: 'LIE DETECTOR',
  worst_advice: 'WORST ADVICE',
  speed_superlative: 'SPEED SUPERLATIVE',
  emoji_story: 'EMOJI STORY',
  two_word_story: 'TWO WORD STORY',
  bluff_stats: 'BLUFF STATS',
  assumption_arena: 'ASSUMPTION ARENA',
};

const VARIATION_LABELS: Partial<Record<MiniGameVariationId, string>> = {
  worst_wins: 'WORST WINS!',
  the_editor: 'THE EDITOR!',
  blind_swap: 'BLIND SWAP!',
  mashup: 'MASHUP!',
  double_down: 'DOUBLE DOWN!',
  the_reveal: 'THE REVEAL!',
  confidence_bet: 'CONFIDENCE BET!',
  interrogation: 'INTERROGATION!',
  artists_choice: "ARTIST'S CHOICE!",
  crowd_favorite: 'CROWD FAVORITE!',
  sabotage: 'SABOTAGE!',
};

export function MiniGameOverlay({ roomId, roomPlayerId, visible, onDismiss }: Props) {
  const [state, setState] = useState<MiniGameState | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [showVariationReveal, setShowVariationReveal] = useState(false);
  const [variationRevealed, setVariationRevealed] = useState(false);
  const [confidenceBet, setConfidenceBet] = useState(3);
  const [crowdRating, setCrowdRating] = useState(0);
  const [interrogationQ1, setInterrogationQ1] = useState('');
  const [interrogationQ2, setInterrogationQ2] = useState('');
  const [interrogationPhase, setInterrogationPhase] = useState(false);
  const [doubleSwitchPhase, setDoubleSwitchPhase] = useState(false);
  const [revealDefense, setRevealDefense] = useState('');
  const [sabotageAnimating, setSabotageAnimating] = useState(false);
  const [mashupVote, setMashupVote] = useState<'mashup' | 'original' | null>(null);
  const [wordInput1, setWordInput1] = useState('');
  const [wordInput2, setWordInput2] = useState('');
  const [bluffVote, setBluffVote] = useState<'TRUE' | 'FALSE' | null>(null);
  const variationRevealAnim = useRef(new Animated.Value(0)).current;
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

  // Variation reveal animation on first load
  useEffect(() => {
    if (!state?.game?.variation || state.game.variation === 'standard' || variationRevealed) return;
    setShowVariationReveal(true);
    Animated.sequence([
      Animated.timing(variationRevealAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(variationRevealAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setShowVariationReveal(false);
      setVariationRevealed(true);
    });
  }, [state?.game?.variation]);

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
  const variation = game.variation ?? 'standard';
  const variationData = game.variation_data ?? {};
  const isEditor = variation === 'the_editor' && variationData.editor_player_id === roomPlayerId;
  const isEditorVariation = variation === 'the_editor';

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
      // For confidence_bet, include the wager
      if (variation === 'confidence_bet') {
        await api.voteMiniGame(game.id, submissionId, { confidence: confidenceBet });
      } else if (variation === 'crowd_favorite') {
        await api.voteMiniGame(game.id, submissionId, { rating: crowdRating });
      } else {
        await api.voteMiniGame(game.id, submissionId);
      }
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

  const handleSubmitTwoWords = async () => {
    if (!wordInput1.trim() || !wordInput2.trim() || !game) return;
    setSubmitting(true);
    try {
      await api.submitMiniGame(game.id, JSON.stringify({ word1: wordInput1.trim(), word2: wordInput2.trim() }));
      setWordInput1('');
      setWordInput2('');
      fetchState();
    } catch { showToast('Submit failed.'); }
    finally { setSubmitting(false); }
  };

  const handleBluffVote = async (answer: 'TRUE' | 'FALSE') => {
    if (!game || bluffVote) return;
    setBluffVote(answer);
    try {
      await api.voteMiniGame(game.id, answer);
      fetchState();
    } catch { showToast('Vote failed.'); }
  };

  const handleSuperlativeVote = async (playerId: string) => {
    if (!game) return;
    try {
      await api.voteMiniGame(game.id, playerId);
      fetchState();
    } catch { showToast('Vote failed.'); }
  };

  // Get vote prompt based on variation
  const getVotePrompt = (): string => {
    if (my_vote) return 'Vote cast! Waiting for others...';
    switch (variation) {
      case 'worst_wins': return 'Vote for the WORST:';
      case 'artists_choice': return "Pick your favorite (not yours):";
      case 'crowd_favorite': return 'Rate each submission (1-5):';
      default: return 'Vote for your favorite:';
    }
  };

  // Filter submissions for artists_choice (hide your own)
  const getVotableSubmissions = () => {
    const subs = submissions ?? [];
    if (variation === 'artists_choice') {
      return subs.filter(s => s.room_player_id !== roomPlayerId);
    }
    return subs;
  };

  // Check if this player can vote (the_editor restricts to editor only)
  const canVote = !isEditorVariation || isEditor;

  return (
    <View style={styles.overlay}>
      {/* Variation reveal overlay */}
      {showVariationReveal && (
        <Animated.View style={[styles.variationRevealOverlay, { opacity: variationRevealAnim }]}>
          <Text style={styles.variationRevealLabel}>AND THE TWIST IS...</Text>
          <Text style={styles.variationRevealName}>
            {VARIATION_LABELS[variation] ?? ''}
          </Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.gameType}>
            {GAME_TYPE_LABELS[game.game_type] ?? game.game_type.toUpperCase()}
          </Text>
          {variation !== 'standard' && (
            <Text style={styles.variationBadge}>
              {VARIATION_LABELS[variation] ?? variation.toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.points}>{game.points} pts</Text>
      </View>

      <Text style={styles.prompt}>{game.prompt}</Text>

      {/* Editor callout */}
      {isEditorVariation && variationData.editor_nickname && (
        <View style={styles.editorBanner}>
          <Text style={styles.editorBannerText}>
            THE EDITOR: {variationData.editor_nickname} will judge
          </Text>
        </View>
      )}

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
                activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <Text style={styles.agreeText}>AGREE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.disagreeButton, submitting && styles.buttonDisabled]}
                onPress={() => handleHotTakeVote('disagree')}
                disabled={submitting}
                activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>SUBMIT</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* WORST ADVICE: text input like caption */}
          {game.game_type === 'worst_advice' && (
            <View style={styles.captionArea}>
              <Text style={styles.scenarioHeader}>SCENARIO:</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Give your worst advice..."
                placeholderTextColor={colors.textMuted}
                value={captionInput}
                onChangeText={setCaptionInput}
                maxLength={200}
                multiline
              />
              <TouchableOpacity
                style={[styles.submitButton, (!captionInput.trim() || submitting) && styles.buttonDisabled]}
                onPress={handleSubmitCaption}
                disabled={!captionInput.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>{submitting ? 'SENDING...' : 'SUBMIT'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* EMOJI STORY: emoji sequence + text input */}
          {game.game_type === 'emoji_story' && (
            <View style={styles.captionArea}>
              <View style={styles.emojiSequenceRow}>
                {(variationData.emoji_sequence ?? game.prompt.split(' ')).map((emoji: string, i: number) => (
                  <Text key={i} style={styles.emojiChar}>{emoji}</Text>
                ))}
              </View>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a story using these emojis..."
                placeholderTextColor={colors.textMuted}
                value={captionInput}
                onChangeText={setCaptionInput}
                maxLength={250}
                multiline
              />
              <TouchableOpacity
                style={[styles.submitButton, (!captionInput.trim() || submitting) && styles.buttonDisabled]}
                onPress={handleSubmitCaption}
                disabled={!captionInput.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>{submitting ? 'SENDING...' : 'SUBMIT'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TWO WORD STORY: template + two inputs */}
          {game.game_type === 'two_word_story' && (
            <View style={styles.captionArea}>
              <Text style={styles.templateText}>{game.prompt}</Text>
              <TextInput
                style={styles.wordInput}
                placeholder="Word / phrase 1..."
                placeholderTextColor={colors.textMuted}
                value={wordInput1}
                onChangeText={setWordInput1}
                maxLength={40}
              />
              <TextInput
                style={styles.wordInput}
                placeholder="Word / phrase 2..."
                placeholderTextColor={colors.textMuted}
                value={wordInput2}
                onChangeText={setWordInput2}
                maxLength={40}
              />
              <TouchableOpacity
                style={[styles.submitButton, (!wordInput1.trim() || !wordInput2.trim() || submitting) && styles.buttonDisabled]}
                onPress={handleSubmitTwoWords}
                disabled={!wordInput1.trim() || !wordInput2.trim() || submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>{submitting ? 'SENDING...' : 'SUBMIT'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ASSUMPTION ARENA: fill-in-the-blank text input */}
          {game.game_type === 'assumption_arena' && (
            <View style={styles.captionArea}>
              <TextInput
                style={styles.captionInput}
                placeholder="Complete the statement..."
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
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>{submitting ? 'SENDING...' : 'SUBMIT'}</Text>
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

      {/* SABOTAGE animation before voting */}
      {game.status === 'VOTING' && variation === 'sabotage' && sabotageAnimating && (
        <View style={styles.sabotageOverlay}>
          <Text style={styles.sabotageText}>SABOTAGE IN PROGRESS...</Text>
          <Text style={styles.sabotageSubtext}>Something doesn't feel right...</Text>
        </View>
      )}

      {/* INTERROGATION phase before voting */}
      {game.status === 'VOTING' && variation === 'interrogation' && interrogationPhase && (
        <View style={styles.interrogationArea}>
          <Text style={styles.interrogationTitle}>INTERROGATION</Text>
          <Text style={styles.interrogationSubtitle}>2 yes/no questions before voting</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Question 1 (yes/no)..."
            placeholderTextColor={colors.textMuted}
            value={interrogationQ1}
            onChangeText={setInterrogationQ1}
            maxLength={100}
          />
          <TextInput
            style={[styles.captionInput, { marginTop: 8 }]}
            placeholder="Question 2 (yes/no)..."
            placeholderTextColor={colors.textMuted}
            value={interrogationQ2}
            onChangeText={setInterrogationQ2}
            maxLength={100}
          />
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 12 }]}
            onPress={() => setInterrogationPhase(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>PROCEED TO VOTE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MASHUP phase - show combined captions */}
      {game.status === 'VOTING' && variation === 'mashup' && variationData.mashup_text && (
        <View style={styles.mashupArea}>
          <Text style={styles.mashupTitle}>THE MASHUP</Text>
          <Text style={styles.mashupContent}>{variationData.mashup_text}</Text>
          {!mashupVote && (
            <View style={styles.hotTakeButtons}>
              <TouchableOpacity
                style={styles.agreeButton}
                onPress={() => setMashupVote('mashup')}
                activeOpacity={0.7}
              >
                <Text style={styles.agreeText}>MASHUP WINS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disagreeButton}
                onPress={() => setMashupVote('original')}
                activeOpacity={0.7}
              >
                <Text style={styles.disagreeText}>ORIGINALS BETTER</Text>
              </TouchableOpacity>
            </View>
          )}
          {mashupVote && (
            <Text style={styles.waitingText}>
              You voted: {mashupVote === 'mashup' ? 'MASHUP' : 'ORIGINALS'}
            </Text>
          )}
        </View>
      )}

      {/* BLUFF STATS voting: TRUE / FALSE buttons */}
      {game.status === 'VOTING' && game.game_type === 'bluff_stats' && (
        <View style={styles.bluffStatsArea}>
          <Text style={styles.bluffStatText}>{game.prompt}</Text>
          {!bluffVote ? (
            <View style={styles.hotTakeButtons}>
              <TouchableOpacity
                style={styles.agreeButton}
                onPress={() => handleBluffVote('TRUE')}
                activeOpacity={0.7}
              >
                <Text style={styles.agreeText}>TRUE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disagreeButton}
                onPress={() => handleBluffVote('FALSE')}
                activeOpacity={0.7}
              >
                <Text style={styles.disagreeText}>FALSE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.waitingArea}>
              <Text style={styles.bluffVotedText}>You voted: {bluffVote}</Text>
              <Text style={styles.waitingText}>Waiting for others...</Text>
            </View>
          )}
        </View>
      )}

      {/* SPEED SUPERLATIVE voting: player name buttons */}
      {game.status === 'VOTING' && game.game_type === 'speed_superlative' && (
        <View style={styles.superlativeArea}>
          <Text style={styles.superlativePrompt}>{game.prompt}</Text>
          {!my_vote ? (
            <FlatList
              data={variationData.player_options ?? []}
              keyExtractor={(item: any) => item.id}
              style={styles.voteList}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={styles.playerVoteCard}
                  onPress={() => handleSuperlativeVote(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.playerVoteName}>{item.nickname}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <Text style={styles.voteHeader}>Who fits this best?</Text>
              }
            />
          ) : (
            <View style={styles.waitingArea}>
              <Text style={styles.waitingText}>Vote cast! Waiting for others...</Text>
            </View>
          )}
        </View>
      )}

      {/* VOTING phase (standard submission-based voting) */}
      {game.status === 'VOTING' && game.game_type !== 'bluff_stats' && game.game_type !== 'speed_superlative' && !sabotageAnimating && !interrogationPhase && (
        <>
          {/* Editor-only restriction message */}
          {isEditorVariation && !isEditor && (
            <View style={styles.waitingArea}>
              <Text style={styles.waitingText}>
                THE EDITOR ({variationData.editor_nickname}) is judging...
              </Text>
            </View>
          )}

          {canVote && (
            <>
              {/* Crowd Favorite: star rating instead of pick-one */}
              {variation === 'crowd_favorite' ? (
                <FlatList
                  data={getVotableSubmissions()}
                  keyExtractor={(item) => item.id}
                  style={styles.voteList}
                  renderItem={({ item }) => (
                    <View style={styles.voteCard}>
                      <Text style={styles.voteContent}>{item.content}</Text>
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => {
                              setCrowdRating(star);
                              handleVoteSubmission(item.id);
                            }}
                            disabled={!!my_vote}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.ratingStar,
                              star <= crowdRating && my_vote === item.id && styles.ratingStarActive,
                            ]}>
                              {star <= crowdRating && my_vote === item.id ? '\u2605' : '\u2606'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  ListHeaderComponent={
                    <Text style={styles.voteHeader}>{getVotePrompt()}</Text>
                  }
                />
              ) : (
                <FlatList
                  data={getVotableSubmissions()}
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
                      activeOpacity={0.7}
                    >
                      <Text style={styles.voteContent}>{item.content}</Text>
                      {/* Hide author for blind_swap */}
                      {variation !== 'blind_swap' && item.room_player_id && submission_nicknames?.[item.room_player_id] && game.status === 'VOTING' && (
                        <Text style={styles.authorName}>
                          — {submission_nicknames[item.room_player_id]}
                        </Text>
                      )}
                      {my_vote === item.id && <Text style={styles.votedBadge}>YOUR VOTE</Text>}
                    </TouchableOpacity>
                  )}
                  ListHeaderComponent={
                    <Text style={styles.voteHeader}>{getVotePrompt()}</Text>
                  }
                />
              )}

              {/* Confidence bet slider */}
              {variation === 'confidence_bet' && !my_vote && (
                <View style={styles.confidenceArea}>
                  <Text style={styles.confidenceLabel}>
                    CONFIDENCE WAGER: {confidenceBet} pts
                  </Text>
                  <View style={styles.confidenceRow}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.confidenceChip,
                          confidenceBet === val && styles.confidenceChipActive,
                        ]}
                        onPress={() => setConfidenceBet(val)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.confidenceChipText,
                          confidenceBet === val && styles.confidenceChipTextActive,
                        ]}>
                          {val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* DOUBLE DOWN: switch sides phase */}
      {game.status === 'VOTING' && variation === 'double_down' && doubleSwitchPhase && (
        <View style={styles.doubleDownArea}>
          <Text style={styles.doubleDownTitle}>SWITCH SIDES?</Text>
          <Text style={styles.doubleDownSubtitle}>
            Final minority gets 2x points. 10 seconds to decide.
          </Text>
          <View style={styles.hotTakeButtons}>
            <TouchableOpacity
              style={styles.agreeButton}
              onPress={() => { setDoubleSwitchPhase(false); handleHotTakeVote('agree'); }}
              activeOpacity={0.7}
            >
              <Text style={styles.agreeText}>SWITCH TO AGREE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.disagreeButton}
              onPress={() => { setDoubleSwitchPhase(false); handleHotTakeVote('disagree'); }}
              activeOpacity={0.7}
            >
              <Text style={styles.disagreeText}>SWITCH TO DISAGREE</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.dismissButton, { marginTop: 12 }]}
            onPress={() => setDoubleSwitchPhase(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>STAY PUT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* THE REVEAL: defense input */}
      {game.status === 'VOTING' && variation === 'the_reveal' && variationData.reveal_target_id === roomPlayerId && (
        <View style={styles.revealArea}>
          <Text style={styles.revealTitle}>EXPLAIN YOURSELF</Text>
          <Text style={styles.revealSubtitle}>You have 15 seconds to defend your position.</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Your defense..."
            placeholderTextColor={colors.textMuted}
            value={revealDefense}
            onChangeText={setRevealDefense}
            maxLength={200}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitButton, { marginTop: 12 }]}
            onPress={() => {
              if (revealDefense.trim()) {
                api.submitMiniGame(game.id, `DEFENSE: ${revealDefense.trim()}`).catch(() => {});
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>SUBMIT DEFENSE</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RESULTS phase */}
      {game.status === 'RESULTS' && (
        <View style={styles.resultsArea}>
          {/* Bluff stats result reveal */}
          {game.game_type === 'bluff_stats' && (
            <View style={styles.bluffResultCard}>
              <Text style={styles.bluffResultLabel}>THE ANSWER IS...</Text>
              <Text style={[
                styles.bluffResultAnswer,
                { color: variationData.correct_answer ? colors.success : colors.error },
              ]}>
                {variationData.correct_answer ? 'TRUE' : 'FALSE'}
              </Text>
              <Text style={styles.bluffStatText}>{game.prompt}</Text>
              <Text style={styles.bluffResultScore}>
                {variationData.correct_voters?.length ?? 0} / {variationData.total_voters ?? 0} got it right (+{game.points} pts each)
              </Text>
            </View>
          )}

          {game.winner_nickname && game.game_type !== 'bluff_stats' && (
            <View style={styles.winnerCard}>
              <Text style={styles.winnerLabel}>WINNER</Text>
              <Text style={styles.winnerName}>{game.winner_nickname}</Text>
              <Text style={styles.winnerPoints}>+{game.points} pts</Text>
            </View>
          )}

          {game.game_type === 'hot_take' && (
            <View style={styles.hotTakeResults}>
              <Text style={styles.hotTakeLabel}>
                {variation === 'double_down' ? 'Minority gets DOUBLE!' : 'Minority wins!'}
              </Text>
              {(submissions ?? []).map((s, i) => (
                <Text key={i} style={styles.hotTakeResult}>
                  {submission_nicknames?.[s.room_player_id ?? ''] ?? '???'}: {s.content?.toUpperCase()}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
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

  // Variation reveal
  variationRevealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  variationRevealLabel: {
    fontSize: 14, fontWeight: '700', color: colors.textSecondary, letterSpacing: 3,
    marginBottom: 12,
  },
  variationRevealName: {
    fontSize: 32, fontWeight: '900', color: colors.accent, letterSpacing: 4,
    textAlign: 'center',
  },
  variationBadge: {
    fontSize: 11, fontWeight: '900', color: colors.warning, letterSpacing: 2,
    marginTop: 2,
  },

  // Editor banner
  editorBanner: {
    backgroundColor: colors.accentBg, borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: colors.accent,
  },
  editorBannerText: {
    fontSize: 13, fontWeight: '800', color: colors.accent, textAlign: 'center',
    letterSpacing: 1,
  },

  // Author name (shown in non-blind variations during results)
  authorName: {
    fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic',
  },

  // Confidence bet
  confidenceArea: {
    paddingVertical: 12, paddingHorizontal: 4,
  },
  confidenceLabel: {
    fontSize: 13, fontWeight: '800', color: colors.warning, letterSpacing: 1,
    marginBottom: 8, textAlign: 'center',
  },
  confidenceRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  confidenceChip: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    borderColor: colors.surfaceBorder, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface,
  },
  confidenceChipActive: {
    borderColor: colors.warning, backgroundColor: colors.accentBg,
  },
  confidenceChipText: {
    fontSize: 18, fontWeight: '800', color: colors.textSecondary,
  },
  confidenceChipTextActive: {
    color: colors.warning,
  },

  // Rating (crowd_favorite)
  ratingRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8,
  },
  ratingStar: {
    fontSize: 28, color: colors.textMuted,
  },
  ratingStarActive: {
    color: colors.warning,
  },

  // Sabotage
  sabotageOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  sabotageText: {
    fontSize: 24, fontWeight: '900', color: colors.error, letterSpacing: 3,
    textAlign: 'center',
  },
  sabotageSubtext: {
    fontSize: 14, color: colors.textMuted, marginTop: 8, fontStyle: 'italic',
  },

  // Interrogation
  interrogationArea: {
    flex: 1, justifyContent: 'center', gap: 8,
  },
  interrogationTitle: {
    fontSize: 20, fontWeight: '900', color: colors.accent, letterSpacing: 3,
    textAlign: 'center', marginBottom: 4,
  },
  interrogationSubtitle: {
    fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12,
  },

  // Mashup
  mashupArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
  },
  mashupTitle: {
    fontSize: 18, fontWeight: '900', color: colors.accent, letterSpacing: 3,
    marginBottom: 16,
  },
  mashupContent: {
    fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center',
    lineHeight: 28, marginBottom: 24, fontStyle: 'italic',
  },

  // Double down
  doubleDownArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  doubleDownTitle: {
    fontSize: 22, fontWeight: '900', color: colors.warning, letterSpacing: 3,
    marginBottom: 8,
  },
  doubleDownSubtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20,
  },

  // The Reveal defense
  revealArea: {
    paddingVertical: 16,
  },
  revealTitle: {
    fontSize: 20, fontWeight: '900', color: colors.error, letterSpacing: 3,
    textAlign: 'center', marginBottom: 4,
  },
  revealSubtitle: {
    fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 16,
  },

  // Worst Advice
  scenarioHeader: {
    fontSize: 12, fontWeight: '900', color: colors.warning, letterSpacing: 2,
    marginBottom: 8,
  },

  // Emoji Story
  emojiSequenceRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginBottom: 20, paddingVertical: 16,
    backgroundColor: colors.surface, borderRadius: 16,
  },
  emojiChar: {
    fontSize: 40,
  },

  // Two Word Story
  templateText: {
    fontSize: 18, fontWeight: '600', color: colors.text, lineHeight: 26,
    marginBottom: 16, fontStyle: 'italic', textAlign: 'center',
  },
  wordInput: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    color: colors.text, fontSize: 18, borderWidth: 1, borderColor: colors.surfaceBorder,
    marginBottom: 10,
  },

  // Bluff Stats
  bluffStatsArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12,
  },
  bluffStatText: {
    fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center',
    lineHeight: 28, marginBottom: 24,
  },
  bluffVotedText: {
    fontSize: 20, fontWeight: '800', color: colors.accent, marginBottom: 8,
  },
  bluffResultCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    borderWidth: 2, borderColor: colors.accent, alignItems: 'center',
    marginBottom: 24, width: '100%',
  },
  bluffResultLabel: {
    fontSize: 12, fontWeight: '900', color: colors.textSecondary, letterSpacing: 3,
    marginBottom: 12,
  },
  bluffResultAnswer: {
    fontSize: 36, fontWeight: '900', letterSpacing: 4, marginBottom: 16,
  },
  bluffResultScore: {
    fontSize: 14, color: colors.textSecondary, marginTop: 12,
  },

  // Speed Superlative
  superlativeArea: {
    flex: 1,
  },
  superlativePrompt: {
    fontSize: 20, fontWeight: '700', color: colors.highlight, textAlign: 'center',
    marginBottom: 16, lineHeight: 28,
  },
  playerVoteCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 18, marginBottom: 10,
    borderWidth: 2, borderColor: colors.surfaceBorder, alignItems: 'center',
  },
  playerVoteName: {
    fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 1,
  },
});
