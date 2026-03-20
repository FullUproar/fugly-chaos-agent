import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/colors';
import { useSessionStore } from '@/stores/session-store';
import { showToast } from '@/components/Toast';
import AHQConnect from '@/components/AHQConnect';
import { api } from '@/lib/api';
import type { PlayerProfileResponse } from '@chaos-agent/shared';

const fuglyImage = require('../assets/FuglyLaying.webp');

const SESSION_KEY = 'chaos_agent_session';

export default function HomeScreen() {
  const [resumeRoom, setResumeRoom] = useState<{ code: string; roomId: string } | null>(null);
  const [resuming, setResuming] = useState(false);
  const [ahqProfile, setAhqProfile] = useState<PlayerProfileResponse['profile']>(null);
  const [ahqLoading, setAhqLoading] = useState(true);
  const setIdentity = useSessionStore((s) => s.setIdentity);
  const insets = useSafeAreaInsets();

  // Check for saved session to resume
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then(raw => {
      if (raw) {
        try {
          const session = JSON.parse(raw);
          if (session.code && session.roomId) {
            setResumeRoom({ code: session.code, roomId: session.roomId });
          }
        } catch { /* ignore */ }
      }
    });
  }, []);

  // Load AHQ profile
  useEffect(() => {
    api.getPlayerProfile()
      .then((res) => setAhqProfile(res.profile))
      .catch(() => {})
      .finally(() => setAhqLoading(false));
  }, []);

  const handleAHQLinked = useCallback((displayName: string, chaosTitle: string) => {
    // Refresh the full profile after linking
    api.getPlayerProfile()
      .then((res) => setAhqProfile(res.profile))
      .catch(() => {
        // Optimistic fallback
        setAhqProfile({
          id: '',
          ahq_user_id: '',
          display_name: displayName,
          chaos_title: chaosTitle,
          total_games_played: 0,
          total_points_earned: 0,
          total_claims_made: 0,
          total_claims_won: 0,
          total_bullshit_calls: 0,
          total_bullshit_correct: 0,
          win_rate: 0,
          bs_accuracy: 0,
          claim_success_rate: 0,
        });
      });
  }, []);

  const handleResume = async () => {
    if (!resumeRoom || resuming) return;
    setResuming(true);
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        setIdentity(
          session.playerId,
          session.roomPlayerId,
          session.roomId,
          session.nickname,
          session.isHost,
        );
        router.replace(`/room/${resumeRoom.code}/play`);
      }
    } catch (e) {
      showToast('Failed to rejoin game');
    } finally {
      setResuming(false);
    }
  };

  const handleDismissResume = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setResumeRoom(null);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={fuglyImage} style={styles.mascot} resizeMode="contain" />
      <Text style={styles.title}>CHAOS AGENT</Text>
      <Text style={styles.subtitle}>Secret missions. Social chaos.</Text>

      {/* AHQ Profile or Connect */}
      {!ahqLoading && ahqProfile && (
        <View style={styles.ahqProfileCard}>
          <View style={styles.ahqProfileHeader}>
            <Text style={styles.ahqDisplayName}>{ahqProfile.display_name}</Text>
            <Text style={styles.ahqChaosTitle}>{ahqProfile.chaos_title}</Text>
          </View>
          <View style={styles.ahqStatsRow}>
            <View style={styles.ahqStat}>
              <Text style={styles.ahqStatValue}>{ahqProfile.total_games_played}</Text>
              <Text style={styles.ahqStatLabel}>Games</Text>
            </View>
            <View style={styles.ahqStat}>
              <Text style={styles.ahqStatValue}>{ahqProfile.win_rate}%</Text>
              <Text style={styles.ahqStatLabel}>Win Rate</Text>
            </View>
            <View style={styles.ahqStat}>
              <Text style={styles.ahqStatValue}>{ahqProfile.bs_accuracy}%</Text>
              <Text style={styles.ahqStatLabel}>BS Accuracy</Text>
            </View>
          </View>
        </View>
      )}

      {!ahqLoading && !ahqProfile && (
        <AHQConnect onLinked={handleAHQLinked} />
      )}

      {resumeRoom && (
        <View style={styles.resumeBanner}>
          <Text style={styles.resumeText}>Game in progress</Text>
          <View style={styles.resumeButtons}>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResume}
              disabled={resuming}
              activeOpacity={0.8}
            >
              {resuming ? (
                <ActivityIndicator color={colors.accentText} size="small" />
              ) : (
                <Text style={styles.resumeButtonText}>REJOIN</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDismissResume} activeOpacity={0.8} style={styles.dismissTouch}>
              <Text style={styles.resumeDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/create')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>PLAY NOW</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/plan')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>PLAN A NIGHT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => router.push('/join')}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineButtonText}>JOIN ROOM</Text>
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
  mascot: { width: 200, height: 150, marginBottom: 16 },
  title: {
    fontSize: 40, fontWeight: '900', color: colors.accent,
    letterSpacing: 4, marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: colors.highlight, marginBottom: 24 },

  // AHQ Profile card
  ahqProfileCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.accent, padding: 16, marginBottom: 24,
  },
  ahqProfileHeader: { alignItems: 'center', marginBottom: 12 },
  ahqDisplayName: { fontSize: 18, fontWeight: '800', color: colors.text },
  ahqChaosTitle: {
    fontSize: 13, fontWeight: '700', color: colors.accent,
    letterSpacing: 1, marginTop: 2,
  },
  ahqStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ahqStat: { alignItems: 'center' },
  ahqStatValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  ahqStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, letterSpacing: 1 },

  // Resume banner
  resumeBanner: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.accent, padding: 16, marginBottom: 24,
    alignItems: 'center',
  },
  resumeText: { color: colors.accent, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  resumeButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resumeButton: {
    backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 50, minWidth: 100, alignItems: 'center', minHeight: 44,
    justifyContent: 'center',
  },
  resumeButtonText: { color: colors.accentText, fontWeight: '900', fontSize: 15 },
  dismissTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  resumeDismiss: { color: colors.textMuted, fontSize: 15 },

  // Main buttons
  buttons: { width: '100%', gap: 14 },
  button: { paddingVertical: 20, borderRadius: 50, alignItems: 'center', minHeight: 60 },
  primaryButton: { backgroundColor: colors.accent },
  primaryButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent },
  secondaryButtonText: { fontSize: 18, fontWeight: '900', color: colors.accent, letterSpacing: 2 },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.surfaceBorder },
  outlineButtonText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },
});
