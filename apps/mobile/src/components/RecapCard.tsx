import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SessionHighlightsResponse, Highlight, PlayerScore } from '@chaos-agent/shared';
import { colors } from '@/theme/colors';

interface RecapCardProps {
  data: SessionHighlightsResponse;
  gameType?: string;
  date: string;
  playerCount: number;
}

const RANK_LABELS = ['1ST', '2ND', '3RD'];
const HIGHLIGHT_LABELS: Record<string, string> = {
  most_bullshitted: 'MOST CALLED OUT',
  biggest_bluffer: 'BIGGEST BLUFFER',
  most_points_single: 'BIGGEST MISSION',
  most_contested: 'MOST CONTESTED',
};

export default function RecapCard({ data, gameType, date, playerCount }: RecapCardProps) {
  const top3 = data.leaderboard.slice(0, 3);
  const formattedDate = formatRecapDate(date);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandTag}>FULL UPROAR</Text>
        <Text style={styles.title}>CHAOS AGENT</Text>
        <Text style={styles.subtitle}>GAME NIGHT RECAP</Text>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formattedDate}</Text>
        <Text style={styles.metaDot}>{'\u2022'}</Text>
        <Text style={styles.metaText}>{playerCount} Players</Text>
        {gameType && (
          <>
            <Text style={styles.metaDot}>{'\u2022'}</Text>
            <Text style={styles.metaText}>{formatGameType(gameType)}</Text>
          </>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Final Standings */}
      <Text style={styles.sectionTitle}>FINAL STANDINGS</Text>
      {top3.map((player, index) => (
        <View key={player.room_player_id} style={[styles.rankRow, index === 0 && styles.rankRowFirst]}>
          <View style={[styles.rankBadge, index === 0 && styles.rankBadgeFirst]}>
            <Text style={[styles.rankText, index === 0 && styles.rankTextFirst]}>
              {RANK_LABELS[index]}
            </Text>
          </View>
          <Text style={[styles.rankNickname, index === 0 && styles.rankNicknameFirst]} numberOfLines={1}>
            {player.nickname}
          </Text>
          <Text style={[styles.rankScore, index === 0 && styles.rankScoreFirst]}>
            {player.score} PTS
          </Text>
        </View>
      ))}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{data.total_claims}</Text>
          <Text style={styles.statLabel}>CLAIMS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{data.total_bullshits}</Text>
          <Text style={styles.statLabel}>BULLSHITS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{data.total_missions}</Text>
          <Text style={styles.statLabel}>MISSIONS</Text>
        </View>
      </View>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <View style={styles.highlightsSection}>
          <Text style={styles.sectionTitle}>HIGHLIGHT BADGES</Text>
          {data.highlights.slice(0, 4).map((h: Highlight, i: number) => (
            <View key={i} style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>
                {HIGHLIGHT_LABELS[h.type] ?? h.type.toUpperCase()}
              </Text>
              <Text style={styles.highlightName}>{h.player_nickname}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerBrand}>FUGLY GAMES</Text>
        <Text style={styles.footerUrl}>fulluproar.com</Text>
      </View>
    </View>
  );
}

function formatRecapDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatGameType(type: string): string {
  return type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Instagram story: 1080x1920 (9:16)
// We render at a scaled size and react-native-view-shot captures at pixel density
const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 32,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF8200',
    letterSpacing: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 3,
    marginTop: 4,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  metaText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 6,
    color: '#374151',
  },

  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },

  // Section titles
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 3,
    marginBottom: 10,
    textAlign: 'center',
  },

  // Rankings
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  rankRowFirst: {
    backgroundColor: '#1A1000',
    borderWidth: 1,
    borderColor: '#FF8200',
  },
  rankBadge: {
    width: 40,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#374151',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeFirst: {
    backgroundColor: '#FF8200',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 1,
  },
  rankTextFirst: {
    color: '#111827',
  },
  rankNickname: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rankNicknameFirst: {
    color: '#FF8200',
  },
  rankScore: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9ca3af',
  },
  rankScoreFirst: {
    color: '#FF8200',
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#374151',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 2,
    marginTop: 2,
  },

  // Highlights
  highlightsSection: {
    marginBottom: 4,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  highlightLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  highlightName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 4,
  },
  footerLine: {
    width: 40,
    height: 2,
    backgroundColor: '#FF8200',
    borderRadius: 1,
    marginBottom: 8,
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF8200',
    letterSpacing: 4,
  },
  footerUrl: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
});
