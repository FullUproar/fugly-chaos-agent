import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AggregatedMetrics, EvaluationFactors } from '../metrics/types.js';
import type { FinalAssessment } from '../agents/claude-bridge.js';

export interface VariationResult {
  variation: string;
  description: string;
  metrics: AggregatedMetrics;
  assessments: Map<string, FinalAssessment>;
}

/**
 * Generate a markdown comparison report for A/B/C variation results.
 */
export function generateComparisonReport(
  scenarioName: string,
  variationResults: VariationResult[],
): string {
  const lines: string[] = [];

  lines.push(`# A/B Comparison Report: ${scenarioName}`);
  lines.push('');
  lines.push(`Compared ${variationResults.length} variations at ${new Date().toISOString()}`);
  lines.push('');

  // ── Variation descriptions ──
  lines.push('## Variations Tested');
  lines.push('');
  for (const vr of variationResults) {
    lines.push(`- **${vr.variation}**: ${vr.description}`);
  }
  lines.push('');

  // ── Top-level metrics comparison ──
  lines.push('## Session Metrics Comparison');
  lines.push('');
  lines.push(buildTableHeader(variationResults));
  lines.push(buildTableSeparator(variationResults.length));

  const sessionRows: Array<{ label: string; getValue: (vr: VariationResult) => string }> = [
    { label: 'Overall Fun', getValue: (vr) => `${vr.metrics.session.overallFunScore.toFixed(1)}/10` },
    { label: 'Disruption Score', getValue: (vr) => `${vr.metrics.session.disruptionScore.toFixed(1)}/10` },
    { label: 'Engagement Rate', getValue: (vr) => `${(vr.metrics.session.engagementRate * 100).toFixed(0)}%` },
    { label: 'Event Density', getValue: (vr) => `${vr.metrics.session.eventDensity.toFixed(1)}/10min` },
    { label: 'Avg Energy End', getValue: (vr) => `${vr.metrics.session.avgEnergyEnd.toFixed(1)}/10` },
    { label: 'Peak Fun Minute', getValue: (vr) => `min ${vr.metrics.session.momentOfPeakFun}` },
    { label: 'Peak Annoyance Minute', getValue: (vr) => `min ${vr.metrics.session.momentOfPeakAnnoyance}` },
  ];

  for (const row of sessionRows) {
    const values = variationResults.map((vr) => row.getValue(vr));
    const winner = findWinner(row.label, variationResults);
    lines.push(`| ${row.label} | ${values.join(' | ')} | ${winner} |`);
  }

  // ── Evaluation Factors Comparison ──
  lines.push('');
  lines.push('## Evaluation Factors Comparison');
  lines.push('');
  lines.push(buildTableHeader(variationResults));
  lines.push(buildTableSeparator(variationResults.length));

  const factorRows: Array<{ label: string; key: keyof EvaluationFactors }> = [
    { label: 'Flash Frequency', key: 'flashFrequencyOptimal' },
    { label: 'Flash Duration', key: 'flashDurationRight' },
    { label: 'Humor Quality', key: 'humorQuality' },
    { label: 'Game Disruption (inv)', key: 'mainGameDisruption' },
    { label: 'Standing Engagement', key: 'standingMissionCount' },
    { label: 'Timing Correctness', key: 'timingCorrectness' },
    { label: 'Enhancement vs Destruction', key: 'overallEnhanceOrDestroy' },
    { label: 'Mini-Game Fun', key: 'miniGamesFun' },
    { label: 'Overall Flow', key: 'overallFlowEasy' },
    { label: 'Would Play Again', key: 'wouldPlayAgain' },
    { label: 'Would Recommend', key: 'wouldRecommend' },
    { label: 'Would Pay for AI', key: 'wouldPayForAI' },
    { label: 'OVERALL', key: 'overallAssessment' },
  ];

  for (const row of factorRows) {
    const values = variationResults.map((vr) => {
      const val = vr.metrics.evaluationFactors[row.key];
      return `${val}/10 ${scoreBar(val)}`;
    });
    const numValues = variationResults.map((vr) => vr.metrics.evaluationFactors[row.key]);
    const bestIdx = numValues.indexOf(Math.max(...numValues));
    const winner = variationResults[bestIdx].variation;
    lines.push(`| ${row.label} | ${values.join(' | ')} | **${winner}** |`);
  }

  // ── Virality Comparison ──
  lines.push('');
  lines.push('## Virality Comparison');
  lines.push('');
  lines.push(buildTableHeader(variationResults));
  lines.push(buildTableSeparator(variationResults.length));

  const viralityRows: Array<{ label: string; key: keyof EvaluationFactors }> = [
    { label: 'Screenshot Moments', key: 'screenshotMoment' },
    { label: 'Social Media Mention', key: 'socialMediaMention' },
    { label: 'Next-Day Story', key: 'nextDayStory' },
    { label: 'Group Bonding', key: 'groupBondingEffect' },
    { label: 'Memeable Moments', key: 'memeableMoments' },
  ];

  for (const row of viralityRows) {
    const values = variationResults.map((vr) => `${vr.metrics.evaluationFactors[row.key]}/10`);
    const numValues = variationResults.map((vr) => vr.metrics.evaluationFactors[row.key]);
    const bestIdx = numValues.indexOf(Math.max(...numValues));
    const winner = variationResults[bestIdx].variation;
    lines.push(`| ${row.label} | ${values.join(' | ')} | **${winner}** |`);
  }

  // ── Ecosystem / Retention Comparison ──
  lines.push('');
  lines.push('## Ecosystem & Retention Comparison');
  lines.push('');
  lines.push(buildTableHeader(variationResults));
  lines.push(buildTableSeparator(variationResults.length));

  const ecosystemRows: Array<{ label: string; key: keyof EvaluationFactors; lowerBetter?: boolean }> = [
    { label: 'Would Schedule Next', key: 'wouldScheduleNext' },
    { label: 'Streak Motivating', key: 'streakMotivating' },
    { label: 'Product Rec Helpful', key: 'productRecHelpful' },
    { label: 'Product Rec Annoying', key: 'productRecAnnoying', lowerBetter: true },
    { label: 'Crew Identity Impact', key: 'crewIdentityImpact' },
    { label: 'Memory Impact', key: 'memoryImpact' },
  ];

  for (const row of ecosystemRows) {
    const values = variationResults.map((vr) => `${vr.metrics.evaluationFactors[row.key]}/10`);
    const numValues = variationResults.map((vr) => vr.metrics.evaluationFactors[row.key]);
    const bestIdx = row.lowerBetter
      ? numValues.indexOf(Math.min(...numValues))
      : numValues.indexOf(Math.max(...numValues));
    const winner = variationResults[bestIdx].variation;
    lines.push(`| ${row.label} | ${values.join(' | ')} | **${winner}** |`);
  }

  // ── Per-Agent Comparison ──
  lines.push('');
  lines.push('## Per-Agent Comparison');
  lines.push('');

  // Get all agent names from the first result
  const agentIds = Array.from(variationResults[0].metrics.perAgent.keys());

  for (const agentId of agentIds) {
    const agentName = variationResults[0].metrics.perAgent.get(agentId)?.personaName ?? agentId;
    lines.push(`### ${agentName}`);
    lines.push('');
    lines.push(buildTableHeader(variationResults));
    lines.push(buildTableSeparator(variationResults.length));

    const agentMetricRows: Array<{ label: string; getValue: (vr: VariationResult) => string; getNum: (vr: VariationResult) => number }> = [
      {
        label: 'Avg Fun',
        getValue: (vr) => `${(vr.metrics.perAgent.get(agentId)?.avgFun ?? 0).toFixed(1)}/10`,
        getNum: (vr) => vr.metrics.perAgent.get(agentId)?.avgFun ?? 0,
      },
      {
        label: 'Avg Annoyance',
        getValue: (vr) => `${(vr.metrics.perAgent.get(agentId)?.avgAnnoyance ?? 0).toFixed(1)}/10`,
        getNum: (vr) => -(vr.metrics.perAgent.get(agentId)?.avgAnnoyance ?? 0), // lower is better
      },
      {
        label: 'Engagement Rate',
        getValue: (vr) => `${((vr.metrics.perAgent.get(agentId)?.engagementRate ?? 0) * 100).toFixed(0)}%`,
        getNum: (vr) => vr.metrics.perAgent.get(agentId)?.engagementRate ?? 0,
      },
      {
        label: 'Final Energy',
        getValue: (vr) => `${(vr.metrics.perAgent.get(agentId)?.finalEnergy ?? 0).toFixed(1)}/10`,
        getNum: (vr) => vr.metrics.perAgent.get(agentId)?.finalEnergy ?? 0,
      },
      {
        label: 'Final Score',
        getValue: (vr) => `${vr.metrics.perAgent.get(agentId)?.finalScore ?? 0} pts`,
        getNum: (vr) => vr.metrics.perAgent.get(agentId)?.finalScore ?? 0,
      },
      {
        label: 'Would Play Again',
        getValue: (vr) => {
          const a = vr.assessments.get(agentId);
          return a?.would_play_again ? 'Yes' : 'No';
        },
        getNum: (vr) => vr.assessments.get(agentId)?.would_play_again ? 1 : 0,
      },
      {
        label: 'Would Pay for AI',
        getValue: (vr) => {
          const a = vr.assessments.get(agentId);
          return a?.would_pay_for_ai ? 'Yes' : 'No';
        },
        getNum: (vr) => vr.assessments.get(agentId)?.would_pay_for_ai ? 1 : 0,
      },
    ];

    for (const row of agentMetricRows) {
      const values = variationResults.map((vr) => row.getValue(vr));
      const numValues = variationResults.map((vr) => row.getNum(vr));
      const bestIdx = numValues.indexOf(Math.max(...numValues));
      const winner = variationResults[bestIdx].variation;
      lines.push(`| ${row.label} | ${values.join(' | ')} | **${winner}** |`);
    }

    lines.push('');
  }

  // ── Recommendation ──
  lines.push('## Recommendation');
  lines.push('');

  // Score each variation across key metrics
  const scores = variationResults.map((vr) => {
    const f = vr.metrics.evaluationFactors;
    const s = vr.metrics.session;
    // Weighted composite: fun (3x), play-again (2x), flow (2x), disruption inverted (1x), engagement (1x)
    return {
      variation: vr.variation,
      description: vr.description,
      composite:
        s.overallFunScore * 3 +
        f.wouldPlayAgain * 2 +
        f.overallFlowEasy * 2 +
        f.mainGameDisruption * 1 +
        (s.engagementRate * 10) * 1,
    };
  });

  scores.sort((a, b) => b.composite - a.composite);
  const best = scores[0];
  const worst = scores[scores.length - 1];

  lines.push(`**Variation ${best.variation} is optimal** (${best.description}).`);
  lines.push('');
  lines.push('Composite scoring (weighted: fun 3x, play-again 2x, flow 2x, low-disruption 1x, engagement 1x):');
  lines.push('');
  for (const s of scores) {
    const marker = s === best ? ' <<<< WINNER' : s === worst ? ' (weakest)' : '';
    lines.push(`- **${s.variation}**: ${s.composite.toFixed(1)} composite score${marker}`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`*Generated at ${new Date().toISOString()} by Chaos Agent Simulator -- A/B Comparison Engine*`);

  return lines.join('\n');
}

/**
 * Write the comparison report to disk and return the file path.
 */
export function writeComparisonReport(report: string, scenarioId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${scenarioId}-comparison-${timestamp}.md`;
  const resultsDir = path.resolve(process.cwd(), 'results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const filePath = path.join(resultsDir, filename);
  fs.writeFileSync(filePath, report, 'utf-8');

  return filePath;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildTableHeader(results: VariationResult[]): string {
  const varHeaders = results.map((vr) => `Variation ${vr.variation}`);
  return `| Metric | ${varHeaders.join(' | ')} | Winner |`;
}

function buildTableSeparator(varCount: number): string {
  const cols = Array(varCount + 2).fill('---');
  return `|${cols.join('|')}|`;
}

function scoreBar(value: number): string {
  const filled = Math.round(value);
  const empty = 10 - filled;
  return '`' + '#'.repeat(filled) + '.'.repeat(empty) + '`';
}

function findWinner(label: string, results: VariationResult[]): string {
  const lowerIsBetter = ['Disruption Score', 'Peak Annoyance Minute'];

  if (label === 'Overall Fun' || label === 'Engagement Rate' || label === 'Avg Energy End') {
    const values = results.map((vr) => vr.metrics.session.overallFunScore);
    if (label === 'Engagement Rate') {
      const engValues = results.map((vr) => vr.metrics.session.engagementRate);
      const bestIdx = engValues.indexOf(Math.max(...engValues));
      return `**${results[bestIdx].variation}**`;
    }
    if (label === 'Avg Energy End') {
      const enValues = results.map((vr) => vr.metrics.session.avgEnergyEnd);
      const bestIdx = enValues.indexOf(Math.max(...enValues));
      return `**${results[bestIdx].variation}**`;
    }
    const bestIdx = values.indexOf(Math.max(...values));
    return `**${results[bestIdx].variation}**`;
  }

  if (lowerIsBetter.includes(label)) {
    if (label === 'Disruption Score') {
      const values = results.map((vr) => vr.metrics.session.disruptionScore);
      const bestIdx = values.indexOf(Math.min(...values));
      return `**${results[bestIdx].variation}**`;
    }
  }

  // Default: return empty for non-numeric rows
  return '-';
}
