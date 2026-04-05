interface StandingMissionTemplate {
  title: string;
  description: string;
  points: number;
  category: 'social' | 'performance' | 'sabotage' | 'alliance' | 'endurance' | 'meta';
}

// ---- Lightweight types used within the simulation ----

export interface SimPlayer {
  id: string;
  name: string;
  score: number;
  /** Energy represents engagement stamina; drops as events pile up. */
  energy: number;
}

export interface SimEvent {
  tick: number;
  type: string;
  title: string;
  data?: Record<string, unknown>;
  reactions: Map<string, unknown>;
}

export interface SimClaim {
  id: string;
  missionTitle: string;
  claimantId: string;
  tick: number;
  status: 'pending' | 'accepted' | 'rejected';
  votes: Map<string, 'ACCEPT' | 'BULLSHIT'>;
  pointsAwarded: number;
}

export interface SimSignal {
  agentId: string;
  type: string;
  tick: number;
}

/**
 * Mutable state for a single simulation session. Tracks players, scores,
 * active events, claims, and the full event log.
 */
export class SessionState {
  players: SimPlayer[];
  standingMissions: StandingMissionTemplate[];
  activeFlash: SimEvent | null = null;
  activePoll: SimEvent | null = null;
  activeMiniGame: SimEvent | null = null;
  activeClaim: SimClaim | null = null;

  claimHistory: SimClaim[] = [];
  eventLog: SimEvent[] = [];

  /** Recently used voting mechanics -- avoid repeating the same one back-to-back. */
  recentMechanics: string[] = [];
  /** Recently used mini-game variation ids. */
  recentVariations: string[] = [];

  signalHistory: SimSignal[] = [];

  /** Set of standing mission titles already claimed this session. */
  standingMissionsClaimed: Set<string> = new Set();

  constructor(
    players: Array<{ id: string; name: string }>,
    standingMissions: StandingMissionTemplate[],
  ) {
    this.players = players.map((p) => ({
      id: p.id,
      name: p.name,
      score: 0,
      energy: 100,
    }));
    this.standingMissions = [...standingMissions];
  }

  /** Add an event to the log and set it as the active event of its type. */
  addEvent(event: SimEvent): void {
    this.eventLog.push(event);

    switch (event.type) {
      case 'flash_mission':
        this.activeFlash = event;
        break;
      case 'poll':
        this.activePoll = event;
        break;
      case 'mini_game':
        this.activeMiniGame = event;
        break;
    }
  }

  /** Resolve an active event and clear it. */
  resolveEvent(event: SimEvent, result?: Record<string, unknown>): void {
    if (result) {
      Object.assign(event, { result });
    }

    if (this.activeFlash === event) this.activeFlash = null;
    if (this.activePoll === event) this.activePoll = null;
    if (this.activeMiniGame === event) this.activeMiniGame = null;
  }

  /** Submit a claim for voting. */
  addClaim(claim: SimClaim): void {
    this.activeClaim = claim;
  }

  /** Resolve the active claim and archive it. */
  resolveClaim(status: 'accepted' | 'rejected', pointsAwarded: number): void {
    if (!this.activeClaim) return;
    this.activeClaim.status = status;
    this.activeClaim.pointsAwarded = pointsAwarded;
    this.claimHistory.push(this.activeClaim);

    if (status === 'accepted') {
      const player = this.players.find((p) => p.id === this.activeClaim!.claimantId);
      if (player) player.score += pointsAwarded;
    }

    this.activeClaim = null;
  }

  /** Record a signal sent by an agent. */
  addSignal(signal: SimSignal): void {
    this.signalHistory.push(signal);
  }

  /** Get sorted scoreboard. */
  getScoreboard(): Array<{ name: string; score: number; rank: number }> {
    const sorted = [...this.players].sort((a, b) => b.score - a.score);
    return sorted.map((p, i) => ({
      name: p.name,
      score: p.score,
      rank: i + 1,
    }));
  }

  /** Count events that fired in the last N minutes. */
  recentEventCount(currentTick: number, windowMinutes: number): number {
    const cutoff = currentTick - windowMinutes;
    return this.eventLog.filter((e) => e.tick >= cutoff).length;
  }

  /** Check if a particular signal type was sent recently. */
  hasRecentSignal(type: string, currentTick: number, windowMinutes: number): boolean {
    const cutoff = currentTick - windowMinutes;
    return this.signalHistory.some((s) => s.type === type && s.tick >= cutoff);
  }

  /** Whether any blocking activity (claim vote or mini-game) is in progress. */
  get hasBlockingActivity(): boolean {
    return this.activeClaim !== null || this.activeMiniGame !== null;
  }
}
