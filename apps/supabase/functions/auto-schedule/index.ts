import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { getGameContextProfile } from '../_shared/game-context-profiles.ts';

/**
 * Auto-scheduler: called periodically by the mobile client to check if
 * a new event should fire based on the game context profile intervals.
 *
 * POST { room_id }
 * Returns { triggered: boolean, event_type?, next_check_seconds }
 */

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { room_id } = await req.json();
    if (!room_id) {
      return new Response(JSON.stringify({ error: 'room_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAdminClient();

    // 1. Room must be ACTIVE
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status, started_at, game_type')
      .eq('id', room_id)
      .single();

    if (!room || room.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ triggered: false, next_check_seconds: 60 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profile = getGameContextProfile(room.game_type ?? 'custom');
    const now = Date.now();

    // 2. Check time since last flash mission
    let flashCandidate = false;
    let lastFlashTime = room.started_at ? new Date(room.started_at).getTime() : now;
    if (profile.flashEnabled) {
      const { data: lastFlash } = await supabase
        .from('missions')
        .select('created_at')
        .eq('room_id', room_id)
        .eq('type', 'flash')
        .order('created_at', { ascending: false })
        .limit(1);

      lastFlashTime = lastFlash?.[0]?.created_at
        ? new Date(lastFlash[0].created_at).getTime()
        : lastFlashTime;

      const elapsed = now - lastFlashTime;
      const threshold = randomInRange(profile.flashIntervalMs[0], profile.flashIntervalMs[1]);
      flashCandidate = elapsed >= threshold;
    }

    // 3. Check time since last poll
    const { data: lastPoll } = await supabase
      .from('polls')
      .select('created_at')
      .eq('room_id', room_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastPollTime = lastPoll?.[0]?.created_at
      ? new Date(lastPoll[0].created_at).getTime()
      : (room.started_at ? new Date(room.started_at).getTime() : now);

    const pollElapsed = now - lastPollTime;
    const pollThreshold = randomInRange(profile.pollIntervalMs[0], profile.pollIntervalMs[1]);
    const pollCandidate = pollElapsed >= pollThreshold;

    // 4. Check time since last mini-game
    const { data: lastMiniGame } = await supabase
      .from('mini_games')
      .select('created_at')
      .eq('room_id', room_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastMiniGameTime = lastMiniGame?.[0]?.created_at
      ? new Date(lastMiniGame[0].created_at).getTime()
      : (room.started_at ? new Date(room.started_at).getTime() : now);

    const miniGameElapsed = now - lastMiniGameTime;
    const miniGameThreshold = randomInRange(profile.miniGameIntervalMs[0], profile.miniGameIntervalMs[1]);
    const miniGameCandidate = miniGameElapsed >= miniGameThreshold;

    // 5. Pick the event to trigger (priority: flash > poll > mini-game, only one per call)
    let eventType: string | null = null;
    if (flashCandidate) {
      eventType = 'flash_mission';
    } else if (pollCandidate) {
      eventType = 'poll';
    } else if (miniGameCandidate) {
      eventType = 'mini_game';
    }

    if (!eventType) {
      // Calculate how many seconds until the earliest possible next event
      const nextFlashIn = profile.flashEnabled
        ? Math.max(0, profile.flashIntervalMs[0] - (now - lastFlashTime)) / 1000
        : Infinity;
      const nextPollIn = Math.max(0, profile.pollIntervalMs[0] - pollElapsed) / 1000;
      const nextMiniGameIn = Math.max(0, profile.miniGameIntervalMs[0] - miniGameElapsed) / 1000;
      const nextCheckSeconds = Math.max(15, Math.min(60, Math.floor(
        Math.min(nextFlashIn, nextPollIn, nextMiniGameIn),
      )));

      return new Response(JSON.stringify({
        triggered: false,
        next_check_seconds: nextCheckSeconds,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Trigger the event by calling trigger-event internally
    const triggerPayload: Record<string, unknown> = {
      room_id,
      event_type: eventType,
      compress_timers: false,
    };

    // For mini-games, pick a random allowed type
    if (eventType === 'mini_game' && profile.allowedMiniGameTypes) {
      triggerPayload.mini_game_type = profile.allowedMiniGameTypes[
        Math.floor(Math.random() * profile.allowedMiniGameTypes.length)
      ];
    }

    const triggerResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-event`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify(triggerPayload),
      },
    );

    const triggerResult = await triggerResponse.json();

    // If the trigger was suppressed (e.g. high tension), treat as not triggered
    if (triggerResult.suppressed) {
      return new Response(JSON.stringify({
        triggered: false,
        next_check_seconds: 60,
        reason: triggerResult.reason,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      triggered: true,
      event_type: eventType,
      event_id: triggerResult.event_id,
      next_check_seconds: 30,
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
