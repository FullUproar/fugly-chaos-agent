import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '@/theme/colors';
import type { HalftimeStats } from '@chaos-agent/shared';

const fuglyImage = require('../../assets/FuglyLaying.webp');

interface Props {
  visible: boolean;
  endsAt: string | null;
  stats: HalftimeStats | null;
  isHost: boolean;
  onEndIntermission: () => void;
}

const INTERMISSION_MESSAGES = [
  "Fugly says: Hydrate or die-drate.",
  "Grab a snack. You've earned it.",
  "The chaos will resume shortly...",
  "Time to talk trash IRL.",
  "Fugly is judging your snack choices.",
  "Stretch those legs. The next round is brutal.",
  "Secret alliances form during breaks. Just saying.",
  "Who needs a refill? Tap that signal.",
];

export function IntermissionOverlay({ visible, endsAt, stats, isHost, onEndIntermission }: Props) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [timeLeft, setTimeLeft] = useState('');
  const [message] = useState(() =>
    INTERMISSION_MESSAGES[Math.floor(Math.random() * INTERMISSION_MESSAGES.length)]
  );

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Resuming...');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.container,
      { opacity: slideAnim, transform: [{ scale: slideAnim }] },
    ]}>
      <Image source={fuglyImage} style={styles.fugly} resizeMode="contain" />

      <Text style={styles.title}>INTERMISSION</Text>
      <Text style={styles.message}>{message}</Text>

      {timeLeft && <Text style={styles.timer}>{timeLeft}</Text>}

      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>HALFTIME REPORT</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Leading</Text>
            <Text style={styles.statsValue}>{stats.leader.nickname} ({stats.leader.score} pts)</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Claims</Text>
            <Text style={styles.statsValue}>{stats.total_claims}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Bullshits</Text>
            <Text style={styles.statsValue}>{stats.total_bullshits}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Missions Done</Text>
            <Text style={styles.statsValue}>{stats.missions_completed} / {stats.missions_completed + stats.missions_remaining}</Text>
          </View>
        </View>
      )}

      {isHost && (
        <TouchableOpacity style={styles.resumeButton} onPress={onEndIntermission} activeOpacity={0.8}>
          <Text style={styles.resumeButtonText}>RESUME CHAOS</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 100,
  },
  fugly: { width: 160, height: 120, marginBottom: 16 },
  title: {
    fontSize: 32, fontWeight: '900', color: colors.highlight,
    letterSpacing: 6, marginBottom: 8,
  },
  message: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  timer: {
    fontSize: 48, fontWeight: '900', color: colors.accent,
    marginBottom: 24,
  },
  statsCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: 12,
    padding: 20, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 24,
  },
  statsTitle: {
    fontSize: 12, fontWeight: '700', color: colors.accent,
    letterSpacing: 2, marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statsLabel: { fontSize: 14, color: colors.textMuted },
  statsValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  resumeButton: {
    backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 50, minHeight: 52,
  },
  resumeButtonText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
