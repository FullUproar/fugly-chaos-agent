// Inline pool data to avoid ESM resolution issues with the shared package
// These match the pools in packages/shared/src/constants/

import type { ScenarioDefinition, ScenarioVariation } from '../config/scenarios';
import type { GameState } from './game-state';
import type { SessionState, SimEvent } from './session-state';

type FlashType = 'race' | 'target' | 'group';
type MissionCategory = 'social' | 'performance' | 'sabotage' | 'alliance' | 'endurance' | 'meta';
type MiniGameType = 'drawing' | 'caption' | 'hot_take' | 'lie_detector' | 'worst_advice' | 'speed_superlative' | 'emoji_story' | 'two_word_story' | 'bluff_stats' | 'assumption_arena';

interface FlashMissionTemplate {
  flash_type: FlashType;
  title: string;
  description: string;
  points: number;
  category: MissionCategory;
  requires_target?: boolean;
}

interface MiniGameTemplate {
  type: MiniGameType;
  prompt: string;
  points: number;
  submissionTimeSec: number;
  votingTimeSec: number;
  playerNameSlot?: boolean;
}

const FLASH_MISSION_POOL: FlashMissionTemplate[] = [
  { flash_type: 'race', title: 'Say It Loud', description: "First person to yell 'CHAOS AGENT' wins!", points: 10, category: 'performance' },
  { flash_type: 'race', title: 'Pineapple!', description: "First person to work the word 'pineapple' into conversation naturally wins.", points: 10, category: 'social' },
  { flash_type: 'race', title: 'Compliment Bomb', description: 'First person to give a genuine compliment to the player on their left wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'Air Guitar Solo', description: 'First person to bust out a 5-second air guitar solo wins.', points: 10, category: 'performance' },
  { flash_type: 'race', title: 'Celebrity Impression', description: 'First person to do a recognizable celebrity impression wins.', points: 15, category: 'performance' },
  { flash_type: 'race', title: 'Dad Joke Showdown', description: 'First person to make someone else groan at a dad joke wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'High Five Chain', description: 'First person to high-five 3 different players wins.', points: 10, category: 'social' },
  { flash_type: 'race', title: 'Toast Master', description: 'First person to raise their glass and give a toast (real or ridiculous) wins.', points: 10, category: 'performance' },
  { flash_type: 'target', title: 'Topic Trap', description: 'Get [PLAYER] to talk about their job without directly asking them about it.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Laugh Attack', description: 'Make [PLAYER] laugh within 60 seconds. Any laugh counts.', points: 20, category: 'social', requires_target: true },
  { flash_type: 'target', title: 'The Echo', description: 'Get [PLAYER] to repeat a specific word you say, without them noticing.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Copycat', description: 'Get [PLAYER] to mirror your body language within 30 seconds.', points: 20, category: 'sabotage', requires_target: true },
  { flash_type: 'target', title: 'Story Time', description: 'Get [PLAYER] to tell a story about their childhood.', points: 20, category: 'social', requires_target: true },
  { flash_type: 'target', title: 'Snack Run', description: 'Convince [PLAYER] to get up and get you something to drink or eat.', points: 25, category: 'sabotage', requires_target: true },
  { flash_type: 'group', title: 'Point of Blame', description: 'Everyone point at who you think is the most chaotic player tonight!', points: 5, category: 'meta' },
  { flash_type: 'group', title: 'Freeze!', description: "Everyone freeze in place for 10 seconds. Last one to move wins 5 bonus points. Anyone who moves first loses 2.", points: 5, category: 'endurance' },
  { flash_type: 'group', title: 'Confess!', description: 'Everyone must confess one slightly embarrassing thing. Group votes on the best confession.', points: 5, category: 'performance' },
];

const POLL_QUESTION_POOL: string[] = [
  "Who's the most chaotic tonight?",
  "Who's most likely to crack first?",
  "Who's been suspiciously quiet?",
  "Who would survive a zombie apocalypse?",
  "Who tells the best stories?",
  "Who's the worst liar here?",
  "Who's the most competitive?",
  "Who should get targeted next?",
  "Who's having the most fun right now?",
  "Who would you trust with a secret?",
  "Who's the biggest troublemaker?",
  "Who would be the best spy?",
  "Who gives the best advice?",
  "Who's most likely to forget this night?",
  "Who's the funniest person here?",
];

/** Provocative poll pool for bar nights and high-chaos scenarios. */
const PROVOCATIVE_POLL_POOL: string[] = [
  "Who's the worst driver here?",
  "Who's most likely to start a bar fight?",
  "Who has the worst taste in music?",
  "Who would be the worst roommate?",
  "Who's told the biggest lie tonight?",
  "Who's most likely to get kicked out of here?",
  "Who would you LEAST want to be stuck on a desert island with?",
  "Who's the biggest lightweight?",
  "Who's most likely to drunk-text their ex tonight?",
  "Who has the worst fashion sense at this table?",
  "Who's most likely to get lost on the way home?",
  "Who would survive longest in prison?",
  "Who's secretly the biggest nerd here?",
  "Who would be the worst at karaoke?",
  "Who's most likely to ghost the group chat tomorrow?",
];

const ALL_MINI_GAME_PROMPTS: MiniGameTemplate[] = [
  // Drawing
  { type: 'drawing', prompt: "Draw {PLAYER}'s spirit animal", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw what {PLAYER} looks like at 3am", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw the most chaotic snack combination", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw your reaction when someone calls BULLSHIT", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER} winning a Nobel Prize", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw your last braincell right now", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER}'s dating profile photo", points: 30, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw what you think the host's search history looks like", points: 25, submissionTimeSec: 60, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw a new mascot for this group", points: 20, submissionTimeSec: 60, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER} as a superhero with the lamest power", points: 25, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  { type: 'drawing', prompt: "Draw what chaos looks like", points: 20, submissionTimeSec: 45, votingTimeSec: 30 },
  { type: 'drawing', prompt: "Draw {PLAYER}'s autobiography cover", points: 30, submissionTimeSec: 60, votingTimeSec: 30, playerNameSlot: true },
  // Caption
  { type: 'caption', prompt: "Write a tagline for {PLAYER}'s reality TV show", points: 20, submissionTimeSec: 30, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "What's {PLAYER} thinking right now?", points: 15, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "Write a fortune cookie message for this group", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'caption', prompt: "Name this game night in 5 words or less", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'caption', prompt: "Write {PLAYER}'s campaign slogan if they ran for president", points: 20, submissionTimeSec: 30, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "What would {PLAYER}'s autobiography be called?", points: 20, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "Write a one-star review of this game night", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'caption', prompt: "Last words of the loser tonight", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'caption', prompt: "Write a breakup text from {PLAYER} to their phone", points: 20, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'caption', prompt: "Describe this group in a haiku", points: 25, submissionTimeSec: 40, votingTimeSec: 20 },
  // Hot take
  { type: 'hot_take', prompt: "Pineapple on pizza is a war crime", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "Board games are better than video games", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "The host always has an unfair advantage", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "{PLAYER} would survive a zombie apocalypse", points: 10, submissionTimeSec: 10, votingTimeSec: 0, playerNameSlot: true },
  { type: 'hot_take', prompt: "Cereal is a soup", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "It's acceptable to look at someone else's screen", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "{PLAYER} is secretly the most competitive person here", points: 10, submissionTimeSec: 10, votingTimeSec: 0, playerNameSlot: true },
  { type: 'hot_take', prompt: "The person who brings snacks is more important than the person who brings games", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "Socks with sandals is a power move", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "You can tell everything about a person by their board game strategy", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  { type: 'hot_take', prompt: "{PLAYER} would be the worst roommate", points: 10, submissionTimeSec: 10, votingTimeSec: 0, playerNameSlot: true },
  { type: 'hot_take', prompt: "Monopoly has ruined more friendships than anything else in history", points: 10, submissionTimeSec: 10, votingTimeSec: 0 },
  // Lie detector
  { type: 'lie_detector', prompt: "Tell us something embarrassing you've done at a party", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about a time you got caught doing something you shouldn't", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us your most unusual talent or skill", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us the weirdest food you've ever eaten", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about a celebrity encounter you've had", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us your most irrational fear", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about the dumbest thing you've ever spent money on", points: 15, submissionTimeSec: 25, votingTimeSec: 20 },
  { type: 'lie_detector', prompt: "Tell us about a time you completely failed at something easy", points: 20, submissionTimeSec: 30, votingTimeSec: 20 },
  // Worst Advice (bar-optimized)
  { type: 'worst_advice' as MiniGameType, prompt: "Give the worst possible dating advice", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'worst_advice' as MiniGameType, prompt: "Give the worst advice for a job interview", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'worst_advice' as MiniGameType, prompt: "Give the worst advice for meeting your partner's parents", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  { type: 'worst_advice' as MiniGameType, prompt: "Give the worst financial advice possible", points: 15, submissionTimeSec: 20, votingTimeSec: 20 },
  // Speed Superlative (bar-optimized)
  { type: 'speed_superlative' as MiniGameType, prompt: "Most likely to end up on a reality show", points: 10, submissionTimeSec: 10, votingTimeSec: 15 },
  { type: 'speed_superlative' as MiniGameType, prompt: "Most likely to survive a haunted house", points: 10, submissionTimeSec: 10, votingTimeSec: 15 },
  { type: 'speed_superlative' as MiniGameType, prompt: "Most likely to accidentally go viral", points: 10, submissionTimeSec: 10, votingTimeSec: 15 },
  { type: 'speed_superlative' as MiniGameType, prompt: "Most likely to start a conspiracy theory", points: 10, submissionTimeSec: 10, votingTimeSec: 15 },
  // Assumption Arena (dinner-party optimized)
  { type: 'assumption_arena' as MiniGameType, prompt: "What was {PLAYER}'s most embarrassing phase growing up?", points: 15, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'assumption_arena' as MiniGameType, prompt: "What's {PLAYER}'s guilty pleasure TV show?", points: 15, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'assumption_arena' as MiniGameType, prompt: "What would {PLAYER}'s last meal be?", points: 15, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
  { type: 'assumption_arena' as MiniGameType, prompt: "What song is {PLAYER}'s secret karaoke go-to?", points: 15, submissionTimeSec: 25, votingTimeSec: 20, playerNameSlot: true },
];

export type ScheduledEventType = 'flash_mission' | 'poll' | 'mini_game';

export interface ScheduledEvent {
  type: ScheduledEventType;
  data: SimEvent;
}

/**
 * Decides when and what events to fire during a simulation.
 *
 * Respects cooldowns, active blocking activities, phase-based weighting,
 * disruption tolerance, dead-time preference, signal overrides, and
 * variation-level overrides (tension suppression, event type filtering,
 * mini-game type filtering, standing mission count, etc).
 */
export class EventScheduler {
  private lastFlashTick: number = -Infinity;
  private lastPollTick: number = -Infinity;
  private lastMiniGameTick: number = -Infinity;
  private readonly config: ScenarioDefinition['eventFrequency'];
  private readonly variation: ScenarioVariation | null;
  private totalEventsFired: number = 0;

  /**
   * Per-event-type cooldowns are rolled ONCE when an event fires,
   * so the next fire time is deterministic until it actually fires.
   */
  private nextFlashEligible: number;
  private nextPollEligible: number;
  private nextMiniGameEligible: number;

  // Track used indices to avoid repeats within a session.
  private usedFlashIndices: Set<number> = new Set();
  private usedPollIndices: Set<number> = new Set();
  private usedMiniGameIndices: Set<number> = new Set();

  constructor(
    config: ScenarioDefinition['eventFrequency'],
    variation?: ScenarioVariation | null,
  ) {
    // Use variation frequency overrides if present
    this.config = variation?.eventFrequency ?? config;
    this.variation = variation ?? null;

    const firstEventDelay = variation?.firstEventDelayMin ?? 0;
    const baseFlash = 5 + Math.floor(Math.random() * 3);    // 5-7
    const basePoll = 6 + Math.floor(Math.random() * 4);     // 6-9
    const baseMiniGame = 8 + Math.floor(Math.random() * 5); // 8-12

    // Apply first event delay and interval ramp factor
    const rampFactor = variation?.intervalRampFactor ?? 1.0;
    this.nextFlashEligible = Math.max(baseFlash, firstEventDelay) * rampFactor;
    this.nextPollEligible = Math.max(basePoll, firstEventDelay + 1) * rampFactor;
    this.nextMiniGameEligible = Math.max(baseMiniGame, firstEventDelay + 3) * rampFactor;
  }

  /**
   * Evaluate whether an event should fire at this tick.
   * Returns null if no event should fire, or a ScheduledEvent with full data.
   */
  shouldFireEvent(
    tick: number,
    gameState: GameState,
    sessionState: SessionState,
  ): ScheduledEvent | null {
    // 0. Check max events per session cap
    if (this.variation?.maxEventsPerSession && this.totalEventsFired >= this.variation.maxEventsPerSession) {
      return null;
    }

    // 1. Don't fire if there's a blocking activity (active claim or mini-game).
    if (sessionState.hasBlockingActivity) return null;

    // 2. Don't fire if there's already an active flash mission.
    if (sessionState.activeFlash) return null;

    // 3. Suppress during high tension if variation says so
    if (this.variation?.suppressDuringHighTension && gameState.tensionLevel > 7) {
      return null;
    }

    // 4. Disruption tolerance only reduces frequency at very low levels (< 3),
    //    not blocks entirely. 50% chance to skip this tick when tolerance < 3.
    if (gameState.disruptionTolerance < 3) {
      if (Math.random() < 0.5) return null;
    }

    // 5. Check if a shake_it_up signal was sent recently -- halve remaining cooldowns.
    const shakeItUp = sessionState.hasRecentSignal('shake_it_up', tick, 3);
    if (shakeItUp) {
      // Bring eligible times closer to now
      const pullForward = (eligible: number) => Math.min(eligible, tick + 1);
      this.nextFlashEligible = pullForward(this.nextFlashEligible);
      this.nextPollEligible = pullForward(this.nextPollEligible);
      this.nextMiniGameEligible = pullForward(this.nextMiniGameEligible);
    }

    // 5b. Calculate interval ramp factor (shrinks from rampFactor to 1.0 over session)
    const rampFactor = this.calcRampFactor(tick, sessionState);

    // 6. Build candidate list of event types that have reached their eligible tick.
    //    Default mix: ~50% flash, ~30% poll, ~20% mini-game
    //    Variation miniGameWeight adjusts mini-game relative to flash/poll.
    const candidates: Array<{ type: ScheduledEventType; weight: number }> = [];
    const allowedTypes = this.variation?.allowedEventTypes;
    const miniGameWeightMult = this.variation?.miniGameWeight ?? 1.0;

    if (tick >= this.nextFlashEligible && (!allowedTypes || allowedTypes.includes('flash_mission'))) {
      const phaseWeight = this.phaseWeight(gameState.currentPhase.name, 'flash');
      candidates.push({ type: 'flash_mission', weight: 5.0 * phaseWeight });
    }

    if (tick >= this.nextPollEligible && (!allowedTypes || allowedTypes.includes('poll'))) {
      const phaseWeight = this.phaseWeight(gameState.currentPhase.name, 'poll');
      candidates.push({ type: 'poll', weight: 3.0 * phaseWeight });
    }

    if (tick >= this.nextMiniGameEligible && (!allowedTypes || allowedTypes.includes('mini_game'))) {
      const phaseWeight = this.phaseWeight(gameState.currentPhase.name, 'mini_game');
      candidates.push({ type: 'mini_game', weight: 2.0 * phaseWeight * miniGameWeightMult });
    }

    if (candidates.length === 0) return null;

    // 7. Dead time is a BONUS -- boost weights slightly, but events can
    //    fire during active play too.
    if (gameState.isDeadTime) {
      for (const c of candidates) c.weight *= 1.3;
    }

    // 8. Weighted random pick.
    const chosen = this.weightedPick(candidates);
    if (!chosen) return null;

    const playerNames = sessionState.players.map((p) => p.name);

    // 9. Build the event.
    switch (chosen.type) {
      case 'flash_mission': {
        const mission = this.pickFlashMission(playerNames);
        if (!mission) return null;
        // Apply flash point multiplier from variation
        if (this.variation?.flashPointMultiplier) {
          mission.points = Math.round(mission.points * this.variation.flashPointMultiplier);
        }
        this.lastFlashTick = tick;
        this.nextFlashEligible = tick + this.randomInRange(this.config.flashMissionIntervalMin) * rampFactor;
        this.totalEventsFired++;
        return {
          type: 'flash_mission',
          data: {
            tick,
            type: 'flash_mission',
            title: mission.title,
            data: { ...mission },
            reactions: new Map(),
          },
        };
      }
      case 'poll': {
        const poll = this.pickPoll(playerNames);
        if (!poll) return null;
        this.lastPollTick = tick;
        this.nextPollEligible = tick + this.randomInRange(this.config.pollIntervalMin) * rampFactor;
        this.totalEventsFired++;
        return {
          type: 'poll',
          data: {
            tick,
            type: 'poll',
            title: poll.question,
            data: { question: poll.question, options: poll.options },
            reactions: new Map(),
          },
        };
      }
      case 'mini_game': {
        const miniGame = this.pickMiniGame(playerNames);
        if (!miniGame) return null;
        this.lastMiniGameTick = tick;
        this.nextMiniGameEligible = tick + this.randomInRange(this.config.miniGameIntervalMin) * rampFactor;
        this.totalEventsFired++;
        return {
          type: 'mini_game',
          data: {
            tick,
            type: 'mini_game',
            title: miniGame.prompt,
            data: { ...miniGame },
            reactions: new Map(),
          },
        };
      }
    }
  }

  // ---- Private helpers ----

  /** Calculate the current ramp factor (shrinks from initial rampFactor to 1.0 over session). */
  private calcRampFactor(tick: number, sessionState: SessionState): number {
    if (!this.variation?.intervalRampFactor || this.variation.intervalRampFactor <= 1.0) return 1.0;
    // Linear ramp: starts at intervalRampFactor, reaches 1.0 at ~60% through the session
    // We estimate total minutes from the event log's existence (rough heuristic)
    const progress = Math.min(1.0, tick / 60); // ramp completes by minute 60
    const factor = this.variation.intervalRampFactor - (this.variation.intervalRampFactor - 1.0) * progress;
    return Math.max(1.0, factor);
  }

  /** Pick a flash mission from the shared pool, substituting [PLAYER] if needed. */
  private pickFlashMission(playerNames: string[]): FlashMissionTemplate | null {
    let pool = FLASH_MISSION_POOL;

    // Filter by allowed mission categories if set
    if (this.variation?.allowedMissionCategories) {
      const allowed = new Set(this.variation.allowedMissionCategories);
      pool = pool.filter((m) => allowed.has(m.category));
    }

    if (pool.length === 0) return null;

    const idx = this.pickUnusedIndex(pool.length, this.usedFlashIndices);
    const template = { ...pool[idx] };

    if (template.requires_target && playerNames.length > 0) {
      const target = playerNames[Math.floor(Math.random() * playerNames.length)];
      template.description = template.description.replace('[PLAYER]', target);
    }

    return template;
  }

  /** Pick a poll question and build options from player names. */
  private pickPoll(playerNames: string[]): { question: string; options: string[] } | null {
    const pool = this.variation?.provocativePolls ? PROVOCATIVE_POLL_POOL : POLL_QUESTION_POOL;
    if (pool.length === 0) return null;

    const idx = this.pickUnusedIndex(pool.length, this.usedPollIndices);
    return {
      question: pool[idx],
      options: [...playerNames],
    };
  }

  /** Pick a mini-game prompt, substituting {PLAYER} if needed. */
  private pickMiniGame(playerNames: string[]): MiniGameTemplate | null {
    let pool = ALL_MINI_GAME_PROMPTS;

    // Filter by allowed mini-game types if set
    if (this.variation?.allowedMiniGameTypes) {
      const allowed = new Set(this.variation.allowedMiniGameTypes);
      pool = pool.filter((m) => allowed.has(m.type));
    }

    if (pool.length === 0) return null;

    const idx = this.pickUnusedIndex(pool.length, this.usedMiniGameIndices);
    const template = { ...pool[idx] };

    if (template.playerNameSlot && playerNames.length > 0) {
      const target = playerNames[Math.floor(Math.random() * playerNames.length)];
      template.prompt = template.prompt.replace('{PLAYER}', target);
    }

    return template;
  }

  /**
   * Pick an index from a pool, preferring unused ones.
   * Resets the used set when all indices have been consumed.
   */
  private pickUnusedIndex(poolSize: number, usedSet: Set<number>): number {
    if (usedSet.size >= poolSize) usedSet.clear();

    let idx: number;
    let attempts = 0;
    do {
      idx = Math.floor(Math.random() * poolSize);
      attempts++;
    } while (usedSet.has(idx) && attempts < poolSize * 2);

    usedSet.add(idx);
    return idx;
  }

  /** Phase-based weight multipliers for each event type. */
  private phaseWeight(
    phase: 'setup' | 'early' | 'mid' | 'late' | 'endgame',
    eventType: 'flash' | 'poll' | 'mini_game',
  ): number {
    const weights: Record<string, Record<string, number>> = {
      flash: { setup: 0.3, early: 0.6, mid: 1.0, late: 1.2, endgame: 0.8 },
      poll: { setup: 0.8, early: 1.0, mid: 0.8, late: 0.6, endgame: 0.4 },
      mini_game: { setup: 0.2, early: 0.6, mid: 1.0, late: 0.8, endgame: 0.5 },
    };
    return weights[eventType]?.[phase] ?? 0.5;
  }

  /** Random number within an [min, max] range (inclusive). */
  private randomInRange([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
  }

  /** Weighted random selection from candidates. */
  private weightedPick<T extends { weight: number }>(candidates: T[]): T | null {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) return null;

    let roll = Math.random() * totalWeight;
    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate;
    }
    return candidates[candidates.length - 1];
  }
}
