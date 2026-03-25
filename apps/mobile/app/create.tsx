import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Modal,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GAME_TYPE_OPTIONS } from '@chaos-agent/shared';
import type { GameType } from '@chaos-agent/shared';
import { ensureAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { showToast } from '@/components/Toast';
import { colors } from '@/theme/colors';

const NICKNAME_KEY = 'chaos_agent_nickname';

export default function CreateRoomScreen() {
  const [gameType, setGameType] = useState<GameType>('party_game');
  const [gameName, setGameName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [nickname, setNickname] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setIdentity = useSessionStore((s) => s.setIdentity);
  const insets = useSafeAreaInsets();

  // Pre-fill nickname from previous session
  useEffect(() => {
    AsyncStorage.getItem(NICKNAME_KEY).then((saved) => {
      if (saved) setNickname(saved);
    }).catch(() => {});
  }, []);

  const selectedOption = GAME_TYPE_OPTIONS.find((o) => o.value === gameType)!;

  const handleCreate = async () => {
    if (loading) return;
    if (!nickname.trim()) {
      setError('Enter your nickname');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Persist nickname for next time
      AsyncStorage.setItem(NICKNAME_KEY, nickname.trim()).catch(() => {});

      const playerId = await ensureAuth();
      const res = await api.createRoom({
        game_type: gameType,
        game_name: gameName || undefined,
        room_name: roomName.trim() || undefined,
        nickname: nickname.trim(),
      });
      setIdentity(playerId, res.room_player_id, res.room_id, nickname.trim(), true);
      router.replace(`/room/${res.code}/lobby`);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Playing as header */}
      {nickname.trim().length > 0 && (
        <Text style={styles.playingAs}>
          Playing as: <Text style={styles.playingAsName}>{nickname.trim()}</Text>
        </Text>
      )}

      <Text style={styles.heading}>What are you playing?</Text>

      {/* Game type dropdown picker */}
      <Text style={styles.label}>GAME TYPE</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.pickerButtonInner}>
          <View style={styles.pickerTextWrap}>
            <Text style={styles.pickerSelectedLabel}>{selectedOption.label}</Text>
            <Text style={styles.pickerSelectedDesc}>{selectedOption.description}</Text>
          </View>
          <Text style={styles.pickerChevron}>{'\u25BC'}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Game Type</Text>
            {GAME_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.pickerOption,
                  gameType === opt.value && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setGameType(opt.value);
                  setPickerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerOptionLabel,
                    gameType === opt.value && styles.pickerOptionLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.pickerOptionDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <TextInput
        style={styles.input}
        placeholder="Game name (optional)"
        placeholderTextColor={colors.textMuted}
        value={gameName}
        onChangeText={setGameName}
      />

      <Text style={styles.label}>ROOM NAME (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="Thursday Crew, Shawn's Game Night..."
        placeholderTextColor={colors.textMuted}
        value={roomName}
        onChangeText={setRoomName}
        maxLength={40}
      />

      <Text style={styles.label}>YOUR NICKNAME</Text>
      <TextInput
        style={styles.input}
        placeholder="Snoozy, Big Dave, etc."
        placeholderTextColor={colors.textMuted}
        value={nickname}
        onChangeText={setNickname}
        maxLength={20}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.createButton, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.createButtonText}>START ROOM</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24 },

  // Playing as header
  playingAs: {
    fontSize: 14, color: colors.textMuted, marginBottom: 16, textAlign: 'center',
  },
  playingAsName: { color: colors.accent, fontWeight: '700' },

  heading: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 24 },

  label: {
    fontSize: 14, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 1, marginBottom: 8,
  },

  // Dropdown picker
  pickerButton: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 24, minHeight: 52,
  },
  pickerButtonInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerTextWrap: { flex: 1 },
  pickerSelectedLabel: { fontSize: 16, fontWeight: '600', color: colors.accent },
  pickerSelectedDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  pickerChevron: { fontSize: 14, color: colors.textMuted, marginLeft: 12 },

  // Picker modal
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', padding: 24,
  },
  pickerModal: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.accent,
  },
  pickerModalTitle: {
    fontSize: 16, fontWeight: '700', color: colors.text,
    marginBottom: 16, textAlign: 'center',
  },
  pickerOption: {
    padding: 14, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  pickerOptionSelected: {
    borderColor: colors.accent, backgroundColor: colors.accentBg,
  },
  pickerOptionLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  pickerOptionLabelSelected: { color: colors.accent },
  pickerOptionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    color: colors.text, fontSize: 16, borderWidth: 1,
    borderColor: colors.surfaceBorder, marginBottom: 24, minHeight: 52,
  },
  error: { color: colors.error, fontSize: 14, marginBottom: 16 },
  createButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center', minHeight: 60,
  },
  buttonDisabled: { opacity: 0.6 },
  createButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
