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

    const { room_id, duration_minutes } = await req.json();
    const supabase = getAdminClient();

    // Verify host
    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id, status, intermission_duration_minutes')
      .eq('id', room_id)
      .single();

    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.host_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the host can start intermission' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'Game must be active to start intermission' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dur = duration_minutes ?? room.intermission_duration_minutes ?? 5;
    const intermission_ends_at = new Date(Date.now() + dur * 60 * 1000).toISOString();

    // Auto-accept any pending claims
    await supabase
      .from('claims')
      .update({ status: 'ACCEPTED', resolved_at: new Date().toISOString() })
      .eq('status', 'PENDING')
      .in('mission_id', supabase
        .from('missions')
        .select('id')
        .eq('room_id', room_id)
      );

    // Set room to INTERMISSION
    await supabase
      .from('rooms')
      .update({
        status: 'INTERMISSION',
        settings: { ...room, intermission_ends_at },
      })
      .eq('id', room_id);

    // Compute halftime stats
    const { data: players } = await supabase
      .from('room_players')
      .select('id, nickname, score')
      .eq('room_id', room_id)
      .order('score', { ascending: false });

    const { count: totalClaims } = await supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .in('mission_id', supabase.from('missions').select('id').eq('room_id', room_id));

    const { count: totalBullshits } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('vote', 'BULLSHIT')
      .in('claim_id', supabase.from('claims').select('id').in('mission_id',
        supabase.from('missions').select('id').eq('room_id', room_id)));

    const { count: completedMissions } = await supabase
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room_id)
      .eq('type', 'standing')
      .eq('status', 'VERIFIED');

    const { count: totalMissions } = await supabase
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room_id)
      .eq('type', 'standing');

    const leader = players?.[0] ?? { nickname: 'Nobody', score: 0 };

    return new Response(JSON.stringify({
      intermission_ends_at,
      halftime_stats: {
        leader: { nickname: leader.nickname, score: leader.score },
        total_claims: totalClaims ?? 0,
        total_bullshits: totalBullshits ?? 0,
        missions_completed: completedMissions ?? 0,
        missions_remaining: (totalMissions ?? 0) - (completedMissions ?? 0),
      },
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
