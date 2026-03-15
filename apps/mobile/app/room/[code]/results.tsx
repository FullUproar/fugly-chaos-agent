import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function ResultsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>GAME OVER</Text>
      <Text style={styles.subheading}>Final Standings</Text>

      <View style={styles.leaderboard}>
        <Text style={styles.placeholder}>Leaderboard will appear here</Text>
      </View>

      <Pressable style={styles.homeButton} onPress={() => router.replace('/')}>
        <Text style={styles.homeButtonText}>BACK TO HOME</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 24,
    alignItems: 'center',
  },
  heading: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 4,
    marginTop: 32,
  },
  subheading: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    marginBottom: 32,
  },
  leaderboard: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  placeholder: {
    color: '#444',
    fontSize: 16,
    textAlign: 'center',
  },
  homeButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 32,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
  },
});
