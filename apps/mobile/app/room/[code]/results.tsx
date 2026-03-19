import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { SessionHighlightsResponse } from '@chaos-agent/shared';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

const HIGHLIGHT_LABELS: Record<string, string> = {
  most_bullshitted: 'Most Called Out',
  biggest_bluffer: 'Biggest Bluffer',
  most_points_single: 'Biggest Mission',
  most_contested: 'Most Contested',
};

export default function ResultsScreen() {
  const { roomId, reset } = useSessionStore();
  const [data, setData] = useState<SessionHighlightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    api.getHighlights(roomId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [roomId]);

  const handleHome = () => {
    reset();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={data?.leaderboard ?? []}
      keyExtractor={(item) => item.room_player_id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>GAME OVER</Text>

          {/* Stats row */}
          {data && (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.total_claims}</Text>
                <Text style={styles.statLabel}>Claims</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.total_bullshits}</Text>
                <Text style={styles.statLabel}>Bullshits</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.total_missions}</Text>
                <Text style={styles.statLabel}>Missions</Text>
              </View>
            </View>
          )}

          {/* Highlights */}
          {data && data.highlights.length > 0 && (
            <View style={styles.highlightsSection}>
              <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
              {data.highlights.map((h, i) => (
                <View key={i} style={styles.highlightCard}>
                  <Text style={styles.highlightType}>
                    {HIGHLIGHT_LABELS[h.type] ?? h.type}
                  </Text>
                  <Text style={styles.highlightPlayer}>{h.player_nickname}</Text>
                  <Text style={styles.highlightDesc}>{h.description}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>FINAL STANDINGS</Text>
        </>
      }
      renderItem={({ item, index }) => (
        <View style={[styles.scoreRow, index === 0 && styles.scoreRowFirst]}>
          <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
            {index === 0 ? '👑' : `${index + 1}`}
          </Text>
          <View style={styles.playerInfo}>
            <Text style={[styles.nickname, index === 0 && styles.nicknameFirst]}>
              {item.nickname}
            </Text>
            <Text style={styles.claimStats}>
              {item.claims_won}W / {item.claims_lost}L
            </Text>
          </View>
          <Text style={[styles.score, index === 0 && styles.scoreFirst]}>
            {item.score}
          </Text>
        </View>
      )}
      ListFooterComponent={
        <TouchableOpacity style={styles.homeButton} onPress={handleHome} activeOpacity={0.8}>
          <Text style={styles.homeButtonText}>BACK TO HOME</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  heading: {
    fontSize: 36, fontWeight: '900', color: colors.accent,
    letterSpacing: 4, textAlign: 'center', marginBottom: 24,
  },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, letterSpacing: 1 },

  // Highlights
  highlightsSection: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 2, marginBottom: 12,
  },
  highlightCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 8,
  },
  highlightType: { fontSize: 11, fontWeight: '700', color: colors.warning, letterSpacing: 1, marginBottom: 4 },
  highlightPlayer: { fontSize: 18, fontWeight: '700', color: colors.text },
  highlightDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Leaderboard
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 10, marginBottom: 8,
  },
  scoreRowFirst: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accent },
  rank: { fontSize: 20, fontWeight: '800', color: colors.textMuted, width: 36 },
  rankFirst: { color: colors.accent },
  playerInfo: { flex: 1 },
  nickname: { fontSize: 16, fontWeight: '600', color: colors.text },
  nicknameFirst: { color: colors.accent },
  claimStats: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  score: { fontSize: 24, fontWeight: '800', color: colors.textSecondary },
  scoreFirst: { color: colors.accent },

  // Home button
  homeButton: {
    backgroundColor: colors.surface, paddingVertical: 20, paddingHorizontal: 48,
    borderRadius: 50, borderWidth: 1, borderColor: colors.surfaceBorder,
    alignItems: 'center', marginTop: 24,
  },
  homeButtonText: { fontSize: 16, fontWeight: '900', color: colors.text, letterSpacing: 2 },
});
