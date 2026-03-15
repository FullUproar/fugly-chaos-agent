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

    const { room_id } = await req.json();
    const supabase = getAdminClient();

    // Verify caller is host
    const { data: hostCheck } = await supabase
      .from('room_players')
      .select('is_host')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!hostCheck?.is_host) {
      return new Response(JSON.stringify({ error: 'Only the host can end the session' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve any pending claims as accepted
    await supabase
      .from('claims')
      .update({ status: 'ACCEPTED', resolved_at: new Date().toISOString() })
      .in('status', ['PENDING', 'CHALLENGED'])
      .in('mission_id',
        supabase.from('missions').select('id').eq('room_id', room_id),
      );

    // End the room
    await supabase
      .from('rooms')
      .update({ status: 'ENDED', ended_at: new Date().toISOString() })
      .eq('id', room_id);

    return new Response(JSON.stringify({ ended: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
