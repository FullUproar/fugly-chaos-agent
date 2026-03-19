import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet, Share, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

interface InviteItem {
  id: string;
  invite_name: string | null;
  status: string;
  invite_token: string;
}

export default function InviteManagementScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [inviteName, setInviteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const state = await api.getEventState(roomId);
      setInvites(state.invites as InviteItem[]);
      setRoomCode(state.room.code);
      setScheduledAt(state.room.scheduled_at);
    } catch (e) {
      // Silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleInvite = async () => {
    if (!inviteName.trim() || !roomId) return;
    setSending(true);
    try {
      const res = await api.invitePlayer({
        room_id: roomId,
        invite_name: inviteName.trim(),
      });
      setInviteName('');
      // Share the invite link
      await Share.share({
        message: `You're invited to Chaos Agent! Join with code: ${roomCode}\n\nOr use this link: ${res.invite_link}`,
      });
      fetchState();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleStartLobby = () => {
    const accepted = invites.filter(i => i.status === 'ACCEPTED').length;
    if (accepted < 1) {
      Alert.alert('Hold on', 'Wait for at least one player to accept.');
      return;
    }
    router.replace(`/room/${roomCode}/lobby`);
  };

  const accepted = invites.filter(i => i.status === 'ACCEPTED').length;
  const pending = invites.filter(i => i.status === 'PENDING').length;
  const declined = invites.filter(i => i.status === 'DECLINED').length;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Your Event</Text>
        {scheduledAt && <Text style={styles.date}>{formatDate(scheduledAt)}</Text>}
        <Text style={styles.code}>Room Code: {roomCode}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{accepted}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, declined > 0 && { color: colors.error }]}>{declined}</Text>
          <Text style={styles.statLabel}>Declined</Text>
        </View>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Invite someone..."
          placeholderTextColor={colors.textMuted}
          value={inviteName}
          onChangeText={setInviteName}
          maxLength={30}
        />
        <TouchableOpacity
          style={[styles.addButton, !inviteName.trim() && styles.addButtonDisabled]}
          onPress={handleInvite}
          disabled={sending || !inviteName.trim()}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color={colors.accentText} size="small" />
          ) : (
            <Text style={styles.addButtonText}>INVITE</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={invites}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.inviteRow}>
            <Text style={styles.inviteName}>{item.invite_name ?? 'Unknown'}</Text>
            <View style={[
              styles.statusBadge,
              item.status === 'ACCEPTED' && styles.statusAccepted,
              item.status === 'DECLINED' && styles.statusDeclined,
            ]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No invites yet. Add your squad above!</Text>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => Share.share({
            message: `Join my Chaos Agent room! Code: ${roomCode}`,
          })}
          activeOpacity={0.8}
        >
          <Text style={styles.shareButtonText}>SHARE ROOM CODE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartLobby}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>GO TO LOBBY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 24, paddingBottom: 16 },
  heading: { fontSize: 24, fontWeight: '900', color: colors.text },
  date: { fontSize: 14, color: colors.highlight, marginTop: 4 },
  code: { fontSize: 14, color: colors.accent, fontWeight: '700', marginTop: 8 },

  stats: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginBottom: 24 },
  stat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  statNum: { fontSize: 24, fontWeight: '900', color: colors.accent },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  addRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  addInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  addButton: {
    backgroundColor: colors.accent, paddingHorizontal: 20, borderRadius: 50,
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: colors.accentText, fontWeight: '900', fontSize: 13 },

  list: { flex: 1, paddingHorizontal: 24 },
  inviteRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 8,
  },
  inviteName: { fontSize: 15, fontWeight: '600', color: colors.text },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
    backgroundColor: colors.surfaceBorder,
  },
  statusAccepted: { backgroundColor: '#064e3b' },
  statusDeclined: { backgroundColor: '#7f1d1d' },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },

  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, fontSize: 14 },

  footer: { padding: 24, gap: 12 },
  shareButton: {
    backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 1, borderColor: colors.accent,
  },
  shareButtonText: { fontSize: 15, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
  startButton: {
    backgroundColor: colors.accent, paddingVertical: 18, borderRadius: 50,
    alignItems: 'center',
  },
  startButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
