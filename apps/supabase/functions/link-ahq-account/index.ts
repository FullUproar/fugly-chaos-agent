import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

const AHQ_API_BASE = Deno.env.get('AHQ_API_BASE') ?? 'https://fulluproar.com';

interface AHQSession {
  user: {
    id: string;
    name: string;
    email?: string;
  };
  crews?: Array<{ id: string; name: string }>;
}

/**
 * Derives a chaos title from total games played.
 */
function getChaosTitle(gamesPlayed: number): string {
  if (gamesPlayed > 50) return "Fugly's Chosen One";
  if (gamesPlayed >= 21) return 'Legendary Chaos Lord';
  if (gamesPlayed >= 11) return 'Master of Mayhem';
  if (gamesPlayed >= 6) return 'Certified Troublemaker';
  if (gamesPlayed >= 3) return 'Agent of Mischief';
  return 'Chaos Rookie';
}

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

    const { ahq_token, room_player_id } = await req.json();
    if (!ahq_token) {
      return new Response(JSON.stringify({ error: 'Missing ahq_token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate the token against the Full Uproar API
    const sessionRes = await fetch(`${AHQ_API_BASE}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${ahq_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sessionRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid AHQ token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session: AHQSession = await sessionRes.json();
    const ahqUserId = session.user.id;
    const displayName = session.user.name;
    const crews = session.crews ?? [];

    const supabase = getAdminClient();

    // Create or update player_profile with ahq_user_id
    const { data: existingProfile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('ahq_user_id', ahqUserId)
      .maybeSingle();

    let profile;
    if (existingProfile) {
      // Update existing profile — link to current player and refresh display name
      const { data: updated } = await supabase
        .from('player_profiles')
        .update({
          player_id: userId,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      profile = updated;
    } else {
      // Create new profile
      const { data: created } = await supabase
        .from('player_profiles')
        .insert({
          player_id: userId,
          ahq_user_id: ahqUserId,
          display_name: displayName,
          chaos_title: 'Chaos Rookie',
        })
        .select()
        .single();
      profile = created;
    }

    // Link current room_player to the ahq_user_id if room_player_id provided
    if (room_player_id) {
      const primaryCrew = crews.length > 0 ? crews[0].id : null;
      await supabase
        .from('room_players')
        .update({
          ahq_user_id: ahqUserId,
          ahq_crew_id: primaryCrew,
        })
        .eq('id', room_player_id)
        .eq('player_id', userId);
    }

    return new Response(JSON.stringify({
      linked: true,
      display_name: displayName,
      chaos_title: profile?.chaos_title ?? 'Chaos Rookie',
      crews: crews.map((c) => ({ id: c.id, name: c.name })),
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
