import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { isValidRoomCode } from '@chaos-agent/shared';

export default function JoinRoomScreen() {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const upperCode = code.toUpperCase().trim();
    if (!isValidRoomCode(upperCode)) {
      setError('Enter a valid 6-character room code');
      return;
    }
    if (!nickname.trim()) {
      setError('Enter a nickname');
      return;
    }
    setError('');
    // TODO: call join-room edge function
    router.replace(`/room/${upperCode}/lobby`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Join a Room</Text>

      <Text style={styles.label}>Room Code</Text>
      <TextInput
        style={styles.input}
        placeholder="ABC123"
        placeholderTextColor="#444"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
        autoFocus
      />

      <Text style={styles.label}>Your Nickname</Text>
      <TextInput
        style={styles.input}
        placeholder="Snoozy, Big Dave, etc."
        placeholderTextColor="#444"
        value={nickname}
        onChangeText={setNickname}
        maxLength={20}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.joinButton} onPress={handleJoin}>
        <Text style={styles.joinButtonText}>JOIN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
    letterSpacing: 4,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
  },
});
