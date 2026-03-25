import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Image, Modal,
  ActivityIndicator, Dimensions, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import type { SessionHighlightsResponse } from '@chaos-agent/shared';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { showToast } from '@/components/Toast';
import { colors } from '@/theme/colors';
import AHQConnect from '@/components/AHQConnect';
import RecapCard from '@/components/RecapCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_GRID_GAP = 4;
const PHOTO_COLS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - PHOTO_GRID_GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;

interface PhotoItem {
  id: string;
  room_player_id: string;
  nickname: string;
  mission_id: string | null;
  caption: string | null;
  photo_url: string;
  created_at: string;
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  most_bullshitted: 'Most Called Out',
  biggest_bluffer: 'Biggest Bluffer',
  most_points_single: 'Biggest Mission',
  most_contested: 'Most Contested',
};

const AHQ_DISMISS_KEY = 'ahq_connect_dismissed';

export default function ResultsScreen() {
  const { roomId, room, players, reset } = useSessionStore();
  const [data, setData] = useState<SessionHighlightsResponse | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [expandedPhoto, setExpandedPhoto] = useState<PhotoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ahqSynced, setAhqSynced] = useState(false);
  const [ahqSyncCount, setAhqSyncCount] = useState(0);
  const [isAhqLinked, setIsAhqLinked] = useState(false);
  const [showAhqPrompt, setShowAhqPrompt] = useState(false);
  const recapRef = useRef<ViewShot>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!roomId) return;
    Promise.all([
      api.getHighlights(roomId).then(setData).catch(() => {
        showToast('Failed to load results.');
      }),
      api.getPhotos(roomId).then((res) => setPhotos(res.photos)).catch(() => {}),
    ]).finally(() => setLoading(false));

    // Sync to AHQ after game ends
    api.syncToAHQ(roomId)
      .then((res) => {
        if (res.synced_players > 0) {
          setAhqSynced(true);
          setAhqSyncCount(res.synced_players);
        }
      })
      .catch(() => {});

    // Check if this player is linked
    api.getPlayerProfile()
      .then((res) => {
        if (res.profile) {
          setIsAhqLinked(true);
        } else {
          // Show connect prompt for unlinked players (if not previously dismissed)
          AsyncStorage.getItem(AHQ_DISMISS_KEY).then((val) => {
            if (!val) setShowAhqPrompt(true);
          });
        }
      })
      .catch(() => {});
  }, [roomId]);

  const dismissAhqPrompt = () => {
    setShowAhqPrompt(false);
    AsyncStorage.setItem(AHQ_DISMISS_KEY, 'true').catch(() => {});
  };

  const handleHome = () => {
    reset();
    router.replace('/');
  };

  const captureRecap = async (): Promise<string | null> => {
    try {
      if (!recapRef.current?.capture) return null;
      const uri = await recapRef.current.capture();
      return uri;
    } catch (err) {
      console.error('Failed to capture recap:', err);
      return null;
    }
  };

  const handleShareRecap = async () => {
    if (!data || sharing) return;
    setSharing(true);
    try {
      const uri = await captureRecap();
      if (!uri) {
        Alert.alert('Error', 'Failed to generate recap image.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Chaos Agent recap',
      });
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleSaveToPhotos = async () => {
    if (!data || saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to save the recap.');
        return;
      }
      const uri = await captureRecap();
      if (!uri) {
        Alert.alert('Error', 'Failed to generate recap image.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      showToast('Recap saved to photos!');
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save recap to photos.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
    <FlatList
      data={data?.leaderboard ?? []}
      keyExtractor={(item) => item.room_player_id}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>GAME OVER</Text>

          {/* Stats row */}
          {data && (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.total_claims}</Text>
                <Text style={styles.statLabel}>Claims</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.total_bullshits}</Text>
                <Text style={styles.statLabel}>Bullshits</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.total_missions}</Text>
                <Text style={styles.statLabel}>Missions</Text>
              </View>
            </View>
          )}

          {/* Highlights */}
          {data && data.highlights.length > 0 && (
            <View style={styles.highlightsSection}>
              <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
              {data.highlights.map((h, i) => (
                <View key={i} style={styles.highlightCard}>
                  <Text style={styles.highlightType}>
                    {HIGHLIGHT_LABELS[h.type] ?? h.type}
                  </Text>
                  <Text style={styles.highlightPlayer} numberOfLines={1} ellipsizeMode="tail">
                    {h.player_nickname}
                  </Text>
                  <Text style={styles.highlightDesc}>{h.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Photos grid */}
          {photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.sectionTitle}>PHOTOS</Text>
              <View style={styles.photoGrid}>
                {photos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    activeOpacity={0.7}
                    onPress={() => setExpandedPhoto(photo)}
                    style={styles.photoTouchable}
                  >
                    <Image
                      source={{ uri: photo.photo_url }}
                      style={styles.photoThumb}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>FINAL STANDINGS</Text>
        </>
      }
      renderItem={({ item, index }) => (
        <View style={[styles.scoreRow, index === 0 && styles.scoreRowFirst]}>
          <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
            {index + 1}
          </Text>
          <View style={styles.playerInfo}>
            <Text style={[styles.nickname, index === 0 && styles.nicknameFirst]} numberOfLines={1} ellipsizeMode="tail">
              {item.nickname}
            </Text>
            <Text style={styles.claimStats}>
              {item.claims_won}W / {item.claims_lost}L
            </Text>
          </View>
          <Text style={[styles.score, index === 0 && styles.scoreFirst]}>
            {item.score}
          </Text>
        </View>
      )}
      ListFooterComponent={
        <>
          {/* Share / Save recap buttons */}
          {data && (
            <View style={styles.shareSection}>
              <TouchableOpacity
                style={styles.shareRecapButton}
                onPress={handleShareRecap}
                activeOpacity={0.7}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator color={colors.accentText} size="small" />
                ) : (
                  <Text style={styles.shareRecapButtonText}>SHARE RECAP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.savePhotosButton}
                onPress={handleSaveToPhotos}
                activeOpacity={0.7}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : (
                  <Text style={styles.savePhotosButtonText}>SAVE TO PHOTOS</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* AHQ sync confirmation for linked players */}
          {/* Enable when fulluproar.com/auth/chaos-agent is live */}
          {false && ahqSynced && isAhqLinked && (
            <View style={styles.ahqSyncBanner}>
              <Text style={styles.ahqSyncText}>Stats updated on Afterroar HQ</Text>
              <Text style={styles.ahqSyncDetail}>
                {ahqSyncCount} player{ahqSyncCount !== 1 ? 's' : ''} synced
              </Text>
            </View>
          )}

          {/* AHQ connect prompt for unlinked players */}
          {/* Enable when fulluproar.com/auth/chaos-agent is live */}
          {false && showAhqPrompt && !isAhqLinked && (
            <View style={styles.ahqPromptBanner}>
              <Text style={styles.ahqPromptText}>
                Want to keep your chaos stats?
              </Text>
              <AHQConnect onLinked={() => {
                setIsAhqLinked(true);
                setShowAhqPrompt(false);
                showToast('Your stats are now linked!');
              }} />
              <TouchableOpacity onPress={dismissAhqPrompt} activeOpacity={0.7} style={styles.ahqDismissTouch}>
                <Text style={styles.ahqDismissText}>Not now</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.homeButton} onPress={handleHome} activeOpacity={0.7}>
            <Text style={styles.homeButtonText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </>
      }
    />

    {/* Off-screen RecapCard for image capture */}
    {data && (
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={recapRef} options={{ format: 'png', quality: 1 }}>
          <RecapCard
            data={data}
            gameType={room?.game_type}
            date={room?.ended_at ?? room?.started_at ?? new Date().toISOString()}
            playerCount={players.length}
          />
        </ViewShot>
      </View>
    )}

    {/* Expanded photo modal */}
    {expandedPhoto && (
      <Modal transparent animationType="fade" onRequestClose={() => setExpandedPhoto(null)}>
        <TouchableOpacity style={styles.photoOverlay} onPress={() => setExpandedPhoto(null)} activeOpacity={1}>
          <View>
            <Image
              source={{ uri: expandedPhoto.photo_url }}
              style={styles.photoFull}
              resizeMode="contain"
            />
            <View style={styles.photoCaptionBar}>
              <Text style={styles.photoNickname}>{expandedPhoto.nickname}</Text>
              {expandedPhoto.caption ? (
                <Text style={styles.photoCaption}>{expandedPhoto.caption}</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.photoCloseButton}
            onPress={() => setExpandedPhoto(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.photoCloseText}>X</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  heading: {
    fontSize: 36, fontWeight: '900', color: colors.accent,
    letterSpacing: 4, textAlign: 'center', marginBottom: 24,
  },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 2, letterSpacing: 1 },

  // Highlights
  highlightsSection: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 2, marginBottom: 12,
  },
  highlightCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 8,
  },
  highlightType: { fontSize: 12, fontWeight: '700', color: colors.warning, letterSpacing: 1, marginBottom: 4 },
  highlightPlayer: { fontSize: 18, fontWeight: '700', color: colors.text },
  highlightDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  // Leaderboard
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 10, marginBottom: 8, minHeight: 56,
  },
  scoreRowFirst: { backgroundColor: colors.accentBg, borderWidth: 1, borderColor: colors.accent },
  rank: { fontSize: 20, fontWeight: '800', color: colors.textMuted, width: 36 },
  rankFirst: { color: colors.accent },
  playerInfo: { flex: 1 },
  nickname: { fontSize: 16, fontWeight: '600', color: colors.text },
  nicknameFirst: { color: colors.accent },
  claimStats: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  score: { fontSize: 24, fontWeight: '800', color: colors.textSecondary },
  scoreFirst: { color: colors.accent },

  // Photos
  photosSection: { marginTop: 24, marginBottom: 8 },
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: PHOTO_GRID_GAP,
  },
  photoTouchable: { minWidth: 44, minHeight: 44 },
  photoThumb: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8,
    backgroundColor: colors.surface,
  },

  // Photo expanded modal
  photoOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  photoFull: {
    width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32,
    borderRadius: 12,
  },
  photoCaptionBar: {
    marginTop: 12, alignItems: 'center',
  },
  photoNickname: {
    fontSize: 16, fontWeight: '700', color: colors.accent, letterSpacing: 1,
  },
  photoCaption: {
    fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center',
  },
  photoCloseButton: {
    position: 'absolute', top: 60, right: 24,
    padding: 12, minWidth: 44, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  photoCloseText: {
    fontSize: 22, fontWeight: '900', color: colors.textMuted,
  },

  // Share section
  shareSection: {
    marginTop: 20,
    gap: 10,
  },
  shareRecapButton: {
    backgroundColor: colors.accent, paddingVertical: 18, paddingHorizontal: 48,
    borderRadius: 50, alignItems: 'center', minHeight: 56,
    justifyContent: 'center',
  },
  shareRecapButtonText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  savePhotosButton: {
    backgroundColor: colors.surface, paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 50, alignItems: 'center', borderWidth: 1, borderColor: colors.accent,
    minHeight: 52, justifyContent: 'center',
  },
  savePhotosButtonText: { fontSize: 14, fontWeight: '900', color: colors.accent, letterSpacing: 2 },

  // Off-screen capture area
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },

  // AHQ sync banner
  ahqSyncBanner: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.success, marginTop: 16,
    alignItems: 'center',
  },
  ahqSyncText: {
    fontSize: 14, fontWeight: '700', color: colors.success, letterSpacing: 1,
  },
  ahqSyncDetail: {
    fontSize: 12, color: colors.textMuted, marginTop: 4,
  },

  // AHQ connect prompt
  ahqPromptBanner: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginTop: 16,
    alignItems: 'center',
  },
  ahqPromptText: {
    fontSize: 14, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 12, textAlign: 'center',
  },
  ahqDismissTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  ahqDismissText: {
    fontSize: 13, color: colors.textMuted, marginTop: 8,
  },

  // Home button
  homeButton: {
    backgroundColor: colors.surface, paddingVertical: 20, paddingHorizontal: 48,
    borderRadius: 50, borderWidth: 1, borderColor: colors.surfaceBorder,
    alignItems: 'center', marginTop: 24, minHeight: 60,
  },
  homeButtonText: { fontSize: 16, fontWeight: '900', color: colors.text, letterSpacing: 2 },
});
