import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { sendPush } from '../_shared/push.ts';

/**
 * Internal edge function for sending push notifications.
 * Called by other edge functions or server-side triggers.
 * Expects service-role authorization (no user auth check — internal only).
 */
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id, exclude_player_id, title, body, data, category } = await req.json();

    if (!room_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'room_id, title, and body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await sendPush({ room_id, exclude_player_id, title, body, data, category });

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
