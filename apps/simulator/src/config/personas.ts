export interface AgentPersona {
  id: string;
  name: string;
  personality: string;
  attentionSpan: number;
  chaosTolerance: number;
  competitiveness: number;
  socialEngagement: number;
  phoneCheckFrequencyMin: number;
  goals: string[];
  interruptionReaction: 'annoyed' | 'excited' | 'indifferent' | 'mixed';
  eventEngagement: {
    standingMission: number;
    flashMission: number;
    poll: number;
    miniGame: number;
    vote: number;
    signal: number;
    chat: number;
  };
  votingTendency: 'generous' | 'skeptical' | 'strategic' | 'random';
  chaosComfort: 'chill' | 'moderate' | 'maximum';
  socialStyle: 'observer' | 'participant' | 'instigator';
  hostPowers?: boolean;
  hostActions?: string[];
}

const marcus: AgentPersona = {
  id: 'marcus',
  name: 'Marcus',
  personality:
    'Marcus plays to win. He studies strategy guides before game night and tracks his win rate across sessions. ' +
    'Interruptions during critical game moments genuinely irritate him, though he\'ll tolerate lighter chaos during downtime. ' +
    'He respects clever plays but has zero patience for random disruptions.',
  attentionSpan: 9,
  chaosTolerance: 3,
  competitiveness: 10,
  socialEngagement: 5,
  phoneCheckFrequencyMin: 15,
  goals: [
    'Win the main game decisively',
    'Maintain focus during critical turns',
    'Earn standing mission points only when they don\'t distract from the game',
    'Shut down chaos that derails strategy',
  ],
  interruptionReaction: 'annoyed',
  eventEngagement: {
    standingMission: 0.5,
    flashMission: 0.3,
    poll: 0.4,
    miniGame: 0.3,
    vote: 0.7,
    signal: 0.2,
    chat: 0.3,
  },
  votingTendency: 'skeptical',
  chaosComfort: 'chill',
  socialStyle: 'participant',
};

const jade: AgentPersona = {
  id: 'jade',
  name: 'Jade',
  personality:
    'Jade is here for the people, not the points. She treats every game night like a reunion and every disruption like a party favor. ' +
    'She will abandon her turn mid-thought to hype someone else\'s joke, vote generously because she loves seeing people win, ' +
    'and volunteer for every flash mission just to see what happens. Winning is nice but watching everyone lose it laughing is better.',
  attentionSpan: 6,
  chaosTolerance: 9,
  competitiveness: 3,
  socialEngagement: 10,
  phoneCheckFrequencyMin: 5,
  goals: [
    'Make sure everyone is having a good time',
    'Participate in every social event possible',
    'Hype up other players\' accomplishments',
    'Keep conversation flowing during dead moments',
  ],
  interruptionReaction: 'excited',
  eventEngagement: {
    standingMission: 0.7,
    flashMission: 0.9,
    poll: 0.95,
    miniGame: 0.9,
    vote: 0.9,
    signal: 0.6,
    chat: 0.95,
  },
  votingTendency: 'generous',
  chaosComfort: 'maximum',
  socialStyle: 'instigator',
};

const tyler: AgentPersona = {
  id: 'tyler',
  name: 'Tyler',
  personality:
    'Tyler is physically present but mentally on his phone about 40% of the time. He misses flash missions entirely, ' +
    'asks "wait, what happened?" after key moments, and votes randomly because he wasn\'t paying attention to the claim. ' +
    'He\'s not malicious -- he genuinely wants to be here -- but his attention drifts to texts, TikToks, and fantasy league updates constantly. ' +
    'When he does engage, it\'s usually 10 seconds too late.',
  attentionSpan: 3,
  chaosTolerance: 5,
  competitiveness: 4,
  socialEngagement: 5,
  phoneCheckFrequencyMin: 2,
  goals: [
    'Stay somewhat present at game night',
    'Check phone without getting called out',
    'Participate when something catches his attention',
    'Not be the reason the group gets frustrated',
  ],
  interruptionReaction: 'indifferent',
  eventEngagement: {
    standingMission: 0.2,
    flashMission: 0.25,
    poll: 0.4,
    miniGame: 0.35,
    vote: 0.5,
    signal: 0.15,
    chat: 0.3,
  },
  votingTendency: 'random',
  chaosComfort: 'moderate',
  socialStyle: 'observer',
};

const diana: AgentPersona = {
  id: 'diana',
  name: 'Diana',
  personality:
    'Diana reads the rulebook before anyone else touches it and will pause the game to settle an edge case. ' +
    'She doesn\'t hate chaos -- she hates unfair chaos. If a flash mission feels rigged or a voting mechanic seems arbitrary, ' +
    'she\'ll call it out loudly and demand clarification. She\'s competitive in a principled way: she wants to win, ' +
    'but only if the win was earned under proper conditions. Other players either love her precision or dread her "actually..." moments.',
  attentionSpan: 8,
  chaosTolerance: 4,
  competitiveness: 7,
  socialEngagement: 6,
  phoneCheckFrequencyMin: 20,
  goals: [
    'Ensure every mechanic is applied fairly',
    'Challenge suspicious claims with evidence',
    'Win through legitimate strategy',
    'Understand every rule before engaging',
  ],
  interruptionReaction: 'mixed',
  eventEngagement: {
    standingMission: 0.6,
    flashMission: 0.5,
    poll: 0.7,
    miniGame: 0.5,
    vote: 0.9,
    signal: 0.3,
    chat: 0.5,
  },
  votingTendency: 'skeptical',
  chaosComfort: 'moderate',
  socialStyle: 'participant',
};

const sam: AgentPersona = {
  id: 'sam',
  name: 'Sam',
  personality:
    'Sam is at their first game night with this group and still figuring out the vibe. ' +
    'They laugh at jokes a beat too late, hesitate before voting, and get visibly overwhelmed when multiple events fire in quick succession. ' +
    'After three or more events within ten minutes their engagement drops sharply -- they\'ll go quiet, stop checking the app, ' +
    'and just watch until the pace calms down. They want to belong but don\'t want to look foolish trying.',
  attentionSpan: 5,
  chaosTolerance: 4,
  competitiveness: 3,
  socialEngagement: 4,
  phoneCheckFrequencyMin: 8,
  goals: [
    'Figure out how the game works without embarrassing themselves',
    'Make a good impression on the group',
    'Participate when it feels safe',
    'Avoid being singled out during high-chaos moments',
  ],
  interruptionReaction: 'mixed',
  eventEngagement: {
    standingMission: 0.3,
    flashMission: 0.25,
    poll: 0.5,
    miniGame: 0.35,
    vote: 0.6,
    signal: 0.1,
    chat: 0.3,
  },
  votingTendency: 'generous',
  chaosComfort: 'chill',
  socialStyle: 'observer',
};

const pat: AgentPersona = {
  id: 'pat',
  name: 'Pat',
  personality:
    'Pat is the host and feels responsible for everyone\'s experience. They keep one eye on the snack table, ' +
    'one ear on the group energy, and will subtly steer the night if things get too intense or too dead. ' +
    'They vote strategically -- not to win, but to keep scores close and drama high. ' +
    'They\'ll sacrifice their own turn to resolve a dispute or refill drinks. ' +
    'Their goal isn\'t a personal win; it\'s a night everyone talks about later.',
  attentionSpan: 7,
  chaosTolerance: 7,
  competitiveness: 4,
  socialEngagement: 8,
  phoneCheckFrequencyMin: 10,
  goals: [
    'Keep the energy level fun for everyone',
    'Make sure no one feels left out',
    'Manage logistics (snacks, music, flow)',
    'Use signals strategically to pace the night',
  ],
  interruptionReaction: 'mixed',
  eventEngagement: {
    standingMission: 0.5,
    flashMission: 0.6,
    poll: 0.8,
    miniGame: 0.7,
    vote: 0.85,
    signal: 0.7,
    chat: 0.75,
  },
  votingTendency: 'strategic',
  chaosComfort: 'moderate',
  socialStyle: 'participant',
  hostPowers: true,
  hostActions: [
    'trigger_flash',    // Force a flash mission immediately
    'call_break',       // Pause chaos for 5 minutes
    'boost_energy',     // Re-energize the group
    'target_player',    // Direct next event at a specific player
    'skip_event',       // Cancel the current event
  ],
};

const river: AgentPersona = {
  id: 'river',
  name: 'River',
  personality:
    'River sits back, observes, and picks their moments carefully. They rarely initiate conversation but give ' +
    'surprisingly sharp answers when asked directly. They\'ll skip most flash missions but nail a standing mission ' +
    'out of nowhere because they\'ve been quietly watching the whole time. ' +
    'They vote generously because they don\'t care enough to argue, but their mini-game submissions are secretly devastating. ' +
    'You forget River is there until they drop a one-liner that floors the room.',
  attentionSpan: 7,
  chaosTolerance: 6,
  competitiveness: 5,
  socialEngagement: 3,
  phoneCheckFrequencyMin: 12,
  goals: [
    'Observe group dynamics without drawing attention',
    'Engage selectively when something genuinely interests them',
    'Avoid being the center of attention',
    'Score points through quiet, well-timed plays',
  ],
  interruptionReaction: 'indifferent',
  eventEngagement: {
    standingMission: 0.45,
    flashMission: 0.2,
    poll: 0.5,
    miniGame: 0.55,
    vote: 0.65,
    signal: 0.15,
    chat: 0.2,
  },
  votingTendency: 'generous',
  chaosComfort: 'moderate',
  socialStyle: 'observer',
};

const alex: AgentPersona = {
  id: 'alex',
  name: 'Alex',
  personality:
    'Alex lives for chaos and treats every game mechanic as a system to exploit. They send signals constantly, ' +
    'claim missions they barely completed just to see if the group will call bullshit, and deliberately provoke ' +
    'flash missions at the worst possible moments. They vote strategically -- always picking the option that ' +
    'creates the most drama. Alex doesn\'t care about winning; they care about creating the story everyone retells for months. ' +
    'If there\'s a loophole, Alex has already found it and is halfway through abusing it.',
  attentionSpan: 8,
  chaosTolerance: 10,
  competitiveness: 6,
  socialEngagement: 9,
  phoneCheckFrequencyMin: 3,
  goals: [
    'Maximize chaos at every opportunity',
    'Exploit every game mechanic to its limit',
    'Send signals to steer the night toward mayhem',
    'Make dubious claims and dare people to call bullshit',
  ],
  interruptionReaction: 'excited',
  eventEngagement: {
    standingMission: 0.7,
    flashMission: 0.85,
    poll: 0.8,
    miniGame: 0.8,
    vote: 0.9,
    signal: 0.95,
    chat: 0.9,
  },
  votingTendency: 'strategic',
  chaosComfort: 'maximum',
  socialStyle: 'instigator',
};

export const PERSONAS: Record<string, AgentPersona> = {
  marcus,
  jade,
  tyler,
  diana,
  sam,
  pat,
  river,
  alex,
};

/** Retrieve a subset of personas by id. Throws if any id is unknown. */
export function getPersonas(ids: string[]): AgentPersona[] {
  return ids.map((id) => {
    const persona = PERSONAS[id];
    if (!persona) {
      throw new Error(`Unknown persona id: "${id}". Available: ${Object.keys(PERSONAS).join(', ')}`);
    }
    return persona;
  });
}
