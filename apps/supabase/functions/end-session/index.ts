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

    // Sync stats to Afterroar HQ for linked players
    let ahqSynced = 0;
    try {
      // Check if any players in this room are linked to AHQ
      const { data: linkedPlayers } = await supabase
        .from('room_players')
        .select('id, ahq_user_id')
        .eq('room_id', room_id)
        .not('ahq_user_id', 'is', null);

      if (linkedPlayers && linkedPlayers.length > 0) {
        // Call sync-to-ahq internally via fetch to the same Supabase instance
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const syncRes = await fetch(`${supabaseUrl}/functions/v1/sync-to-ahq`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ room_id }),
        });

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          ahqSynced = syncData.synced_players ?? 0;
        }
      }
    } catch {
      // AHQ sync failure is non-critical — don't block the end-session response
    }

    return new Response(JSON.stringify({ ended: true, ahq_synced: ahqSynced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
