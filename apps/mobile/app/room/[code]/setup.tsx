import { useState, useEffect } from 'react';
import { View, Text, Pressable, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { STANDARD_QUESTIONS, WILDCARD_QUESTIONS } from '@chaos-agent/shared';
import type { SetupAnswers, GameType } from '@chaos-agent/shared';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { usePolling } from '@/hooks/use-polling';
import { colors } from '@/theme/colors';

export default function SetupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { roomId, room } = useSessionStore();
  const gameType = (room?.game_type ?? 'party_game') as GameType;
  const wildcardQ = WILDCARD_QUESTIONS[gameType];

  const [answers, setAnswers] = useState<Partial<SetupAnswers>>({
    chaos_comfort: 'moderate',
    social_style: 'participant',
    physical_ok: true,
    competitive_ok: true,
    wildcard: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [waitingOn, setWaitingOn] = useState<string[]>([]);

  // Keep polling so we detect when room goes ACTIVE
  usePolling(roomId);

  const roomStatus = useSessionStore((s) => s.room?.status);

  // Navigate when room status changes to ACTIVE
  useEffect(() => {
    if (roomStatus === 'ACTIVE') {
      router.replace(`/room/${code}/play`);
    }
  }, [roomStatus, code]);

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await api.submitSetup({
        room_id: roomId,
        answers: answers as SetupAnswers,
      });
      setSubmitted(true);
      setWaitingOn(res.waiting_on);
    } catch {
      // Will retry via polling
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingBox}>
          <Text style={styles.waitingTitle}>You're locked in</Text>
          <ActivityIndicator color={colors.accent} size="large" style={{ marginVertical: 24 }} />
          {waitingOn.length > 0 ? (
            <Text style={styles.waitingText}>
              Waiting on: {waitingOn.join(', ')}
            </Text>
          ) : (
            <Text style={styles.waitingText}>Generating missions...</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Quick Setup</Text>
      <Text style={styles.subheading}>
        This helps the AI craft perfect missions for you
      </Text>

      {STANDARD_QUESTIONS.map((q) => (
        <View key={q.id} style={styles.questionBlock}>
          <Text style={styles.questionLabel}>{q.label}</Text>

          {q.type === 'select' && q.options && (
            <View style={styles.selectOptions}>
              {q.options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.selectOption,
                    answers[q.id as keyof SetupAnswers] === opt.value && styles.selectOptionActive,
                  ]}
                  onPress={() => setAnswer(q.id, opt.value)}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      answers[q.id as keyof SetupAnswers] === opt.value && styles.selectOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {q.type === 'toggle' && (
            <View style={styles.toggleRow}>
              <Switch
                value={answers[q.id as keyof SetupAnswers] as boolean}
                onValueChange={(v) => setAnswer(q.id, v)}
                trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>
          )}
        </View>
      ))}

      <View style={styles.questionBlock}>
        <Text style={styles.questionLabel}>{wildcardQ.label}</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Your answer..."
          placeholderTextColor={colors.textMuted}
          value={answers.wildcard ?? ''}
          onChangeText={(t) => setAnswer('wildcard', t)}
          maxLength={100}
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.submitButtonText}>LOCK IN</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: 28 },
  questionBlock: { marginBottom: 24 },
  questionLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  selectOptions: { gap: 8 },
  selectOption: {
    padding: 14, borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  selectOptionActive: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  selectOptionText: { fontSize: 14, color: colors.textSecondary },
  selectOptionTextActive: { color: colors.accent, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  submitButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center', marginTop: 8,
  },
  submitButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  waitingTitle: { fontSize: 28, fontWeight: '800', color: colors.accent, letterSpacing: 2 },
  waitingText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
});
