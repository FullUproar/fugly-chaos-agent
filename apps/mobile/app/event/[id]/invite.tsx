import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, SectionList,
  ActivityIndicator, StyleSheet, Share, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { showToast } from '@/components/Toast';
import { colors } from '@/theme/colors';

interface InviteItem {
  id: string;
  invite_name: string | null;
  status: string;
  invite_token: string;
}

interface TeaserItem {
  id: string;
  message: string;
  teaser_type: string;
  sent_at: string;
}

function TeaserCard({ teaser, isNew }: { teaser: TeaserItem; isNew: boolean }) {
  const fadeAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? 20 : 0)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Animated.View
      style={[
        styles.teaserCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.teaserMessage}>{teaser.message}</Text>
      <Text style={styles.teaserTime}>{formatTime(teaser.sent_at)}</Text>
    </Animated.View>
  );
}

export default function InviteManagementScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [teasers, setTeasers] = useState<TeaserItem[]>([]);
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [seenTeaserIds, setSeenTeaserIds] = useState<Set<string>>(new Set());
  const [inviteName, setInviteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [goingToLobby, setGoingToLobby] = useState(false);
  const insets = useSafeAreaInsets();

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

  const fetchTeasers = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await api.getTeasers(roomId);
      const prevIds = new Set(teasers.map(t => t.id));
      setTeasers(res.teasers);
      setDaysUntil(res.days_until_event);
      // Track which teasers are newly seen for animation
      setSeenTeaserIds(prevIds);
    } catch {
      // Silently fail
    }
  }, [roomId, teasers]);

  useEffect(() => {
    fetchState();
    fetchTeasers();
    const stateInterval = setInterval(fetchState, 5000);
    const teaserInterval = setInterval(fetchTeasers, 30000); // Check for new teasers every 30s
    return () => {
      clearInterval(stateInterval);
      clearInterval(teaserInterval);
    };
  }, [fetchState]);

  // Fetch teasers once on mount
  useEffect(() => {
    fetchTeasers();
  }, [roomId]);

  const handleInvite = async () => {
    if (!inviteName.trim() || !roomId || sending) return;
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
      showToast((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleStartLobby = () => {
    if (goingToLobby) return;
    const accepted = invites.filter(i => i.status === 'ACCEPTED').length;
    if (accepted < 1) {
      Alert.alert('Hold on', 'Wait for at least one player to accept.');
      return;
    }
    setGoingToLobby(true);
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        data={[]}
        renderItem={null}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.heading}>Your Event</Text>
              {scheduledAt && <Text style={styles.date}>{formatDate(scheduledAt)}</Text>}
              <Text style={styles.code}>Room Code: {roomCode}</Text>
            </View>

            {/* Countdown */}
            {daysUntil !== null && daysUntil > 0 && (
              <View style={styles.countdownBanner}>
                <Text style={styles.countdownNumber}>{daysUntil}</Text>
                <Text style={styles.countdownLabel}>
                  {daysUntil === 1 ? 'DAY UNTIL CHAOS' : 'DAYS UNTIL CHAOS'}
                </Text>
              </View>
            )}
            {daysUntil === 0 && (
              <View style={[styles.countdownBanner, styles.countdownToday]}>
                <Text style={styles.countdownTodayText}>CHAOS IS TODAY</Text>
              </View>
            )}

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

            {/* Invite list */}
            {invites.length > 0 && (
              <View style={styles.inviteSection}>
                {invites.map((item) => (
                  <View key={item.id} style={styles.inviteRow}>
                    <Text style={styles.inviteName} numberOfLines={1} ellipsizeMode="tail">
                      {item.invite_name ?? 'Unknown'}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      item.status === 'ACCEPTED' && styles.statusAccepted,
                      item.status === 'DECLINED' && styles.statusDeclined,
                    ]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {invites.length === 0 && (
              <Text style={styles.empty}>No invites yet. Add your squad above!</Text>
            )}

            {/* Teaser feed */}
            {teasers.length > 0 && (
              <View style={styles.teaserSection}>
                <Text style={styles.teaserSectionTitle}>TRANSMISSIONS FROM THE CHAOS AGENT</Text>
                {teasers.map((teaser) => (
                  <TeaserCard
                    key={teaser.id}
                    teaser={teaser}
                    isNew={!seenTeaserIds.has(teaser.id)}
                  />
                ))}
              </View>
            )}
          </>
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
          style={[styles.startButton, goingToLobby && styles.buttonDisabled]}
          onPress={handleStartLobby}
          disabled={goingToLobby}
          activeOpacity={0.8}
        >
          {goingToLobby ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.startButtonText}>GO TO LOBBY</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 24, paddingBottom: 16 },
  heading: { fontSize: 24, fontWeight: '900', color: colors.text },
  date: { fontSize: 15, color: colors.highlight, marginTop: 4 },
  code: { fontSize: 15, color: colors.accent, fontWeight: '700', marginTop: 8 },

  // Countdown
  countdownBanner: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 2,
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 4,
    marginTop: 4,
  },
  countdownToday: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accent,
  },
  countdownTodayText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 4,
  },

  stats: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginBottom: 24 },
  stat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  statNum: { fontSize: 24, fontWeight: '900', color: colors.accent },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  addRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  addInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.surfaceBorder,
    minHeight: 52,
  },
  addButton: {
    backgroundColor: colors.accent, paddingHorizontal: 20, borderRadius: 50,
    justifyContent: 'center', minHeight: 52, minWidth: 80, alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: colors.accentText, fontWeight: '900', fontSize: 14 },

  inviteSection: { paddingHorizontal: 24 },
  inviteRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 8,
    minHeight: 52,
  },
  inviteName: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
    backgroundColor: colors.surfaceBorder,
  },
  statusAccepted: { backgroundColor: '#064e3b' },
  statusDeclined: { backgroundColor: '#7f1d1d' },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },

  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32, fontSize: 15, marginBottom: 16 },

  // Teaser feed
  teaserSection: {
    paddingHorizontal: 24,
    marginTop: 24,
    paddingBottom: 16,
  },
  teaserSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 3,
    marginBottom: 12,
    textAlign: 'center',
  },
  teaserCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  teaserMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  teaserTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 8,
    letterSpacing: 1,
  },

  footer: { padding: 24, gap: 12 },
  shareButton: {
    backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 50,
    alignItems: 'center', borderWidth: 1, borderColor: colors.accent, minHeight: 52,
  },
  shareButtonText: { fontSize: 15, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
  startButton: {
    backgroundColor: colors.accent, paddingVertical: 18, borderRadius: 50,
    alignItems: 'center', minHeight: 60,
  },
  buttonDisabled: { opacity: 0.6 },
  startButtonText: { fontSize: 18, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
