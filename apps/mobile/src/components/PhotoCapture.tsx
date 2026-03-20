import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Image,
  ActivityIndicator, Animated, StyleSheet, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { colors } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  missionId?: string;
  missionTitle?: string;
  onSubmit: (photo: string, caption: string, missionId?: string) => Promise<void>;
  onClose: () => void;
}

export function PhotoCapture({ visible, missionId, missionTitle, onSubmit, onClose }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const resetState = useCallback(() => {
    setImageUri(null);
    setCaption('');
    setSubmitting(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const pickFromCamera = async () => {
    setError(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Gallery permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) return;
    setSubmitting(true);
    setError(null);

    try {
      // Read file as base64
      const base64 = await readAsStringAsync(imageUri, {
        encoding: EncodingType.Base64,
      });

      await onSubmit(base64, caption, missionId);

      // Success flash
      fadeAnim.setValue(1);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }).start();

      resetState();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.photoBadge}>
                <Text style={styles.photoBadgeText}>PHOTO</Text>
              </View>
              {missionTitle && (
                <Text style={styles.missionLabel} numberOfLines={1}>{missionTitle}</Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} hitSlop={12}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Image preview or picker buttons */}
          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setImageUri(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.retakeText}>RETAKE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerPrompt}>
                {missionTitle ? 'Capture proof of your mission' : 'Snap a moment of chaos'}
              </Text>
              <TouchableOpacity style={styles.cameraButton} onPress={pickFromCamera} activeOpacity={0.8}>
                <Text style={styles.cameraButtonText}>TAKE PHOTO</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery} activeOpacity={0.8}>
                <Text style={styles.galleryButtonText}>PICK FROM GALLERY</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caption input */}
          {imageUri && (
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor={colors.textMuted}
              value={caption}
              onChangeText={setCaption}
              maxLength={140}
              multiline
              numberOfLines={2}
            />
          )}

          {/* Error */}
          {error && <Text style={styles.error}>{error}</Text>}

          {/* Submit */}
          {imageUri && (
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accentText} size="small" />
              ) : (
                <Text style={styles.submitText}>UPLOAD</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Success flash overlay */}
      <Animated.View style={[styles.successFlash, { opacity: fadeAnim }]} pointerEvents="none">
        <Text style={styles.successText}>CAPTURED!</Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  photoBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 50,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 2,
  },
  missionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  closeButton: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textMuted,
    paddingLeft: 12,
  },

  // Picker
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pickerPrompt: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 2,
  },
  galleryButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 50,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  galleryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },

  // Preview
  previewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  preview: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    maxWidth: 340,
    maxHeight: 340,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  retakeButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },

  // Caption
  captionInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
    maxHeight: 80,
  },

  // Error
  error: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accentText,
    letterSpacing: 3,
  },

  // Success flash
  successFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,185,129,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 6,
  },
});
