import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHAOS AGENT</Text>
      <Text style={styles.subtitle}>Secret missions. Social chaos.</Text>

      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.createButton]}
          onPress={() => router.push('/create')}
        >
          <Text style={styles.buttonText}>CREATE ROOM</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.joinButton]}
          onPress={() => router.push('/join')}
        >
          <Text style={styles.buttonText}>JOIN ROOM</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 64,
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  button: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#FF3B30',
  },
  joinButton: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});
