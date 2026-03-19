import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/colors';
import { useSessionStore } from '@/stores/session-store';

const fuglyImage = require('../assets/FuglyLaying.webp');

const SESSION_KEY = 'chaos_agent_session';

export default function HomeScreen() {
  const [resumeRoom, setResumeRoom] = useState<{ code: string; roomId: string } | null>(null);
  const setIdentity = useSessionStore((s) => s.setIdentity);

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

  const handleResume = async () => {
    if (!resumeRoom) return;
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
  };

  const handleDismissResume = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setResumeRoom(null);
  };

  return (
    <View style={styles.container}>
      <Image source={fuglyImage} style={styles.mascot} resizeMode="contain" />
      <Text style={styles.title}>CHAOS AGENT</Text>
      <Text style={styles.subtitle}>Secret missions. Social chaos.</Text>

      {resumeRoom && (
        <View style={styles.resumeBanner}>
          <Text style={styles.resumeText}>Game in progress</Text>
          <View style={styles.resumeButtons}>
            <TouchableOpacity style={styles.resumeButton} onPress={handleResume} activeOpacity={0.8}>
              <Text style={styles.resumeButtonText}>REJOIN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDismissResume} activeOpacity={0.8}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  mascot: { width: 200, height: 150, marginBottom: 16 },
  title: {
    fontSize: 40, fontWeight: '900', color: colors.accent,
    letterSpacing: 4, marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: colors.highlight, marginBottom: 48 },

  // Resume banner
  resumeBanner: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.accent, padding: 16, marginBottom: 24,
    alignItems: 'center',
  },
  resumeText: { color: colors.accent, fontWeight: '700', fontSize: 14, marginBottom: 12 },
  resumeButtons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resumeButton: {
    backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 50,
  },
  resumeButtonText: { color: colors.accentText, fontWeight: '900', fontSize: 14 },
  resumeDismiss: { color: colors.textMuted, fontSize: 14 },

  // Main buttons
  buttons: { width: '100%', gap: 14 },
  button: { paddingVertical: 20, borderRadius: 50, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.accent },
  primaryButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent },
  secondaryButtonText: { fontSize: 18, fontWeight: '900', color: colors.accent, letterSpacing: 2 },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.surfaceBorder },
  outlineButtonText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },
});
