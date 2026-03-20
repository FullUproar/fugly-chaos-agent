import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Share, Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/theme/colors';

interface Props {
  visible: boolean;
  roomCode: string;
  onClose: () => void;
}

export function RoomCodeShare({ visible, roomCode, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const copiedAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, fadeAnim]);

  const handleShare = async () => {
    const deepLink = `fulluproar://chaos/${roomCode}`;
    const message = `Join my Chaos Agent room!\n\nRoom Code: ${roomCode}\n\n${deepLink}`;

    try {
      await Share.share({
        message,
        title: 'Join Chaos Agent',
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(roomCode);

    // Flash "COPIED" feedback
    copiedAnim.setValue(1);
    Animated.timing(copiedAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  };

  if (!visible) return null;

  const qrValue = `fulluproar://chaos/${roomCode}`;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeHit} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>

            {/* Room code label */}
            <Text style={styles.label}>ROOM CODE</Text>

            {/* Big room code */}
            <Text style={styles.roomCode}>{roomCode}</Text>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrBg}>
                <QRCode
                  value={qrValue}
                  size={180}
                  color={colors.bg}
                  backgroundColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Scan prompt */}
            <Text style={styles.scanText}>Scan to join</Text>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
                <Text style={styles.shareButtonText}>SHARE</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.8}>
                <Text style={styles.copyButtonText}>COPY CODE</Text>
              </TouchableOpacity>
            </View>

            {/* Copied toast */}
            <Animated.View style={[styles.copiedToast, { opacity: copiedAnim }]} pointerEvents="none">
              <Text style={styles.copiedText}>COPIED!</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    position: 'relative',
  },
  closeHit: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textMuted,
  },

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 3,
    marginBottom: 8,
  },
  roomCode: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 8,
    marginBottom: 24,
  },

  // QR
  qrContainer: {
    marginBottom: 12,
  },
  qrBg: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  scanText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 24,
    letterSpacing: 1,
  },

  // Actions
  actions: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 3,
  },
  copyButton: {
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 2,
  },

  // Copied toast
  copiedToast: {
    position: 'absolute',
    bottom: -40,
    backgroundColor: colors.success,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 50,
  },
  copiedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});
