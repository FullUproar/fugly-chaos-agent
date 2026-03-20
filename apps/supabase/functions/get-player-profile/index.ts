import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

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

    const supabase = getAdminClient();

    // Find the player_profile linked to this auth user
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('player_id', userId)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ profile: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure chaos_title is current
    const currentTitle = getChaosTitle(profile.total_games_played ?? 0);
    if (currentTitle !== profile.chaos_title) {
      await supabase
        .from('player_profiles')
        .update({ chaos_title: currentTitle, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      profile.chaos_title = currentTitle;
    }

    // Fetch recent session history (last 10 sessions)
    const { data: recentSessions } = await supabase
      .from('session_history')
      .select('*')
      .eq('player_profile_id', profile.id)
      .order('played_at', { ascending: false })
      .limit(10);

    // Calculate derived stats
    const totalGames = profile.total_games_played ?? 0;
    const totalClaimsWon = profile.total_claims_won ?? 0;
    const totalClaimsMade = profile.total_claims_made ?? 0;
    const totalBsCalls = profile.total_bullshit_calls ?? 0;
    const totalBsCorrect = profile.total_bullshit_correct ?? 0;

    const winRate = totalGames > 0
      ? Math.round(((recentSessions ?? []).filter((s: { final_rank: number }) => s.final_rank === 1).length / totalGames) * 100)
      : 0;

    const bsAccuracy = totalBsCalls > 0
      ? Math.round((totalBsCorrect / totalBsCalls) * 100)
      : 0;

    const claimSuccessRate = totalClaimsMade > 0
      ? Math.round((totalClaimsWon / totalClaimsMade) * 100)
      : 0;

    return new Response(JSON.stringify({
      profile: {
        id: profile.id,
        ahq_user_id: profile.ahq_user_id,
        display_name: profile.display_name,
        chaos_title: profile.chaos_title,
        total_games_played: totalGames,
        total_points_earned: profile.total_points_earned ?? 0,
        total_claims_made: totalClaimsMade,
        total_claims_won: totalClaimsWon,
        total_bullshit_calls: totalBsCalls,
        total_bullshit_correct: totalBsCorrect,
        win_rate: winRate,
        bs_accuracy: bsAccuracy,
        claim_success_rate: claimSuccessRate,
      },
      recent_sessions: recentSessions ?? [],
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
