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

    const { room_id, answers } = await req.json();
    const supabase = getAdminClient();

    // Update player's setup answers
    await supabase
      .from('room_players')
      .update({ setup_answers: answers })
      .eq('room_id', room_id)
      .eq('player_id', userId);

    // Check if all players have submitted
    const { data: players } = await supabase
      .from('room_players')
      .select('nickname, setup_answers')
      .eq('room_id', room_id);

    const waiting = (players ?? [])
      .filter((p) => !p.setup_answers)
      .map((p) => p.nickname);

    const allReady = waiting.length === 0;

    if (allReady) {
      // Update room status to SETUP (generating missions)
      await supabase
        .from('rooms')
        .update({ status: 'SETUP' })
        .eq('id', room_id);

      // Trigger mission generation (call the generate-missions function)
      await supabase.functions.invoke('generate-missions', {
        body: { room_id },
      });
    }

    return new Response(JSON.stringify({ ready: allReady, waiting_on: waiting }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
