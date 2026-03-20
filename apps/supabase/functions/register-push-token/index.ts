import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

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

    const { room_id, push_token } = await req.json();

    if (!room_id || !push_token) {
      return new Response(JSON.stringify({ error: 'room_id and push_token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate it looks like an Expo push token
    if (!push_token.startsWith('ExponentPushToken[')) {
      return new Response(JSON.stringify({ error: 'Invalid push token format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Update the player's push token in the room
    const { error: updateError } = await supabase
      .from('room_players')
      .update({ push_token })
      .eq('room_id', room_id)
      .eq('player_id', userId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ registered: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
