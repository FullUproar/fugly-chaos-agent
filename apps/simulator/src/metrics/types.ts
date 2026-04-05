export interface TickMetrics {
  tick: number;
  phase: string;
  tensionLevel: number;
  disruptionTolerance: number;
  activeEventType: string | null;
  agentMetrics: Map<string, {
    energy: number;
    score: number;
    engagement: number;
    disruption: number;
    funFactor: number;
    annoyance: number;
    humorLanded: number;
    attentionCost: number;
    decision: string;
    overallVibe: string;
  }>;
}

export interface AggregatedMetrics {
  perAgent: Map<string, AgentSummary>;
  perEventType: Map<string, EventTypeSummary>;
  session: SessionSummary;
  evaluationFactors: EvaluationFactors;
}

export interface AgentSummary {
  personaName: string;
  avgEngagement: number;
  avgDisruption: number;
  avgFun: number;
  avgAnnoyance: number;
  avgHumorLanded: number;
  engagementRate: number;
  energyCurve: number[];
  peakFun: { tick: number; event: string; value: number };
  peakAnnoyance: { tick: number; event: string; value: number };
  totalEventsEngaged: number;
  totalEventsIgnored: number;
  totalComplaints: number;
  finalScore: number;
  finalEnergy: number;
  signalsSent: number;
}

export interface EventTypeSummary {
  avgEngagement: number;
  avgDisruption: number;
  avgFun: number;
  avgAnnoyance: number;
  avgHumorLanded: number;
  engagementRate: number;
  bestPhase: string;
  worstPhase: string;
  count: number;
}

export interface SessionSummary {
  overallFunScore: number;
  disruptionScore: number;
  engagementRate: number;
  eventDensity: number;
  optimalDensity: number;
  momentOfPeakFun: number;
  momentOfPeakAnnoyance: number;
  avgEnergyEnd: number;
  recommendations: string[];
}

export interface EvaluationFactors {
  flashFrequencyOptimal: number;        // 1
  flashDurationRight: number;           // 2
  flashAttentionCost: number;           // 3
  humorQuality: number;                 // 4
  mainGameDisruption: number;           // 5
  notificationMode: number;             // 6
  standingMissionCount: number;         // 7
  timingCorrectness: number;            // 8
  standingAlwaysAvailable: number;      // 9
  standingClaimBehavior: number;        // 10
  standingDisruption: number;           // 11
  overallEnhanceOrDestroy: number;      // 12
  miniGamesFun: number;                 // 13
  miniGameSetComplete: number;          // 14
  miniGameInvolvement: number;          // 15
  overallFlowEasy: number;             // 16
  wouldPlayAgain: number;              // 17
  wouldRecommend: number;              // 18
  wouldPayForAI: number;              // 19
  overallAssessment: number;           // 20

  // Virality metrics
  screenshotMoment: number;            // How many moments would someone screenshot/share?
  socialMediaMention: number;           // Would agents mention this on social media?
  nextDayStory: number;                // Would agents tell someone about this tomorrow?
  groupBondingEffect: number;          // Did this bring the group closer?
  memeableMoments: number;             // How many meme-worthy moments happened?

  // Round 4: Ecosystem / Memory / Multi-session metrics
  wouldScheduleNext: number;           // Would agents schedule the next session?
  streakMotivating: number;            // Does streak messaging motivate return?
  productRecHelpful: number;           // How many felt the product rec was helpful/intriguing?
  productRecAnnoying: number;          // How many felt the product rec was annoying?
  crewIdentityImpact: number;          // Average crew identity impact (1-10)
  memoryImpact: number;                // Average memory impact (1-10)
}
