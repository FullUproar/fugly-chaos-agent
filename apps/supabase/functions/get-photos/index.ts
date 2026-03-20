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

    if (!room_id) {
      return new Response(JSON.stringify({ error: 'room_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // Verify player is in room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all photos for the room with player nicknames
    const { data: photos, error } = await supabase
      .from('photos')
      .select(`
        id,
        room_player_id,
        mission_id,
        caption,
        photo_url,
        created_at,
        room_players!inner(nickname)
      `)
      .eq('room_id', room_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (photos ?? []).map((p: any) => ({
      id: p.id,
      room_player_id: p.room_player_id,
      nickname: p.room_players?.nickname ?? 'Unknown',
      mission_id: p.mission_id,
      caption: p.caption,
      photo_url: p.photo_url,
      created_at: p.created_at,
    }));

    return new Response(JSON.stringify({ photos: formatted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
