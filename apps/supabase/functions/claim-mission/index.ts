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

    const { mission_id } = await req.json();
    const supabase = getAdminClient();

    // Fetch mission
    const { data: mission } = await supabase
      .from('missions')
      .select('id, room_id, room_player_id, points, status, type, flash_type, expires_at')
      .eq('id', mission_id)
      .single();

    if (!mission) {
      return new Response(JSON.stringify({ error: 'Mission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify player is in the room
    const { data: roomPlayer } = await supabase
      .from('room_players')
      .select('id')
      .eq('room_id', mission.room_id)
      .eq('player_id', userId)
      .single();

    if (!roomPlayer) {
      return new Response(JSON.stringify({ error: 'Not in this room' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this player already has a pending/challenged claim in this room
    const { data: pendingClaims } = await supabase
      .from('claims')
      .select('id, missions!inner(room_id)')
      .eq('room_player_id', roomPlayer.id)
      .in('status', ['PENDING', 'CHALLENGED'])
      .eq('missions.room_id', mission.room_id);

    if (pendingClaims && pendingClaims.length > 0) {
      return new Response(JSON.stringify({ error: 'You have a pending claim — wait for it to resolve' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- STANDING MISSIONS ---
    if (mission.type === 'standing') {
      if (mission.status !== 'REVEALED') {
        return new Response(JSON.stringify({ error: 'Mission not claimable' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if there's already an unresolved claim on this standing mission (cooldown)
      const { data: activeClaim } = await supabase
        .from('claims')
        .select('id, room_player_id, claimed_at')
        .eq('mission_id', mission_id)
        .in('status', ['PENDING', 'CHALLENGED'])
        .order('claimed_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (activeClaim) {
        // There's an active claim — check for tie-break (within 2 seconds = "simultaneous")
        const activeClaimed = new Date(activeClaim.claimed_at).getTime();
        const now = Date.now();
        const timeDiff = now - activeClaimed;

        if (timeDiff < 2000 && activeClaim.room_player_id !== roomPlayer.id) {
          // Coin flip tie-break!
          const coinFlip = Math.random() < 0.5;
          if (coinFlip) {
            // New claimant wins the flip — delete the old claim and create new one
            await supabase.from('claims').delete().eq('id', activeClaim.id);
            // Fall through to create the new claim below
          } else {
            // Existing claim wins
            return new Response(JSON.stringify({
              error: 'Beat you by a coin flip!',
              locked_by: activeClaim.room_player_id,
            }), {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else if (activeClaim.room_player_id === roomPlayer.id) {
          return new Response(JSON.stringify({ error: 'You already claimed this — waiting for votes' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Not a tie — mission is locked by someone else
          return new Response(JSON.stringify({
            error: 'Mission locked — vote on the active claim first',
            locked_by: activeClaim.room_player_id,
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Create claim — mission stays REVEALED but is effectively locked until resolved
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          mission_id,
          room_player_id: roomPlayer.id,
          points_awarded: mission.points,
        })
        .select('id, claimed_at')
        .single();

      if (claimError) throw claimError;

      return new Response(JSON.stringify({ claim_id: claim.id, claimed_at: claim.claimed_at }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- FLASH MISSIONS ---
    if (mission.type === 'flash') {
      // Check expiry
      if (mission.expires_at && new Date(mission.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Mission has expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (mission.status !== 'REVEALED') {
        return new Response(JSON.stringify({ error: 'Mission already claimed or expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Race missions: first claim wins
      if (mission.flash_type === 'race') {
        const { data: existingClaim } = await supabase
          .from('claims')
          .select('id')
          .eq('mission_id', mission_id)
          .limit(1)
          .maybeSingle();

        if (existingClaim) {
          return new Response(JSON.stringify({ error: 'Already claimed by another player' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Create claim and mark mission as CLAIMED
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          mission_id,
          room_player_id: roomPlayer.id,
          points_awarded: mission.points,
        })
        .select('id, claimed_at')
        .single();

      if (claimError) throw claimError;

      await supabase
        .from('missions')
        .update({ status: 'CLAIMED' })
        .eq('id', mission_id);

      return new Response(JSON.stringify({ claim_id: claim.id, claimed_at: claim.claimed_at }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown mission type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
