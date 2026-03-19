import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { isValidRoomCode } from '@chaos-agent/shared';
import { ensureAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

export default function JoinRoomScreen() {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setIdentity = useSessionStore((s) => s.setIdentity);

  const handleJoin = async () => {
    const upperCode = code.toUpperCase().trim();
    if (!isValidRoomCode(upperCode)) {
      setError('Enter a valid 6-character room code');
      return;
    }
    if (!nickname.trim()) {
      setError('Enter a nickname');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const playerId = await ensureAuth();
      const res = await api.joinRoom({ code: upperCode, nickname: nickname.trim() });
      setIdentity(playerId, res.room_player_id, res.room_id, nickname.trim(), false);
      router.replace(`/room/${upperCode}/lobby`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Join a Room</Text>

      <Text style={styles.label}>ROOM CODE</Text>
      <TextInput
        style={styles.input}
        placeholder="ABC123"
        placeholderTextColor={colors.textMuted}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
        autoFocus
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

      <TouchableOpacity style={styles.joinButton} onPress={handleJoin} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.joinButtonText}>JOIN</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  heading: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 32 },
  label: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 8, letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    color: colors.text, fontSize: 20, fontWeight: '600',
    borderWidth: 1, borderColor: colors.surfaceBorder,
    marginBottom: 24, letterSpacing: 4,
  },
  error: { color: colors.error, fontSize: 14, marginBottom: 16 },
  joinButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center', marginTop: 8,
  },
  joinButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
