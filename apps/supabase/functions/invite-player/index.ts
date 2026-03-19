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

    const { room_id, invite_name, invite_contact } = await req.json();

    if (!room_id || !invite_name?.trim()) {
      return new Response(JSON.stringify({ error: 'Room ID and invite name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify caller is the host
    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id, code, status')
      .eq('id', room_id)
      .single();

    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.host_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only the host can send invites' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (room.status !== 'INVITED' && room.status !== 'LOBBY') {
      return new Response(JSON.stringify({ error: 'Invites can only be sent before the game starts' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('event_invites')
      .insert({
        room_id,
        invited_by: userId,
        invite_name: invite_name.trim(),
        invite_contact: invite_contact ?? null,
        status: 'PENDING',
      })
      .select('id, invite_token')
      .single();

    if (inviteError) throw inviteError;

    // Build invite link (deep link format)
    const invite_link = `chaosagent://invite/${invite.invite_token}`;

    return new Response(JSON.stringify({
      invite_id: invite.id,
      invite_token: invite.invite_token,
      invite_link,
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
