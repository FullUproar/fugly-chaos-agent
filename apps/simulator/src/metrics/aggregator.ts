import type { Agent } from '../agents/agent.js';
import type { FinalAssessment } from '../agents/claude-bridge.js';
import type { SimEvent } from '../events/event-types.js';
import type {
  TickMetrics,
  AggregatedMetrics,
  AgentSummary,
  EventTypeSummary,
  SessionSummary,
  EvaluationFactors,
} from './types.js';

/**
 * Aggregates raw tick-level metrics into per-agent, per-event-type,
 * and session-wide summaries with the 20 evaluation factors.
 */
export class MetricsAggregator {
  aggregate(
    ticks: TickMetrics[],
    events: SimEvent[],
    agents: Agent[],
    finalAssessments: Map<string, FinalAssessment>,
  ): AggregatedMetrics {
    const perAgent = this.computePerAgent(ticks, events, agents);
    const perEventType = this.computePerEventType(ticks, events, agents);
    const evaluationFactors = this.computeEvaluationFactors(ticks, events, agents, finalAssessments);
    const recommendations = this.generateRecommendations(evaluationFactors, perEventType, perAgent);

    const session = this.computeSessionSummary(ticks, events, agents, recommendations);

    return { perAgent, perEventType, session, evaluationFactors };
  }

  // ── Per-agent summaries ──────────────────────────────────────────────────

  private computePerAgent(
    ticks: TickMetrics[],
    events: SimEvent[],
    agents: Agent[],
  ): Map<string, AgentSummary> {
    const result = new Map<string, AgentSummary>();

    for (const agent of agents) {
      const agentTicks = ticks
        .filter((t) => t.agentMetrics.has(agent.id))
        .map((t) => t.agentMetrics.get(agent.id)!);

      const activeTicks = agentTicks.filter((m) => m.decision !== 'none');
      const engagedTicks = activeTicks.filter(
        (m) => m.decision === 'engage' || m.decision === 'half_engage',
      );

      // Find peak fun and peak annoyance from events
      let peakFun = { tick: 0, event: '', value: 0 };
      let peakAnnoyance = { tick: 0, event: '', value: 0 };

      for (const event of events) {
        const reaction = event.reactions.get(agent.id);
        if (!reaction) continue;
        if (reaction.fun_factor > peakFun.value) {
          peakFun = { tick: event.tick, event: event.title, value: reaction.fun_factor };
        }
        if (reaction.annoyance > peakAnnoyance.value) {
          peakAnnoyance = { tick: event.tick, event: event.title, value: reaction.annoyance };
        }
      }

      result.set(agent.id, {
        personaName: agent.persona.name,
        avgEngagement: avg(activeTicks.map((m) => m.engagement)),
        avgDisruption: avg(activeTicks.map((m) => m.disruption)),
        avgFun: avg(activeTicks.map((m) => m.funFactor)),
        avgAnnoyance: avg(activeTicks.map((m) => m.annoyance)),
        avgHumorLanded: avg(activeTicks.map((m) => m.humorLanded)),
        engagementRate: activeTicks.length > 0 ? engagedTicks.length / activeTicks.length : 0,
        energyCurve: agent.energyCurve,
        peakFun,
        peakAnnoyance,
        totalEventsEngaged: agent.totalEngaged,
        totalEventsIgnored: agent.totalIgnored,
        totalComplaints: agent.totalComplaints,
        finalScore: agent.score,
        finalEnergy: agent.energy,
        signalsSent: agent.signalsSent,
      });
    }

    return result;
  }

  // ── Per-event-type summaries ─────────────────────────────────────────────

  private computePerEventType(
    ticks: TickMetrics[],
    events: SimEvent[],
    agents: Agent[],
  ): Map<string, EventTypeSummary> {
    const result = new Map<string, EventTypeSummary>();
    const eventTypes = ['flash_mission', 'poll', 'mini_game', 'standing_claim'];

    for (const eventType of eventTypes) {
      const typeEvents = events.filter((e) => e.type === eventType);
      if (typeEvents.length === 0) {
        result.set(eventType, {
          avgEngagement: 0,
          avgDisruption: 0,
          avgFun: 0,
          avgAnnoyance: 0,
          avgHumorLanded: 0,
          engagementRate: 0,
          bestPhase: 'n/a',
          worstPhase: 'n/a',
          count: 0,
        });
        continue;
      }

      // Gather all reactions for this event type
      const allEngagements: number[] = [];
      const allDisruptions: number[] = [];
      const allFun: number[] = [];
      const allAnnoyance: number[] = [];
      const allHumor: number[] = [];
      let totalDecisions = 0;
      let totalEngaged = 0;

      // Track per-phase fun for best/worst
      const phaseFun = new Map<string, number[]>();

      for (const event of typeEvents) {
        // Find the tick's phase
        const matchingTick = ticks.find((t) => t.tick === event.tick);
        const phase = matchingTick?.phase ?? 'mid';

        for (const [, reaction] of event.reactions) {
          if (!reaction || typeof reaction !== 'object') continue;
          allEngagements.push(reaction.engagement ?? 0);
          allDisruptions.push(reaction.disruption_perception ?? 0);
          allFun.push(reaction.fun_factor ?? 0);
          allAnnoyance.push(reaction.annoyance ?? 0);
          allHumor.push(reaction.humor_landed ?? 0);

          totalDecisions++;
          if (reaction.decision === 'engage' || reaction.decision === 'half_engage') {
            totalEngaged++;
          }

          if (!phaseFun.has(phase)) phaseFun.set(phase, []);
          phaseFun.get(phase)!.push(reaction.fun_factor ?? 0);
        }
      }

      // Determine best and worst phases
      let bestPhase = 'mid';
      let worstPhase = 'mid';
      let bestAvg = -Infinity;
      let worstAvg = Infinity;

      for (const [phase, funValues] of phaseFun) {
        const phaseAvg = avg(funValues);
        if (phaseAvg > bestAvg) {
          bestAvg = phaseAvg;
          bestPhase = phase;
        }
        if (phaseAvg < worstAvg) {
          worstAvg = phaseAvg;
          worstPhase = phase;
        }
      }

      result.set(eventType, {
        avgEngagement: avg(allEngagements),
        avgDisruption: avg(allDisruptions),
        avgFun: avg(allFun),
        avgAnnoyance: avg(allAnnoyance),
        avgHumorLanded: avg(allHumor),
        engagementRate: totalDecisions > 0 ? totalEngaged / totalDecisions : 0,
        bestPhase,
        worstPhase,
        count: typeEvents.length,
      });
    }

    return result;
  }

  // ── Session summary ─────────────────────────────────────────────────────

  private computeSessionSummary(
    ticks: TickMetrics[],
    events: SimEvent[],
    agents: Agent[],
    recommendations: string[],
  ): SessionSummary {
    // Overall fun: average of all fun_factor reactions
    const allFun: number[] = [];
    const allDisruption: number[] = [];
    let totalDecisions = 0;
    let totalEngaged = 0;

    let peakFunTick = 0;
    let peakFunValue = 0;
    let peakAnnoyanceTick = 0;
    let peakAnnoyanceValue = 0;

    for (const event of events) {
      for (const [, reaction] of event.reactions) {
        if (!reaction || typeof reaction !== 'object') continue;
        allFun.push(reaction.fun_factor ?? 0);
        allDisruption.push(reaction.disruption_perception ?? 0);
        totalDecisions++;
        if (reaction.decision === 'engage' || reaction.decision === 'half_engage') {
          totalEngaged++;
        }
        if ((reaction.fun_factor ?? 0) > peakFunValue) {
          peakFunValue = reaction.fun_factor ?? 0;
          peakFunTick = event.tick;
        }
        if ((reaction.annoyance ?? 0) > peakAnnoyanceValue) {
          peakAnnoyanceValue = reaction.annoyance ?? 0;
          peakAnnoyanceTick = event.tick;
        }
      }
    }

    const totalMinutes = ticks.length > 0 ? ticks[ticks.length - 1].tick + 1 : 1;
    const eventDensity = (events.length / totalMinutes) * 10; // per 10 minutes
    const avgEnergyEnd = avg(agents.map((a) => a.energy));

    return {
      overallFunScore: avg(allFun),
      disruptionScore: avg(allDisruption),
      engagementRate: totalDecisions > 0 ? totalEngaged / totalDecisions : 0,
      eventDensity,
      optimalDensity: this.estimateOptimalDensity(events, allFun, totalMinutes),
      momentOfPeakFun: peakFunTick,
      momentOfPeakAnnoyance: peakAnnoyanceTick,
      avgEnergyEnd,
      recommendations,
    };
  }

  /** Estimate optimal event density by correlating density windows with fun. */
  private estimateOptimalDensity(events: SimEvent[], allFun: number[], totalMinutes: number): number {
    if (events.length < 3) return events.length / Math.max(1, totalMinutes) * 10;

    // Split into 10-minute windows, find the one with highest avg fun
    const windowSize = 10;
    let bestDensity = 0;
    let bestFun = 0;

    for (let start = 0; start < totalMinutes; start += windowSize) {
      const end = start + windowSize;
      const windowEvents = events.filter((e) => e.tick >= start && e.tick < end);
      const windowFun: number[] = [];

      for (const event of windowEvents) {
        for (const [, reaction] of event.reactions) {
          if (reaction?.fun_factor) windowFun.push(reaction.fun_factor);
        }
      }

      const avgWindowFun = avg(windowFun);
      if (avgWindowFun > bestFun) {
        bestFun = avgWindowFun;
        bestDensity = windowEvents.length;
      }
    }

    return bestDensity; // events per 10 minutes
  }

  // ── Evaluation factors ──────────────────────────────────────────────────

  private computeEvaluationFactors(
    ticks: TickMetrics[],
    events: SimEvent[],
    agents: Agent[],
    assessments: Map<string, FinalAssessment>,
  ): EvaluationFactors {
    const flashEvents = events.filter((e) => e.type === 'flash_mission');
    const miniGameEvents = events.filter((e) => e.type === 'mini_game');
    const standingEvents = events.filter((e) => e.type === 'standing_claim');

    // Factor 1: Flash frequency optimal -- avg fun during flashes vs overall
    const flashFun = avgReactionField(flashEvents, 'fun_factor');
    const overallFun = avgReactionField(events, 'fun_factor');
    const flashFrequencyOptimal = overallFun > 0
      ? Math.min(10, (flashFun / Math.max(1, overallFun)) * 7)
      : 5;

    // Factor 2: Flash duration right -- % of agents who engaged before timer expired
    const flashEngageRate = flashEvents.length > 0
      ? avgEngagementRate(flashEvents) * 10
      : 5;

    // Factor 3: Flash attention cost -- avg attention_cost for flash events (inverted: lower = better)
    const flashAttnCost = avgReactionField(flashEvents, 'attention_cost');
    const flashAttentionCost = Math.max(1, 10 - flashAttnCost);

    // Factor 4: Humor quality -- avg humor_landed across all events
    const humorQuality = avgReactionField(events, 'humor_landed');

    // Factor 5: Main game disruption -- avg disruption during high-tension phases
    const highTensionTicks = ticks.filter((t) => t.tensionLevel >= 7);
    const highTensionDisruption = avgTickField(highTensionTicks, 'disruption');
    const mainGameDisruption = Math.max(1, 10 - highTensionDisruption);

    // Factor 6: Notification mode -- distribution of notification_feedback
    const notifScores = computeNotificationScore(events);
    const notificationMode = notifScores;

    // Factor 7: Standing mission count correlation with engagement
    const standingMissionCount = standingEvents.length > 0
      ? Math.min(10, avgReactionField(standingEvents, 'engagement'))
      : 5;

    // Factor 8: Timing correctness -- % of events that fired during dead time or low tension
    const wellTimedEvents = events.filter((e) => {
      const tick = ticks.find((t) => t.tick === e.tick);
      return tick && (tick.tensionLevel <= 5 || tick.disruptionTolerance >= 6);
    });
    const timingCorrectness = events.length > 0
      ? (wellTimedEvents.length / events.length) * 10
      : 5;

    // Factors 9-10: Standing behavior from assessments
    const assessmentValues = Array.from(assessments.values());
    const standingAlwaysAvailable = assessmentValues.length > 0
      ? avg(assessmentValues.map((a) => a.flow_rating)) // proxy
      : 5;
    const standingClaimBehavior = standingEvents.length > 0
      ? avgEngagementRate(standingEvents) * 10
      : 5;

    // Factor 11: Standing disruption
    const standingDisruption = standingEvents.length > 0
      ? Math.max(1, 10 - avgReactionField(standingEvents, 'disruption_perception'))
      : 7; // Standing missions are inherently low-disruption

    // Factor 12: Overall enhance or destroy -- from assessments
    const overallEnhanceOrDestroy = assessmentValues.length > 0
      ? avg(assessmentValues.map((a) => a.enhancement_rating))
      : 5;

    // Factors 13-15: Mini-games
    const miniGamesFun = avgReactionField(miniGameEvents, 'fun_factor');
    const miniGameSetComplete = miniGameEvents.length >= 3 ? 8 : miniGameEvents.length * 2.5;
    const miniGameInvolvement = miniGameEvents.length > 0
      ? avgEngagementRate(miniGameEvents) * 10
      : 5;

    // Factor 16: Overall flow from assessments
    const overallFlowEasy = assessmentValues.length > 0
      ? avg(assessmentValues.map((a) => a.flow_rating))
      : 5;

    // Factors 17-19: Would play/recommend/pay from assessments
    const wouldPlayAgain = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.would_play_again).length / assessmentValues.length) * 10
      : 5;
    const wouldRecommend = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.would_recommend).length / assessmentValues.length) * 10
      : 5;
    const wouldPayForAI = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.would_pay_for_ai).length / assessmentValues.length) * 10
      : 5;

    // Virality metrics from assessments
    const screenshotMoment = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.would_screenshot_moment).length / assessmentValues.length) * 10
      : 0;
    const socialMediaMention = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.would_post_on_social).length / assessmentValues.length) * 10
      : 0;
    const nextDayStory = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.would_tell_friends_tomorrow).length / assessmentValues.length) * 10
      : 0;
    const groupBondingEffect = assessmentValues.length > 0
      ? (assessmentValues.filter((a) => a.felt_closer_to_group).length / assessmentValues.length) * 10
      : 0;
    // Memeable moments: count shareable funny moments that have substance
    const memeableMoments = assessmentValues.length > 0
      ? (assessmentValues.filter((a) =>
          a.funniest_moment_shareable &&
          a.funniest_moment_shareable.length > 20 &&
          !a.funniest_moment_shareable.toLowerCase().includes('nothing')
        ).length / assessmentValues.length) * 10
      : 0;

    // Factor 20: Weighted average of all factors
    const allFactors = [
      flashFrequencyOptimal, flashEngageRate, flashAttentionCost, humorQuality,
      mainGameDisruption, notificationMode, standingMissionCount, timingCorrectness,
      standingAlwaysAvailable, standingClaimBehavior, standingDisruption,
      overallEnhanceOrDestroy, miniGamesFun, miniGameSetComplete, miniGameInvolvement,
      overallFlowEasy, wouldPlayAgain, wouldRecommend, wouldPayForAI,
    ];
    const overallAssessment = avg(allFactors);

    return {
      flashFrequencyOptimal: round(flashFrequencyOptimal),
      flashDurationRight: round(flashEngageRate),
      flashAttentionCost: round(flashAttentionCost),
      humorQuality: round(humorQuality),
      mainGameDisruption: round(mainGameDisruption),
      notificationMode: round(notificationMode),
      standingMissionCount: round(standingMissionCount),
      timingCorrectness: round(timingCorrectness),
      standingAlwaysAvailable: round(standingAlwaysAvailable),
      standingClaimBehavior: round(standingClaimBehavior),
      standingDisruption: round(standingDisruption),
      overallEnhanceOrDestroy: round(overallEnhanceOrDestroy),
      miniGamesFun: round(miniGamesFun),
      miniGameSetComplete: round(miniGameSetComplete),
      miniGameInvolvement: round(miniGameInvolvement),
      overallFlowEasy: round(overallFlowEasy),
      wouldPlayAgain: round(wouldPlayAgain),
      wouldRecommend: round(wouldRecommend),
      wouldPayForAI: round(wouldPayForAI),
      overallAssessment: round(overallAssessment),
      screenshotMoment: round(screenshotMoment),
      socialMediaMention: round(socialMediaMention),
      nextDayStory: round(nextDayStory),
      groupBondingEffect: round(groupBondingEffect),
      memeableMoments: round(memeableMoments),
    };
  }

  // ── Recommendations ─────────────────────────────────────────────────────

  private generateRecommendations(
    factors: EvaluationFactors,
    perEventType: Map<string, EventTypeSummary>,
    perAgent: Map<string, AgentSummary>,
  ): string[] {
    const recs: string[] = [];

    // Flash frequency
    if (factors.flashFrequencyOptimal < 5) {
      const flashStats = perEventType.get('flash_mission');
      recs.push(
        `Flash missions averaged ${flashStats?.avgFun.toFixed(1) ?? '?'}/10 fun. ` +
        `Consider reducing frequency or improving targeting.`,
      );
    }

    // Attention cost
    if (factors.flashAttentionCost < 5) {
      recs.push(
        `Flash missions are too attention-heavy (score: ${factors.flashAttentionCost}/10). ` +
        `Simplify the mechanics or shorten timers.`,
      );
    }

    // Humor quality
    if (factors.humorQuality < 5) {
      recs.push(
        `Humor quality scored ${factors.humorQuality}/10. ` +
        `Refresh the mission/poll prompt pools with more contextual humor.`,
      );
    }

    // Main game disruption
    if (factors.mainGameDisruption < 5) {
      recs.push(
        `Events during high-tension game moments caused excessive disruption ` +
        `(score: ${factors.mainGameDisruption}/10). Suppress events when tension > 7.`,
      );
    }

    // Timing
    if (factors.timingCorrectness < 6) {
      recs.push(
        `Only ${(factors.timingCorrectness * 10).toFixed(0)}% of events fired during appropriate moments. ` +
        `Improve dead-time detection and phase-awareness.`,
      );
    }

    // Mini-games
    const miniStats = perEventType.get('mini_game');
    if (miniStats && miniStats.avgFun < 5) {
      recs.push(
        `Mini-games averaged ${miniStats.avgFun.toFixed(1)}/10 fun during ${miniStats.worstPhase} phase. ` +
        `Consider restricting mini-games to ${miniStats.bestPhase} phase.`,
      );
    }

    // Per-agent specific issues
    for (const [agentId, summary] of perAgent) {
      if (summary.avgAnnoyance > 7) {
        recs.push(
          `${summary.personaName} averaged ${summary.avgAnnoyance.toFixed(1)}/10 annoyance. ` +
          `Their persona type may need fewer/gentler events.`,
        );
      }
      if (summary.engagementRate < 0.3) {
        recs.push(
          `${summary.personaName} only engaged with ${(summary.engagementRate * 100).toFixed(0)}% of events. ` +
          `Consider targeting events to their interests or reducing frequency.`,
        );
      }
    }

    // Event density
    if (factors.overallFlowEasy < 5) {
      recs.push(
        `Flow score is ${factors.overallFlowEasy}/10. ` +
        `Event density may be too high or transitions too abrupt.`,
      );
    }

    // Would pay for AI (monetization signal)
    if (factors.wouldPayForAI < 4) {
      recs.push(
        `Only ${(factors.wouldPayForAI * 10).toFixed(0)}% would pay for AI features. ` +
        `The AI tier needs stronger differentiation from free static missions.`,
      );
    }

    // Virality-specific recommendations
    if (factors.screenshotMoment >= 6) {
      const miniStats = perEventType.get('mini_game');
      const drawingPct = miniStats ? ((miniStats.avgFun / 10) * 100).toFixed(0) : '?';
      recs.push(
        `Drawing mini-games generated the most screenshot-worthy moments (${drawingPct}% engagement). Increase frequency.`,
      );
    }
    if (factors.screenshotMoment < 4) {
      recs.push(
        `Screenshot-worthy moments scored ${factors.screenshotMoment}/10. Add more visual/dramatic events (drawings, reveals).`,
      );
    }
    if (factors.nextDayStory >= 7) {
      recs.push(
        `Verdict reveals were mentioned as shareable by ${(factors.nextDayStory * 10).toFixed(0)}% of agents. This is strong word-of-mouth potential.`,
      );
    }
    if (factors.socialMediaMention < 3) {
      recs.push(
        `Social media mention potential is low (${factors.socialMediaMention}/10). Consider adding share-friendly moment recaps or highlight reels.`,
      );
    }
    if (factors.groupBondingEffect >= 7) {
      recs.push(
        `Group bonding scored ${factors.groupBondingEffect}/10 -- the social glue is working. Preserve collaborative events.`,
      );
    }

    // Cap at 12 recommendations
    return recs.slice(0, 12);
  }
}

// ── Utility functions ──────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Average a specific reaction field across all reactions in a set of events. */
function avgReactionField(events: SimEvent[], field: string): number {
  const values: number[] = [];
  for (const event of events) {
    for (const [, reaction] of event.reactions) {
      if (reaction && typeof reaction === 'object' && field in reaction) {
        values.push(Number(reaction[field]) || 0);
      }
    }
  }
  return avg(values);
}

/** Average engagement rate across a set of events. */
function avgEngagementRate(events: SimEvent[]): number {
  let total = 0;
  let engaged = 0;
  for (const event of events) {
    for (const [, reaction] of event.reactions) {
      if (!reaction) continue;
      total++;
      if (reaction.decision === 'engage' || reaction.decision === 'half_engage') {
        engaged++;
      }
    }
  }
  return total > 0 ? engaged / total : 0;
}

/** Average a field across tick-level agent metrics. */
function avgTickField(
  ticks: TickMetrics[],
  field: 'disruption' | 'engagement' | 'funFactor' | 'annoyance',
): number {
  const values: number[] = [];
  for (const tick of ticks) {
    for (const [, metrics] of tick.agentMetrics) {
      values.push(metrics[field] ?? 0);
    }
  }
  return avg(values);
}

/** Compute a 1-10 score for notification satisfaction. */
function computeNotificationScore(events: SimEvent[]): number {
  let justRight = 0;
  let total = 0;

  for (const event of events) {
    for (const [, reaction] of event.reactions) {
      if (!reaction?.notification_feedback) continue;
      total++;
      if (reaction.notification_feedback === 'just_right') justRight++;
    }
  }

  return total > 0 ? (justRight / total) * 10 : 5;
}
