import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import type { Poll } from '@chaos-agent/shared';
import { colors } from '@/theme/colors';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';

interface Props {
  poll: Poll & { votes?: Array<{ room_player_id: string; answer: string }> };
  myVote: string | null;
  onVote: (answer: string) => void;
  onDismiss: () => void;
}

export function PollOverlay({ poll, myVote, onVote, onDismiss }: Props) {
  const [justVoted, setJustVoted] = useState(false);

  useEffect(() => {
    triggerHaptic('poll');
    playSound('POLL');
  }, []);

  const options: string[] = typeof poll.options === 'string'
    ? JSON.parse(poll.options)
    : poll.options;

  // Count votes per option
  const voteCounts: Record<string, number> = {};
  for (const v of poll.votes ?? []) {
    voteCounts[v.answer] = (voteCounts[v.answer] ?? 0) + 1;
  }

  const hasVoted = !!myVote || justVoted;
  const isClosed = poll.status === 'CLOSED';
  const showResults = hasVoted || isClosed;

  const handleVote = (answer: string) => {
    setJustVoted(true);
    onVote(answer);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.label}>POLL</Text>
          <Text style={styles.question}>{poll.question}</Text>

          <View style={styles.options}>
            {options.map((opt) => {
              const isMyVote = myVote === opt;
              const count = voteCounts[opt] ?? 0;

              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.option,
                    isMyVote && styles.optionSelected,
                    showResults && !isMyVote && styles.optionFaded,
                  ]}
                  onPress={() => !hasVoted && handleVote(opt)}
                  disabled={hasVoted}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, isMyVote && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                  {showResults && count > 0 && (
                    <View style={styles.voteBadge}>
                      <Text style={styles.voteCountText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {hasVoted && (
            <Text style={styles.votedText}>Vote recorded!</Text>
          )}

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.dismissButtonText}>
              {hasVoted ? 'CLOSE' : 'SKIP'}
            </Text>
          </TouchableOpacity>
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
    borderColor: colors.highlight,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.highlight,
    letterSpacing: 3,
    marginBottom: 8,
  },
  question: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 20 },
  options: { gap: 8, marginBottom: 16 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minHeight: 52,
  },
  optionSelected: {
    borderColor: colors.highlight,
    backgroundColor: '#1A1800',
  },
  optionFaded: { opacity: 0.5 },
  optionText: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionTextSelected: { color: colors.highlight },
  voteBadge: {
    backgroundColor: colors.highlight, borderRadius: 12, minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  voteCountText: { fontSize: 13, fontWeight: '800', color: colors.bg },
  votedText: {
    fontSize: 14,
    color: colors.success,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  dismissButtonText: { fontSize: 14, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
});
