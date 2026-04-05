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
  if (context.aiMode) {
    aiModeBlock = [
      'NOTE: These missions were AI-generated specifically for your group based on your setup answers',
      'and what has happened tonight. They reference your names, your inside jokes, and recent events.',
      'React to how PERSONALIZED this feels compared to generic missions.',
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

  if (hostPowerBlock) {
    blocks.push('', hostPowerBlock);
  }
  if (aiModeBlock) {
    blocks.push('', aiModeBlock);
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
  "funniest_moment_shareable": "<describe the moment you'd share with someone who wasn't there>"
}`;

  return [
    personaBlock,
    '',
    'THE NIGHT IS OVER. Here\'s what happened:',
    '',
    sessionBlock,
    '',
    highlightBlock,
    '',
    lowPointBlock,
    '',
    jsonSchema,
  ].join('\n');
}
