import Anthropic from '@anthropic-ai/sdk';
import type { AgentResponse, FinalAssessment } from '../events/event-types.js';

export type { AgentResponse, FinalAssessment } from '../events/event-types.js';

// ── Defaults for fallback / dry-run ─────────────────────────────────────────

const DEFAULT_AGENT_RESPONSE: AgentResponse = {
  decision: 'half_engage',
  engagement: 5,
  disruption_perception: 5,
  fun_factor: 5,
  annoyance: 3,
  humor_landed: 5,
  energy_delta: 0,
  attention_cost: 4,
  dialogue: '*glances at phone* "Huh, okay."',
  internal_thought: 'This is fine, I guess.',
  would_send_signal: null,
  vote_if_applicable: null,
  claim_if_applicable: false,
  submission_if_applicable: null,
  wants_more_chaos: false,
  wants_less_chaos: false,
  notification_feedback: 'just_right',
  overall_vibe: 'fine',
  host_power_used: null,
};

const DEFAULT_FINAL_ASSESSMENT: FinalAssessment = {
  overall_fun_rating: 6,
  disruption_rating: 5,
  enhancement_rating: 5,
  setup_difficulty: 4,
  flow_rating: 5,
  would_play_again: true,
  would_recommend: true,
  would_pay_for_ai: false,
  favorite_event_type: 'flash_mission',
  least_favorite_event_type: 'poll',
  ideal_event_frequency: 'same',
  biggest_complaint: 'Nothing major stood out.',
  best_moment: 'It was generally a decent time.',
  narrative_summary:
    'The night was fine. Nothing blew my mind but nothing ruined it either. ' +
    'Would probably do it again if someone else set it up.',
  suggestions: ['Fewer events during intense game moments.'],
  would_screenshot_moment: false,
  would_post_on_social: false,
  would_tell_friends_tomorrow: true,
  felt_closer_to_group: true,
  funniest_moment_shareable: 'Nothing stood out enough to share.',
};

// ── Validation helpers ──────────────────────────────────────────────────────

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function validateAgentResponse(raw: Record<string, unknown>): AgentResponse {
  const validDecisions = ['engage', 'ignore', 'complain', 'half_engage'] as const;
  const validSignals = [null, 'shake_it_up', 'slow_your_roll', 'im_bored'];
  const validVotes = [null, 'ACCEPT', 'BULLSHIT'];
  const validNotif = ['too_loud', 'too_quiet', 'just_right', 'missed_it'];
  const validVibes = ['loving_it', 'fine', 'meh', 'annoyed', 'frustrated', 'checked_out'];

  const decision = validDecisions.includes(raw.decision as any)
    ? (raw.decision as AgentResponse['decision'])
    : DEFAULT_AGENT_RESPONSE.decision;

  return {
    decision,
    engagement: clamp(raw.engagement, 1, 10, 5),
    disruption_perception: clamp(raw.disruption_perception, 1, 10, 5),
    fun_factor: clamp(raw.fun_factor, 1, 10, 5),
    annoyance: clamp(raw.annoyance, 1, 10, 3),
    humor_landed: clamp(raw.humor_landed, 1, 10, 5),
    energy_delta: clamp(raw.energy_delta, -3, 3, 0),
    attention_cost: clamp(raw.attention_cost, 1, 10, 4),
    dialogue:
      typeof raw.dialogue === 'string' ? raw.dialogue : DEFAULT_AGENT_RESPONSE.dialogue,
    internal_thought:
      typeof raw.internal_thought === 'string'
        ? raw.internal_thought
        : DEFAULT_AGENT_RESPONSE.internal_thought,
    would_send_signal: validSignals.includes(raw.would_send_signal as any)
      ? (raw.would_send_signal as string | null)
      : null,
    vote_if_applicable: validVotes.includes(raw.vote_if_applicable as any)
      ? (raw.vote_if_applicable as string | null)
      : null,
    claim_if_applicable:
      typeof raw.claim_if_applicable === 'boolean' ? raw.claim_if_applicable : false,
    submission_if_applicable:
      raw.submission_if_applicable === null || typeof raw.submission_if_applicable === 'string'
        ? (raw.submission_if_applicable as string | null)
        : null,
    wants_more_chaos:
      typeof raw.wants_more_chaos === 'boolean' ? raw.wants_more_chaos : false,
    wants_less_chaos:
      typeof raw.wants_less_chaos === 'boolean' ? raw.wants_less_chaos : false,
    notification_feedback: (
      validNotif.includes(raw.notification_feedback as any)
        ? raw.notification_feedback
        : 'just_right'
    ) as AgentResponse['notification_feedback'],
    overall_vibe:
      validVibes.includes(raw.overall_vibe as any)
        ? (raw.overall_vibe as string)
        : 'fine',
    host_power_used:
      typeof raw.host_power_used === 'string' ? raw.host_power_used : null,
  };
}

function validateFinalAssessment(raw: Record<string, unknown>): FinalAssessment {
  const validEventTypes = ['flash_mission', 'poll', 'mini_game', 'standing_mission'];
  const validFreqs = ['more', 'same', 'less'];

  return {
    overall_fun_rating: clamp(raw.overall_fun_rating, 1, 10, 6),
    disruption_rating: clamp(raw.disruption_rating, 1, 10, 5),
    enhancement_rating: clamp(raw.enhancement_rating, 1, 10, 5),
    setup_difficulty: clamp(raw.setup_difficulty, 1, 10, 4),
    flow_rating: clamp(raw.flow_rating, 1, 10, 5),
    would_play_again:
      typeof raw.would_play_again === 'boolean' ? raw.would_play_again : true,
    would_recommend:
      typeof raw.would_recommend === 'boolean' ? raw.would_recommend : true,
    would_pay_for_ai:
      typeof raw.would_pay_for_ai === 'boolean' ? raw.would_pay_for_ai : false,
    favorite_event_type: validEventTypes.includes(raw.favorite_event_type as any)
      ? (raw.favorite_event_type as string)
      : 'flash_mission',
    least_favorite_event_type: validEventTypes.includes(raw.least_favorite_event_type as any)
      ? (raw.least_favorite_event_type as string)
      : 'poll',
    ideal_event_frequency: (
      validFreqs.includes(raw.ideal_event_frequency as any)
        ? raw.ideal_event_frequency
        : 'same'
    ) as FinalAssessment['ideal_event_frequency'],
    biggest_complaint:
      typeof raw.biggest_complaint === 'string'
        ? raw.biggest_complaint
        : DEFAULT_FINAL_ASSESSMENT.biggest_complaint,
    best_moment:
      typeof raw.best_moment === 'string'
        ? raw.best_moment
        : DEFAULT_FINAL_ASSESSMENT.best_moment,
    narrative_summary:
      typeof raw.narrative_summary === 'string'
        ? raw.narrative_summary
        : DEFAULT_FINAL_ASSESSMENT.narrative_summary,
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((s): s is string => typeof s === 'string')
      : DEFAULT_FINAL_ASSESSMENT.suggestions,
    would_screenshot_moment:
      typeof raw.would_screenshot_moment === 'boolean' ? raw.would_screenshot_moment : false,
    would_post_on_social:
      typeof raw.would_post_on_social === 'boolean' ? raw.would_post_on_social : false,
    would_tell_friends_tomorrow:
      typeof raw.would_tell_friends_tomorrow === 'boolean' ? raw.would_tell_friends_tomorrow : true,
    felt_closer_to_group:
      typeof raw.felt_closer_to_group === 'boolean' ? raw.felt_closer_to_group : true,
    funniest_moment_shareable:
      typeof raw.funniest_moment_shareable === 'string'
        ? raw.funniest_moment_shareable
        : DEFAULT_FINAL_ASSESSMENT.funniest_moment_shareable,
  };
}

// ── ClaudeBridge ────────────────────────────────────────────────────────────

export class ClaudeBridge {
  private client: Anthropic | null;
  private model: string;
  private dryRun: boolean;
  private totalCalls: number = 0;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private dryRunCounter: number = 0;

  constructor(options?: { model?: string; dryRun?: boolean }) {
    this.model = options?.model ?? 'claude-sonnet-4-20250514';
    this.dryRun = options?.dryRun ?? false;
    // Only instantiate the Anthropic client when we actually need it.
    this.client = this.dryRun ? null : new Anthropic();
  }

  /** Call Claude for a single agent's reaction to an event. */
  async getAgentReaction(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AgentResponse> {
    if (this.dryRun) {
      return this.mockAgentResponse(userPrompt);
    }
    return this.callWithRetry<AgentResponse>(
      systemPrompt,
      userPrompt,
      validateAgentResponse,
      DEFAULT_AGENT_RESPONSE,
    );
  }

  /** Call Claude for multiple agents in parallel. Returns map of agentId -> response. */
  async getParallelReactions(
    systemPrompt: string,
    agentPrompts: Map<string, string>,
  ): Promise<Map<string, AgentResponse>> {
    const results = new Map<string, AgentResponse>();

    if (this.dryRun) {
      for (const [agentId, prompt] of agentPrompts) {
        results.set(agentId, this.mockAgentResponse(prompt));
      }
      return results;
    }

    const entries = Array.from(agentPrompts.entries());
    const promises = entries.map(async ([agentId, prompt]) => {
      const reaction = await this.getAgentReaction(systemPrompt, prompt);
      return [agentId, reaction] as const;
    });

    const settled = await Promise.allSettled(promises);
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const [agentId, reaction] = result.value;
        results.set(agentId, reaction);
      } else {
        console.error('[ClaudeBridge] Parallel call failed:', result.reason);
      }
    }

    return results;
  }

  /** Get final end-of-night assessment from an agent. */
  async getFinalAssessment(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<FinalAssessment> {
    if (this.dryRun) {
      return { ...DEFAULT_FINAL_ASSESSMENT };
    }
    return this.callWithRetry<FinalAssessment>(
      systemPrompt,
      userPrompt,
      validateFinalAssessment,
      DEFAULT_FINAL_ASSESSMENT,
    );
  }

  /** Return cumulative API usage stats. */
  getStats(): { totalCalls: number; totalInputTokens: number; totalOutputTokens: number } {
    return {
      totalCalls: this.totalCalls,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async callWithRetry<T>(
    systemPrompt: string,
    userPrompt: string,
    validate: (raw: Record<string, unknown>) => T,
    fallback: T,
    retries: number = 1,
  ): Promise<T> {
    if (!this.client) {
      throw new Error('ClaudeBridge: Anthropic client not initialized (dry-run mode?)');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        this.totalCalls++;
        if (response.usage) {
          this.totalInputTokens += response.usage.input_tokens;
          this.totalOutputTokens += response.usage.output_tokens;
        }

        // Extract text content from the response.
        const textBlock = response.content.find((b) => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text block in Claude response');
        }

        // Strip markdown fencing the model might add despite instructions.
        let text = textBlock.text.trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(text) as Record<string, unknown>;
        return validate(parsed);
      } catch (err) {
        if (attempt < retries) {
          console.warn(
            `[ClaudeBridge] Attempt ${attempt + 1} failed, retrying:`,
            err instanceof Error ? err.message : err,
          );
          continue;
        }
        console.error(
          '[ClaudeBridge] All attempts failed, returning fallback:',
          err instanceof Error ? err.message : err,
        );
        return fallback;
      }
    }

    // Unreachable, but TypeScript insists.
    return fallback;
  }

  /** Context hints extracted from the prompt for smarter dry-run mocking. */
  private extractPromptHints(prompt?: string): {
    isSilentMode: boolean;
    isSubtleMode: boolean;
    isTargetedLeader: boolean;
    hasDoublePoints: boolean;
    isPersonaModified: boolean;
  } {
    if (!prompt) return { isSilentMode: false, isSubtleMode: false, isTargetedLeader: false, hasDoublePoints: false, isPersonaModified: false };
    return {
      isSilentMode: prompt.includes('appear on your phone silently'),
      isSubtleMode: prompt.includes('subtle badge'),
      isTargetedLeader: prompt.includes('being targeted because you\'re in the lead'),
      hasDoublePoints: prompt.includes('next claim is worth DOUBLE'),
      isPersonaModified: prompt.includes('had a few drinks'),
    };
  }

  /** Produce a deterministic-ish mock response for --dry-run mode. */
  private mockAgentResponse(prompt?: string): AgentResponse {
    this.dryRunCounter++;
    const n = this.dryRunCounter;

    const hints = this.extractPromptHints(prompt);

    const decisions: AgentResponse['decision'][] = [
      'engage',
      'ignore',
      'complain',
      'half_engage',
    ];
    const vibes = ['loving_it', 'fine', 'meh', 'annoyed', 'frustrated', 'checked_out'];
    const notifs: AgentResponse['notification_feedback'][] = [
      'too_loud',
      'too_quiet',
      'just_right',
      'missed_it',
    ];

    const mockDialogues = [
      '"Ooh, I\'m into this one."',
      '"Can we just play the game?"',
      '"Wait, what? I wasn\'t looking."',
      '"Alright, fine, I\'ll do it."',
      '"This is exactly what we needed right now."',
      '"Nope. Not engaging with this one."',
      '"Haha okay that\'s actually funny."',
      '"...seriously? Another one?"',
    ];

    const mockThoughts = [
      'This could actually be fun if people commit.',
      'I was literally about to make my move.',
      'I don\'t even know what\'s happening anymore.',
      'Fine, but only because everyone else is doing it.',
      'This is the highlight of the night so far.',
      'I\'m running out of patience for these.',
      'Okay that one caught me off guard in a good way.',
      'If one more thing pops up I\'m putting my phone away.',
    ];

    // Base values
    let funFactor = ((n * 2) % 10) + 1;
    let annoyance = ((n * 4) % 10) + 1;
    let decision = decisions[n % decisions.length];
    let notifFeedback = notifs[n % notifs.length];

    // Silent/subtle notification modes: higher miss rates
    if (hints.isSilentMode) {
      // 60% chance of missing in silent mode
      if (n % 5 < 3) {
        decision = 'ignore';
        notifFeedback = 'missed_it';
      }
    } else if (hints.isSubtleMode) {
      // 30% chance of missing in subtle mode
      if (n % 10 < 3) {
        decision = 'ignore';
        notifFeedback = 'missed_it';
      }
    }

    // Persona modified (drunk mode): higher fun, lower engagement quality
    if (hints.isPersonaModified) {
      funFactor = Math.min(10, funFactor + 2);
      annoyance = Math.max(1, annoyance - 1);
      // Drunk people half-engage or engage, rarely complain
      if (decision === 'complain') decision = 'half_engage';
    }

    // Leader targeting: leader gets more annoyed, everyone else has more fun
    if (hints.isTargetedLeader) {
      annoyance = Math.min(10, annoyance + 3);
      funFactor = Math.max(1, funFactor - 2);
    } else if (hints.hasDoublePoints) {
      // Bottom player with double points is extra motivated
      funFactor = Math.min(10, funFactor + 1);
      if (decision === 'ignore') decision = 'half_engage';
    }

    return {
      decision,
      engagement: ((n * 3) % 10) + 1,
      disruption_perception: ((n * 7) % 10) + 1,
      fun_factor: funFactor,
      annoyance,
      humor_landed: ((n * 5) % 10) + 1,
      energy_delta: (n % 7) - 3,
      attention_cost: ((n * 6) % 10) + 1,
      dialogue: mockDialogues[n % mockDialogues.length],
      internal_thought: mockThoughts[n % mockThoughts.length],
      would_send_signal: n % 5 === 0 ? 'shake_it_up' : null,
      vote_if_applicable: n % 3 === 0 ? 'ACCEPT' : n % 3 === 1 ? 'BULLSHIT' : null,
      claim_if_applicable: n % 4 === 0,
      submission_if_applicable: n % 6 === 0 ? 'My totally real submission' : null,
      wants_more_chaos: n % 3 === 0,
      wants_less_chaos: n % 3 === 2,
      notification_feedback: notifFeedback,
      overall_vibe: vibes[n % vibes.length],
      host_power_used: null,
    };
  }
}
