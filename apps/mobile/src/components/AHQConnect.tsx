import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { api } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { useSessionStore } from '@/stores/session-store';

const AHQ_AUTH_URL = 'https://fulluproar.com/auth/chaos-agent';
const AHQ_CALLBACK_PREFIX = 'https://fulluproar.com/auth/chaos-agent/callback';

interface AHQConnectProps {
  onLinked?: (displayName: string, chaosTitle: string) => void;
}

export default function AHQConnect({ onLinked }: AHQConnectProps) {
  const [showWebView, setShowWebView] = useState(false);
  const [linking, setLinking] = useState(false);
  const roomPlayerId = useSessionStore((s) => s.roomPlayerId);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationChange = useCallback(async (navState: WebViewNavigation) => {
    const { url } = navState;

    // Watch for the OAuth callback URL containing the token
    if (url.startsWith(AHQ_CALLBACK_PREFIX)) {
      setShowWebView(false);
      setLinking(true);

      try {
        // Extract token from callback URL
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');

        if (!token) {
          showToast('Connection failed — no token received');
          setLinking(false);
          return;
        }

        const result = await api.linkAHQAccount({
          ahq_token: token,
          room_player_id: roomPlayerId ?? undefined,
        });

        if (result.linked) {
          showToast(`Connected as ${result.display_name}!`);
          onLinked?.(result.display_name, result.chaos_title);
        } else {
          showToast('Connection failed — try again');
        }
      } catch (err) {
        showToast('Connection failed — try again');
      } finally {
        setLinking(false);
      }
    }
  }, [roomPlayerId, onLinked]);

  return (
    <>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => setShowWebView(true)}
        activeOpacity={0.8}
        disabled={linking}
      >
        {linking ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <>
            <Text style={styles.connectIcon}>&#x26A1;</Text>
            <View style={styles.connectTextWrap}>
              <Text style={styles.connectTitle}>Connect to Afterroar HQ</Text>
              <Text style={styles.connectSubtitle}>Track your chaos stats across game nights</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWebView(false)}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={() => setShowWebView(false)} activeOpacity={0.7}>
              <Text style={styles.webViewClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Afterroar HQ</Text>
            <View style={{ width: 60 }} />
          </View>
          <WebView
            ref={webViewRef}
            source={{ uri: AHQ_AUTH_URL }}
            onNavigationStateChange={handleNavigationChange}
            style={styles.webView}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  connectButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  connectIcon: {
    fontSize: 24,
  },
  connectTextWrap: {
    flex: 1,
  },
  connectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  connectSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // WebView modal
  webViewContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  webViewClose: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
    width: 60,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
