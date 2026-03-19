import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { colors } from '@/theme/colors';

interface Props {
  visible: boolean;
  onAccept: () => void;
}

const RULES = [
  {
    title: "Keep it fun, not mean",
    body: "Chaos is about laughter, not tears. If a mission feels wrong, skip it. Nobody gets hurt on Fugly's watch.",
  },
  {
    title: "What happens at game night stays at game night",
    body: "Screenshots of the leaderboard are fine. Screenshots of someone's wildcard answer are NOT.",
  },
  {
    title: "No one has to do anything",
    body: "Every mission is optional. If someone doesn't want to, that's cool. Peer pressure is for amateurs.",
  },
  {
    title: "The BULLSHIT button exists for a reason",
    body: "Think someone's faking it? Call them out. That's the game. Just be ready to be wrong.",
  },
  {
    title: "Signals are your voice",
    body: "Too much chaos? Hit 'Slow your roll.' Not enough? 'Shake it up.' The game listens.",
  },
  {
    title: "The host is the final word",
    body: "Disputes? The host decides. Don't like it? Become the host next time.",
  },
];

export function CodeOfChaos({ visible, onAccept }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>THE CODE OF CHAOS</Text>
          <Text style={styles.subtitle}>Read this. Live this. Then wreak havoc.</Text>

          {RULES.map((rule, i) => (
            <View key={i} style={styles.rule}>
              <Text style={styles.ruleNumber}>{i + 1}</Text>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <Text style={styles.ruleBody}>{rule.body}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.footer}>
            Fugly is watching. Be chaotic. Be kind. Be legendary.
          </Text>
        </ScrollView>

        <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.8}>
          <Text style={styles.acceptButtonText}>I ACCEPT THE CHAOS</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 100 },
  title: {
    fontSize: 28, fontWeight: '900', color: colors.accent,
    letterSpacing: 4, textAlign: 'center', marginTop: 48, marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32,
  },
  rule: {
    flexDirection: 'row', marginBottom: 20, gap: 14,
  },
  ruleNumber: {
    fontSize: 24, fontWeight: '900', color: colors.accent, width: 30, textAlign: 'center',
  },
  ruleContent: { flex: 1 },
  ruleTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  ruleBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  footer: {
    fontSize: 14, color: colors.highlight, textAlign: 'center',
    fontStyle: 'italic', marginTop: 16,
  },
  acceptButton: {
    position: 'absolute', bottom: 32, left: 24, right: 24,
    backgroundColor: colors.accent, paddingVertical: 18, borderRadius: 50,
    alignItems: 'center',
  },
  acceptButtonText: { fontSize: 16, fontWeight: '900', color: colors.accentText, letterSpacing: 2 },
});
