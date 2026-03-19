import { supabase } from './supabase';

/**
 * Ensure the user has a valid anonymous Supabase session.
 * Handles token refresh automatically for long game sessions.
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
      // Token is still fresh
      return session.user.id;
    }

    // Token expired or expiring soon — refresh it
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshed?.session?.user) {
      return refreshed.session.user.id;
    }

    // Refresh failed — sign in fresh
    if (refreshError) {
      console.warn('Token refresh failed, signing in fresh:', refreshError.message);
    }
  }

  // No session or refresh failed — sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.user!.id;
}
