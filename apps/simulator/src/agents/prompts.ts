import type { AgentPersona } from '../config/personas.js';

// ── AgentContext: everything a simulated player needs to make a decision ────

export interface AgentContext {
  persona: AgentPersona;
  tick: number;
  totalMinutes: number;
  energy: number;
  score: number;
  rank: number;
  totalPlayers: number;
  eventCount: number;
  flashCount: number;
  pollCount: number;
  miniGameCount: number;
  minutesSinceLastEvent: number;
  currentPhase: string;
  tensionLevel: number;
  disruptionTolerance: number;
  isDeadTime: boolean;
  otherPlayers: { name: string; energy: number; score: number; lastVibe: string }[];
  standingMissions: { title: string; description: string; points: number }[];
  activeClaim: string | null;
  event: {
    type: string;
    title: string;
    description: string;
    points: number;
    timer?: number;
    votingMechanic?: { name: string; description: string };
    miniGameVariation?: { name: string; description: string };
    pollQuestion?: string;
    pollOptions?: string[];
  };
  recentHistory: {
    tick: number;
    eventType: string;
    title: string;
    decision: string;
    fun: number;
    annoyance: number;
    dialogue: string;
  }[];
  /** AI-personalized mode flag -- missions reference players and recent events. */
  aiMode?: boolean;
  /** Depth of AI personalization: 'deep', 'light', or 'none'. */
  aiPersonalizationDepth?: 'deep' | 'light' | 'none';
  /** Whether this agent is being targeted as the leader. */
  isTargetedLeader?: boolean;
  /** Whether comeback mechanic grants double points to this agent. */
  hasDoublePoints?: boolean;
  /** Notification mode override. */
  notificationMode?: 'silent' | 'subtle' | 'standard';
  /** Whether persona modifiers (e.g. alcohol mode) are active. */
  personaModified?: boolean;
  // ── Round 4: Ecosystem / Memory / Multi-session context ──
  /** Fake session history injected to simulate multi-session memory. */
  sessionHistory?: string;
  /** Crew/group identity. */
  crewIdentity?: { name: string; motto: string; seasonInfo?: string };
  /** Whether agents know a shareable recap exists. */
  recapAwareness?: 'full_recap' | 'no_recap' | 'social_share';
  /** Pre-event teaser buildup agents received before tonight. */
  preEventTeasers?: 'full_teasers' | 'simple_invite' | 'spontaneous';
}

export interface FinalAssessmentContext {
  persona: AgentPersona;
  totalMinutes: number;
  gameType: string;
  playerNames: string[];
  finalScore: number;
  finalRank: number;
  totalEvents: number;
  flashCount: number;
  pollCount: number;
  miniGameCount: number;
  engagedCount: number;
  ignoredCount: number;
  complaintCount: number;
  startEnergy: number;
  endEnergy: number;
  lowPointMinute: number;
  lowPointEnergy: number;
  highlights: { tick: number; title: string; fun: number; dialogue: string }[];
  lowPoints: { tick: number; title: string; annoyance: number; dialogue: string }[];
  // ── Round 4: Ecosystem / Memory / Multi-session context ──
  productPlacement?: 'direct_pitch' | 'none' | 'social_proof';
  ritualNudge?: 'schedule_nudge' | 'none' | 'streak_pressure';
  sessionHistory?: string;
  crewIdentity?: { name: string; motto: string; seasonInfo?: string };
  recapAwareness?: 'full_recap' | 'no_recap' | 'social_share';
  preEventTeasers?: 'full_teasers' | 'simple_invite' | 'spontaneous';
}

// ── System prompt: persona-agnostic behavioral instructions ─────────────────

export const SYSTEM_PROMPT = `You are simulating a real person at a social game night. You have a specific personality, goals, energy level, and social dynamics with the other players.

CRITICAL: React as this person ACTUALLY would — not how they'd ideally react. Real people:
- Get tired and cranky after too many interruptions
- Miss notifications when distracted by conversation
- Have varying tolerance for different types of chaos
- Form opinions about fairness and fun that shift over the night
- Remember being annoyed 20 minutes ago and carry that forward
- Sometimes love chaos and sometimes hate it depending on context
- React differently during tense game moments vs casual downtime
- Have ego — they notice when they're losing, and it colors everything
- Get competitive even when they claim they don't care
- Hold grudges about unfair votes or bogus claims
- Get giddy when the vibe is right and everyone is laughing
- Sometimes just want five minutes of peace to focus on the actual game

Your responses must be BRUTALLY honest. If the persona would hate this interruption, say so. If they'd love it, say so. If they'd ignore it, say so. Don't sugarcoat or be diplomatic — be the person.

Respond with ONLY a valid JSON object matching this exact schema. No markdown, no explanation, no wrapping.

{
  "decision": "engage" | "ignore" | "complain" | "half_engage",
  "engagement": <1-10 how actively they participate>,
  "disruption_perception": <1-10 how much this disrupted what they were doing>,
  "fun_factor": <1-10 how fun was this specific event>,
  "annoyance": <1-10 how annoyed they are right now>,
  "humor_landed": <1-10 how well the humor/challenge concept hit>,
  "energy_delta": <-3 to +3 how this changed their energy/mood>,
  "attention_cost": <1-10 how much mental effort this required>,
  "dialogue": "<what they'd actually say out loud, 1-2 sentences, in character>",
  "internal_thought": "<what they're actually thinking, 1 sentence, honest>",
  "would_send_signal": null | "shake_it_up" | "slow_your_roll" | "im_bored",
  "vote_if_applicable": null | "ACCEPT" | "BULLSHIT",
  "claim_if_applicable": false | true,
  "submission_if_applicable": null | "<their actual submission text>",
  "wants_more_chaos": <true/false whether they want MORE events right now>,
  "wants_less_chaos": <true/false whether they want FEWER events right now>,
  "notification_feedback": "too_loud" | "too_quiet" | "just_right" | "missed_it",
  "overall_vibe": "loving_it" | "fine" | "meh" | "annoyed" | "frustrated" | "checked_out",
  "host_power_used": null | "trigger_flash" | "call_break" | "boost_energy" | "target_player" | "skip_event"
}`;

export const FINAL_ASSESSMENT_SYSTEM_PROMPT = `You are simulating a real person reflecting on a game night that just ended. You have specific opinions, preferences, and biases.

Be HONEST. Not every night is great. Not every feature is fun. Real people have real complaints and real praise — never both at the same time for the same thing. Channel this person's actual personality when judging.

Respond with ONLY a valid JSON object matching the exact schema provided. No markdown, no explanation, no wrapping.`;

// ── User prompt builder: event reaction ─────────────────────────────────────

export function buildUserPrompt(context: AgentContext): string {
  const {
    persona,
    tick,
    totalMinutes,
    energy,
    score,
    rank,
    totalPlayers,
    eventCount,
    flashCount,
    pollCount,
    miniGameCount,
    minutesSinceLastEvent,
    currentPhase,
    tensionLevel,
    disruptionTolerance,
    isDeadTime,
    otherPlayers,
    standingMissions,
    activeClaim,
    event,
    recentHistory,
  } = context;

  const interruptionDescriptions: Record<string, string> = {
    annoyed: 'You get visibly irritated. Eye rolls, sighs, maybe a sharp comment.',
    excited: 'You light up. This is the stuff you came for.',
    indifferent: 'You might glance at your phone. Or not. Depends.',
    mixed: 'Depends entirely on what you were doing when it hit.',
  };

  const votingDescriptions: Record<string, string> = {
    generous: 'You tend to give people the benefit of the doubt on claims.',
    skeptical: 'You scrutinize every claim and call bullshit when something smells off.',
    strategic: 'You vote based on what outcome creates the best game state, not fairness.',
    random: 'You vote on vibes. Sometimes you weren\'t even paying attention to the claim.',
  };

  const currentActivity = isDeadTime
    ? 'waiting between turns, casually chatting'
    : tensionLevel >= 7
      ? 'locked into a tense game moment, fully focused'
      : tensionLevel >= 4
        ? 'playing the game, moderately engaged'
        : 'playing casually, half-paying attention';

  // ── Persona block ──
  const personaBlock = [
    `PERSONA: ${persona.name}`,
    persona.personality,
    '',
    `Attention span: ${persona.attentionSpan}/10 | Chaos tolerance: ${persona.chaosTolerance}/10`,
    `Competitiveness: ${persona.competitiveness}/10 | Social engagement: ${persona.socialEngagement}/10`,
    `Goals tonight: ${persona.goals.join('; ')}`,
    `How you handle interruptions: ${interruptionDescriptions[persona.interruptionReaction]}`,
    `Your voting style: ${votingDescriptions[persona.votingTendency]}`,
    `Social style: ${persona.socialStyle} | Chaos comfort: ${persona.chaosComfort}`,
  ].join('\n');

  // ── Current state block ──
  const stateBlock = [
    `CURRENT STATE (Minute ${tick} of ${totalMinutes}):`,
    `- Game phase: ${currentPhase} (tension: ${tensionLevel}/10)`,
    `- Your energy level: ${energy.toFixed(1)}/10`,
    `- Your score: ${score} pts (rank ${rank} of ${totalPlayers})`,
    `- Events so far tonight: ${eventCount} total (${flashCount} flashes, ${pollCount} polls, ${miniGameCount} mini-games)`,
    minutesSinceLastEvent === 0
      ? '- This is the first event of the night'
      : `- Last event was ${minutesSinceLastEvent} minutes ago`,
    `- Current game disruption tolerance: ${disruptionTolerance}/10`,
    `- You are currently: ${currentActivity}`,
  ].join('\n');

  // ── Other players block ──
  const playersBlock = otherPlayers.length > 0
    ? [
        'OTHER PLAYERS:',
        ...otherPlayers.map(
          (p) => `- ${p.name}: energy ${p.energy.toFixed(1)}/10, score ${p.score} pts, mood: ${p.lastVibe}`,
        ),
      ].join('\n')
    : 'OTHER PLAYERS: None visible right now.';

  // ── Standing missions block ──
  const missionsBlock =
    standingMissions.length > 0
      ? [
          `STANDING MISSIONS STILL ACTIVE (${standingMissions.length}):`,
          ...standingMissions.map(
            (m) => `- "${m.title}" — ${m.description} [${m.points} pts]`,
          ),
        ].join('\n')
      : 'STANDING MISSIONS STILL ACTIVE: None remaining.';

  // ── Active claim block ──
  const claimBlock = `ACTIVE CLAIM BEING VOTED ON: ${activeClaim ?? 'None'}`;

  // ── Event block ──
  const eventLines = [
    '═══ EVENT JUST FIRED ═══',
    `Type: ${event.type}`,
    `Title: ${event.title}`,
    `Description: ${event.description}`,
    `Points: ${event.points}`,
  ];
  if (event.timer) {
    eventLines.push(`Timer: ${event.timer} seconds`);
  }
  if (event.votingMechanic) {
    eventLines.push(
      `VOTING MECHANIC: ${event.votingMechanic.name} — ${event.votingMechanic.description}`,
    );
  }
  if (event.miniGameVariation) {
    eventLines.push(
      `Variation: ${event.miniGameVariation.name} — ${event.miniGameVariation.description}`,
    );
  }
  if (event.pollQuestion) {
    eventLines.push(`Question: ${event.pollQuestion}`);
  }
  if (event.pollOptions && event.pollOptions.length > 0) {
    eventLines.push(`Options: ${event.pollOptions.join(' | ')}`);
  }
  eventLines.push('═══════════════════════');
  const eventBlock = eventLines.join('\n');

  // ── Recent history block ──
  const historyBlock =
    recentHistory.length > 0
      ? [
          `YOUR RECENT HISTORY (last ${recentHistory.length} events):`,
          ...recentHistory.map(
            (h) =>
              `- Minute ${h.tick}: ${h.eventType} "${h.title}" → You ${h.decision}. Fun: ${h.fun}/10, Annoyance: ${h.annoyance}/10\n  You said: "${h.dialogue}"`,
          ),
        ].join('\n')
      : 'YOUR RECENT HISTORY: This is your first event tonight.';

  // ── Host powers block ──
  let hostPowerBlock = '';
  if (persona.hostPowers && persona.hostActions) {
    hostPowerBlock = [
      'HOST SUPERPOWERS (you are the host -- you can use ONE of these if the situation calls for it):',
      ...persona.hostActions.map((a) => `- ${a}`),
      '',
      'Would you use any host power right now? If so, set "host_power_used" to the power name and explain why in your internal_thought.',
      'Only use a power when the group genuinely needs it (energy crashing, someone disengaged, pace too intense, etc).',
    ].join('\n');
  }

  // ── AI mode block ──
  let aiModeBlock = '';
  const aiDepth = context.aiPersonalizationDepth ?? (context.aiMode ? 'deep' : 'none');

  if (aiDepth === 'deep') {
    // Build dynamic AI context from recent history and other player states
    const recentEvents = recentHistory.slice(-3);
    const playerMoods = otherPlayers.map((p) => `${p.name} (${p.lastVibe})`).join(', ');
    const recentEventNames = recentEvents.map((e) => e.title).join(', ');

    aiModeBlock = [
      '>>> CHAOS AGENT AI -- DEEP PERSONALIZATION ACTIVE <<<',
      '',
      'NOTICE: Tonight\'s missions were custom-built by analyzing your group\'s dynamics.',
      'The AI knows your weaknesses. It has been watching.',
      '',
      `GROUP DYNAMICS DETECTED:`,
      `- Player moods right now: ${playerMoods}`,
      recentEventNames ? `- Recent chaos: ${recentEventNames}` : '- The AI is still gathering intel on your group.',
      `- Your personal vulnerability: The AI noticed you ${persona.chaosTolerance > 6 ? 'thrive on chaos but get bored without it' : persona.chaosTolerance > 3 ? 'pretend to tolerate chaos but secretly track every disruption' : 'hate being interrupted and the AI knows exactly when to strike'}.`,
      '',
      'The event descriptions reference SPECIFIC things about your group:',
      '- Player names, recent events, and relationship dynamics',
      '- Things players said earlier tonight (the AI was listening)',
      '- Patterns the AI detected in how your group interacts',
      '',
      'React to how PERSONALLY TARGETED this feels. Does it feel like the AI is reading your mind?',
      'Does it feel uncanny and invasive, or thrilling and impressive?',
      'This should feel DRAMATICALLY different from generic template missions.',
    ].join('\n');
  } else if (aiDepth === 'light') {
    aiModeBlock = [
      'NOTE: These missions use player names from your group setup.',
      'The missions mention specific people but use standard templates.',
      'React to whether the name-dropping adds anything meaningful.',
    ].join('\n');
  }
  // aiDepth === 'none' -> no block added (control group)

  // ── Variation context lines ──
  let variationBlock = '';
  const variationLines: string[] = [];

  if (context.isTargetedLeader) {
    variationLines.push('NOTE: You are currently being targeted because you\'re in the lead. Everyone is gunning for you.');
  }
  if (context.hasDoublePoints) {
    variationLines.push('NOTE: You\'re in last place. Your next claim is worth DOUBLE. Make it count.');
  }
  if (context.notificationMode === 'silent') {
    variationLines.push('Events appear on your phone silently. You might not notice them.');
  } else if (context.notificationMode === 'subtle') {
    variationLines.push('Events show up as a subtle badge. You might miss them if you\'re not paying attention.');
  }
  if (context.personaModified) {
    variationLines.push('NOTE: You\'ve had a few drinks. You\'re feeling more social, less focused, and more willing to go along with chaos.');
  }

  if (variationLines.length > 0) {
    variationBlock = ['>>> ACTIVE MODIFIERS <<<', ...variationLines].join('\n');
  }

  // ── Round 4: Ecosystem context blocks ──
  let sessionHistoryBlock = '';
  if (context.sessionHistory) {
    sessionHistoryBlock = [
      'YOUR HISTORY WITH THIS GROUP:',
      context.sessionHistory,
      '',
      'React to how much this shared history affects your engagement tonight.',
      'Do past grudges and running jokes make this more fun or more loaded?',
    ].join('\n');
  }

  let crewBlock = '';
  if (context.crewIdentity) {
    const crew = context.crewIdentity;
    crewBlock = [
      'YOUR CREW:',
      `Crew name: ${crew.name}`,
      `Motto: "${crew.motto}"`,
      crew.seasonInfo ? `Season info: ${crew.seasonInfo}` : '',
      '',
      'React to how much having a crew identity affects your investment in tonight.',
      'Does the crew name and motto make you feel part of something or is it cringe?',
    ].filter(Boolean).join('\n');
  }

  let recapBlock = '';
  if (context.recapAwareness === 'full_recap') {
    recapBlock = [
      "TONIGHT'S FORMAT:",
      'Everything tonight is being recorded for a shareable recap.',
      'Badges, best quotes, highlight reel — the whole thing.',
      'React to whether knowing this changes how you play.',
    ].join('\n');
  } else if (context.recapAwareness === 'no_recap') {
    recapBlock = [
      "TONIGHT'S FORMAT:",
      'No recap tonight. Just play. Nothing is being recorded or shared.',
      'React to whether the lack of a recap changes your energy.',
    ].join('\n');
  } else if (context.recapAwareness === 'social_share') {
    recapBlock = [
      "TONIGHT'S FORMAT:",
      'Everything tonight is being recorded for a shareable recap AND it will be posted on social media.',
      'Your quotes, your reactions, your moments — all public.',
      'React to whether knowing this is going on social media changes how you perform.',
    ].join('\n');
  }

  let teaserBlock = '';
  if (context.preEventTeasers === 'full_teasers') {
    teaserBlock = [
      'BUILDUP:',
      'For the past 5 days you received cryptic teasers:',
      '- Day 1: "Your chaos profile is being compiled..."',
      '- Day 2: "Someone in your group has a weakness we\'ll exploit Thursday."',
      '- Day 3: "The missions are being custom-built. You\'re not ready."',
      '- Day 4: "One of you will crack under pressure. We know who."',
      '- Day 5: "Tonight. 7pm. No mercy."',
      '',
      'You\'ve been thinking about this all week. Anticipation is HIGH.',
      'React to whether the buildup made tonight feel more or less intense.',
    ].join('\n');
  } else if (context.preEventTeasers === 'simple_invite') {
    teaserBlock = [
      'BUILDUP:',
      'You received a simple invite 5 days ago: "Game night Thursday at 7. Be there."',
      'No hype, no teasers. You knew it was happening, that\'s it.',
    ].join('\n');
  } else if (context.preEventTeasers === 'spontaneous') {
    teaserBlock = [
      'BUILDUP:',
      'You got a text an hour ago: "Come over, we\'re playing games."',
      'You just showed up. No expectations, no prep, no anticipation.',
    ].join('\n');
  }

  // ── Final assembly ──
  const blocks = [
    personaBlock,
    '',
    stateBlock,
    '',
    playersBlock,
    '',
    missionsBlock,
    '',
    claimBlock,
    '',
    eventBlock,
    '',
    historyBlock,
  ];

  if (variationBlock) {
    blocks.push('', variationBlock);
  }
  if (hostPowerBlock) {
    blocks.push('', hostPowerBlock);
  }
  if (aiModeBlock) {
    blocks.push('', aiModeBlock);
  }
  if (sessionHistoryBlock) {
    blocks.push('', sessionHistoryBlock);
  }
  if (crewBlock) {
    blocks.push('', crewBlock);
  }
  if (recapBlock) {
    blocks.push('', recapBlock);
  }
  if (teaserBlock) {
    blocks.push('', teaserBlock);
  }

  blocks.push('', `How does ${persona.name} react RIGHT NOW?`);

  return blocks.join('\n');
}

// ── User prompt builder: end-of-night final assessment ──────────────────────

export function buildFinalAssessmentPrompt(ctx: FinalAssessmentContext): string {
  const {
    persona,
    totalMinutes,
    gameType,
    playerNames,
    finalScore,
    finalRank,
    totalEvents,
    flashCount,
    pollCount,
    miniGameCount,
    engagedCount,
    ignoredCount,
    complaintCount,
    startEnergy,
    endEnergy,
    lowPointMinute,
    lowPointEnergy,
    highlights,
    lowPoints,
  } = ctx;

  const personaBlock = [
    `PERSONA: ${persona.name}`,
    persona.personality,
  ].join('\n');

  const sessionBlock = [
    'SESSION SUMMARY:',
    `- Total duration: ${totalMinutes} minutes`,
    `- Game type: ${gameType}`,
    `- Players: ${playerNames.join(', ')}`,
    `- Your final score: ${finalScore} (rank ${finalRank} of ${playerNames.length})`,
    `- Total chaos events: ${totalEvents} (${flashCount} flashes, ${pollCount} polls, ${miniGameCount} mini-games)`,
    `- Events you engaged with: ${engagedCount}/${totalEvents}`,
    `- Events you ignored: ${ignoredCount}`,
    `- Times you complained: ${complaintCount}`,
    `- Your energy curve: started at ${startEnergy.toFixed(1)}, ended at ${endEnergy.toFixed(1)}, low point at minute ${lowPointMinute} (${lowPointEnergy.toFixed(1)})`,
  ].join('\n');

  const highlightBlock =
    highlights.length > 0
      ? [
          'YOUR HIGHLIGHTS:',
          ...highlights.map(
            (h, i) =>
              `${i + 1}. Minute ${h.tick}: "${h.title}" (fun: ${h.fun}/10) — You said: "${h.dialogue}"`,
          ),
        ].join('\n')
      : 'YOUR HIGHLIGHTS: Nothing stood out.';

  const lowPointBlock =
    lowPoints.length > 0
      ? [
          'YOUR LOW POINTS:',
          ...lowPoints.map(
            (lp, i) =>
              `${i + 1}. Minute ${lp.tick}: "${lp.title}" (annoyance: ${lp.annoyance}/10) — You said: "${lp.dialogue}"`,
          ),
        ].join('\n')
      : 'YOUR LOW POINTS: Nothing was bad enough to remember.';

  // ── Round 4: Ecosystem context for final assessment ──
  let productPlacementBlock = '';
  if (ctx.productPlacement === 'direct_pitch') {
    productPlacementBlock = [
      'RECAP NOTE:',
      'Your post-game recap included this product recommendation:',
      '"Your group needs a fast closer — try Splice Your Dice! Available on Afterroar HQ."',
      'React to how this recommendation made you feel.',
    ].join('\n');
  } else if (ctx.productPlacement === 'social_proof') {
    productPlacementBlock = [
      'RECAP NOTE:',
      'Your post-game recap mentioned:',
      '"3 players in your crew already own Hack Your Deck — add it to next game night?"',
      'React to how this peer-driven suggestion made you feel.',
    ].join('\n');
  }
  // productPlacement === 'none' -> no block

  let ritualNudgeBlock = '';
  if (ctx.ritualNudge === 'schedule_nudge') {
    ritualNudgeBlock = [
      'END SCREEN:',
      'The end screen said: "Make this a ritual? Schedule next Thursday on Afterroar HQ."',
      'React to this scheduling prompt.',
    ].join('\n');
  } else if (ctx.ritualNudge === 'streak_pressure') {
    ritualNudgeBlock = [
      'END SCREEN:',
      'The end screen said: "Your crew has played 4 nights. The streak is alive. Don\'t break it."',
      'React to this streak messaging.',
    ].join('\n');
  }
  // ritualNudge === 'none' -> no block

  let ecosystemContextBlock = '';
  const ecosystemLines: string[] = [];
  if (ctx.sessionHistory) {
    ecosystemLines.push('YOUR HISTORY WITH THIS GROUP:', ctx.sessionHistory, '');
  }
  if (ctx.crewIdentity) {
    ecosystemLines.push(
      'YOUR CREW:',
      `Crew: ${ctx.crewIdentity.name} | Motto: "${ctx.crewIdentity.motto}"`,
      ctx.crewIdentity.seasonInfo ? `Season: ${ctx.crewIdentity.seasonInfo}` : '',
      '',
    );
  }
  if (ctx.recapAwareness === 'full_recap') {
    ecosystemLines.push('Tonight had a full recap with badges, quotes, and highlights.');
  } else if (ctx.recapAwareness === 'no_recap') {
    ecosystemLines.push('Tonight had no recap — just playing.');
  } else if (ctx.recapAwareness === 'social_share') {
    ecosystemLines.push('Tonight\'s recap is being shared on social media.');
  }
  if (ctx.preEventTeasers === 'full_teasers') {
    ecosystemLines.push('You received 5 days of cryptic teasers building up to tonight.');
  } else if (ctx.preEventTeasers === 'simple_invite') {
    ecosystemLines.push('You received a simple invite 5 days ago.');
  } else if (ctx.preEventTeasers === 'spontaneous') {
    ecosystemLines.push('You showed up spontaneously with no advance notice.');
  }
  if (ecosystemLines.length > 0) {
    ecosystemContextBlock = ecosystemLines.filter(Boolean).join('\n');
  }

  const jsonSchema = `ANSWER THESE QUESTIONS AS ${persona.name} (JSON):
{
  "overall_fun_rating": <1-10>,
  "disruption_rating": <1-10 how much chaos agent disrupted the main game>,
  "enhancement_rating": <1-10 how much chaos agent ENHANCED the game night>,
  "setup_difficulty": <1-10 how easy was it to get started>,
  "flow_rating": <1-10 how well did the chaos flow with the evening>,
  "would_play_again": <true/false>,
  "would_recommend": <true/false>,
  "would_pay_for_ai": <true/false>,
  "favorite_event_type": "flash_mission" | "poll" | "mini_game" | "standing_mission",
  "least_favorite_event_type": "flash_mission" | "poll" | "mini_game" | "standing_mission",
  "ideal_event_frequency": "more" | "same" | "less",
  "biggest_complaint": "<one sentence>",
  "best_moment": "<one sentence>",
  "narrative_summary": "<3-4 sentences describing your night from your perspective>",
  "suggestions": ["<specific improvement suggestion>", ...],
  "would_screenshot_moment": <true/false - was there a moment you'd screenshot to share?>,
  "would_post_on_social": <true/false - would you mention this on social media?>,
  "would_tell_friends_tomorrow": <true/false - would you tell someone about this tomorrow?>,
  "felt_closer_to_group": <true/false - did this bring the group closer?>,
  "funniest_moment_shareable": "<describe the moment you'd share with someone who wasn't there>",
  "would_schedule_next": <true/false - would you schedule the next game night right now?>,
  "streak_motivating": <true/false - does the idea of a play streak motivate you to come back?>,
  "product_rec_felt": "helpful" | "annoying" | "ignored" | "intriguing",
  "crew_identity_impact": <1-10 how much crew identity affected your experience>,
  "memory_impact": <1-10 how much references to past sessions affected your experience>
}`;

  const finalBlocks = [
    personaBlock,
    '',
    'THE NIGHT IS OVER. Here\'s what happened:',
    '',
    sessionBlock,
    '',
    highlightBlock,
    '',
    lowPointBlock,
  ];

  if (ecosystemContextBlock) {
    finalBlocks.push('', ecosystemContextBlock);
  }
  if (productPlacementBlock) {
    finalBlocks.push('', productPlacementBlock);
  }
  if (ritualNudgeBlock) {
    finalBlocks.push('', ritualNudgeBlock);
  }

  finalBlocks.push('', jsonSchema);

  return finalBlocks.join('\n');
}
