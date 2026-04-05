import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScenarioDefinition } from '../config/scenarios.js';
import type { Agent } from '../agents/agent.js';
import type { FinalAssessment } from '../agents/claude-bridge.js';
import type { AggregatedMetrics, EvaluationFactors } from '../metrics/types.js';

/**
 * Generate a readable markdown report for a simulation run.
 */
export function generateMarkdownReport(
  scenario: ScenarioDefinition,
  metrics: AggregatedMetrics,
  agents: Agent[],
  assessments: Map<string, FinalAssessment>,
  apiStats: { totalCalls: number; totalTokens: number },
): string {
  const lines: string[] = [];
  const s = metrics.session;
  const f = metrics.evaluationFactors;

  // ── Executive Summary ──
  lines.push(`# Chaos Agent Simulation Report: ${scenario.name}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(
    `A ${scenario.totalMinutes}-minute ${scenario.gameType.replace(/_/g, ' ')} session ` +
    `was simulated with ${scenario.playerCount} players at "${scenario.chaosComfort}" chaos comfort. ` +
    `The overall fun score was **${s.overallFunScore.toFixed(1)}/10** with an engagement rate of ` +
    `**${(s.engagementRate * 100).toFixed(0)}%**.`,
  );
  lines.push('');
  lines.push(
    `Event density was ${s.eventDensity.toFixed(1)} events per 10 minutes ` +
    `(estimated optimal: ${s.optimalDensity.toFixed(1)}). ` +
    `Peak fun occurred at minute ${s.momentOfPeakFun} and peak annoyance at minute ${s.momentOfPeakAnnoyance}. ` +
    `Average player energy at session end was ${s.avgEnergyEnd.toFixed(1)}/10.`,
  );
  lines.push('');
  lines.push(
    `The overall assessment score across all 20 evaluation factors was ` +
    `**${f.overallAssessment}/10**. ` +
    `${f.wouldPlayAgain >= 7 ? 'Most agents said they would play again.' : 'Several agents expressed hesitation about playing again.'}`,
  );

  // ── Session Overview ──
  lines.push('');
  lines.push('## Session Overview');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Scenario | ${scenario.name} |`);
  lines.push(`| Game Type | ${scenario.gameType.replace(/_/g, ' ')} |`);
  lines.push(`| Duration | ${scenario.totalMinutes} minutes |`);
  lines.push(`| Players | ${scenario.playerCount} |`);
  lines.push(`| Chaos Comfort | ${scenario.chaosComfort} |`);
  lines.push(`| Overall Fun | ${s.overallFunScore.toFixed(1)}/10 |`);
  lines.push(`| Disruption Score | ${s.disruptionScore.toFixed(1)}/10 |`);
  lines.push(`| Engagement Rate | ${(s.engagementRate * 100).toFixed(0)}% |`);
  lines.push(`| Event Density | ${s.eventDensity.toFixed(1)}/10min |`);
  lines.push(`| Avg Energy End | ${s.avgEnergyEnd.toFixed(1)}/10 |`);

  // ── Per-Agent Narratives ──
  lines.push('');
  lines.push('## Per-Agent Narratives');

  for (const agent of agents) {
    const assessment = assessments.get(agent.id);
    const summary = metrics.perAgent.get(agent.id);
    lines.push('');
    lines.push(`### ${agent.persona.name}`);
    lines.push('');
    lines.push(`> ${agent.persona.personality.slice(0, 200)}...`);
    lines.push('');

    if (summary) {
      lines.push('| Stat | Value |');
      lines.push('|------|-------|');
      lines.push(`| Final Score | ${summary.finalScore} pts |`);
      lines.push(`| Final Energy | ${summary.finalEnergy.toFixed(1)}/10 |`);
      lines.push(`| Avg Fun | ${summary.avgFun.toFixed(1)}/10 |`);
      lines.push(`| Avg Annoyance | ${summary.avgAnnoyance.toFixed(1)}/10 |`);
      lines.push(`| Engagement Rate | ${(summary.engagementRate * 100).toFixed(0)}% |`);
      lines.push(`| Events Engaged | ${summary.totalEventsEngaged} |`);
      lines.push(`| Events Ignored | ${summary.totalEventsIgnored} |`);
      lines.push(`| Complaints | ${summary.totalComplaints} |`);
      lines.push(`| Signals Sent | ${summary.signalsSent} |`);

      if (summary.peakFun.value > 0) {
        lines.push(`| Peak Fun | ${summary.peakFun.value}/10 at min ${summary.peakFun.tick} ("${summary.peakFun.event}") |`);
      }
      if (summary.peakAnnoyance.value > 0) {
        lines.push(`| Peak Annoyance | ${summary.peakAnnoyance.value}/10 at min ${summary.peakAnnoyance.tick} ("${summary.peakAnnoyance.event}") |`);
      }
    }

    if (assessment) {
      lines.push('');
      lines.push(`**End-of-night narrative:** ${assessment.narrative_summary}`);
      lines.push('');
      lines.push(`- **Best moment:** ${assessment.best_moment}`);
      lines.push(`- **Biggest complaint:** ${assessment.biggest_complaint}`);
      lines.push(`- **Would play again:** ${assessment.would_play_again ? 'Yes' : 'No'}`);
      lines.push(`- **Would recommend:** ${assessment.would_recommend ? 'Yes' : 'No'}`);
      lines.push(`- **Would pay for AI:** ${assessment.would_pay_for_ai ? 'Yes' : 'No'}`);
      lines.push(`- **Ideal event frequency:** ${assessment.ideal_event_frequency}`);
    }
  }

  // ── Event Type Rankings ──
  lines.push('');
  lines.push('## Event Type Rankings');
  lines.push('');
  lines.push('Ranked by average fun score (best to worst):');
  lines.push('');

  const sortedTypes = Array.from(metrics.perEventType.entries())
    .filter(([, s]) => s.count > 0)
    .sort(([, a], [, b]) => b.avgFun - a.avgFun);

  lines.push('| Event Type | Count | Avg Fun | Avg Annoyance | Engagement | Best Phase | Worst Phase |');
  lines.push('|------------|-------|---------|---------------|------------|------------|-------------|');
  for (const [type, stats] of sortedTypes) {
    lines.push(
      `| ${type.replace(/_/g, ' ')} | ${stats.count} | ${stats.avgFun.toFixed(1)} | ` +
      `${stats.avgAnnoyance.toFixed(1)} | ${(stats.engagementRate * 100).toFixed(0)}% | ` +
      `${stats.bestPhase} | ${stats.worstPhase} |`,
    );
  }

  // ── The 20 Evaluation Factors ──
  lines.push('');
  lines.push('## The 20 Evaluation Factors');
  lines.push('');
  lines.push('| # | Factor | Score |');
  lines.push('|---|--------|-------|');

  const factorLabels: [keyof EvaluationFactors, string][] = [
    ['flashFrequencyOptimal', 'Flash Mission Frequency'],
    ['flashDurationRight', 'Flash Mission Duration'],
    ['flashAttentionCost', 'Flash Attention Cost'],
    ['humorQuality', 'Humor Quality'],
    ['mainGameDisruption', 'Main Game Disruption (inverted)'],
    ['notificationMode', 'Notification Satisfaction'],
    ['standingMissionCount', 'Standing Mission Engagement'],
    ['timingCorrectness', 'Event Timing Correctness'],
    ['standingAlwaysAvailable', 'Standing Mission Availability'],
    ['standingClaimBehavior', 'Standing Claim Behavior'],
    ['standingDisruption', 'Standing Disruption (inverted)'],
    ['overallEnhanceOrDestroy', 'Enhancement vs Destruction'],
    ['miniGamesFun', 'Mini-Game Fun'],
    ['miniGameSetComplete', 'Mini-Game Set Completeness'],
    ['miniGameInvolvement', 'Mini-Game Involvement'],
    ['overallFlowEasy', 'Overall Flow'],
    ['wouldPlayAgain', 'Would Play Again'],
    ['wouldRecommend', 'Would Recommend'],
    ['wouldPayForAI', 'Would Pay for AI'],
    ['overallAssessment', 'OVERALL ASSESSMENT'],
  ];

  factorLabels.forEach(([key, label], i) => {
    const value = f[key];
    const bar = scoreBar(value);
    lines.push(`| ${i + 1} | ${label} | ${value}/10 ${bar} |`);
  });

  // ── Recommendations ��─
  lines.push('');
  lines.push('## Recommendations');
  lines.push('');
  if (s.recommendations.length > 0) {
    for (const rec of s.recommendations) {
      lines.push(`- ${rec}`);
    }
  } else {
    lines.push('No specific recommendations. The simulation performed within acceptable ranges.');
  }

  // ── Configuration Table ──
  lines.push('');
  lines.push('## Optimal Configuration Suggestions');
  lines.push('');
  lines.push('Based on simulation results:');
  lines.push('');
  lines.push('| Setting | Current | Suggested |');
  lines.push('|---------|---------|-----------|');

  const currentFlash = scenario.eventFrequency.flashMissionIntervalMin;
  const currentPoll = scenario.eventFrequency.pollIntervalMin;
  const currentMini = scenario.eventFrequency.miniGameIntervalMin;

  const flashAdj = f.flashFrequencyOptimal < 5 ? 'Increase by 30%' : 'Keep';
  const pollAdj = f.notificationMode < 5 ? 'Increase by 20%' : 'Keep';
  const miniAdj = f.miniGamesFun < 5 ? 'Reduce by 20%' : 'Keep';

  lines.push(`| Flash interval | ${currentFlash[0]}-${currentFlash[1]}min | ${flashAdj} |`);
  lines.push(`| Poll interval | ${currentPoll[0]}-${currentPoll[1]}min | ${pollAdj} |`);
  lines.push(`| Mini-game interval | ${currentMini[0]}-${currentMini[1]}min | ${miniAdj} |`);
  lines.push(`| Optimal density | ${s.eventDensity.toFixed(1)}/10min | ${s.optimalDensity.toFixed(1)}/10min |`);

  // ── API Usage ──
  lines.push('');
  lines.push('## API Usage');
  lines.push('');
  lines.push(`- Total API calls: ${apiStats.totalCalls}`);
  lines.push(`- Total tokens: ${apiStats.totalTokens.toLocaleString()}`);
  lines.push(`- Estimated cost: $${estimateCost(apiStats.totalTokens)}`);
  lines.push('');
  lines.push('---');
  lines.push(`*Generated at ${new Date().toISOString()} by Chaos Agent Simulator*`);

  return lines.join('\n');
}

/**
 * Write the markdown report to disk and return the file path.
 */
export function writeMarkdownReport(report: string, scenarioId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${scenarioId}-${timestamp}.md`;
  const resultsDir = path.resolve(process.cwd(), 'results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const filePath = path.join(resultsDir, filename);
  fs.writeFileSync(filePath, report, 'utf-8');

  return filePath;
}

/** Visual score bar for markdown tables. */
function scoreBar(value: number): string {
  const filled = Math.round(value);
  const empty = 10 - filled;
  return '`' + '#'.repeat(filled) + '.'.repeat(empty) + '`';
}

/** Rough cost estimate based on Claude Sonnet pricing. */
function estimateCost(totalTokens: number): string {
  // Rough estimate: ~$3/MTok input, ~$15/MTok output, assume 50/50 split
  const avgCostPerToken = (3 + 15) / 2 / 1_000_000;
  return (totalTokens * avgCostPerToken).toFixed(2);
}
