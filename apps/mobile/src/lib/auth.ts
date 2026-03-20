import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STATE_KEY = 'chaos_agent_auth';

interface PersistedAuth {
  userId: string;
  refreshToken: string;
}

/**
 * Ensure the user has a valid anonymous Supabase session.
 * Persists auth state to AsyncStorage so sessions survive app restarts.
 * Returns the user ID.
 */
export async function ensureAuth(): Promise<string> {
  // Try to get current session
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // Check if token is expired or expiring within 5 minutes
    const expiresAt = session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = 300; // refresh 5 minutes early

    if (expiresAt > now + bufferSeconds) {
      // Token is still fresh — persist and return
      await persistAuth(session.user.id, session.refresh_token ?? '');
      return session.user.id;
    }

    // Token expired or expiring soon — refresh it
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshed?.session?.user) {
      await persistAuth(refreshed.session.user.id, refreshed.session.refresh_token ?? '');
      return refreshed.session.user.id;
    }

    if (refreshError) {
      console.warn('Token refresh failed:', refreshError.message);
    }
  }

  // No active session — try to restore from persisted auth
  const persisted = await getPersistedAuth();
  if (persisted?.refreshToken) {
    const { data: restored, error: restoreError } = await supabase.auth.refreshSession({
      refresh_token: persisted.refreshToken,
    });
    if (restored?.session?.user) {
      await persistAuth(restored.session.user.id, restored.session.refresh_token ?? '');
      return restored.session.user.id;
    }
    if (restoreError) {
      console.warn('Persisted session restore failed:', restoreError.message);
    }
  }

  // All restoration failed — sign in as new anonymous user
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Auth failed: ${error.message}`);

  await persistAuth(data.user!.id, data.session?.refresh_token ?? '');
  return data.user!.id;
}

async function persistAuth(userId: string, refreshToken: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ userId, refreshToken }));
  } catch { /* non-critical */ }
}

async function getPersistedAuth(): Promise<PersistedAuth | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
