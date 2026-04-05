import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';
import { api } from '@/lib/api';
import type { GetSeasonInfoResponse } from '@chaos-agent/shared';

const fuglyImage = require('../../../assets/FuglyLaying.webp');

export default function ReplayScreen() {
  const { scores, room, roomId, nickname } = useSessionStore();
  const myScore = scores.find(s => s.nickname === nickname);
  const insets = useSafeAreaInsets();
  const [seasonInfo, setSeasonInfo] = useState<GetSeasonInfoResponse | null>(null);

  useEffect(() => {
    if (roomId) {
      api.getSeasonInfo(roomId).then(setSeasonInfo).catch(() => {});
    }
  }, [roomId]);

  const streakCount = seasonInfo?.current_streak ?? room?.streak_count ?? 0;
  const hasStreak = streakCount > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={fuglyImage} style={styles.fugly} resizeMode="contain" />

      <Text style={styles.title}>WHAT A NIGHT</Text>
      <Text style={styles.subtitle}>
        {myScore
          ? `You scored ${myScore.score} points with ${myScore.claims_won} successful claims.`
          : 'The chaos has settled... for now.'}
      </Text>

      <View style={styles.buttons}>
        {/* Streak is the PRIMARY call to action */}
        {hasStreak && (
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakHeadline}>{streakCount}-WEEK STREAK</Text>
            <Text style={styles.streakSubtitle}>
              Don't let it die. Next session keeps the fire alive.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.scheduleButton]}
              onPress={() => {
                useSessionStore.getState().reset();
                router.replace('/plan');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.scheduleButtonText}>SCHEDULE NEXT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Play again is secondary when streak exists */}
        <TouchableOpacity
          style={[styles.button, hasStreak ? styles.secondaryButton : styles.primaryButton]}
          onPress={() => {
            useSessionStore.getState().reset();
            router.replace('/create');
          }}
          activeOpacity={0.8}
        >
          <Text style={hasStreak ? styles.secondaryButtonText : styles.primaryButtonText}>
            PLAY AGAIN NOW
          </Text>
        </TouchableOpacity>

        {/* Only show schedule button separately if no streak */}
        {!hasStreak && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              useSessionStore.getState().reset();
              router.replace('/plan');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>SCHEDULE THE NEXT ONE</Text>
          </TouchableOpacity>
        )}

        <View style={styles.ahqCard}>
          <Text style={styles.ahqTitle}>Make it a ritual</Text>
          <Text style={styles.ahqBody}>
            Your crew on Afterroar HQ can keep the streak going -- recurring game nights, season standings, and a full history of your chaos legacy.
          </Text>
          <TouchableOpacity
            style={styles.ahqButton}
            onPress={() => Linking.openURL('https://fulluproar.com/afterroar')}
            activeOpacity={0.8}
          >
            <Text style={styles.ahqButtonText}>CHECK IT OUT</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.homeButton]}
          onPress={() => {
            useSessionStore.getState().reset();
            router.replace('/');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.homeButtonText}>BACK TO HOME</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  fugly: { width: 140, height: 100, marginBottom: 16 },
  title: {
    fontSize: 28, fontWeight: '900', color: colors.highlight,
    letterSpacing: 4, marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: colors.textSecondary, textAlign: 'center',
    marginBottom: 40, lineHeight: 24,
  },
  buttons: { width: '100%', gap: 14 },
  button: { paddingVertical: 18, borderRadius: 50, alignItems: 'center', minHeight: 56 },
  primaryButton: { backgroundColor: colors.accent },
  primaryButtonText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent },
  secondaryButtonText: { fontSize: 15, fontWeight: '900', color: colors.accent, letterSpacing: 1 },

  // Streak card — the dominant visual on this screen when active
  streakCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    borderWidth: 2, borderColor: colors.accent, alignItems: 'center',
    marginBottom: 4,
  },
  streakEmoji: { fontSize: 48, marginBottom: 8 },
  streakHeadline: {
    fontSize: 28, fontWeight: '900', color: colors.accent,
    letterSpacing: 3, marginBottom: 4,
  },
  streakSubtitle: {
    fontSize: 15, fontWeight: '600', color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 16,
  },
  scheduleButton: {
    backgroundColor: colors.accent, width: '100%',
  },
  scheduleButtonText: {
    fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2,
  },

  ahqCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginVertical: 8,
  },
  ahqTitle: { fontSize: 16, fontWeight: '700', color: colors.highlight, marginBottom: 8 },
  ahqBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
  ahqButton: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.highlight,
    paddingVertical: 12, borderRadius: 50, alignItems: 'center', minHeight: 48,
  },
  ahqButtonText: { fontSize: 14, fontWeight: '700', color: colors.highlight, letterSpacing: 1 },

  homeButton: { backgroundColor: 'transparent' },
  homeButtonText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});
