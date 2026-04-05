import { getGameProfile } from '../config/game-profiles.js';
import { getPersonas } from '../config/personas.js';
import type { ScenarioDefinition } from '../config/scenarios.js';
import { ClaudeBridge } from '../agents/claude-bridge.js';
import type { AgentResponse, FinalAssessment } from '../agents/claude-bridge.js';
import { AgentPool } from '../agents/agent-pool.js';
import type { Agent } from '../agents/agent.js';
import { SYSTEM_PROMPT, FINAL_ASSESSMENT_SYSTEM_PROMPT, buildUserPrompt, buildFinalAssessmentPrompt } from '../agents/prompts.js';
import type { AgentContext, FinalAssessmentContext } from '../agents/prompts.js';
import { GameState } from './game-state.js';
import { SessionState } from './session-state.js';
import { EventScheduler } from './event-scheduler.js';
import type { SimEvent } from '../events/event-types.js';
import { checkStandingClaims } from '../events/standing-mission.js';
import { simulateFlashMission } from '../events/flash-mission.js';
import { simulatePoll } from '../events/poll.js';
import { simulateMiniGame } from '../events/mini-game.js';
import { simulateClaimVote } from '../events/claim-vote.js';
import { MetricsCollector } from '../metrics/collector.js';
import { MetricsAggregator } from '../metrics/aggregator.js';
import type { AggregatedMetrics } from '../metrics/types.js';

// ── Inlined from @chaos-agent/shared to avoid ESM resolution issues ──────────

type MissionCategory = 'social' | 'performance' | 'sabotage' | 'alliance' | 'endurance' | 'meta';

interface StandingMissionTemplate {
  title: string;
  description: string;
  points: number;
  category: MissionCategory;
}

const STANDING_MISSION_POOL: StandingMissionTemplate[] = [
  // Social catches (5 pts each)
  { title: 'Um Counter', description: "Catch someone saying 'um' or 'uh'. Call it out to claim.", points: 5, category: 'social' },
  { title: 'Phone Addict', description: 'Catch someone checking their phone when they should be paying attention.', points: 5, category: 'social' },
  { title: 'Name Dropper', description: "Catch someone name-dropping a celebrity or famous person.", points: 5, category: 'social' },
  { title: 'The Apologizer', description: "Catch someone saying 'sorry' for no real reason.", points: 5, category: 'social' },
  { title: 'Potty Mouth', description: 'Catch someone swearing. First to call it out gets the points.', points: 5, category: 'social' },
  { title: 'Story Repeater', description: "Catch someone telling a story they've already told tonight.", points: 10, category: 'social' },
  { title: 'The Interrupter', description: 'Catch someone interrupting another player mid-sentence.', points: 5, category: 'social' },
  { title: 'Drink Spotter', description: 'Catch someone taking a drink at the exact same time as another player.', points: 5, category: 'social' },
  // Endurance challenges (10 pts)
  { title: 'No Laughing Zone', description: "Don't laugh for 5 minutes straight. Others can try to make you crack.", points: 10, category: 'endurance' },
  { title: 'The Whisperer', description: 'Only speak in whispers for 3 minutes. If caught talking normally, someone else claims.', points: 10, category: 'endurance' },
  { title: 'Straight Face', description: 'Keep a completely straight face during the next funny moment. Others judge if you cracked.', points: 10, category: 'endurance' },
  { title: 'Left Hand Only', description: 'Only use your left hand for 5 minutes. First person to catch you using your right claims.', points: 10, category: 'endurance' },
  // Social engineering (10-15 pts)
  { title: 'Compliment Chain', description: 'Get 3 different people to compliment each other within 5 minutes.', points: 15, category: 'alliance' },
  { title: 'Topic Hijacker', description: 'Steer the group conversation to a completely random topic. Claim when everyone is discussing it.', points: 10, category: 'sabotage' },
  { title: 'The Matchmaker', description: 'Get two people who rarely talk to each other into a real conversation.', points: 15, category: 'alliance' },
  { title: 'Laugh Riot', description: 'Make at least 3 people laugh at once with a single joke or comment.', points: 10, category: 'performance' },
  // Meta (5-10 pts)
  { title: 'Secret Agent', description: "Do something obviously chaotic and don't get caught by any other player for 2 minutes.", points: 10, category: 'meta' },
  { title: 'Chaos Detector', description: 'Correctly guess which player just completed a mission before they claim it.', points: 10, category: 'meta' },
  { title: 'Wallflower Watch', description: 'Be the first to notice when someone has been quiet for more than 3 minutes. Call it out.', points: 5, category: 'social' },
  { title: 'Rule Lawyer', description: 'Catch someone breaking a rule of the actual game you are playing.', points: 5, category: 'meta' },
];

type VotingMechanicId =
  | 'standard' | 'dictator' | 'pitch_it' | 'volunteer_tribunal'
  | 'reverse_psychology' | 'auction' | 'russian_roulette' | 'alibi'
  | 'the_bribe' | 'hot_seat' | 'proxy_vote' | 'unanimous_or_bust'
  | 'points_gamble' | 'crowd_cheer' | 'the_skeptic';

interface VotingMechanic {
  id: VotingMechanicId;
  name: string;
  description: string;
  reveal_text: string;
  chaos_level: 'chill' | 'moderate' | 'maximum';
  needs_input: boolean;
  auto_resolve: boolean;
  weight: number;
}

const VOTING_MECHANICS: Record<VotingMechanicId, VotingMechanic> = {
  standard: { id: 'standard', name: 'Standard Vote', description: 'Everyone votes LEGIT or BULLSHIT. Majority rules.', reveal_text: 'The people will decide your fate.', chaos_level: 'chill', needs_input: false, auto_resolve: false, weight: 30 },
  dictator: { id: 'dictator', name: 'THE DICTATOR', description: 'One player has been chosen. Their word is law.', reveal_text: 'Democracy is overrated. ONE shall decide.', chaos_level: 'moderate', needs_input: false, auto_resolve: false, weight: 7 },
  pitch_it: { id: 'pitch_it', name: 'Pitch It', description: 'The claimant gets 15 seconds to make their case. Then you vote.', reveal_text: 'Convince us. You have 15 seconds.', chaos_level: 'chill', needs_input: true, auto_resolve: false, weight: 8 },
  volunteer_tribunal: { id: 'volunteer_tribunal', name: 'Volunteer Tribunal', description: 'Who wants to judge? First volunteers become the jury.', reveal_text: 'We need volunteers. Step forward or stay silent.', chaos_level: 'chill', needs_input: false, auto_resolve: false, weight: 7 },
  reverse_psychology: { id: 'reverse_psychology', name: 'Reverse Psychology', description: 'Vote normally... or did we flip everything?', reveal_text: "Cast your votes. Trust your instincts. Or don't.", chaos_level: 'maximum', needs_input: false, auto_resolve: false, weight: 5 },
  auction: { id: 'auction', name: 'The Auction', description: 'Bid your own points. Highest bidder decides the outcome.', reveal_text: 'How much is the truth worth to you?', chaos_level: 'moderate', needs_input: true, auto_resolve: false, weight: 5 },
  russian_roulette: { id: 'russian_roulette', name: 'Russian Roulette', description: 'No vote. The chaos gods decide. 50/50.', reveal_text: "Votes? Where we're going, we don't need votes.", chaos_level: 'maximum', needs_input: false, auto_resolve: true, weight: 4 },
  alibi: { id: 'alibi', name: 'The Alibi', description: 'Claimant and a random witness both tell the story. Do they match?', reveal_text: "Let's hear both sides. Separately.", chaos_level: 'moderate', needs_input: true, auto_resolve: false, weight: 6 },
  the_bribe: { id: 'the_bribe', name: 'The Bribe', description: 'The claimant can offer their own points to buy your silence.', reveal_text: "Everyone has a price. What's yours?", chaos_level: 'moderate', needs_input: true, auto_resolve: false, weight: 5 },
  hot_seat: { id: 'hot_seat', name: 'Hot Seat', description: '3 rapid-fire questions. Answer them all in 10 seconds or fail.', reveal_text: 'Three questions. Ten seconds. No hesitation.', chaos_level: 'moderate', needs_input: true, auto_resolve: false, weight: 5 },
  proxy_vote: { id: 'proxy_vote', name: 'Proxy Vote', description: 'You vote on behalf of the player to your LEFT. Think like them.', reveal_text: 'You are not yourself right now. Vote as your neighbor.', chaos_level: 'maximum', needs_input: false, auto_resolve: false, weight: 4 },
  unanimous_or_bust: { id: 'unanimous_or_bust', name: 'Unanimous or Bust', description: "ONE bullshit call and it's over. All or nothing.", reveal_text: 'This requires UNANIMOUS approval. One dissenter ends it.', chaos_level: 'maximum', needs_input: false, auto_resolve: false, weight: 4 },
  points_gamble: { id: 'points_gamble', name: 'Double or Nothing', description: 'No vote. Coin flip. Win double or lose it all.', reveal_text: 'Forget the vote. Let fate decide. Double or nothing.', chaos_level: 'maximum', needs_input: false, auto_resolve: true, weight: 4 },
  crowd_cheer: { id: 'crowd_cheer', name: 'Crowd Cheer', description: 'Rate it 1-5. Average above 3 and it passes.', reveal_text: 'Make some noise! Rate the performance.', chaos_level: 'chill', needs_input: true, auto_resolve: false, weight: 6 },
  the_skeptic: { id: 'the_skeptic', name: 'THE SKEPTIC', description: "One player's vote counts TRIPLE. Everyone else counts once.", reveal_text: 'One among you has been granted... extra authority.', chaos_level: 'moderate', needs_input: false, auto_resolve: false, weight: 6 },
};

const CHAOS_LEVEL_ORDER: Record<string, number> = { chill: 1, moderate: 2, maximum: 3 };

function selectMechanic(
  chaosComfort: 'chill' | 'moderate' | 'maximum',
  recentMechanics: VotingMechanicId[] = [],
): VotingMechanic {
  const comfortLevel = CHAOS_LEVEL_ORDER[chaosComfort] || 2;
  const lastThree = new Set(recentMechanics.slice(-3));

  const eligible = Object.values(VOTING_MECHANICS).filter(
    (m) => CHAOS_LEVEL_ORDER[m.chaos_level] <= comfortLevel && !lastThree.has(m.id)
  );

  if (eligible.length === 0) {
    return VOTING_MECHANICS.standard;
  }

  const totalWeight = eligible.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const mechanic of eligible) {
    roll -= mechanic.weight;
    if (roll <= 0) return mechanic;
  }

  return eligible[eligible.length - 1];
}

export interface SimulationConfig {
  scenario: ScenarioDefinition;
  model: string;
  dryRun: boolean;
  verbose: boolean;
}

export class Timeline {
  private config: SimulationConfig;
  private claude: ClaudeBridge;
  readonly pool: AgentPool;
  private gameState: GameState;
  private sessionState: SessionState;
  private scheduler: EventScheduler;
  private collector: MetricsCollector;
  private events: SimEvent[] = [];
  private eventIdCounter: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;

    const personas = getPersonas(config.scenario.personaIds);
    const profile = getGameProfile(config.scenario.gameType);

    this.claude = new ClaudeBridge({
      model: config.model,
      dryRun: config.dryRun,
    });

    this.pool = new AgentPool(personas);
    this.gameState = new GameState(profile);
    this.sessionState = new SessionState(
      personas.map((p) => ({ id: p.id, name: p.name })),
      STANDING_MISSION_POOL.slice(0, 8), // Pick 8 standing missions per session
    );
    this.scheduler = new EventScheduler(config.scenario.eventFrequency);
    this.collector = new MetricsCollector();
  }

  async run(): Promise<{
    events: SimEvent[];
    metrics: AggregatedMetrics;
    assessments: Map<string, FinalAssessment>;
    apiStats: { totalCalls: number; totalTokens: number };
  }> {
    const { scenario } = this.config;

    console.log(`\n--- Starting simulation: ${scenario.name}`);
    console.log(`    ${scenario.playerCount} players, ${scenario.gameType.replace(/_/g, ' ')}, ${scenario.totalMinutes} minutes`);
    console.log(`    Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE'}\n`);

    let lastEventTick = -Infinity;

    for (let tick = 0; tick < scenario.totalMinutes; tick++) {
      // 1. Advance game state
      this.gameState.advance(tick);

      // 2. Apply gradual energy decay to all agents (very gradual -- good nights end at 4-6/10)
      for (const agent of this.pool.getAllAgents()) {
        agent.energy = Math.max(1, agent.energy - 0.02);
        agent.recordEnergy();
      }

      // 3. Check for spontaneous standing mission claims
      const standingClaim = checkStandingClaims(
        tick,
        this.pool.getAllAgents(),
        this.sessionState,
        this.gameState,
      );

      if (standingClaim) {
        const claimAgent = this.pool.getAgent(standingClaim.agentId);
        const mechanic = selectMechanic(
          this.config.scenario.chaosComfort,
          this.sessionState.recentMechanics as any[],
        );

        // Build a vote event for this claim
        const claimEvent = this.createEvent(tick, 'standing_claim', {
          title: `Claim: ${standingClaim.missionTitle}`,
          description: `${claimAgent.persona.name} claims "${standingClaim.missionTitle}"`,
          points: standingClaim.points,
          votingMechanic: { id: mechanic.id, name: mechanic.name, description: mechanic.description },
        });

        // Get reactions from other agents for the vote
        await this.collectReactions(claimEvent, tick, lastEventTick);

        // Resolve the vote
        const voteResult = simulateClaimVote(
          claimEvent,
          this.pool.getAllAgents(),
          standingClaim.agentId,
          mechanic.id,
        );

        claimEvent.resolution = {
          passed: voteResult.passed,
          pointsAwarded: voteResult.pointsAwarded,
          claimantId: standingClaim.agentId,
          votes: voteResult.votes,
        };

        if (voteResult.passed) {
          claimAgent.score += voteResult.pointsAwarded;
          this.sessionState.standingMissionsClaimed.add(standingClaim.missionTitle);
        }

        this.events.push(claimEvent);
        this.sessionState.addEvent({
          tick,
          type: 'standing_claim',
          title: claimEvent.title,
          reactions: claimEvent.reactions,
        });
        this.sessionState.recentMechanics.push(mechanic.id);
        lastEventTick = tick;

        if (this.config.verbose) {
          const outcome = voteResult.passed ? 'PASSED' : 'FAILED';
          console.log(`  [${tick}min] standing_claim: "${standingClaim.missionTitle}" by ${claimAgent.persona.name} -> ${outcome} (${mechanic.name})`);
        }
      }

      // 4. Check if the scheduler wants to fire a scheduled event
      const scheduled = this.scheduler.shouldFireEvent(tick, this.gameState, this.sessionState);

      if (scheduled) {
        const scheduledData = scheduled.data;
        const eventType = scheduled.type;

        // Build full SimEvent from scheduler output
        const event = this.createEvent(tick, eventType as SimEvent['type'], {
          title: scheduledData.title,
          description: (scheduledData.data as any)?.description ?? scheduledData.title,
          points: (scheduledData.data as any)?.points ?? 10,
          flashType: (scheduledData.data as any)?.flash_type,
          targetPlayer: (scheduledData.data as any)?.target,
          pollQuestion: (scheduledData.data as any)?.question,
          pollOptions: (scheduledData.data as any)?.options,
          miniGameType: (scheduledData.data as any)?.type,
          timer: (scheduledData.data as any)?.submissionTimeSec,
        });

        // Collect reactions from all agents
        await this.collectReactions(event, tick, lastEventTick);

        // Resolve the event based on type
        switch (eventType) {
          case 'flash_mission':
            simulateFlashMission(event, this.pool.getAllAgents());
            break;
          case 'poll':
            simulatePoll(event, this.pool.getAllAgents());
            break;
          case 'mini_game':
            simulateMiniGame(event, this.pool.getAllAgents());
            break;
        }

        this.events.push(event);
        this.sessionState.addEvent({
          tick,
          type: eventType,
          title: scheduledData.title,
          reactions: event.reactions,
        });
        lastEventTick = tick;

        if (this.config.verbose) {
          console.log(`  [${tick}min] ${eventType}: "${event.title}" -> ${this.summarizeReactions(event)}`);
        }
      }

      // 4b. Host power check -- every 20-30 minutes, Pat may use a host power
      if (this.shouldCheckHostPower(tick)) {
        const hostAction = this.evaluateHostPower(tick);
        if (hostAction) {
          const hostEvent = this.createEvent(tick, 'host_action' as SimEvent['type'], {
            title: `Host Power: ${hostAction.action}`,
            description: hostAction.description,
          });
          this.events.push(hostEvent);
          this.sessionState.addEvent({
            tick,
            type: 'host_action',
            title: hostEvent.title,
            reactions: new Map(),
          });
          lastEventTick = tick;

          if (this.config.verbose) {
            console.log(`  [${tick}min] HOST_POWER: ${hostAction.action} -- ${hostAction.description}`);
          }
        }
      }

      // 5. Record metrics for this tick
      const currentEvent = scheduled
        ? this.events[this.events.length - 1]
        : standingClaim
          ? this.events[this.events.length - 1]
          : null;

      this.collector.recordTick(
        tick,
        this.gameState.currentPhase.name,
        this.gameState.tensionLevel,
        this.gameState.disruptionTolerance,
        currentEvent,
        this.pool.getAllAgents(),
      );
    }

    // 6. Final assessments from all agents
    console.log('\n    Collecting final assessments...');
    const assessments = await this.collectFinalAssessments();

    // 7. Aggregate all metrics
    const aggregator = new MetricsAggregator();
    const metrics = aggregator.aggregate(
      this.collector.getTimeline(),
      this.events,
      this.pool.getAllAgents(),
      assessments,
    );

    const rawStats = this.claude.getStats();
    const apiStats = {
      totalCalls: rawStats.totalCalls,
      totalTokens: rawStats.totalInputTokens + rawStats.totalOutputTokens,
    };

    console.log(`\n    Simulation complete. ${this.events.length} events, ${apiStats.totalCalls} API calls.`);

    return { events: this.events, metrics, assessments, apiStats };
  }

  // ── Host power helpers ─────────────────────────────────────────────────

  private lastHostPowerTick: number = -Infinity;

  /** Check host powers every 20-30 minutes. */
  private shouldCheckHostPower(tick: number): boolean {
    const interval = 20 + Math.floor(Math.random() * 11); // 20-30
    return tick - this.lastHostPowerTick >= interval;
  }

  /** Evaluate whether Pat would use a host power based on group state. */
  private evaluateHostPower(tick: number): { action: string; description: string } | null {
    const pat = this.pool.getAllAgents().find((a) => a.persona.hostPowers);
    if (!pat) return null;

    const allAgents = this.pool.getAllAgents();
    const avgEnergy = allAgents.reduce((sum, a) => sum + a.energy, 0) / allAgents.length;

    // Find the most annoyed agent
    const mostAnnoyed = allAgents.reduce((worst, a) => {
      const annoyance = a.lastAnnoyance ?? 0;
      return annoyance > (worst.lastAnnoyance ?? 0) ? a : worst;
    }, allAgents[0]);

    // Find quiet agents (observers with low engagement)
    const quietAgents = allAgents.filter(
      (a) => a.persona.socialStyle === 'observer' && a.totalEngaged < (this.events.length * 0.3),
    );

    this.lastHostPowerTick = tick;

    // If average energy < 4: call a break
    if (avgEnergy < 4) {
      // Boost everyone's energy by 2-3
      for (const agent of allAgents) {
        agent.energy = Math.min(10, agent.energy + 2.5);
      }
      return {
        action: 'call_break',
        description: `Pat calls a 5-minute break. "Everyone grab a drink, stretch your legs. We're coming back strong." Group energy was ${avgEnergy.toFixed(1)}/10.`,
      };
    }

    // If someone is very annoyed (> 7): call a break or skip
    if ((mostAnnoyed.lastAnnoyance ?? 0) > 7) {
      for (const agent of allAgents) {
        agent.energy = Math.min(10, agent.energy + 2);
      }
      return {
        action: 'call_break',
        description: `Pat notices ${mostAnnoyed.persona.name} is getting frustrated. "Hey let's take five, I need to refill snacks anyway."`,
      };
    }

    // If group energy is dropping: trigger a flash to re-energize
    if (avgEnergy < 6 && avgEnergy > 4) {
      return {
        action: 'boost_energy',
        description: `Pat senses the energy dipping. "Alright, who wants to do something fun? I've got an idea..." Pat amps up the group with enthusiasm.`,
      };
    }

    // If someone is being quiet: target them
    if (quietAgents.length > 0) {
      const target = quietAgents[Math.floor(Math.random() * quietAgents.length)];
      return {
        action: 'target_player',
        description: `Pat turns to ${target.persona.name}: "Hey, you've been quiet -- what do you think? Pull them into the next event."`,
      };
    }

    return null;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** Create a SimEvent with a unique id. */
  private createEvent(
    tick: number,
    type: SimEvent['type'],
    opts: Partial<Omit<SimEvent, 'id' | 'type' | 'tick' | 'reactions'>>,
  ): SimEvent {
    return {
      id: `evt-${++this.eventIdCounter}`,
      type,
      tick,
      title: opts.title ?? '',
      description: opts.description ?? '',
      points: opts.points ?? 0,
      flashType: opts.flashType,
      targetPlayer: opts.targetPlayer,
      votingMechanic: opts.votingMechanic,
      miniGameType: opts.miniGameType,
      miniGameVariation: opts.miniGameVariation,
      pollQuestion: opts.pollQuestion,
      pollOptions: opts.pollOptions,
      timer: opts.timer,
      reactions: new Map(),
    };
  }

  /**
   * Collect reactions from all agents for a given event.
   * Distracted agents get a default missed reaction.
   */
  private async collectReactions(
    event: SimEvent,
    tick: number,
    lastEventTick: number,
  ): Promise<void> {
    const prompts = new Map<string, string>();
    const allAgents = this.pool.getAllAgents();
    const minutesSinceLastEvent = lastEventTick < 0 ? 0 : tick - lastEventTick;

    // Count events by type
    const eventCounts = {
      total: this.events.length,
      flash: this.events.filter((e) => e.type === 'flash_mission').length,
      poll: this.events.filter((e) => e.type === 'poll').length,
      miniGame: this.events.filter((e) => e.type === 'mini_game').length,
    };

    const standingMissions = this.sessionState.standingMissions
      .filter((m) => !this.sessionState.standingMissionsClaimed.has(m.title))
      .map((m) => ({ title: m.title, description: m.description, points: m.points }));

    const activeClaim = this.sessionState.activeClaim
      ? `${this.sessionState.activeClaim.missionTitle} by ${this.pool.getAgent(this.sessionState.activeClaim.claimantId).persona.name}`
      : null;

    for (const agent of allAgents) {
      if (agent.isDistracted(tick)) {
        // Agent missed the event
        event.reactions.set(agent.id, {
          decision: 'ignore',
          engagement: 0,
          disruption_perception: 0,
          fun_factor: 0,
          annoyance: 0,
          humor_landed: 0,
          energy_delta: 0,
          attention_cost: 0,
          dialogue: '',
          internal_thought: "Didn't see it, was on my phone",
          would_send_signal: null,
          vote_if_applicable: null,
          claim_if_applicable: false,
          submission_if_applicable: null,
          wants_more_chaos: false,
          wants_less_chaos: false,
          notification_feedback: 'missed_it',
          overall_vibe: agent.lastOverallVibe,
        } as AgentResponse);
        continue;
      }

      const otherAgents = this.pool.getOtherAgents(agent.id);
      const contextBase = agent.getContext(
        tick,
        this.config.scenario.totalMinutes,
        this.gameState.currentPhase.name,
        this.gameState.tensionLevel,
        this.gameState.disruptionTolerance,
        this.gameState.isDeadTime,
        otherAgents,
        standingMissions,
        activeClaim,
        eventCounts,
        minutesSinceLastEvent,
      );

      // Merge in event-specific fields
      const context: AgentContext = {
        ...contextBase,
        aiMode: this.config.scenario.aiMode ?? false,
        event: {
          type: event.type,
          title: event.title,
          description: event.description,
          points: event.points,
          timer: event.timer,
          votingMechanic: event.votingMechanic
            ? { name: event.votingMechanic.name, description: event.votingMechanic.description }
            : undefined,
          miniGameVariation: event.miniGameVariation
            ? { name: event.miniGameVariation.name, description: event.miniGameVariation.description }
            : undefined,
          pollQuestion: event.pollQuestion,
          pollOptions: event.pollOptions,
        },
      };

      prompts.set(agent.id, buildUserPrompt(context));
    }

    if (prompts.size > 0) {
      const reactions = await this.claude.getParallelReactions(SYSTEM_PROMPT, prompts);

      for (const [agentId, reaction] of reactions) {
        event.reactions.set(agentId, reaction);
        this.pool.getAgent(agentId).applyReaction(tick, event, reaction);

        // Record signals
        if (reaction.would_send_signal) {
          this.sessionState.addSignal({
            agentId,
            type: reaction.would_send_signal,
            tick,
          });
        }

        // Handle host power used via Claude response
        if (reaction.host_power_used === 'call_break') {
          // Break restores energy for everyone
          for (const a of this.pool.getAllAgents()) {
            a.energy = Math.min(10, a.energy + 2.5);
          }
          if (this.config.verbose) {
            console.log(`  [${tick}min] HOST_POWER (via response): ${agentId} called a break`);
          }
        }
      }
    }
  }

  /** Collect final assessments from all agents. */
  private async collectFinalAssessments(): Promise<Map<string, FinalAssessment>> {
    const assessments = new Map<string, FinalAssessment>();
    const allAgents = this.pool.getAllAgents();
    const playerNames = this.pool.getNames();

    for (const agent of allAgents) {
      const ctx: FinalAssessmentContext = {
        persona: agent.persona,
        totalMinutes: this.config.scenario.totalMinutes,
        gameType: this.config.scenario.gameType,
        playerNames,
        finalScore: agent.score,
        finalRank: this.getAgentRank(agent),
        totalEvents: this.events.length,
        flashCount: this.events.filter((e) => e.type === 'flash_mission').length,
        pollCount: this.events.filter((e) => e.type === 'poll').length,
        miniGameCount: this.events.filter((e) => e.type === 'mini_game').length,
        engagedCount: agent.totalEngaged,
        ignoredCount: agent.totalIgnored,
        complaintCount: agent.totalComplaints,
        startEnergy: agent.initialEnergy,
        endEnergy: agent.energy,
        lowPointMinute: agent.lowPointTick,
        lowPointEnergy: agent.lowPointEnergy,
        highlights: agent.getHighlights(3).map((h) => ({
          tick: h.tick,
          title: h.title,
          fun: h.fun,
          dialogue: h.dialogue,
        })),
        lowPoints: agent.getLowPoints(3).map((lp) => ({
          tick: lp.tick,
          title: lp.title,
          annoyance: lp.annoyance,
          dialogue: lp.dialogue,
        })),
      };

      const prompt = buildFinalAssessmentPrompt(ctx);
      const assessment = await this.claude.getFinalAssessment(
        FINAL_ASSESSMENT_SYSTEM_PROMPT,
        prompt,
      );
      assessments.set(agent.id, assessment);

      if (this.config.verbose) {
        console.log(`    ${agent.persona.name}: fun=${assessment.overall_fun_rating}/10, play_again=${assessment.would_play_again}`);
      }
    }

    return assessments;
  }

  /** Get an agent's rank by score (1 = highest). */
  private getAgentRank(agent: Agent): number {
    const scores = this.pool.getAllAgents().map((a) => a.score);
    scores.sort((a, b) => b - a);
    return scores.indexOf(agent.score) + 1;
  }

  /** Brief one-line summary for console output. */
  private summarizeReactions(event: SimEvent): string {
    let engaged = 0;
    let ignored = 0;
    let complained = 0;
    let totalFun = 0;
    let count = 0;

    for (const [, reaction] of event.reactions) {
      if (!reaction) continue;
      count++;
      if (reaction.decision === 'engage' || reaction.decision === 'half_engage') engaged++;
      else if (reaction.decision === 'ignore') ignored++;
      else if (reaction.decision === 'complain') complained++;
      totalFun += reaction.fun_factor ?? 0;
    }

    const avgFun = count > 0 ? (totalFun / count).toFixed(1) : '0';
    const resolution = event.resolution
      ? event.resolution.passed
        ? ` [PASSED, ${event.resolution.pointsAwarded}pts]`
        : ' [FAILED]'
      : '';

    return `${engaged} engaged, ${ignored} ignored, ${complained} complained. Avg fun: ${avgFun}${resolution}`;
  }
}
