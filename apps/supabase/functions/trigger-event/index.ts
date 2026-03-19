import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { generateFlashMission, generatePoll } from '../_shared/mission-pool.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id, event_type, flash_type, compress_timers } = await req.json();

    if (!room_id || !event_type) {
      return new Response(JSON.stringify({ error: 'room_id and event_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify room exists and is ACTIVE
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', room_id)
      .single();

    if (!room || room.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'Room not found or not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get players for this room
    const { data: playersData } = await supabase
      .from('room_players')
      .select('id, nickname')
      .eq('room_id', room_id);

    const players = (playersData ?? []).map((p: { id: string; nickname: string }) => ({
      id: p.id,
      nickname: p.nickname,
    }));

    if (event_type === 'flash_mission') {
      // Expire any active flash missions
      await supabase
        .from('missions')
        .update({ status: 'EXPIRED' })
        .eq('room_id', room_id)
        .eq('type', 'flash')
        .eq('status', 'REVEALED');

      const mission = await generateFlashMission(
        room_id,
        players,
        compress_timers ?? true,
        flash_type,
      );

      return new Response(JSON.stringify({
        event_id: mission.id,
        type: 'flash_mission',
        title: mission.title,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event_type === 'poll') {
      // Close any active polls
      await supabase
        .from('polls')
        .update({ status: 'CLOSED' })
        .eq('room_id', room_id)
        .eq('status', 'ACTIVE');

      const poll = await generatePoll(room_id, players, compress_timers ?? true);

      return new Response(JSON.stringify({
        event_id: poll.id,
        type: 'poll',
        question: poll.question,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid event_type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
