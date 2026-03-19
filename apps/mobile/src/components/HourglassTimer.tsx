import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface Props {
  seconds: number;
  totalSeconds: number;
  size?: number;
}

export function HourglassTimer({ seconds, totalSeconds, size = 56 }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isUrgent = seconds <= 10;
  const isCritical = seconds <= 5;

  // Pulse when critical
  useEffect(() => {
    if (isCritical) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCritical, pulseAnim]);

  const progress = totalSeconds > 0 ? seconds / totalSeconds : 0;
  const ringColor = isCritical ? colors.error : isUrgent ? colors.warning : colors.accent;
  const borderWidth = 4;
  const radius = size / 2;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Background ring */}
      <View style={[styles.ring, {
        width: size, height: size, borderRadius: radius,
        borderWidth,
        borderColor: colors.surfaceBorder,
      }]}>
        {/* Progress ring - using border trick for quarters */}
        <View style={[styles.ringOverlay, {
          width: size, height: size, borderRadius: radius,
          borderWidth,
          borderColor: ringColor,
          borderTopColor: progress > 0.75 ? ringColor : 'transparent',
          borderRightColor: progress > 0.5 ? ringColor : 'transparent',
          borderBottomColor: progress > 0.25 ? ringColor : 'transparent',
          borderLeftColor: progress > 0 ? ringColor : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }]} />

        {/* Center text */}
        <View style={styles.center}>
          <Text style={[styles.seconds, { color: ringColor, fontSize: size * 0.35 }]}>
            {seconds}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOverlay: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    fontWeight: '900',
    letterSpacing: -1,
  },
});
