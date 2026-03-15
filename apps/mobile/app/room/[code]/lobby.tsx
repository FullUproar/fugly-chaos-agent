import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();

  // TODO: poll room state, show real players
  const mockPlayers = [{ id: '1', nickname: 'Host', is_host: true }];

  return (
    <View style={styles.container}>
      <View style={styles.codeContainer}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.codeHint}>Share this code with your group</Text>
      </View>

      <Text style={styles.sectionTitle}>PLAYERS</Text>
      <FlatList
        data={mockPlayers}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerName}>{item.nickname}</Text>
            {item.is_host && <Text style={styles.hostBadge}>HOST</Text>}
          </View>
        )}
        style={styles.playerList}
      />

      <Pressable style={styles.startButton}>
        <Text style={styles.startButtonText}>START GAME</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 24,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 2,
    marginBottom: 8,
  },
  code: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 8,
  },
  codeHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 2,
    marginBottom: 12,
  },
  playerList: {
    flex: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  hostBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF3B30',
    backgroundColor: '#1A0A09',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
    letterSpacing: 1,
  },
  startButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
  },
});
