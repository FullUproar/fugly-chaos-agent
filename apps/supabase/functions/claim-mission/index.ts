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

    const { mission_id } = await req.json();
    const supabase = getAdminClient();

    // Verify mission belongs to this player and is claimable
    const { data: mission } = await supabase
      .from('missions')
      .select('id, room_id, room_player_id, points, status')
      .eq('id', mission_id)
      .single();

    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('id', mission.room_player_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not your mission' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mission.status !== 'REVEALED') {
      return new Response(JSON.stringify({ error: 'Mission not claimable' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create claim — server timestamp is authoritative
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        mission_id,
        room_player_id: roomPlayer.id,
        points_awarded: mission.points,
      })
      .select('id, claimed_at')
      .single();

    if (claimError) throw claimError;

    // Update mission status
    await supabase
      .from('missions')
      .update({ status: 'CLAIMED' })
      .eq('id', mission_id);

    return new Response(JSON.stringify({ claim_id: claim.id, claimed_at: claim.claimed_at }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
