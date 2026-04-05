import { program } from 'commander';
import { SCENARIOS, type ScenarioDefinition } from './config/scenarios.js';
import { Timeline, type SimulationConfig } from './engine/timeline.js';
import { generateJsonReport, writeJsonReport } from './output/json-report.js';
import { generateMarkdownReport, writeMarkdownReport } from './output/markdown-report.js';

program
  .name('chaos-simulator')
  .description('Simulate game nights with Chaos Agent to test timing and flow')
  .option('-s, --scenario <id>', 'Run a specific scenario')
  .option('-a, --all', 'Run all scenarios')
  .option('-d, --dry-run', 'Use deterministic heuristics instead of Claude API')
  .option('-m, --model <model>', 'Claude model to use', 'claude-sonnet-4-20250514')
  .option('-v, --verbose', 'Show per-tick output')
  .parse();

const opts = program.opts();

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

  console.log(`\n=== CHAOS AGENT GAME NIGHT SIMULATOR ===`);
  console.log(`    Model: ${opts.model}`);
  console.log(`    Mode: ${opts.dryRun ? 'DRY RUN (no API calls)' : 'LIVE (Claude API)'}`);
  console.log(`    Scenarios: ${scenarios.length}\n`);

  for (const scenario of scenarios) {
    const config: SimulationConfig = {
      scenario,
      model: opts.model,
      dryRun: opts.dryRun || false,
      verbose: opts.verbose || false,
    };

    const timeline = new Timeline(config);
    const { events, metrics, assessments, apiStats } = await timeline.run();

    // Generate reports
    const jsonReport = generateJsonReport(
      scenario,
      events,
      metrics,
      timeline.pool.getAllAgents(),
      assessments,
      apiStats,
    );
    const jsonPath = writeJsonReport(jsonReport, scenario.id);

    const mdReport = generateMarkdownReport(
      scenario,
      metrics,
      timeline.pool.getAllAgents(),
      assessments,
      apiStats,
    );
    const mdPath = writeMarkdownReport(mdReport, scenario.id);

    console.log(`\n    ${scenario.name} complete`);
    console.log(`    JSON: ${jsonPath}`);
    console.log(`    Report: ${mdPath}`);
    console.log(`    API calls: ${apiStats.totalCalls}, tokens: ${apiStats.totalTokens.toLocaleString()}`);
  }

  console.log('\n=== All simulations complete ===\n');
}

main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
