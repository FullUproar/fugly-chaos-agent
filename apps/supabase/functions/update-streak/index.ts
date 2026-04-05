import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient, getAuthUserId } from '../_shared/supabase-client.ts';

/**
 * update-streak — called internally when a session ends.
 * For each player profile linked to the room, check their last_session_week
 * and update current_streak / longest_streak accordingly.
 *
 * POST { room_id }
 * Returns { streaks: Array<{ player_profile_id, current_streak, longest_streak }> }
 */

function getISOWeek(date: Date): string {
  // Calculate ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function parseISOWeek(weekStr: string): { year: number; week: number } {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return { year: 0, week: 0 };
  return { year: parseInt(match[1], 10), week: parseInt(match[2], 10) };
}

function isConsecutiveWeek(lastWeek: string, currentWeek: string): boolean {
  const last = parseISOWeek(lastWeek);
  const curr = parseISOWeek(currentWeek);
  if (last.year === 0 || curr.year === 0) return false;

  // Same week — already counted, not a new streak increment
  if (last.year === curr.year && last.week === curr.week) return false;

  // Simple case: same year, next week
  if (last.year === curr.year && curr.week === last.week + 1) return true;

  // Year boundary: last week of prev year -> week 1 of next year
  if (curr.year === last.year + 1 && curr.week === 1 && last.week >= 52) return true;

  return false;
}

function isSameWeek(lastWeek: string, currentWeek: string): boolean {
  return lastWeek === currentWeek;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id } = await req.json();
    const supabase = getAdminClient();
    const currentWeek = getISOWeek(new Date());

    // Get all players in this room who have a player_profile
    const { data: roomPlayers } = await supabase
      .from('room_players')
      .select('player_id')
      .eq('room_id', room_id);

    if (!roomPlayers || roomPlayers.length === 0) {
      return new Response(JSON.stringify({ streaks: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const playerIds = roomPlayers.map((rp: { player_id: string }) => rp.player_id);

    // Get their profiles
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('id, player_id, current_streak, longest_streak, last_session_week')
      .in('player_id', playerIds);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ streaks: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const streakResults = [];

    for (const profile of profiles) {
      const lastWeek = profile.last_session_week;
      let newStreak = profile.current_streak ?? 0;

      if (!lastWeek) {
        // First session ever
        newStreak = 1;
      } else if (isSameWeek(lastWeek, currentWeek)) {
        // Already played this week — streak stays the same
        // No change needed
      } else if (isConsecutiveWeek(lastWeek, currentWeek)) {
        // Consecutive week — streak grows
        newStreak = (profile.current_streak ?? 0) + 1;
      } else {
        // Gap — streak resets
        newStreak = 1;
      }

      const newLongest = Math.max(newStreak, profile.longest_streak ?? 0);

      await supabase
        .from('player_profiles')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_session_week: currentWeek,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      streakResults.push({
        player_profile_id: profile.id,
        player_id: profile.player_id,
        current_streak: newStreak,
        longest_streak: newLongest,
      });
    }

    return new Response(JSON.stringify({ streaks: streakResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
