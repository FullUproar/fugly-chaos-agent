import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScenarioDefinition } from '../config/scenarios.js';
import type { Agent } from '../agents/agent.js';
import type { FinalAssessment } from '../agents/claude-bridge.js';
import type { SimEvent } from '../events/event-types.js';
import type { AggregatedMetrics } from '../metrics/types.js';

/**
 * Generate the full JSON report object for a simulation run.
 */
export function generateJsonReport(
  scenario: ScenarioDefinition,
  events: SimEvent[],
  metrics: AggregatedMetrics,
  agents: Agent[],
  assessments: Map<string, FinalAssessment>,
  apiStats: { totalCalls: number; totalTokens: number },
): object {
  return {
    meta: {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      gameType: scenario.gameType,
      playerCount: scenario.playerCount,
      totalMinutes: scenario.totalMinutes,
      chaosComfort: scenario.chaosComfort,
      eventFrequency: scenario.eventFrequency,
      generatedAt: new Date().toISOString(),
    },

    timeline: events.map((event) => ({
      tick: event.tick,
      type: event.type,
      title: event.title,
      description: event.description,
      points: event.points,
      flashType: event.flashType ?? null,
      targetPlayer: event.targetPlayer ?? null,
      votingMechanic: event.votingMechanic ?? null,
      miniGameType: event.miniGameType ?? null,
      miniGameVariation: event.miniGameVariation ?? null,
      pollQuestion: event.pollQuestion ?? null,
      pollOptions: event.pollOptions ?? null,
      resolution: event.resolution ?? null,
      reactions: mapToObject(event.reactions),
    })),

    metrics: {
      session: metrics.session,
      evaluationFactors: metrics.evaluationFactors,
      perAgent: mapToObject(metrics.perAgent),
      perEventType: mapToObject(metrics.perEventType),
    },

    agentNarratives: agents.map((agent) => {
      const assessment = assessments.get(agent.id);
      const summary = metrics.perAgent.get(agent.id);
      return {
        id: agent.id,
        name: agent.persona.name,
        personality: agent.persona.personality,
        finalScore: agent.score,
        finalEnergy: agent.energy,
        initialEnergy: agent.initialEnergy,
        energyCurve: agent.energyCurve,
        totalEngaged: agent.totalEngaged,
        totalIgnored: agent.totalIgnored,
        totalComplaints: agent.totalComplaints,
        signalsSent: agent.signalsSent,
        highlights: agent.getHighlights(3),
        lowPoints: agent.getLowPoints(3),
        assessment: assessment ?? null,
        summary: summary ?? null,
      };
    }),

    recommendations: metrics.session.recommendations,

    apiUsage: apiStats,
  };
}

/**
 * Write the JSON report to disk and return the file path.
 */
export function writeJsonReport(report: object, scenarioId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${scenarioId}-${timestamp}.json`;
  const resultsDir = path.resolve(process.cwd(), 'results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const filePath = path.join(resultsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');

  return filePath;
}

/** Convert a Map to a plain object for JSON serialization. */
function mapToObject(map: Map<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, value] of map) {
    if (value instanceof Map) {
      obj[key] = mapToObject(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}
