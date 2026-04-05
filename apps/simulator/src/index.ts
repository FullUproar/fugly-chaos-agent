import { program } from 'commander';
import { SCENARIOS, type ScenarioDefinition, type ScenarioVariation, getVariation } from './config/scenarios.js';
import { Timeline, type SimulationConfig } from './engine/timeline.js';
import { generateJsonReport, writeJsonReport } from './output/json-report.js';
import { generateMarkdownReport, writeMarkdownReport } from './output/markdown-report.js';
import { generateComparisonReport, writeComparisonReport } from './output/comparison-report.js';
import type { AggregatedMetrics } from './metrics/types.js';
import type { FinalAssessment } from './agents/claude-bridge.js';

program
  .name('chaos-simulator')
  .description('Simulate game nights with Chaos Agent to test timing and flow')
  .option('-s, --scenario <id>', 'Run a specific scenario')
  .option('-a, --all', 'Run all scenarios')
  .option('-d, --dry-run', 'Use deterministic heuristics instead of Claude API')
  .option('-m, --model <model>', 'Claude model to use', 'claude-sonnet-4-20250514')
  .option('-v, --verbose', 'Show per-tick output')
  .option('--ab', 'Run ALL variations (A/B/C) of each scenario')
  .option('--variation <label>', 'Run a specific variation (A, B, or C)')
  .parse();

const opts = program.opts();

interface VariationResult {
  variation: string;
  description: string;
  metrics: AggregatedMetrics;
  assessments: Map<string, FinalAssessment>;
}

async function runScenarioWithVariation(
  scenario: ScenarioDefinition,
  variation: ScenarioVariation | null,
): Promise<{
  metrics: AggregatedMetrics;
  assessments: Map<string, FinalAssessment>;
  jsonPath: string;
  mdPath: string;
}> {
  const config: SimulationConfig = {
    scenario,
    model: opts.model,
    dryRun: opts.dryRun || false,
    verbose: opts.verbose || false,
    variation,
  };

  const timeline = new Timeline(config);
  const { events, metrics, assessments, apiStats } = await timeline.run();

  const suffix = variation ? `-var${variation.label}` : '';

  // Generate reports
  const jsonReport = generateJsonReport(
    scenario,
    events,
    metrics,
    timeline.pool.getAllAgents(),
    assessments,
    apiStats,
  );
  const jsonPath = writeJsonReport(jsonReport, `${scenario.id}${suffix}`);

  const mdReport = generateMarkdownReport(
    scenario,
    metrics,
    timeline.pool.getAllAgents(),
    assessments,
    apiStats,
  );
  const mdPath = writeMarkdownReport(mdReport, `${scenario.id}${suffix}`);

  const vLabel = variation ? ` [Variation ${variation.label}]` : '';
  console.log(`\n    ${scenario.name}${vLabel} complete`);
  console.log(`    JSON: ${jsonPath}`);
  console.log(`    Report: ${mdPath}`);
  console.log(`    API calls: ${apiStats.totalCalls}, tokens: ${apiStats.totalTokens.toLocaleString()}`);

  return { metrics, assessments, jsonPath, mdPath };
}

async function main() {
  const scenarios: ScenarioDefinition[] = [];

  if (opts.all) {
    scenarios.push(...Object.values(SCENARIOS));
  } else if (opts.scenario) {
    const s = SCENARIOS[opts.scenario];
    if (!s) {
      console.error(`Unknown scenario: ${opts.scenario}`);
      console.error(`Available: ${Object.keys(SCENARIOS).join(', ')}`);
      process.exit(1);
    }
    scenarios.push(s);
  } else {
    console.error('Specify --scenario <id> or --all');
    console.error(`Available scenarios: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }

  const isAB = opts.ab || false;
  const specificVariation = opts.variation as string | undefined;

  console.log(`\n=== CHAOS AGENT GAME NIGHT SIMULATOR ===`);
  console.log(`    Model: ${opts.model}`);
  console.log(`    Mode: ${opts.dryRun ? 'DRY RUN (no API calls)' : 'LIVE (Claude API)'}`);
  console.log(`    Scenarios: ${scenarios.length}`);
  if (isAB) {
    console.log(`    A/B Testing: ON (running all variations)`);
  } else if (specificVariation) {
    console.log(`    Variation: ${specificVariation}`);
  }
  console.log('');

  for (const scenario of scenarios) {
    if (isAB) {
      // Run ALL variations for this scenario
      const variationResults: VariationResult[] = [];

      for (const variation of scenario.variations) {
        console.log(`\n  >>> Variation ${variation.label}: ${variation.description}`);
        const { metrics, assessments } = await runScenarioWithVariation(scenario, variation);
        variationResults.push({
          variation: variation.label,
          description: variation.description,
          metrics,
          assessments,
        });
      }

      // Generate comparison report
      if (variationResults.length > 1) {
        const comparisonReport = generateComparisonReport(scenario.name, variationResults);
        const compPath = writeComparisonReport(comparisonReport, scenario.id);
        console.log(`\n    COMPARISON REPORT: ${compPath}`);
      }
    } else if (specificVariation) {
      // Run a specific variation
      const variation = getVariation(scenario, specificVariation);
      console.log(`\n  >>> Variation ${variation.label}: ${variation.description}`);
      await runScenarioWithVariation(scenario, variation);
    } else {
      // Run without variation (original behavior)
      await runScenarioWithVariation(scenario, null);
    }
  }

  console.log('\n=== All simulations complete ===\n');
}

main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
