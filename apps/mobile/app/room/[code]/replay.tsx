import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

const fuglyImage = require('../../../assets/FuglyLaying.webp');

export default function ReplayScreen() {
  const { scores, room, nickname } = useSessionStore();
  const myScore = scores.find(s => s.nickname === nickname);

  return (
    <View style={styles.container}>
      <Image source={fuglyImage} style={styles.fugly} resizeMode="contain" />

      <Text style={styles.title}>WHAT A NIGHT</Text>
      <Text style={styles.subtitle}>
        {myScore
          ? `You scored ${myScore.score} points with ${myScore.claims_won} successful claims.`
          : 'The chaos has settled... for now.'}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => {
            useSessionStore.getState().reset();
            router.replace('/create');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>PLAY AGAIN NOW</Text>
        </TouchableOpacity>

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

        <View style={styles.ahqCard}>
          <Text style={styles.ahqTitle}>Make it a ritual</Text>
          <Text style={styles.ahqBody}>
            Your crew on Afterroar HQ can keep the streak going — recurring game nights, season standings, and a full history of your chaos legacy.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  fugly: { width: 140, height: 100, marginBottom: 16 },
  title: {
    fontSize: 28, fontWeight: '900', color: colors.highlight,
    letterSpacing: 4, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: colors.textSecondary, textAlign: 'center',
    marginBottom: 40, lineHeight: 22,
  },
  buttons: { width: '100%', gap: 14 },
  button: { paddingVertical: 18, borderRadius: 50, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.accent },
  primaryButtonText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent },
  secondaryButtonText: { fontSize: 15, fontWeight: '900', color: colors.accent, letterSpacing: 1 },

  ahqCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginVertical: 8,
  },
  ahqTitle: { fontSize: 16, fontWeight: '700', color: colors.highlight, marginBottom: 8 },
  ahqBody: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 14 },
  ahqButton: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.highlight,
    paddingVertical: 10, borderRadius: 50, alignItems: 'center',
  },
  ahqButtonText: { fontSize: 13, fontWeight: '700', color: colors.highlight, letterSpacing: 1 },

  homeButton: { backgroundColor: 'transparent' },
  homeButtonText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});
