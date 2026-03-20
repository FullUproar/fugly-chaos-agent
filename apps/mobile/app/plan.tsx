import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { GAME_TYPE_OPTIONS } from '@chaos-agent/shared';
import type { GameType } from '@chaos-agent/shared';
import { ensureAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

export default function PlanNightScreen() {
  const [gameType, setGameType] = useState<GameType>('party_game');
  const [gameName, setGameName] = useState('');
  const [nickname, setNickname] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [slowBurn, setSlowBurn] = useState(false);
  const [photoOk, setPhotoOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setIdentity = useSessionStore((s) => s.setIdentity);

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError('Enter your nickname');
      return;
    }
    if (!scheduledDate) {
      setError('Pick a date');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const playerId = await ensureAuth();

      // Build ISO timestamp from date + time
      const timeStr = scheduledTime || '19:00';
      const scheduled_at = new Date(`${scheduledDate}T${timeStr}:00`).toISOString();

      const res = await api.createEvent({
        game_type: gameType,
        game_name: gameName || undefined,
        nickname: nickname.trim(),
        scheduled_at,
        description: description || undefined,
        slow_burn_enabled: slowBurn,
        photo_challenges_enabled: photoOk,
      });

      setIdentity(playerId, res.room_player_id, res.room_id, nickname.trim(), true);
      router.replace(`/room/${res.code}/lobby`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Plan a Night</Text>
      <Text style={styles.subheading}>Set the date. Invite the squad. Build the tension.</Text>

      <Text style={styles.label}>WHAT ARE YOU PLAYING?</Text>
      <View style={styles.gameTypes}>
        {GAME_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, gameType === opt.value && styles.chipSelected]}
            onPress={() => setGameType(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, gameType === opt.value && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Game name (optional)"
        placeholderTextColor={colors.textMuted}
        value={gameName}
        onChangeText={setGameName}
      />

      <Text style={styles.label}>WHEN?</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateInput]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          value={scheduledDate}
          onChangeText={setScheduledDate}
          keyboardType="default"
        />
        <TextInput
          style={[styles.input, styles.timeInput]}
          placeholder="19:00"
          placeholderTextColor={colors.textMuted}
          value={scheduledTime}
          onChangeText={setScheduledTime}
          keyboardType="default"
        />
      </View>

      <TextInput
        style={[styles.input, styles.descInput]}
        placeholder="Add a description or vibe for the night..."
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
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

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Slow Burn Teasers</Text>
          <Text style={styles.toggleDesc}>Send mysterious teasers before the event</Text>
        </View>
        <Switch
          value={slowBurn}
          onValueChange={setSlowBurn}
          trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
          thumbColor={slowBurn ? colors.accentText : colors.textMuted}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Photo Challenges</Text>
          <Text style={styles.toggleDesc}>Missions may include photo moments</Text>
        </View>
        <Switch
          value={photoOk}
          onValueChange={setPhotoOk}
          trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
          thumbColor={photoOk ? colors.accentText : colors.textMuted}
        />
      </View>

      <View style={styles.ahqHint}>
        <Text style={styles.ahqText}>
          Need to poll the squad on when to meet? Your crew on Afterroar HQ can help with that.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={styles.createButtonText}>CREATE EVENT</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  heading: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 4 },
  subheading: { fontSize: 14, color: colors.textSecondary, marginBottom: 32 },

  label: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 1, marginBottom: 8, marginTop: 8,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    color: colors.text, fontSize: 16, borderWidth: 1,
    borderColor: colors.surfaceBorder, marginBottom: 16,
  },
  descInput: { minHeight: 80, textAlignVertical: 'top' },

  gameTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  chipSelected: { backgroundColor: colors.accentBg, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextSelected: { color: colors.accent },

  dateRow: { flexDirection: 'row', gap: 12 },
  dateInput: { flex: 2 },
  timeInput: { flex: 1 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 12,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  toggleDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  ahqHint: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginTop: 8, marginBottom: 24,
  },
  ahqText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 },

  error: { color: colors.error, fontSize: 14, marginBottom: 16 },

  createButton: {
    backgroundColor: colors.accent, paddingVertical: 20, borderRadius: 50,
    alignItems: 'center',
  },
  createButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
