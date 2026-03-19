import { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GAME_TYPE_OPTIONS } from '@chaos-agent/shared';
import type { GameType } from '@chaos-agent/shared';
import { ensureAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

export default function CreateRoomScreen() {
  const [gameType, setGameType] = useState<GameType>('party_game');
  const [gameName, setGameName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setIdentity = useSessionStore((s) => s.setIdentity);

  const handleCreate = async () => {
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
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>What are you playing?</Text>

      <View style={styles.options}>
        {GAME_TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.option, gameType === opt.value && styles.optionSelected]}
            onPress={() => setGameType(opt.value)}
          >
            <Text style={[styles.optionLabel, gameType === opt.value && styles.optionLabelSelected]}>
              {opt.label}
            </Text>
            <Text style={styles.optionDesc}>{opt.description}</Text>
          </Pressable>
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

      <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
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
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentBg },
  optionLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  optionLabelSelected: { color: colors.accent },
  optionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  label: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    color: colors.text, fontSize: 16, borderWidth: 1,
    borderColor: colors.surfaceBorder, marginBottom: 24,
  },
  error: { color: colors.error, fontSize: 14, marginBottom: 16 },
  createButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center',
  },
  createButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
