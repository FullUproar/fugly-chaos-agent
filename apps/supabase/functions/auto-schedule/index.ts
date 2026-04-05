import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';
import { getGameContextProfile, getEffectiveProfile } from '../_shared/game-context-profiles.ts';
import { getAdaptiveInterval } from '../_shared/adaptive-scheduler.ts';

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
      .select('id, status, started_at, game_type, settings')
      .eq('id', room_id)
      .single();

    if (!room || room.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ triggered: false, next_check_seconds: 60 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roomSettings = (room.settings ?? {}) as Record<string, unknown>;
    const profile = getEffectiveProfile(room.game_type ?? 'custom', {
      partyMode: !!roomSettings.partyMode,
      speedMode: !!roomSettings.speedMode,
    });
    const useAdaptive = !!roomSettings.aiMode;
    const now = Date.now();

    // --- Escalation pacing: movie-arc interval scaling ---
    let escalationMultiplier = 1.0;
    if (profile.escalationEnabled && room.started_at) {
      const sessionStart = new Date(room.started_at).getTime();
      const elapsedMinutes = (now - sessionStart) / 60_000;
      const totalMinutes = profile.estimatedTotalMinutes || 120;
      const progress = Math.min(1.0, elapsedMinutes / totalMinutes);
      const remainingMinutes = totalMinutes - elapsedMinutes;

      if (remainingMinutes <= 15) {
        escalationMultiplier = 0.4; // Final 15 min: chaos crescendo
      } else if (progress >= 0.7) {
        escalationMultiplier = 0.6; // Late game: faster, more intense
      } else if (progress >= 0.3) {
        escalationMultiplier = 1.0; // Mid game: standard pace
      } else {
        escalationMultiplier = 1.5; // Early game: slower, gentler
      }
    }

    // --- Adaptive AI: gather recent activity counts (last 10 min) ---
    let recentActivityCount = 0;
    let recentShakeSignals = 0;
    let recentSlowSignals = 0;

    if (useAdaptive) {
      const tenMinAgo = new Date(now - 10 * 60_000).toISOString();

      // Claims in last 10 min (claims join through missions for room_id)
      const { data: recentMissionIds } = await supabase
        .from('missions')
        .select('id')
        .eq('room_id', room_id);
      const missionIds = (recentMissionIds ?? []).map(m => m.id);

      let claimCount = 0;
      if (missionIds.length > 0) {
        const { count } = await supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .in('mission_id', missionIds)
          .gte('claimed_at', tenMinAgo);
        claimCount = count ?? 0;
      }

      // Poll votes in last 10 min
      const { data: roomPolls } = await supabase
        .from('polls')
        .select('id')
        .eq('room_id', room_id);
      const pollIds = (roomPolls ?? []).map(p => p.id);

      let voteCount = 0;
      if (pollIds.length > 0) {
        const { count } = await supabase
          .from('poll_votes')
          .select('id', { count: 'exact', head: true })
          .in('poll_id', pollIds)
          .gte('voted_at', tenMinAgo);
        voteCount = count ?? 0;
      }

      // Signals in last 10 min (also count shake/slow types)
      const { data: recentSignals } = await supabase
        .from('signals')
        .select('signal_type')
        .eq('room_id', room_id)
        .gte('created_at', tenMinAgo);

      const signalList = recentSignals ?? [];
      recentActivityCount = claimCount + voteCount + signalList.length;
      recentShakeSignals = signalList.filter(s => s.signal_type === 'shake_it_up').length;
      recentSlowSignals = signalList.filter(s => s.signal_type === 'slow_your_roll').length;
    }

    // --- STANDING MISSION ROTATION ---
    // Reveal new standing missions if fewer than 2 are active, with cooldowns
    const { data: revealedStanding } = await supabase
      .from('missions')
      .select('id, created_at, status')
      .eq('room_id', room_id)
      .eq('type', 'standing')
      .eq('status', 'REVEALED');

    const { data: hiddenStanding } = await supabase
      .from('missions')
      .select('id')
      .eq('room_id', room_id)
      .eq('type', 'standing')
      .eq('status', 'HIDDEN');

    const revealedCount = revealedStanding?.length ?? 0;
    const hiddenCount = hiddenStanding?.length ?? 0;

    // Expire stale standing missions (REVEALED for 30+ min with no claims)
    if (revealedStanding && revealedStanding.length > 0) {
      const thirtyMinAgo = new Date(now - 30 * 60_000).toISOString();
      const staleIds: string[] = [];

      for (const m of revealedStanding) {
        if (m.created_at && m.created_at < thirtyMinAgo) {
          // Check if this mission has any claims at all
          const { count: claimCount } = await supabase
            .from('claims')
            .select('id', { count: 'exact', head: true })
            .eq('mission_id', m.id);

          if ((claimCount ?? 0) === 0) {
            staleIds.push(m.id);
          }
        }
      }

      if (staleIds.length > 0) {
        await supabase
          .from('missions')
          .update({ status: 'EXPIRED' })
          .in('id', staleIds);
      }
    }

    // Reveal a new standing mission if we have fewer than 2 revealed and hidden ones available
    // Cooldown: at least 10 minutes since the last reveal (use most recent REVEALED mission's created_at)
    if (revealedCount < 2 && hiddenCount > 0) {
      const lastRevealTime = revealedStanding && revealedStanding.length > 0
        ? Math.max(...revealedStanding.map(m => new Date(m.created_at).getTime()))
        : 0;
      const timeSinceLastReveal = now - lastRevealTime;
      const TEN_MINUTES = 10 * 60_000;

      if (timeSinceLastReveal >= TEN_MINUTES || revealedCount === 0) {
        // Pick a random hidden standing mission to reveal
        const randomIndex = Math.floor(Math.random() * hiddenStanding!.length);
        const missionToReveal = hiddenStanding![randomIndex];

        await supabase
          .from('missions')
          .update({ status: 'REVEALED', created_at: new Date().toISOString() })
          .eq('id', missionToReveal.id);

        // Log as a new_mission event in the room's messages
        await supabase.from('messages').insert({
          room_id: room_id,
          sender_id: null,
          message_type: 'system',
          content: 'A new mission has surfaced...',
        });
      }
    }

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
      const baseThreshold = useAdaptive
        ? getAdaptiveInterval(profile.flashIntervalMs, recentActivityCount, recentShakeSignals, recentSlowSignals)
        : randomInRange(profile.flashIntervalMs[0], profile.flashIntervalMs[1]);
      const threshold = baseThreshold * escalationMultiplier;
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
    const basePollThreshold = useAdaptive
      ? getAdaptiveInterval(profile.pollIntervalMs, recentActivityCount, recentShakeSignals, recentSlowSignals)
      : randomInRange(profile.pollIntervalMs[0], profile.pollIntervalMs[1]);
    const pollThreshold = basePollThreshold * escalationMultiplier;
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
    const baseMiniGameThreshold = useAdaptive
      ? getAdaptiveInterval(profile.miniGameIntervalMs, recentActivityCount, recentShakeSignals, recentSlowSignals)
      : randomInRange(profile.miniGameIntervalMs[0], profile.miniGameIntervalMs[1]);
    const miniGameThreshold = baseMiniGameThreshold * escalationMultiplier;
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
