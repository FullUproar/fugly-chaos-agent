import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';
import { sendPush, sendPushToPlayer } from '../_shared/push.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { room_id, content, recipient_id, message_type } = await req.json();

    if (!room_id || !content) {
      return new Response(JSON.stringify({ error: 'room_id and content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof content !== 'string' || content.length === 0 || content.length > 500) {
      return new Response(JSON.stringify({ error: 'Content must be 1-500 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify sender is in the room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id, nickname')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If DM, verify recipient is in the same room
    if (recipient_id) {
      const { data: recipient } = await supabase
        .from('room_players')
        .select('id')
        .eq('id', recipient_id)
        .eq('room_id', room_id)
        .single();

      if (!recipient) {
        return new Response(JSON.stringify({ error: 'Recipient not in this room' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Can't DM yourself
      if (recipient_id === roomPlayer.id) {
        return new Response(JSON.stringify({ error: 'Cannot send a DM to yourself' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Validate message_type if provided
    const validTypes = ['chat', 'system', 'reaction'];
    const msgType = message_type ?? 'chat';
    if (!validTypes.includes(msgType)) {
      return new Response(JSON.stringify({ error: 'Invalid message_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        room_id,
        sender_id: roomPlayer.id,
        recipient_id: recipient_id ?? null,
        content: content.trim(),
        message_type: msgType,
      })
      .select('id, created_at')
      .single();

    if (insertError) throw insertError;

    // Send push notifications
    const preview = content.trim().length > 80
      ? content.trim().substring(0, 77) + '...'
      : content.trim();

    if (recipient_id) {
      // DM: push only to the recipient
      sendPushToPlayer(
        recipient_id,
        '\u{1F512} Whisper',
        `\u{1F512} ${roomPlayer.nickname} whispered to you`,
        { room_id, message_id: message.id },
        'DM',
      );
    } else if (msgType === 'chat') {
      // Room-wide chat: push to everyone except the sender
      sendPush({
        room_id,
        exclude_player_id: userId,
        title: '\u{1F4AC} Table Talk',
        body: `\u{1F4AC} ${roomPlayer.nickname}: ${preview}`,
        data: { message_id: message.id },
        category: 'CHAT',
      });
    }

    return new Response(JSON.stringify({
      message_id: message.id,
      created_at: message.created_at,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
