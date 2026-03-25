import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GAME_TYPE_OPTIONS } from '@chaos-agent/shared';
import type { GameType } from '@chaos-agent/shared';
import { ensureAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { showToast } from '@/components/Toast';
import { colors } from '@/theme/colors';

export default function CreateRoomScreen() {
  const [gameType, setGameType] = useState<GameType>('party_game');
  const [gameName, setGameName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setIdentity = useSessionStore((s) => s.setIdentity);
  const insets = useSafeAreaInsets();

  const handleCreate = async () => {
    if (loading) return;
    if (!nickname.trim()) {
      setError('Enter your nickname');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const playerId = await ensureAuth();
      const res = await api.createRoom({
        game_type: gameType,
        game_name: gameName || undefined,
        nickname: nickname.trim(),
      });
      setIdentity(playerId, res.room_player_id, res.room_id, nickname.trim(), true);
      router.replace(`/room/${res.code}/lobby`);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>What are you playing?</Text>

      <View style={styles.options}>
        {GAME_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, gameType === opt.value && styles.optionSelected]}
            onPress={() => setGameType(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionLabel, gameType === opt.value && styles.optionLabelSelected]}>
              {opt.label}
            </Text>
            <Text style={styles.optionDesc}>{opt.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Game name (optional)"
        placeholderTextColor={colors.textMuted}
        value={gameName}
        onChangeText={setGameName}
      />

      <Text style={styles.label}>YOUR NICKNAME</Text>
      <TextInput
        style={styles.input}
        placeholder="Snoozy, Big Dave, etc."
        placeholderTextColor={colors.textMuted}
        value={nickname}
        onChangeText={setNickname}
        maxLength={20}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.createButton, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.createButtonText}>START ROOM</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24 },
  heading: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 24 },
  options: { gap: 12, marginBottom: 24 },
  option: {
    padding: 16, borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.surfaceBorder, minHeight: 60,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionLabelSelected: { color: colors.accent },
  optionDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  label: {
    fontSize: 14, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    color: colors.text, fontSize: 16, borderWidth: 1,
    borderColor: colors.surfaceBorder, marginBottom: 24, minHeight: 52,
  },
  error: { color: colors.error, fontSize: 14, marginBottom: 16 },
  createButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center', minHeight: 60,
  },
  buttonDisabled: { opacity: 0.6 },
  createButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
