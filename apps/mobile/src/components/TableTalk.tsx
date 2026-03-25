import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, Modal,
  Animated, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Message, RoomPlayer } from '@chaos-agent/shared';
import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';
import { colors } from '@/theme/colors';

type ChatTab = 'TABLE' | 'WHISPER';

// Deterministic avatar color from player ID
const AVATAR_COLORS = [
  '#FF8200', '#4A9EFF', '#10b981', '#fbbf24', '#ef4444',
  '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];

function getAvatarColor(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

interface Props {
  visible: boolean;
  roomId: string;
  myRoomPlayerId: string | null;
  players: RoomPlayer[];
  recentMessages: Message[];
  onClose: () => void;
}

export function TableTalk({ visible, roomId, myRoomPlayerId, players, recentMessages, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ChatTab>('TABLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [dmTarget, setDmTarget] = useState<RoomPlayer | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Player lookup map
  const playerMap = useRef<Record<string, RoomPlayer>>({});
  useEffect(() => {
    const map: Record<string, RoomPlayer> = {};
    for (const p of players) {
      map[p.id] = p;
    }
    playerMap.current = map;
  }, [players]);

  // Load initial messages from polling state + fetch full history when opened
  useEffect(() => {
    if (visible) {
      // Start with recent_messages from polling
      setMessages(recentMessages);
      // Fetch full history
      loadMessages();
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Merge polling messages into state while chat is open
  useEffect(() => {
    if (!visible) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newMsgs = recentMessages.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...prev, ...newMsgs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, [recentMessages, visible]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.getMessages({ room_id: roomId, limit: 50 });
      // API returns desc order, reverse for chronological display
      const sorted = [...res.messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setMessages(sorted);
    } catch {
      // Fall back to polling messages
    }
  }, [roomId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    try {
      const res = await api.sendMessage({
        room_id: roomId,
        content: text,
        recipient_id: dmTarget?.id,
      });

      // Optimistically add message
      const newMsg: Message = {
        id: res.message_id,
        room_id: roomId,
        sender_id: myRoomPlayerId!,
        recipient_id: dmTarget?.id ?? null,
        content: text,
        message_type: 'chat',
        created_at: res.created_at,
      };

      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // Restore input on failure
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, roomId, myRoomPlayerId, dmTarget]);

  const handlePlayerTap = useCallback((player: RoomPlayer) => {
    if (player.id === myRoomPlayerId) return;
    setDmTarget(player);
    setActiveTab('WHISPER');
    setShowPlayerPicker(false);
  }, [myRoomPlayerId]);

  const handleTabChange = useCallback((tab: ChatTab) => {
    setActiveTab(tab);
    if (tab === 'TABLE') {
      setDmTarget(null);
    } else if (tab === 'WHISPER' && !dmTarget) {
      setShowPlayerPicker(true);
    }
  }, [dmTarget]);

  // Filter messages based on active tab
  const filteredMessages = messages.filter((m) => {
    if (activeTab === 'TABLE') {
      return m.recipient_id === null;
    }
    // WHISPER tab: show DMs between me and the selected target
    if (!dmTarget) return m.recipient_id !== null && (m.sender_id === myRoomPlayerId || m.recipient_id === myRoomPlayerId);
    return (
      (m.sender_id === myRoomPlayerId && m.recipient_id === dmTarget.id) ||
      (m.sender_id === dmTarget.id && m.recipient_id === myRoomPlayerId)
    );
  });

  // DM conversations list (unique players I have DMs with)
  const dmPartners = (() => {
    const partnerIds = new Set<string>();
    for (const m of messages) {
      if (m.recipient_id === null) continue;
      if (m.sender_id === myRoomPlayerId && m.recipient_id) {
        partnerIds.add(m.recipient_id);
      } else if (m.recipient_id === myRoomPlayerId) {
        partnerIds.add(m.sender_id);
      }
    }
    return Array.from(partnerIds)
      .map((id) => playerMap.current[id])
      .filter(Boolean);
  })();

  const otherPlayers = players.filter((p) => p.id !== myRoomPlayerId);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const sender = playerMap.current[item.sender_id];
    const senderName = sender?.nickname ?? '???';
    const isMe = item.sender_id === myRoomPlayerId;
    const isSystem = item.message_type === 'system';
    const isDm = item.recipient_id !== null;
    const avatarColor = getAvatarColor(item.sender_id);

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && (
            <TouchableOpacity onPress={() => sender && handlePlayerTap(sender)}>
              <Text style={[styles.senderName, { color: avatarColor }]}>{senderName}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.messageText}>{item.content}</Text>
          <View style={styles.messageFooter}>
            {isDm && <Text style={styles.lockIcon}>🔒</Text>}
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  }, [myRoomPlayerId, handlePlayerTap]);

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View />
      </TouchableOpacity>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetInner}
          keyboardVerticalOffset={0}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>TABLE TALK</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeButton}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.chatTab, activeTab === 'TABLE' && styles.chatTabActive]}
              onPress={() => handleTabChange('TABLE')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chatTabText, activeTab === 'TABLE' && styles.chatTabTextActive]}>
                TABLE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatTab, activeTab === 'WHISPER' && styles.chatTabActive]}
              onPress={() => handleTabChange('WHISPER')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chatTabText, activeTab === 'WHISPER' && styles.chatTabTextActive]}>
                WHISPER
              </Text>
              {dmTarget && (
                <View style={styles.dmBadge}>
                  <Text style={styles.dmBadgeText}>{dmTarget.nickname}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Player picker for DM */}
          {showPlayerPicker && (
            <View style={styles.playerPicker}>
              <Text style={styles.pickerTitle}>WHISPER TO...</Text>
              {/* Existing DM partners first */}
              {dmPartners.length > 0 && (
                <>
                  <Text style={styles.pickerSubtitle}>RECENT</Text>
                  {dmPartners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.pickerItem}
                      onPress={() => handlePlayerTap(p)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.pickerAvatar, { backgroundColor: getAvatarColor(p.id) }]}>
                        <Text style={styles.avatarText}>{p.nickname.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.pickerName}>{p.nickname}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.pickerSubtitle}>ALL PLAYERS</Text>
                </>
              )}
              {otherPlayers.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickerItem}
                  onPress={() => handlePlayerTap(p)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: getAvatarColor(p.id) }]}>
                    <Text style={styles.avatarText}>{p.nickname.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.pickerName}>{p.nickname}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.pickerCancel}
                onPress={() => {
                  setShowPlayerPicker(false);
                  if (!dmTarget) setActiveTab('TABLE');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerCancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Messages */}
          {!showPlayerPicker && (
            <>
              {activeTab === 'WHISPER' && dmTarget && (
                <View style={styles.dmHeader}>
                  <Text style={styles.dmHeaderText}>
                    Whispering to {dmTarget.nickname}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPlayerPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dmChangeText}>CHANGE</Text>
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                ref={flatListRef}
                data={filteredMessages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: false })
                }
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyChatText}>
                      {activeTab === 'TABLE'
                        ? 'No messages yet. Start the table talk!'
                        : dmTarget
                        ? `Start a private conversation with ${dmTarget.nickname}`
                        : 'Select a player to whisper to'}
                    </Text>
                  </View>
                }
              />

              {/* Input */}
              <View style={styles.inputRow}>
                {activeTab === 'WHISPER' && dmTarget && (
                  <View style={styles.dmIndicator}>
                    <Text style={styles.dmIndicatorText}>🔒</Text>
                  </View>
                )}
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    activeTab === 'TABLE'
                      ? 'Say something to the table...'
                      : dmTarget
                      ? `Whisper to ${dmTarget.nickname}...`
                      : 'Select a player first...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  maxLength={500}
                  multiline
                  editable={activeTab === 'TABLE' || !!dmTarget}
                  returnKeyType="send"
                  blurOnSubmit
                  onSubmitEditing={handleSend}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || sending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sendButtonText}>
                    {sending ? '...' : 'SEND'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetInner: {
    flex: 1,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 2,
  },
  closeButton: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  chatTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  chatTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  chatTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  chatTabTextActive: {
    color: colors.accent,
  },
  dmBadge: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dmBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // DM header
  dmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  dmHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dmChangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 12,
    gap: 6,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 2,
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.bg,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: colors.accentBg,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#332200',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  lockIcon: {
    fontSize: 10,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // System messages
  systemMessage: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  systemText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Empty state
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyChatText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.bg,
  },
  dmIndicator: {
    paddingBottom: 10,
  },
  dmIndicatorText: {
    fontSize: 14,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 1,
  },

  // Player picker
  playerPicker: {
    flex: 1,
    padding: 16,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 16,
  },
  pickerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 6,
  },
  pickerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pickerCancel: {
    marginTop: 16,
    padding: 12,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  pickerCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
