export type SimEventType = 'flash_mission' | 'poll' | 'mini_game' | 'standing_claim' | 'vote_resolution' | 'host_action';

export interface SimEvent {
  id: string;
  type: SimEventType;
  tick: number;
  title: string;
  description: string;
  points: number;
  timer?: number; // seconds
  flashType?: 'race' | 'target' | 'group';
  targetPlayer?: string;
  votingMechanic?: { id: string; name: string; description: string };
  miniGameType?: string;
  miniGameVariation?: { id: string; name: string; description: string };
  pollQuestion?: string;
  pollOptions?: string[];
  reactions: Map<string, any>; // agentId -> AgentResponse
  resolution?: {
    passed: boolean;
    pointsAwarded: number;
    claimantId?: string;
    votes?: { agentId: string; vote: string }[];
    winnerId?: string;
  };
}

export interface AgentResponse {
  decision: 'engage' | 'ignore' | 'complain' | 'half_engage';
  engagement: number;
  disruption_perception: number;
  fun_factor: number;
  annoyance: number;
  humor_landed: number;
  energy_delta: number;
  attention_cost: number;
  dialogue: string;
  internal_thought: string;
  would_send_signal: string | null;
  vote_if_applicable: string | null;
  claim_if_applicable: boolean;
  submission_if_applicable: string | null;
  wants_more_chaos: boolean;
  wants_less_chaos: boolean;
  notification_feedback: 'too_loud' | 'too_quiet' | 'just_right' | 'missed_it';
  overall_vibe: string;
  host_power_used: string | null;
}

export interface FinalAssessment {
  overall_fun_rating: number;
  disruption_rating: number;
  enhancement_rating: number;
  setup_difficulty: number;
  flow_rating: number;
  would_play_again: boolean;
  would_recommend: boolean;
  would_pay_for_ai: boolean;
  favorite_event_type: string;
  least_favorite_event_type: string;
  ideal_event_frequency: 'more' | 'same' | 'less';
  biggest_complaint: string;
  best_moment: string;
  narrative_summary: string;
  suggestions: string[];
  // Virality fields
  would_screenshot_moment: boolean;
  would_post_on_social: boolean;
  would_tell_friends_tomorrow: boolean;
  felt_closer_to_group: boolean;
  funniest_moment_shareable: string;
}
