import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, StyleSheet } from 'react-native';
import type { RoomPlayer, SignalType } from '@chaos-agent/shared';
import { colors } from '@/theme/colors';

interface Props {
  visible: boolean;
  players: RoomPlayer[];
  myRoomPlayerId: string | null;
  onSend: (signalType: SignalType, targetPlayerId?: string) => void;
  onClose: () => void;
}

const SIGNALS: Array<{ type: SignalType; label: string; color: string }> = [
  { type: 'shake_it_up', label: 'SHAKE IT UP', color: colors.accent },
  { type: 'slow_your_roll', label: 'SLOW YOUR ROLL', color: '#4A9EFF' },
  { type: 'im_bored', label: "I'M BORED", color: colors.warning },
  { type: 'target_player', label: 'TARGET PLAYER', color: colors.error },
];

const HYPE_RESPONSES = [
  'Hell yeah, chaos incoming!',
  'You asked for it!',
  'Buckle up.',
  'Consider it done.',
  'The chaos gods have heard you.',
  'Say less.',
  'Oh it\'s ON.',
];

const CHILL_RESPONSES = [
  'Copy that, cooling off.',
  'Taking it down a notch.',
  'Chill mode activated.',
  'Roger, going quiet.',
];

const BORED_RESPONSES = [
  'Something\'s brewing...',
  'Hold tight, chaos inbound.',
  'We got you.',
  'Patience... or not.',
];

const TARGET_RESPONSES = [
  'Target acquired.',
  'They won\'t see it coming.',
  'Mission assigned.',
  'Locked on.',
];

function getResponse(type: SignalType): string {
  const pools: Record<SignalType, string[]> = {
    shake_it_up: HYPE_RESPONSES,
    slow_your_roll: CHILL_RESPONSES,
    im_bored: BORED_RESPONSES,
    target_player: TARGET_RESPONSES,
  };
  const pool = pools[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function SignalPanel({ visible, players, myRoomPlayerId, onSend, onClose }: Props) {
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [response, setResponse] = useState<{ text: string; color: string } | null>(null);
  const responseOpacity = useRef(new Animated.Value(0)).current;

  const otherPlayers = players.filter((p) => p.id !== myRoomPlayerId);

  const showResponse = (text: string, color: string) => {
    setResponse({ text, color });
    responseOpacity.setValue(1);
    Animated.timing(responseOpacity, {
      toValue: 0,
      duration: 2500,
      delay: 1200,
      useNativeDriver: true,
    }).start(() => {
      setResponse(null);
      onClose();
    });
  };

  const handleSignal = (type: SignalType) => {
    if (type === 'target_player') {
      setShowTargetPicker(true);
    } else {
      onSend(type);
      const signal = SIGNALS.find((s) => s.type === type)!;
      showResponse(getResponse(type), signal.color);
    }
  };

  const handleTarget = (targetId: string) => {
    onSend('target_player', targetId);
    setShowTargetPicker(false);
    showResponse(getResponse('target_player'), colors.error);
  };

  const handleClose = () => {
    setShowTargetPicker(false);
    setResponse(null);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
        <View style={styles.panel}>
          {response ? (
            <Animated.View style={[styles.responseContainer, { opacity: responseOpacity }]}>
              <Text style={[styles.responseText, { color: response.color }]}>{response.text}</Text>
              <Text style={styles.responsePoints}>+1 pt</Text>
            </Animated.View>
          ) : !showTargetPicker ? (
            <>
              <Text style={styles.title}>SEND A SIGNAL</Text>
              <View style={styles.buttons}>
                {SIGNALS.map((s) => (
                  <TouchableOpacity
                    key={s.type}
                    style={[styles.signalButton, { borderColor: s.color }]}
                    onPress={() => handleSignal(s.type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.signalLabel, { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>TARGET WHO?</Text>
              <View style={styles.buttons}>
                {otherPlayers.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.playerButton}
                    onPress={() => handleTarget(p.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.playerName}>{p.nickname}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowTargetPicker(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 16,
  },
  buttons: { gap: 8 },
  signalButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 2,
    alignItems: 'center',
  },
  signalLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  playerButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
  },
  playerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  backButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  backButtonText: { fontSize: 14, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  responseContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  responseText: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  responsePoints: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 8,
  },
});
