import { useEffect, useRef, useCallback } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'error' | 'info';
  show: (message: string, type?: 'error' | 'info') => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'error',
  show: (message, type = 'error') => set({ message, type }),
  clear: () => set({ message: null }),
}));

/** Show a toast message globally */
export function showToast(message: string, type: 'error' | 'info' = 'error') {
  useToastStore.getState().show(message, type);
}

/** Place this component once in _layout.tsx */
export function ToastOverlay() {
  const { message, type, clear } = useToastStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (message) {
      opacity.setValue(1);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 3000,
        delay: 2000,
        useNativeDriver: true,
      }).start(() => clear());
    }
  }, [message, opacity, clear]);

  if (!message) return null;

  const bgColor = type === 'error' ? colors.error : colors.accent;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, top: insets.top + 8, backgroundColor: bgColor },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
