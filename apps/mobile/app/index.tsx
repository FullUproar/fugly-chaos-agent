import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';

const fuglyImage = require('../assets/FuglyLaying.webp');

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Image source={fuglyImage} style={styles.mascot} resizeMode="contain" />
      <Text style={styles.title}>CHAOS AGENT</Text>
      <Text style={styles.subtitle}>Secret missions. Social chaos.</Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={() => router.push('/create')}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>CREATE ROOM</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={() => router.push('/join')}
          activeOpacity={0.8}
        >
          <Text style={styles.joinButtonText}>JOIN ROOM</Text>
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
  subtitle: { fontSize: 16, color: colors.highlight, marginBottom: 64 },
  buttons: { width: '100%', gap: 16 },
  button: { paddingVertical: 20, borderRadius: 50, alignItems: 'center' },
  createButton: { backgroundColor: colors.accent },
  joinButton: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  createButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  joinButtonText: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: 2 },
});
