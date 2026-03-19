import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { generateStandingMissions } from '../_shared/mission-pool.ts';

const STANDING_MISSION_COUNT = 8;

// Called internally by setup-complete when all players are ready
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id } = await req.json();
    const supabase = getAdminClient();

    // Verify room exists
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', room_id)
      .single();

    if (!room) throw new Error('Room not found');

    // Generate standing missions from curated pool
    await generateStandingMissions(room_id, STANDING_MISSION_COUNT);

    // Update room status to ACTIVE
    await supabase
      .from('rooms')
      .update({ status: 'ACTIVE', started_at: new Date().toISOString() })
      .eq('id', room_id);

    return new Response(JSON.stringify({ missions_created: STANDING_MISSION_COUNT }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
