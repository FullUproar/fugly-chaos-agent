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

    const { poll_id, answer } = await req.json();

    if (!poll_id || !answer) {
      return new Response(JSON.stringify({ error: 'poll_id and answer required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Get poll and verify it's active
    const { data: poll } = await supabase
      .from('polls')
      .select('id, room_id, status, expires_at')
      .eq('id', poll_id)
      .single();

    if (!poll) {
      return new Response(JSON.stringify({ error: 'Poll not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-close expired polls
    if (new Date(poll.expires_at) < new Date()) {
      await supabase.from('polls').update({ status: 'CLOSED' }).eq('id', poll_id);
      return new Response(JSON.stringify({ error: 'Poll has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (poll.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'Poll is closed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify player is in the poll's room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', poll.room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert vote (unique constraint prevents double voting)
    const { error: voteError } = await supabase
      .from('poll_votes')
      .insert({
        poll_id,
        room_player_id: roomPlayer.id,
        answer,
      });

    if (voteError) {
      if (voteError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Already voted' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw voteError;
    }

    // Check if all players have voted — if so, close the poll
    const { count: totalPlayers } = await supabase
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', poll.room_id);

    const { count: totalVotes } = await supabase
      .from('poll_votes')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', poll_id);

    if ((totalVotes ?? 0) >= (totalPlayers ?? 0)) {
      await supabase.from('polls').update({ status: 'CLOSED' }).eq('id', poll_id);
    }

    return new Response(JSON.stringify({ recorded: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
