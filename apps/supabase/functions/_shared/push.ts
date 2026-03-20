import { getAdminClient } from './supabase-client.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  room_id: string;
  exclude_player_id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  categoryId?: string;
  sound: 'default';
  priority: 'high';
}

/**
 * Send push notifications to all players in a room (excluding the sender).
 * Fire-and-forget — errors are logged but never block the calling function.
 */
export async function sendPush(payload: PushPayload): Promise<void> {
  try {
    const supabase = getAdminClient();

    let query = supabase
      .from('room_players')
      .select('push_token')
      .eq('room_id', payload.room_id)
      .not('push_token', 'is', null);

    if (payload.exclude_player_id) {
      query = query.neq('player_id', payload.exclude_player_id);
    }

    const { data: players } = await query;

    if (!players || players.length === 0) return;

    const tokens = players
      .map((p: { push_token: string | null }) => p.push_token)
      .filter((t): t is string => !!t && t.startsWith('ExponentPushToken'));

    if (tokens.length === 0) return;

    // Expo Push API supports batches of up to 100 messages
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, category: payload.category },
      categoryId: payload.category,
      sound: 'default' as const,
      priority: 'high' as const,
    }));

    // Send in batches of 100
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
    }
  } catch (err) {
    // Push failures should never block game flow
    console.error('Push notification error:', (err as Error).message);
  }
}

/**
 * Send a push notification to a single player by their room_player id.
 */
export async function sendPushToPlayer(
  roomPlayerId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  category?: string,
): Promise<void> {
  try {
    const supabase = getAdminClient();

    const { data: player } = await supabase
      .from('room_players')
      .select('push_token')
      .eq('id', roomPlayerId)
      .single();

    if (!player?.push_token || !player.push_token.startsWith('ExponentPushToken')) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: player.push_token,
        title,
        body,
        data: { ...data, category },
        categoryId: category,
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch (err) {
    console.error('Push notification error:', (err as Error).message);
  }
}
