import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

type Tab = 'missions' | 'activity' | 'leaderboard';

export default function PlayScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('missions');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['missions', 'activity', 'leaderboard'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'missions' && (
          <View>
            <Text style={styles.placeholder}>Your secret missions will appear here</Text>
          </View>
        )}
        {activeTab === 'activity' && (
          <View>
            <Text style={styles.placeholder}>Claims and votes will appear here</Text>
          </View>
        )}
        {activeTab === 'leaderboard' && (
          <View>
            <Text style={styles.placeholder}>Scores will appear here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF3B30',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#FF3B30',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  placeholder: {
    color: '#444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 64,
  },
});
