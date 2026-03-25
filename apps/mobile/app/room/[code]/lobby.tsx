import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSessionStore } from '@/stores/session-store';
import { usePolling } from '@/hooks/use-polling';
import { showToast } from '@/components/Toast';
import { colors } from '@/theme/colors';

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { roomId, isHost, players, room } = useSessionStore();
  const [starting, setStarting] = useState(false);
  const insets = useSafeAreaInsets();
  usePolling(roomId);

  // Navigate based on room status changes
  useEffect(() => {
    if (!room) return;
    if (room.status === 'SETUP') {
      router.replace(`/room/${code}/setup`);
    } else if (room.status === 'ACTIVE') {
      router.replace(`/room/${code}/play`);
    } else if (room.status === 'ENDED') {
      router.replace(`/room/${code}/results`);
    }
  }, [room?.status, code]);

  const handleShare = () => {
    Share.share({ message: `Join my Chaos Agent room! Code: ${code}` });
  };

  const handleStart = () => {
    if (starting) return;
    setStarting(true);
    // Navigate to setup -- host initiates the setup flow
    router.replace(`/room/${code}/setup`);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity style={styles.codeContainer} onPress={handleShare} activeOpacity={0.7}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.codeHint}>Tap to share with your group</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        PLAYERS ({players.length})
      </Text>
      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
              {item.nickname}
            </Text>
            {item.is_host && <Text style={styles.hostBadge}>HOST</Text>}
            {item.setup_answers && (
              <Text style={styles.readyBadge}>READY</Text>
            )}
          </View>
        )}
        style={styles.playerList}
        contentContainerStyle={styles.playerListContent}
        ListEmptyComponent={
          <ActivityIndicator color={colors.textSecondary} style={{ marginTop: 24 }} />
        }
      />

      {isHost && players.length >= 2 && (
        <TouchableOpacity
          style={[styles.startButton, starting && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={starting}
          activeOpacity={0.7}
        >
          {starting ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.startButtonText}>START GAME</Text>
          )}
        </TouchableOpacity>
      )}

      {isHost && players.length < 2 && (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for players to join...</Text>
        </View>
      )}

      {!isHost && (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for host to start...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  codeContainer: {
    alignItems: 'center', marginBottom: 32, paddingVertical: 24,
    backgroundColor: colors.surface, borderRadius: 12,
  },
  codeLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, letterSpacing: 2, marginBottom: 8 },
  code: { fontSize: 48, fontWeight: '900', color: colors.accent, letterSpacing: 8 },
  codeHint: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 2, marginBottom: 12,
  },
  playerList: { flex: 1 },
  playerListContent: { gap: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 8, minHeight: 52,
  },
  playerName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  hostBadge: {
    fontSize: 11, fontWeight: '700', color: colors.accent,
    backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, overflow: 'hidden', letterSpacing: 1,
  },
  readyBadge: {
    fontSize: 11, fontWeight: '700', color: colors.success,
    backgroundColor: '#0A1A0F', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, overflow: 'hidden', letterSpacing: 1, marginLeft: 6,
  },
  startButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center', marginTop: 16, minHeight: 60,
  },
  buttonDisabled: { opacity: 0.6 },
  startButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  waitingContainer: { paddingVertical: 20, alignItems: 'center' },
  waitingText: { color: colors.textSecondary, fontSize: 16 },
});
