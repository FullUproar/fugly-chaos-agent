import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GAME_TYPE_OPTIONS } from '@chaos-agent/shared';
import type { GameType } from '@chaos-agent/shared';

export default function CreateRoomScreen() {
  const [gameType, setGameType] = useState<GameType>('party_game');
  const [gameName, setGameName] = useState('');

  const handleCreate = async () => {
    // TODO: call create-room edge function
    // For now, navigate to lobby with a placeholder
    router.replace('/room/TEST01/lobby');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>What are you playing?</Text>

      <View style={styles.options}>
        {GAME_TYPE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.option, gameType === opt.value && styles.optionSelected]}
            onPress={() => setGameType(opt.value)}
          >
            <Text style={[styles.optionLabel, gameType === opt.value && styles.optionLabelSelected]}>
              {opt.label}
            </Text>
            <Text style={styles.optionDesc}>{opt.description}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Game name (optional)"
        placeholderTextColor="#666"
        value={gameName}
        onChangeText={setGameName}
      />

      <Pressable style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>START ROOM</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 24,
  },
  options: {
    gap: 12,
    marginBottom: 24,
  },
  option: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionSelected: {
    borderColor: '#FF3B30',
    backgroundColor: '#1A0A09',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  optionLabelSelected: {
    color: '#FF3B30',
  },
  optionDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
  },
});
