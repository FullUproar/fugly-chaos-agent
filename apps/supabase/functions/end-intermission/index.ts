import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';
import { pickStandingMissions } from '../_shared/mission-pool.ts';

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

    const { room_id } = await req.json();
    const supabase = getAdminClient();

    // Verify host
    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id, status')
      .eq('id', room_id)
      .single();

    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.host_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the host can end intermission' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.status !== 'INTERMISSION') {
      return new Response(JSON.stringify({ error: 'Not in intermission' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Expire old standing missions that were claimed multiple times
    // Keep unrevealed ones, retire stale ones
    const { data: existingMissions } = await supabase
      .from('missions')
      .select('id, title')
      .eq('room_id', room_id)
      .eq('type', 'standing')
      .eq('status', 'REVEALED');

    const existingTitles = new Set((existingMissions ?? []).map(m => m.title));

    // Pick fresh missions, avoiding duplicates
    const freshMissions = pickStandingMissions(4, existingTitles);

    // Insert new missions
    if (freshMissions.length > 0) {
      const inserts = freshMissions.map(m => ({
        room_id,
        title: m.title,
        description: m.description,
        difficulty: m.difficulty,
        points: m.points,
        category: m.category,
        status: 'REVEALED',
        type: 'standing',
        visible_to: 'all',
      }));

      await supabase.from('missions').insert(inserts);
    }

    // Return to ACTIVE
    await supabase
      .from('rooms')
      .update({ status: 'ACTIVE' })
      .eq('id', room_id);

    return new Response(JSON.stringify({
      new_missions_count: freshMissions.length,
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
