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

    const { room_id, photo, mission_id, caption } = await req.json();

    if (!room_id || !photo) {
      return new Response(JSON.stringify({ error: 'room_id and photo (base64) required' }), {
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

    // Verify photos are enabled for this room
    const { data: room } = await supabase
      .from('rooms')
      .select('photo_challenges_enabled')
      .eq('id', room_id)
      .single();

    if (!room?.photo_challenges_enabled) {
      return new Response(JSON.stringify({ error: 'Photos are not enabled for this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode base64 photo
    const photoData = Uint8Array.from(atob(photo), (c) => c.charCodeAt(0));

    // Generate unique file path
    const fileExt = 'jpg';
    const fileName = `${room_id}/${roomPlayer.id}/${crypto.randomUUID()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chaos-photos')
      .upload(fileName, photoData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('chaos-photos')
      .getPublicUrl(fileName);

    const photo_url = urlData.publicUrl;

    // Insert photo record
    const { data: photoRecord, error: insertError } = await supabase
      .from('photos')
      .insert({
        room_id,
        room_player_id: roomPlayer.id,
        mission_id: mission_id ?? null,
        caption: caption ?? null,
        photo_url,
      })
      .select('id, photo_url')
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      photo_id: photoRecord.id,
      photo_url: photoRecord.photo_url,
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
