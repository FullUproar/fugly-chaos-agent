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
import * as Clipboard from 'expo-clipboard';
import type { SessionHighlightsResponse, GetSeasonInfoResponse, CapturedMoment } from '@chaos-agent/shared';
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
  const [seasonInfo, setSeasonInfo] = useState<GetSeasonInfoResponse | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const recapRef = useRef<ViewShot>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!roomId) return;
    Promise.all([
      api.getHighlights(roomId).then(setData).catch(() => {
        showToast('Failed to load results.');
      }),
      api.getPhotos(roomId).then((res) => setPhotos(res.photos)).catch(() => {}),
      api.getSeasonInfo(roomId).then(setSeasonInfo).catch(() => {}),
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

  // Generate share text template
  const generateShareText = (): string => {
    if (!data) return '';
    const winner = data.leaderboard[0];
    const season = seasonInfo?.season ?? room?.season_number;
    const episode = seasonInfo?.episode ?? room?.episode_number;
    const seTag = season && episode ? ` Season ${season}, Episode ${episode}.` : '';
    return `My crew just played Fugly's Chaos Agent! ${winner?.nickname ?? 'Someone'} won with ${winner?.score ?? 0} pts.${seTag} #ChaosAgent #FullUproar #GameNight`;
  };

  // Generate TikTok-ready viral captions
  const generateCaptions = (): string[] => {
    if (!data) return [];
    const captions: string[] = [];
    const winner = data.leaderboard[0];
    const season = seasonInfo?.season ?? room?.season_number;
    const episode = seasonInfo?.episode ?? room?.episode_number;
    const streak = room?.streak_count ?? seasonInfo?.current_streak;

    // Caption 1: bullshit-focused
    const totalBS = data.total_bullshits;
    if (totalBS > 0 && winner) {
      captions.push(`${winner.nickname} just survived ${totalBS} BULLSHIT calls at game night #ChaosAgent`);
    }

    // Caption 2: streak-focused
    if (streak && streak > 1 && season && episode) {
      captions.push(`Our crew's ${streak}-week streak is ALIVE! Season ${season} Episode ${episode} #GameNight`);
    }

    // Caption 3: highlight badge
    if (data.highlights.length > 0) {
      const h = data.highlights[0];
      captions.push(`${h.player_nickname} earned "${HIGHLIGHT_LABELS[h.type] ?? h.type}"! ${h.description} #FullUproar`);
    }

    // Caption 4: score + time
    if (winner) {
      captions.push(`${winner.score} pts of pure chaos. ${data.total_claims} claims, ${totalBS} bullshits. #ChaosAgent #GameNight`);
    }

    return captions.slice(0, 3);
  };

  const handleCopyCaption = async (caption: string) => {
    await Clipboard.setStringAsync(caption);
    showToast('Caption copied!');
  };

  const handleShareWithCaption = async (caption: string) => {
    if (sharing) return;
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
      // Copy caption to clipboard before sharing image
      await Clipboard.setStringAsync(caption);
      showToast('Caption copied to clipboard!');
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Chaos Agent recap',
      });
    } catch (err) {
      console.error('Share with caption error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyShareLink = async () => {
    const text = generateShareText();
    await Clipboard.setStringAsync(text);
    showToast('Share text copied!');
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
          {/* Season/Episode title card */}
          {seasonInfo && (
            <View style={styles.seasonHeader}>
              <Text style={styles.seasonTitle}>
                SEASON {seasonInfo.season}, EPISODE {seasonInfo.episode}
              </Text>
              {seasonInfo.crew_name && (
                <Text style={styles.crewName}>{seasonInfo.crew_name}</Text>
              )}
            </View>
          )}

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

          {/* PROMINENT Share Recap CTA */}
          {data && (
            <View style={styles.shareHeroSection}>
              <TouchableOpacity
                style={styles.shareHeroButton}
                onPress={() => setShowShareOptions(true)}
                activeOpacity={0.7}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator color={colors.accentText} size="small" />
                ) : (
                  <>
                    <Text style={styles.shareHeroButtonText}>SHARE RECAP</Text>
                    <Text style={styles.shareHeroSubtext}>Show your crew who dominated</Text>
                  </>
                )}
              </TouchableOpacity>
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

          {/* Captured Moments */}
          {data && data.moments && data.moments.length > 0 && (
            <View style={styles.momentsSection}>
              <Text style={styles.sectionTitle}>CAPTURED MOMENTS</Text>
              {data.moments.map((m) => (
                <View key={m.id} style={styles.momentCard}>
                  <Text style={styles.momentType}>
                    {m.moment_type === 'epic_claim' ? 'EPIC' :
                     m.moment_type === 'bullshit_call' ? 'BUSTED' :
                     m.moment_type === 'funny_quote' ? 'QUOTE' :
                     m.moment_type === 'mini_game_win' ? 'WINNER' :
                     m.moment_type.toUpperCase()}
                  </Text>
                  <Text style={styles.momentDesc}>{m.description}</Text>
                  {m.involved_players.length > 0 && (
                    <Text style={styles.momentPlayers}>{m.involved_players.join(', ')}</Text>
                  )}
                  {m.tick_minute != null && (
                    <Text style={styles.momentTime}>@ {m.tick_minute} min</Text>
                  )}
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
          {/* Streak banner */}
          {seasonInfo && seasonInfo.current_streak > 0 && (
            <View style={styles.streakBanner}>
              {seasonInfo.current_streak === 1 ? (
                <>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakText}>
                    The beginning of something great.{'\n'}Come back next week to start a streak.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakCount}>{seasonInfo.current_streak}-WEEK STREAK</Text>
                  <Text style={styles.streakText}>
                    The streak is alive! {seasonInfo.current_streak} weeks strong. Don't break it.
                  </Text>
                  {seasonInfo.longest_streak > seasonInfo.current_streak && (
                    <Text style={styles.streakRecord}>
                      Your record is {seasonInfo.longest_streak}. Can you beat it?
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

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
                  <Text style={styles.shareRecapButtonText}>SHARE TO INSTAGRAM / STORIES</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tikTokButton}
                onPress={() => setShowCaptions(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.tikTokButtonText}>TIKTOK CAPTION</Text>
              </TouchableOpacity>

              <View style={styles.shareSecondaryRow}>
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

                <TouchableOpacity
                  style={styles.copyLinkButton}
                  onPress={handleCopyShareLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyLinkButtonText}>COPY TEXT</Text>
                </TouchableOpacity>
              </View>
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
            seasonNumber={seasonInfo?.season ?? room?.season_number}
            episodeNumber={seasonInfo?.episode ?? room?.episode_number}
            streakCount={room?.streak_count ?? seasonInfo?.current_streak}
            crewName={room?.crew_name ?? seasonInfo?.crew_name}
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
    {/* Share options modal */}
    {showShareOptions && (
      <Modal transparent animationType="slide" onRequestClose={() => setShowShareOptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowShareOptions(false)} activeOpacity={1}>
          <View style={styles.shareModal}>
            <Text style={styles.shareModalTitle}>SHARE YOUR RECAP</Text>

            <TouchableOpacity style={styles.shareOption} onPress={() => { setShowShareOptions(false); handleShareRecap(); }} activeOpacity={0.7}>
              <Text style={styles.shareOptionText}>Share to Instagram / Stories</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={() => { setShowShareOptions(false); setShowCaptions(true); }} activeOpacity={0.7}>
              <Text style={styles.shareOptionText}>TikTok Caption</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={() => { setShowShareOptions(false); handleCopyShareLink(); }} activeOpacity={0.7}>
              <Text style={styles.shareOptionText}>Copy Share Text</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={() => { setShowShareOptions(false); handleSaveToPhotos(); }} activeOpacity={0.7}>
              <Text style={styles.shareOptionText}>Save to Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareModalCancel} onPress={() => setShowShareOptions(false)} activeOpacity={0.7}>
              <Text style={styles.shareModalCancelText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    )}

    {/* TikTok captions modal */}
    {showCaptions && (
      <Modal transparent animationType="slide" onRequestClose={() => setShowCaptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCaptions(false)} activeOpacity={1}>
          <View style={styles.captionsModal}>
            <Text style={styles.captionsModalTitle}>VIRAL CAPTIONS</Text>
            <Text style={styles.captionsModalSubtext}>Tap to copy, hold to share with image</Text>

            {generateCaptions().map((caption, i) => (
              <TouchableOpacity
                key={i}
                style={styles.captionCard}
                onPress={() => handleCopyCaption(caption)}
                onLongPress={() => { setShowCaptions(false); handleShareWithCaption(caption); }}
                activeOpacity={0.7}
              >
                <Text style={styles.captionText}>{caption}</Text>
                <Text style={styles.captionAction}>TAP TO COPY</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.shareModalCancel} onPress={() => setShowCaptions(false)} activeOpacity={0.7}>
              <Text style={styles.shareModalCancelText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 48 },
  // Season header
  seasonHeader: {
    alignItems: 'center', marginBottom: 8,
  },
  seasonTitle: {
    fontSize: 18, fontWeight: '900', color: colors.accent,
    letterSpacing: 3, textAlign: 'center',
  },
  crewName: {
    fontSize: 14, fontWeight: '600', color: colors.highlight,
    letterSpacing: 1, marginTop: 4, textAlign: 'center',
  },

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

  // Streak banner
  streakBanner: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 20,
    borderWidth: 2, borderColor: colors.accent, marginBottom: 16,
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 36, marginBottom: 8,
  },
  streakCount: {
    fontSize: 24, fontWeight: '900', color: colors.accent,
    letterSpacing: 2, marginBottom: 4,
  },
  streakText: {
    fontSize: 15, fontWeight: '600', color: colors.text,
    textAlign: 'center', lineHeight: 22,
  },
  streakRecord: {
    fontSize: 13, color: colors.highlight, marginTop: 8,
    fontWeight: '600', letterSpacing: 0.5,
  },

  // Share hero (prominent CTA after stats)
  shareHeroSection: {
    marginBottom: 24,
  },
  shareHeroButton: {
    backgroundColor: colors.accent, paddingVertical: 22, paddingHorizontal: 32,
    borderRadius: 16, alignItems: 'center', minHeight: 72,
    justifyContent: 'center',
  },
  shareHeroButtonText: {
    fontSize: 20, fontWeight: '900', color: colors.accentText, letterSpacing: 3,
  },
  shareHeroSubtext: {
    fontSize: 12, fontWeight: '600', color: colors.accentText, opacity: 0.7,
    marginTop: 4, letterSpacing: 1,
  },

  // Moments section
  momentsSection: { marginTop: 16, marginBottom: 8 },
  momentCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 8,
  },
  momentType: {
    fontSize: 10, fontWeight: '900', color: colors.warning,
    letterSpacing: 2, marginBottom: 4,
  },
  momentDesc: { fontSize: 14, fontWeight: '600', color: colors.text },
  momentPlayers: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  momentTime: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Share section (footer)
  shareSection: {
    marginTop: 20,
    gap: 10,
  },
  shareRecapButton: {
    backgroundColor: colors.accent, paddingVertical: 18, paddingHorizontal: 48,
    borderRadius: 50, alignItems: 'center', minHeight: 56,
    justifyContent: 'center',
  },
  shareRecapButtonText: { fontSize: 14, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
  tikTokButton: {
    backgroundColor: '#111827', paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 50, alignItems: 'center', borderWidth: 2, borderColor: '#FF0050',
    minHeight: 52, justifyContent: 'center',
  },
  tikTokButtonText: { fontSize: 14, fontWeight: '900', color: '#FF0050', letterSpacing: 2 },
  shareSecondaryRow: {
    flexDirection: 'row', gap: 10,
  },
  savePhotosButton: {
    flex: 1,
    backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 50, alignItems: 'center', borderWidth: 1, borderColor: colors.accent,
    minHeight: 48, justifyContent: 'center',
  },
  savePhotosButtonText: { fontSize: 12, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
  copyLinkButton: {
    flex: 1,
    backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 50, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
    minHeight: 48, justifyContent: 'center',
  },
  copyLinkButtonText: { fontSize: 12, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1 },

  // Share options modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  shareModalTitle: {
    fontSize: 18, fontWeight: '900', color: colors.text,
    letterSpacing: 2, textAlign: 'center', marginBottom: 20,
  },
  shareOption: {
    paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 12, backgroundColor: colors.bg, marginBottom: 8,
    minHeight: 52, justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  shareModalCancel: {
    paddingVertical: 14, marginTop: 8, alignItems: 'center',
    minHeight: 44, justifyContent: 'center',
  },
  shareModalCancelText: {
    fontSize: 14, fontWeight: '900', color: colors.textMuted, letterSpacing: 2,
  },

  // Captions modal
  captionsModal: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  captionsModalTitle: {
    fontSize: 18, fontWeight: '900', color: colors.text,
    letterSpacing: 2, textAlign: 'center', marginBottom: 4,
  },
  captionsModalSubtext: {
    fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 20,
  },
  captionCard: {
    backgroundColor: colors.bg, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 10,
  },
  captionText: {
    fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20,
  },
  captionAction: {
    fontSize: 10, fontWeight: '900', color: colors.accent, letterSpacing: 2,
    marginTop: 8,
  },

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
